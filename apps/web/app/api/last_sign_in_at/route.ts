export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import sgMail from '@sendgrid/mail';

// --- SendGrid setup ---
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Optional: simple cron auth – set CRON_SECRET in your env and send as `x-cron-key` header
function assertCronAuth(req: Request) {
  const required = process.env.CRON_SECRET;
  if (!required) return; // if not configured, allow (no-op)
  const got = req.headers.get('x-cron-key');
  if (got !== required) {
    throw new Error('Unauthorized: invalid or missing x-cron-key');
  }
}

// Compute yesterday [00:00, 24:00) in JST, then convert to UTC ISO for DB filtering
function getJstYesterdayBounds() {
  // now in JST by offset (+09:00)
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth();
  const d = nowJst.getUTCDate();
  // start of *today* in JST
  const startTodayJst = new Date(Date.UTC(y, m, d, 0, 0, 0));
  // start of *yesterday* in JST
  const startYdayJst = new Date(startTodayJst.getTime() - 24 * 60 * 60 * 1000);
  // Convert JST-midnight boundaries back to UTC by subtracting 9h
  const startYdayUtc = new Date(startYdayJst.getTime() - 9 * 60 * 60 * 1000);
  const endYdayUtc = new Date(startTodayJst.getTime() - 9 * 60 * 60 * 1000);

  // Label for subject (YYYY-MM-DD in JST for yesterday)
  const yyyy = startYdayJst.getUTCFullYear();
  const mm = String(startYdayJst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(startYdayJst.getUTCDate()).padStart(2, '0');
  const label = `${yyyy}-${mm}-${dd}`;

  return {
    startUtcIso: startYdayUtc.toISOString(),
    endUtcIso: endYdayUtc.toISOString(),
    jstLabelDate: label,
  } as const;
}

function toJstString(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  const jst = new Date(dt.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jst.getUTCDate()).padStart(2, '0');
  const hh = String(jst.getUTCHours()).padStart(2, '0');
  const mi = String(jst.getUTCMinutes()).padStart(2, '0');
  const ss = String(jst.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} JST`;
}

export async function GET(req: Request) {
  try {
    assertCronAuth(req);

    // Allow overriding the target day via query: ?force_date=YYYY-MM-DD (JST)
    const url = new URL(req.url);
    const forceDate = url.searchParams.get('force_date');
    let startUtcIso: string;
    let endUtcIso: string;
    let jstLabelDate: string;

    if (forceDate) {
      // Compute [00:00, 24:00) for the specified JST date, then convert to UTC
      const [yStr, mStr, dStr] = forceDate.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const d = parseInt(dStr, 10);
      // midnight JST for the day and the next day (expressed as UTC with +0, then shift -9h later)
      const startJst = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      const endJst = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
      const startUtc = new Date(startJst.getTime() - 9 * 60 * 60 * 1000);
      const endUtc = new Date(endJst.getTime() - 9 * 60 * 60 * 1000);
      startUtcIso = startUtc.toISOString();
      endUtcIso = endUtc.toISOString();
      jstLabelDate = forceDate;
    } else {
      const b = getJstYesterdayBounds();
      startUtcIso = b.startUtcIso;
      endUtcIso = b.endUtcIso;
      jstLabelDate = b.jstLabelDate;
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      // Use service role so we can read last_sign_in_at reliably from server
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // NOTE: We only *refer* to student_profiles.last_sign_in_at as requested.
    // Select a few commonly present fields; if some do not exist, keep null-safe rendering below.
    // Using columns per schema: id, full_name (text), phone (text), last_sign_in_at (timestamptz)
    const { data, error } = await supabase
      .from('student_profiles')
      .select('id, full_name, phone, last_sign_in_at')
      .gte('last_sign_in_at', startUtcIso)
      .lt('last_sign_in_at', endUtcIso)
      .order('last_sign_in_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = data ?? [];

    const studentIds = Array.from(new Set(rows.map((r: any) => r.id).filter(Boolean)));

    // NOTE: Email source moved to the view `student_with_email` (student_id, email)
    let emailByStudentId = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: rowsEmail, error: emailErr } = await supabase
        .from('student_with_email')
        .select('student_id, email')
        .in('student_id', studentIds);
      if (emailErr) {
        console.error('student_with_email fetch error:', emailErr);
      } else if (rowsEmail) {
        for (const r of rowsEmail as any[]) {
          if (r.student_id) emailByStudentId.set(r.student_id, r.email || '');
        }
      }
    }

    // Build email body
    const count = rows.length;
    const header = `昨日（${jstLabelDate}）にログインがあった学生アカウント一覧`;

    const linesText = rows.map((r: any) => {
      const name = r.full_name || '';
      const phone = r.phone || '';
      const email = emailByStudentId.get(r.id) || '';
      return `名前:${name}  メール:${email}  電話:${phone}`.trim();
    });

    const rowsHtml = rows
      .map((r: any) => {
        const name = r.full_name || '';
        const phone = r.phone || '';
        const email = emailByStudentId.get(r.id) || '';
        return `
          <tr>
            <td style="padding:4px 8px;">${name}</td>
            <td style="padding:4px 8px;">${email}</td>
            <td style="padding:4px 8px;">${phone}</td>
          </tr>`;
      })
      .join('');

    const text = `${header}\n件数: ${count}\n\n${linesText.join('\n')}`;
    const html = `
      <div>
        <p>${header}</p>
        <p>件数: <strong>${count}</strong></p>
        <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:4px 8px;">名前</th>
              <th style="padding:4px 8px;">メール</th>
              <th style="padding:4px 8px;">電話番号</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    try {
      const [resSys] = await sgMail.send({
        to: 'system@gakuten.co.jp',
        from: process.env.FROM_EMAIL!,
        subject: `【学生転職】昨日ログイン一覧 ${jstLabelDate}`,
        text,
        html,
      });
      console.log('SendGrid system status:', resSys.statusCode);
    } catch (err: any) {
      console.error('SendGrid send error:', err);
      return NextResponse.json({ ok: false, error: 'sendgrid_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    console.error(e);
    const message = e?.message || 'internal_error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
