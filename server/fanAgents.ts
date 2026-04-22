/**
 * Project DNA — N1M Fan Conversion AI Agents
 * Scouts, drafts messages, scores leads, and generates daily reports
 */

import type { Express } from "express";
import { db } from "./db";
import {
  fans, fanInteractions, fanScores, fanStageHistory,
  campaignLinks, fanLinkClicks, fanConversions, n1mAgentTasks, fanDailyReports,
  fanContacts
} from "@shared/schema";
import { eq, desc, sql, and, lt } from "drizzle-orm";
import { aiComplete, aiCompleteJSON } from "./aiClient";

const now = () => new Date().toISOString();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateFanScore(fanId: string, scoreChange: number, reason: string, sourceEvent: string) {
  await db.insert(fanScores).values({ fanId, scoreChange, reason, sourceEvent, createdAt: now() });
  await db.update(fans)
    .set({ leadScore: sql`lead_score + ${scoreChange}`, updatedAt: now() })
    .where(eq(fans.id, fanId));
}

async function updateFanStage(fanId: string, newStage: string, reason: string) {
  const [fan] = await db.select({ stage: fans.stage }).from(fans).where(eq(fans.id, fanId));
  if (!fan || fan.stage === newStage) return;
  await db.insert(fanStageHistory).values({ fanId, oldStage: fan.stage, newStage, reason, changedAt: now() });
  await db.update(fans).set({ stage: newStage, updatedAt: now() }).where(eq(fans.id, fanId));
}

async function logInteraction(fanId: string, type: string, channel: string, direction: string, message?: string) {
  await db.insert(fanInteractions).values({
    fanId, interactionType: type, channel, direction,
    messageText: message ?? null,
    occurredAt: now(), createdAt: now(),
  });
  await db.update(fans).set({ lastContactDate: now(), updatedAt: now() }).where(eq(fans.id, fanId));
}

async function callOpenAI(prompt: string): Promise<string> {
  return aiComplete({
    model: "powerful",
    messages: [{ role: "user", content: prompt }],
    jsonMode: true,
    maxTokens: 1500,
  });
}

// ─── AGENT 1: Traffic Scout ────────────────────────────────────────────────────

export async function runTrafficScoutAgent(triggeredBy = "user") {
  const taskId = crypto.randomUUID();
  const startedAt = now();

  // Get all fans sorted by lead score descending, limited to actionable ones
  const allFans = await db.select().from(fans).orderBy(desc(fans.leadScore)).limit(50);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const fanSummaries = allFans.map(f => ({
    id: f.id,
    username: f.username,
    stage: f.stage,
    leadScore: f.leadScore,
    lastContact: f.lastContactDate,
    lastReply: f.lastReplyDate,
    websiteClicked: f.websiteClicked,
    emailCaptured: f.emailCaptured,
    purchaseStatus: f.purchaseStatus,
    city: f.city,
    favoriteSong: f.favoriteSong,
  }));

  const prompt = `You are the Project DNA Traffic Scout Agent.

Review these N1M fan records and identify the best outreach opportunities for today.

Fan records:
${JSON.stringify(fanSummaries, null, 2)}

Stage meanings:
cold_follower = no contact yet
contacted = first message sent
engaged = they replied
qualified = showed real interest  
clicked = visited projectdnamusic.info
captured = submitted email
converted = made a purchase or joined VIP
loyal_supporter = actively engaged multiple times
inactive = no engagement for 30+ days

Scoring rules:
- New follower: +5, Reply: +10, Website click: +15, Email submitted: +25, Purchase: +40

For each fan, decide:
- priority_level: high / medium / low
- reason_selected
- recommended_next_action: first_touch / follow_up / send_site_link / nurture / rewarm / vip_invite
- recommended_agent: engagement / conversion / follow_up / sales

Return JSON:
{
  "run_date": "${new Date().toDateString()}",
  "total_fans_reviewed": ${allFans.length},
  "fans_to_contact": [
    {
      "fan_id": "...",
      "username": "...",
      "current_stage": "...",
      "lead_score": 0,
      "priority_level": "high|medium|low",
      "reason_selected": "...",
      "recommended_next_action": "...",
      "recommended_agent": "..."
    }
  ],
  "summary": "...",
  "high_priority_count": 0,
  "medium_priority_count": 0
}`;

  const result = await callOpenAI(prompt);
  const parsed = JSON.parse(result);

  await db.insert(n1mAgentTasks).values({
    agentName: "traffic_scout",
    taskType: "daily_scout",
    taskPayload: JSON.stringify({ triggered_by: triggeredBy }),
    status: "completed",
    resultSummary: result,
    executionSeconds: ((new Date().getTime() - new Date(startedAt).getTime()) / 1000).toFixed(2),
    createdAt: startedAt,
    startedAt,
    completedAt: now(),
  });

  return parsed;
}

