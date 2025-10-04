import { NextRequest } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil' as any, // cast if your installed Stripe SDK types don't yet include it
});
  const sig = req.headers.get('stripe-signature')!;
  const buf = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  // Handle events (checkout.session.completed etc.)
  return new Response('ok');
}
