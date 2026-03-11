import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureLocalStorageExists } from "./mediaStorage";
import { db } from "./db";
import { songs, merchandise, beats, membershipTiers, users, agentJobs } from "@shared/schema";
import { allSongsData, merchandiseData, beatsData, membershipTiersData } from "./seed-data";
import { eq, isNull, sql as drizzleSql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { runAdvisorScanJob } from "./aiAgents";

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