// ─── AGENT 2: Engagement Agent (Message Drafts) ───────────────────────────────

export async function runEngagementAgent(fanId: string) {
  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (!fan) throw new Error("Fan not found");

  const interactions = await db.select().from(fanInteractions)
    .where(eq(fanInteractions.fanId, fanId))
    .orderBy(desc(fanInteractions.occurredAt))
    .limit(5);

  const prompt = `You are the Project DNA Engagement Agent.

Write a short, natural outreach message for this N1M fan.

Fan profile:
- Username: ${fan.username || "unknown"}
- Stage: ${fan.stage}
- Lead score: ${fan.leadScore}
- City: ${fan.city || "unknown"}
- Favorite song: ${fan.favoriteSong || "unknown"}
- Website clicked: ${fan.websiteClicked ? "yes" : "no"}
- Email captured: ${fan.emailCaptured ? "yes" : "no"}

Recent interactions:
${interactions.map(i => `- ${i.direction} ${i.interactionType}: ${i.messageText || "(no text)"}`).join("\n") || "None yet"}

Brand voice: warm, soulful, confident, real, appreciative, artist-led, never corny, never pushy
Rules:
- Under 35 words for first-touch messages
- No link in first message unless stage is qualified or beyond
- If stage is qualified/clicked, include: projectdnamusic.info
- One clear purpose per message

Return JSON:
{
  "stage": "${fan.stage}",
  "message": "...",
  "message_goal": "...",
  "why_this_message": "...",
  "include_link": true/false,
  "suggested_sequence": "A|B|C|D"
}`;

  const result = await callOpenAI(prompt);

  // Log that a draft was generated
  await logInteraction(fanId, "message_drafted", "N1M", "outbound", JSON.parse(result).message);

  return JSON.parse(result);
}

// ─── AGENT 3: Fan Profile Agent (create/update) ───────────────────────────────

