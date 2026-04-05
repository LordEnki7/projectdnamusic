import type { Express } from "express";
import fs from "fs";
import { FAN_CONTACTS } from "./fanContacts";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { registerAIAgentRoutes } from "./aiAgents";
import { songs, beats, merchandise, cartItems, users, donations, exclusiveContent, shippingAddresses, beatLicenses, orders, orderItems, contactMessages, downloads, membershipTiers, userMemberships, playlists, playlistSongs, listeningHistory, fanWallMessages, artistMessages, userActivityEvents, contentLikes, contentComments, siteCounters, radioBumpers, songRequests, fanContacts, insertUserSchema, loginSchema, insertPlaylistSchema, insertPlaylistSongSchema, insertListeningHistorySchema, insertFanWallMessageSchema, insertArtistMessageSchema, insertContentLikeSchema, insertContentCommentSchema } from "@shared/schema";
import { asc, eq, and, sql, inArray } from "drizzle-orm";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import { searchFile, streamFile, readFileAsBytes } from "./mediaStorage";
import { stripeConfig } from "./stripe-config";
import { sendOrderConfirmationEmail, sendProductionInquiryNotification, sendProductionInquiryConfirmation } from "./email";
import "./types";

// Initialize Stripe with config override (bypasses integration keys)
let stripe: Stripe | null = null;
try {
  const secretKey = stripeConfig.getSecretKey();
  if (!secretKey) {
    console.warn('⚠️  Stripe secret key not configured - payment features will be unavailable');
  } else {
    stripe = new Stripe(secretKey, {
      apiVersion: "2025-09-30.clover",
    });
    console.log(`✅ Stripe initialized in ${stripeConfig.getMode()} MODE`);
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint for deployment readiness
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  
  // Stripe config endpoint - exposes public key to frontend
  app.get("/api/stripe/config", (req, res) => {
    res.json({ 
      publicKey: stripeConfig.getPublicKey(),
      mode: stripeConfig.getMode()
    });
  });

  // Get membership tiers
  app.get("/api/membership-tiers", async (req, res) => {
    try {
      const tiers = await db
        .select()
        .from(membershipTiers)
        .where(eq(membershipTiers.active, 1))
        .orderBy(asc(membershipTiers.price));
      
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching membership tiers:", error);
      res.status(500).json({ error: "Failed to fetch membership tiers" });
    }
  });

  // Get user's current subscription status
  app.get("/api/subscription/status", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db
        .select({
          id: users.id,
          email: users.email,
          tierId: users.tierId,
          discountOverride: users.discountOverride,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      let tier = null;
      let membership = null;

      if (user[0].tierId) {
        const tierData = await db
          .select()
          .from(membershipTiers)
          .where(eq(membershipTiers.id, user[0].tierId))
          .limit(1);
        
        if (tierData.length > 0) {
          tier = tierData[0];
        }

        const membershipData = await db
          .select()
          .from(userMemberships)
          .where(eq(userMemberships.userId, userId))
          .orderBy(sql`${userMemberships.createdAt} DESC`)
          .limit(1);

        if (membershipData.length > 0) {
          membership = membershipData[0];
        }
      }

      res.json({
        user: user[0],
        tier,
        membership,
        discountPercent: user[0].discountOverride ?? tier?.discountPercent ?? 0,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Create Stripe subscription checkout session
  app.post("/api/subscription/create-checkout", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { tierId } = req.body;
      if (!tierId) {
        return res.status(400).json({ error: "Tier ID is required" });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const tier = await db
        .select()
        .from(membershipTiers)
        .where(eq(membershipTiers.id, tierId))
        .limit(1);

      if (tier.length === 0) {
        return res.status(404).json({ error: "Tier not found" });
      }

      if (parseFloat(tier[0].price) === 0) {
        return res.status(400).json({ error: "Cannot subscribe to free tier" });
      }

      let customerId = null;
      const existingMembership = await db
        .select()
        .from(userMemberships)
        .where(eq(userMemberships.userId, userId))
        .limit(1);

      if (existingMembership.length > 0 && existingMembership[0].stripeCustomerId) {
        customerId = existingMembership[0].stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user[0].email,
          metadata: {
            userId: userId,
          },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: tier[0].name,
                description: tier[0].perks?.join(", ") || "",
              },
              recurring: {
                interval: tier[0].billingCycle === "yearly" ? "year" : "month",
              },
              unit_amount: Math.round(parseFloat(tier[0].price) * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin}/account?success=true`,
        cancel_url: `${req.headers.origin}/account?canceled=true`,
        metadata: {
          userId: userId,
          tierId: tierId,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating subscription checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const membership = await db
        .select()
        .from(userMemberships)
        .where(eq(userMemberships.userId, userId))
        .orderBy(sql`${userMemberships.createdAt} DESC`)
        .limit(1);

      if (membership.length === 0 || !membership[0].stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      const allowedCancelStatuses = ['active', 'trialing', 'past_due'];
      if (!allowedCancelStatuses.includes(membership[0].status)) {
        return res.status(400).json({ error: `Cannot cancel subscription with status: ${membership[0].status}` });
      }

      await stripe.subscriptions.update(membership[0].stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await db
        .update(userMemberships)
        .set({ canceledAt: new Date().toISOString() })
        .where(eq(userMemberships.id, membership[0].id));

      res.json({ message: "Subscription will be canceled at period end" });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook endpoint - handles payment events
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      console.error('❌ No Stripe signature header found');
      return res.status(400).json({ error: 'No signature' });
    }

    let event: Stripe.Event;

    try {
      // In development/testing, skip signature verification if no webhook secret
      if (!webhookSecret) {
        console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - accepting webhook without verification (NOT for production!)');
        // Parse the raw body buffer to JSON
        const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
        event = JSON.parse(payload) as Stripe.Event;
      } else {
        // Verify webhook signature in production
        // req.body is a Buffer when using express.raw()
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      }
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`🔔 Webhook received: ${event.type}`);

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`💰 Payment succeeded: ${paymentIntent.id}`);

      try {
        // Check if order already exists
        const existingOrder = await db
          .select()
          .from(orders)
          .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
          .limit(1);

        if (existingOrder.length > 0) {
          console.log(`⏭️  Order already exists for payment ${paymentIntent.id}`);
          return res.json({ received: true, order: existingOrder[0] });
        }

        // Get session and user info from payment intent metadata
        const sessionId = paymentIntent.metadata.sessionId;
        const userId = paymentIntent.metadata.userId || null;
        const shippingAddressId = paymentIntent.metadata.shippingAddressId || null;

        if (!sessionId) {
          console.error('❌ No sessionId in payment intent metadata');
          return res.status(400).json({ error: 'No sessionId in metadata' });
        }

        // Fetch cart items
        const items = await db
          .select({
            id: cartItems.id,
            songId: cartItems.songId,
            merchId: cartItems.merchId,
            beatId: cartItems.beatId,
            itemType: cartItems.itemType,
            quantity: cartItems.quantity,
            size: cartItems.size,
            title: sql<string>`COALESCE(${songs.title}, ${merchandise.name}, ${beats.title})`.as('title'),
            price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
            audioUrl: sql<string>`COALESCE(${songs.audioUrl}, ${beats.audioUrl})`.as('audioUrl'),
          })
          .from(cartItems)
          .leftJoin(songs, eq(cartItems.songId, songs.id))
          .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
          .leftJoin(beats, eq(cartItems.beatId, beats.id))
          .where(eq(cartItems.sessionId, sessionId));

        if (items.length === 0) {
          console.error(`❌ No cart items found for session ${sessionId}`);
          return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => {
          return sum + (parseFloat(item.price) * item.quantity);
        }, 0);

        const hasMerch = items.some(item => item.itemType === 'merch');
        const shippingCost = hasMerch ? 5.99 : 0;
        const tax = subtotal * 0.08;
        const total = subtotal + shippingCost + tax;

        // Get customer email from multiple sources
        let email = paymentIntent.receipt_email || '';
        let customerName = 'Valued Customer';

        // Try to get email from payment method billing details
        if (!email && paymentIntent.payment_method) {
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(
              paymentIntent.payment_method as string
            );
            if (paymentMethod.billing_details?.email) {
              email = paymentMethod.billing_details.email;
              customerName = paymentMethod.billing_details.name || customerName;
              console.log('📧 Got email from payment method billing details:', email);
            }
          } catch (err) {
            console.error('Failed to retrieve payment method:', err);
          }
        }

        // Try shipping address if available
        if (!email && shippingAddressId) {
          const shippingInfo = await db
            .select()
            .from(shippingAddresses)
            .where(eq(shippingAddresses.id, shippingAddressId))
            .limit(1);
          
          if (shippingInfo.length > 0) {
            email = email || shippingInfo[0].email;
            customerName = shippingInfo[0].fullName;
          }
        }

        // Try beat license if available
        if (!email) {
          const beatLicense = await db
            .select()
            .from(beatLicenses)
            .where(eq(beatLicenses.sessionId, sessionId))
            .limit(1);
          
          if (beatLicense.length > 0) {
            email = beatLicense[0].email;
            customerName = beatLicense[0].fullName;
          }
        }

        if (!email) {
          console.error('❌ No customer email found from any source!');
          email = 'customer@example.com';
        } else {
          console.log('✅ Customer email found:', email);
        }

        // Create order
        const [order] = await db.insert(orders).values({
          userId: userId || null,
          sessionId,
          email,
          subtotal: subtotal.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          status: 'completed',
          stripePaymentIntentId: paymentIntent.id,
          shippingAddressId: shippingAddressId || null,
          createdAt: new Date().toISOString(),
        }).returning();

        console.log(`✅ Order created: ${order.id}`);

        // Create order items
        for (const item of items) {
          await db.insert(orderItems).values({
            orderId: order.id,
            songId: item.songId || null,
            merchId: item.merchId || null,
            beatId: item.beatId || null,
            itemType: item.itemType,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            size: item.size || null,
            audioUrl: item.audioUrl || null,
          });
        }

        console.log(`✅ Created ${items.length} order items`);

        // Clear cart
        await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
        console.log(`✅ Cart cleared for session ${sessionId}`);

        // Send confirmation email
        try {
          await sendOrderConfirmationEmail(
            email,
            customerName,
            order.id,
            items.map(item => ({
              title: item.title,
              itemType: item.itemType,
              price: parseFloat(item.price),
              quantity: item.quantity,
              audioUrl: item.audioUrl,
              size: item.size,
            })),
            subtotal,
            tax,
            shippingCost,
            total
          );
          console.log('✅ Order confirmation email sent');
        } catch (emailError) {
          console.error('⚠️  Email failed but order was created:', emailError);
        }

        res.json({ received: true, order });
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`🛒 Checkout session completed: ${session.id}`);

      if (session.mode === 'subscription') {
        try {
          const userId = session.metadata?.userId;
          const tierId = session.metadata?.tierId;
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          if (!userId || !tierId) {
            console.error('❌ Missing userId or tierId in session metadata');
            return res.json({ received: true });
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

          const existingMembership = await db
            .select()
            .from(userMemberships)
            .where(eq(userMemberships.userId, userId))
            .limit(1);

          if (existingMembership.length > 0) {
            await db
              .update(userMemberships)
              .set({
                tierId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: subscription.status,
                renewsAt: currentPeriodEnd,
                canceledAt: null,
                lastSyncedAt: new Date().toISOString(),
              })
              .where(eq(userMemberships.id, existingMembership[0].id));
            
            console.log(`✅ Updated existing membership for user ${userId} with status: ${subscription.status}`);
          } else {
            await db.insert(userMemberships).values({
              userId,
              tierId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              status: subscription.status,
              startedAt: new Date().toISOString(),
              renewsAt: currentPeriodEnd,
              createdAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString(),
            });
            
            console.log(`✅ Created new membership for user ${userId} with status: ${subscription.status}`);
          }

          await db
            .update(users)
            .set({ tierId })
            .where(eq(users.id, userId));

          console.log(`✅ Updated user tier to ${tierId}`);
          res.json({ received: true });
        } catch (error) {
          console.error('❌ Error processing checkout session:', error);
          res.status(500).json({ error: 'Checkout processing failed' });
        }
      } else {
        res.json({ received: true });
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`🔄 Subscription updated: ${subscription.id}`);

      try {
        const membership = await db
          .select()
          .from(userMemberships)
          .where(eq(userMemberships.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (membership.length > 0) {
          const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();
          
          await db
            .update(userMemberships)
            .set({
              status: subscription.status,
              renewsAt: currentPeriodEnd,
              lastSyncedAt: new Date().toISOString(),
            })
            .where(eq(userMemberships.id, membership[0].id));

          console.log(`✅ Updated membership status to ${subscription.status}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error('❌ Error updating subscription:', error);
        res.status(500).json({ error: 'Subscription update failed' });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`🗑️ Subscription deleted: ${subscription.id}`);

      try {
        const membership = await db
          .select()
          .from(userMemberships)
          .where(eq(userMemberships.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (membership.length > 0) {
          await db
            .update(userMemberships)
            .set({
              status: 'canceled',
              canceledAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString(),
            })
            .where(eq(userMemberships.id, membership[0].id));

          const freeTier = await db
            .select()
            .from(membershipTiers)
            .where(eq(membershipTiers.price, "0.00"))
            .limit(1);

          if (freeTier.length > 0) {
            await db
              .update(users)
              .set({ tierId: freeTier[0].id })
              .where(eq(users.id, membership[0].userId));
            
            console.log(`✅ Downgraded user to Free tier`);
          }
        }

        res.json({ received: true });
      } catch (error) {
        console.error('❌ Error deleting subscription:', error);
        res.status(500).json({ error: 'Subscription deletion failed' });
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`⚠️ Payment failed for invoice: ${invoice.id}`);

      try {
        if ((invoice as any).subscription) {
          const membership = await db
            .select()
            .from(userMemberships)
            .where(eq(userMemberships.stripeSubscriptionId, (invoice as any).subscription as string))
            .limit(1);

          if (membership.length > 0) {
            await db
              .update(userMemberships)
              .set({
                status: 'past_due',
                lastSyncedAt: new Date().toISOString(),
              })
              .where(eq(userMemberships.id, membership[0].id));
            
            console.log(`⚠️ Marked membership as past_due`);
          }
        }

        res.json({ received: true });
      } catch (error) {
        console.error('❌ Error processing failed payment:', error);
        res.status(500).json({ error: 'Failed payment processing failed' });
      }
    } else {
      // Return success for other event types
      res.json({ received: true });
    }
  });
  
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      console.log(`Searching for file: ${filePath}`);
      const file = await searchFile(filePath);
      if (!file) {
        console.log(`File not found: ${filePath}`);
        return res.status(404).json({ error: "File not found" });
      }
      console.log(`File found, streaming: ${file}`);
      await streamFile(file, res);
    } catch (error) {
      console.error(`Error in /public-objects/${filePath}:`, error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.issues 
        });
      }

      const { username, email, password } = validationResult.data;

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const memberSince = new Date().toISOString();

      // Get Free tier ID
      const freeTier = await db
        .select()
        .from(membershipTiers)
        .where(eq(membershipTiers.name, "Free Member"))
        .limit(1);
      
      const freeTierId = freeTier.length > 0 ? freeTier[0].id : null;

      const newUser = await db.insert(users).values({
        username,
        email,
        password: hashedPassword,
        isMember: 1,
        memberSince,
        signupDiscount: 15,
        tierId: freeTierId,
      }).returning();

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }

        req.session.userId = newUser[0].id;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Failed to save session" });
          }

          const userResponse = {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
            isMember: newUser[0].isMember,
            memberSince: newUser[0].memberSince,
            signupDiscount: newUser[0].signupDiscount,
            tierId: newUser[0].tierId,
            city: newUser[0].city,
            musicVibe: newUser[0].musicVibe,
            onboardingStep: newUser[0].onboardingStep ?? 0,
          };

          res.json({ message: "Signup successful", user: userResponse });
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.issues 
        });
      }

      const { email, password } = validationResult.data;

      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (user.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user[0].password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }

        req.session.userId = user[0].id;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Failed to save session" });
          }

          const userResponse = {
            id: user[0].id,
            username: user[0].username,
            email: user[0].email,
            isMember: user[0].isMember,
            memberSince: user[0].memberSince,
            signupDiscount: user[0].signupDiscount,
            tierId: user[0].tierId,
            city: user[0].city,
            musicVibe: user[0].musicVibe,
            onboardingStep: user[0].onboardingStep ?? 0,
          };

          res.json({ message: "Login successful", user: userResponse });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      
      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const userResponse = {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        isMember: user[0].isMember,
        memberSince: user[0].memberSince,
        signupDiscount: user[0].signupDiscount,
        tierId: user[0].tierId,
        role: user[0].role,
        city: user[0].city,
        musicVibe: user[0].musicVibe,
        onboardingStep: user[0].onboardingStep ?? 0,
      };

      res.json(userResponse);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to check authentication" });
    }
  });

  // Fan onboarding — save city, musicVibe, advance step, send personalized email
  app.patch("/api/auth/onboarding", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { city, musicVibe, onboardingStep } = req.body;
      const updateData: Record<string, unknown> = {};
      if (city !== undefined) updateData.city = city;
      if (musicVibe !== undefined) updateData.musicVibe = musicVibe;
      if (onboardingStep !== undefined) updateData.onboardingStep = onboardingStep;

      const [updated] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();

      // Send personalized follow-up email when onboarding completes (step 3)
      if (onboardingStep === 3 && updated.email) {
        try {
          const { getResendClient } = await import('./email');
          const { client, fromEmail } = await getResendClient();
          const vibeLines: Record<string, string> = {
            smooth: "You said smooth tracks hit you hardest. Check out some of the soulful cuts on the catalog — those are the ones I put the most feeling into.",
            deep: "You said deep tracks hit you hardest. Some of my most personal work is in there — the kind of music you listen to when everything gets quiet.",
            soulful: "You said soulful tracks hit you hardest. That right there is the core of what Project DNA is. Real emotion, real music.",
            "straight energy": "You said straight energy hits you hardest. Then you need to hear the harder cuts — I made those for the ones who need something that moves.",
          };
          const vibeLine = vibeLines[(updated.musicVibe || '').toLowerCase()] || "Whatever you're feeling, there's something in the catalog built for that moment.";
          const cityLine = updated.city ? `Shout out to ${updated.city} — appreciate you tuning in from there.` : "Appreciate you tuning in for real.";

          await client.emails.send({
                from: fromEmail,
                to: updated.email,
                subject: "You're in — Project DNA",
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #ffffff; padding: 40px 32px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <img src="https://projectdnamusic.info/media/images/logo.png" alt="Project DNA" style="height: 60px; width: auto;" />
                    </div>
                    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #ffffff;">
                      Welcome to the circle, ${updated.username}.
                    </h1>
                    <p style="color: #94a3b8; line-height: 1.7; margin-bottom: 16px;">
                      ${cityLine}
                    </p>
                    <p style="color: #94a3b8; line-height: 1.7; margin-bottom: 24px;">
                      ${vibeLine}
                    </p>
                    <p style="color: #94a3b8; line-height: 1.7; margin-bottom: 32px;">
                      There's more on here than what I post anywhere else — exclusive content, early drops, and the full catalog. This is where real supporters tap in.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="https://projectdnamusic.info/catalog" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                        Explore the Catalog
                      </a>
                    </div>
                    <p style="color: #475569; font-size: 13px; text-align: center;">
                      — Shakim &amp; Project DNA
                    </p>
                  </div>
                `,
          });
        } catch (emailErr) {
          console.error("Onboarding email error:", emailErr);
        }
      }

      res.json({
        id: updated.id, username: updated.username, email: updated.email,
        isMember: updated.isMember, memberSince: updated.memberSince,
        signupDiscount: updated.signupDiscount, tierId: updated.tierId,
        role: updated.role, city: updated.city, musicVibe: updated.musicVibe,
        onboardingStep: updated.onboardingStep ?? 0,
      });
    } catch (err) {
      console.error("Onboarding error:", err);
      res.status(500).json({ error: "Failed to save onboarding" });
    }
  });

  app.post("/api/seed-songs", async (req, res) => {
    try {
      const existingCount = await db.select().from(songs);
      if (existingCount.length > 0) {
        return res.json({ message: "Songs already seeded", count: existingCount.length });
      }

      const greatAttractorTracks = [
        { trackNumber: 1, title: "Go", audioUrl: "/attached_assets/1 - Shakim & Project DNA - Go_1759614436287.wav", featured: 1 },
        { trackNumber: 2, title: "That Guy", audioUrl: "/attached_assets/2 - Shakim & Project DNA - That Guy_1759614436288.wav", featured: 1 },
        { trackNumber: 3, title: "My Home", audioUrl: "/attached_assets/3 - Shakim & Project DNA - My Home_1759614436288.wav", featured: 1 },
        { trackNumber: 4, title: "Celebrate", audioUrl: "/attached_assets/4 - Shakim & Project DNA - Celebrate_1759614469272.wav", featured: 1 },
        { trackNumber: 5, title: "CountyLine Rd", audioUrl: "/attached_assets/5 - Shakim & Project DNA - CountyLine Rd_1759614469273.wav", featured: 1 },
        { trackNumber: 6, title: "I Won't Give Up", audioUrl: "/attached_assets/6 - Shakim & Project DNA - I Won't Give Up_1759614469273.wav", featured: 1 },
        { trackNumber: 7, title: "I Won't Let You", audioUrl: "/attached_assets/7 - Shakim & Project DNA - I Won't Let You_1759614514902.wav", featured: 1 },
        { trackNumber: 8, title: "Love Take Over", audioUrl: "/attached_assets/8 - Shakim & Project DNA - Love Take Over_1759614514903.wav", featured: 1 },
        { trackNumber: 9, title: "Take Control", audioUrl: "/attached_assets/9 - Shakim & Project DNA - Take Control_1759614514904.wav", featured: 1 },
        { trackNumber: 10, title: "Say Something 2 Me", audioUrl: "/attached_assets/10 - Shakim & Project DNA - Say Something 2 Me_1759614561710.wav", featured: 1 },
        { trackNumber: 11, title: "No Mor", audioUrl: "/attached_assets/11 - Shakim & Project DNA - No Mor_1759614561711.wav", featured: 1 },
        { trackNumber: 12, title: "HighLight of My Life", audioUrl: "/attached_assets/12 - Shakim & Project DNA - HighLight of My Life_1759614561712.wav", featured: 1 },
        { trackNumber: 13, title: "Abstract Luv", audioUrl: "/attached_assets/13 - Shakim & Project DNA - Abstract Luv_1759614606314.wav", featured: 1 },
      ];

      for (const track of greatAttractorTracks) {
        await db.insert(songs).values({
          title: track.title,
          artist: "Shakim & Project DNA",
          album: "The Great Attractor",
          trackNumber: track.trackNumber,
          audioUrl: track.audioUrl,
          price: "0.99",
          featured: track.featured,
        });
      }

      res.json({ message: "Successfully seeded 13 songs", count: 13 });
    } catch (error) {
      console.error("Error seeding songs:", error);
      res.status(500).json({ error: "Failed to seed songs" });
    }
  });

  app.get("/api/songs", async (req, res) => {
    try {
      const allSongs = await db.select().from(songs).orderBy(asc(songs.trackNumber));
      
      const userId = req.session.userId;
      let earlyAccessDays = 0;
      let tierName = "Free Member";
      
      if (userId) {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length > 0 && user[0].tierId) {
          const tier = await db.select().from(membershipTiers).where(eq(membershipTiers.id, user[0].tierId)).limit(1);
          if (tier.length > 0) {
            earlyAccessDays = tier[0].earlyAccessDays || 0;
            tierName = tier[0].name;
          }
        }
      }
      
      const currentDate = new Date();
      const filteredSongs = allSongs.filter(song => {
        if (!song.releaseDate) {
          return true;
        }
        
        const releaseDate = new Date(song.releaseDate);
        const effectiveReleaseDate = new Date(releaseDate);
        effectiveReleaseDate.setDate(effectiveReleaseDate.getDate() - earlyAccessDays);
        
        return currentDate >= effectiveReleaseDate;
      });
      
      res.json(filteredSongs);
    } catch (error) {
      console.error("Error fetching songs:", error);
      res.status(500).json({ error: "Failed to fetch songs" });
    }
  });

  app.get("/api/songs/:id", async (req, res) => {
    try {
      const song = await db.select().from(songs).where(eq(songs.id, req.params.id)).limit(1);
      if (song.length === 0) {
        return res.status(404).json({ error: "Song not found" });
      }
      res.json(song[0]);
    } catch (error) {
      console.error("Error fetching song:", error);
      res.status(500).json({ error: "Failed to fetch song" });
    }
  });

  app.post("/api/songs", async (req, res) => {
    try {
      const { title, artist, album, trackNumber, audioUrl, duration, price, featured } = req.body;
      
      if (!title || !trackNumber || !audioUrl) {
        return res.status(400).json({ error: "title, trackNumber, and audioUrl are required" });
      }

      const newSong = await db.insert(songs).values({
        title,
        artist: artist || "Shakim & Project DNA",
        album: album || "The Great Attractor",
        trackNumber: parseInt(trackNumber),
        audioUrl,
        duration: duration ? parseInt(duration) : null,
        price: price || "0.99",
        featured: featured ? parseInt(featured) : 0,
      }).returning();

      res.json({ message: "Song added successfully", song: newSong[0] });
    } catch (error) {
      console.error("Error adding song:", error);
      res.status(500).json({ error: "Failed to add song" });
    }
  });

  app.get("/api/beats", async (req, res) => {
    try {
      const allBeats = await db.select().from(beats);
      res.json(allBeats);
    } catch (error) {
      console.error("Error fetching beats:", error);
      res.status(500).json({ error: "Failed to fetch beats" });
    }
  });

  app.post("/api/beats", async (req, res) => {
    try {
      const { title, bpm, musicKey, genre, audioUrl, price } = req.body;
      
      if (!title || !bpm || !musicKey || !genre || !audioUrl) {
        return res.status(400).json({ error: "title, bpm, musicKey, genre, and audioUrl are required" });
      }

      const newBeat = await db.insert(beats).values({
        title,
        bpm: parseInt(bpm),
        musicKey,
        genre,
        audioUrl,
        price: price || "29.99",
      }).returning();

      res.json({ message: "Beat added successfully", beat: newBeat[0] });
    } catch (error) {
      console.error("Error adding beat:", error);
      res.status(500).json({ error: "Failed to add beat" });
    }
  });

  // ============ PLAYLIST ENDPOINTS ============
  
  // DNA Radio - synchronized now-playing calculation (with bumpers)
  app.get("/api/radio/now-playing", async (req, res) => {
    try {
      const allSongs = await db.select().from(songs).orderBy(asc(songs.trackNumber));
      if (allSongs.length === 0) return res.json({ song: null });

      const activeBumpers = await db.select().from(radioBumpers).where(eq(radioBumpers.isActive, 1));
      const DEFAULT_SLOT = 240;
      const BUMPER_SLOT = 35;
      const SONGS_BETWEEN_BUMPERS = 3;

      // Build rotation: song, song, song, bumper, song, song, song, bumper, ...
      interface Slot {
        type: 'song' | 'bumper';
        song?: typeof allSongs[0];
        bumper?: typeof activeBumpers[0];
        slotDuration: number;
      }
      const slots: Slot[] = [];
      let bumperIdx = 0;
      allSongs.forEach((s, i) => {
        slots.push({ type: 'song', song: s, slotDuration: s.duration || DEFAULT_SLOT });
        if ((i + 1) % SONGS_BETWEEN_BUMPERS === 0 && activeBumpers.length > 0) {
          const bumper = activeBumpers[bumperIdx % activeBumpers.length];
          slots.push({ type: 'bumper', bumper, slotDuration: BUMPER_SLOT });
          bumperIdx++;
        }
      });

      const totalCycle = slots.reduce((acc, s) => acc + s.slotDuration, 0);
      const nowSeconds = Math.floor(Date.now() / 1000);
      const posInCycle = nowSeconds % totalCycle;

      let elapsed = 0;
      let currentSlot = slots[0];
      for (const slot of slots) {
        if (posInCycle < elapsed + slot.slotDuration) {
          currentSlot = slot;
          break;
        }
        elapsed += slot.slotDuration;
      }

      const positionInSlot = posInCycle - elapsed;
      const secondsUntilNext = currentSlot.slotDuration - positionInSlot;

      if (currentSlot.type === 'bumper') {
        res.json({
          type: 'bumper',
          bumper: currentSlot.bumper,
          song: null,
          positionSeconds: positionInSlot,
          slotDurationSeconds: currentSlot.slotDuration,
          secondsUntilNext,
          totalSongs: allSongs.length,
        });
      } else {
        res.json({
          type: 'song',
          song: currentSlot.song,
          positionSeconds: positionInSlot,
          slotDurationSeconds: currentSlot.slotDuration,
          secondsUntilNext,
          totalSongs: allSongs.length,
        });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to compute radio state" });
    }
  });

  // Bumper management
  app.get("/api/radio/bumpers", async (req, res) => {
    try {
      const all = await db.select().from(radioBumpers).orderBy(asc(radioBumpers.id));
      res.json(all);
    } catch { res.status(500).json({ error: "Failed to fetch bumpers" }); }
  });

  app.post("/api/admin/radio/bumpers", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { title, audioUrl } = req.body;
      if (!title || !audioUrl) return res.status(400).json({ error: "title and audioUrl required" });
      const [bumper] = await db.insert(radioBumpers).values({ title, audioUrl, isActive: 1 }).returning();
      res.json(bumper);
    } catch { res.status(500).json({ error: "Failed to create bumper" }); }
  });

  app.patch("/api/admin/radio/bumpers/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      const [bumper] = await db.update(radioBumpers).set({ isActive }).where(eq(radioBumpers.id, id)).returning();
      res.json(bumper);
    } catch { res.status(500).json({ error: "Failed to update bumper" }); }
  });

  app.delete("/api/admin/radio/bumpers/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(radioBumpers).where(eq(radioBumpers.id, id));
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete bumper" }); }
  });

  // Song requests
  app.post("/api/song-requests", async (req, res) => {
    try {
      const { fanName, songTitle, artist, message } = req.body;
      if (!fanName || !songTitle) return res.status(400).json({ error: "fanName and songTitle required" });
      const userId = req.session.userId || null;
      const [request] = await db.insert(songRequests).values({ fanName, songTitle, artist: artist || null, message: message || null, userId, status: "pending" }).returning();
      res.json(request);
    } catch { res.status(500).json({ error: "Failed to submit request" }); }
  });

  app.get("/api/admin/song-requests", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const all = await db.select().from(songRequests).orderBy(asc(songRequests.createdAt));
      res.json(all);
    } catch { res.status(500).json({ error: "Failed to fetch requests" }); }
  });

  app.patch("/api/admin/song-requests/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [updated] = await db.update(songRequests).set({ status }).where(eq(songRequests.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ error: "Failed to update request" }); }
  });

  // Get user's playlists
  app.get("/api/playlists", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userPlaylists = await db
        .select()
        .from(playlists)
        .where(eq(playlists.userId, userId))
        .orderBy(sql`${playlists.updatedAt} DESC`);

      res.json(userPlaylists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res.status(500).json({ error: "Failed to fetch playlists" });
    }
  });

  // Get playlist with songs
  app.get("/api/playlists/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const playlist = await db
        .select()
        .from(playlists)
        .where(and(eq(playlists.id, req.params.id), eq(playlists.userId, userId)))
        .limit(1);

      if (playlist.length === 0) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      const playlistSongsData = await db
        .select({
          id: playlistSongs.id,
          songId: playlistSongs.songId,
          position: playlistSongs.position,
          addedAt: playlistSongs.addedAt,
          title: songs.title,
          artist: songs.artist,
          album: songs.album,
          audioUrl: songs.audioUrl,
          duration: songs.duration,
          price: songs.price,
        })
        .from(playlistSongs)
        .leftJoin(songs, eq(playlistSongs.songId, songs.id))
        .where(eq(playlistSongs.playlistId, req.params.id))
        .orderBy(asc(playlistSongs.position));

      res.json({
        ...playlist[0],
        songs: playlistSongsData,
      });
    } catch (error) {
      console.error("Error fetching playlist:", error);
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  });

  // Create playlist
  app.post("/api/playlists", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, description, isPublic } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Playlist name is required" });
      }

      const now = new Date().toISOString();
      const newPlaylist = await db.insert(playlists).values({
        userId,
        name,
        description: description || null,
        isPublic: isPublic ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      }).returning();

      res.json(newPlaylist[0]);
    } catch (error) {
      console.error("Error creating playlist:", error);
      res.status(500).json({ error: "Failed to create playlist" });
    }
  });

  // Update playlist
  app.patch("/api/playlists/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, description, isPublic } = req.body;
      const updatedPlaylist = await db
        .update(playlists)
        .set({
          name: name || undefined,
          description: description !== undefined ? description : undefined,
          isPublic: isPublic !== undefined ? (isPublic ? 1 : 0) : undefined,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(playlists.id, req.params.id), eq(playlists.userId, userId)))
        .returning();

      if (updatedPlaylist.length === 0) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      res.json(updatedPlaylist[0]);
    } catch (error) {
      console.error("Error updating playlist:", error);
      res.status(500).json({ error: "Failed to update playlist" });
    }
  });

  // Delete playlist
  app.delete("/api/playlists/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await db.delete(playlistSongs).where(eq(playlistSongs.playlistId, req.params.id));
      const deleted = await db
        .delete(playlists)
        .where(and(eq(playlists.id, req.params.id), eq(playlists.userId, userId)))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      res.json({ message: "Playlist deleted successfully" });
    } catch (error) {
      console.error("Error deleting playlist:", error);
      res.status(500).json({ error: "Failed to delete playlist" });
    }
  });

  // Add song to playlist
  app.post("/api/playlists/:id/songs", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { songId } = req.body;
      if (!songId) {
        return res.status(400).json({ error: "Song ID is required" });
      }

      const playlist = await db
        .select()
        .from(playlists)
        .where(and(eq(playlists.id, req.params.id), eq(playlists.userId, userId)))
        .limit(1);

      if (playlist.length === 0) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      const maxPosition = await db
        .select({ max: sql<number>`MAX(${playlistSongs.position})` })
        .from(playlistSongs)
        .where(eq(playlistSongs.playlistId, req.params.id));

      const position = (maxPosition[0]?.max ?? -1) + 1;

      const newPlaylistSong = await db.insert(playlistSongs).values({
        playlistId: req.params.id,
        songId,
        position,
        addedAt: new Date().toISOString(),
      }).returning();

      await db
        .update(playlists)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(playlists.id, req.params.id));

      res.json(newPlaylistSong[0]);
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      res.status(500).json({ error: "Failed to add song to playlist" });
    }
  });

  // Remove song from playlist
  app.delete("/api/playlists/:playlistId/songs/:songId", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const playlist = await db
        .select()
        .from(playlists)
        .where(and(eq(playlists.id, req.params.playlistId), eq(playlists.userId, userId)))
        .limit(1);

      if (playlist.length === 0) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      await db
        .delete(playlistSongs)
        .where(and(
          eq(playlistSongs.playlistId, req.params.playlistId),
          eq(playlistSongs.songId, req.params.songId)
        ));

      await db
        .update(playlists)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(playlists.id, req.params.playlistId));

      res.json({ message: "Song removed from playlist" });
    } catch (error) {
      console.error("Error removing song from playlist:", error);
      res.status(500).json({ error: "Failed to remove song from playlist" });
    }
  });

  // ============ LISTENING HISTORY ENDPOINTS ============
  
  // Save/update listening progress
  app.post("/api/listening-history", async (req, res) => {
    try {
      const userId = req.session.userId;
      const sessionId = req.session.id;
      const { songId, playbackPosition, duration, completed } = req.body;

      if (!songId) {
        return res.status(400).json({ error: "Song ID is required" });
      }

      const now = new Date().toISOString();

      const existing = await db
        .select()
        .from(listeningHistory)
        .where(and(
          eq(listeningHistory.sessionId, sessionId),
          eq(listeningHistory.songId, songId)
        ))
        .orderBy(sql`${listeningHistory.playedAt} DESC`)
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(listeningHistory)
          .set({
            playbackPosition: playbackPosition || 0,
            duration: duration || undefined,
            completed: completed ? 1 : 0,
            updatedAt: now,
          })
          .where(eq(listeningHistory.id, existing[0].id));

        res.json({ message: "Listening progress updated" });
      } else {
        await db.insert(listeningHistory).values({
          userId: userId || null,
          sessionId,
          songId,
          playbackPosition: playbackPosition || 0,
          duration: duration || null,
          completed: completed ? 1 : 0,
          playedAt: now,
          updatedAt: now,
        });

        res.json({ message: "Listening history saved" });
      }
    } catch (error) {
      console.error("Error saving listening history:", error);
      res.status(500).json({ error: "Failed to save listening history" });
    }
  });

  // Get recently played songs
  app.get("/api/listening-history/recent", async (req, res) => {
    try {
      const userId = req.session.userId;
      const sessionId = req.session.id;

      const whereClause = userId
        ? eq(listeningHistory.userId, userId)
        : eq(listeningHistory.sessionId, sessionId);

      const recentPlays = await db
        .select({
          id: listeningHistory.id,
          songId: listeningHistory.songId,
          playbackPosition: listeningHistory.playbackPosition,
          duration: listeningHistory.duration,
          completed: listeningHistory.completed,
          playedAt: listeningHistory.playedAt,
          title: songs.title,
          artist: songs.artist,
          album: songs.album,
          audioUrl: songs.audioUrl,
        })
        .from(listeningHistory)
        .leftJoin(songs, eq(listeningHistory.songId, songs.id))
        .where(whereClause)
        .orderBy(sql`${listeningHistory.playedAt} DESC`)
        .limit(20);

      res.json(recentPlays);
    } catch (error) {
      console.error("Error fetching listening history:", error);
      res.status(500).json({ error: "Failed to fetch listening history" });
    }
  });

  // Get resume position for a song
  app.get("/api/listening-history/resume/:songId", async (req, res) => {
    try {
      const userId = req.session.userId;
      const sessionId = req.session.id;

      const whereClause = userId
        ? and(eq(listeningHistory.userId, userId), eq(listeningHistory.songId, req.params.songId))
        : and(eq(listeningHistory.sessionId, sessionId), eq(listeningHistory.songId, req.params.songId));

      const history = await db
        .select()
        .from(listeningHistory)
        .where(whereClause)
        .orderBy(sql`${listeningHistory.playedAt} DESC`)
        .limit(1);

      if (history.length > 0 && !history[0].completed) {
        res.json({ resumePosition: history[0].playbackPosition || 0 });
      } else {
        res.json({ resumePosition: 0 });
      }
    } catch (error) {
      console.error("Error fetching resume position:", error);
      res.status(500).json({ error: "Failed to fetch resume position" });
    }
  });

  // ============ FAN WALL ENDPOINTS ============
  
  // Get fan wall messages (approved only for public view)
  app.get("/api/fan-wall", async (req, res) => {
    try {
      const messages = await db
        .select()
        .from(fanWallMessages)
        .where(eq(fanWallMessages.approved, 1))
        .orderBy(sql`${fanWallMessages.createdAt} DESC`)
        .limit(50);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching fan wall messages:", error);
      res.status(500).json({ error: "Failed to fetch fan wall messages" });
    }
  });

  // Submit fan wall message
  app.post("/api/fan-wall", async (req, res) => {
    try {
      const userId = req.session.userId;
      const { message, songId, dedicatedTo, reaction } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      let username = "Anonymous Fan";
      if (userId) {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length > 0) {
          username = user[0].username;
        }
      }

      const newMessage = await db.insert(fanWallMessages).values({
        userId: userId || null,
        username,
        message,
        songId: songId || null,
        dedicatedTo: dedicatedTo || null,
        reaction: reaction || null,
        approved: 0,
        featured: 0,
        createdAt: new Date().toISOString(),
      }).returning();

      res.json({ message: "Message submitted for review", data: newMessage[0] });
    } catch (error) {
      console.error("Error submitting fan wall message:", error);
      res.status(500).json({ error: "Failed to submit message" });
    }
  });

  // Admin: Get all fan wall messages (including unapproved)
  app.get("/api/admin/fan-wall", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0 || user[0].role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const messages = await db
        .select()
        .from(fanWallMessages)
        .orderBy(sql`${fanWallMessages.createdAt} DESC`);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching all fan wall messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Admin: Approve/reject fan wall message
  app.patch("/api/admin/fan-wall/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0 || user[0].role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { approved, featured } = req.body;
      const updated = await db
        .update(fanWallMessages)
        .set({
          approved: approved !== undefined ? (approved ? 1 : 0) : undefined,
          featured: featured !== undefined ? (featured ? 1 : 0) : undefined,
        })
        .where(eq(fanWallMessages.id, req.params.id))
        .returning();

      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating fan wall message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // ============ CONTENT LIKES ENDPOINTS ============

  app.get("/api/content-likes", async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ error: "entityType and entityId required" });
      }

      const likes = await db
        .select()
        .from(contentLikes)
        .where(and(
          eq(contentLikes.entityType, entityType as string),
          eq(contentLikes.entityId, entityId as string)
        ));

      const userId = (req.session as any)?.userId;
      const likedByUser = userId ? likes.some(l => l.userId === userId) : false;

      res.json({ count: likes.length, likedByUser });
    } catch (error) {
      console.error("Error fetching likes:", error);
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  app.post("/api/content-likes", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Must be logged in to like content" });
    }

    try {
      const { entityType, entityId } = req.body;
      if (!entityType || !entityId) {
        return res.status(400).json({ error: "entityType and entityId required" });
      }

      const existing = await db
        .select()
        .from(contentLikes)
        .where(and(
          eq(contentLikes.userId, userId),
          eq(contentLikes.entityType, entityType),
          eq(contentLikes.entityId, entityId)
        ));

      if (existing.length > 0) {
        await db.delete(contentLikes).where(eq(contentLikes.id, existing[0].id));
      } else {
        await db.insert(contentLikes).values({
          userId,
          entityType,
          entityId,
          createdAt: new Date().toISOString(),
        });
      }

      const totalLikes = await db
        .select()
        .from(contentLikes)
        .where(and(
          eq(contentLikes.entityType, entityType),
          eq(contentLikes.entityId, entityId)
        ));

      res.json({ count: totalLikes.length, likedByUser: existing.length === 0 });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // ============ CONTENT COMMENTS ENDPOINTS ============

  app.get("/api/content-comments", async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ error: "entityType and entityId required" });
      }

      const comments = await db
        .select()
        .from(contentComments)
        .where(and(
          eq(contentComments.entityType, entityType as string),
          eq(contentComments.entityId, entityId as string)
        ))
        .orderBy(sql`${contentComments.createdAt} DESC`);

      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/content-comments", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Must be logged in to comment" });
    }

    try {
      const { entityType, entityId, body } = req.body;
      if (!entityType || !entityId || !body) {
        return res.status(400).json({ error: "entityType, entityId, and body required" });
      }

      if (body.length > 500) {
        return res.status(400).json({ error: "Comment must be 500 characters or less" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId));
      if (!user.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const [comment] = await db.insert(contentComments).values({
        userId,
        username: user[0].username,
        entityType,
        entityId,
        body: body.trim(),
        createdAt: new Date().toISOString(),
      }).returning();

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.delete("/api/content-comments/:id", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Must be logged in" });
    }

    try {
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (!user.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const comment = await db.select().from(contentComments).where(eq(contentComments.id, req.params.id));
      if (!comment.length) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (user[0].role !== 'admin' && comment[0].userId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this comment" });
      }

      await db.delete(contentComments).where(eq(contentComments.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  app.get("/api/admin/content-comments", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (!user.length || user[0].role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const comments = await db
        .select()
        .from(contentComments)
        .orderBy(sql`${contentComments.createdAt} DESC`)
        .limit(100);

      res.json(comments);
    } catch (error) {
      console.error("Error fetching admin comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // ============ ARTIST MESSAGES ENDPOINTS ============
  
  // Get active artist messages
  app.get("/api/artist-messages", async (req, res) => {
    try {
      const messages = await db
        .select()
        .from(artistMessages)
        .where(eq(artistMessages.active, 1))
        .orderBy(sql`${artistMessages.publishedAt} DESC`)
        .limit(5);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching artist messages:", error);
      res.status(500).json({ error: "Failed to fetch artist messages" });
    }
  });

  // Admin: Create artist message
  app.post("/api/admin/artist-messages", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0 || user[0].role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { title, message, imageUrl, videoUrl, ctaText, ctaUrl, featured } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }

      const now = new Date().toISOString();
      const newMessage = await db.insert(artistMessages).values({
        title,
        message,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        active: 1,
        featured: featured ? 1 : 0,
        publishedAt: now,
        createdAt: now,
      }).returning();

      res.json(newMessage[0]);
    } catch (error) {
      console.error("Error creating artist message:", error);
      res.status(500).json({ error: "Failed to create artist message" });
    }
  });

  // Admin: Update artist message
  app.patch("/api/admin/artist-messages/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0 || user[0].role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { title, message, imageUrl, videoUrl, ctaText, ctaUrl, active, featured } = req.body;
      const updated = await db
        .update(artistMessages)
        .set({
          title: title || undefined,
          message: message || undefined,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          videoUrl: videoUrl !== undefined ? videoUrl : undefined,
          ctaText: ctaText !== undefined ? ctaText : undefined,
          ctaUrl: ctaUrl !== undefined ? ctaUrl : undefined,
          active: active !== undefined ? (active ? 1 : 0) : undefined,
          featured: featured !== undefined ? (featured ? 1 : 0) : undefined,
        })
        .where(eq(artistMessages.id, req.params.id))
        .returning();

      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating artist message:", error);
      res.status(500).json({ error: "Failed to update artist message" });
    }
  });

  // Admin: Delete artist message
  app.delete("/api/admin/artist-messages/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0 || user[0].role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await db.delete(artistMessages).where(eq(artistMessages.id, req.params.id));
      res.json({ message: "Artist message deleted successfully" });
    } catch (error) {
      console.error("Error deleting artist message:", error);
      res.status(500).json({ error: "Failed to delete artist message" });
    }
  });

  app.post("/api/track-share", async (req, res) => {
    try {
      const { songId, shareMethod } = req.body;
      const userId = req.session.userId;

      if (!songId || !shareMethod) {
        return res.status(400).json({ error: "songId and shareMethod are required" });
      }

      await db.insert(userActivityEvents).values({
        userId: userId || null,
        sessionId: req.sessionID,
        eventType: 'share',
        entityType: 'song',
        entityId: songId,
        metadata: JSON.stringify({ method: shareMethod }),
        occurredAt: new Date().toISOString(),
      });

      res.json({ message: "Share tracked successfully" });
    } catch (error) {
      console.error("Error tracking share:", error);
      res.status(500).json({ error: "Failed to track share" });
    }
  });

  app.get("/api/merchandise", async (req, res) => {
    try {
      const allMerch = await db.select().from(merchandise);
      res.json(allMerch);
    } catch (error) {
      console.error("Error fetching merchandise:", error);
      res.status(500).json({ error: "Failed to fetch merchandise" });
    }
  });

  app.post("/api/merchandise", async (req, res) => {
    try {
      const { name, description, price, imageUrl, sizes, category } = req.body;
      
      if (!name || !description || !price) {
        return res.status(400).json({ error: "name, description, and price are required" });
      }

      const newMerch = await db.insert(merchandise).values({
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        sizes: sizes || null,
        category: category || null,
      }).returning();

      res.json({ message: "Merchandise added successfully", merchandise: newMerch[0] });
    } catch (error) {
      console.error("Error adding merchandise:", error);
      res.status(500).json({ error: "Failed to add merchandise" });
    }
  });

  // Get cart totals with tier-based discounts
  app.get("/api/cart/totals", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";
      const userId = req.session.userId || null;

      const items = await db
        .select({
          price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
          quantity: cartItems.quantity,
          itemType: cartItems.itemType,
        })
        .from(cartItems)
        .leftJoin(songs, eq(cartItems.songId, songs.id))
        .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
        .leftJoin(beats, eq(cartItems.beatId, beats.id))
        .where(eq(cartItems.sessionId, sessionId));

      const subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);

      const hasMerch = items.some(item => item.itemType === 'merch');
      const shippingCost = hasMerch ? 5.99 : 0;

      // Calculate tier-based discount
      let discountPercent = 0;
      let tierName = null;
      
      if (userId) {
        const user = await db
          .select({
            tierId: users.tierId,
            discountOverride: users.discountOverride,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user.length > 0) {
          if (user[0].discountOverride !== null) {
            discountPercent = user[0].discountOverride;
            tierName = "Custom Discount";
          } else if (user[0].tierId) {
            const tier = await db
              .select()
              .from(membershipTiers)
              .where(eq(membershipTiers.id, user[0].tierId))
              .limit(1);
            
            if (tier.length > 0) {
              discountPercent = tier[0].discountPercent || 0;
              tierName = tier[0].name;
            }
          }
        }
      }

      const discountAmount = subtotal * (discountPercent / 100);
      const discountedSubtotal = subtotal - discountAmount;
      const total = discountedSubtotal + shippingCost;

      res.json({
        subtotal: subtotal.toFixed(2),
        discountPercent,
        discountAmount: discountAmount.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        total: total.toFixed(2),
        tierName,
        itemCount: items.length,
      });
    } catch (error) {
      console.error("Error calculating cart totals:", error);
      res.status(500).json({ error: "Failed to calculate cart totals" });
    }
  });

  app.get("/api/cart", async (req, res) => {
    try {
      // Force session creation
      if (!req.session.cartId) {
        req.session.cartId = req.sessionID;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      const sessionId = req.sessionID || "guest";
      
      const items = await db
        .select({
          id: cartItems.id,
          songId: cartItems.songId,
          merchId: cartItems.merchId,
          beatId: cartItems.beatId,
          itemType: cartItems.itemType,
          quantity: cartItems.quantity,
          size: cartItems.size,
          title: sql<string>`COALESCE(${songs.title}, ${merchandise.name}, ${beats.title})`.as('title'),
          artist: songs.artist,
          album: songs.album,
          description: merchandise.description,
          bpm: beats.bpm,
          musicKey: beats.musicKey,
          genre: beats.genre,
          price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
        })
        .from(cartItems)
        .leftJoin(songs, eq(cartItems.songId, songs.id))
        .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
        .leftJoin(beats, eq(cartItems.beatId, beats.id))
        .where(eq(cartItems.sessionId, sessionId));
      res.json(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.get("/api/shipping-address", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";
      
      const address = await db
        .select()
        .from(shippingAddresses)
        .where(eq(shippingAddresses.sessionId, sessionId))
        .orderBy(sql`${shippingAddresses.createdAt} DESC`)
        .limit(1);
      
      if (address.length === 0) {
        return res.json(null);
      }
      
      res.json(address[0]);
    } catch (error) {
      console.error("Error fetching shipping address:", error);
      res.status(500).json({ error: "Failed to fetch shipping address" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      // Force session creation
      if (!req.session.cartId) {
        req.session.cartId = req.sessionID;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      const { songId, merchId, beatId, size } = req.body;
      const sessionId = req.sessionID || "guest";
      
      if (!songId && !merchId && !beatId) {
        return res.status(400).json({ error: "Either songId, merchId, or beatId is required" });
      }

      const itemCount = [songId, merchId, beatId].filter(Boolean).length;
      if (itemCount > 1) {
        return res.status(400).json({ error: "Cannot add multiple item types in same request" });
      }

      const itemType = songId ? "song" : beatId ? "beat" : "merch";

      const whereConditions = songId 
        ? and(eq(cartItems.songId, songId), eq(cartItems.sessionId, sessionId))
        : beatId
        ? and(eq(cartItems.beatId, beatId), eq(cartItems.sessionId, sessionId))
        : and(eq(cartItems.merchId, merchId), eq(cartItems.sessionId, sessionId), size ? eq(cartItems.size, size) : sql`true`);

      const existingItem = await db
        .select()
        .from(cartItems)
        .where(whereConditions)
        .limit(1);

      if (existingItem.length > 0) {
        return res.status(200).json({ message: "Item already in cart", item: existingItem[0] });
      }

      const newItem = await db.insert(cartItems).values({
        songId: songId || null,
        merchId: merchId || null,
        beatId: beatId || null,
        itemType,
        sessionId,
        quantity: 1,
        size: size || null,
      }).returning();

      res.json({ message: "Item added to cart", item: newItem[0] });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const sessionId = req.sessionID || "guest";
      
      const item = await db
        .select()
        .from(cartItems)
        .where(and(
          eq(cartItems.id, id),
          eq(cartItems.sessionId, sessionId)
        ))
        .limit(1);

      if (item.length === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      await db.delete(cartItems).where(and(
        eq(cartItems.id, id),
        eq(cartItems.sessionId, sessionId)
      ));
      
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  app.post("/api/beat-licenses", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";
      const userId = req.session.userId || null;
      const { beatId, fullName, email, artistName, licenseType, signature, termsAccepted } = req.body;

      if (!beatId || !fullName || !email || !signature) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!termsAccepted) {
        return res.status(400).json({ error: "Terms must be accepted" });
      }

      const existingLicense = await db
        .select()
        .from(beatLicenses)
        .where(and(
          eq(beatLicenses.beatId, beatId),
          eq(beatLicenses.sessionId, sessionId)
        ))
        .limit(1);

      if (existingLicense.length > 0) {
        return res.json({ message: "License already exists", license: existingLicense[0] });
      }

      const newLicense = await db.insert(beatLicenses).values({
        beatId,
        sessionId,
        userId,
        fullName,
        email,
        artistName: artistName || null,
        licenseType: licenseType || 'non-exclusive',
        signature,
        termsAccepted: termsAccepted ? 1 : 0,
        createdAt: new Date().toISOString(),
      }).returning();

      res.json({ message: "License created successfully", license: newLicense[0] });
    } catch (error) {
      console.error("Error creating beat license:", error);
      res.status(500).json({ error: "Failed to create license" });
    }
  });

  app.get("/api/beat-licenses", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";

      const licenses = await db
        .select()
        .from(beatLicenses)
        .where(eq(beatLicenses.sessionId, sessionId));

      res.json(licenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ error: "Failed to fetch licenses" });
    }
  });

  app.get("/api/beat-licenses/beat/:beatId", async (req, res) => {
    try {
      const { beatId } = req.params;
      const sessionId = req.sessionID || "guest";

      const license = await db
        .select()
        .from(beatLicenses)
        .where(and(
          eq(beatLicenses.beatId, beatId),
          eq(beatLicenses.sessionId, sessionId)
        ))
        .limit(1);

      if (license.length === 0) {
        return res.status(404).json({ error: "License not found" });
      }

      res.json(license[0]);
    } catch (error) {
      console.error("Error fetching beat license:", error);
      res.status(500).json({ error: "Failed to fetch license" });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";
      const userId = req.session.userId || null;
      const { shippingAddress, beatLicenses: beatLicensesData } = req.body;
      
      console.log("🔍 Payment Intent Debug - Session ID:", sessionId);
      console.log("🔍 Payment Intent Debug - Request body keys:", Object.keys(req.body));
      
      const items = await db
        .select({
          price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
          quantity: cartItems.quantity,
          itemType: cartItems.itemType,
        })
        .from(cartItems)
        .leftJoin(songs, eq(cartItems.songId, songs.id))
        .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
        .leftJoin(beats, eq(cartItems.beatId, beats.id))
        .where(eq(cartItems.sessionId, sessionId));

      console.log("🔍 Payment Intent Debug - Cart items found:", items.length);

      if (items.length === 0) {
        console.error("❌ Payment Intent Error - Cart is empty for session:", sessionId);
        return res.status(400).json({ error: "Cart is empty" });
      }

      const hasMerch = items.some(item => item.itemType === 'merch');

      let subtotal = items.reduce((sum, item) => {
        const price = parseFloat(item.price);
        return sum + (price * item.quantity);
      }, 0);

      // Calculate tier-based discount
      let discountPercent = 0;
      if (userId) {
        const user = await db
          .select({
            tierId: users.tierId,
            discountOverride: users.discountOverride,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user.length > 0) {
          if (user[0].discountOverride !== null) {
            discountPercent = user[0].discountOverride;
          } else if (user[0].tierId) {
            const tier = await db
              .select()
              .from(membershipTiers)
              .where(eq(membershipTiers.id, user[0].tierId))
              .limit(1);
            
            if (tier.length > 0) {
              discountPercent = tier[0].discountPercent || 0;
            }
          }
        }
      }

      const discountAmount = subtotal * (discountPercent / 100);
      const discountedSubtotal = subtotal - discountAmount;

      // Add shipping cost for merchandise orders ($5.99 flat rate)
      const shippingCost = hasMerch ? 5.99 : 0;
      const amount = discountedSubtotal + shippingCost;

      let shippingAddressId = null;

      if (hasMerch && shippingAddress) {
        const savedAddress = await db.insert(shippingAddresses).values({
          sessionId,
          userId,
          fullName: shippingAddress.fullName,
          email: shippingAddress.email,
          phone: shippingAddress.phone || null,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2 || null,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country,
          createdAt: new Date().toISOString(),
        }).returning();

        shippingAddressId = savedAddress[0].id;
      }

      // Save beat licenses
      if (beatLicensesData && Array.isArray(beatLicensesData)) {
        for (const license of beatLicensesData) {
          await db.insert(beatLicenses).values({
            beatId: license.beatId,
            sessionId,
            userId,
            fullName: license.fullName,
            email: license.email,
            artistName: license.artistName || null,
            licenseType: license.licenseType || 'non-exclusive',
            signature: license.signature,
            termsAccepted: license.termsAccepted || 1,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (!stripe) {
        return res.status(503).json({ message: "Payment processing unavailable - Stripe not configured" });
      }

      const amountInCents = Math.round(amount * 100);
      
      console.log("💰 Creating Stripe Payment Intent:");
      console.log("  - Subtotal: $" + subtotal.toFixed(2));
      if (discountPercent > 0) {
        console.log("  - Discount (" + discountPercent + "%): -$" + discountAmount.toFixed(2));
        console.log("  - Discounted Subtotal: $" + discountedSubtotal.toFixed(2));
      }
      console.log("  - Shipping: $" + shippingCost.toFixed(2));
      console.log("  - Total: $" + amount.toFixed(2));
      console.log("  - Amount in cents:", amountInCents);

      if (amountInCents <= 0) {
        console.error("❌ Invalid amount: ", amountInCents);
        return res.status(400).json({ error: "Cart total must be greater than $0" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        payment_method_types: ['card'],
        metadata: {
          sessionId,
          userId: userId || '',
          shippingAddressId: shippingAddressId || '',
          hasMerch: hasMerch.toString(),
          shippingCost: shippingCost.toString(),
          discountPercent: discountPercent.toString(),
          discountAmount: discountAmount.toFixed(2),
        },
      });

      console.log("✅ Payment Intent created successfully:", paymentIntent.id);
      console.log("  - Status:", paymentIntent.status);
      console.log("  - Client secret:", paymentIntent.client_secret ? "present" : "missing");

      res.json({ clientSecret: paymentIntent.client_secret, shippingCost });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Must be logged in to view orders" });
      }

      const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(sql`${orders.createdAt} DESC`);

      const ordersWithItems = await Promise.all(
        userOrders.map(async (order) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          
          return {
            ...order,
            items,
          };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";
      const userId = req.session.userId || null;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }

      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, paymentIntentId))
        .limit(1);

      if (existingOrder.length > 0) {
        return res.json({ message: "Order already exists", order: existingOrder[0] });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Payment processing unavailable - Stripe not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      if (paymentIntent.metadata.sessionId !== sessionId) {
        return res.status(403).json({ error: "Payment does not belong to this session" });
      }

      const email = (paymentIntent.receipt_email || 'customer@example.com') as string;
      const shippingAddressId = paymentIntent.metadata.shippingAddressId || null;

      const items = await db
        .select({
          id: cartItems.id,
          songId: cartItems.songId,
          merchId: cartItems.merchId,
          beatId: cartItems.beatId,
          itemType: cartItems.itemType,
          quantity: cartItems.quantity,
          size: cartItems.size,
          title: sql<string>`COALESCE(${songs.title}, ${merchandise.name}, ${beats.title})`.as('title'),
          price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
          audioUrl: sql<string>`COALESCE(${songs.audioUrl}, ${beats.audioUrl})`.as('audioUrl'),
        })
        .from(cartItems)
        .leftJoin(songs, eq(cartItems.songId, songs.id))
        .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
        .leftJoin(beats, eq(cartItems.beatId, beats.id))
        .where(eq(cartItems.sessionId, sessionId));

      if (items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      const subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);

      const hasMerch = items.some(item => item.itemType === 'merch');
      const shippingCost = hasMerch ? 5.99 : 0;
      const tax = subtotal * 0.08;
      const total = subtotal + shippingCost + tax;

      const [order] = await db.insert(orders).values({
        userId,
        sessionId,
        email,
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: 'completed',
        stripePaymentIntentId: paymentIntentId,
        shippingAddressId: shippingAddressId || null,
        createdAt: new Date().toISOString(),
      }).returning();

      for (const item of items) {
        await db.insert(orderItems).values({
          orderId: order.id,
          songId: item.songId || null,
          merchId: item.merchId || null,
          beatId: item.beatId || null,
          itemType: item.itemType,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          size: item.size || null,
          audioUrl: item.audioUrl || null,
        });
      }

      await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));

      const shippingInfo = shippingAddressId ? await db
        .select()
        .from(shippingAddresses)
        .where(eq(shippingAddresses.id, shippingAddressId))
        .limit(1) : [];
      
      const customerName = shippingInfo.length > 0 ? shippingInfo[0].fullName : 'Valued Customer';
      
      try {
        await sendOrderConfirmationEmail(
          email,
          customerName,
          order.id,
          items.map(item => ({
            title: item.title,
            itemType: item.itemType,
            price: parseFloat(item.price),
            quantity: item.quantity,
            audioUrl: item.audioUrl,
            size: item.size,
          })),
          subtotal,
          tax,
          shippingCost,
          total
        );
        console.log('✅ Order confirmation email sent successfully');
      } catch (emailError) {
        console.error('⚠️  Order created but email failed:', emailError);
      }

      res.json({ message: "Order created successfully", order });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/purchase-details/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const sessionId = req.sessionID || "guest";

      if (!stripe) {
        return res.status(503).json({ error: "Payment processing unavailable" });
      }

      // Verify payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      // Allow access if session matches OR if this is a session recovery scenario
      const sessionMatches = paymentIntent.metadata.sessionId === sessionId;
      
      if (!sessionMatches) {
        // Session doesn't match - this could be a legitimate user recovering their purchase
        // We'll still return the data but log this for monitoring
        console.log('⚠️  Session mismatch for payment intent:', paymentIntentId);
        console.log('  Expected session:', paymentIntent.metadata.sessionId);
        console.log('  Current session:', sessionId);
      }

      // First, check if order already exists
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, paymentIntentId))
        .limit(1);

      if (existingOrder.length > 0) {
        // Order exists, get items from order
        const items = await db
          .select({
            songId: orderItems.songId,
            merchId: orderItems.merchId,
            beatId: orderItems.beatId,
            itemType: orderItems.itemType,
            quantity: orderItems.quantity,
            size: orderItems.size,
            title: orderItems.title,
            price: orderItems.price,
            audioUrl: orderItems.audioUrl,
            imageUrl: sql<string>`NULL`.as('imageUrl'),
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, existingOrder[0].id));

        return res.json({
          items,
          subtotal: existingOrder[0].subtotal,
          shippingCost: existingOrder[0].shippingCost,
          tax: existingOrder[0].tax,
          total: existingOrder[0].total,
          paymentIntentId,
        });
      }

      // Order doesn't exist yet, get from cart
      const items = await db
        .select({
          songId: cartItems.songId,
          merchId: cartItems.merchId,
          beatId: cartItems.beatId,
          itemType: cartItems.itemType,
          quantity: cartItems.quantity,
          size: cartItems.size,
          title: sql<string>`COALESCE(${songs.title}, ${merchandise.name}, ${beats.title})`.as('title'),
          price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
          audioUrl: sql<string>`COALESCE(${songs.audioUrl}, ${beats.audioUrl})`.as('audioUrl'),
          imageUrl: merchandise.imageUrl,
        })
        .from(cartItems)
        .leftJoin(songs, eq(cartItems.songId, songs.id))
        .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
        .leftJoin(beats, eq(cartItems.beatId, beats.id))
        .where(eq(cartItems.sessionId, sessionId));

      if (items.length === 0) {
        return res.status(404).json({ error: "No items found for this payment" });
      }

      const subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);

      const hasMerch = items.some(item => item.itemType === 'merch');
      const shippingCost = hasMerch ? 5.99 : 0;
      const tax = subtotal * 0.08;
      const total = subtotal + shippingCost + tax;

      res.json({
        items,
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentIntentId,
      });
    } catch (error: any) {
      console.error("Error fetching purchase details:", error);
      res.status(500).json({ error: "Failed to fetch purchase details" });
    }
  });

  app.get("/api/download-status/:paymentIntentId/:itemId", async (req, res) => {
    try {
      const { paymentIntentId, itemId } = req.params;
      const DOWNLOAD_LIMIT = 2;

      // Count downloads for this specific item in this purchase
      const downloadCount = await db
        .select()
        .from(downloads)
        .where(and(
          eq(downloads.paymentIntentId, paymentIntentId),
          eq(downloads.itemId, itemId)
        ));

      const remaining = Math.max(0, DOWNLOAD_LIMIT - downloadCount.length);

      res.json({
        downloadCount: downloadCount.length,
        downloadLimit: DOWNLOAD_LIMIT,
        remaining,
        canDownload: downloadCount.length < DOWNLOAD_LIMIT,
      });
    } catch (error) {
      console.error("Error checking download status:", error);
      res.status(500).json({ error: "Failed to check download status" });
    }
  });

  app.get("/api/secure-download/:paymentIntentId/:itemId", async (req, res) => {
    try {
      const { paymentIntentId, itemId } = req.params;
      const DOWNLOAD_LIMIT = 2;

      if (!stripe) {
        return res.status(503).json({ error: "Payment processing unavailable" });
      }

      // Verify payment intent exists and succeeded
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(403).json({ error: "Payment not completed" });
      }

      // CRITICAL: Verify the item was actually purchased with this payment intent
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, paymentIntentId))
        .limit(1);

      if (!order) {
        console.warn(`⚠️ Unauthorized download attempt: No order found for payment intent ${paymentIntentId}`);
        return res.status(403).json({ error: "Order not found for this payment" });
      }

      // Verify the specific item is in this order (check both songId and beatId)
      const orderItemsForOrder = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const orderItem = orderItemsForOrder.find(item => 
        item.songId === itemId || item.beatId === itemId
      );

      if (!orderItem) {
        console.warn(`⚠️ Unauthorized download attempt: Item ${itemId} not in order for payment intent ${paymentIntentId}`);
        return res.status(403).json({ error: "This item was not included in your purchase" });
      }

      // Check download limit
      const existingDownloads = await db
        .select()
        .from(downloads)
        .where(and(
          eq(downloads.paymentIntentId, paymentIntentId),
          eq(downloads.itemId, itemId)
        ));

      if (existingDownloads.length >= DOWNLOAD_LIMIT) {
        return res.status(403).json({ 
          error: `Download limit reached. You've downloaded this ${existingDownloads.length} times (limit: ${DOWNLOAD_LIMIT}).`,
        });
      }

      // Get item details from database
      const [songResult] = await db
        .select({ audioUrl: songs.audioUrl, title: songs.title })
        .from(songs)
        .where(eq(songs.id, itemId))
        .limit(1);

      const [beatResult] = !songResult ? await db
        .select({ audioUrl: beats.audioUrl, title: beats.title })
        .from(beats)
        .where(eq(beats.id, itemId))
        .limit(1) : [null];

      const item = songResult || beatResult;

      if (!item || !item.audioUrl) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Get IP address for tracking
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';

      // Search for the file in storage (local or Replit object storage)
      const filename = item.audioUrl.split('/').pop()!;
      const objectPath = await searchFile(filename);
      
      if (!objectPath) {
        console.error(`File not found in storage: ${filename}`);
        return res.status(404).json({ error: 'File not found in storage' });
      }

      // Track download BEFORE sending (so count is accurate even if client disconnects)
      try {
        await db.insert(downloads).values({
          paymentIntentId,
          itemId,
          itemType: songResult ? 'song' : 'beat',
          title: item.title,
          orderItemId: null,
          ipAddress,
          downloadedAt: new Date().toISOString(),
        });
        console.log(`✅ Download tracked: ${item.title} (${existingDownloads.length + 1}/${DOWNLOAD_LIMIT})`);
      } catch (err) {
        console.error('Failed to track download:', err);
      }

      // Read the file as bytes for reliable delivery
      const fileBytes = await readFileAsBytes(objectPath);
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentType = ext === 'wav' ? 'audio/wav' : 'audio/mpeg';

      // Set headers to force download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBytes.length);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');

      res.send(fileBytes);
    } catch (error) {
      console.error("Error in secure download:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process download" });
      }
    }
  });

  app.get("/api/download-all-status/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const DOWNLOAD_LIMIT = 2;

      // Count ZIP downloads for this payment intent
      const downloadCount = await db
        .select()
        .from(downloads)
        .where(and(
          eq(downloads.paymentIntentId, paymentIntentId),
          eq(downloads.itemType, 'zip')
        ));

      const remaining = Math.max(0, DOWNLOAD_LIMIT - downloadCount.length);

      res.json({
        downloadCount: downloadCount.length,
        downloadLimit: DOWNLOAD_LIMIT,
        remaining,
        canDownload: downloadCount.length < DOWNLOAD_LIMIT,
      });
    } catch (error) {
      console.error("Error checking ZIP download status:", error);
      res.status(500).json({ error: "Failed to check download status" });
    }
  });

  app.get("/api/secure-download-all/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const DOWNLOAD_LIMIT = 2;

      if (!stripe) {
        return res.status(503).json({ error: "Payment processing unavailable" });
      }

      // Verify payment intent exists and succeeded
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(403).json({ error: "Payment not completed" });
      }

      // Get order for this payment
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, paymentIntentId))
        .limit(1);

      if (!order) {
        return res.status(403).json({ error: "Order not found for this payment" });
      }

      // Get all purchased digital items (songs and beats)
      const orderItemsForOrder = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const songIds = orderItemsForOrder.filter(item => item.songId).map(item => item.songId!);
      const beatIds = orderItemsForOrder.filter(item => item.beatId).map(item => item.beatId!);

      // Fetch all songs
      const purchasedSongs = songIds.length > 0 ? await db
        .select()
        .from(songs)
        .where(inArray(songs.id, songIds)) : [];

      // Fetch all beats
      const purchasedBeats = beatIds.length > 0 ? await db
        .select()
        .from(beats)
        .where(inArray(beats.id, beatIds)) : [];

      const allItems = [...purchasedSongs, ...purchasedBeats];

      if (allItems.length === 0) {
        return res.status(404).json({ error: "No digital items found in this order" });
      }

      // Get IP address for tracking
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';

      // RESERVE download slot atomically to prevent race conditions
      const [downloadRecord] = await db.insert(downloads).values({
        paymentIntentId,
        itemId: 'all',
        itemType: 'zip',
        title: `Full Album (${allItems.length} items)`,
        orderItemId: null,
        ipAddress,
        downloadedAt: new Date().toISOString(),
      }).returning();

      // RE-CHECK limit after insert to catch concurrent requests
      const allDownloads = await db
        .select()
        .from(downloads)
        .where(and(
          eq(downloads.paymentIntentId, paymentIntentId),
          eq(downloads.itemType, 'zip')
        ));

      if (allDownloads.length > DOWNLOAD_LIMIT) {
        // Remove this reservation - limit exceeded
        await db.delete(downloads).where(eq(downloads.id, downloadRecord.id));
        return res.status(403).json({ 
          error: `ZIP download limit reached. You've downloaded the full album ${DOWNLOAD_LIMIT} times (limit: ${DOWNLOAD_LIMIT}).`,
        });
      }

      console.log(`🔒 ZIP download slot reserved (${allDownloads.length}/${DOWNLOAD_LIMIT})`);

      // Create ZIP file
      const archiver = await import('archiver');
      const archive = archiver.default('zip', {
        zlib: { level: 9 }
      });

      // Set headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="Project_DNA_Music_Order_${paymentIntentId.slice(-8)}.zip"`);

      // Track completion and cleanup on failure/abort
      let downloadCompleted = false;
      
      res.on('finish', () => {
        if (res.statusCode === 200) {
          downloadCompleted = true;
          console.log(`✅ ZIP download completed: ${allItems.length} items`);
        }
      });

      // Cleanup on client disconnect/abort
      res.on('close', async () => {
        if (!downloadCompleted) {
          try {
            await db.delete(downloads).where(eq(downloads.id, downloadRecord.id));
            console.log('🗑️ ZIP download reservation removed (client disconnected)');
          } catch (err) {
            console.error('Failed to remove download reservation:', err);
          }
        }
      });

      archive.on('error', async (error: any) => {
        console.error('Archive error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error creating ZIP file' });
        }
        // Remove reservation if stream fails
        if (!downloadCompleted) {
          try {
            await db.delete(downloads).where(eq(downloads.id, downloadRecord.id));
            console.log('🗑️ ZIP download reservation removed due to error');
          } catch (err) {
            console.error('Failed to remove download reservation:', err);
          }
        }
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add files to ZIP
      for (const item of allItems) {
        try {
          const filename = item.audioUrl.split('/').pop()!;
          const objectPath = await searchFile(filename);
          
          if (objectPath) {
            const fileBytes = await readFileAsBytes(objectPath);
            archive.append(fileBytes, { name: filename });
            console.log(`📦 Added to ZIP: ${filename}`);
          } else {
            console.warn(`⚠️ File not found in storage: ${filename}`);
          }
        } catch (err) {
          console.error(`Error adding ${item.title} to ZIP:`, err);
        }
      }

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      console.error("Error in ZIP download:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create download package" });
      }
    }
  });

  app.post("/api/send-download-link", async (req, res) => {
    try {
      const { paymentIntentId, email } = req.body;

      if (!paymentIntentId || !email) {
        return res.status(400).json({ error: "Payment intent ID and email are required" });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      // Get payment method to find what was purchased
      let customerEmail = email;
      let customerName = 'Valued Customer';
      
      if (paymentIntent.payment_method) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method as string
        );
        customerName = paymentMethod.billing_details?.name || customerName;
      }

      // For now, send a simple download link email
      // In a real scenario, you'd need to reconstruct the purchase from Stripe metadata
      const amount = paymentIntent.amount / 100;
      
      await sendOrderConfirmationEmail(
        customerEmail,
        customerName,
        paymentIntentId,
        [], // Would need to reconstruct items from Stripe metadata
        amount,
        0,
        0,
        amount
      );

      res.json({ message: "Download link sent successfully" });
    } catch (error: any) {
      console.error("Error sending download link:", error);
      res.status(500).json({ error: "Failed to send download link" });
    }
  });

  app.post("/api/clear-cart", async (req, res) => {
    try {
      const sessionId = req.sessionID || "guest";
      
      await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
      
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  app.post("/api/donations", async (req, res) => {
    try {
      const { amount, message } = req.body;
      const sessionId = req.sessionID || "guest";
      const userId = req.session.userId || null;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Payment processing unavailable - Stripe not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100),
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          type: "donation",
          message: message || "",
        },
      });

      const newDonation = await db.insert(donations).values({
        userId,
        sessionId,
        amount,
        message: message || null,
        createdAt: new Date().toISOString(),
      }).returning();

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        donation: newDonation[0]
      });
    } catch (error: any) {
      console.error("Error creating donation:", error);
      res.status(500).json({ error: "Failed to process donation" });
    }
  });

  app.get("/api/donations/total", async (req, res) => {
    try {
      const allDonations = await db.select().from(donations);
      const total = allDonations.reduce((sum, donation) => {
        return sum + parseFloat(donation.amount);
      }, 0);
      
      res.json({ total, count: allDonations.length });
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  app.get("/api/exclusive-content", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Must be logged in to access exclusive content" });
      }

      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      let userTierName = "Free Member";
      
      if (user.length > 0 && user[0].tierId) {
        const tier = await db.select().from(membershipTiers).where(eq(membershipTiers.id, user[0].tierId)).limit(1);
        if (tier.length > 0) {
          userTierName = tier[0].name;
        }
      }
      
      const tierHierarchy: Record<string, number> = {
        "free": 1,
        "Free Member": 1,
        "vip": 2,
        "VIP Member": 2,
        "ultimate": 3,
        "Ultimate Fan": 3,
      };
      
      const userTierLevel = tierHierarchy[userTierName] || 1;
      
      const allContent = await db.select().from(exclusiveContent);
      const filteredContent = allContent.filter(item => {
        const requiredTierLevel = tierHierarchy[item.minTierRequired || "free"] || 1;
        return userTierLevel >= requiredTierLevel;
      });
      
      res.json(filteredContent);
    } catch (error) {
      console.error("Error fetching exclusive content:", error);
      res.status(500).json({ error: "Failed to fetch exclusive content" });
    }
  });

  app.post("/api/exclusive-content", async (req, res) => {
    try {
      const { title, description, contentType, contentUrl, thumbnailUrl, releaseDate } = req.body;

      if (!title || !contentType || !contentUrl || !releaseDate) {
        return res.status(400).json({ error: "Required fields missing" });
      }

      const newContent = await db.insert(exclusiveContent).values({
        title,
        description,
        contentType,
        contentUrl,
        thumbnailUrl,
        releaseDate,
      }).returning();

      res.json({ message: "Exclusive content added", content: newContent[0] });
    } catch (error) {
      console.error("Error adding exclusive content:", error);
      res.status(500).json({ error: "Failed to add exclusive content" });
    }
  });

  // Album covers endpoints - authenticated users only
  app.get("/api/album-covers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Must be logged in to access album covers" });
      }

      const fs = await import('fs/promises');
      const path = await import('path');
      
      // List all album cover files from attached_assets
      const albumCoverDir = 'attached_assets';
      
      try {
        const files = await fs.readdir(albumCoverDir);
        const albumCovers = files.filter(file => {
          const lowerFile = file.toLowerCase();
          return (lowerFile.includes('album') || lowerFile.includes('cover')) && 
                 (lowerFile.endsWith('.jpg') || lowerFile.endsWith('.jpeg') || 
                  lowerFile.endsWith('.png') || lowerFile.endsWith('.webp'));
        });

        const albumCoverData = albumCovers.map(filename => ({
          filename,
          displayName: filename
            .replace(/_\d+\.(jpg|jpeg|png|webp)$/i, '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          downloadUrl: `/api/download-album-cover/${encodeURIComponent(filename)}`,
          previewUrl: `/attached_assets/${filename}`
        }));

        res.json(albumCoverData);
      } catch (error) {
        console.error("Error reading album covers directory:", error);
        res.status(500).json({ error: "Failed to load album covers" });
      }
    } catch (error) {
      console.error("Error fetching album covers:", error);
      res.status(500).json({ error: "Failed to fetch album covers" });
    }
  });

  app.get("/api/download-album-cover/:filename", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Must be logged in to download album covers" });
      }

      const { filename } = req.params;
      const fs = await import('fs/promises');
      const path = await import('path');

      // Security: prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: "Invalid filename" });
      }

      const filePath = path.join('attached_assets', filename);

      try {
        await fs.access(filePath);
        
        // Set download headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const fileStream = (await import('fs')).createReadStream(filePath);
        fileStream.pipe(res);
        
        console.log(`✅ Album cover downloaded: ${filename} by user ${req.session.userId}`);
      } catch (error) {
        console.error(`Album cover not found: ${filename}`);
        res.status(404).json({ error: "Album cover not found" });
      }
    } catch (error) {
      console.error("Error downloading album cover:", error);
      res.status(500).json({ error: "Failed to download album cover" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const newMessage = await db.insert(contactMessages).values({
        name,
        email,
        subject,
        message,
        createdAt: new Date().toISOString(),
      }).returning();

      try {
        await Promise.all([
          sendProductionInquiryNotification(name, email, subject, message),
          sendProductionInquiryConfirmation(name, email, subject)
        ]);
        console.log('✅ Production inquiry emails sent successfully');
      } catch (emailError) {
        console.error('⚠️  Contact message saved but emails failed:', emailError);
      }

      res.json({ message: "Message sent successfully", contactMessage: newMessage[0] });
    } catch (error) {
      console.error("Error saving contact message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/admin/contact-messages", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (user.length === 0 || user[0].email !== 'support@projectdnamusic.info') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const messages = await db
        .select()
        .from(contactMessages)
        .orderBy(sql`${contactMessages.createdAt} DESC`);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Failed to fetch contact messages" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (user.length === 0 || user[0].email !== 'support@projectdnamusic.info') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allOrders = await db
        .select()
        .from(orders)
        .orderBy(sql`${orders.createdAt} DESC`);

      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          
          return {
            ...order,
            items,
          };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/admin/recover-order", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (user.length === 0 || user[0].email !== 'support@projectdnamusic.info') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { customerEmail } = req.body;
      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email required" });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      console.log(`🔍 Recovering orders for: ${customerEmail}`);

      const paymentIntents = await stripe.paymentIntents.list({
        limit: 20,
      });

      const customerPayments = paymentIntents.data.filter(
        pi => pi.receipt_email === customerEmail && pi.status === 'succeeded'
      );

      if (customerPayments.length === 0) {
        return res.status(404).json({ error: "No successful payments found for this email" });
      }

      const recovered = [];

      for (const paymentIntent of customerPayments) {
        const existingOrder = await db
          .select()
          .from(orders)
          .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
          .limit(1);

        if (existingOrder.length > 0) {
          console.log(`⏭️  Order already exists: ${existingOrder[0].id}`);
          continue;
        }

        const sessionId = paymentIntent.metadata.sessionId || 'guest';
        const userId = paymentIntent.metadata.userId || null;
        const shippingAddressId = paymentIntent.metadata.shippingAddressId || null;

        const items = await db
          .select({
            id: cartItems.id,
            songId: cartItems.songId,
            merchId: cartItems.merchId,
            beatId: cartItems.beatId,
            itemType: cartItems.itemType,
            quantity: cartItems.quantity,
            size: cartItems.size,
            title: sql<string>`COALESCE(${songs.title}, ${merchandise.name}, ${beats.title})`.as('title'),
            price: sql<string>`COALESCE(${songs.price}, ${merchandise.price}, ${beats.price})`.as('price'),
            audioUrl: sql<string>`COALESCE(${songs.audioUrl}, ${beats.audioUrl})`.as('audioUrl'),
          })
          .from(cartItems)
          .leftJoin(songs, eq(cartItems.songId, songs.id))
          .leftJoin(merchandise, eq(cartItems.merchId, merchandise.id))
          .leftJoin(beats, eq(cartItems.beatId, beats.id))
          .where(eq(cartItems.sessionId, sessionId));

        if (items.length === 0) {
          console.log(`⚠️  No cart items found for session: ${sessionId}`);
          continue;
        }

        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        const hasMerch = items.some(item => item.itemType === 'merch');
        const shippingCost = hasMerch ? 5.99 : 0;
        const tax = subtotal * 0.08;
        const total = subtotal + shippingCost + tax;

        const [order] = await db.insert(orders).values({
          userId,
          sessionId,
          email: customerEmail,
          subtotal: subtotal.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          status: 'completed',
          stripePaymentIntentId: paymentIntent.id,
          shippingAddressId: shippingAddressId || null,
          createdAt: new Date(paymentIntent.created * 1000).toISOString(),
        }).returning();

        for (const item of items) {
          await db.insert(orderItems).values({
            orderId: order.id,
            songId: item.songId || null,
            merchId: item.merchId || null,
            beatId: item.beatId || null,
            itemType: item.itemType,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            size: item.size || null,
            audioUrl: item.audioUrl || null,
          });
        }

        try {
          await sendOrderConfirmationEmail(
            customerEmail,
            'Valued Customer',
            order.id,
            items.map(item => ({
              title: item.title,
              itemType: item.itemType,
              price: parseFloat(item.price),
              quantity: item.quantity,
              audioUrl: item.audioUrl,
              size: item.size,
            })),
            subtotal,
            tax,
            shippingCost,
            total
          );
          console.log(`✅ Email sent for order ${order.id}`);
        } catch (emailError) {
          console.error(`⚠️  Email failed for order ${order.id}:`, emailError);
        }

        await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));

        recovered.push({
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          amount: (paymentIntent.amount / 100).toFixed(2),
        });
      }

      res.json({ 
        message: `Recovered ${recovered.length} order(s)`,
        orders: recovered
      });
    } catch (error) {
      console.error("Error recovering orders:", error);
      res.status(500).json({ error: "Failed to recover orders" });
    }
  });

  app.post("/api/visitor-count", async (_req, res) => {
    try {
      const result = await db
        .insert(siteCounters)
        .values({ id: "visitors", count: 234053 })
        .onConflictDoUpdate({
          target: siteCounters.id,
          set: { count: sql`${siteCounters.count} + 1` },
        })
        .returning();
      res.json({ count: result[0].count });
    } catch (error) {
      console.error("Error updating visitor count:", error);
      res.status(500).json({ error: "Failed to update visitor count" });
    }
  });

  app.get("/api/visitor-count", async (_req, res) => {
    try {
      const result = await db.select().from(siteCounters).where(eq(siteCounters.id, "visitors"));
      const count = result.length > 0 ? result[0].count : 234052;
      res.json({ count });
    } catch (error) {
      console.error("Error getting visitor count:", error);
      res.status(500).json({ error: "Failed to get visitor count" });
    }
  });

  // NIG Command Center — Division Status Endpoint
  const { nigStatusHandler } = await import("./nig-status");
  app.get("/api/nig-status", nigStatusHandler);

  // Fan Pipeline (N1M Conversion System)
  const { registerFanAgentRoutes } = await import("./fanAgents");
  registerFanAgentRoutes(app);

  // ─── Fan Email Campaign System ───────────────────────────────────────────
  // In-memory campaign state (single active campaign at a time)
  const campaignState: {
    status: 'idle' | 'running' | 'done' | 'error';
    total: number; sent: number; failed: number; startedAt: string | null; finishedAt: string | null; lastError: string | null;
  } = { status: 'idle', total: 0, sent: 0, failed: 0, startedAt: null, finishedAt: null, lastError: null };

  function parseCsvContent(content: string): { name: string; email: string; location: string }[] {
    const lines = content.split('\n').filter(Boolean);
    const contacts: { name: string; email: string; location: string }[] = [];
    // Detect if first line is a header
    const startIdx = lines[0]?.toLowerCase().includes('@') ? 0 : 1;
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const firstComma = line.indexOf(',');
      const secondComma = line.indexOf(',', firstComma + 1);
      if (firstComma === -1 || secondComma === -1) continue;
      const name = line.substring(0, firstComma).trim();
      const email = line.substring(firstComma + 1, secondComma).trim().toLowerCase();
      const location = line.substring(secondComma + 1).trim();
      if (!email.includes('@')) continue;
      contacts.push({ name, email, location });
    }
    return contacts;
  }

  // Seed the fan_contacts table from the hardcoded list on first startup
  async function seedFanContactsIfEmpty() {
    try {
      const existing = await db.select({ id: fanContacts.id }).from(fanContacts).limit(1);
      if (existing.length > 0) return; // Already seeded
      console.log(`[Campaign] Seeding ${FAN_CONTACTS.length} fan contacts into database...`);
      const BATCH = 100;
      for (let i = 0; i < FAN_CONTACTS.length; i += BATCH) {
        const batch = FAN_CONTACTS.slice(i, i + BATCH).map(c => ({
          name: c.name,
          email: c.email,
          location: c.location,
          source: 'n1m',
        }));
        await db.insert(fanContacts).values(batch).onConflictDoNothing();
      }
      console.log(`[Campaign] Seeding complete.`);
    } catch (err) {
      console.error('[Campaign] Seed error:', err);
    }
  }
  seedFanContactsIfEmpty();

  // Get all contacts from DB (used for sending and status)
  async function getAllFanContacts() {
    return db.select({
      name: fanContacts.name,
      email: fanContacts.email,
      location: fanContacts.location,
    }).from(fanContacts).orderBy(asc(fanContacts.id));
  }

  // Get paginated contact list
  app.get("/api/admin/campaign/contacts", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ error: "Forbidden" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = ((req.query.search as string) || '').toLowerCase();

    let contacts = await getAllFanContacts();
    if (search) {
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.location.toLowerCase().includes(search)
      );
    }

    const total = contacts.length;
    const paginated = contacts.slice((page - 1) * limit, page * limit);
    res.json({ contacts: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  });

  // Upload new CSV — merges new contacts into the database permanently
  app.post("/api/admin/campaign/upload-csv", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ error: "Forbidden" });

    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') return res.status(400).json({ error: "No CSV content provided" });

    const parsed = parseCsvContent(csvContent);
    if (parsed.length === 0) return res.status(400).json({ error: "No valid contacts found in CSV" });

    // Upsert into DB — existing emails are skipped, new ones are added permanently
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < parsed.length; i += BATCH) {
      const batch = parsed.slice(i, i + BATCH).map(c => ({
        name: c.name,
        email: c.email,
        location: c.location,
        source: 'csv_upload',
      }));
      const result = await db.insert(fanContacts).values(batch).onConflictDoNothing();
      inserted += (result.rowCount ?? 0);
    }

    const totalNow = await db.select({ id: fanContacts.id }).from(fanContacts);
    res.json({
      message: `CSV uploaded — ${inserted} new contacts added, ${parsed.length - inserted} already existed.`,
      count: totalNow.length,
      added: inserted,
      skipped: parsed.length - inserted,
    });
  });

  function buildCampaignHtml(firstName: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05050f;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#7c3aed;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin:0 0 12px;">Shakim &amp; Project DNA</p>
      <div style="width:48px;height:2px;background:linear-gradient(90deg,#7c3aed,#06b6d4);margin:0 auto;"></div>
    </div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;">Hey ${firstName},</h1>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 16px;">
      First off… I just want to say <strong style="color:#ffffff;">thank you</strong>.
    </p>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 16px;">
      For real.
    </p>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 16px;">
      Out of all the music out there, you chose to tap in with me and rock with what I'm creating — and that means more than you probably know. You've been part of this journey already… and I don't take that lightly.
    </p>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 24px;">
      But now… we're stepping into something bigger.
    </p>
    <div style="background:linear-gradient(135deg,#7c3aed22,#06b6d422);border:1px solid #7c3aed44;border-radius:12px;padding:24px;margin:0 0 24px;">
      <p style="color:#ffffff;font-size:16px;line-height:1.7;margin:0 0 12px;">
        I've officially built out a new home for everything — music, exclusives, updates, and the full <strong>Shakim &amp; Project DNA</strong> experience.
      </p>
      <div style="text-align:center;margin:20px 0;">
        <a href="https://projectdnamusic.info" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.5px;">
          projectdnamusic.info
        </a>
      </div>
      <p style="color:#94a3b8;font-size:14px;text-align:center;margin:0;">This isn't just another website.</p>
    </div>
    <p style="color:#ffffff;font-size:16px;font-weight:600;margin:0 0 12px;">This is where:</p>
    <ul style="color:#94a3b8;font-size:16px;line-height:2;margin:0 0 24px;padding-left:20px;">
      <li>I drop <strong style="color:#ffffff;">exclusive music</strong> you won't hear anywhere else</li>
      <li>You get <strong style="color:#ffffff;">early access</strong> to new releases</li>
      <li>You become part of the real <strong style="color:#ffffff;">Project DNA movement</strong></li>
    </ul>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 24px;">
      I wanted you to be one of the <strong style="color:#ffffff;">FIRST</strong> to tap in because you've already been showing love from the beginning.
    </p>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 8px;">So when you get a moment…</p>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 16px;">Go check it out and take a second to:</p>
    <ul style="color:#94a3b8;font-size:16px;line-height:2;margin:0 0 24px;padding-left:20px;">
      <li>Listen to the featured tracks</li>
      <li>Join the list so I can send you exclusive drops directly</li>
      <li>Let me know what you think</li>
    </ul>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 16px;">
      We're building something real here… not just music, but a whole frequency shift.
    </p>
    <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 32px;">
      And I want you with me on this.
    </p>
    <div style="border-top:1px solid #1e293b;padding-top:24px;margin-top:24px;">
      <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0 0 4px;">Much love always,</p>
      <p style="color:#7c3aed;font-size:17px;font-weight:700;margin:0 0 4px;">Shawn "Shakim" Williams</p>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px;">Shakim &amp; Project DNA</p>
      <p style="color:#475569;font-size:13px;font-style:italic;margin:0;">
        P.S. The best music I'm dropping next won't be on N1M… it's going straight to the site 👀
      </p>
    </div>
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #0f172a;">
      <a href="https://projectdnamusic.info" style="color:#7c3aed;font-size:13px;text-decoration:none;">projectdnamusic.info</a>
      <p style="color:#334155;font-size:11px;margin:8px 0 0;">You're receiving this because you previously supported Shakim &amp; Project DNA. To unsubscribe, reply with "unsubscribe".</p>
    </div>
  </div>
</body>
</html>`;
  }

  app.get("/api/admin/campaign/status", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const contacts = await getAllFanContacts();
    res.json({ ...campaignState, contactCount: contacts.length });
  });

  app.post("/api/admin/campaign/send", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    if (campaignState.status === 'running') return res.status(409).json({ error: "Campaign already running" });

    const contacts = await getAllFanContacts();
    if (contacts.length === 0) return res.status(400).json({ error: "No contacts found" });

    // Get Resend client using the same working credentials as the rest of the app
    let resendClient: import('resend').Resend;
    let fromEmail = 'Shakim <noreply@projectdnamusic.info>';
    try {
      const { getResendClient } = await import('./email');
      const { client, fromEmail: fe } = await getResendClient();
      resendClient = client;
      if (fe) fromEmail = fe;
    } catch (err) {
      return res.status(500).json({ error: "Resend not configured — check Resend integration in Replit" });
    }

    // Start campaign async
    campaignState.status = 'running';
    campaignState.total = contacts.length;
    campaignState.sent = 0;
    campaignState.failed = 0;
    campaignState.startedAt = new Date().toISOString();
    campaignState.finishedAt = null;
    campaignState.lastError = null;

    res.json({ message: "Campaign started", total: contacts.length });

    // Run in background — batch 50 at a time with 1.5s between batches
    (async () => {
      const BATCH = 50;

      for (let i = 0; i < contacts.length; i += BATCH) {
        if (campaignState.status !== 'running') break;
        const batch = contacts.slice(i, i + BATCH);
        for (const contact of batch) {
          if (campaignState.status !== 'running') break;
          const firstName = contact.name.split(' ')[0] || contact.name;
          try {
            await resendClient.emails.send({
              from: fromEmail,
              to: contact.email,
              subject: "We stepped into something bigger — come check it out",
              html: buildCampaignHtml(firstName),
              replyTo: 'shakim@projectdnamusic.info',
            });
            campaignState.sent++;
          } catch (err: any) {
            campaignState.failed++;
            campaignState.lastError = err?.message || 'Unknown error';
          }
          // Small delay between individual emails to respect rate limits
          await new Promise(r => setTimeout(r, 120));
        }
        // Delay between batches
        if (i + BATCH < contacts.length) await new Promise(r => setTimeout(r, 2000));
      }

      campaignState.status = 'done';
      campaignState.finishedAt = new Date().toISOString();
    })().catch(err => {
      campaignState.status = 'error';
      campaignState.lastError = err?.message || 'Campaign failed';
      campaignState.finishedAt = new Date().toISOString();
    });
  });

  app.post("/api/admin/campaign/cancel", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    if (campaignState.status === 'running') {
      campaignState.status = 'done';
      campaignState.finishedAt = new Date().toISOString();
    }
    res.json({ message: "Stopped" });
  });

  registerAIAgentRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
