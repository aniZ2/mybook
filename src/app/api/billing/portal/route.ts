import Stripe from 'stripe';
import admin from 'firebase-admin';

function initAdmin() {
  if (admin.apps.length === 0) {
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

export async function POST(req: Request) {
  try {
    const adminSDK = initAdmin();

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

    const userSnap = await adminSDK.firestore().collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const customerId = userData?.stripeCustomerId;
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'stripeCustomerId not found on users/{uid}' }),
        { status: 400 }
      );
    }

    // ✅ Use the newest API version string but cast to `any`
    // so TypeScript doesn't reject it if the stripe npm types
    // haven't been updated yet.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_PORTAL_RETURN_URL!,
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