export async function runFanProfileAgent(data: {
  username?: string;
  platformUserId?: string;
  city?: string;
  favoriteSong?: string;
  email?: string;
  replyText?: string;
  event: string;
}) {
  const existing = data.platformUserId
    ? await db.select().from(fans).where(eq(fans.platformUserId, data.platformUserId)).limit(1)
    : data.username
    ? await db.select().from(fans).where(eq(fans.username, data.username)).limit(1)
    : [];

  const scoreMap: Record<string, number> = {
    new_follower: 5,
    reply_received: 10,
    favorite_song_mentioned: 10,
    asked_for_more_music: 15,
    website_clicked: 15,
    email_submitted: 25,
    email_opened: 10,
    offer_clicked: 10,
    purchase_completed: 40,
    vip_joined: 35,
  };

  const scoreChange = scoreMap[data.event] || 0;

  if (existing.length === 0) {
    // Create new fan
    const [newFan] = await db.insert(fans).values({
      username: data.username,
      platformUserId: data.platformUserId,
      city: data.city,
      favoriteSong: data.favoriteSong,
      email: data.email,
      emailCaptured: data.email ? 1 : 0,
      leadScore: 5, // new follower default
      stage: "cold_follower",
      createdAt: now(),
      updatedAt: now(),
    }).returning();

    if (scoreChange > 0) {
      await updateFanScore(newFan.id, scoreChange, data.event, data.event);
    }

    await db.insert(fanStageHistory).values({
      fanId: newFan.id, oldStage: null, newStage: "cold_follower",
      reason: "new fan created", changedAt: now(),
    });

    return { action: "created", fanId: newFan.id };
  } else {
    const fan = existing[0];
    const updates: any = { updatedAt: now() };
    if (data.city && !fan.city) updates.city = data.city;
    if (data.favoriteSong && !fan.favoriteSong) updates.favoriteSong = data.favoriteSong;
    if (data.email && !fan.email) { updates.email = data.email; updates.emailCaptured = 1; }

    if (Object.keys(updates).length > 1) {
      await db.update(fans).set(updates).where(eq(fans.id, fan.id));
    }
    if (scoreChange > 0) {
      await updateFanScore(fan.id, scoreChange, data.event, data.event);
    }

    return { action: "updated", fanId: fan.id };
  }
}

// ─── AGENT 4: Conversion Message Agent ────────────────────────────────────────

export async function runConversionAgent(fanId: string) {
  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (!fan) throw new Error("Fan not found");

  const prompt = `You are the Project DNA Conversion Agent.

This fan is ready to be invited to projectdnamusic.info.

Fan:
- Username: ${fan.username}
- Stage: ${fan.stage}
- Lead score: ${fan.leadScore}
- Favorite song: ${fan.favoriteSong || "unknown"}
- City: ${fan.city || "unknown"}
- Website clicked before: ${fan.websiteClicked ? "yes" : "no"}

Based on their interest, choose the best destination:
- featured track page → /music
- email signup / VIP join → /join
- merch → /merch
- beats/producer → /producer

Write a short conversion message (under 40 words) that naturally invites them to the site.

Return JSON:
{
  "conversion_message": "...",
  "cta_type": "listen|signup|shop|vip",
  "destination_type": "music|join|merch|producer",
  "destination_url": "https://projectdnamusic.info/...",
  "reason": "...",
  "expected_conversion_goal": "..."
}`;

  const result = await callOpenAI(prompt);
  await logInteraction(fanId, "link_sent", "N1M", "outbound", JSON.parse(result).conversion_message);
  await updateFanStage(fanId, "qualified", "conversion message drafted");
  return JSON.parse(result);
}

// ─── AGENT 5: Daily Report Agent ─────────────────────────────────────────────

