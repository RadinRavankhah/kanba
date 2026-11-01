import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { price_id, success_url, cancel_url, mode } = await request.json();

    if (!price_id || !success_url || !cancel_url || !mode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!['payment', 'subscription'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "payment" or "subscription"' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.replace('Bearer ', ''));
    if (!payload) {
      return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 401 });
    }

    const db = getDb().server;
    console.log(`🚀 Creating checkout session for user: ${payload.userId}`);

    const existingCustomer = await db.findStripeCustomerByUserId(payload.userId);
    let customerId: string;

    if (!existingCustomer) {
      console.log(`👤 Creating new Stripe customer for user: ${payload.userId}`);

      const profile = await db.findUserById(payload.userId);
      const newCustomer = await stripe.customers.create({
        email: profile?.email || payload.email,
        metadata: { userId: payload.userId },
      });

      console.log(`✅ Created Stripe customer: ${newCustomer.id}`);

      try {
        await db.createStripeCustomer(payload.userId, newCustomer.id);
      } catch (error) {
        console.error('Failed to save customer mapping:', error);
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up Stripe customer:', deleteError);
        }
        return NextResponse.json({ error: 'Failed to create customer mapping' }, { status: 500 });
      }

      if (mode === 'subscription') {
        await db.ensureStripeSubscription(newCustomer.id);
      }

      customerId = newCustomer.id;
    } else {
      customerId = existingCustomer.customer_id;
      console.log(`👤 Using existing Stripe customer: ${customerId}`);

      if (mode === 'subscription') {
        await db.ensureStripeSubscription(customerId);
      }
    }

    console.log(`💳 Creating checkout session for customer: ${customerId}`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: mode as 'payment' | 'subscription',
      success_url,
      cancel_url,
      metadata: { userId: payload.userId },
    });

    console.log(`✅ Created checkout session: ${session.id}`);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('💥 Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
