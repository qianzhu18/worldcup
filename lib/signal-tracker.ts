import { createSupabaseServerClient } from "./supabase/server";

export async function recordSignal(params: {
  signalType: "champion" | "match";
  targetId: string;
  marketProb: number;
  modelProb: number;
  aiProb?: number;
  fusedProb: number;
  edge: number;
  action: string;
  kellyFraction?: number;
  confidence?: number;
}): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("signals")
      .insert({
        signal_type: params.signalType,
        target_id: params.targetId,
        market_prob: params.marketProb,
        model_prob: params.modelProb,
        ai_prob: params.aiProb ?? null,
        fused_prob: params.fusedProb,
        edge: params.edge,
        action: params.action,
        kelly_fraction: params.kellyFraction ?? null,
        confidence: params.confidence ?? null,
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export async function recordOutcome(
  signalId: string,
  outcome: "win" | "loss" | "push",
  actualResult: string,
  pnl: number,
) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("signal_outcomes").insert({
      signal_id: signalId,
      outcome,
      actual_result: actualResult,
      pnl,
      resolved_at: new Date().toISOString(),
    });
  } catch {}
}

export async function captureMarketSnapshot(
  eventSlug: string,
  outcomeLabel: string,
  price: number,
  volume?: number,
  liquidity?: number,
) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("market_snapshots").insert({
      event_slug: eventSlug,
      outcome_label: outcomeLabel,
      price,
      volume: volume ?? null,
      liquidity: liquidity ?? null,
    });
  } catch {}
}

export async function getPriceHistory(
  eventSlug: string,
  outcomeLabel: string,
  hours: number = 24,
) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("market_snapshots")
      .select("price,captured_at")
      .eq("event_slug", eventSlug)
      .eq("outcome_label", outcomeLabel)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export type SignalPerformance = {
  totalSignals: number;
  resolvedSignals: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  avgEdge: number;
  avgConfidence: number;
  totalPnL: number;
  roi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  byAction: Record<string, { count: number; winRate: number; avgPnL: number }>;
  byConfidence: Record<string, { count: number; winRate: number }>;
};

const EMPTY_PERF: SignalPerformance = {
  totalSignals: 0,
  resolvedSignals: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  winRate: 0,
  avgEdge: 0,
  avgConfidence: 0,
  totalPnL: 0,
  roi: 0,
  sharpeRatio: 0,
  maxDrawdown: 0,
  byAction: {},
  byConfidence: {},
};

export async function getSignalPerformance(
  signalType?: "champion" | "match",
  days: number = 30,
): Promise<SignalPerformance> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("signals")
      .select("edge,confidence,action,signal_outcomes(outcome,pnl)")
      .gte("created_at", since);
    if (signalType) query = query.eq("signal_type", signalType);

    const { data, error } = await query;
    if (error || !data) return EMPTY_PERF;

    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let totalPnL = 0;
    let resolved = 0;
    let edgeSum = 0;
    let confidenceSum = 0;

    for (const row of data as any[]) {
      edgeSum += Number(row.edge ?? 0);
      confidenceSum += Number(row.confidence ?? 0);
      const outcome = row.signal_outcomes?.[0];
      if (!outcome) continue;
      if (outcome.outcome === "win") wins += 1;
      if (outcome.outcome === "loss") losses += 1;
      if (outcome.outcome === "push") pushes += 1;
      if (["win", "loss", "push"].includes(outcome.outcome)) resolved += 1;
      totalPnL += Number(outcome.pnl ?? 0);
    }

    const total = data.length;
    const denominator = resolved || 1;
    return {
      ...EMPTY_PERF,
      totalSignals: total,
      resolvedSignals: resolved,
      wins,
      losses,
      pushes,
      winRate: wins / denominator,
      avgEdge: total ? edgeSum / total : 0,
      avgConfidence: total ? confidenceSum / total : 0,
      totalPnL,
      roi: totalPnL / denominator,
    };
  } catch {
    return EMPTY_PERF;
  }
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  totalEdge: number;
  streak: number;
};

export async function getLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("user_predictions")
      .select("user_id,points,status,profiles:user_id(name,email)")
      .eq("status", "settled")
      .order("points", { ascending: false })
      .limit(limit * 20);
    if (error || !data) return [];

    const byUser = new Map<string, LeaderboardEntry>();
    for (const row of data as any[]) {
      const userId = row.user_id as string;
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const entry =
        byUser.get(userId) ??
        {
          rank: 0,
          userId,
          username: profile?.name || profile?.email || "Player",
          totalPredictions: 0,
          correctPredictions: 0,
          accuracy: 0,
          totalEdge: 0,
          streak: 0,
        };
      entry.totalPredictions += 1;
      entry.totalEdge += Number(row.points ?? 0);
      if (Number(row.points ?? 0) > 0) entry.correctPredictions += 1;
      byUser.set(userId, entry);
    }

    return [...byUser.values()]
      .map((entry) => ({
        ...entry,
        accuracy: entry.totalPredictions
          ? entry.correctPredictions / entry.totalPredictions
          : 0,
      }))
      .sort((a, b) => b.totalEdge - a.totalEdge)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  } catch {
    return [];
  }
}

export function scoreSignal(signal: {
  edge: number;
  confidence: number;
  modelProb: number;
  aiProb?: number;
  marketProb: number;
}): number {
  const edgeScore = Math.min(Math.abs(signal.edge) * 100, 50);
  const confidenceScore = signal.confidence * 30;
  let agreementBonus = 0;
  if (signal.aiProb !== undefined) {
    const modelDirection = signal.modelProb > signal.marketProb;
    const aiDirection = signal.aiProb > signal.marketProb;
    agreementBonus = modelDirection === aiDirection ? 20 : 0;
  }
  return Math.min(100, edgeScore + confidenceScore + agreementBonus);
}
