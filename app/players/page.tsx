import { PLAYERS, playerPhoto } from "@/lib/players";
import { teamByCode, flag } from "@/lib/worldcup";
import Link from "next/link";

const ATTR_LABELS = ["速", "射", "传", "盘", "防", "体"];

export default function PlayersPage() {
  const ranked = [...PLAYERS].sort((a, b) => b.rating - a.rating);
  const leader = ranked[0];
  const avgRating = ranked.reduce((sum, player) => sum + player.rating, 0) / ranked.length;
  const totalGoals = ranked.reduce((sum, player) => sum + player.stats.goals, 0);
  const roleCounts = ranked.reduce<Record<string, number>>((acc, player) => {
    acc[player.position] = (acc[player.position] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="zen-panel relative overflow-hidden rounded-2xl p-5 md:p-6">
        <div className="zen-scanline" aria-hidden />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">player scanner</div>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-white md:text-4xl">
              球员 <span className="zen-text">Form Matrix</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              以综合评分为主序，叠加国家、位置、俱乐部、技术标签和六维能力，把球星列表改成可扫描的数据矩阵。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ConsoleStat label="球员池" value={String(ranked.length)} />
            <ConsoleStat label="均分" value={avgRating.toFixed(1)} />
            <ConsoleStat label="进球" value={String(totalGoals)} accent />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="zen-panel h-fit rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between border-b border-emerald-400/15 pb-3">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.24em] text-slate-500">top signal</div>
              <div className="mt-1 text-lg font-black text-white">最高状态节点</div>
            </div>
            <span className="live-dot h-2 w-2 rounded-full bg-emerald-300" />
          </div>

          {leader && (
            <Link href={`/player/${leader.id}`} className="group block rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 transition hover:bg-emerald-400/[0.1]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={playerPhoto(leader)} alt={leader.name} className="h-20 w-20 rounded-2xl bg-[#0b1322] object-cover ring-2 ring-emerald-400/25" />
                  <span className="mono absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-[#07121b] text-sm font-black text-emerald-300">
                    {leader.rating.toFixed(1)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TeamFlag code={leader.team} />
                    <span className="text-xs text-slate-400">{teamByCode(leader.team)?.zh}</span>
                  </div>
                  <div className="mt-1 truncate text-2xl font-black text-white group-hover:text-emerald-200">{leader.zh}</div>
                  <div className="text-xs text-slate-500">
                    {leader.position} · #{leader.number} · {leader.club}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SmallStat label="goals" value={String(leader.stats.goals)} />
                <SmallStat label="assists" value={String(leader.stats.assists)} />
                <SmallStat label="xg" value={leader.stats.xg.toFixed(1)} />
              </div>
            </Link>
          )}

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-3 mono text-[10px] uppercase tracking-[0.22em] text-slate-500">position mix</div>
            <div className="grid grid-cols-4 gap-2">
              {["FW", "MF", "DF", "GK"].map((role) => (
                <div key={role} className="rounded-lg border border-white/10 bg-[#07121b]/70 px-2 py-2 text-center">
                  <div className="mono text-xs font-bold text-emerald-300">{role}</div>
                  <div className="mono text-sm font-black text-white">{roleCounts[role] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-3 xl:grid-cols-2">
          {ranked.map((player, index) => {
            const team = teamByCode(player.team)!;
            const primaryAttr = Math.max(...player.attrs);
            return (
              <Link
                key={player.id}
                href={`/player/${player.id}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#07121b]/82 p-4 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.08]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={playerPhoto(player)} alt={player.name} className="h-20 w-20 rounded-2xl bg-[#0b1322] object-cover ring-1 ring-white/10" />
                    <span className="mono absolute -left-1 -top-1 rounded-md border border-emerald-400/25 bg-[#0b1322] px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flag(team.code)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
                      <span className="text-xs text-slate-400">{team.zh}</span>
                      <span className="rounded border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                        {player.position}
                      </span>
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black text-white group-hover:text-emerald-200">{player.zh}</h3>
                        <div className="truncate text-xs text-slate-500">
                          {player.name} · #{player.number} · {player.club}
                        </div>
                      </div>
                      <div className="mono text-right">
                        <div className="zen-text text-2xl font-black">{player.rating.toFixed(1)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">rating</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {player.styleTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-0.5 text-[10px] text-emerald-200/90">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>能力向量</span>
                    <span>peak {primaryAttr}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {player.attrs.map((attr, attrIndex) => (
                      <div key={ATTR_LABELS[attrIndex]}>
                        <div className="h-14 overflow-hidden rounded bg-white/10">
                          <div
                            className="mt-auto h-full rounded bg-gradient-to-t from-emerald-400 to-cyan-300"
                            style={{ transform: `translateY(${100 - attr}%)` }}
                          />
                        </div>
                        <div className="mt-1 text-center text-[10px] text-slate-500">{ATTR_LABELS[attrIndex]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function TeamFlag({ code }: { code: string }) {
  const team = teamByCode(code);
  if (!team) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flag(team.code)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
  );
}

function ConsoleStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mono mt-1 text-xl font-black ${accent ? "zen-text" : "text-white"}`}>{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07121b]/70 px-2 py-2">
      <div className="mono text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mono text-sm font-bold text-emerald-300">{value}</div>
    </div>
  );
}