export async function runDailyReportAgent(triggeredBy = "system") {
  const today = new Date().toISOString().split("T")[0];
  const startOfDay = `${today}T00:00:00.000Z`;

  // Check if already ran today
  const existing = await db.select().from(fanDailyReports).where(eq(fanDailyReports.reportDate, today));
  if (existing.length > 0 && triggeredBy === "system") {
    return { skipped: true, reason: "Already ran today" };
  }

  const [
    totalFans,
    newFansToday,
    messagesCount,
    repliesCount,
    websiteClicks,
    emailCaptures,
    conversionCount,
    stageBreakdown,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(fans),
    db.select({ count: sql<number>`count(*)::int` }).from(fans).where(sql`created_at >= ${startOfDay}`),
    db.select({ count: sql<number>`count(*)::int` }).from(fanInteractions)
      .where(and(sql`created_at >= ${startOfDay}`, eq(fanInteractions.direction, "outbound"))),
    db.select({ count: sql<number>`count(*)::int` }).from(fanInteractions)
      .where(and(sql`created_at >= ${startOfDay}`, eq(fanInteractions.interactionType, "reply_received"))),
    db.select({ count: sql<number>`count(*)::int` }).from(fanLinkClicks).where(sql`clicked_at >= ${startOfDay}`),
    db.select({ count: sql<number>`count(*)::int` }).from(fans).where(eq(fans.emailCaptured, 1)),
    db.select({ count: sql<number>`count(*)::int` }).from(fanConversions).where(sql`converted_at >= ${startOfDay}`),
    db.select({ stage: fans.stage, count: sql<number>`count(*)::int` }).from(fans).groupBy(fans.stage),
  ]);

  const metrics = {
    total_fans: totalFans[0]?.count ?? 0,
    new_fans_today: newFansToday[0]?.count ?? 0,
    messages_sent: messagesCount[0]?.count ?? 0,
    replies_received: repliesCount[0]?.count ?? 0,
    website_clicks: websiteClicks[0]?.count ?? 0,
    email_captures: emailCaptures[0]?.count ?? 0,
    conversions_today: conversionCount[0]?.count ?? 0,
    stage_breakdown: stageBreakdown,
  };

  const prompt = `You are the Project DNA Daily Executive Report Agent.

Generate a clean daily report for ${today}.

Metrics:
${JSON.stringify(metrics, null, 2)}

Write a sharp executive summary with:
1. What happened today
2. What's working
3. What needs attention
4. Top 3 recommended actions for tomorrow
5. Fan pipeline health

Keep it direct, actionable, and under 300 words.

Return JSON:
{
  "summary": "...",
  "whats_working": "...",
  "needs_attention": "...",
  "top_recommendations": ["...", "...", "..."],
  "pipeline_health": "strong|moderate|weak",
  "health_reason": "..."
}`;

  const aiResult = await callOpenAI(prompt);
  const parsed = JSON.parse(aiResult);

  await db.insert(fanDailyReports).values({
    reportDate: today,
    newFans: metrics.new_fans_today,
    messagesSent: metrics.messages_sent,
    repliesReceived: metrics.replies_received,
    linksSent: 0,
    websiteClicks: metrics.website_clicks,
    emailCaptures: metrics.email_captures,
    conversions: metrics.conversions_today,
    aiSummary: parsed.summary,
    topMessages: JSON.stringify(parsed.top_recommendations),
    recommendations: JSON.stringify(parsed),
    createdAt: now(),
  });

  return { ...parsed, metrics, reportDate: today };
}

// ─── AGENT 6: Follow-Up Agent ─────────────────────────────────────────────────

export async function runFollowUpAgent(fanId: string) {
  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (!fan) throw new Error("Fan not found");

  const interactions = await db.select().from(fanInteractions)
    .where(eq(fanInteractions.fanId, fanId))
    .orderBy(desc(fanInteractions.occurredAt))
    .limit(5);

  const prompt = `You are the Project DNA Follow-Up Agent.

Decide the best follow-up for this fan and write the message.

Fan:
- Username: ${fan.username}
- Stage: ${fan.stage}
- Lead score: ${fan.leadScore}
- Website clicked: ${fan.websiteClicked ? "yes" : "no"}
- Email captured: ${fan.emailCaptured ? "yes" : "no"}
- Last contact: ${fan.lastContactDate || "never"}
- Last reply: ${fan.lastReplyDate || "never"}

Recent interactions:
${interactions.map(i => `- ${i.direction} ${i.interactionType}: ${i.messageText || "(no text)"}`).join("\n") || "None"}

Rules:
- clicked but no signup → remind them of exclusive access
- signed up → move toward music or merch
- purchased → appreciation + loyalty building
- went inactive → respectful rewarm, no begging
- One main ask per message
- Soulful, real, respectful tone

Return JSON:
{
  "follow_up_type": "reminder|nurture|appreciation|rewarm",
  "recommended_timing": "now|tomorrow|in_3_days",
  "message": "...",
  "message_goal": "...",
  "reason": "..."
}`;

  const result = await callOpenAI(prompt);
  return JSON.parse(result);
}

