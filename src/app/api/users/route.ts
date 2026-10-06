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
    .select("id, name, email, role, brand, initials, password_hash")
    .order("role")
    .order("brand")
    .order("name");

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (rows || []).map((u: any) => {
    const isBcrypt =
      u.password_hash?.startsWith("$2a$") ||
      u.password_hash?.startsWith("$2b$") ||
      u.password_hash?.startsWith("$2y$");
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      brand: u.brand,
      initials: u.initials,
      password: isBcrypt ? "" : u.password_hash || "",
      password_hash: u.password_hash,
    };
  });

  return NextResponse.json({ users });
}
