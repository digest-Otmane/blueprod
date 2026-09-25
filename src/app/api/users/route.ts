import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Réservé à l'administrateur.");

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("users")
    .select("id, name, role, brand, initials")
    .neq("role", "admin")
    .order("role")
    .order("brand")
    .order("name");

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: rows || [] });
}
