import Stripe from 'stripe';
import { db } from '../db/index.js';
import { orders, orderItems, cartItems, songs, merchandise, beats } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { sendOrderConfirmationEmail } from './email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY || '', {
  apiVersion: '2024-10-28.acacia',
});

async function recoverOrder(customerEmail: string) {
  console.log(`🔍 Searching for recent payments for: ${customerEmail}`);

  // Get recent payment intents for this customer
  const paymentIntents = await stripe.paymentIntents.list({
    limit: 10,
  });

  // Find payments for this email
  const customerPayments = paymentIntents.data.filter(
    pi => pi.receipt_email === customerEmail && pi.status === 'succeeded'
  );

  if (customerPayments.length === 0) {
    console.log('❌ No successful payments found for this email');
    return;
  }

  console.log(`✅ Found ${customerPayments.length} payment(s)`);

  for (const paymentIntent of customerPayments) {
    console.log(`\n💳 Payment Intent: ${paymentIntent.id}`);
    console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
    console.log(`   Created: ${new Date(paymentIntent.created * 1000).toLocaleString()}`);
    console.log(`   Status: ${paymentIntent.status}`);

    // Check if order already exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
      .limit(1);

    if (existingOrder.length > 0) {
      console.log(`   ⏭️  Order already exists (ID: ${existingOrder[0].id})`);
      continue;
    }

    console.log(`   🔨 Creating order...`);

    const sessionId = paymentIntent.metadata.sessionId || 'guest';
    const userId = paymentIntent.metadata.userId || null;
    const shippingAddressId = paymentIntent.metadata.shippingAddressId || null;

    // Get cart items for this session
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
      console.log(`   ⚠️  No cart items found for session: ${sessionId}`);
      console.log(`   💡 This might be a guest checkout or cart was already cleared`);
      continue;
    }

    console.log(`   📦 Found ${items.length} items in cart`);

    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    const hasMerch = items.some(item => item.itemType === 'merch');
    const shippingCost = hasMerch ? 5.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shippingCost + tax;

    // Create order
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

    console.log(`   ✅ Order created: ${order.id}`);

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

    console.log(`   ✅ Order items created`);

    // Send confirmation email
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
      console.log(`   ✅ Confirmation email sent to ${customerEmail}`);
    } catch (emailError) {
      console.error(`   ⚠️  Email failed:`, emailError);
    }

    // Clear cart
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
    console.log(`   ✅ Cart cleared`);

    console.log(`\n🎉 Order recovery complete!`);
  }
}

// Run recovery
const email = process.argv[2];
if (!email) {
  console.error('Usage: tsx server/recover-order.ts <email>');
  process.exit(1);
}

recoverOrder(email)
  .then(() => {
    console.log('\n✨ Recovery process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recovery failed:', error);
    process.exit(1);
  });
