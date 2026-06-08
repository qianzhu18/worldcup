"use client";

import { useState, useEffect } from "react";

type Signal = {
  rank: number;
  team: string;
  teamCode: string;
  signalStrength: string;
  action: string;
  marketProb: number;
  modelProb: number;
  aiProb: number | null;
  fusedProb: number;
  rawEdge: number;
  adjustedEdge: number;
  kellyFraction: number;
  expectedValue: number;
  confidence: number;
  factors: string[];
  sources: string[];
};

type PortfolioRisk = {
  totalExposure: number;
  correlationRisk: string;
  maxDrawdown: number;
  recommendation: string;
};

type SignalsData = {
  timestamp: string;
  market: {
    id: string;
    title: string;
    slug: string;
    volume: number;
    liquidity: number;
  };
  signals: Signal[];
  portfolioRisk: PortfolioRisk;
};

const ACTION_COLORS: Record<string, string> = {
  STRONG_YES: "text-emerald-400 bg-emerald-400/20 border-emerald-400/30",
  YES: "text-emerald-300 bg-emerald-300/15 border-emerald-300/25",
  LEAN_YES: "text-cyan-300 bg-cyan-300/10 border-cyan-300/20",
  WATCH: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  LEAN_NO: "text-orange-300 bg-orange-300/10 border-orange-300/20",
  NO: "text-orange-400 bg-orange-400/15 border-orange-400/25",
  STRONG_NO: "text-red-400 bg-red-400/20 border-red-400/30",
};

const ACTION_LABELS: Record<string, string> = {
  STRONG_YES: "强烈 YES",
  YES: "买 YES",
  LEAN_YES: "偏向 YES",
  WATCH: "观望",
  LEAN_NO: "偏向 NO",
  NO: "买 NO",
  STRONG_NO: "强烈 NO",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-yellow-400",
  "A": "text-emerald-400",
  "B+": "text-cyan-400",
  "B": "text-blue-400",
  "C": "text-slate-400",
  "D": "text-slate-500",
};

