import type { Express } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { songs, beats, merchandise, orders, orderItems, users, agentProposals, agentJobs, agentRuns, agentMemory, agentApprovals } from "@shared/schema";
import { desc, sql, eq, asc, lt } from "drizzle-orm";
import { sendOrderConfirmationEmail } from "./email";
import { Resend } from "resend";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function getResendClient() {
  if (process.env.RESEND_API_KEY) {
    return {
      client: new Resend(process.env.RESEND_API_KEY),
      fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@projectdnamusic.info",
    };
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;
  if (!xReplitToken || !hostname) throw new Error("Email not configured. Set RESEND_API_KEY environment variable.");
  const data = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
  ).then((r) => r.json()).then((d) => d.items?.[0]);
  if (!data) throw new Error("Resend not connected");
  return {
    client: new Resend(data.settings.api_key),
    fromEmail: data.settings.from_email as string,
  };
}

// ─── Memory helpers ───────────────────────────────────────────────────────────
async function getRecentMemory(limit = 12): Promise<string> {
  try {
    const rows = await db.select().from(agentMemory).orderBy(desc(agentMemory.createdAt)).limit(limit);
    if (!rows.length) return "No prior memory available.";
    const successes = rows.filter(m => m.memoryType === "outcome" && m.outcome && (m.outcome.toLowerCase().includes("success") || m.outcome.toLowerCase().includes("worked") || m.outcome.toLowerCase().includes("accepted") || m.outcome.toLowerCase().includes("effective")));
    const failures = rows.filter(m => m.memoryType === "outcome" && m.outcome && (m.outcome.toLowerCase().includes("fail") || m.outcome.toLowerCase().includes("didn't") || m.outcome.toLowerCase().includes("not work") || m.outcome.toLowerCase().includes("partial")));
    const rejections = rows.filter(m => m.memoryType === "rejection");
    const other = rows.filter(m => !successes.includes(m) && !failures.includes(m) && !rejections.includes(m));

    const parts: string[] = [];
    if (successes.length) parts.push(`WHAT WORKED (build on these):\n${successes.map(m => `✓ ${m.title}: ${m.content}${m.outcome ? ` → ${m.outcome}` : ""}`).join("\n")}`);
    if (failures.length) parts.push(`WHAT FAILED (avoid repeating these):\n${failures.map(m => `✗ ${m.title}: ${m.content}${m.outcome ? ` → ${m.outcome}` : ""}`).join("\n")}`);
    if (rejections.length) parts.push(`ADMIN REJECTED (do not repeat):\n${rejections.map(m => `✗ ${m.title}: ${m.outcome || m.content}`).join("\n")}`);
    if (other.length) parts.push(`OTHER CONTEXT:\n${other.map(m => `• ${m.title}: ${m.content}`).join("\n")}`);
    return parts.length ? parts.join("\n\n") : "No memory yet.";
  } catch { return "Memory unavailable."; }
}

async function writeMemory(opts: {
  businessUnit?: string;
  memoryType: "outcome" | "rejection" | "insight" | "learning";
  title: string;
  content: string;
  outcome?: string;
  tags?: string;
}) {
  try {
    await db.insert(agentMemory).values({
      businessUnit: opts.businessUnit || "general",
      memoryType: opts.memoryType,
      title: opts.title,
      content: opts.content,
      outcome: opts.outcome,
      tags: opts.tags,
    });
  } catch (e) { console.error("Memory write error:", e); }
}

// ─── Core advisor scan (shared by route + daily scheduler) ───────────────────
export async function runAdvisorScanJob(triggeredBy: "user" | "system" = "user") {
  const now = new Date().toISOString();
  const [job] = await db.insert(agentJobs).values({
    jobType: "daily_scan",
    status: "running",
    triggeredBy,
    startedAt: now,
  }).returning();

  try {
    const memoryContext = await getRecentMemory(12);

    const [allOrders, allOrderItems, userCountRes, songList, beatList, merchList] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(300),
      db.select().from(orderItems),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ id: songs.id, title: songs.title, price: songs.price }).from(songs),
      db.select({ id: beats.id, title: beats.title, price: beats.price, genre: beats.genre }).from(beats),
      db.select({ id: merchandise.id, title: merchandise.name, price: merchandise.price }).from(merchandise),
    ]);

    const memberCountRes = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`is_member = 1`);
    const nowMs = Date.now();
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = nowMs - 60 * 24 * 60 * 60 * 1000;

    const recentOrders = allOrders.filter(o => o.createdAt ? new Date(o.createdAt).getTime() > thirtyDaysAgo : false);
    const previousOrders = allOrders.filter(o => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return t > sixtyDaysAgo && t <= thirtyDaysAgo;
    });

    const recentRevenue = recentOrders.reduce((s, o) => s + parseFloat(String(o.total) || "0"), 0);
    const previousRevenue = previousOrders.reduce((s, o) => s + parseFloat(String(o.total) || "0"), 0);
    const totalRevenue = allOrders.reduce((s, o) => s + parseFloat(String(o.total) || "0"), 0);

    const itemSales: { [k: string]: number } = Object.create(null);
    const itemRevMap: { [k: string]: number } = Object.create(null);
    for (const item of allOrderItems) {
      const key = String(item.songId || item.beatId || item.merchId || "unknown");
      itemSales[key] = (itemSales[key] || 0) + Number(item.quantity || 1);
      itemRevMap[key] = (itemRevMap[key] || 0) + parseFloat(String(item.price || "0")) * Number(item.quantity || 1);
    }

    const soldIdSet = new Set(Object.keys(itemSales));
    const unsoldSongs = songList.filter(s => !soldIdSet.has(s.id)).slice(0, 3);
    const unsoldBeats = beatList.filter(b => !soldIdSet.has(b.id)).slice(0, 3);
    const unsoldMerch = merchList.filter(m => !soldIdSet.has(m.id)).slice(0, 3);

    const topItems = Object.keys(itemSales)
      .sort((a, b) => (itemSales[b] || 0) - (itemSales[a] || 0))
      .slice(0, 5)
      .map(id => {
        const name = songList.find(s => s.id === id)?.title ||
          beatList.find(b => b.id === id)?.title ||
          merchList.find(m => m.id === id)?.title || id;
        return { id, name, count: itemSales[id] || 0, revenue: (itemRevMap[id] || 0).toFixed(2) };
      });

    const snapshot = {
      revenue: {
        total: totalRevenue.toFixed(2),
        last30Days: recentRevenue.toFixed(2),
        previous30Days: previousRevenue.toFixed(2),
        growthTrend: previousRevenue > 0
          ? `${(((recentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)}%`
          : "no comparison data",
      },
      orders: { total: allOrders.length, last30Days: recentOrders.length, previous30Days: previousOrders.length },
      users: { total: userCountRes[0]?.count || 0, members: memberCountRes[0]?.count || 0 },
      catalog: {
        songs: songList.length, beats: beatList.length, merch: merchList.length,
        totalItems: songList.length + beatList.length + merchList.length,
      },
      topSellingItems: topItems,
      unsoldItems: {
        songs: unsoldSongs.map(s => ({ id: s.id, title: s.title, price: s.price, type: "song" })),
        beats: unsoldBeats.map(b => ({ id: b.id, title: b.title, price: b.price, genre: b.genre, type: "beat" })),
        merch: unsoldMerch.map(m => ({ id: m.id, title: m.title, price: m.price, type: "merch" })),
      },
      sampleCatalog: {
        songs: songList.slice(0, 8).map(s => ({ id: s.id, title: s.title })),
        beats: beatList.slice(0, 8).map(b => ({ id: b.id, title: b.title, genre: b.genre })),
        merch: merchList.slice(0, 5).map(m => ({ id: m.id, title: m.title })),
      },
    };

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are the Strategic Action Advisor for Project DNA Music LLC (artist: Shakim). Analyze data and generate exactly 4 ranked action proposals. Each proposal must map to one actionType: "marketing" | "email_campaign" | "content_strategy" | "sales_analysis". Use real product IDs from sampleCatalog for marketing proposals. Be concise.

