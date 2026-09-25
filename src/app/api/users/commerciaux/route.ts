import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("users")
    .select("id, name, brand")
    .eq("role", "commercial");

  if (brand && ["lv", "lvt"].includes(brand)) {
    query = query.eq("brand", brand);
  }

  query = query.order("name");

  const { data: rows, error } = await query;
  if (error) {
    console.error("Error fetching commerciaux:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commerciaux: rows || [] });
}