export function SignalDashboard() {
  const [data, setData] = useState<SignalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSignals = async () => {
    try {
      const res = await fetch("/api/signals?performance=true");
      if (!res.ok) throw new Error("Failed to fetch signals");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    if (autoRefresh) {
      const interval = setInterval(fetchSignals, 5 * 60 * 1000); // Refresh every 5 min
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-400">计算博弈信号中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-400">信号加载失败: {error}</p>
        <button
          onClick={fetchSignals}
          className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black"
        >
          重试
        </button>
      </div>
    );
  }

  const activeSignals = data.signals.filter((s) => s.action !== "WATCH");
  const yesSignals = data.signals.filter((s) => s.action.includes("YES"));
  const noSignals = data.signals.filter((s) => s.action.includes("NO"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading text-2xl text-white">博弈信号仪表盘</h2>
            <p className="mt-1 text-sm text-slate-400">
              Polymarket vs 量化模型 vs AI 独立定价 · 三源融合
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              自动刷新
            </label>
            <button
              onClick={fetchSignals}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              刷新
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="活跃信号"
            value={String(activeSignals.length)}
            accent={activeSignals.length > 0}
          />
          <StatCard
            label="YES 信号"
            value={String(yesSignals.length)}
            accent={yesSignals.length > 0}
            sub="看好低估"
          />
          <StatCard
            label="NO 信号"
            value={String(noSignals.length)}
            accent={noSignals.length > 0}
            sub="看衰高估"
          />
          <StatCard
            label="总仓位"
            value={`${(data.portfolioRisk.totalExposure * 100).toFixed(1)}%`}
            accent={data.portfolioRisk.totalExposure > 0.3}
          />
        </div>

        {/* Portfolio Risk */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              组合风险评估
            </div>
            <span className={`chip ${
              data.portfolioRisk.correlationRisk === "low"
                ? "bg-emerald-400/20 text-emerald-300"
                : data.portfolioRisk.correlationRisk === "medium"
                  ? "bg-yellow-400/20 text-yellow-300"
                  : "bg-red-400/20 text-red-300"
            }`}>
              相关性: {data.portfolioRisk.correlationRisk}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{data.portfolioRisk.recommendation}</p>
        </div>
      </div>

      {/* Signal Grid */}
      <div className="card overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-bold text-white">冠军盘信号排名</h3>
          <p className="mt-1 text-xs text-slate-400">
            按 |调整 Edge| 排序 · Edge 已扣除手续费和点差
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">排名</th>
                <th className="px-4 py-3 text-left">球队</th>
                <th className="px-4 py-3 text-center">信号</th>
                <th className="px-4 py-3 text-right">市场价</th>
                <th className="px-4 py-3 text-right">模型</th>
                <th className="px-4 py-3 text-right">AI</th>
                <th className="px-4 py-3 text-right">融合</th>
                <th className="px-4 py-3 text-right">Edge</th>
                <th className="px-4 py-3 text-right">凯利</th>
                <th className="px-4 py-3 text-right">EV</th>
                <th className="px-4 py-3 text-center">等级</th>
              </tr>
            </thead>
            <tbody>
              {data.signals.map((signal) => (
                <tr
                  key={signal.teamCode}
                  className={`cursor-pointer border-b border-white/5 transition hover:bg-white/5 ${
                    selectedSignal?.teamCode === signal.teamCode ? "bg-white/5" : ""
                  }`}
                  onClick={() => setSelectedSignal(signal)}
                >
                  <td className="px-4 py-3 text-sm text-slate-400">#{signal.rank}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{signal.team}</div>
                    <div className="text-xs text-slate-500">{signal.teamCode}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`chip text-xs ${ACTION_COLORS[signal.action]}`}>
                      {ACTION_LABELS[signal.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                    {signal.marketProb.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                    {signal.modelProb.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                    {signal.aiProb !== null ? `${signal.aiProb.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-white">
                    {signal.fusedProb.toFixed(1)}%
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${
                    signal.adjustedEdge > 0 ? "text-emerald-400" : signal.adjustedEdge < 0 ? "text-orange-400" : "text-slate-400"
                  }`}>
                    {signal.adjustedEdge > 0 ? "+" : ""}{signal.adjustedEdge.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-cyan-300">
                    {(signal.kellyFraction * 100).toFixed(1)}%
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-sm ${
                    signal.expectedValue > 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {signal.expectedValue > 0 ? "+" : ""}{(signal.expectedValue * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg font-black ${GRADE_COLORS[signal.signalStrength]}`}>
                      {signal.signalStrength}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signal Detail Panel */}
      {selectedSignal && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="heading text-xl text-white">
              {selectedSignal.team} · 信号详情
            </h3>
            <button
              onClick={() => setSelectedSignal(null)}
              className="text-sm text-slate-400 hover:text-white"
            >
              关闭
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Probability Breakdown */}
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                概率分解
              </div>
              <div className="mt-3 space-y-3">
                <ProbRow label="市场价" value={selectedSignal.marketProb} color="text-slate-300" />
                <ProbRow label="量化模型" value={selectedSignal.modelProb} color="text-blue-400" />
                {selectedSignal.aiProb !== null && (
                  <ProbRow label="AI 独立" value={selectedSignal.aiProb} color="text-purple-400" />
                )}
                <div className="border-t border-white/10 pt-2">
                  <ProbRow label="融合概率" value={selectedSignal.fusedProb} color="text-emerald-400" bold />
                </div>
              </div>
            </div>

            {/* Edge Metrics */}
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Edge 指标
              </div>
              <div className="mt-3 space-y-3">
                <MetricRow label="原始 Edge" value={`${selectedSignal.rawEdge > 0 ? "+" : ""}${selectedSignal.rawEdge.toFixed(1)}%`} />
                <MetricRow label="调整 Edge" value={`${selectedSignal.adjustedEdge > 0 ? "+" : ""}${selectedSignal.adjustedEdge.toFixed(1)}%`} />
                <MetricRow label="凯利仓位" value={`${(selectedSignal.kellyFraction * 100).toFixed(1)}%`} />
                <MetricRow label="期望值" value={`${selectedSignal.expectedValue > 0 ? "+" : ""}${(selectedSignal.expectedValue * 100).toFixed(1)}%`} />
                <MetricRow label="置信度" value={`${(selectedSignal.confidence * 100).toFixed(0)}%`} />
              </div>
            </div>
          </div>

          {/* Factors */}
          {selectedSignal.factors.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                信号因素
              </div>
              <ul className="mt-3 space-y-2">
                {selectedSignal.factors.map((factor, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">▸</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Recommendation */}
          <div className={`mt-4 rounded-xl border p-4 ${
            ACTION_COLORS[selectedSignal.action]
          }`}>
            <div className="text-center">
              <div className="text-2xl font-black">
                {ACTION_LABELS[selectedSignal.action]}
              </div>
              <div className="mt-2 text-sm">
                {selectedSignal.action.includes("YES") && (
                  <span>建议仓位: {(selectedSignal.kellyFraction * 100).toFixed(1)}% · 期望收益: {(selectedSignal.expectedValue * 100).toFixed(1)}%</span>
                )}
                {selectedSignal.action.includes("NO") && (
                  <span>建议仓位: {(selectedSignal.kellyFraction * 100).toFixed(1)}% · 期望收益: {(selectedSignal.expectedValue * 100).toFixed(1)}%</span>
                )}
                {selectedSignal.action === "WATCH" && (
                  <span>差值不足以覆盖交易成本，建议继续观察</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-black ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function ProbRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`font-mono text-sm ${bold ? "font-bold" : ""} ${color}`}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-mono text-sm text-white">{value}</span>
    </div>
  );
}
