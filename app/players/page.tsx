import type { ReactNode } from "react";
import { PLAYERS, playerPhoto } from "@/lib/players";
import { teamByCode, flag } from "@/lib/worldcup";
import { modelChampionFor } from "@/lib/model";
import Link from "next/link";

export const revalidate = 3600;

const ATTR_LABELS = ["速", "射", "传", "盘", "防", "体"];
const PAGE_SIZE = 18;
const STAR_PRIOR: Record<string, number> = {
  "Kylian Mbappé": 14,
  "Lamine Yamal": 12,
  "Lionel Messi": 11,
  "Jude Bellingham": 10,
  "Erling Haaland": 10,
  "Vinícius Júnior": 9,
  "Vinicius Junior": 9,
  "Cristiano Ronaldo": 8,
  Rodri: 8,
  "Harry Kane": 8,
  "Bukayo Saka": 7,
  "Florian Wirtz": 7,
  "Jamal Musiala": 7,
  Pedri: 7,
  Raphinha: 7,
  "Mohamed Salah": 7,
  "Christian Pulisic": 6,
};

type PositionFilter = "ALL" | "FW" | "MF" | "DF" | "GK";
type PlayersSearchParams = {
  page?: string | string[];
  pos?: string | string[];
};
type RankedPlayer = (typeof PLAYERS)[number] & { watchScore: number };

const POSITION_OPTIONS: Array<{ value: PositionFilter; label: string; short: string }> = [
  { value: "ALL", label: "全部位置", short: "ALL" },
  { value: "FW", label: "前锋", short: "FW" },
  { value: "MF", label: "中场", short: "MF" },
  { value: "DF", label: "后卫", short: "DF" },
  { value: "GK", label: "门将", short: "GK" },
];

