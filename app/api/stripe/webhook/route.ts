import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getDb } from '@/lib/db';
import type { ServerStore } from '@/lib/db/store';
import type { StripeSubscriptionStatus } from '@/lib/types';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json({ error: 'No signature found' }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error: any) {
      console.error(`❌ Webhook signature verification failed: ${error.message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${error.message}` },
        { status: 400 }
      );
    }

    console.log(`🎯 Processing webhook event: ${event.type}`);
    await handleStripeEvent(getDb().server, event);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('💥 Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function handleStripeEvent(db: ServerStore, event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData || !('customer' in stripeData)) {
    console.log('⏭️ Skipping event - no customer data');
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`❌ Invalid customer ID in event: ${JSON.stringify(event)}`);
    return;
  }

  console.log(`👤 Processing event for customer: ${customerId}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(db, event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncCustomerFromStripe(db, (event.data.object as Stripe.Subscription).customer as string);
      break;

    case 'invoice.payment_succeeded':
      await syncCustomerFromStripe(db, (event.data.object as Stripe.Invoice).customer as string);
      break;

    case 'invoice.payment_failed':
      await syncCustomerFromStripe(db, (event.data.object as Stripe.Invoice).customer as string);
      break;

    default:
      console.log(`⏭️ Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(db: ServerStore, session: Stripe.Checkout.Session) {
  console.log(`💳 Checkout session completed: ${session.id}`);

  const { customer: customerId, mode, payment_status } = session;

  if (!customerId || typeof customerId !== 'string') {
    console.error('❌ No customer ID in checkout session');
    return;
  }

  if (mode === 'subscription') {
    console.log('🔄 Subscription checkout completed, syncing customer data...');
    await syncCustomerFromStripe(db, customerId);
  } else if (mode === 'payment' && payment_status === 'paid') {
    console.log('💰 One-time payment completed');

    const { id: checkout_session_id, payment_intent, amount_subtotal, amount_total, currency } = session;

    try {
      await db.createStripeOrder({
        checkout_session_id,
        payment_intent_id: payment_intent as string,
        customer_id: customerId,
        amount_subtotal: amount_subtotal || 0,
        amount_total: amount_total || 0,
        currency: currency || 'usd',
        payment_status: payment_status || 'paid',
      });
      console.log('✅ Order saved successfully');
    } catch (error) {
      console.error('❌ Error saving order:', error);
    }
  }
}

async function syncCustomerFromStripe(db: ServerStore, customerId: string) {
  try {
    console.log(`🔄 Syncing customer data for: ${customerId}`);

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    console.log(`📊 Found ${subscriptions.data.length} subscriptions for customer ${customerId}`);

    if (subscriptions.data.length === 0) {
      console.log(`❌ No subscriptions found for customer: ${customerId}`);
      await db.upsertStripeSubscription(customerId, { status: 'not_started' });
      await updateUserSubscriptionStatus(db, customerId, 'free');
      return;
    }

    const subscription = subscriptions.data[0];
    console.log(`📋 Processing subscription ${subscription.id} with status: ${subscription.status}`);

    const subscriptionData = {
      subscription_id: subscription.id,
      price_id: subscription.items.data[0].price.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status as StripeSubscriptionStatus,
      payment_method_brand:
        subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? subscription.default_payment_method.card?.brand ?? null
          : undefined,
      payment_method_last4:
        subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? subscription.default_payment_method.card?.last4 ?? null
          : undefined,
    };

    await db.upsertStripeSubscription(customerId, subscriptionData);
    console.log(`✅ Successfully synced subscription for customer: ${customerId}`);

    const userSubscriptionStatus = subscription.status === 'active' ? 'pro' : 'free';
    await updateUserSubscriptionStatus(db, customerId, userSubscriptionStatus);
  } catch (error) {
    console.error(`❌ Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function updateUserSubscriptionStatus(
  db: ServerStore,
  customerId: string,
  status: 'free' | 'pro'
) {
  console.log(`👤 Updating user subscription status to: ${status} for customer: ${customerId}`);

  const userId = await db.findStripeCustomerUserId(customerId);
  if (!userId) {
    console.error(`❌ Failed to find user for customer ${customerId}`);
    throw new Error(`Failed to find user for customer ${customerId}`);
  }

  await db.setSubscriptionStatus(userId, status);
  console.log(`✅ Successfully updated user ${userId} subscription status to: ${status}`);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    },
  });
}
