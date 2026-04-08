import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureLocalStorageExists } from "./mediaStorage";
import { db } from "./db";
import { songs, merchandise, beats, membershipTiers, users, agentJobs, radioTracks } from "@shared/schema";
import { allSongsData, merchandiseData, beatsData, membershipTiersData, radioTracksData } from "./seed-data";
import { eq, isNull, sql as drizzleSql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { runAdvisorScanJob } from "./aiAgents";
import { runDailyReportAgent } from "./fanAgents";
import { execSync, spawn } from "child_process";
import path from "path";
import http from "http";

const app = express();
app.set('trust proxy', 1);

// Prevent aggressive browser caching in development - MUST be first middleware
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // Force browser to always fetch fresh content in dev
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
}

// Webhook endpoint needs raw body for Stripe signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// All other endpoints use JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/attached_assets', express.static('attached_assets', {
  setHeaders: (res, path) => {
    if (path.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (path.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

// Initialize local file storage and serve uploaded files
ensureLocalStorageExists();
const uploadsDir = process.env.LOCAL_STORAGE_PATH || 'uploads';
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set");
}

const sessionSecret = process.env.SESSION_SECRET;
const MemoryStore = createMemoryStore(session);
const isProduction = process.env.NODE_ENV === 'production';

// Create session middleware ONCE (not per-request)
// Note: Replit always uses HTTPS (even in dev), so secure: true is required
// Production needs sameSite: 'none' for POST requests to include cookies
const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
  cookie: { 
    secure: true, // Always true - Replit uses HTTPS in both dev and production
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax', // 'none' in production for POST requests, 'lax' in dev
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/'
  }
});

