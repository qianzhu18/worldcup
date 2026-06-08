import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MATCHES, matchById, teamByCode } from "@/lib/worldcup";

export const dynamic = "force-dynamic";

const SELECTION_LABELS: Record<string, string> = {
  home: "主胜",
  draw: "平局",
  away: "客胜",
};

export default async function PredictionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: predictions } = await supabase
    .from("user_predictions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = predictions ?? [];
  const nextMatches = MATCHES.filter((m) => m.home && m.away && new Date(m.kickoff) > new Date()).slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading text-3xl text-white">我的预测</h1>
        <p className="mt-2 text-slate-400">你的胜平负竞猜记录会保存在 Supabase 云端。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="提交数" value={String(rows.length)} accent />
        <MiniStat label="待结算" value={String(rows.filter((r) => r.status === "pending").length)} />
        <MiniStat label="总积分" value={String(rows.reduce((sum, row) => sum + Number(row.points ?? 0), 0))} />
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold text-white">预测记录</h2>
        </div>
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">还没有提交预测。下面挑一场开始。</div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((row) => {
              const match = matchById(row.target_id);
              const home = match?.home ? teamByCode(match.home)?.zh : undefined;
              const away = match?.away ? teamByCode(match.away)?.zh : undefined;
              return (
                <Link key={row.id} href={`/match/${row.target_id}`} className="block px-5 py-4 transition hover:bg-white/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">
                        {home && away ? `${home} vs ${away}` : row.target_id}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        信心 {row.confidence ?? 1}/5 · {new Date(row.created_at).toLocaleString("zh-CN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-300">{SELECTION_LABELS[row.selection] ?? row.selection}</div>
                      <div className="text-xs text-slate-500">{row.status}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">可预测比赛</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {nextMatches.map((m) => {
            const home = m.home ? teamByCode(m.home)?.zh : m.homeLabel;
            const away = m.away ? teamByCode(m.away)?.zh : m.awayLabel;
            return (
              <Link key={m.id} href={`/match/${m.id}`} className="card p-4 transition hover:border-emerald-400/30">
                <div className="text-sm font-bold text-white">{home} vs {away}</div>
                <div className="mt-1 text-xs text-slate-500">{new Date(m.kickoff).toLocaleString("zh-CN")} · {m.city}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
