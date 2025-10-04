// app/api/billing/checkout/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Initialise the Firebase Admin SDK only once per process.
 */
function initAdmin() {
  if (admin.apps.length === 0) {
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

export async function POST(req: NextRequest) {
  // 30 requests per 60 seconds
  const rl = await checkRateLimit(req as any, 'generic_post', 30, 60);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', resetAt: rl.resetAt }),
      { status: 429 }
    );
  }

  try {
    const adminSDK = initAdmin();

    // Parse body
    const { priceId }: { priceId?: string } = await req.json();

    // Verify Firebase ID token from Authorization header
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization Bearer <idToken>' }),
        { status: 401 }
      );
    }

    const decoded = await adminSDK.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // Fetch or create Stripe customer for this user
    const userRef = adminSDK.firestore().collection('users').doc(uid);
    const snap = await userRef.get();
    const userData = snap.exists ? snap.data()! : {};
    let customerId = userData.stripeCustomerId as string | undefined;

    // ✅ Use the latest dashboard version; cast so TypeScript doesn't complain
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    if (!customerId) {
      const email = decoded.email || undefined;
      const customer = await stripe.customers.create({
        email,
        metadata: { uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Create a Checkout Session for a subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId || process.env.STRIPE_PRICE_PREMIUM!,
          quantity: 1,
        },
      ],
      success_url: process.env.NEXT_PUBLIC_SITE_URL + '/account?upgraded=1',
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + '/account',
      customer: customerId,
      client_reference_id: uid,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
