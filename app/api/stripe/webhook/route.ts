// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const buf = await req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata.user_id; // Checkout作成時に user_id を metadata に載せる
      const plan = sub.status === 'active' ? 'premium' : 'free';

// 例: app/api/stripe/webhook/route.ts の一部
    await supabase
    .from('student_profiles')
    .update({
        plan: sub.status === 'active' ? 'premium' : 'free',
        sub_status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', userId);

      break;
    }
  }
  return NextResponse.json({ ok: true });
}