// Apply session middleware to all routes EXCEPT /public-objects
app.use((req, res, next) => {
  if (req.path.startsWith('/public-objects')) {
    return next();
  }
  sessionMiddleware(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function seedProductionDatabase() {
  if (process.env.NODE_ENV === 'production') {
    try {
      const existingSongs = await db.select().from(songs);
      const existingMerch = await db.select().from(merchandise);
      const existingBeats = await db.select().from(beats);

      log(`Checking production database: ${existingSongs.length} songs found`);
      
      let updatedCount = 0;
      let insertedCount = 0;
      
      for (const track of allSongsData) {
        const existing = existingSongs.find(s => s.trackNumber === track.trackNumber);
        
        if (existing) {
          const needsUpdate = 
            existing.audioUrl !== track.audioUrl ||
            existing.featured !== track.featured ||
            existing.title !== track.title ||
            existing.album !== track.album ||
            existing.releaseDate !== (track as any).releaseDate;
            
          if (needsUpdate) {
            await db.update(songs)
              .set({
                title: track.title,
                audioUrl: track.audioUrl,
                featured: track.featured,
                album: track.album,
                releaseDate: (track as any).releaseDate,
              })
              .where(eq(songs.id, existing.id));
            updatedCount++;
          }
        } else {
          await db.insert(songs).values({
            title: track.title,
            artist: "Shakim & Project DNA",
            album: track.album,
            trackNumber: track.trackNumber,
            audioUrl: track.audioUrl,
            price: "0.99",
            featured: track.featured,
            releaseDate: (track as any).releaseDate,
          });
          insertedCount++;
        }
      }
      
      if (insertedCount > 0 || updatedCount > 0) {
        log(`✓ Songs: inserted ${insertedCount}, updated ${updatedCount}`);
      } else {
        log(`✓ All ${existingSongs.length} songs already up to date`);
      }

      let merchUpdatedCount = 0;
      let merchInsertedCount = 0;
      
      for (const item of merchandiseData) {
        const existing = existingMerch.find(m => m.name === item.name);
        
        if (existing) {
          const needsUpdate = 
            existing.price !== item.price ||
            existing.description !== item.description ||
            existing.imageUrl !== item.imageUrl ||
            existing.videoUrl !== (item as any).videoUrl ||
            existing.category !== item.category;
            
          if (needsUpdate) {
            await db.update(merchandise)
              .set({
                price: item.price,
                description: item.description,
                imageUrl: item.imageUrl,
                videoUrl: (item as any).videoUrl,
                sizes: item.sizes,
                category: item.category,
              })
              .where(eq(merchandise.id, existing.id));
            merchUpdatedCount++;
          }
        } else {
          await db.insert(merchandise).values({
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            videoUrl: (item as any).videoUrl,
            sizes: item.sizes,
            category: item.category,
          });
          merchInsertedCount++;
        }
      }
      
      if (merchInsertedCount > 0 || merchUpdatedCount > 0) {
        log(`✓ Merchandise: inserted ${merchInsertedCount}, updated ${merchUpdatedCount}`);
      } else {
        log(`✓ All ${existingMerch.length} merchandise items already up to date`);
      }

      if (existingBeats.length === 0) {
        for (const beat of beatsData) {
          await db.insert(beats).values({
            title: beat.title,
            bpm: beat.bpm,
            musicKey: beat.musicKey,
            genre: beat.genre,
            audioUrl: beat.audioUrl,
            price: beat.price,
          });
        }
        log(`✓ Seeded ${beatsData.length} beats`);
      } else {
        log(`Production database already has ${existingBeats.length} beats`);
      }

      const existingTiers = await db.select().from(membershipTiers);
      let tiersInsertedCount = 0;
      let tiersUpdatedCount = 0;

      for (const tierData of membershipTiersData) {
        const existing = existingTiers.find(t => t.name === tierData.name);
        
        if (existing) {
          const needsUpdate = 
            existing.price !== tierData.price ||
            existing.discountPercent !== tierData.discountPercent ||
            existing.earlyAccessDays !== tierData.earlyAccessDays;
            
          if (needsUpdate) {
            await db.update(membershipTiers)
              .set({
                price: tierData.price,
                billingCycle: tierData.billingCycle,
                discountPercent: tierData.discountPercent,
                perks: tierData.perks,
                earlyAccessDays: tierData.earlyAccessDays,
                exclusiveContentAccess: tierData.exclusiveContentAccess,
                active: tierData.active,
              })
              .where(eq(membershipTiers.id, existing.id));
            tiersUpdatedCount++;
          }
        } else {
          await db.insert(membershipTiers).values(tierData);
          tiersInsertedCount++;
        }
      }

      if (tiersInsertedCount > 0 || tiersUpdatedCount > 0) {
        log(`✓ Membership Tiers: inserted ${tiersInsertedCount}, updated ${tiersUpdatedCount}`);
      } else {
        log(`✓ All ${existingTiers.length} membership tiers already up to date`);
      }

      const freeTier = await db.select().from(membershipTiers).where(eq(membershipTiers.name, "Free Member")).limit(1);
      if (freeTier.length > 0) {
        const usersWithoutTier = await db.select().from(users).where(isNull(users.tierId));
        if (usersWithoutTier.length > 0) {
          for (const user of usersWithoutTier) {
            await db.update(users)
              .set({ tierId: freeTier[0].id })
              .where(eq(users.id, user.id));
          }
          log(`✓ Migrated ${usersWithoutTier.length} existing users to Free Member tier`);
        }
      }

      // Ensure admin account always exists with correct credentials
      const adminEmail = 'support@projectdnamusic.info';
      const adminCheck = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
      if (adminCheck.length === 0) {
        const adminHash = await bcrypt.hash('Admin717!', 10);
        await db.insert(users).values({
          id: '6838523b-f0da-4716-98ce-6e0610135f6f',
          username: 'Admin',
          email: adminEmail,
          password: adminHash,
          role: 'admin',
        });
        log("✓ Admin account created");
      } else {
        log("✓ Admin account exists");
      }

      log("✓ Production database seeding complete!");
    } catch (error) {
      log(`Error checking/seeding production database: ${error}`);
    }
  }

  // ── Always ensure DNA Radio tracks are seeded (dev + prod) ──────────────────
  // This runs regardless of NODE_ENV so fresh databases (including production
  // Dokploy instances) start with the correct 18-track rotation immediately.
  try {
    const existingTracks = await db.select().from(radioTracks);
    if (existingTracks.length === 0) {
      log("Radio: seeding 18 default tracks...");
      for (const track of radioTracksData) {
        await db.insert(radioTracks).values({
          title: track.title,
          artist: track.artist,
          audioUrl: track.audioUrl,
          duration: track.duration,
          isActive: 1,
          position: track.position,
        });
      }
      log(`Radio: ✓ seeded ${radioTracksData.length} tracks into rotation`);
    } else {
      log(`Radio: ${existingTracks.length} track(s) already in DB — skipping seed`);
    }
  } catch (err: any) {
    log(`Radio seed error: ${err.message}`);
  }
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  await seedProductionDatabase();

  // ─── Auto-fix radio track durations ──────────────────────────────────────────
  // If any radio track has a null duration (common after fresh deploys), read
  // the actual duration from the audio file using ffprobe and store it in the DB.
  (async () => {
    try {
      const tracks = await db.select().from(radioTracks);
      const nullTracks = tracks.filter(t => !t.duration || t.duration <= 0);
      if (nullTracks.length === 0) return;

      log(`Radio: fixing durations for ${nullTracks.length} track(s) with missing duration...`);
      const radioDir = path.join(process.cwd(), 'client', 'public', 'media', 'radio');

      for (const track of nullTracks) {
        try {
          const filename = track.audioUrl?.split('/').pop();
          if (!filename) continue;
          const filePath = path.join(radioDir, filename);
          const out = execSync(
            `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
            { timeout: 5000 }
          ).toString().trim();
          const secs = Math.round(parseFloat(out));
          if (secs > 0) {
            await db.update(radioTracks).set({ duration: secs }).where(eq(radioTracks.id, track.id));
            log(`Radio: set duration=${secs}s for "${track.title}"`);
          }
        } catch {
          // ffprobe not available or file missing — skip silently
        }
      }
    } catch (err: any) {
      log(`Radio duration fix error: ${err.message}`);
    }
  })();

  // ─── Auto-fix song durations (from songs table) ────────────────────────────
  // Songs in the catalog are WAV files stored in object storage; their duration
  // is often null.  WAV headers are always exactly 44 bytes at the start, so we
  // fetch just those bytes via a Range request, parse byte_rate + total size,
  // and compute duration instantly — no need to download the whole file.
  // Deferred 15s so the server is ready to serve requests before we hit it.
  setTimeout(async () => {
    try {
      const allSongs = await db.select({ id: songs.id, audioUrl: songs.audioUrl, duration: songs.duration }).from(songs);
      const needsFix = allSongs.filter(s => !s.duration && s.audioUrl);
      if (needsFix.length === 0) return;
      log(`Songs: reading WAV durations for ${needsFix.length} song(s)...`);

      for (const song of needsFix) {
        try {
          const filePath = song.audioUrl!.replace(/^\/public-objects\//, '');
          const port = process.env.PORT || 5000;
          const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
          const url = `http://127.0.0.1:${port}/public-objects/${encodedPath}`;

          // Fetch just the first 100 bytes (covers the WAV/fmt header + data chunk marker)
          const headerBuf: Buffer = await new Promise((resolve, reject) => {
            const req = http.get(url, { headers: { Range: 'bytes=0-99' } }, (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (c: Buffer) => chunks.push(c));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            });
            req.on('error', reject);
            req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
          });

          // WAV header layout (PCM):
          //   0- 3: "RIFF"
          //   4- 7: total file size - 8 (little-endian)
          //   8-11: "WAVE"
          //  12-15: "fmt "
          //  16-19: fmt chunk size (16 for PCM)
          //  20-21: audio format (1 = PCM)
          //  22-23: num channels
          //  24-27: sample rate
          //  28-31: byte rate (sample_rate * channels * bits/8)
          //  32-33: block align
          //  34-35: bits per sample
          //  36-39: "data"
          //  40-43: data chunk size (= total audio bytes)
          if (headerBuf.length < 44) throw new Error('header too short');
          const riff = headerBuf.slice(0, 4).toString('ascii');
          if (riff !== 'RIFF') throw new Error('not a WAV');
          const byteRate = headerBuf.readUInt32LE(28);        // bytes per second
          const dataSize = headerBuf.readUInt32LE(40);        // total audio bytes
          if (byteRate <= 0 || dataSize <= 0) throw new Error('bad header');
          const secs = Math.round(dataSize / byteRate);
          if (secs <= 0) throw new Error('zero duration');

          await db.update(songs).set({ duration: secs }).where(eq(songs.id, song.id));
          log(`Songs: ${song.id} → ${secs}s`);
        } catch (e: any) {
          log(`Songs: skipped ${song.id} (${e.message})`);
        }
      }
      log('Songs: duration update complete.');
    } catch (err: any) {
      log(`Songs duration fix error: ${err.message}`);
    }
  }, 15_000);

  // ─── Daily Auto-Scan Scheduler ─────────────────────────────────────────────
  async function scheduleDailyScan() {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStr = todayStart.toISOString().slice(0, 10);
      const existingToday = await db.select().from(agentJobs)
        .where(drizzleSql`job_type = 'daily_scan' AND triggered_by = 'system' AND created_at >= ${todayStr}`);
      if (existingToday.length === 0) {
        log("Running scheduled daily advisor scan...");
        await runAdvisorScanJob("system");
        log("Daily advisor scan complete.");
      } else {
        log("Daily advisor scan already ran today, skipping.");
      }
    } catch (err: any) {
      log(`Daily scan error: ${err.message}`);
    }
  }

  setTimeout(scheduleDailyScan, 5 * 60 * 1000);
  setInterval(scheduleDailyScan, 24 * 60 * 60 * 1000);

  // ─── Daily Fan Pipeline Report ──────────────────────────────────────────────
  async function scheduleFanDailyReport() {
    try {
      log("Running scheduled fan pipeline daily report...");
      await runDailyReportAgent("system");
      log("Fan daily report complete.");
    } catch (err: any) {
      log(`Fan daily report error: ${err.message}`);
    }
  }
  // Run 10 minutes after startup, then every 24 hours at different time from advisor
  setTimeout(scheduleFanDailyReport, 10 * 60 * 1000);
  setInterval(scheduleFanDailyReport, 24 * 60 * 60 * 1000);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
