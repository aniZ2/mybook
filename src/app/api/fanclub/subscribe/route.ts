import Stripe from 'stripe';
import admin from 'firebase-admin';

function initAdmin(){
  if (admin.apps.length === 0){
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

export async function POST(req: Request){
  const adminSDK = initAdmin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil' as any, // cast if your installed Stripe SDK types don't yet include it
});


  // Optional: map to current user
  const auth = (req.headers.get('authorization') || '').toString();
  let uid: string | null = null;
  if (auth.startsWith('Bearer ')){
    try { uid = (await adminSDK.auth().verifyIdToken(auth.slice(7))).uid; } catch {}
  }

  const price = process.env.STRIPE_PRICE_PREMIUM!;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: process.env.NEXT_PUBLIC_SITE_URL + '/authors',
    cancel_url: process.env.NEXT_PUBLIC_SITE_URL + '/authors',
    client_reference_id: uid || undefined
  });
  return new Response(JSON.stringify({ url: session.url }), { headers: { 'content-type':'application/json' } });
}
