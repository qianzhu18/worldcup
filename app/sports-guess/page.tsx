"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { MATCHES, teamByCode } from "@/lib/worldcup";

/* ─── Types ─── */
type MatchStatus = "pending" | "open" | "closed" | "settled";
type GuessResult = "teamA" | "teamB" | "draw";

interface AiPrediction {
  personaId: string;
  displayName: string;
  emoji: string;
  color: string;
  home: number;
  draw: number;
  away: number;
  confidence: number;
  factors: string[];
  summary: string;
}

interface GuessMatch {
  id: string;
  title: string;
  teamA: string;
  teamB: string;
  homeCode: string;
  awayCode: string;
  startTime: string;
  guessDeadline: string;
  status: MatchStatus;
  participantCount: number;
  finalResult?: GuessResult;
  score?: [number, number];
  aiPredictions?: AiPrediction[];
}

interface GuessRecord {
  id: string;
  matchId: string;
  matchTitle: string;
  teamA: string;
  teamB: string;
  selectedResult: GuessResult;
  tokenAmount: number;
  odds: number;
  status: "pending" | "win" | "lose";
  rewardToken?: number;
  createdAt: string;
  aiPredictions?: AiPrediction[];
}

/* ─── Constants ─── */
const INITIAL_TOKEN = 1000;
const CHECKIN_REWARD = 200;

const RESULT_LABELS: Record<GuessResult, string> = {
  teamA: "主胜",
  teamB: "客胜",
  draw: "平局",
};

const STATUS_LABELS: Record<MatchStatus, string> = {
  pending: "未开始",
  open: "竞猜中",
  closed: "已截止",
  settled: "已结算",
};

const STATUS_COLORS: Record<MatchStatus, string> = {
  pending: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  open: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300",
  closed: "border-orange-400/35 bg-orange-400/12 text-orange-300",
  settled: "border-blue-400/35 bg-blue-400/12 text-blue-300",
};

const AI_COLORS: Record<string, { border: string; bg: string; text: string; bar: string }> = {
  emerald: { border: "border-emerald-400/30", bg: "bg-emerald-400/10", text: "text-emerald-300", bar: "bg-emerald-400" },
  blue: { border: "border-blue-400/30", bg: "bg-blue-400/10", text: "text-blue-300", bar: "bg-blue-400" },
  purple: { border: "border-purple-400/30", bg: "bg-purple-400/10", text: "text-purple-300", bar: "bg-purple-400" },
};

/* ─── Helpers ─── */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("sports_guess_device_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("sports_guess_device_id", id);
  }
  return id;
}

function deriveGuessStatus(m: (typeof MATCHES)[number]): MatchStatus {
  if (m.status === "finished") return "settled";
  if (!m.home || !m.away) return "pending";
  const kickoff = new Date(m.kickoff).getTime();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  if (now >= kickoff - ONE_HOUR) return "closed";
  return "open";
}

function deriveFinalResult(m: (typeof MATCHES)[number]): GuessResult | undefined {
  if (m.status !== "finished" || !m.score) return undefined;
  if (m.score[0] > m.score[1]) return "teamA";
  if (m.score[0] < m.score[1]) return "teamB";
  return "draw";
}

function calcOdds(aiPreds: AiPrediction[] | undefined, result: GuessResult): number {
  if (!aiPreds || aiPreds.length === 0) return 2.0;
  const avgProb =
    aiPreds.reduce((sum, p) => {
      const prob = result === "teamA" ? p.home : result === "teamB" ? p.away : p.draw;
      return sum + prob;
    }, 0) / aiPreds.length;
  if (avgProb <= 0) return 5.0;
  const odds = 1 / avgProb;
  return Math.round(Math.max(1.2, Math.min(odds, 10)) * 100) / 100;
}

