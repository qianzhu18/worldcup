"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recommendYesNo } from "@/lib/trade-recommendation";

type ScannerConsoleProps = {
  marketsCount: number;
  totalVolume: number;
  teamsCount: number;
  topSignals: { label: string; market: number; model: number; edge: number }[];
  kickoff: string;
  openingMatch: string;
  openingVenue: string;
};

const intervals = [
  ["1", "1 分钟"],
  ["5", "5 分钟"],
  ["10", "10 分钟"],
  ["30", "30 分钟"],
];

export function ScannerConsole({
  marketsCount,
  totalVolume,
  teamsCount,
  topSignals,
  kickoff,
  openingMatch,
  openingVenue,
}: ScannerConsoleProps) {
  const [scanning, setScanning] = useState(true);
  const [intervalValue, setIntervalValue] = useState("5");
  const [lastScan, setLastScan] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const cursor = useRef(0);
  const countdown = useCountdown(kickoff);

  const signals = useMemo(
    () =>
      topSignals.length
        ? topSignals
        : [
            { label: "Argentina", market: 0.18, model: 0.22, edge: 0.04 },
            { label: "Brazil", market: 0.16, model: 0.18, edge: 0.02 },
            { label: "France", market: 0.15, model: 0.13, edge: -0.02 },
          ],
    [topSignals],
  );

  useEffect(() => {
    setLastScan(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (!scanning) return;
    const id = window.setInterval(() => {
      const signal = signals[cursor.current % signals.length];
      cursor.current += 1;
      const edge = signal.edge * 100;
      const verdict = edge > 0 ? `提示 +${edge.toFixed(1)}%` : `观察 ${edge.toFixed(1)}%`;
      const line = `[${new Date().toLocaleTimeString()}] ${signal.label} · market ${(signal.market * 100).toFixed(
        1,
      )}% model ${(signal.model * 100).toFixed(1)}% edge ${edge > 0 ? "+" : ""}${edge.toFixed(1)}% -> ${verdict}`;
      setLastScan(new Date().toLocaleTimeString());
      setLines((prev) => [line, ...prev].slice(0, 7));
    }, 1100);
    return () => window.clearInterval(id);
  }, [scanning, signals, intervalValue]);

  const bestEdge = Math.max(...signals.map((s) => s.edge), 0);
  const modelLeader = [...signals].sort((a, b) => b.model - a.model)[0];

  return (
    <section className="zen-panel relative overflow-hidden rounded-2xl p-5 md:p-7">
      <div className="zen-scanline" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
      <div className="relative grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="zen-text text-2xl font-extrabold tracking-normal">AI 扫描控制台</span>
                <span className="live-dot h-2 w-2 rounded-full bg-emerald-300" />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                赛前倒计时 · 市场隐含概率 · AI 胜率差值
              </p>
            </div>
            <span className="rounded border border-emerald-400/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              live model
            </span>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-400/20 bg-[#06131e]/80 p-4 shadow-[0_0_38px_rgba(39,245,138,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">
                  Countdown to kickoff
                </div>
                <h2 className="mt-2 text-xl font-black text-white md:text-2xl">AI 扫描世界杯倒计时</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {openingMatch} · {openingVenue}
                </p>
              </div>
              <span className="rounded-full border border-gold-300/30 bg-gold-300/10 px-3 py-1 text-xs font-bold text-gold-300">
                AI 赛前扫描中
              </span>
            </div>

            <div className="mt-6 flex justify-center">
              <CountdownLine countdown={countdown} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScannerStat label="扫描盘口" value={String(marketsCount)} />
            <ScannerStat label="总成交" value={`$${abbr(totalVolume)}`} />
            <ScannerStat label="参赛队" value={String(teamsCount)} />
            <ScannerStat label="最大胜率差" value={`+${(bestEdge * 100).toFixed(1)}%`} accent />
          </div>

          <DecisionPanel signals={signals} />
        </div>

        <div className="rounded-xl border border-emerald-400/20 bg-[#07121b]/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 pb-3">
            <button
              type="button"
              onClick={() => setScanning((value) => !value)}
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <span className={`relative h-5 w-10 rounded-full transition ${scanning ? "bg-emerald-400/70" : "bg-slate-600"}`}>
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    scanning ? "left-5" : "left-0.5"
                  }`}
                />
              </span>
              <span className={scanning ? "text-emerald-300" : "text-slate-400"}>
                {scanning ? "AI 扫描中" : "已暂停"}
              </span>
              {scanning && <span className="live-dot h-2 w-2 rounded-full bg-emerald-300" />}
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              扫描间隔
              <select
                value={intervalValue}
                onChange={(event) => setIntervalValue(event.target.value)}
                className="rounded-md border border-slate-600/70 bg-[#0b1322] px-2 py-1 text-xs text-slate-200"
              >
                {intervals.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>{scanning ? `上次扫描 ${lastScan || "--:--:--"}` : "扫描暂停，不消耗 token"}</span>
            <span>实时推理流</span>
          </div>

          <div className="mono mt-3 min-h-[136px] text-[11px] leading-relaxed text-slate-400">
            {scanning ? (
              lines.length ? (
                lines.map((line, index) => (
                  <div key={line + index} className={index === 0 ? "text-emerald-300" : ""}>
                    {line}
                    {index === 0 && <span className="live-dot"> |</span>}
                  </div>
                ))
              ) : (
                <div className="text-slate-500">初始化扫描引擎...<span className="live-dot"> |</span></div>
              )
            ) : (
              <div className="text-slate-600">AI 推理引擎离线，等待恢复扫描。</div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-700/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                  AI win-rate analysis
                </div>
                <div className="mt-1 text-sm font-black text-white">胜率分析 Top Signals</div>
              </div>
              {modelLeader && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">模型领跑</div>
                  <div className="text-sm font-bold text-gold-300">
                    {modelLeader.label} {(modelLeader.model * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {signals.slice(0, 3).map((signal) => (
                <AiWinRateCard key={signal.label} signal={signal} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScannerStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black tabular-nums ${accent ? "zen-text" : "text-white"}`}>{value}</div>
    </div>
  );
}

