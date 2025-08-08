import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // support form POST (from /ipo/upgrade) and JSON
  let next = '/ipo';
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    next = (form.get('next') as string) || next;
  } else if (contentType.includes('application/json')) {
    try {
      const body = await req.json();
      if (typeof body?.next === 'string') next = body.next;
    } catch (_) {}
  }

  const origin = req.headers.get('origin') || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) return NextResponse.json({ error: 'missing_price_id' }, { status: 500 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price,
        quantity: 1,
      },
    ],
    // optional, helps prefill email
    customer_email: user.email || undefined,
    success_url: `${origin}${next}?checkout=success`,
    cancel_url: `${origin}/ipo/upgrade?canceled=1`,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  // redirect so the HTML form "just works"
  return NextResponse.redirect(session.url!, { status: 303 });
}
