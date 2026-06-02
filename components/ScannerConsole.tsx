"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ScannerConsoleProps = {
  marketsCount: number;
  totalVolume: number;
  teamsCount: number;
  topSignals: { label: string; market: number; model: number; edge: number }[];
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
}: ScannerConsoleProps) {
  const [scanning, setScanning] = useState(true);
  const [intervalValue, setIntervalValue] = useState("5");
  const [lastScan, setLastScan] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const cursor = useRef(0);

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

  return (
    <section className="zen-panel relative overflow-hidden rounded-2xl p-5 md:p-6">
      <div className="zen-scanline" aria-hidden />
      <div className="relative grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <CyberAvatar />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="zen-text text-2xl font-extrabold tracking-normal">World Cup Zen</span>
                <span className="rounded border border-emerald-400/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  WC 2026
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                AI 跨平台预测市场扫描引擎 · Polymarket / Binance / OKX
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {["实时盘口", "AI 独立定价", "价差检测", "风险核验"].map((item) => (
              <span key={item} className="rounded-full border border-emerald-400/25 px-3 py-1 text-xs text-emerald-200/90">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScannerStat label="活跃盘口" value={String(marketsCount)} />
            <ScannerStat label="总成交" value={`$${abbr(totalVolume)}`} />
            <ScannerStat label="参赛队" value={String(teamsCount)} />
            <ScannerStat label="最佳错价" value={`+${(bestEdge * 100).toFixed(1)}%`} accent />
          </div>
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

function CyberAvatar() {
  return (
    <svg width="48" height="48" viewBox="0 0 100 100" fill="none" className="zen-glow rounded-xl">
      <defs>
        <linearGradient id="zenAvatarBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B2230" />
          <stop offset="1" stopColor="#06121A" />
        </linearGradient>
        <radialGradient id="zenAvatarEye" cx="50%" cy="50%">
          <stop offset="0" stopColor="#CFFFE6" />
          <stop offset="1" stopColor="#27F58A" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#zenAvatarBg)" stroke="#27F58A" strokeOpacity=".55" />
      <path
        d="M34 78 C26 70 24 56 28 44 C32 30 44 22 56 24 C70 26 78 38 76 52 C75 60 70 64 70 70 L70 80"
        stroke="#1FB877"
        strokeWidth="2.2"
        fill="#0A1B26"
      />
      <path d="M30 46 L60 41 L60 52 L31 56 Z" fill="#27F58A" fillOpacity=".22" stroke="#27F58A" strokeWidth="1.4" />
      <circle cx="44" cy="49" r="3" fill="url(#zenAvatarEye)" />
      <path d="M56 60 L52 66 L60 72 M62 56 L72 56 M58 64 L66 64" stroke="#27F58A" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="72" cy="56" r="2" fill="#13E0C4" />
      <rect x="78" y="30" width="7" height="5" fill="#27F58A" fillOpacity=".5" />
      <rect x="82" y="40" width="5" height="4" fill="#13E0C4" fillOpacity=".6" />
      <rect x="80" y="62" width="6" height="5" fill="#27F58A" fillOpacity=".4" />
    </svg>
  );
}

function abbr(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}
