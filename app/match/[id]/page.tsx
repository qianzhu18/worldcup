import { MATCHES, TEAMS, matchById, teamByCode, headToHead, flag } from "@/lib/worldcup";
import { groupStageAnalysis, matchProbabilities, scoreMatrix } from "@/lib/model";
import { playersByTeam, playerPhoto } from "@/lib/players";
import { ProbBar, Flag, SectionTitle, Stat } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { safeMatch } from "@/lib/ai";
import { getWorldCupMarkets } from "@/lib/polymarket";
import { formMarks, getTeamInsight } from "@/lib/team-insights";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function MatchPage({ params }: { params: { id: string } }) {
  const m = matchById(params.id);
  if (!m) return notFound();
  const markets = await getWorldCupMarkets();
  const winner = markets.find((market) => market.slug?.includes("winner")) ?? markets[0];
  const codeByName = new Map(TEAMS.map((team) => [team.name, team.code]));
  const marketByCode = new Map<string, number>();
  if (winner) {
    for (const outcome of winner.outcomes) {
      const code = codeByName.get(outcome.label);
      if (code) marketByCode.set(code, outcome.price);
    }
  }
  const h = teamByCode(m.home)!;
  const a = teamByCode(m.away)!;
  const base = matchProbabilities(m.home, m.away);
  const analysis = groupStageAnalysis(m.home, m.away, marketByCode);
  const p = analysis.adjusted;
  const scores = scoreMatrix(m.home, m.away);
  const h2h = headToHead(m.home, m.away);
  const ai = await safeMatch(m.home, m.away);
  const hInsight = getTeamInsight(h.code);
  const aInsight = getTeamInsight(a.code);

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 pitch-stripes p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-electric/10 via-transparent to-flame/10" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-300">
            <span className="chip bg-white/10">小组赛 {m.group}组</span>
            <span>·</span>
            <Countdown to={m.kickoff} />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <TeamSide team={h} align="right" />
            <div className="text-center">
              <div className="heading text-4xl gold-text">VS</div>
              <div className="mt-2 text-xs text-slate-400">{m.venue}</div>
              <div className="text-xs text-slate-500">{m.city}</div>
            </div>
            <TeamSide team={a} align="left" />
          </div>
          <div className="mx-auto mt-6 max-w-lg">
            <div className="mb-1 text-center text-xs uppercase tracking-widest text-slate-400">
              AI 调整胜率预测
            </div>
            <ProbBar home={p.home} draw={p.draw} away={p.away} labels={[h.zh, "平局", a.zh]} />
          </div>
        </div>
      </section>

      <section className="zen-panel rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-emerald-400/15 pb-3">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.26em] text-emerald-300">ai market brief</div>
            <h2 className="mt-1 text-2xl font-black text-white">AI 胜率 / 公平赔率 / Polymarket 对比</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              本场仅分析小组赛胜平负。Polymarket 当前对比项来自世界杯冠军盘，用于衡量双方在市场里的整体热度和低估/高估，不等同于本场单场赔率。
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            confidence {(analysis.confidence * 100).toFixed(0)}%
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-xl border border-white/10 bg-[#07121b]/80 p-4">
            <div className="mb-3 text-sm font-bold text-white">模型变化</div>
            <CompareRow label={h.zh} base={base.home} adjusted={p.home} odds={analysis.fairOdds.home} />
            <CompareRow label="平局" base={base.draw} adjusted={p.draw} odds={analysis.fairOdds.draw} />
            <CompareRow label={a.zh} base={base.away} adjusted={p.away} odds={analysis.fairOdds.away} />
          </div>

          <div className="rounded-xl border border-white/10 bg-[#07121b]/80 p-4">
            <div className="mb-3 text-sm font-bold text-white">重点说明内容</div>
            <div className="space-y-2">
              {analysis.readout.map((line) => (
                <p key={line} className="text-xs leading-relaxed text-slate-300">
                  <span className="mr-2 text-emerald-300">▸</span>{line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <CoachAndForm team={h} insight={hInsight} />
        <CoachAndForm team={a} insight={aInsight} />
      </div>

      {/* AI analysis card */}
      {ai && (
        <section className="card relative overflow-hidden p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-electric/10 to-transparent" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="heading text-2xl text-white">
                🤖 AI 战术分析
                <span className="ml-2 text-xs font-normal text-electric">powered by MiniMax</span>
              </h3>
              <span className="chip bg-electric/20 text-electric">
                把握度 {(ai.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {ai.summary && <p className="mb-3 text-sm text-slate-200">{ai.summary}</p>}
            <div className="mb-1 text-center text-xs uppercase tracking-widest text-slate-400">
              AI 独立胜率（对市场盲测）
            </div>
            <ProbBar home={ai.home} draw={ai.draw} away={ai.away} labels={[h.zh, "平局", a.zh]} />
            {ai.factors.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {ai.factors.map((f, i) => (
                  <div key={i} className="rounded-xl bg-white/5 p-3 text-xs text-slate-200">
                    <span className="mr-1 font-bold text-gold-300">{i + 1}</span>
                    {f}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              对比上方模型胜率，可看出 AI 与量化模型的分歧。仅供参考，非投资建议。
            </p>
          </div>
        </section>
      )}

      {/* score predictions + form */}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <SectionTitle sub="泊松模型最可能比分">⚽ 比分预测</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {scores.map((s, i) => (
              <div key={i} className="card flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Flag code={h.code} className="h-5 w-7" />
                  <span className="heading text-2xl text-white">
                    {s.h} - {s.a}
                  </span>
                  <Flag code={a.code} className="h-5 w-7" />
                </div>
                <span className="font-semibold text-gold-300">
                  {(s.p * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="FIFA排名" value={`#${h.fifaRank}`} />
            <Stat label="实力评分(Elo)" value={String(Math.max(h.elo, a.elo))} accent />
            <Stat label="FIFA排名" value={`#${a.fifaRank}`} />
          </div>
        </section>

        <section>
          <SectionTitle sub="近期交锋记录（示例）">📊 历史交锋 H2H</SectionTitle>
          <div className="card divide-y divide-white/5">
            {h2h.map((g, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">{g.date}</span>
                <span className="heading text-xl text-white">{g.score}</span>
                <span className="text-xs text-slate-500">{g.comp}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* squads */}
      <section>
        <SectionTitle sub="点击球员查看详细数据、打法与评分">🌟 双方核心球员</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          {[h, a].map((t) => {
            const ps = playersByTeam(t.code);
            return (
              <div key={t.code} className="card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Flag code={t.code} className="h-6 w-9" />
                  <span className="font-semibold text-white">{t.zh}</span>
                </div>
                {ps.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">球员数据待接入</p>
                ) : (
                  <div className="space-y-2">
                    {ps.map((pl) => (
                      <Link
                        key={pl.id}
                        href={`/player/${pl.id}`}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={playerPhoto(pl)}
                          alt={pl.name}
                          className="h-10 w-10 rounded-full bg-pitch-700 object-cover"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{pl.zh}</div>
                          <div className="text-xs text-slate-400">
                            {pl.position} · #{pl.number}
                          </div>
                        </div>
                        <span className="rounded-lg bg-gold-400/15 px-2 py-1 text-sm font-bold text-gold-300">
                          {pl.rating.toFixed(1)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="text-center">
        <Link href="/timeline" className="text-sm text-slate-400 hover:text-gold-300">
          ← 返回时间线
        </Link>
      </div>
    </div>
  );
}

function TeamSide({ team, align }: { team: ReturnType<typeof teamByCode>; align: "left" | "right" }) {
  if (!team) return null;
  return (
    <Link
      href={`/team/${team.code}`}
      className={`flex flex-col items-center gap-2 ${align === "right" ? "md:items-end" : "md:items-start"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flag(team.code)} alt={team.name} className="h-16 w-24 rounded-lg object-cover shadow-card" />
      <div className="text-center">
        <div className="heading text-2xl text-white">{team.zh}</div>
        <div className="text-xs text-slate-400">{team.name}</div>
      </div>
    </Link>
  );
}

function CompareRow({ label, base, adjusted, odds }: { label: string; base: number; adjusted: number; odds: number }) {
  const delta = adjusted - base;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="mono text-emerald-300">{(adjusted * 100).toFixed(1)}% · fair {odds.toFixed(2)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
        <div className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${adjusted * 100}%` }} />
      </div>
      <div className={`mono mt-1 text-[10px] ${delta >= 0 ? "text-emerald-300" : "text-violet-200"}`}>
        vs base {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}pt
      </div>
    </div>
  );
}

function CoachAndForm({
  team,
  insight,
}: {
  team: NonNullable<ReturnType<typeof teamByCode>>;
  insight: ReturnType<typeof getTeamInsight>;
}) {
  const coach = insight.coach;
  const winRate = coach.matches ? coach.wins / coach.matches : 0;
  return (
    <section className="zen-panel rounded-xl p-4">
      <div className="mb-4 flex items-center gap-3 border-b border-emerald-400/15 pb-3">
        <Flag code={team.code} className="h-7 w-10" />
        <div>
          <div className="text-lg font-black text-white">{team.zh}</div>
          <div className="text-xs text-slate-500">coach and recent form</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="text-sm font-bold text-white">{coach.name}</div>
          <div className="mt-1 text-xs text-slate-400">上任 {coach.appointed} · {coach.previous.slice(0, 2).join(" / ")}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {coach.honors.slice(0, 2).map((honor) => (
              <span key={honor} className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-0.5 text-[10px] text-emerald-200">
                {honor}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <MiniStat label="win rate" value={`${(winRate * 100).toFixed(0)}%`} />
          <MiniStat label="record" value={`${coach.wins}-${coach.draws}-${coach.losses}`} />
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">{insight.recent.period}战绩</span>
          <span className="mono text-xs text-emerald-300">
            {insight.recent.wins}W {insight.recent.draws}D {insight.recent.losses}L · {insight.recent.goalsFor}:{insight.recent.goalsAgainst}
          </span>
        </div>
        <div className="mb-3 flex gap-1.5">
          {formMarks(team.code).map((mark, index) => (
            <span key={`${mark}-${index}`} className={`grid h-6 w-6 place-items-center rounded text-[10px] font-black ${mark === "W" ? "bg-emerald-400/20 text-emerald-300" : mark === "D" ? "bg-cyan-300/15 text-cyan-200" : "bg-violet-300/15 text-violet-200"}`}>
              {mark}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          {insight.recent.matches.map((match) => (
            <div key={`${team.code}-${match.date}-${match.opponent}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>{match.date} · {match.opponent}</span>
              <span className="mono text-slate-200">{match.result} {match.score}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2">
      <div className="mono text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mono text-sm font-bold text-emerald-300">{value}</div>
    </div>
  );
}
