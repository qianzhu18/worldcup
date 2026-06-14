import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/points - 获取用户积分信息
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: points } = await supabase
    .from("user_points")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", user.id);

  return NextResponse.json({
    points: points ?? { balance: 0, total_earned: 0, current_streak: 0, rank_title: "rookie" },
    transactions: transactions ?? [],
    achievements: achievements ?? [],
  });
}

// POST /api/points - 每日领取积分
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("claim_daily_points", {
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to claim points" }, { status: 500 });
  }

  return NextResponse.json(data);
}