// ─── AGENT 7: Welcome Email Agent ─────────────────────────────────────────────

export async function runWelcomeEmailAgent(fanId: string) {
  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (!fan || !fan.email) throw new Error("Fan not found or no email");

  const prompt = `You are the Project DNA Email Welcome Agent.

Write a 5-email welcome sequence for a fan who just joined from N1M.

Fan:
- Name: ${fan.displayName || fan.username || "friend"}
- City: ${fan.city || "unknown"}
- Favorite song: ${fan.favoriteSong || "unknown"}

Brand voice: warm, genuine, artistic, movement-driven, never spammy.

Email goals:
1. Welcome + deliver
2. Deepen connection
3. Share mission/story
4. Present support offer
5. Invite to VIP / DNA Circle

Return JSON:
{
  "emails": [
    {
      "email_number": 1,
      "subject_line": "...",
      "preview_text": "...",
      "body_copy": "...",
      "primary_cta": "...",
      "cta_url": "https://projectdnamusic.info/...",
      "email_goal": "..."
    }
  ]
}`;

  return JSON.parse(await callOpenAI(prompt));
}

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerFanAgentRoutes(app: Express) {

  // Campaign link tracking redirect
  app.get("/r/:code", async (req, res) => {
    const { code } = req.params;
    try {
      const [link] = await db.select().from(campaignLinks).where(eq(campaignLinks.trackingCode, code));
      if (!link) return res.redirect("https://projectdnamusic.info");

      // Increment click count
      await db.update(campaignLinks)
        .set({ clickCount: sql`click_count + 1` })
        .where(eq(campaignLinks.id, link.id));

      // Log the click
      await db.insert(fanLinkClicks).values({
        campaignLinkId: link.id,
        clickedUrl: link.destinationUrl,
        referrer: "N1M",
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        clickedAt: now(),
      });

      return res.redirect(link.destinationUrl);
    } catch {
      return res.redirect("https://projectdnamusic.info");
    }
  });

  // ── Fan CRUD ────────────────────────────────────────────────────────────────

  app.get("/api/fans", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const allFans = await db.select().from(fans).orderBy(desc(fans.leadScore));
    res.json(allFans);
  });

  app.post("/api/fans", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const { username, platformUserId, displayName, city, email, phone, country, notes, sourcePlatform } = req.body;
    const [fan] = await db.insert(fans).values({
      username, platformUserId, displayName, city, email, phone, country, notes,
      sourcePlatform: sourcePlatform || "N1M",
      emailCaptured: email ? 1 : 0,
      phoneCaptured: phone ? 1 : 0,
      leadScore: 5,
      stage: "cold_follower",
      createdAt: now(), updatedAt: now(),
    }).returning();

    await db.insert(fanStageHistory).values({
      fanId: fan.id, newStage: "cold_follower", reason: "fan created manually", changedAt: now(),
    });

    res.json(fan);
  });

  app.patch("/api/fans/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: now() };
    delete updates.id; delete updates.createdAt;

    // Handle stage change with history
    if (updates.stage) {
      const [current] = await db.select({ stage: fans.stage }).from(fans).where(eq(fans.id, id));
      if (current && current.stage !== updates.stage) {
        await db.insert(fanStageHistory).values({
          fanId: id, oldStage: current.stage, newStage: updates.stage,
          reason: "manual update by admin", changedAt: now(),
        });
      }
    }

    const [updated] = await db.update(fans).set(updates).where(eq(fans.id, id)).returning();
    res.json(updated);
  });

  app.delete("/api/fans/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    await db.delete(fans).where(eq(fans.id, req.params.id));
    res.json({ success: true });
  });

  app.get("/api/fans/:id/interactions", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const interactions = await db.select().from(fanInteractions)
      .where(eq(fanInteractions.fanId, req.params.id))
      .orderBy(desc(fanInteractions.occurredAt));
    res.json(interactions);
  });

  app.post("/api/fans/:id/interactions", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const { interactionType, channel, direction, messageText } = req.body;
    await logInteraction(req.params.id, interactionType, channel || "N1M", direction || "outbound", messageText);

    // Auto-update score based on interaction type
    const scoreMap: Record<string, number> = {
      reply_received: 10, link_clicked: 15, email_submitted: 25, purchase_completed: 40, vip_joined: 35,
    };
    if (scoreMap[interactionType]) {
      await updateFanScore(req.params.id, scoreMap[interactionType], interactionType, interactionType);
    }

    // Auto-stage updates
    if (interactionType === "reply_received") await updateFanStage(req.params.id, "engaged", "fan replied");
    if (interactionType === "link_clicked") {
      await updateFanStage(req.params.id, "clicked", "fan clicked website link");
      await db.update(fans).set({ websiteClicked: 1, lastWebsiteVisit: now(), updatedAt: now() }).where(eq(fans.id, req.params.id));
    }
    if (interactionType === "email_submitted") {
      await updateFanStage(req.params.id, "captured", "fan submitted email");
      await db.update(fans).set({ emailCaptured: 1, updatedAt: now() }).where(eq(fans.id, req.params.id));
    }

    res.json({ success: true });
  });

  // ── Campaign Links ───────────────────────────────────────────────────────────

  app.get("/api/campaign-links", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const links = await db.select().from(campaignLinks).orderBy(desc(campaignLinks.createdAt));
    res.json(links);
  });

  app.post("/api/campaign-links", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const { campaignName, destinationUrl, sourcePlatform, sourceMessageType } = req.body;
    const trackingCode = `pdna-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const [link] = await db.insert(campaignLinks).values({
      campaignName, destinationUrl, trackingCode,
      sourcePlatform: sourcePlatform || "N1M",
      sourceMessageType,
      createdAt: now(),
    }).returning();
    res.json({ ...link, shortUrl: `https://projectdnamusic.info/r/${trackingCode}` });
  });

  app.delete("/api/campaign-links/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    await db.delete(campaignLinks).where(eq(campaignLinks.id, req.params.id));
    res.json({ success: true });
  });

  // ── AI Agent Endpoints ───────────────────────────────────────────────────────

  app.post("/api/fan-agents/scout", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await runTrafficScoutAgent("user");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fan-agents/engagement/:fanId", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await runEngagementAgent(req.params.fanId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fan-agents/conversion/:fanId", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await runConversionAgent(req.params.fanId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fan-agents/follow-up/:fanId", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await runFollowUpAgent(req.params.fanId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fan-agents/welcome-email/:fanId", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await runWelcomeEmailAgent(req.params.fanId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fan-agents/daily-report", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await runDailyReportAgent("user");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fan-agents/daily-reports", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const reports = await db.select().from(fanDailyReports).orderBy(desc(fanDailyReports.reportDate)).limit(30);
    res.json(reports);
  });

  app.get("/api/fan-agents/tasks", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    const tasks = await db.select().from(n1mAgentTasks).orderBy(desc(n1mAgentTasks.createdAt)).limit(50);
    res.json(tasks);
  });

  // Fan profile quick-create from external event
  app.post("/api/fans/profile-event", async (req, res) => {
    try {
      const result = await runFanProfileAgent(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Bulk import N1M contacts into the Fan Pipeline ─────────────────────────
  app.post("/api/admin/fans/import-contacts", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const contacts = await db.select().from(fanContacts);
    if (contacts.length === 0) return res.json({ imported: 0, skipped: 0 });

    let imported = 0;
    let skipped = 0;
    const BATCH = 50;

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      for (const contact of batch) {
        // Skip if a fan with this email already exists
        if (contact.email) {
          const existing = await db.select({ id: fans.id }).from(fans)
            .where(eq(fans.email, contact.email)).limit(1);
          if (existing.length > 0) { skipped++; continue; }
        }

        // Location format is "Country CityName" (space-separated, country first)
        // Known multi-word countries we can strip to extract the city
        const MULTI_WORD_COUNTRIES = [
          'United States', 'United Kingdom', 'New Zealand', 'South Africa',
          'Puerto Rico', 'Costa Rica', 'El Salvador', 'Dominican Republic',
          'Trinidad And Tobago', 'Trinidad & Tobago',
        ];
        let locationRaw = (contact.location || '').trim();
        let country: string | null = null;
        let city: string | null = null;
        let stateRegion: string | null = null;

        if (locationRaw) {
          const multiMatch = MULTI_WORD_COUNTRIES.find(c => locationRaw.startsWith(c));
          if (multiMatch) {
            country = multiMatch;
            city = locationRaw.slice(multiMatch.length).trim() || null;
          } else {
            const spaceIdx = locationRaw.indexOf(' ');
            if (spaceIdx > 0) {
              country = locationRaw.slice(0, spaceIdx).trim();
              city = locationRaw.slice(spaceIdx + 1).trim() || null;
            } else {
              country = locationRaw;
            }
          }
        }

        const firstName = (contact.name || '').split(' ')[0];
        const lastName = (contact.name || '').split(' ').slice(1).join(' ');

        const [fan] = await db.insert(fans).values({
          sourcePlatform: 'N1M',
          displayName: contact.name || '',
          realName: contact.name || '',
          username: firstName ? `${firstName}${lastName ? '_' + lastName.replace(/\s+/g, '') : ''}`.toLowerCase() : undefined,
          email: contact.email || undefined,
          city, stateRegion, country,
          stage: 'cold_follower',
          leadScore: 5,
          emailCaptured: contact.email ? 1 : 0,
          notes: `Imported from N1M fan list. Location: ${contact.location || 'unknown'}`,
          createdAt: now(), updatedAt: now(),
        }).returning();

        await db.insert(fanStageHistory).values({
          fanId: fan.id, newStage: 'cold_follower',
          reason: 'imported from N1M contact list', changedAt: now(),
        });

        imported++;
      }
    }

    res.json({ imported, skipped, total: contacts.length });
  });

  // ─── Export pipeline fans as CSV ────────────────────────────────────────────
  app.get("/api/admin/fans/export.csv", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const allFans = await db.select().from(fans).orderBy(desc(fans.leadScore));

    const headers = ['Name', 'Email', 'Username', 'City', 'State/Region', 'Country', 'Stage', 'Lead Score', 'Email Captured', 'VIP', 'Notes', 'Tags', 'Created At'];
    const rows = allFans.map(f => [
      f.displayName || f.realName || '',
      f.email || '',
      f.username || '',
      f.city || '',
      f.stateRegion || '',
      f.country || '',
      f.stage,
      f.leadScore,
      f.emailCaptured ? 'Yes' : 'No',
      f.vipStatus ? 'Yes' : 'No',
      (f.notes || '').replace(/"/g, '""'),
      (f.tags || '').replace(/"/g, '""'),
      f.createdAt,
    ].map(v => `"${v}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pipeline_fans.csv"');
    res.send(csv);
  });

  // ─── Export N1M contact list as CSV ─────────────────────────────────────────
  app.get("/api/admin/campaign/export.csv", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const contacts = await db.select().from(fanContacts).orderBy(fanContacts.id);

    const headers = ['Name', 'Email', 'Location', 'Source', 'Added At'];
    const rows = contacts.map(c => [
      (c.name || '').replace(/"/g, '""'),
      (c.email || '').replace(/"/g, '""'),
      (c.location || '').replace(/"/g, '""'),
      c.source || 'n1m',
      c.createdAt || '',
    ].map(v => `"${v}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="n1m_fan_contacts.csv"');
    res.send(csv);
  });
}