LEARNING RULES — follow strictly:
- If memory shows "WHAT WORKED": generate proposals that build on or expand those successful strategies (different angle, new product, new audience segment)
- If memory shows "WHAT FAILED": do NOT repeat those approaches. Try a completely different strategy for that goal instead
- If memory shows "ADMIN REJECTED": treat as permanently off-limits
- If a partial success is shown: propose a refined version that addresses the noted weakness
- Each new scan should evolve from the last — not repeat it`,
        },
        {
          role: "user",
          content: `Platform data:
${JSON.stringify(snapshot, null, 2)}

Agent memory (things already tried, rejected, or learned):
${memoryContext}

Return JSON:
{
  "overallHealthScore": <0-100>,
  "overallSummary": "<2 sentence platform summary>",
  "proposals": [
    {
      "id": "prop_1",
      "title": "<max 7 words>",
      "opportunity": "<2 sentences: what was found>",
      "why": "<1 sentence: why act now>",
      "proposedTask": "<1 sentence action>",
      "expectedBenefit": "<specific outcome>",
      "agentsRequired": ["<Agent Name>"],
      "estimatedTime": "<X min/hr>",
      "priorityScore": <1-100>,
      "priority": "<critical|high|medium|low>",
      "isQuickAction": <true|false>,
      "actionType": "<marketing|email_campaign|content_strategy|sales_analysis>",
      "actionPayload": {},
      "qualityScore": <1-10>
    }
  ]
}
Priority: critical=90-100, high=70-89, medium=40-69, low=1-39. qualityScore: 1-4=weak/vague, 5-7=solid, 8-10=highly specific and actionable with clear ROI.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    const rawProposals: any[] = result.proposals || [];

    const saved = [];
    for (const p of rawProposals) {
      const [row] = await db.insert(agentProposals).values({
        type: "task_execution",
        source: "advisor",
        title: p.title || "Untitled Proposal",
        objective: p.proposedTask || p.title || "",
        opportunity: p.opportunity || "",
        plan: p.why || "",
        assetsRequired: JSON.stringify([]),
        agentsRequired: JSON.stringify(p.agentsRequired || []),
        expectedResult: p.expectedBenefit || "",
        estimatedTime: p.estimatedTime || "Unknown",
        priority: p.priority || "medium",
        priorityScore: p.priorityScore || 50,
        qualityScore: p.qualityScore || null,
        status: "pending",
        actionType: p.actionType || null,
        actionPayload: p.actionPayload ? JSON.stringify(p.actionPayload) : null,
        isQuickAction: p.isQuickAction ? 1 : 0,
      }).returning();
      saved.push({ ...row, originalProposal: p });
    }

    const completedNow = new Date().toISOString();
    await db.update(agentJobs).set({
      status: "completed",
      completedAt: completedNow,
      result: `Saved ${saved.length} proposals. Health score: ${result.overallHealthScore}`,
    }).where(eq(agentJobs.id, job.id));

    return {
      success: true,
      jobId: job.id,
      savedCount: saved.length,
      overallHealthScore: result.overallHealthScore,
      overallSummary: result.overallSummary,
      proposals: saved,
    };
  } catch (err: any) {
    await db.update(agentJobs).set({
      status: "failed",
      completedAt: new Date().toISOString(),
      result: err.message,
    }).where(eq(agentJobs.id, job.id));
    throw err;
  }
}

