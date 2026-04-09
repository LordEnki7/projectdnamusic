import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const membershipTiers = pgTable("membership_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  discountPercent: integer("discount_percent").notNull().default(0),
  perks: text("perks").array(),
  earlyAccessDays: integer("early_access_days").default(0),
  exclusiveContentAccess: integer("exclusive_content_access").default(0),
  active: integer("active").default(1),
  createdAt: text("created_at").notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  isMember: integer("is_member").default(0),
  memberSince: text("member_since"),
  signupDiscount: integer("signup_discount").default(15),
  tierId: varchar("tier_id").references(() => membershipTiers.id),
  discountOverride: integer("discount_override"),
  role: text("role").notNull().default("user"),
  city: text("city"),
  musicVibe: text("music_vibe"),
  onboardingStep: integer("onboarding_step").default(0),
});

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artist: text("artist").notNull().default("Shakim & Project DNA"),
  album: text("album").notNull().default("The Great Attractor"),
  trackNumber: integer("track_number").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0.99"),
  featured: integer("featured").default(0),
  releaseDate: text("release_date"),
  lyrics: text("lyrics"),
  songMeaning: text("song_meaning"),
  artistNote: text("artist_note"),
});

export const beats = pgTable("beats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  bpm: integer("bpm").notNull(),
  musicKey: text("music_key").notNull(),
  genre: text("genre").notNull(),
  audioUrl: text("audio_url").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("29.99"),
});

export const merchandise = pgTable("merchandise", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  sizes: text("sizes").array(),
  category: text("category"),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").references(() => songs.id),
  merchId: varchar("merch_id").references(() => merchandise.id),
  beatId: varchar("beat_id").references(() => beats.id),
  itemType: text("item_type").notNull().default("song"),
  sessionId: text("session_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  size: text("size"),
});

export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  createdAt: text("created_at").notNull(),
});

export const exclusiveContent = pgTable("exclusive_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(),
  contentUrl: text("content_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  releaseDate: text("release_date").notNull(),
  minTierRequired: text("min_tier_required").default("free"),
});

export const shippingAddresses = pgTable("shipping_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull().default("United States"),
  createdAt: text("created_at").notNull(),
});

export const beatLicenses = pgTable("beat_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  beatId: varchar("beat_id").references(() => beats.id).notNull(),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  artistName: text("artist_name"),
  licenseType: text("license_type").notNull().default("non-exclusive"),
  signature: text("signature").notNull(),
  termsAccepted: integer("terms_accepted").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  email: text("email").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  shippingAddressId: varchar("shipping_address_id").references(() => shippingAddresses.id),
  country: text("country"),
  region: text("region"),
  createdAt: text("created_at").notNull(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  songId: varchar("song_id").references(() => songs.id),
  merchId: varchar("merch_id").references(() => merchandise.id),
  beatId: varchar("beat_id").references(() => beats.id),
  itemType: text("item_type").notNull(),
  title: text("title").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  size: text("size"),
  audioUrl: text("audio_url"),
});

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const downloads = pgTable("downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  orderItemId: varchar("order_item_id").references(() => orderItems.id),
  paymentIntentId: text("payment_intent_id").notNull(),
  itemType: text("item_type").notNull(),
  itemId: varchar("item_id").notNull(),
  title: text("title").notNull(),
  ipAddress: text("ip_address"),
  downloadedAt: text("downloaded_at").notNull(),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: integer("is_public").default(0),
  coverImage: text("cover_image"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const playlistSongs = pgTable("playlist_songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").references(() => playlists.id).notNull(),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  position: integer("position").notNull().default(0),
  addedAt: text("added_at").notNull(),
});

export const listeningHistory = pgTable("listening_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  playbackPosition: integer("playback_position").default(0),
  duration: integer("duration"),
  completed: integer("completed").default(0),
  playedAt: text("played_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const fanWallMessages = pgTable("fan_wall_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  username: text("username").notNull(),
  message: text("message").notNull(),
  songId: varchar("song_id").references(() => songs.id),
  dedicatedTo: text("dedicated_to"),
  reaction: text("reaction"),
  approved: integer("approved").default(0),
  featured: integer("featured").default(0),
  createdAt: text("created_at").notNull(),
});

