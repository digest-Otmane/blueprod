import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("lead_messages")
    .select("id, lead_id, from_side, text, created_at")
    .eq("lead_id", params.id)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching lead messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: (rows || []).map((r) => ({
      id: r.id,
      lead_id: r.lead_id,
      from: r.from_side,
      text: r.text,
      created_at: r.created_at,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  const from_side = body.from_side || "moi";

  if (!text) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      lead_id: params.id,
      from_side,
      text,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error inserting lead message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
