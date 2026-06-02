import { getWorldCupMarkets, divergenceSignals, crossPlatformSpread } from "@/lib/polymarket";
import { MarketCard } from "@/components/MarketCard";
import { SectionTitle, Flag } from "@/components/ui";
import { modelChampionFor, championProbabilities } from "@/lib/model";
import { TEAMS } from "@/lib/worldcup";
import { safeChampion } from "@/lib/ai";
import { ScannerConsole } from "@/components/ScannerConsole";
import Link from "next/link";

export const revalidate = 120;

export default async function Home() {
  const markets = await getWorldCupMarkets();
  const winner = markets.find((m) => m.slug?.includes("winner")) ?? markets[0];

  // Value radar: model champion prob vs Polymarket implied prob.
  const nameToCode = new Map(TEAMS.map((t) => [t.name, t.code]));
  const signals = winner
    ? divergenceSignals(winner, (name) => {
        const code = nameToCode.get(name);
        return code ? modelChampionFor(code) : 0;
      }).slice(0, 6)
    : [];

  const totalVol = markets.reduce((s, m) => s + m.volume, 0);
  const spreadRows = winner ? crossPlatformSpread(winner).slice(0, 6) : [];

  // AI (MiniMax) independent champion pricing vs Polymarket implied prob.
  const aiChamp = await safeChampion();
  const marketByCode = new Map<string, number>();
  if (winner)
    for (const o of winner.outcomes) {
      const code = nameToCode.get(o.label);
      if (code) marketByCode.set(code, o.price);
    }
  const aiRows = aiChamp
    .filter((a) => marketByCode.has(a.code))
    .map((a) => ({ ...a, market: marketByCode.get(a.code)!, edge: a.prob - marketByCode.get(a.code)! }))
    .sort((x, y) => Math.abs(y.edge) - Math.abs(x.edge))
    .slice(0, 6);

  return (
    <div className="space-y-12">
      <ScannerConsole
        marketsCount={markets.length}
        totalVolume={totalVol}
        teamsCount={TEAMS.length}
        topSignals={signals}
      />

      {/* ---------- AI PRICING vs MARKET ---------- */}
      {aiRows.length > 0 ? (
        <section id="ai">
          <SectionTitle sub="MiniMax 独立给出夺冠概率（对市场盲测），再与 Polymarket 实时隐含概率对照，找出 AI 眼中的错价">
            <span className="zen-text">AI 定价</span> vs 市场
            <span className="ml-2 align-middle text-xs font-normal text-electric">powered by MiniMax</span>
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {aiRows.map((a) => {
              const under = a.edge > 0;
              return (
                <div key={a.code} className="card p-4">
                  <div className="flex items-center gap-3">
                    <Flag code={a.code} className="h-7 w-10" />
                    <div className="flex-1">
                      <div className="font-semibold text-white">{a.name}</div>
                      <div className="text-xs text-slate-400">
                        市场 {(a.market * 100).toFixed(1)}% · AI {(a.prob * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className={`text-right ${under ? "text-electric" : "text-flame"}`}>
                      <div className="heading text-2xl">
                        {under ? "▲" : "▼"} {Math.abs(a.edge * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wide">
                        {under ? "AI:被低估" : "AI:被高估"}
                      </div>
                    </div>
                  </div>
                  {a.factors.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
                      {a.factors.map((f, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-slate-300">
                          <span className="text-gold-300">·</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            * AI 概率为 MiniMax 独立估计，未参考市场赔率；仅供参考，非投资建议。
          </p>
        </section>
      ) : (
        signals.length > 0 && (
          <section>
            <SectionTitle sub="模型胜率 vs 市场隐含概率，差值越大越可能错杀 / 高估">
              <span className="zen-text">价值雷达</span> · Model vs Market
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {signals.map((s) => {
                const code = nameToCode.get(s.label);
                const under = s.edge > 0;
                return (
                  <div key={s.label} className="card flex items-center gap-3 p-4">
                    {code && <Flag code={code} className="h-7 w-10" />}
                    <div className="flex-1">
                      <div className="font-semibold text-white">{s.label}</div>
                      <div className="text-xs text-slate-400">
                        市场 {(s.market * 100).toFixed(1)}% · 模型 {(s.model * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className={`text-right ${under ? "text-electric" : "text-flame"}`}>
                      <div className="heading text-2xl">
                        {under ? "▲" : "▼"} {Math.abs(s.edge * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wide">
                        {under ? "低估·可关注" : "高估·谨慎"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )
      )}

      {/* ---------- HEAT BOARD ---------- */}
      <section id="heat">
        <SectionTitle sub="按热度（24h成交·总量·流动性·临场）排序，点击跳转原平台下注">
          热度排行榜
        </SectionTitle>
        {markets.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            暂时无法从 Polymarket 拉取盘口，请稍后刷新。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {markets.map((m, i) => (
              <MarketCard key={m.id} market={m} rank={i + 1} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- CROSS-PLATFORM SPREAD ---------- */}
      {spreadRows.length > 0 && (
        <section>
          <SectionTitle sub="同一选项在各平台的报价差，价差越大套利空间越大。Polymarket 为实时真实价，币安 / OKX 为示例（接入中）">
            跨平台价差雷达
          </SectionTitle>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr] gap-2 border-b border-white/10 px-4 py-2.5 text-xs uppercase tracking-wide text-slate-400">
              <span>选项</span>
              <span className="text-right text-violet-300">Polymarket</span>
              <span className="text-right text-yellow-300">Binance*</span>
              <span className="text-right text-sky-300">OKX*</span>
              <span className="text-right">价差</span>
            </div>
            {spreadRows.map((r) => (
              <div
                key={r.label}
                className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr] items-center gap-2 border-b border-white/5 px-4 py-2.5 text-sm last:border-0"
              >
                <span className="flex items-center gap-2 font-medium text-white">
                  {r.code && <Flag code={r.code} className="h-4 w-6" />}
                  {r.label}
                </span>
                <Cell v={r.polymarket} best={r.best === "Polymarket"} />
                <Cell v={r.binance} best={r.best === "Binance"} />
                <Cell v={r.okx} best={r.best === "OKX"} />
                <span className="text-right font-semibold tabular-nums text-flame">
                  {(r.spread * 100).toFixed(1)}pt
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            * 币安 / OKX 报价为示例数据。这两家的预测/竞猜是否提供公开 API 需进一步确认，确认后即可替换为实时价。
          </p>
        </section>
      )}

      {/* ---------- CHAMPION MODEL ---------- */}
      <section>
        <SectionTitle sub="基于 Elo 实力评分的自研夺冠概率模型">
          模型夺冠概率 Top 8
        </SectionTitle>
        <div className="card divide-y divide-white/5">
          {championProbabilities().slice(0, 8).map((c, i) => (
            <Link
              key={c.team.code}
              href={`/team/${c.team.code}`}
              className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/5"
            >
              <span className="heading w-6 text-lg text-white/40">{i + 1}</span>
              <Flag code={c.team.code} className="h-6 w-9" />
              <span className="flex-1 font-medium text-white">{c.team.zh} {c.team.name}</span>
              <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-white/10 sm:block">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                  style={{ width: `${c.prob * 100 * 4}%` }}
                />
              </div>
              <span className="w-14 text-right font-semibold tabular-nums text-gold-300">
                {(c.prob * 100).toFixed(1)}%
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Cell({ v, best }: { v: number; best: boolean }) {
  return (
    <span
      className={`text-right tabular-nums ${best ? "font-bold text-electric" : "text-slate-300"}`}
      title={best ? "全网最优价（隐含概率最低）" : undefined}
    >
      {(v * 100).toFixed(1)}%{best && " ★"}
    </span>
  );
}
