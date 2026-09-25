import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const startTime = Date.now();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) throw error;

    const pingMs = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      database: "connected (supabase postgresql)",
      latencyMs: pingMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Health check database failure:", error);
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: error.message || "Database connection failure",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
