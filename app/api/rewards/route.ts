import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/rewards - 获取可兑换商品列表
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("is_active", true)
    .order("point_cost", { ascending: true });

  return NextResponse.json({ rewards: rewards ?? [] });
}

// POST /api/rewards - 兑换商品
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rewardId = body?.rewardId;
  const contactInfo = body?.contactInfo ?? {};

  if (!rewardId) {
    return NextResponse.json({ error: "Missing rewardId" }, { status: 400 });
  }

  // 获取商品信息
  const { data: reward } = await supabase
    .from("rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("is_active", true)
    .single();

  if (!reward) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  if (reward.remaining_stock <= 0) {
    return NextResponse.json({ error: "Out of stock" }, { status: 400 });
  }

  // 获取用户积分
  const { data: points } = await supabase
    .from("user_points")
    .select("balance, rank_title")
    .eq("user_id", user.id)
    .single();

  if (!points || points.balance < reward.point_cost) {
    return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
  }

  // 检查段位要求
  const rankOrder = ["rookie", "silver", "gold", "diamond", "legend"];
  const userRankIdx = rankOrder.indexOf(points.rank_title);
  const requiredRankIdx = rankOrder.indexOf(reward.min_rank);

  if (userRankIdx < requiredRankIdx) {
    return NextResponse.json({ error: "Rank too low" }, { status: 400 });
  }

  // 执行兑换
  const newBalance = points.balance - reward.point_cost;

  // 扣积分
  await supabase
    .from("user_points")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // 减库存
  await supabase
    .from("rewards")
    .update({ remaining_stock: reward.remaining_stock - 1 })
    .eq("id", rewardId);

  // 记录兑换
  const { data: redemption } = await supabase
    .from("redemptions")
    .insert({
      user_id: user.id,
      reward_id: rewardId,
      point_cost: reward.point_cost,
      contact_info: contactInfo,
    })
    .select()
    .single();

  // 记录流水
  await supabase.from("point_transactions").insert({
    user_id: user.id,
    amount: -reward.point_cost,
    balance_after: newBalance,
    tx_type: "redeem_spend",
    reference_id: redemption?.id,
    description: `兑换: ${reward.name}`,
  });

  return NextResponse.json({
    success: true,
    redemption,
    newBalance,
  });
}