export default async function PlayersPage({ searchParams }: { searchParams?: Promise<PlayersSearchParams> }) {
  const params = (await searchParams) ?? {};
  const position = parsePosition(readParam(params.pos));
  const allRanked = [...PLAYERS]
    .map((player) => ({ ...player, watchScore: playerWatchScore(player) }))
    .sort((a, b) => b.watchScore - a.watchScore || b.rating - a.rating);
  const filtered = position === "ALL" ? allRanked : allRanked.filter((player) => player.position === position);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = clampPage(readParam(params.page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const ranked = filtered.slice(start, start + PAGE_SIZE);
  const leader = filtered[0] ?? allRanked[0];
  const avgRating = filtered.length ? filtered.reduce((sum, player) => sum + player.rating, 0) / filtered.length : 0;
  const totalGoals = filtered.reduce((sum, player) => sum + player.stats.goals, 0);
  const roleCounts = filtered.reduce<Record<string, number>>((acc, player) => {
    acc[player.position] = (acc[player.position] ?? 0) + 1;
    return acc;
  }, {});
  const visibleStart = filtered.length ? start + 1 : 0;
  const visibleEnd = start + ranked.length;
  const rangeLabel = `${visibleStart}-${visibleEnd} / ${filtered.length}`;

  return (
    <div className="space-y-6">
      <section className="zen-panel relative overflow-hidden rounded-2xl p-5 md:p-6">
        <div className="zen-scanline" aria-hidden />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_460px] lg:items-end">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">player scanner</div>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-white md:text-4xl">
              球员 <span className="zen-text">Watchlist Rank</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              按 JMWL 看好指数排序，分页浏览完整球员池；中文名来自人工校正和 Wikidata，照片优先真实头像，未命中时使用本地生成头像兜底。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ConsoleStat label="球员池" value={String(filtered.length)} />
            <ConsoleStat label="本页" value={rangeLabel} />
            <ConsoleStat label="页码" value={`${currentPage}/${totalPages}`} accent />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <section className="zen-panel rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between border-b border-emerald-400/15 pb-3">
              <div>
                <div className="mono text-[10px] uppercase tracking-[0.24em] text-slate-500">top signal</div>
                <div className="mt-1 text-lg font-black text-white">最被看好球员</div>
              </div>
              <span className="live-dot h-2 w-2 rounded-full bg-emerald-300" />
            </div>

            {leader && (
              <Link href={`/player/${leader.id}`} className="group block rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 transition hover:bg-emerald-400/[0.1]">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={playerPhoto(leader)}
                      alt={leader.zh}
                      className="h-20 w-20 rounded-full bg-[#0b1322] object-cover object-top ring-2 ring-emerald-400/25"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      referrerPolicy="no-referrer"
                    />
                    <span className="mono absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-[#07121b] text-sm font-black text-emerald-300">
                      {leader.watchScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TeamFlag code={leader.team} />
                      <span className="text-xs text-slate-400">{teamByCode(leader.team)?.zh}</span>
                    </div>
                    <div className="mt-1 truncate text-2xl font-black text-white group-hover:text-emerald-200">{leader.zh}</div>
                    <div className="truncate text-xs text-slate-500">
                      {leader.name} · {leader.position} · #{leader.number}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <SmallStat label="rating" value={leader.rating.toFixed(1)} />
                  <SmallStat label="team prob" value={`${(modelChampionFor(leader.team) * 100).toFixed(1)}%`} />
                  <SmallStat label="watch" value={leader.watchScore.toFixed(0)} />
                </div>
              </Link>
            )}
          </section>

          <section className="zen-panel rounded-xl p-4">
            <div className="mb-3 mono text-[10px] uppercase tracking-[0.22em] text-slate-500">position filter</div>
            <div className="grid grid-cols-2 gap-2">
              {POSITION_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={playersHref(1, option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    option.value === position
                      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200"
                      : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-emerald-400/25 hover:bg-emerald-400/[0.08]"
                  }`}
                >
                  <span className="mono mr-2 text-[11px] text-emerald-300/80">{option.short}</span>
                  {option.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="zen-panel rounded-xl p-4">
            <div className="mb-3 mono text-[10px] uppercase tracking-[0.22em] text-slate-500">position mix</div>
            <div className="grid grid-cols-4 gap-2">
              {["FW", "MF", "DF", "GK"].map((role) => (
                <div key={role} className="rounded-lg border border-white/10 bg-[#07121b]/70 px-2 py-2 text-center">
                  <div className="mono text-xs font-bold text-emerald-300">{role}</div>
                  <div className="mono text-sm font-black text-white">{roleCounts[role] ?? 0}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SmallStat label="avg rating" value={avgRating.toFixed(1)} />
              <SmallStat label="goals" value={String(totalGoals)} />
            </div>
          </section>
        </aside>

        <section className="space-y-3">
          <div className="zen-panel flex flex-col gap-3 rounded-xl p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.22em] text-slate-500">current page</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {position === "ALL" ? "全部球员" : POSITION_OPTIONS.find((option) => option.value === position)?.label} · {rangeLabel}
              </div>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} position={position} rangeLabel={rangeLabel} />
          </div>

          {ranked.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {ranked.map((player, index) => (
                <PlayerCard key={player.id} player={player} rank={start + index + 1} eager={index < 4} />
              ))}
            </div>
          ) : (
            <div className="zen-panel rounded-xl p-8 text-center text-sm text-slate-400">当前筛选下暂无球员。</div>
          )}

          <div className="zen-panel rounded-xl p-3">
            <Pagination currentPage={currentPage} totalPages={totalPages} position={position} rangeLabel={rangeLabel} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PlayerCard({ player, rank, eager }: { player: RankedPlayer; rank: number; eager: boolean }) {
  const team = teamByCode(player.team)!;
  return (
    <Link
      href={`/player/${player.id}`}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#07121b]/82 p-4 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.08]"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={playerPhoto(player)}
            alt={player.zh}
            className="h-20 w-20 rounded-full bg-[#0b1322] object-cover object-top ring-1 ring-white/10"
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "auto"}
            referrerPolicy="no-referrer"
          />
          <span className="mono absolute -left-1 -top-1 rounded-md border border-emerald-400/25 bg-[#0b1322] px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
            #{String(rank).padStart(2, "0")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flag(team.code)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" loading="lazy" decoding="async" />
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
            <div className="mono shrink-0 text-right">
              <div className="zen-text text-2xl font-black">{player.watchScore.toFixed(0)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">watch</div>
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

      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {player.attrs.map((attr, attrIndex) => (
          <div key={ATTR_LABELS[attrIndex]} className="rounded-md border border-white/5 bg-white/[0.03] px-1 py-1.5 text-center">
            <div className="mono text-xs font-black text-emerald-300">{attr}</div>
            <div className="text-[9px] text-slate-500">{ATTR_LABELS[attrIndex]}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
  position,
  rangeLabel,
}: {
  currentPage: number;
  totalPages: number;
  position: PositionFilter;
  rangeLabel: string;
}) {
  const pages = pageWindow(currentPage, totalPages);
  return (
    <nav aria-label="球员分页" className="flex flex-wrap items-center gap-1.5">
      <span className="mono mr-1 text-[11px] text-slate-500">{rangeLabel}</span>
      <PageLink href={playersHref(currentPage - 1, position)} disabled={currentPage <= 1} title="上一页">
        ‹
      </PageLink>
      {pages.map((item, index) =>
        item === "dots" ? (
          <span key={`dots-${index}`} className="mono px-1 text-xs text-slate-600">...</span>
        ) : (
          <PageLink key={item} href={playersHref(item, position)} active={item === currentPage} title={`第 ${item} 页`}>
            {item}
          </PageLink>
        ),
      )}
      <PageLink href={playersHref(currentPage + 1, position)} disabled={currentPage >= totalPages} title="下一页">
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  title,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  title: string;
}) {
  const className = `mono grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-xs font-black transition ${
    active
      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
      : disabled
        ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-700"
        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-white"
  }`;
  if (disabled) {
    return (
      <span className={className} title={title} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} title={title} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function pageWindow(currentPage: number, totalPages: number): Array<number | "dots"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const set = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const numbers = [...set].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "dots"> = [];
  numbers.forEach((page, index) => {
    if (index > 0 && page - numbers[index - 1] > 1) out.push("dots");
    out.push(page);
  });
  return out;
}

function playersHref(page: number, position: PositionFilter): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (position !== "ALL") params.set("pos", position);
  const query = params.toString();
  return query ? `/players?${query}` : "/players";
}

function parsePosition(value?: string): PositionFilter {
  return value === "FW" || value === "MF" || value === "DF" || value === "GK" ? value : "ALL";
}

function clampPage(value: string | undefined, totalPages: number): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), totalPages);
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function playerWatchScore(player: (typeof PLAYERS)[number]): number {
  const teamProb = modelChampionFor(player.team);
  const peak = Math.max(...player.attrs);
  const roleBonus = player.position === "FW" ? 5 : player.position === "MF" ? 3 : player.position === "GK" ? 1 : 0;
  const youthUpside = player.age <= 23 ? 2 : player.age >= 34 ? -1.5 : 0;
  const clubSignal = /Madrid|Barcelona|Bayern|Manchester|Liverpool|Arsenal|Chelsea|Paris|Milan|Inter|Juventus|Napoli|Dortmund|PSG/i.test(player.club) ? 2 : 0;
  const starPrior = STAR_PRIOR[player.name] ?? 0;
  return player.rating * 8 + teamProb * 120 + (peak - 80) * 0.35 + roleBonus + youthUpside + clubSignal + starPrior;
}

function TeamFlag({ code }: { code: string }) {
  const team = teamByCode(code);
  if (!team) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flag(team.code)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" loading="lazy" decoding="async" />
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