function generateDebate(preds: AiPrediction[]): string[] {
  if (preds.length < 2) return [];
  const lines: string[] = [];
  const sorted = [...preds].sort((a, b) => {
    const aMax = Math.max(a.home, a.draw, a.away);
    const bMax = Math.max(b.home, b.draw, b.away);
    return bMax - aMax;
  });
  const [first, second, third] = sorted;
  const firstPick = first.home > first.draw && first.home > first.away ? "主胜" : first.away > first.home && first.away > first.draw ? "客胜" : "平局";
  const secondPick = second.home > second.draw && second.home > second.away ? "主胜" : second.away > second.home && second.away > second.draw ? "客胜" : "平局";
  if (firstPick !== secondPick) {
    lines.push(`${first.emoji} ${first.displayName}：「${first.factors[0] || first.summary}，我选${firstPick}！」`);
    lines.push(`${second.emoji} ${second.displayName}：「${second.factors[0] || second.summary}，明明是${secondPick}！」`);
    if (third) {
      const thirdPick = third.home > third.draw && third.home > third.away ? "主胜" : third.away > third.home && third.away > third.draw ? "客胜" : "平局";
      lines.push(`${third.emoji} ${third.displayName}：「${third.factors[0] || third.summary}，我投${thirdPick}一票。」`);
    }
  } else {
    lines.push(`${first.emoji} ${first.displayName}：「${first.summary}」`);
    if (second) lines.push(`${second.emoji} ${second.displayName}：「同意！${second.factors[1] || second.summary}」`);
    if (third) lines.push(`${third.emoji} ${third.displayName}：「难得达成共识，${third.factors[0] || '这次没异议'}。」`);
  }
  return lines;
}

/* ─── localStorage persistence ─── */
function loadBalance(): number {
  if (typeof window === "undefined") return INITIAL_TOKEN;
  const v = localStorage.getItem("sports_guess_balance");
  if (v === null) {
    localStorage.setItem("sports_guess_balance", String(INITIAL_TOKEN));
    return INITIAL_TOKEN;
  }
  return Number(v) || INITIAL_TOKEN;
}

function saveBalance(v: number) {
  localStorage.setItem("sports_guess_balance", String(v));
}

function loadRecords(): GuessRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("sports_guess_records") || "[]");
  } catch {
    return [];
  }
}

function saveRecords(records: GuessRecord[]) {
  localStorage.setItem("sports_guess_records", JSON.stringify(records));
}

function canCheckin(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem("sports_guess_checkin");
  if (!last) return true;
  const today = new Date().toISOString().slice(0, 10);
  return last !== today;
}

function doCheckin() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem("sports_guess_checkin", today);
}

