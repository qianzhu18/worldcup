import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RANK_LABELS: Record<string, string> = {
  rookie: "新秀",
  silver: "白银",
  gold: "黄金",
  diamond: "钻石",
  legend: "传奇",
};

const RANK_COLORS: Record<string, string> = {
  rookie: "text-slate-400",
  silver: "text-gray-300",
  gold: "text-yellow-400",
  diamond: "text-cyan-300",
  legend: "text-purple-400",
};

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: pointsBoard } = await supabase
    .from("leaderboard_points")
    .select("*")
    .order("balance", { ascending: false })
    .limit(50);

  const { data: accuracyBoard } = await supabase
    .from("leaderboard_accuracy")
    .select("*")
    .gte("settled_count", 3)
    .order("accuracy", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading text-3xl text-white">排行榜</h1>
        <p className="mt-2 text-slate-400">看看谁是世界杯最强预言家</p>
      </div>

      {/* 积分排行 */}
      <section className="card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold text-white">积分排行</h2>
        </div>
        <div className="divide-y divide-white/5">
          {(pointsBoard ?? []).map((row, i) => (
            <div key={row.user_id} className="flex items-center gap-4 px-5 py-3">
              <div className={`w-8 text-center text-lg font-black ${i < 3 ? "text-emerald-300" : "text-slate-500"}`}>
                {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{row.name || "匿名玩家"}</div>
                <div className={`text-xs ${RANK_COLORS[row.rank_title]}`}>
                  {RANK_LABELS[row.rank_title] ?? row.rank_title}
                  {row.current_streak > 1 && ` · 🔥${row.current_streak}天`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-300">{row.balance.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">积分</div>
              </div>
            </div>
          ))}
          {(!pointsBoard || pointsBoard.length === 0) && (
            <div className="p-6 text-center text-sm text-slate-500">暂无数据</div>
          )}
        </div>
      </section>

      {/* 准确率排行 */}
      <section className="card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold text-white">准确率排行</h2>
          <p className="text-xs text-slate-500 mt-1">需至少 3 场结算数据</p>
        </div>
        <div className="divide-y divide-white/5">
          {(accuracyBoard ?? []).map((row, i) => (
            <div key={row.user_id} className="flex items-center gap-4 px-5 py-3">
              <div className={`w-8 text-center text-lg font-black ${i < 3 ? "text-emerald-300" : "text-slate-500"}`}>
                {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{row.name || "匿名玩家"}</div>
                <div className="text-xs text-slate-500">
                  {row.win_count}胜 / {row.settled_count}场
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-300">{row.accuracy}%</div>
                <div className="text-[10px] text-slate-500">准确率</div>
              </div>
            </div>
          ))}
          {(!accuracyBoard || accuracyBoard.length === 0) && (
            <div className="p-6 text-center text-sm text-slate-500">暂无足够数据</div>
          )}
        </div>
      </section>
    </div>
  );
}