export function registerAIAgentRoutes(app: Express) {

  // ─── Marketing Content Agent ────────────────────────────────────────────────
  app.post("/api/ai-agents/marketing", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const { productType, productId } = req.body;
      if (!productType || !productId) {
        return res.status(400).json({ error: "productType and productId are required" });
      }

      let product: any = null;
      if (productType === "song") {
        const [s] = await db.select().from(songs).where(eq(songs.id, productId));
        product = s;
      } else if (productType === "beat") {
        const [b] = await db.select().from(beats).where(eq(beats.id, productId));
        product = b;
      } else if (productType === "merch") {
        const [m] = await db.select().from(merchandise).where(eq(merchandise.id, productId));
        product = m;
      }

      if (!product) return res.status(404).json({ error: "Product not found" });

      const productInfo = productType === "beat"
        ? `Beat: "${product.title}" | Genre: ${product.genre} | BPM: ${product.bpm || "N/A"} | Price: $${product.price}`
        : productType === "song"
        ? `Song: "${product.title}" by Shakim / Project DNA | Price: $${product.price}`
        : `Merchandise: "${product.title}" | ${product.description} | Price: $${product.price}`;

      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the Marketing Agent for Project DNA Music LLC, an independent music artist platform for Shakim and Project DNA. 
The brand aesthetic is futuristic, cosmic, DNA/sacred geometry inspired, with deep space dark colors and cosmic energy.
Generate promotional content that feels authentic, hype, and connects with hip-hop and music fans.
Always include relevant hashtags. Keep the brand voice: confident, cosmic, lyrical, underground/independent artist energy.`,
          },
          {
            role: "user",
            content: `Generate marketing content for this product:
${productInfo}

Return a JSON object with exactly these fields:
{
  "instagram": "Instagram caption (engaging, 150-200 chars, with line breaks and 10-15 hashtags)",
  "twitter": "Twitter/X post (under 280 chars, punchy, 3-5 hashtags)",
  "tiktok": "TikTok video description (casual, trendy, 100-150 chars, 5-8 hashtags)",
  "facebook": "Facebook post (conversational, 200-300 chars, tell a story)",
  "emailSubject": "Email subject line (compelling, under 60 chars)",
  "emailBody": "Email body text (150-200 words, hype the product, include a CTA to buy)",
  "adCopy": "Short ad copy punch line (under 15 words, memorable)"
}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ success: true, product: productInfo, content });
    } catch (error: any) {
      console.error("Marketing agent error:", error);
      res.status(500).json({ error: error.message || "Failed to generate marketing content" });
    }
  });

  // ─── Sales Intelligence Agent ────────────────────────────────────────────────
  app.get("/api/ai-agents/sales-intelligence", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      // Pull real sales data
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
      const allOrderItems = await db.select().from(orderItems);
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const songList = await db.select({ id: songs.id, title: songs.title, price: songs.price }).from(songs);
      const beatList = await db.select({ id: beats.id, title: beats.title, price: beats.price, genre: beats.genre }).from(beats);
      const merchList = await db.select({ id: merchandise.id, title: merchandise.name, price: merchandise.price }).from(merchandise);

      const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
      const completedOrders = allOrders.filter((o) => o.status === "completed" || o.status === "paid");

      const itemSales: Record<string, number> = {};
      for (const item of allOrderItems) {
        const key = item.songId || item.beatId || item.merchId || "unknown";
        itemSales[key] = (itemSales[key] || 0) + (item.quantity || 1);
      }

      const topItems = Object.entries(itemSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => {
          const song = songList.find((s) => s.id === id);
          const beat = beatList.find((b) => b.id === id);
          const merch = merchList.find((m) => m.id === id);
          const name = song?.title || beat?.title || merch?.title || id;
          return { id, name, count };
        });

      const recentOrders = allOrders.slice(0, 10).map((o) => ({
        id: o.id,
        total: o.total,
        status: o.status,
        date: o.createdAt,
      }));

      const dataSnapshot = {
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders: allOrders.length,
        completedOrders: completedOrders.length,
        registeredUsers: userCount[0]?.count || 0,
        catalog: {
          songs: songList.length,
          beats: beatList.length,
          merch: merchList.length,
        },
        topSellingItems: topItems,
        recentOrders,
        beatGenres: [...new Set(beatList.map((b) => b.genre))],
      };

      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the Sales Intelligence Agent for Project DNA Music LLC, an independent music artist platform. 
Analyze the business data and provide clear, actionable insights.
Be direct and practical. Focus on what's working, what isn't, and what to do next.`,
          },
          {
            role: "user",
            content: `Analyze this sales data and provide business insights:

${JSON.stringify(dataSnapshot, null, 2)}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence executive summary of the business performance",
  "topInsight": "The single most important insight from the data",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "recommendations": [
    {"action": "specific action to take", "impact": "expected impact", "priority": "high/medium/low"},
    {"action": "specific action to take", "impact": "expected impact", "priority": "high/medium/low"},
    {"action": "specific action to take", "impact": "expected impact", "priority": "high/medium/low"}
  ],
  "revenueProjection": "Based on current trends, a realistic 30-day revenue projection with explanation"
}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const insights = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ success: true, data: dataSnapshot, insights });
    } catch (error: any) {
      console.error("Sales intelligence error:", error);
      res.status(500).json({ error: error.message || "Failed to generate sales intelligence" });
    }
  });

  // ─── Email Campaign Agent ────────────────────────────────────────────────────
  app.post("/api/ai-agents/email-campaign", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const { campaignType, topic, sendNow } = req.body;
      if (!campaignType || !topic) {
        return res.status(400).json({ error: "campaignType and topic are required" });
      }

      // Generate email with AI
      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the Email Campaign Agent for Project DNA Music LLC.
Write compelling email campaigns for fans of independent hip-hop artist Shakim / Project DNA.
The brand is futuristic, cosmic, authentic, and independent.
Emails should feel personal and direct from the artist, not corporate.
The website is projectdnamusic.info`,
          },
          {
            role: "user",
            content: `Write a ${campaignType} email campaign about: ${topic}

Return a JSON object with exactly these fields:
{
  "subject": "Email subject line (compelling, under 60 chars)",
  "previewText": "Email preview text (under 90 chars)",
  "htmlBody": "Full HTML email body (professional, with sections, cosmic/dark styling inline, include a clear CTA button linking to projectdnamusic.info)",
  "plainText": "Plain text version of the email",
  "estimatedOpenRate": "Your estimated open rate percentage for this campaign type",
  "bestSendTime": "Best day/time to send this type of email",
  "audienceNotes": "Who this email is best targeted to"
}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const emailContent = JSON.parse(completion.choices[0].message.content || "{}");

      let sendResult = null;
      if (sendNow) {
        try {
          const allUsers = await db
            .select({ email: users.email, username: users.username })
            .from(users)
            .limit(500);

          const { client, fromEmail } = await getResendClient();

          let sent = 0;
          let failed = 0;
          for (const user of allUsers) {
            try {
              await client.emails.send({
                from: fromEmail || "Project DNA Music <noreply@projectdnamusic.info>",
                to: user.email,
                subject: emailContent.subject,
                html: emailContent.htmlBody,
                text: emailContent.plainText,
              });
              sent++;
            } catch {
              failed++;
            }
          }
          sendResult = { sent, failed, total: allUsers.length };
        } catch (err: any) {
          sendResult = { error: err.message };
        }
      }

      res.json({ success: true, emailContent, sendResult });
    } catch (error: any) {
      console.error("Email campaign error:", error);
      res.status(500).json({ error: error.message || "Failed to generate email campaign" });
    }
  });

  // ─── Content Ideas Agent ─────────────────────────────────────────────────────
  app.post("/api/ai-agents/content-ideas", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const { focus } = req.body; // e.g. "new beat drop", "merch launch", "fan growth"

      const songList = await db.select({ title: songs.title }).from(songs).limit(20);
      const beatList = await db.select({ title: beats.title, genre: beats.genre }).from(beats).limit(20);
      const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);

      const catalogSnapshot = {
        songs: songList.map((s) => s.title),
        beats: beatList.map((b) => `${b.title} (${b.genre})`),
        totalOrdersToDate: totalOrders[0]?.count || 0,
        focus: focus || "overall business growth",
      };

      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the Content Strategy & Ideas Agent for Project DNA Music LLC.
