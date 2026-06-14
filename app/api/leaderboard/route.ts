import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "points";
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  if (type === "accuracy") {
    const { data } = await supabase
      .from("leaderboard_accuracy")
      .select("*")
      .gte("settled_count", 3)
      .order("accuracy", { ascending: false })
      .order("win_count", { ascending: false })
      .limit(limit);

    return NextResponse.json({ leaderboard: data ?? [], type: "accuracy" });
  }

  // 默认：积分排行
  const { data } = await supabase
    .from("leaderboard_points")
    .select("*")
    .order("balance", { ascending: false })
    .limit(limit);

  return NextResponse.json({ leaderboard: data ?? [], type: "points" });
}
