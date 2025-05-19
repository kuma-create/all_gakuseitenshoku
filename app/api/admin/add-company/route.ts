import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function POST(req: Request) {
　console.log("SRK=", process.env.SUPABASE_SERVICE_KEY?.slice(0, 8) || "undefined");
  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "invalid param" }, { status: 400 });
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || ""
  );

  if (!process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_KEY is missing in environment variables" },
      { status: 500 }
    );
  }

  try {
    /* 1) 招待メール */
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
        data: { full_name: name },
      }
    );
    if (error || !data.user) throw error;

    const uid = data.user.id;

    /* 2) user_roles */
    const { error: err2 } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "company" });
    if (err2) throw err2;

    /* 3) companies */
    const { error: err3 } = await supabaseAdmin.from("companies").insert({
      user_id: uid,
      name,
      status: "承認待ち",
    });
    if (err3) throw err3;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? String(e) },
      { status: 500 }
    );
  }
}