You help independent hip-hop artist Shakim grow his brand, revenue, and fanbase.
You understand music industry trends, social media, and independent artist strategies.
Be creative, specific, and practical — ideas should be actionable with zero budget.`,
          },
          {
            role: "user",
            content: `Generate a comprehensive content and business strategy based on:
${JSON.stringify(catalogSnapshot, null, 2)}

Return a JSON object with exactly these fields:
{
  "socialMediaCalendar": [
    {"day": "Monday", "platform": "Instagram", "contentType": "type", "idea": "specific idea"},
    {"day": "Tuesday", "platform": "TikTok", "contentType": "type", "idea": "specific idea"},
    {"day": "Wednesday", "platform": "Twitter/X", "contentType": "type", "idea": "specific idea"},
    {"day": "Thursday", "platform": "Instagram", "contentType": "type", "idea": "specific idea"},
    {"day": "Friday", "platform": "TikTok", "contentType": "type", "idea": "specific idea"},
    {"day": "Saturday", "platform": "YouTube/Shorts", "contentType": "type", "idea": "specific idea"},
    {"day": "Sunday", "platform": "All", "contentType": "type", "idea": "specific idea"}
  ],
  "viralIdeas": [
    {"title": "idea name", "platform": "platform", "description": "how to execute", "estimatedReach": "potential reach"},
    {"title": "idea name", "platform": "platform", "description": "how to execute", "estimatedReach": "potential reach"},
    {"title": "idea name", "platform": "platform", "description": "how to execute", "estimatedReach": "potential reach"}
  ],
  "revenueIdeas": [
    {"idea": "specific revenue idea", "effort": "low/medium/high", "estimatedIncome": "potential income"},
    {"idea": "specific revenue idea", "effort": "low/medium/high", "estimatedIncome": "potential income"},
    {"idea": "specific revenue idea", "effort": "low/medium/high", "estimatedIncome": "potential income"}
  ],
  "collaborationTargets": ["type of artist/creator to collab with", "another type", "another type"],
  "weeklyPriorityTask": "The single highest-impact task to do this week"
}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const ideas = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ success: true, ideas });
    } catch (error: any) {
      console.error("Content ideas error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content ideas" });
    }
  });

  // ─── Strategic Action Advisor Agent ─────────────────────────────────────────
  app.post("/api/ai-agents/action-proposals", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const result = await runAdvisorScanJob("user");
      res.json(result);
    } catch (error: any) {
      console.error("Action proposals error:", error);
      res.status(500).json({ error: error.message || "Failed to generate action proposals" });
    }
  });

  // ─── Development Architect Agent ─────────────────────────────────────────
  app.post("/api/ai-agents/architect", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const now = new Date().toISOString();
      const [job] = await db.insert(agentJobs).values({
        jobType: "architect_scan",
        status: "running",
        triggeredBy: "user",
        startedAt: now,
      }).returning();

      try {
        const memoryContext = await getRecentMemory(10);

        const [songList, beatList, merchList, userCountRes, orderCountRes] = await Promise.all([
          db.select({ id: songs.id, title: songs.title }).from(songs),
          db.select({ id: beats.id, title: beats.title, genre: beats.genre }).from(beats),
          db.select({ id: merchandise.id, title: merchandise.name }).from(merchandise),
          db.select({ count: sql<number>`count(*)` }).from(users),
          db.select({ count: sql<number>`count(*)` }).from(orders),
        ]);

        const platformSnapshot = {
          catalog: {
            songs: songList.length, beats: beatList.length, merch: merchList.length,
            sampleSongs: songList.slice(0, 5).map(s => s.title),
            sampleBeats: beatList.slice(0, 5).map(b => `${b.title} (${b.genre})`),
            sampleMerch: merchList.slice(0, 5).map(m => m.title),
          },
          users: userCountRes[0]?.count || 0,
          orders: orderCountRes[0]?.count || 0,
          existingFeatures: [
            "Music streaming with audio player", "Beat licensing store", "Merchandise shop",
            "Stripe payments (live)", "Tiered membership (Free/VIP/Ultimate Fan)",
            "Lyrics + song meaning display", "Artist messages section", "Fan wall with moderation",
            "Playlists management", "Likes & comments on songs/videos",
            "Listening history & resume playback", "Album cover download gallery",
            "Secure digital downloads with 2-download limit", "Email notifications via Resend",
            "Admin dashboard with analytics", "AI Command Center with agent memory & jobs", "PWA support",
          ],
        };

        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are the Autonomous Development Architect Agent for Project DNA Music LLC. Identify 4 impactful improvements — features, fixes, optimizations, or integrations — to increase revenue, growth, automation, or UX. Be specific. Do NOT repeat items already in memory.`,
            },
            {
              role: "user",
              content: `Platform data:
${JSON.stringify(platformSnapshot, null, 2)}

Agent memory (things already proposed or rejected):
${memoryContext}

Generate exactly 4 feature/improvement proposals ranked by impact. Return JSON:
{
  "proposals": [
    {
      "id": "arch_1",
      "title": "<max 7 words>",
      "objective": "<what this feature/fix does in 1 sentence>",
      "opportunity": "<what gap or problem exists, 2 sentences>",
      "plan": "<how to build it, 2-3 sentences>",
      "assetsRequired": ["<API or tool>"],
      "agentsRequired": ["Development Agent"],
      "expectedResult": "<specific expected outcome>",
      "estimatedTime": "<X hours>",
      "priorityScore": <1-100>,
      "priority": "<critical|high|medium|low>",
      "actionType": "dev_task",
      "actionPayload": { "featureType": "<string>" },
      "qualityScore": <1-10>
    }
  ],
  "architectSummary": "<2 sentence analysis of platform gaps>"
}
Priority: critical=90-100, high=70-89, medium=40-69, low=1-39. qualityScore: 1-4=vague idea, 5-7=clear improvement, 8-10=specific, high-impact, immediately actionable.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const rawProposals: any[] = result.proposals || [];

        const saved = [];
        for (const p of rawProposals) {
          const [row] = await db.insert(agentProposals).values({
            type: "dev_architect", source: "architect",
            title: p.title || "Untitled", objective: p.objective || "",
            opportunity: p.opportunity || "", plan: p.plan || "",
            assetsRequired: JSON.stringify(p.assetsRequired || []),
            agentsRequired: JSON.stringify(p.agentsRequired || ["Development Agent"]),
            expectedResult: p.expectedResult || "", estimatedTime: p.estimatedTime || "Unknown",
            priority: p.priority || "medium", priorityScore: p.priorityScore || 50,
            qualityScore: p.qualityScore || null,
            status: "pending", actionType: "dev_task",
            actionPayload: p.actionPayload ? JSON.stringify(p.actionPayload) : null,
            isQuickAction: 0,
          }).returning();
          saved.push(row);
        }

        const completedNow = new Date().toISOString();
        await db.update(agentJobs).set({
          status: "completed", completedAt: completedNow,
          result: `Saved ${saved.length} architect proposals.`,
        }).where(eq(agentJobs.id, job.id));

        res.json({ success: true, jobId: job.id, savedCount: saved.length, architectSummary: result.architectSummary, proposals: saved });
      } catch (innerErr: any) {
        await db.update(agentJobs).set({ status: "failed", completedAt: new Date().toISOString(), result: innerErr.message }).where(eq(agentJobs.id, job.id));
        throw innerErr;
      }
    } catch (error: any) {
      console.error("Architect agent error:", error);
      res.status(500).json({ error: error.message || "Failed to run architect agent" });
    }
  });

  // ─── Agent Jobs: list recent ───────────────────────────────────────────────
  app.get("/api/agents/jobs", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const rows = await db.select().from(agentJobs).orderBy(desc(agentJobs.createdAt)).limit(20);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Agent Runs: list execution log ──────────────────────────────────────
  app.get("/api/agents/runs", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const runs = await db
        .select({
          run: agentRuns,
          proposal: {
            id: agentProposals.id,
            title: agentProposals.title,
            source: agentProposals.source,
            type: agentProposals.type,
            actionType: agentProposals.actionType,
            plan: agentProposals.plan,
            objective: agentProposals.objective,
            expectedResult: agentProposals.expectedResult,
            estimatedTime: agentProposals.estimatedTime,
            assetsRequired: agentProposals.assetsRequired,
            priority: agentProposals.priority,
            outcomeStatus: agentProposals.outcomeStatus,
            outcomeNotes: agentProposals.outcomeNotes,
            outcomeAt: agentProposals.outcomeAt,
            executedAt: agentProposals.executedAt,
            qualityScore: agentProposals.qualityScore,
          },
        })
        .from(agentRuns)
        .leftJoin(agentProposals, eq(agentRuns.proposalId, agentProposals.id))
        .orderBy(desc(agentRuns.completedAt))
        .limit(50);
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Execution Report: AI-generated structured report at execution time ────
  app.post("/api/ai-agents/execution-report", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const { proposalId } = req.body;
      if (!proposalId) return res.status(400).json({ error: "proposalId required" });

      const [proposal] = await db.select().from(agentProposals).where(eq(agentProposals.id, proposalId));
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });

      const now = new Date();
      const nowStr = now.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });

      const agentNames: Record<string, string> = {
        advisor: "Strategic Action Advisor",
        architect: "Development Architect Agent",
        playlist: "Playlist Placement Agent",
        licensing: "Licensing Intelligence Agent",
        influencer: "Influencer Partnership Agent",
      };
      const agentName = agentNames[proposal.source] || "AI Agent";

      const assets: string[] = proposal.assetsRequired
        ? (() => { try { return JSON.parse(proposal.assetsRequired!); } catch { return [proposal.assetsRequired!]; } })()
        : [];

      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an execution report writer for Project DNA Music LLC's AI agent system. Generate a complete, structured execution report for a proposal that is about to be executed. Be specific, practical, and direct. Use the proposal data provided.`,
          },
          {
            role: "user",
            content: `Generate an execution report for this approved proposal.

PROPOSAL DATA:
- Title: ${proposal.title}
- Agent: ${agentName}
- Type: ${proposal.actionType}
- Objective: ${proposal.objective}
- Plan: ${proposal.plan}
- Expected Result: ${proposal.expectedResult}
- Assets Required: ${assets.join(", ") || "None specified"}
- Estimated Time: ${proposal.estimatedTime}
- Priority: ${proposal.priority}
- Quality Score: ${proposal.qualityScore || "Not rated"}/10
- Start Time: ${nowStr}

Generate the report in this EXACT format with these exact section headers. Be specific and actionable — write 3-5 concrete numbered steps for the action log that someone can actually follow today:

EXECUTION SUMMARY
Task Title: ${proposal.title}
Agent Name: ${agentName}
Objective: [restate objective in 1 clear sentence]
Status: In Progress
Start Time: ${nowStr}
Estimated Completion: [date based on ${proposal.estimatedTime} from today]
Priority: ${proposal.priority}

ACTION LOG
1. [First specific action to take immediately]
2. [Second action]
3. [Third action]
4. [Fourth action]
5. [Fifth action]

TIME LOG
Planning Time: [estimate]
Execution Time: [estimate]
Review Time: [estimate]
Total Estimated Duration: ${proposal.estimatedTime}

ASSETS NEEDED
${assets.length > 0 ? assets.map(a => `• ${a}`).join("\n") : "• No external assets required"}

QUALITY REVIEW
Strategy Quality: [brief assessment of how strong this strategy is]
Strengths: [what makes this proposal solid]
Weaknesses or Gaps: [any risks or missing elements]
Quality Score: ${proposal.qualityScore || "??"}/10
Feasibility: [High / Medium / Low]

EXPECTED RESULTS
Target Outcome: ${proposal.expectedResult}
Business Impact: [what this means for revenue or growth for Project DNA]
Success Metrics: [how to know this worked — measurable indicators]

RECOMMENDED NEXT STEPS
• [Immediate next action after executing this]
• [Follow-up within the timeline]
• Report outcome using "Report How It Went" when complete`,
          },
        ],
      });

      const report = completion.choices[0].message.content || "";
      const nowIso = now.toISOString();

      await db.update(agentProposals).set({
        status: "executed",
        executionResult: report,
        executedAt: nowIso,
      }).where(eq(agentProposals.id, proposalId));

      await db.insert(agentRuns).values({
        proposalId,
        status: "completed",
        resultSummary: report,
        outputData: JSON.stringify({ proposalId, title: proposal.title, agentName }),
        startedAt: proposal.approvedAt || nowIso,
        completedAt: nowIso,
      });

      await writeMemory({
        memoryType: "outcome",
        title: `Executed: ${proposal.title}`,
        content: `Proposal "${proposal.title}" was executed by ${agentName}. Objective: ${proposal.objective}`,
        outcome: report.substring(0, 500),
        tags: proposal.source,
      });

      const [updated] = await db.select().from(agentProposals).where(eq(agentProposals.id, proposalId));
      res.json({ success: true, report, proposal: updated });
    } catch (error: any) {
      console.error("Execution report error:", error);
      res.status(500).json({ error: error.message || "Failed to generate execution report" });
    }
  });

  // ─── Agent Memory: list recent ────────────────────────────────────────────
  app.get("/api/agents/memory", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const rows = await db.select().from(agentMemory).orderBy(desc(agentMemory.createdAt)).limit(30);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Command Center: List all proposals ───────────────────────────────────
  app.get("/api/agent-proposals", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const { status, source } = req.query as { status?: string; source?: string };
      const conditions = [];
      if (status && status !== "all") conditions.push(eq(agentProposals.status, status));
      if (source && source !== "all") conditions.push(eq(agentProposals.source, source));
      const rows = conditions.length > 0
        ? await db.select().from(agentProposals).where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`).orderBy(desc(agentProposals.priorityScore), desc(agentProposals.createdAt))
        : await db.select().from(agentProposals).orderBy(desc(agentProposals.priorityScore), desc(agentProposals.createdAt));
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Command Center: Update proposal status ───────────────────────────────
  app.patch("/api/agent-proposals/:id", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      const { status, adminNote, executionResult } = req.body;
      const now = new Date().toISOString();
      const updateData: any = {};
      if (status) updateData.status = status;
      if (adminNote !== undefined) updateData.adminNote = adminNote;
      if (executionResult !== undefined) updateData.executionResult = executionResult;
      if (status === "approved") updateData.approvedAt = now;
      if (status === "executed") updateData.executedAt = now;
      const [updated] = await db.update(agentProposals).set(updateData).where(eq(agentProposals.id, id)).returning();

      // Audit log + memory
      if (status === "approved" || status === "rejected") {
        await db.insert(agentApprovals).values({
          proposalId: id,
          decision: status,
          notes: adminNote || null,
          approvedBy: "admin",
        });
        if (status === "rejected") {
          await writeMemory({
            memoryType: "rejection",
            title: `Rejected: ${updated.title}`,
            content: `Proposal "${updated.title}" was rejected by admin. Objective: ${updated.objective}`,
            outcome: adminNote ? `Admin note: ${adminNote}` : "Rejected without note",
            tags: updated.source,
          });
        }
      }
      if (status === "executed") {
        await db.insert(agentRuns).values({
          proposalId: id,
          status: "completed",
          resultSummary: executionResult || updated.executionResult || "Executed",
          outputData: JSON.stringify({ proposalId: id, title: updated.title }),
          startedAt: updated.approvedAt || now,
          completedAt: now,
        });
        await writeMemory({
          memoryType: "outcome",
          title: `Executed: ${updated.title}`,
          content: `Proposal "${updated.title}" was executed. Objective: ${updated.objective}`,
          outcome: executionResult || updated.executionResult || "Completed",
          tags: updated.source,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Command Center: Record real-world outcome ────────────────────────────
  app.patch("/api/agent-proposals/:id/outcome", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      const { outcomeStatus, outcomeNotes } = req.body as { outcomeStatus: "success" | "partial" | "failed"; outcomeNotes?: string };
      if (!outcomeStatus) return res.status(400).json({ error: "outcomeStatus required" });
      const now = new Date().toISOString();

      const [updated] = await db.update(agentProposals)
        .set({ outcomeStatus, outcomeNotes: outcomeNotes || null, outcomeAt: now })
        .where(eq(agentProposals.id, id))
        .returning();

      const outcomeLabel = outcomeStatus === "success" ? "succeeded" : outcomeStatus === "partial" ? "partially worked" : "failed";
      const memoryTypeLabel: "outcome" | "learning" = outcomeStatus === "failed" ? "learning" : "outcome";

      await writeMemory({
        businessUnit: updated.source || "general",
        memoryType: memoryTypeLabel,
        title: `${outcomeStatus === "success" ? "Worked" : outcomeStatus === "partial" ? "Partial" : "Failed"}: ${updated.title}`,
        content: `Strategy "${updated.title}" (type: ${updated.actionType || updated.type}, source: ${updated.source}) ${outcomeLabel}. Original plan: ${updated.plan?.substring(0, 150) || updated.objective?.substring(0, 150)}.`,
        outcome: outcomeStatus === "success"
          ? `SUCCESS${outcomeNotes ? `: ${outcomeNotes}` : " — repeat and build on this approach"}`
          : outcomeStatus === "partial"
          ? `PARTIAL${outcomeNotes ? `: ${outcomeNotes}` : " — refine this strategy, not abandon it"}`
          : `FAILED${outcomeNotes ? `: ${outcomeNotes}` : " — do not repeat this approach"}`,
        tags: updated.source,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Command Center: Delete proposal ─────────────────────────────────────
  app.delete("/api/agent-proposals/:id", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      await db.delete(agentProposals).where(eq(agentProposals.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Playlist Placement Agent ─────────────────────────────────────────────
  app.post("/api/ai-agents/playlist-placement", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const now = new Date().toISOString();
      const [job] = await db.insert(agentJobs).values({
        jobType: "playlist_scan",
        status: "running",
        triggeredBy: "user",
        startedAt: now,
      }).returning();

      try {
        const memoryContext = await getRecentMemory(10);

        const [songList, beatList] = await Promise.all([
          db.select({ id: songs.id, title: songs.title, price: songs.price }).from(songs),
          db.select({ id: beats.id, title: beats.title, genre: beats.genre, bpm: beats.bpm }).from(beats),
        ]);

        const catalogSnapshot = {
          artist: "Shakim (Project DNA Music LLC)",
          genres: [...new Set(beatList.map(b => b.genre).filter(Boolean))].slice(0, 10),
          songs: songList.slice(0, 10).map(s => ({ title: s.title })),
          beats: beatList.slice(0, 8).map(b => ({ title: b.title, genre: b.genre, bpm: b.bpm })),
          totalSongs: songList.length,
          totalBeats: beatList.length,
        };

        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a Playlist Placement Specialist for Project DNA Music LLC. Analyze the artist's catalog and generate exactly 4 actionable playlist placement proposals. Each proposal should target a specific type of playlist, platform, or curator with a clear submission strategy. Focus on realistic opportunities that match the catalog's genres.

LEARNING RULES:
- WHAT WORKED in memory: generate proposals that expand on successful placements (new genre playlist, different platform, higher-tier curator)
- WHAT FAILED: avoid those platform/curator types entirely. Try a different angle
- PARTIAL successes: refine the approach — different submission format, better pitch angle, or complementary song
- REJECTED by admin: permanently off-limits`,
            },
            {
              role: "user",
              content: `Catalog data:
${JSON.stringify(catalogSnapshot, null, 2)}

Agent memory (already tried or rejected):
${memoryContext}

Generate exactly 4 playlist placement proposals. Return JSON:
{
  "placementSummary": "<2 sentence overview of placement strategy>",
  "proposals": [
    {
      "id": "pl_1",
      "title": "<max 7 words, specific playlist target>",
      "opportunity": "<what playlist/platform and why it fits this artist, 2 sentences>",
      "plan": "<step-by-step submission plan, 2-3 sentences>",
      "assetsRequired": ["<what to prepare: pitch, EPK, song, etc>"],
      "expectedResult": "<streams or follower growth estimate>",
      "estimatedTime": "<X days>",
      "priorityScore": <1-100>,
      "priority": "<critical|high|medium|low>",
      "platform": "<Spotify|Apple Music|YouTube|SoundCloud|Tidal|SubmitHub|etc>",
      "qualityScore": <1-10>
    }
  ]
}
Priority: high=70-89, medium=40-69. qualityScore: 1-4=generic, 5-7=specific playlist target, 8-10=named playlist/curator with clear fit and submission path. Be specific about playlist names/types (e.g. "Hip Hop Motivation", "New Music Friday", SubmitHub curators). Do NOT repeat anything in memory.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const rawProposals: any[] = result.proposals || [];

        const saved = [];
        for (const p of rawProposals) {
          const [row] = await db.insert(agentProposals).values({
            type: "playlist_placement",
            source: "playlist",
            title: p.title || "Playlist Opportunity",
            objective: p.plan || "",
            opportunity: p.opportunity || "",
            plan: p.plan || "",
            assetsRequired: JSON.stringify(p.assetsRequired || []),
            agentsRequired: JSON.stringify(["Playlist Placement Agent"]),
            expectedResult: p.expectedResult || "",
            estimatedTime: p.estimatedTime || "Unknown",
            priority: p.priority || "medium",
            priorityScore: p.priorityScore || 50,
            qualityScore: p.qualityScore || null,
            status: "pending",
            actionType: "playlist_placement",
            actionPayload: JSON.stringify({ platform: p.platform }),
            isQuickAction: 0,
          }).returning();
          saved.push(row);
        }

        await db.update(agentJobs).set({
          status: "completed",
          completedAt: new Date().toISOString(),
          result: `Saved ${saved.length} playlist placement proposals.`,
        }).where(eq(agentJobs.id, job.id));

        res.json({ success: true, jobId: job.id, savedCount: saved.length, placementSummary: result.placementSummary, proposals: saved });
      } catch (innerErr: any) {
        await db.update(agentJobs).set({ status: "failed", completedAt: new Date().toISOString(), result: innerErr.message }).where(eq(agentJobs.id, job.id));
        throw innerErr;
      }
    } catch (error: any) {
      console.error("Playlist placement agent error:", error);
      res.status(500).json({ error: error.message || "Failed to run playlist placement agent" });
    }
  });

  // ─── Licensing Intelligence Agent ─────────────────────────────────────────
  app.post("/api/ai-agents/licensing", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const now = new Date().toISOString();
      const [job] = await db.insert(agentJobs).values({
        jobType: "licensing_scan",
        status: "running",
        triggeredBy: "user",
        startedAt: now,
      }).returning();

      try {
        const memoryContext = await getRecentMemory(10);

        const [songList, beatList] = await Promise.all([
          db.select({ id: songs.id, title: songs.title, price: songs.price }).from(songs),
          db.select({ id: beats.id, title: beats.title, genre: beats.genre, bpm: beats.bpm, price: beats.price }).from(beats),
        ]);

        const catalogSnapshot = {
          artist: "Shakim (Project DNA Music LLC)",
          genres: [...new Set(beatList.map(b => b.genre).filter(Boolean))].slice(0, 10),
          songs: songList.slice(0, 12).map(s => ({ title: s.title, price: s.price })),
          beats: beatList.slice(0, 10).map(b => ({ title: b.title, genre: b.genre, bpm: b.bpm, price: b.price })),
          totalCatalog: songList.length + beatList.length,
        };

        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a Music Licensing Specialist for Project DNA Music LLC. Analyze the catalog and identify exactly 4 sync licensing or deal opportunities — TV, film, YouTube channels, video games, advertisements, or brand partnerships. Be specific about the type of media and how the music fits.

LEARNING RULES:
- WHAT WORKED in memory: propose deals in adjacent categories or with bigger partners in the same vertical
- WHAT FAILED: avoid that deal type/vertical entirely, try a completely different licensing category
- PARTIAL successes: refine pitch, targeting, or pricing for that vertical
- REJECTED by admin: off-limits permanently`,
            },
            {
              role: "user",
              content: `Catalog data:
${JSON.stringify(catalogSnapshot, null, 2)}

Agent memory (already tried or rejected):
${memoryContext}

Generate exactly 4 licensing deal proposals. Return JSON:
{
  "licensingSummary": "<2 sentence overview of the catalog's licensing potential>",
  "proposals": [
    {
      "id": "lic_1",
      "title": "<max 7 words, specific licensing target>",
      "opportunity": "<what media type, platform, or brand and why this catalog fits, 2 sentences>",
      "plan": "<how to pitch and secure the deal, 2-3 sentences>",
      "assetsRequired": ["<master license", "sync rights", "instrumental version", "metadata sheet", etc>"],
      "expectedResult": "<licensing fee range or exposure benefit>",
      "estimatedTime": "<X weeks>",
      "priorityScore": <1-100>,
      "priority": "<critical|high|medium|low>",
      "dealType": "<sync|brand|YouTube|TV|film|game|ad>",
      "suggestedSongs": ["<song title best suited for this deal>"],
      "qualityScore": <1-10>
    }
  ]
}
Priority: high=70-89, medium=40-69. qualityScore: 1-4=vague deal type, 5-7=specific media category and pitch angle, 8-10=named brand/show/channel with clear song match and fee range. Be specific (e.g. "Sync license for indie gaming trailers", "Brand deal with streetwear label"). Do NOT repeat anything in memory.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const rawProposals: any[] = result.proposals || [];

        const saved = [];
        for (const p of rawProposals) {
          const [row] = await db.insert(agentProposals).values({
            type: "licensing_deal",
            source: "licensing",
            title: p.title || "Licensing Opportunity",
            objective: p.plan || "",
            opportunity: p.opportunity || "",
            plan: p.plan || "",
            assetsRequired: JSON.stringify(p.assetsRequired || []),
            agentsRequired: JSON.stringify(["Licensing Agent"]),
            expectedResult: p.expectedResult || "",
            estimatedTime: p.estimatedTime || "Unknown",
            priority: p.priority || "medium",
            priorityScore: p.priorityScore || 50,
            qualityScore: p.qualityScore || null,
            status: "pending",
            actionType: "licensing_deal",
            actionPayload: JSON.stringify({ dealType: p.dealType, suggestedSongs: p.suggestedSongs }),
            isQuickAction: 0,
          }).returning();
          saved.push(row);
        }

        await db.update(agentJobs).set({
          status: "completed",
          completedAt: new Date().toISOString(),
          result: `Saved ${saved.length} licensing proposals.`,
        }).where(eq(agentJobs.id, job.id));

        res.json({ success: true, jobId: job.id, savedCount: saved.length, licensingSummary: result.licensingSummary, proposals: saved });
      } catch (innerErr: any) {
        await db.update(agentJobs).set({ status: "failed", completedAt: new Date().toISOString(), result: innerErr.message }).where(eq(agentJobs.id, job.id));
        throw innerErr;
      }
    } catch (error: any) {
      console.error("Licensing agent error:", error);
      res.status(500).json({ error: error.message || "Failed to run licensing agent" });
    }
  });

  // ─── Influencer Partnership Agent ─────────────────────────────────────────
  app.post("/api/ai-agents/influencer", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

      const now = new Date().toISOString();
      const [job] = await db.insert(agentJobs).values({
        jobType: "influencer_scan",
        status: "running",
        triggeredBy: "user",
        startedAt: now,
      }).returning();

      try {
        const memoryContext = await getRecentMemory(10);

        const [songList, beatList, userCountRes, orderCountRes] = await Promise.all([
          db.select({ id: songs.id, title: songs.title }).from(songs),
          db.select({ id: beats.id, title: beats.title, genre: beats.genre }).from(beats),
          db.select({ count: sql<number>`count(*)` }).from(users),
          db.select({ count: sql<number>`count(*)` }).from(orders),
        ]);

        const catalogSnapshot = {
          artist: "Shakim (Project DNA Music LLC)",
          genres: [...new Set(beatList.map(b => b.genre).filter(Boolean))].slice(0, 10),
          sampleSongs: songList.slice(0, 8).map(s => ({ title: s.title })),
          totalFans: userCountRes[0]?.count || 0,
          totalOrders: orderCountRes[0]?.count || 0,
          platformPresence: ["projectdnamusic.info", "E-commerce store", "Beat licensing", "Music streaming"],
        };

        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an Influencer Partnership Specialist for Project DNA Music LLC. Analyze the artist's catalog, genre, and platform presence to identify exactly 4 influencer partnership opportunities. Focus on realistic, genre-aligned collaborations across TikTok, YouTube, Instagram, and music blogs that would drive streams, sales, or brand awareness.

LEARNING RULES:
- WHAT WORKED in memory: target similar influencer types but with wider reach or complementary niche
- WHAT FAILED: avoid those influencer categories/platforms. Find alternatives in untapped channels
- PARTIAL successes: suggest improved pitch strategy, better asset package, or different collaboration format
- REJECTED by admin: permanently off-limits`,
            },
            {
              role: "user",
              content: `Artist and catalog data:
${JSON.stringify(catalogSnapshot, null, 2)}

Agent memory (already tried or rejected):
${memoryContext}

Generate exactly 4 influencer partnership proposals. Return JSON:
{
  "influencerSummary": "<2 sentence overview of the partnership strategy>",
  "proposals": [
    {
      "id": "inf_1",
      "title": "<max 7 words, specific influencer type/target>",
      "opportunity": "<what type of influencer, platform, and why they align with this artist, 2 sentences>",
      "plan": "<how to find, approach, and structure the deal, 2-3 sentences>",
      "assetsRequired": ["<free download code", "press kit", "stems/instrumental", etc>"],
      "expectedResult": "<follower growth, stream increase, or brand awareness outcome>",
      "estimatedTime": "<X weeks>",
      "priorityScore": <1-100>,
      "priority": "<critical|high|medium|low>",
      "platform": "<TikTok|YouTube|Instagram|Twitter|Blog|Podcast>",
      "influencerType": "<e.g. music curator, lifestyle vlogger, rapper, fitness creator, etc>",
      "qualityScore": <1-10>
    }
  ]
}
Priority: high=70-89, medium=40-69. qualityScore: 1-4=generic influencer category, 5-7=specific niche and platform, 8-10=specific creator archetype with follower range, outreach method, and expected result. Be specific about the influencer niche (e.g. "TikTok hip-hop dance creators 50K-500K followers"). Do NOT repeat anything in memory.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const rawProposals: any[] = result.proposals || [];

        const saved = [];
        for (const p of rawProposals) {
          const [row] = await db.insert(agentProposals).values({
            type: "influencer_collab",
            source: "influencer",
            title: p.title || "Influencer Partnership",
            objective: p.plan || "",
            opportunity: p.opportunity || "",
            plan: p.plan || "",
            assetsRequired: JSON.stringify(p.assetsRequired || []),
            agentsRequired: JSON.stringify(["Influencer Agent"]),
            expectedResult: p.expectedResult || "",
            estimatedTime: p.estimatedTime || "Unknown",
            priority: p.priority || "medium",
            priorityScore: p.priorityScore || 50,
            qualityScore: p.qualityScore || null,
            status: "pending",
            actionType: "influencer_collab",
            actionPayload: JSON.stringify({ platform: p.platform, influencerType: p.influencerType }),
            isQuickAction: 0,
          }).returning();
          saved.push(row);
        }

        await db.update(agentJobs).set({
          status: "completed",
          completedAt: new Date().toISOString(),
          result: `Saved ${saved.length} influencer partnership proposals.`,
        }).where(eq(agentJobs.id, job.id));

        res.json({ success: true, jobId: job.id, savedCount: saved.length, influencerSummary: result.influencerSummary, proposals: saved });
      } catch (innerErr: any) {
        await db.update(agentJobs).set({ status: "failed", completedAt: new Date().toISOString(), result: innerErr.message }).where(eq(agentJobs.id, job.id));
        throw innerErr;
      }
    } catch (error: any) {
      console.error("Influencer agent error:", error);
      res.status(500).json({ error: error.message || "Failed to run influencer agent" });
    }
  });

  // ─── Get products list for marketing agent dropdown ───────────────────────
  app.get("/api/ai-agents/products", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
      const songList = await db.select({ id: songs.id, title: songs.title }).from(songs);
      const beatList = await db.select({ id: beats.id, title: beats.title, genre: beats.genre }).from(beats);
      const merchList = await db.select({ id: merchandise.id, title: merchandise.name }).from(merchandise);
      res.json({
        songs: songList.map((s) => ({ id: s.id, title: s.title, type: "song" })),
        beats: beatList.map((b) => ({ id: b.id, title: `${b.title} (${b.genre})`, type: "beat" })),
        merch: merchList.map((m) => ({ id: m.id, title: m.title, type: "merch" })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
