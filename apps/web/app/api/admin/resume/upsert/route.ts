// app/api/admin/(protected)/resume/upsert/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // service-role でクライアント生成（RLS を無視できる）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error, data } = await supabase
      .from("resumes")
      .upsert(
        {
          id: payload.resumeId ?? undefined,
          user_id: payload.userId,
          form_data: payload.formData,
          work_experiences: payload.workExperiences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: payload.resumeId ? "id" : "user_id" }
      )
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}