export const artistMessages = pgTable("artist_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  active: integer("active").default(1),
  featured: integer("featured").default(0),
  publishedAt: text("published_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userMemberships = pgTable("user_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tierId: varchar("tier_id").references(() => membershipTiers.id).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"),
  startedAt: text("started_at").notNull(),
  renewsAt: text("renews_at"),
  canceledAt: text("canceled_at"),
  trialEndsAt: text("trial_ends_at"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull(),
});

export const emailSequences = pgTable("email_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(),
  triggerFilter: text("trigger_filter"),
  active: integer("active").default(1),
  createdAt: text("created_at").notNull(),
});

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").references(() => emailSequences.id).notNull(),
  stepIndex: integer("step_index").notNull(),
  subject: text("subject").notNull(),
  preheader: text("preheader"),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  delayDays: integer("delay_days").default(0),
  enabled: integer("enabled").default(1),
  createdAt: text("created_at").notNull(),
});

export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sequenceId: varchar("sequence_id").references(() => emailSequences.id),
  templateId: varchar("template_id").references(() => emailTemplates.id),
  emailId: text("email_id"),
  eventType: text("event_type").notNull(),
  metadata: text("metadata"),
  occurredAt: text("occurred_at").notNull(),
});

export const userActivityEvents = pgTable("user_activity_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  country: text("country"),
  region: text("region"),
  referrer: text("referrer"),
  metadata: text("metadata"),
  occurredAt: text("occurred_at").notNull(),
});

export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  code: text("code").notNull().unique(),
  usageLimit: integer("usage_limit"),
  rewardType: text("reward_type").notNull().default("credit"),
  rewardValue: numeric("reward_value", { precision: 10, scale: 2 }).notNull().default("5.00"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const referralConversions = pgTable("referral_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId: varchar("referral_code_id").references(() => referralCodes.id).notNull(),
  referredUserId: varchar("referred_user_id").references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  status: text("status").notNull().default("pending"),
  rewardApplied: integer("reward_applied").default(0),
  createdAt: text("created_at").notNull(),
});

export const referralRewards = pgTable("referral_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  conversionId: varchar("conversion_id").references(() => referralConversions.id),
  rewardType: text("reward_type").notNull(),
  rewardValue: numeric("reward_value", { precision: 10, scale: 2 }).notNull(),
  redeemed: integer("redeemed").default(0),
  redeemedAt: text("redeemed_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const productSalesMetrics = pgTable("product_sales_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  windowStart: text("window_start").notNull(),
  windowEnd: text("window_end").notNull(),
  unitsSold: integer("units_sold").notNull().default(0),
  revenue: numeric("revenue", { precision: 10, scale: 2 }).notNull().default("0.00"),
  tierBreakdown: text("tier_breakdown"),
  createdAt: text("created_at").notNull(),
});

export const funnelMetricsDaily = pgTable("funnel_metrics_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(),
  visitors: integer("visitors").default(0),
  signups: integer("signups").default(0),
  members: integer("members").default(0),
  buyers: integer("buyers").default(0),
  conversionData: text("conversion_data"),
  createdAt: text("created_at").notNull(),
});