/* ─── AI Match Card ─── */
function AIPredictionBar({ predictions }: { predictions: AiPrediction[] }) {
  if (!predictions.length) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {predictions.map((p) => {
        const c = AI_COLORS[p.color] || AI_COLORS.emerald;
        const pick = p.home > p.draw && p.home > p.away ? "主" : p.away > p.home && p.away > p.draw ? "客" : "平";
        return (
          <div key={p.personaId} className="flex items-center gap-2 text-[11px]">
            <span className="w-14 shrink-0 text-slate-500 truncate">{p.emoji} {p.displayName}</span>
            <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-white/5">
              <div className={`${c.bar}/60`} style={{ width: `${p.home * 100}%` }} title={`主胜 ${(p.home * 100).toFixed(0)}%`} />
              <div className="bg-slate-500/40" style={{ width: `${p.draw * 100}%` }} title={`平局 ${(p.draw * 100).toFixed(0)}%`} />
              <div className="bg-amber-400/50" style={{ width: `${p.away * 100}%` }} title={`客胜 ${(p.away * 100).toFixed(0)}%`} />
            </div>
            <span className={`w-6 text-right font-bold ${c.text}`}>{pick}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ─── */
type TabKey = "matches" | "ai-battle" | "records" | "leaderboard" | "ai-leaderboard";

export default function SportsGuessPage() {
  const [tab, setTab] = useState<TabKey>("matches");
  const [tokenBalance, setTokenBalance] = useState(INITIAL_TOKEN);
  const [records, setRecords] = useState<GuessRecord[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<GuessMatch | null>(null);
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null);
  const [guessAmount, setGuessAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [aiBattleMatch, setAiBattleMatch] = useState<GuessMatch | null>(null);
  const [aiBattleLoading, setAiBattleLoading] = useState(false);
  const [battlePredictions, setBattlePredictions] = useState<AiPrediction[]>([]);

  /* Init from localStorage */
  useEffect(() => {
    setTokenBalance(loadBalance());
    setRecords(loadRecords());
    setDeviceId(getDeviceId());
  }, []);

  /* Convert real MATCHES → GuessMatch[] */
  const matches = useMemo<GuessMatch[]>(() => {
    return MATCHES.filter((m) => m.home && m.away).map((m) => {
      const homeTeam = teamByCode(m.home!);
      const awayTeam = teamByCode(m.away!);
      const status = deriveGuessStatus(m);
      const finalResult = deriveFinalResult(m);
      const stageLabel = m.stage === "Group" ? `小组赛 ${m.group ?? ""} 组` : m.stage;
      return {
        id: m.id,
        title: stageLabel,
        teamA: homeTeam?.zh ?? m.homeLabel ?? m.home ?? "待定",
        teamB: awayTeam?.zh ?? m.awayLabel ?? m.away ?? "待定",
        homeCode: m.home!,
        awayCode: m.away!,
        startTime: m.kickoff,
        guessDeadline: new Date(new Date(m.kickoff).getTime() - 60 * 60 * 1000).toISOString(),
        status,
        participantCount: status === "settled" ? 200 + (hashCode(m.id) % 600) : status === "open" ? 50 + (hashCode(m.id) % 400) : 0,
        finalResult,
        score: m.score,
      };
    });
  }, []);

  const sortedMatches = useMemo(() => {
    const order: Record<MatchStatus, number> = { open: 0, closed: 1, pending: 2, settled: 3 };
    return [...matches].sort((a, b) => order[a.status] - order[b.status]);
  }, [matches]);

  const openCount = matches.filter((m) => m.status === "open").length;

  /* Settle pending records when match finishes */
  useEffect(() => {
    setRecords((prev) => {
      let changed = false;
      const updated = prev.map((r) => {
        if (r.status !== "pending") return r;
        const match = matches.find((m) => m.id === r.matchId);
        if (!match || match.status !== "settled" || !match.finalResult) return r;
        changed = true;
        if (match.finalResult === r.selectedResult) {
          return { ...r, status: "win" as const, rewardToken: Math.round(r.tokenAmount * r.odds) };
        }
        return { ...r, status: "lose" as const };
      });
      if (changed) {
        const wins = updated.filter((r) => r.status === "win" && !prev.find((p) => p.id === r.id && p.status === "win"));
        if (wins.length > 0) {
          const bonus = wins.reduce((s, r) => s + (r.rewardToken || 0), 0);
          setTokenBalance((b) => {
            const nb = b + bonus;
            saveBalance(nb);
            return nb;
          });
        }
        saveRecords(updated);
      }
      return updated;
    });
  }, [matches]);

  /* Fetch AI predictions for a match */
  const fetchAiPredictions = useCallback(async (match: GuessMatch) => {
    setAiBattleLoading(true);
    setAiBattleMatch(match);
    setBattlePredictions([]);
    setTab("ai-battle");
    try {
      const res = await fetch(`/api/sports-guess/ai-predictions?matchId=${match.id}`);
      if (res.ok) {
        const data = await res.json();
        setBattlePredictions(data.predictions || []);
      }
    } catch (e) {
      console.error("AI prediction fetch failed", e);
    } finally {
      setAiBattleLoading(false);
    }
  }, []);

  /* Submit guess */
  const handleSubmitGuess = useCallback(() => {
    if (!selectedMatch || !guessResult || !guessAmount) return;
    const amount = parseInt(guessAmount, 10);
    if (isNaN(amount) || amount <= 0 || amount > tokenBalance) return;

    const odds = calcOdds(selectedMatch.aiPredictions, guessResult);
    const record: GuessRecord = {
      id: `g${Date.now()}`,
      matchId: selectedMatch.id,
      matchTitle: selectedMatch.title,
      teamA: selectedMatch.teamA,
      teamB: selectedMatch.teamB,
      selectedResult: guessResult,
      tokenAmount: amount,
      odds,
      status: "pending",
      createdAt: new Date().toISOString(),
      aiPredictions: selectedMatch.aiPredictions,
    };

    const newBalance = tokenBalance - amount;
    setTokenBalance(newBalance);
    saveBalance(newBalance);

    const newRecords = [record, ...records];
    setRecords(newRecords);
    saveRecords(newRecords);

    setShowConfirm(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedMatch(null);
      setGuessResult(null);
      setGuessAmount("");
    }, 2000);
  }, [selectedMatch, guessResult, guessAmount, tokenBalance, records]);

  /* Daily checkin */
  const handleCheckin = useCallback(() => {
    if (!canCheckin()) return;
    doCheckin();
    const newBalance = tokenBalance + CHECKIN_REWARD;
    setTokenBalance(newBalance);
    saveBalance(newBalance);
    setShowCheckin(true);
    setTimeout(() => setShowCheckin(false), 2000);
  }, [tokenBalance]);

  /* Leaderboard data (local) */
  const userLeaderboard = useMemo(() => {
    const wins = records.filter((r) => r.status === "win").length;
    const total = records.length;
    return [{
      rank: 1,
      name: deviceId.slice(0, 12) || "我",
      token: tokenBalance,
      totalGuesses: total,
      wins,
      winRate: total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : "-",
      isMe: true,
    }];
  }, [records, tokenBalance, deviceId]);

  /* AI leaderboard data (from settled records) */
  const aiLeaderboard = useMemo(() => {
    const settled = records.filter((r) => r.status === "win" || r.status === "lose");
    if (settled.length === 0) return [];
    const stats: Record<string, { correct: number; total: number }> = {};
    for (const r of settled) {
      if (!r.aiPredictions) continue;
      for (const pred of r.aiPredictions) {
        if (!stats[pred.personaId]) stats[pred.personaId] = { correct: 0, total: 0 };
        stats[pred.personaId].total++;
        const aiPick: GuessResult =
          pred.home > pred.draw && pred.home > pred.away ? "teamA" :
          pred.away > pred.home && pred.away > pred.draw ? "teamB" : "draw";
        if (aiPick === r.selectedResult && r.status === "win") stats[pred.personaId].correct++;
      }
    }
    return Object.entries(stats)
      .map(([id, s]) => {
        const persona = [
          { id: "minimax", name: "MiniMax", emoji: "📊" },
          { id: "deepseek", name: "DeepSeek", emoji: "♟️" },
          { id: "qwen", name: "Qwen", emoji: "🔮" },
        ].find((p) => p.id === id);
        return {
          id,
          name: persona?.name || id,
          emoji: persona?.emoji || "🤖",
          total: s.total,
          correct: s.correct,
          winRate: s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : "-",
        };
      })
      .sort((a, b) => {
        const aRate = a.total > 0 ? a.correct / a.total : 0;
        const bRate = b.total > 0 ? b.correct / b.total : 0;
        return bRate - aRate;
      })
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [records]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading text-3xl text-white">体育竞猜</h1>
          <p className="mt-1 text-sm text-slate-400">
            AI 对决 · 虚拟 Token 娱乐竞猜 · {matches.length} 场比赛 · {openCount} 场可竞猜
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCheckin() && (
            <button
              onClick={handleCheckin}
              className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-400/20"
            >
              每日签到 +{CHECKIN_REWARD}
            </button>
          )}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-3">
            <span className="text-xs uppercase tracking-widest text-slate-400">Token</span>
            <span className="text-2xl font-black tabular-nums text-emerald-300">{tokenBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {([["matches", "比赛列表"], ["ai-battle", "AI 对决"], ["records", "我的竞猜"], ["leaderboard", "用户排行"], ["ai-leaderboard", "AI 排行"]] as [TabKey, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setTab(k); if (k !== "matches") setSelectedMatch(null); }}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
              tab === k
                ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Matches Tab ═══ */}
      {tab === "matches" && !selectedMatch && (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedMatches.map((m) => (
            <div key={m.id} className="card p-5 transition hover:border-emerald-400/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.title}</span>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[m.status]}`}>
                  {STATUS_LABELS[m.status]}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-white">{m.teamA}</div>
                </div>
                <div className="px-4 flex flex-col items-center">
                  {m.score ? (
                    <span className="heading text-2xl text-emerald-300">{m.score[0]} - {m.score[1]}</span>
                  ) : (
                    <span className="heading text-xl text-slate-500">VS</span>
                  )}
                </div>
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-white">{m.teamB}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(m.startTime).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span>{m.participantCount} 人参与</span>
              </div>
              <div className="mt-3 flex gap-2">
                {m.status === "open" && (
                  <button
                    onClick={() => {
                      setSelectedMatch(m);
                      setGuessResult(null);
                      setGuessAmount("");
                    }}
                    className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-400"
                  >
                    进入竞猜
                  </button>
                )}
                {m.status === "closed" && (
                  <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center text-sm text-slate-500">
                    竞猜已截止
                  </div>
                )}
                {m.status === "settled" && (
                  <div className="flex-1 rounded-lg border border-blue-400/20 bg-blue-400/5 px-4 py-2.5 text-center text-sm text-blue-300">
                    已结算 · {m.score ? `${m.score[0]} - ${m.score[1]}` : RESULT_LABELS[m.finalResult!]}
                  </div>
                )}
                {m.status === "pending" && (
                  <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center text-sm text-slate-500">
                    队伍待定
                  </div>
                )}
                <button
                  onClick={() => fetchAiPredictions(m)}
                  className="rounded-lg border border-purple-400/30 bg-purple-400/10 px-3 py-2.5 text-xs font-bold text-purple-300 transition hover:bg-purple-400/20"
                >
                  AI
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Guess Panel ═══ */}
      {tab === "matches" && selectedMatch && (
        <div className="card p-6">
          <button onClick={() => setSelectedMatch(null)} className="mb-4 text-sm text-slate-400 transition hover:text-white">
            &larr; 返回比赛列表
          </button>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{selectedMatch.title}</span>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[selectedMatch.status]}`}>
              {STATUS_LABELS[selectedMatch.status]}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-center flex-1">
              <div className="text-2xl font-black text-white">{selectedMatch.teamA}</div>
              <div className="mt-1 text-xs text-slate-500">主队</div>
            </div>
            <div className="px-6"><span className="heading text-3xl text-slate-500">VS</span></div>
            <div className="text-center flex-1">
              <div className="text-2xl font-black text-white">{selectedMatch.teamB}</div>
              <div className="mt-1 text-xs text-slate-500">客队</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-white mb-3">选择预测结果</div>
            <div className="grid grid-cols-3 gap-3">
              {(["teamA", "draw", "teamB"] as GuessResult[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setGuessResult(r)}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    guessResult === r
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {r === "teamA" ? selectedMatch.teamA : r === "teamB" ? selectedMatch.teamB : "平局"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-white mb-3">
              投入 Token
              <span className="ml-2 text-xs font-normal text-slate-500">(余额: {tokenBalance.toLocaleString()})</span>
            </div>
            <div className="flex gap-3">
              {[50, 100, 200, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setGuessAmount(String(v))}
                  className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                    guessAmount === String(v)
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                  }`}
                >
                  {v}
                </button>
              ))}
              <input
                type="number" min="1" max={tokenBalance} value={guessAmount}
                onChange={(e) => setGuessAmount(e.target.value)}
                placeholder="自定义"
                className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-400/40"
              />
            </div>
          </div>

          {guessAmount && parseInt(guessAmount) > tokenBalance && (
            <p className="mt-3 text-xs text-red-400">Token 余额不足</p>
          )}

          <button
            disabled={!guessResult || !guessAmount || parseInt(guessAmount) <= 0 || parseInt(guessAmount) > tokenBalance}
            onClick={() => setShowConfirm(true)}
            className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            确认竞猜
          </button>
        </div>
      )}

      {/* ═══ AI Battle Tab ═══ */}
      {tab === "ai-battle" && (
        <div className="space-y-6">
          {!aiBattleMatch ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3">🤖</div>
              <div className="text-lg font-bold text-white mb-2">AI 对决</div>
              <p className="text-sm text-slate-400 mb-6">选择一场比赛，看看 AI 们如何争吵</p>
              <div className="grid gap-3 md:grid-cols-2">
                {sortedMatches.filter((m) => m.status === "open" || m.status === "closed").slice(0, 8).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => fetchAiPredictions(m)}
                    className="card p-4 text-left transition hover:border-purple-400/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{m.title}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[m.status]}`}>
                        {STATUS_LABELS[m.status]}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-white">
                      {m.teamA} vs {m.teamB}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(m.startTime).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : aiBattleLoading ? (
            <div className="card p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              <p className="mt-4 text-sm text-slate-400">AI 们正在激烈讨论中...</p>
            </div>
          ) : (
            <>
              {/* Match header */}
              <div className="card p-6">
                <button onClick={() => { setAiBattleMatch(null); setBattlePredictions([]); }} className="mb-4 text-sm text-slate-400 transition hover:text-white">
                  &larr; 选择其他比赛
                </button>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="text-center flex-1">
                    <div className="text-2xl font-black text-white">{aiBattleMatch.teamA}</div>
                    <div className="mt-1 text-xs text-slate-500">主队</div>
                  </div>
                  <div className="px-6"><span className="heading text-3xl text-slate-500">VS</span></div>
                  <div className="text-center flex-1">
                    <div className="text-2xl font-black text-white">{aiBattleMatch.teamB}</div>
                    <div className="mt-1 text-xs text-slate-500">客队</div>
                  </div>
                </div>
              </div>

              {/* AI Cards */}
              {battlePredictions.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {battlePredictions.map((p) => {
                      const c = AI_COLORS[p.color] || AI_COLORS.emerald;
                      const pick = p.home > p.draw && p.home > p.away ? "主胜" : p.away > p.home && p.away > p.draw ? "客胜" : "平局";
                      return (
                        <div key={p.personaId} className={`card p-5 ${c.border}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{p.emoji}</span>
                            <div>
                              <div className={`font-bold ${c.text}`}>{p.displayName}</div>
                              <div className="text-[10px] text-slate-500">信心 {(p.confidence * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                          <div className={`text-2xl font-black mb-2 ${c.text}`}>{pick}</div>
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-8 text-slate-500">主胜</span>
                              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-emerald-400/70 rounded-full" style={{ width: `${p.home * 100}%` }} />
                              </div>
                              <span className="w-10 text-right text-slate-400">{(p.home * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-8 text-slate-500">平局</span>
                              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-slate-400/70 rounded-full" style={{ width: `${p.draw * 100}%` }} />
                              </div>
                              <span className="w-10 text-right text-slate-400">{(p.draw * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-8 text-slate-500">客胜</span>
                              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-amber-400/70 rounded-full" style={{ width: `${p.away * 100}%` }} />
                              </div>
                              <span className="w-10 text-right text-slate-400">{(p.away * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 italic">&ldquo;{p.summary}&rdquo;</div>
                          <ul className="mt-2 space-y-1">
                            {p.factors.map((f, i) => (
                              <li key={i} className="text-[11px] text-slate-500">· {f}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Debate */}
                  {(() => {
                    const debate = generateDebate(battlePredictions);
                    if (debate.length === 0) return null;
                    return (
                      <div className="card p-5">
                        <div className="text-sm font-bold text-white mb-3">AI 激辩现场</div>
                        <div className="space-y-2">
                          {debate.map((line, i) => (
                            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick bet from AI battle */}
                  {aiBattleMatch.status === "open" && (
                    <div className="card p-5 text-center">
                      <p className="text-sm text-slate-400 mb-3">AI 都表态了，你要不要也押一把？</p>
                      <button
                        onClick={() => {
                          setSelectedMatch(aiBattleMatch);
                          setGuessResult(null);
                          setGuessAmount("");
                          setTab("matches");
                        }}
                        className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-400"
                      >
                        去竞猜
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="card p-8 text-center text-sm text-slate-400">
                  AI 预测加载失败，请稍后重试
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Records Tab ═══ */}
      {tab === "records" && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">我的竞猜记录</h2>
          </div>
          {records.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              还没有竞猜记录，去比赛列表参与吧
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {records.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{r.teamA} vs {r.teamB}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        预测: {RESULT_LABELS[r.selectedResult]} · {r.tokenAmount} Token · 赔率 {r.odds}x ·{" "}
                        {new Date(r.createdAt).toLocaleString("zh-CN")}
                      </div>
                    </div>
                    <div className="text-right">
                      {r.status === "pending" && (
                        <span className="inline-flex rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-xs font-bold text-slate-400">待结算</span>
                      )}
                      {r.status === "win" && (
                        <div>
                          <span className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/12 px-2.5 py-1 text-xs font-bold text-emerald-300">预测正确</span>
                          <div className="mt-1 text-sm font-black text-emerald-300">+{r.rewardToken} Token</div>
                        </div>
                      )}
                      {r.status === "lose" && (
                        <div>
                          <span className="inline-flex rounded-full border border-red-400/35 bg-red-400/12 px-2.5 py-1 text-xs font-bold text-red-300">预测错误</span>
                          <div className="mt-1 text-sm font-black text-red-300">-{r.tokenAmount} Token</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show AI result vs user result for settled */}
                  {r.aiPredictions && r.aiPredictions.length > 0 && r.status !== "pending" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.aiPredictions.map((p) => {
                        const aiPick: GuessResult =
                          p.home > p.draw && p.home > p.away ? "teamA" :
                          p.away > p.home && p.away > p.draw ? "teamB" : "draw";
                        const aiCorrect = aiPick === r.selectedResult && r.status === "win";
                        const userPickMatched = aiPick === r.selectedResult;
                        return (
                          <span key={p.personaId} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            r.status === "win" && userPickMatched
                              ? "border-emerald-400/30 text-emerald-300"
                              : r.status === "lose" && userPickMatched
                              ? "border-red-400/30 text-red-300"
                              : "border-white/10 text-slate-500"
                          }`}>
                            {p.emoji} {p.displayName}: {RESULT_LABELS[aiPick]}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ User Leaderboard Tab ═══ */}
      {tab === "leaderboard" && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">积分排行榜</h2>
            <p className="mt-1 text-xs text-slate-500">基于竞猜命中率和 Token 收益排名</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left">排名</th>
                  <th className="px-5 py-3 text-left">用户</th>
                  <th className="px-5 py-3 text-right">Token</th>
                  <th className="hidden px-5 py-3 text-right sm:table-cell">参与</th>
                  <th className="hidden px-5 py-3 text-right sm:table-cell">命中</th>
                  <th className="px-5 py-3 text-right">命中率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {userLeaderboard.map((e) => (
                  <tr key={e.rank} className={`transition ${e.isMe ? "bg-emerald-400/5" : "hover:bg-white/[0.03]"}`}>
                    <td className="px-5 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                        e.rank <= 3 ? "bg-gold-500/15 text-gold-300" : "bg-white/5 text-slate-400"
                      }`}>{e.rank}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-white">
                      {e.name} {e.isMe && <span className="ml-1 text-[10px] text-emerald-400">(我)</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-black tabular-nums text-emerald-300">{e.token.toLocaleString()}</td>
                    <td className="hidden px-5 py-3 text-right tabular-nums text-slate-400 sm:table-cell">{e.totalGuesses}</td>
                    <td className="hidden px-5 py-3 text-right tabular-nums text-slate-400 sm:table-cell">{e.wins}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-white">{e.winRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/10 px-5 py-3 text-center text-xs text-slate-500">
            数据基于本地竞猜记录，排行榜将在多人模式上线后扩展
          </div>
        </div>
      )}

      {/* ═══ AI Leaderboard Tab ═══ */}
      {tab === "ai-leaderboard" && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">AI 排行榜</h2>
            <p className="mt-1 text-xs text-slate-500">哪个 AI 预测最准？数据来自已结算比赛</p>
          </div>
          {aiLeaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              还没有已结算的比赛数据，竞猜并等待比赛结果揭晓吧
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left">排名</th>
                    <th className="px-5 py-3 text-left">AI 模型</th>
                    <th className="px-5 py-3 text-right">预测场次</th>
                    <th className="px-5 py-3 text-right">命中</th>
                    <th className="px-5 py-3 text-right">命中率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aiLeaderboard.map((e) => (
                    <tr key={e.id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-3">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                          e.rank === 1 ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-slate-400"
                        }`}>{e.rank}</span>
                      </td>
                      <td className="px-5 py-3 font-medium text-white">
                        <span className="mr-2">{e.emoji}</span>{e.name}
                        {e.rank === 1 && <span className="ml-2 text-[10px] text-amber-400">最强预言家</span>}
                        {e.rank === aiLeaderboard.length && aiLeaderboard.length > 1 && <span className="ml-2 text-[10px] text-red-400">常被打脸</span>}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-400">{e.total}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-400">{e.correct}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-white">{e.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 text-center text-xs text-slate-500">
        本功能仅为虚拟 Token 娱乐竞猜，不涉及真实金钱、充值、提现、兑换或任何博彩行为。AI 预测仅供参考娱乐。
      </div>

      {/* Confirm Modal */}
      {showConfirm && selectedMatch && guessResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white">确认竞猜</h3>
            <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">比赛</span>
                <span className="text-white">{selectedMatch.teamA} vs {selectedMatch.teamB}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">预测</span>
                <span className="text-emerald-300 font-bold">
                  {guessResult === "teamA" ? selectedMatch.teamA : guessResult === "teamB" ? selectedMatch.teamB : "平局"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">投入</span>
                <span className="text-white font-bold">{parseInt(guessAmount).toLocaleString()} Token</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5">
                取消
              </button>
              <button onClick={handleSubmitGuess} className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-400">
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-emerald-400/30 bg-[#0a1929] px-5 py-3 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300">&#10003;</span>
            <span className="text-sm font-semibold text-white">竞猜提交成功</span>
          </div>
        </div>
      )}

      {/* Checkin Toast */}
      {showCheckin && (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-amber-400/30 bg-[#0a1929] px-5 py-3 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-amber-300">&#9733;</span>
            <span className="text-sm font-semibold text-white">签到成功 +{CHECKIN_REWARD} Token</span>
          </div>
        </div>
      )}
    </div>
  );
}