function CountdownLine({ countdown }: { countdown: ReturnType<typeof useCountdown> }) {
  return (
    <div className="tabular-nums text-4xl font-light tracking-normal md:text-5xl">
      <span className="font-medium text-gold-300">{countdown ? `${countdown.days}天` : "--天"}</span>
      <span className="ml-3 text-slate-200">
        {countdown
          ? `${String(countdown.hours).padStart(2, "0")}:${String(countdown.minutes).padStart(2, "0")}:${String(
              countdown.seconds,
            ).padStart(2, "0")}`
          : "--:--:--"}
      </span>
    </div>
  );
}

function DecisionPanel({
  signals,
}: {
  signals: { label: string; market: number; model: number; edge: number }[];
}) {
  const ranked = [...signals]
    .map((signal) => ({ signal, rec: recommendYesNo(signal.model, signal.market) }))
    .sort((a, b) => Math.abs(b.rec.edge) - Math.abs(a.rec.edge))
    .slice(0, 3);

  return (
    <div className="mt-4 flex-1 rounded-xl border border-emerald-400/15 bg-[#07121b]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">
            YES / NO decision
          </div>
          <div className="mt-1 text-lg font-black text-white">交易动作决策台</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-400">
          阈值 2pt · 扣除手续费缓冲
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-2">
          <RulePill
            label="买 YES"
            tone="yes"
            text="AI 胜率高于市场价 2pt 以上"
          />
          <RulePill
            label="买 NO"
            tone="no"
            text="AI 胜率低于市场价 2pt 以上"
          />
          <RulePill
            label="观望"
            tone="watch"
            text="差值太小，可能被点差和手续费吃掉"
          />
        </div>

        <div className="space-y-2">
          {ranked.map(({ signal, rec }) => (
            <div key={signal.label} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{signal.label}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    市场 {(signal.market * 100).toFixed(1)}% · AI {(signal.model * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`tabular-nums text-sm font-black ${
                      rec.tone === "yes"
                        ? "text-emerald-300"
                        : rec.tone === "no"
                          ? "text-orange-300"
                          : "text-slate-300"
                    }`}
                  >
                    {rec.edge > 0 ? "+" : ""}
                    {(rec.edge * 100).toFixed(1)}%
                  </span>
                  <ActionBadge label={rec.label} tone={rec.tone} />
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${rec.tone === "yes" ? "bg-emerald-300" : rec.tone === "no" ? "bg-orange-400" : "bg-slate-500"}`}
                  style={{ width: `${Math.min(100, Math.max(8, Math.abs(rec.edge) * 900))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RulePill({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "yes" | "no" | "watch";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ActionBadge label={label} tone={tone} />
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-slate-400">{text}</div>
    </div>
  );
}

function ActionBadge({ label, tone }: { label: string; tone: "yes" | "no" | "watch" }) {
  const cls =
    tone === "yes"
      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-300"
      : tone === "no"
        ? "border-orange-400/35 bg-orange-400/12 text-orange-300"
        : "border-slate-500/30 bg-slate-500/10 text-slate-300";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${cls}`}>{label}</span>;
}

function AiWinRateCard({
  signal,
}: {
  signal: { label: string; market: number; model: number; edge: number };
}) {
  const rec = recommendYesNo(signal.model, signal.market);
  const positive = rec.tone === "yes";
  const modelPct = Math.max(4, Math.min(100, signal.model * 100));

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{signal.label}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            市场 {(signal.market * 100).toFixed(1)}% · AI {(signal.model * 100).toFixed(1)}%
          </div>
        </div>
        <div className={`text-right text-sm font-black tabular-nums ${rec.tone === "yes" ? "text-emerald-300" : rec.tone === "no" ? "text-orange-300" : "text-slate-300"}`}>
          {signal.edge > 0 ? "+" : ""}
          {(signal.edge * 100).toFixed(1)}%
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>{rec.reason}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-black ${
            rec.tone === "yes"
              ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-300"
              : rec.tone === "no"
                ? "border-orange-400/35 bg-orange-400/12 text-orange-300"
                : "border-slate-500/30 bg-slate-500/10 text-slate-300"
          }`}
        >
          {rec.label}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${positive ? "bg-emerald-300" : "bg-orange-400"}`}
          style={{ width: `${modelPct}%` }}
        />
      </div>
    </div>
  );
}

function useCountdown(to: string) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) return null;
  const diff = Math.max(0, new Date(to).getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function abbr(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}
