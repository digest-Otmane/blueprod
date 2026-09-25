import { NextRequest, NextResponse } from "next/server";
import { createSupabaseContext } from "@supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Initialize Supabase context using @supabase/server.
    // Auth mode ['user', 'none'] will verify user JWT session if present in headers,
    // or allow anonymous access for a general connection health check.
    const { data: ctx, error: authError } = await createSupabaseContext(request, {
      auth: ["user", "none"],
    });

    if (authError) {
      return NextResponse.json(
        {
          ok: false,
          database: "disconnected",
          message: "Supabase authentication context error",
          error: authError.message || authError,
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Ping Supabase using the admin client to verify server credentials and database/service health
    const { error: adminCheckError } = await ctx.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (adminCheckError) {
      return NextResponse.json(
        {
          ok: false,
          database: "disconnected",
          message: "Failed to connect to Supabase database/service",
          error: adminCheckError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      message: "Supabase database is connected properly.",
      database: {
        status: "connected",
        latencyMs,
        url: process.env.SUPABASE_URL || "configured",
      },
      auth: {
        authenticated: Boolean(ctx.userClaims),
        mode: ctx.authMode,
        user: ctx.userClaims || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Supabase test-db error:", error);
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        message: "Supabase connection check failed.",
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
