import type { SupabaseClient } from "@supabase/supabase-js";

// Monthly video allowance per plan. A "video" = one full AI analysis of an
// uploaded match. Beyond the monthly allowance, users spend top-up credits.
export const PLAN_LIMITS = { free: 1, premium: 5, ultra: 15 } as const;
export const PLAN_LABEL = { free: "Free", premium: "Premium", ultra: "Ultra" } as const;
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB hard cap per upload

export type Plan = keyof typeof PLAN_LIMITS;

export interface PlanState {
  plan: Plan;
  credits: number;
  videosUsed: number;
  limit: number; // monthly allowance for the plan
  remaining: number; // monthly remaining + credits
}

const FREE_DEFAULT: PlanState = {
  plan: "free",
  credits: 0,
  videosUsed: 0,
  limit: PLAN_LIMITS.free,
  remaining: PLAN_LIMITS.free,
};

const ULTRA_DEFAULT: PlanState = {
  plan: "ultra",
  credits: 0,
  videosUsed: 0,
  limit: PLAN_LIMITS.ultra,
  remaining: PLAN_LIMITS.ultra,
};

// TESTING: while billing/payments aren't live, treat signed-in accounts as Ultra
// so testing isn't capped at the Free 1-video/month limit. Set to false (or run
// supabase/profiles.sql so real per-user plans apply) before launch.
const TESTING_FORCE_ULTRA = true;
const FALLBACK: PlanState = TESTING_FORCE_ULTRA ? ULTRA_DEFAULT : FREE_DEFAULT;

// Reads the signed-in user's plan/usage. Fails OPEN (returns a usable Free
// state) if the profiles table isn't there yet or anything errors, so billing
// rollout never blocks uploads before the schema/payments are wired.
export async function getPlanState(supabase: SupabaseClient): Promise<PlanState> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return FREE_DEFAULT;
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, credits, videos_used, period_start")
      .eq("id", user.id)
      .single();
    if (error || !data) return FALLBACK;

    // If the billing period rolled over, monthly usage reads as 0.
    const periodStart = new Date(data.period_start);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const used = periodStart < monthAgo ? 0 : data.videos_used || 0;

    const plan: Plan = (data.plan in PLAN_LIMITS ? data.plan : "free") as Plan;
    const limit = PLAN_LIMITS[plan];
    const credits = data.credits || 0;
    return { plan, credits, videosUsed: used, limit, remaining: Math.max(0, limit - used) + credits };
  } catch {
    return FALLBACK;
  }
}

// Atomically spends one video (monthly allowance first, then a credit) via a
// SECURITY DEFINER RPC. Fails OPEN if the RPC isn't deployed yet.
export async function consumeVideo(supabase: SupabaseClient): Promise<"ok" | "denied"> {
  try {
    const { data, error } = await supabase.rpc("consume_video");
    if (error) return "ok";
    return data === "ok" ? "ok" : "denied";
  } catch {
    return "ok";
  }
}
