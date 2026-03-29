/**
 * NIG COMMAND CENTER — Division Status Endpoint
 * Project DNA Music LLC
 */

import type { Request, Response } from "express";
import { db } from "./db";
import { users, orders, userMemberships, songs, beats, merchandise, siteCounters } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";

const NIG_API_KEY = process.env.NIG_API_KEY;

async function getMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const [
    userCount,
    revenueResult,
    activeMembers,
    songCount,
    beatCount,
    merchCount,
    orderCount,
    visitorResult,
  ] = await Promise.all([
    // Total registered users
    db.select({ count: sql<number>`count(*)::int` }).from(users),

    // Revenue from completed orders in last 30 days
    db
      .select({ total: sql<string>`coalesce(sum(total::numeric), 0)::text` })
      .from(orders)
      .where(
        and(
          eq(orders.status, "completed"),
          sql`created_at >= ${thirtyDaysAgoStr}`
        )
      ),

    // Active paid memberships
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userMemberships)
      .where(eq(userMemberships.status, "active")),

    // Total songs in catalog
    db.select({ count: sql<number>`count(*)::int` }).from(songs),

    // Total beats in catalog
    db.select({ count: sql<number>`count(*)::int` }).from(beats),

    // Total merchandise items
    db.select({ count: sql<number>`count(*)::int` }).from(merchandise),

    // Total orders ever
    db.select({ count: sql<number>`count(*)::int` }).from(orders),

    // Site visitor counter
    db
      .select({ total: siteCounters.count })
      .from(siteCounters)
      .where(eq(siteCounters.id, "visitors")),
  ]);

  const monthlyRevenue = parseFloat(revenueResult[0]?.total ?? "0");

  return {
    status: "live" as const,
    health: 99,
    activeUsers: userCount[0]?.count ?? 0,
    revenue: monthlyRevenue,
    subscribers: activeMembers[0]?.count ?? 0,
    uptime: 99.9,
    metrics: {
      total_users: userCount[0]?.count ?? 0,
      active_memberships: activeMembers[0]?.count ?? 0,
      songs_in_catalog: songCount[0]?.count ?? 0,
      beats_in_catalog: beatCount[0]?.count ?? 0,
      merch_items: merchCount[0]?.count ?? 0,
      total_orders: orderCount[0]?.count ?? 0,
      monthly_revenue_usd: monthlyRevenue,
      total_site_visitors: visitorResult[0]?.total ?? 0,
    },
    message: "All systems operational",
  };
}

export async function nigStatusHandler(req: Request, res: Response) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (NIG_API_KEY && token !== NIG_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const metrics = await getMetrics();
    return res.status(200).json({
      ...metrics,
      division: process.env.DIVISION_NAME || "Project DNA Music LLC",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "offline",
      health: 0,
      error: err.message,
      division: process.env.DIVISION_NAME || "Project DNA Music LLC",
      timestamp: new Date().toISOString(),
    });
  }
}
