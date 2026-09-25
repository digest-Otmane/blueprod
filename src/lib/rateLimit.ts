import { getSupabaseAdmin } from "./supabase";

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function isRateLimited(ip: string): Promise<boolean> {
  const now = Date.now();
  const supabase = getSupabaseAdmin();

  try {
    // Delete expired rate limits automatically to prevent storage growth
    await supabase
      .from("login_rate_limits")
      .delete()
      .lt("first_attempt_at", now - LOGIN_WINDOW_MS);

    const { data: entry, error } = await supabase
      .from("login_rate_limits")
      .select("attempts, first_attempt_at")
      .eq("ip", ip)
      .maybeSingle();

    if (error || !entry) return false;

    if (now - Number(entry.first_attempt_at) > LOGIN_WINDOW_MS) {
      await supabase.from("login_rate_limits").delete().eq("ip", ip);
      return false;
    }

    return Number(entry.attempts) >= LOGIN_MAX_ATTEMPTS;
  } catch (error) {
    console.error("Rate limit check error:", error);
    return false; // Fail open if DB rate limit table is momentarily unavailable
  }
}

export async function registerFailure(ip: string): Promise<void> {
  const now = Date.now();
  const supabase = getSupabaseAdmin();

  try {
    const { data: entry } = await supabase
      .from("login_rate_limits")
      .select("attempts, first_attempt_at")
      .eq("ip", ip)
      .maybeSingle();

    if (!entry || now - Number(entry.first_attempt_at) > LOGIN_WINDOW_MS) {
      // Create new or reset window
      await supabase
        .from("login_rate_limits")
        .upsert(
          {
            ip,
            attempts: 1,
            first_attempt_at: now,
            last_attempt_at: now,
          },
          { onConflict: "ip" }
        );
    } else {
      // Increment attempt count within current window
      await supabase
        .from("login_rate_limits")
        .update({
          attempts: Number(entry.attempts) + 1,
          last_attempt_at: now,
        })
        .eq("ip", ip);
    }
  } catch (error) {
    console.error("Rate limit register error:", error);
  }
}

export async function clearFailures(ip: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  try {
    await supabase.from("login_rate_limits").delete().eq("ip", ip);
  } catch (error) {
    console.error("Rate limit clear error:", error);
  }
}