export const siteCounters = pgTable("site_counters", {
  id: varchar("id").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const contentLikes = pgTable("content_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const contentComments = pgTable("content_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  username: text("username").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── Fan CRM System ───────────────────────────────────────────────────────────

export const fans = pgTable("fans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourcePlatform: varchar("source_platform", { length: 50 }).notNull().default("N1M"),
  platformUserId: varchar("platform_user_id", { length: 255 }),
  username: varchar("username", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }),
  realName: varchar("real_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  stateRegion: varchar("state_region", { length: 100 }),
  country: varchar("country", { length: 100 }),
  stage: varchar("stage", { length: 50 }).notNull().default("cold_follower"),
  leadScore: integer("lead_score").notNull().default(0),
  favoriteSong: varchar("favorite_song", { length: 255 }),
  favoriteContentType: varchar("favorite_content_type", { length: 100 }),
  websiteClicked: integer("website_clicked").notNull().default(0),
  emailCaptured: integer("email_captured").notNull().default(0),
  phoneCaptured: integer("phone_captured").notNull().default(0),
  vipStatus: integer("vip_status").notNull().default(0),
  purchaseStatus: integer("purchase_status").notNull().default(0),
  firstContactDate: text("first_contact_date"),
  lastContactDate: text("last_contact_date"),
  lastReplyDate: text("last_reply_date"),
  lastWebsiteVisit: text("last_website_visit"),
  lastPurchaseDate: text("last_purchase_date"),
  notes: text("notes"),
  tags: text("tags").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const fanInteractions = pgTable("fan_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fanId: varchar("fan_id").references(() => fans.id).notNull(),
  interactionType: varchar("interaction_type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  direction: varchar("direction", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  messageText: text("message_text"),
  status: varchar("status", { length: 50 }).default("completed"),
  metadata: text("metadata").default("{}"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const fanScores = pgTable("fan_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fanId: varchar("fan_id").references(() => fans.id).notNull(),
  scoreChange: integer("score_change").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  sourceEvent: varchar("source_event", { length: 100 }),
  createdAt: text("created_at").notNull(),
});

export const fanStageHistory = pgTable("fan_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fanId: varchar("fan_id").references(() => fans.id).notNull(),
  oldStage: varchar("old_stage", { length: 50 }),
  newStage: varchar("new_stage", { length: 50 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  changedAt: text("changed_at").notNull(),
});

export const campaignLinks = pgTable("campaign_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignName: varchar("campaign_name", { length: 255 }).notNull(),
  sourcePlatform: varchar("source_platform", { length: 50 }).notNull().default("N1M"),
  sourceMessageType: varchar("source_message_type", { length: 100 }),
  destinationUrl: text("destination_url").notNull(),
  trackingCode: varchar("tracking_code", { length: 100 }).unique().notNull(),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const fanLinkClicks = pgTable("fan_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fanId: varchar("fan_id").references(() => fans.id),
  campaignLinkId: varchar("campaign_link_id").references(() => campaignLinks.id),
  clickedUrl: text("clicked_url").notNull(),
  referrer: varchar("referrer", { length: 100 }).default("N1M"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  clickedAt: text("clicked_at").notNull(),
});

export const fanConversions = pgTable("fan_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fanId: varchar("fan_id").references(() => fans.id).notNull(),
  conversionType: varchar("conversion_type", { length: 100 }).notNull(),
  conversionValue: numeric("conversion_value", { precision: 10, scale: 2 }).default("0.00"),
  metadata: text("metadata").default("{}"),
  convertedAt: text("converted_at").notNull(),
});

export const n1mAgentTasks = pgTable("n1m_agent_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  fanId: varchar("fan_id").references(() => fans.id),
  taskType: varchar("task_type", { length: 100 }).notNull(),
  taskPayload: text("task_payload").notNull().default("{}"),
  status: varchar("status", { length: 50 }).notNull().default("queued"),
  priority: integer("priority").notNull().default(5),
  resultSummary: text("result_summary"),
  executionSeconds: numeric("execution_seconds", { precision: 10, scale: 2 }),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const fanDailyReports = pgTable("fan_daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportDate: text("report_date").notNull(),
  newFans: integer("new_fans").notNull().default(0),
  messagesSent: integer("messages_sent").notNull().default(0),
  repliesReceived: integer("replies_received").notNull().default(0),
  linksSent: integer("links_sent").notNull().default(0),
  websiteClicks: integer("website_clicks").notNull().default(0),
  emailCaptures: integer("email_captures").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  aiSummary: text("ai_summary"),
  topMessages: text("top_messages"),
  recommendations: text("recommendations"),
  createdAt: text("created_at").notNull(),
});

// ─── Fan CRM Insert Schemas ────────────────────────────────────────────────────

export const insertFanSchema = createInsertSchema(fans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFanInteractionSchema = createInsertSchema(fanInteractions).omit({ id: true, createdAt: true });
export const insertCampaignLinkSchema = createInsertSchema(campaignLinks).omit({ id: true, createdAt: true, clickCount: true });

export type Fan = typeof fans.$inferSelect;
export type InsertFan = typeof fans.$inferInsert;
export type FanInteraction = typeof fanInteractions.$inferSelect;
export type CampaignLink = typeof campaignLinks.$inferSelect;
export type N1mAgentTask = typeof n1mAgentTasks.$inferSelect;
export type FanDailyReport = typeof fanDailyReports.$inferSelect;

// ─── End Fan CRM System ───────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
});

export const insertBeatSchema = createInsertSchema(beats).omit({
  id: true,
});

export const insertMerchandiseSchema = createInsertSchema(merchandise).omit({
  id: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
});

export const insertExclusiveContentSchema = createInsertSchema(exclusiveContent).omit({
  id: true,
});

export const insertShippingAddressSchema = createInsertSchema(shippingAddresses).omit({
  id: true,
  createdAt: true,
});

export const insertBeatLicenseSchema = createInsertSchema(beatLicenses).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaylistSongSchema = createInsertSchema(playlistSongs).omit({
  id: true,
  addedAt: true,
});

export const insertListeningHistorySchema = createInsertSchema(listeningHistory).omit({
  id: true,
  playedAt: true,
  updatedAt: true,
});

export const insertFanWallMessageSchema = createInsertSchema(fanWallMessages).omit({
  id: true,
  createdAt: true,
});

export const insertArtistMessageSchema = createInsertSchema(artistMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type InsertBeat = z.infer<typeof insertBeatSchema>;
export type Beat = typeof beats.$inferSelect;
export type InsertMerchandise = z.infer<typeof insertMerchandiseSchema>;
export type Merchandise = typeof merchandise.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertExclusiveContent = z.infer<typeof insertExclusiveContentSchema>;
export type ExclusiveContent = typeof exclusiveContent.$inferSelect;
export type InsertShippingAddress = z.infer<typeof insertShippingAddressSchema>;
export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type InsertBeatLicense = z.infer<typeof insertBeatLicenseSchema>;
export type BeatLicense = typeof beatLicenses.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylistSong = z.infer<typeof insertPlaylistSongSchema>;
export type PlaylistSong = typeof playlistSongs.$inferSelect;
export type InsertListeningHistory = z.infer<typeof insertListeningHistorySchema>;
export type ListeningHistory = typeof listeningHistory.$inferSelect;
export type InsertFanWallMessage = z.infer<typeof insertFanWallMessageSchema>;
export type FanWallMessage = typeof fanWallMessages.$inferSelect;
export type InsertArtistMessage = z.infer<typeof insertArtistMessageSchema>;
export type ArtistMessage = typeof artistMessages.$inferSelect;

export const insertMembershipTierSchema = createInsertSchema(membershipTiers).omit({
  id: true,
  createdAt: true,
});

export const insertUserMembershipSchema = createInsertSchema(userMemberships).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSequenceSchema = createInsertSchema(emailSequences).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertEmailEventSchema = createInsertSchema(emailEvents).omit({
  id: true,
});

export const insertUserActivityEventSchema = createInsertSchema(userActivityEvents).omit({
  id: true,
});

export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true,
});

export const insertReferralConversionSchema = createInsertSchema(referralConversions).omit({
  id: true,
  createdAt: true,
});

export const insertReferralRewardSchema = createInsertSchema(referralRewards).omit({
  id: true,
  createdAt: true,
});

export const insertProductSalesMetricSchema = createInsertSchema(productSalesMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertFunnelMetricsDailySchema = createInsertSchema(funnelMetricsDaily).omit({
  id: true,
  createdAt: true,
});

export const insertContentLikeSchema = createInsertSchema(contentLikes).omit({
  id: true,
  createdAt: true,
});

export const insertContentCommentSchema = createInsertSchema(contentComments).omit({
  id: true,
  createdAt: true,
});

export type InsertMembershipTier = z.infer<typeof insertMembershipTierSchema>;
export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertUserMembership = z.infer<typeof insertUserMembershipSchema>;
export type UserMembership = typeof userMemberships.$inferSelect;
export type InsertEmailSequence = z.infer<typeof insertEmailSequenceSchema>;
export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailEvent = z.infer<typeof insertEmailEventSchema>;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertUserActivityEvent = z.infer<typeof insertUserActivityEventSchema>;
export type UserActivityEvent = typeof userActivityEvents.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralConversion = z.infer<typeof insertReferralConversionSchema>;
export type ReferralConversion = typeof referralConversions.$inferSelect;
export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type InsertProductSalesMetric = z.infer<typeof insertProductSalesMetricSchema>;
export type ProductSalesMetric = typeof productSalesMetrics.$inferSelect;
export type InsertFunnelMetricsDaily = z.infer<typeof insertFunnelMetricsDailySchema>;
export type FunnelMetricsDaily = typeof funnelMetricsDaily.$inferSelect;
export type InsertContentLike = z.infer<typeof insertContentLikeSchema>;
export type ContentLike = typeof contentLikes.$inferSelect;
export type InsertContentComment = z.infer<typeof insertContentCommentSchema>;
export type ContentComment = typeof contentComments.$inferSelect;

// ─── Agent Jobs (Job Queue) ───────────────────────────────────────────────────
export const agentJobs = pgTable("agent_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("pending"),
  triggeredBy: text("triggered_by").notNull().default("user"),
  result: text("result"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertAgentJobSchema = createInsertSchema(agentJobs).omit({ id: true, createdAt: true });
export type InsertAgentJob = z.infer<typeof insertAgentJobSchema>;
export type AgentJob = typeof agentJobs.$inferSelect;

// ─── Agent Runs (Execution Audit Log) ────────────────────────────────────────
export const agentRuns = pgTable("agent_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  proposalId: integer("proposal_id"),
  jobId: integer("job_id"),
  status: text("status").notNull().default("running"),
  resultSummary: text("result_summary"),
  outputData: text("output_data"),
  startedAt: text("started_at").notNull().default(sql`now()`),
  completedAt: text("completed_at"),
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({ id: true });
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

// ─── Agent Memory (Learnings & Outcomes) ─────────────────────────────────────
export const agentMemory = pgTable("agent_memory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  businessUnit: text("business_unit").notNull().default("general"),
  memoryType: text("memory_type").notNull().default("insight"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  outcome: text("outcome"),
  tags: text("tags"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertAgentMemorySchema = createInsertSchema(agentMemory).omit({ id: true, createdAt: true });
export type InsertAgentMemory = z.infer<typeof insertAgentMemorySchema>;
export type AgentMemory = typeof agentMemory.$inferSelect;

// ─── Agent Approvals (Decision Audit Log) ────────────────────────────────────
export const agentApprovals = pgTable("agent_approvals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  proposalId: integer("proposal_id").notNull(),
  decision: text("decision").notNull(),
  notes: text("notes"),
  approvedBy: text("approved_by").notNull().default("admin"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertAgentApprovalSchema = createInsertSchema(agentApprovals).omit({ id: true, createdAt: true });
export type InsertAgentApproval = z.infer<typeof insertAgentApprovalSchema>;
export type AgentApproval = typeof agentApprovals.$inferSelect;

// ─── Agent Proposals (Command Center Inbox) ──────────────────────────────────
export const agentProposals = pgTable("agent_proposals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: text("type").notNull().default("task_execution"),
  source: text("source").notNull().default("advisor"),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  opportunity: text("opportunity").notNull(),
  plan: text("plan").notNull(),
  assetsRequired: text("assets_required"),
  agentsRequired: text("agents_required"),
  expectedResult: text("expected_result").notNull(),
  estimatedTime: text("estimated_time").notNull(),
  priority: text("priority").notNull().default("medium"),
  priorityScore: integer("priority_score").default(50),
  status: text("status").notNull().default("pending"),
  actionType: text("action_type"),
  actionPayload: text("action_payload"),
  executionResult: text("execution_result"),
  adminNote: text("admin_note"),
  isQuickAction: integer("is_quick_action").default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
  approvedAt: text("approved_at"),
  executedAt: text("executed_at"),
  outcomeStatus: text("outcome_status"),
  outcomeNotes: text("outcome_notes"),
  outcomeAt: text("outcome_at"),
  qualityScore: integer("quality_score"),
});

export const insertAgentProposalSchema = createInsertSchema(agentProposals).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentProposal = z.infer<typeof insertAgentProposalSchema>;
export type AgentProposal = typeof agentProposals.$inferSelect;

// ============ DNA RADIO ============

export const radioTracks = pgTable("radio_tracks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  artist: text("artist").notNull().default("Shakim & Project DNA"),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull().default(240),
  isActive: integer("is_active").default(1),
  position: integer("position").default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertRadioTrackSchema = createInsertSchema(radioTracks).omit({ id: true, createdAt: true });
export type InsertRadioTrack = z.infer<typeof insertRadioTrackSchema>;
export type RadioTrack = typeof radioTracks.$inferSelect;

export const radioBumpers = pgTable("radio_bumpers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  isActive: integer("is_active").default(1),
  duration: integer("duration"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertRadioBumperSchema = createInsertSchema(radioBumpers).omit({ id: true, createdAt: true });
export type InsertRadioBumper = z.infer<typeof insertRadioBumperSchema>;
export type RadioBumper = typeof radioBumpers.$inferSelect;

export const songRequests = pgTable("song_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  fanName: text("fan_name").notNull(),
  songTitle: text("song_title").notNull(),
  artist: text("artist"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertSongRequestSchema = createInsertSchema(songRequests).omit({ id: true, createdAt: true });
export type InsertSongRequest = z.infer<typeof insertSongRequestSchema>;
export type SongRequest = typeof songRequests.$inferSelect;

export const fanContacts = pgTable("fan_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  location: text("location").notNull().default(""),
  source: text("source").notNull().default("n1m"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertFanContactSchema = createInsertSchema(fanContacts).omit({ id: true, createdAt: true });
export type InsertFanContact = z.infer<typeof insertFanContactSchema>;
export type FanContact = typeof fanContacts.$inferSelect;

// ─── Radio Outreach Agent ─────────────────────────────────────────────────────

export const radioStations = pgTable("radio_stations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: text("type").notNull().default("college"), // college | b-market
  market: text("market"), // city or region
  state: text("state"),
  email: text("email"),
  website: text("website"),
  format: text("format"), // hip-hop, r&b, urban, etc.
  submissionNotes: text("submission_notes"),
  acceptsUnsolicited: integer("accepts_unsolicited").default(1), // 1=yes 0=no
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertRadioStationSchema = createInsertSchema(radioStations).omit({ id: true, createdAt: true });
export type InsertRadioStation = z.infer<typeof insertRadioStationSchema>;
export type RadioStation = typeof radioStations.$inferSelect;

export const outreachCampaigns = pgTable("outreach_campaigns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  songTitle: text("song_title").notNull(),
  songUrl: text("song_url"),
  artistBio: text("artist_bio"),
  targetTypes: text("target_types").default("college,b-market"), // comma-separated
  status: text("status").notNull().default("draft"), // draft | ready | sending | complete
  totalSent: integer("total_sent").default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
  sentAt: text("sent_at"),
});

export const insertOutreachCampaignSchema = createInsertSchema(outreachCampaigns).omit({ id: true, createdAt: true, sentAt: true, totalSent: true });
export type InsertOutreachCampaign = z.infer<typeof insertOutreachCampaignSchema>;
export type OutreachCampaign = typeof outreachCampaigns.$inferSelect;

export const outreachContacts = pgTable("outreach_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  campaignId: integer("campaign_id").notNull(),
  stationId: integer("station_id").notNull(),
  stationName: text("station_name"),
  stationEmail: text("station_email"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  status: text("status").notNull().default("pending"), // pending | sent | failed
  sentAt: text("sent_at"),
  errorMessage: text("error_message"),
});

export const insertOutreachContactSchema = createInsertSchema(outreachContacts).omit({ id: true, sentAt: true });
export type InsertOutreachContact = z.infer<typeof insertOutreachContactSchema>;
export type OutreachContact = typeof outreachContacts.$inferSelect;
