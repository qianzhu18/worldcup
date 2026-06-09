// Core edge computation engine: fuses market, model, and AI signals
// into actionable trade recommendations with position sizing.

import { AiChampion, AiMatch } from "./ai";
import { championProbabilities, modelChampionFor, matchProbabilities } from "./model";
import { teamByCode } from "./worldcup";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalSource = "model" | "ai" | "fused";

export type EdgeSignal = {
  team: string;
  teamCode: string;
  // Probabilities
  marketProb: number;      // Polymarket implied
  modelProb: number;       // Elo model
  aiProb?: number;         // AI blind estimate
  fusedProb: number;       // Weighted combination
  // Edge metrics
  rawEdge: number;         // fused - market
  adjustedEdge: number;    // After fees/spread
  confidence: number;      // 0-1 signal strength
  // Recommendation
  action: "STRONG_YES" | "YES" | "LEAN_YES" | "WATCH" | "LEAN_NO" | "NO" | "STRONG_NO";
  kellyFraction: number;   // Optimal bet size (Kelly criterion)
  expectedValue: number;   // EV per $1
  // Metadata
  sources: SignalSource[];
  factors: string[];
};

export type MatchEdgeSignal = {
  matchId: string;
  home: string;
  away: string;
  // Market odds (if available)
  marketHome?: number;
  marketDraw?: number;
  marketAway?: number;
  // Our probabilities
  modelHome: number;
  modelDraw: number;
  modelAway: number;
  aiHome?: number;
  aiDraw?: number;
  aiAway?: number;
  fusedHome: number;
  fusedDraw: number;
  fusedAway: number;
  // Best edge
  bestEdge: {
    outcome: "home" | "draw" | "away";
    action: EdgeSignal["action"];
    edge: number;
    kelly: number;
    ev: number;
  };
  confidence: number;
  factors: string[];
};

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  // Polymarket fee structure
  PLATFORM_FEE: 0.02,        // 2% on winnings
  SPREAD_ESTIMATE: 0.015,     // ~1.5% bid-ask spread

  // Edge thresholds (after fees)
  STRONG_EDGE: 0.12,          // 12%+ = strong signal
  YES_EDGE: 0.06,             // 6%+ = yes
  LEAN_EDGE: 0.03,            // 3%+ = lean
  WATCH_EDGE: 0.01,           // 1%+ = watch

  // Kelly criterion parameters
  KELLY_FRACTION: 0.25,       // Quarter Kelly (conservative)
  MAX_BET_SIZE: 0.10,         // Max 10% of bankroll per bet
  MIN_BET_SIZE: 0.01,         // Min 1%

  // Signal fusion weights
  MODEL_WEIGHT: 0.55,         // Elo model weight
  AI_WEIGHT: 0.35,            // AI weight
  MARKET_CONTRARIAN: 0.10,   // Contrarian weight (fade extreme market)

  // Confidence thresholds
  MIN_AI_AGREEMENT: 0.6,     // Model and AI must agree on direction
  HIGH_CONFIDENCE: 0.8,
  LOW_CONFIDENCE: 0.4,
} as const;

// ─── Core Edge Computation ────────────────────────────────────────────────────

/**
 * Compute edge for a champion market outcome.
 * Fuses Elo model + AI blind estimate + market contrarian signal.
 */
export function computeChampionEdge(
  teamCode: string,
  marketProb: number,
  aiProb?: number,
  aiFactors?: string[],
): EdgeSignal {
  const team = teamByCode(teamCode)?.name ?? teamCode;
  const modelProb = modelChampionFor(teamCode);

  // Fuse signals
  const fusedProb = fuseProbabilities(modelProb, aiProb, marketProb);

  // Raw edge vs market
  const rawEdge = fusedProb - marketProb;

  // Adjust for fees: you pay ~3.5% total (platform fee + spread)
  const feeAdjustment = CONFIG.PLATFORM_FEE * 0.5 + CONFIG.SPREAD_ESTIMATE;
  const adjustedEdge = rawEdge > 0
    ? rawEdge - feeAdjustment
    : rawEdge + feeAdjustment;

  // Confidence based on source agreement
  const confidence = computeConfidence(modelProb, aiProb, marketProb);

  // Kelly criterion for position sizing
  const kellyFraction = kellyCriterion(fusedProb, marketProb);

  // Expected value per $1
  const expectedValue = computeEV(fusedProb, marketProb);

  // Determine action
  const action = determineAction(adjustedEdge, confidence);

  // Build factors list
  const factors = buildFactors(modelProb, aiProb, marketProb, aiFactors);

  return {
    team,
    teamCode,
    marketProb,
    modelProb,
    aiProb,
    fusedProb,
    rawEdge,
    adjustedEdge,
    confidence,
    action,
    kellyFraction,
    expectedValue,
    sources: aiProb !== undefined ? ["model", "ai", "fused"] : ["model", "fused"],
    factors,
  };
}

/**
 * Compute edge for a match 1X2 market.
 */
export function computeMatchEdge(
  homeCode: string,
  awayCode: string,
  marketHome?: number,
  marketDraw?: number,
  marketAway?: number,
  aiMatch?: AiMatch,
): MatchEdgeSignal {
  // Model probabilities
  const model = matchProbabilities(homeCode, awayCode);

  // Fuse with AI if available
  const fusedHome = fuseSingle(model.home, aiMatch?.home, marketHome);
  const fusedDraw = fuseSingle(model.draw, aiMatch?.draw, marketDraw);
  const fusedAway = fuseSingle(model.away, aiMatch?.away, marketAway);

  // Normalize fused probabilities
  const fusedSum = fusedHome + fusedDraw + fusedAway;
  const normHome = fusedHome / fusedSum;
  const normDraw = fusedDraw / fusedSum;
  const normAway = fusedAway / fusedSum;

  // Compute edges for each outcome
  const edges = [
    { outcome: "home" as const, prob: normHome, market: marketHome },
    { outcome: "draw" as const, prob: normDraw, market: marketDraw },
    { outcome: "away" as const, prob: normAway, market: marketAway },
  ].filter((e) => e.market !== undefined);

  // Find best edge
  let bestEdge: { outcome: "home" | "draw" | "away"; action: EdgeSignal["action"]; edge: number; kelly: number; ev: number } = {
    outcome: "home",
    action: "WATCH",
    edge: 0,
    kelly: 0,
    ev: 0,
  };

  for (const e of edges) {
    const rawEdge = e.prob - e.market!;
    const feeAdj = CONFIG.PLATFORM_FEE * 0.5 + CONFIG.SPREAD_ESTIMATE;
    const adjEdge = rawEdge > 0 ? rawEdge - feeAdj : rawEdge + feeAdj;
    const kelly = kellyCriterion(e.prob, e.market!);
    const ev = computeEV(e.prob, e.market!);
    const action = determineAction(adjEdge, 0.7); // Default confidence for matches

    if (Math.abs(adjEdge) > Math.abs(bestEdge.edge)) {
      bestEdge = { outcome: e.outcome, action, edge: adjEdge, kelly, ev };
    }
  }

  // Confidence from model-AI agreement
  const confidence = aiMatch
    ? computeMatchConfidence(model, aiMatch)
    : 0.5;

  return {
    matchId: `${homeCode}-${awayCode}`,
    home: homeCode,
    away: awayCode,
    marketHome,
    marketDraw,
    marketAway,
    modelHome: model.home,
    modelDraw: model.draw,
    modelAway: model.away,
    aiHome: aiMatch?.home,
    aiDraw: aiMatch?.draw,
    aiAway: aiMatch?.away,
    fusedHome: normHome,
    fusedDraw: normDraw,
    fusedAway: normAway,
    bestEdge,
    confidence,
    factors: buildMatchFactors(model, aiMatch, marketHome, marketDraw, marketAway),
  };
}

// ─── Signal Fusion ────────────────────────────────────────────────────────────

function fuseProbabilities(modelProb: number, aiProb?: number, marketProb?: number): number {
  if (aiProb === undefined) {
    // No AI signal, use model only
    return modelProb;
  }

  // Weighted average of model and AI
  const modelWeight = CONFIG.MODEL_WEIGHT;
  const aiWeight = CONFIG.AI_WEIGHT;
  const totalWeight = modelWeight + aiWeight;

  let fused = (modelProb * modelWeight + aiProb * aiWeight) / totalWeight;

  // Contrarian adjustment: if market is extreme, nudge slightly against
  if (marketProb !== undefined) {
    const marketExtreme = Math.abs(marketProb - 0.5) > 0.3;
    if (marketExtreme) {
      const contrarianNudge = (0.5 - marketProb) * CONFIG.MARKET_CONTRARIAN;
      fused = fused * (1 - CONFIG.MARKET_CONTRARIAN) + (fused + contrarianNudge) * CONFIG.MARKET_CONTRARIAN;
    }
  }

  return Math.max(0.001, Math.min(0.999, fused));
}

function fuseSingle(modelProb: number, aiProb?: number, marketProb?: number): number {
  if (aiProb === undefined) return modelProb;
  const w = CONFIG.MODEL_WEIGHT + CONFIG.AI_WEIGHT;
  return (modelProb * CONFIG.MODEL_WEIGHT + aiProb * CONFIG.AI_WEIGHT) / w;
}

// ─── Confidence Scoring ───────────────────────────────────────────────────────

function computeConfidence(modelProb: number, aiProb?: number, marketProb?: number): number {
  let confidence = 0.5; // Base

  // Model-AI agreement
  if (aiProb !== undefined) {
    const agreement = 1 - Math.abs(modelProb - aiProb) / Math.max(modelProb, aiProb, 0.01);
    confidence += agreement * 0.3;
  }

  // Edge magnitude (bigger edge = more confident, up to a point)
  if (marketProb !== undefined) {
    const edge = Math.abs(modelProb - marketProb);
    confidence += Math.min(edge * 2, 0.2); // Cap at 0.2 boost
  }

  return Math.max(0.1, Math.min(1, confidence));
}

function computeMatchConfidence(model: { home: number; draw: number; away: number }, ai: AiMatch): number {
  // Agreement between model and AI on direction
  const modelBest = model.home > model.away ? "home" : "away";
  const aiBest = ai.home > ai.away ? "home" : "away";
  const directionAgreement = modelBest === aiBest ? 0.3 : 0;

  // Magnitude agreement
  const homeDiff = Math.abs(model.home - ai.home);
  const awayDiff = Math.abs(model.away - ai.away);
  const magnitudeAgreement = 1 - (homeDiff + awayDiff) / 2;

  return Math.max(0.2, Math.min(1, 0.4 + directionAgreement + magnitudeAgreement * 0.3));
}

// ─── Kelly Criterion ──────────────────────────────────────────────────────────

/**
 * Fractional Kelly criterion for bet sizing.
 * Returns fraction of bankroll to bet (0 to MAX_BET_SIZE).
 */
function kellyCriterion(winProb: number, marketProb: number): number {
  if (marketProb <= 0 || marketProb >= 1 || winProb <= 0) return 0;

  // Decimal odds from market probability
  const odds = 1 / marketProb;

  // Kelly formula: f* = (p * b - q) / b
  // where p = win prob, q = 1-p, b = net odds (odds - 1)
  const b = odds - 1;
  const q = 1 - winProb;
  const kelly = (winProb * b - q) / b;

  if (kelly <= 0) return 0;

  // Apply fractional Kelly (conservative)
  const fractionalKelly = kelly * CONFIG.KELLY_FRACTION;

  // Clamp to min/max
  return Math.max(CONFIG.MIN_BET_SIZE, Math.min(CONFIG.MAX_BET_SIZE, fractionalKelly));
}

// ─── Expected Value ───────────────────────────────────────────────────────────

function computeEV(winProb: number, marketProb: number): number {
  if (marketProb <= 0) return 0;
  const odds = 1 / marketProb;
  return winProb * (odds - 1) - (1 - winProb);
}

// ─── Action Determination ─────────────────────────────────────────────────────

function determineAction(edge: number, confidence: number): EdgeSignal["action"] {
  // Adjust thresholds by confidence
  const adjStrong = CONFIG.STRONG_EDGE * (1 + (1 - confidence) * 0.5);
  const adjYes = CONFIG.YES_EDGE * (1 + (1 - confidence) * 0.3);
  const adjLean = CONFIG.LEAN_EDGE * (1 + (1 - confidence) * 0.2);

  if (edge >= adjStrong) return "STRONG_YES";
  if (edge >= adjYes) return "YES";
  if (edge >= adjLean) return "LEAN_YES";
  if (edge <= -adjStrong) return "STRONG_NO";
  if (edge <= -adjYes) return "NO";
  if (edge <= -adjLean) return "LEAN_NO";
  return "WATCH";
}

// ─── Factor Building ──────────────────────────────────────────────────────────

function buildFactors(
  modelProb: number,
  aiProb: number | undefined,
  marketProb: number,
  aiFactors?: string[],
): string[] {
  const factors: string[] = [];

  const modelEdge = modelProb - marketProb;
  if (Math.abs(modelEdge) > 0.05) {
    factors.push(`量化模型${modelEdge > 0 ? "看好" : "看衰"} ${(Math.abs(modelEdge) * 100).toFixed(1)}%`);
  }

  if (aiProb !== undefined) {
    const aiEdge = aiProb - marketProb;
    if (Math.abs(aiEdge) > 0.05) {
      factors.push(`AI 独立${aiEdge > 0 ? "看好" : "看衰"} ${(Math.abs(aiEdge) * 100).toFixed(1)}%`);
    }

    // Model-AI agreement
    const agreement = (modelEdge > 0) === (aiEdge > 0);
    factors.push(agreement ? "模型与 AI 方向一致" : "模型与 AI 存在分歧");
  }

  if (aiFactors && aiFactors.length > 0) {
    factors.push(...aiFactors.slice(0, 2));
  }

  return factors;
}

function buildMatchFactors(
  model: { home: number; draw: number; away: number },
  ai?: AiMatch,
  marketHome?: number,
  marketDraw?: number,
  marketAway?: number,
): string[] {
  const factors: string[] = [];

  // Model confidence
  const spread = Math.max(model.home, model.draw, model.away) - Math.min(model.home, model.draw, model.away);
  if (spread > 0.3) {
    factors.push("模型认为实力差距明显");
  } else if (spread < 0.1) {
    factors.push("模型认为双方势均力敌");
  }

  // AI factors if available
  if (ai?.factors) {
    factors.push(...ai.factors.slice(0, 2));
  }

  // Market comparison
  if (marketHome !== undefined) {
    const marketEdge = model.home - marketHome;
    if (Math.abs(marketEdge) > 0.05) {
      factors.push(`市场${marketEdge > 0 ? "低估" : "高估"}主队 ${(Math.abs(marketEdge) * 100).toFixed(1)}%`);
    }
  }

  return factors;
}

// ─── Signal Ranking ───────────────────────────────────────────────────────────

export type RankedSignal = EdgeSignal & {
  rank: number;
  signalStrength: "A+" | "A" | "B+" | "B" | "C" | "D";
};

/**
 * Rank and grade champion edge signals.
 */
export function rankChampionSignals(
  marketOutcomes: { label: string; price: number }[],
  aiChampion?: AiChampion[],
): RankedSignal[] {
  const aiByName = new Map((aiChampion ?? []).map((a) => [a.name, a]));
  const modelCodeByName = new Map(championProbabilities().map((c) => [c.team.name, c.team.code]));

  const signals = marketOutcomes
    .map((o) => {
      const aiEntry = aiByName.get(o.label);
      const teamCode = aiEntry?.code ?? modelCodeByName.get(o.label);
      if (!teamCode) return null;

      return computeChampionEdge(
        teamCode,
        o.price,
        aiEntry?.prob,
        aiEntry?.factors,
      );
    })
    .filter(Boolean) as EdgeSignal[];

  // Sort by absolute adjusted edge
  const sorted = [...signals].sort((a, b) => Math.abs(b.adjustedEdge) - Math.abs(a.adjustedEdge));

  // Assign ranks and grades
  return sorted.map((s, i) => {
    const absEdge = Math.abs(s.adjustedEdge);
    let signalStrength: RankedSignal["signalStrength"];

    if (absEdge >= CONFIG.STRONG_EDGE && s.confidence >= CONFIG.HIGH_CONFIDENCE) {
      signalStrength = "A+";
    } else if (absEdge >= CONFIG.YES_EDGE && s.confidence >= 0.6) {
      signalStrength = "A";
    } else if (absEdge >= CONFIG.LEAN_EDGE) {
      signalStrength = s.confidence >= 0.6 ? "B+" : "B";
    } else if (absEdge >= CONFIG.WATCH_EDGE) {
      signalStrength = "C";
    } else {
      signalStrength = "D";
    }

    return { ...s, rank: i + 1, signalStrength };
  });
}

// ─── Portfolio Risk ───────────────────────────────────────────────────────────

export type PortfolioRisk = {
  totalExposure: number;
  correlationRisk: "low" | "medium" | "high";
  maxDrawdown: number;
  recommendation: string;
};

/**
 * Assess portfolio risk for multiple positions.
 */
export function assessPortfolioRisk(signals: EdgeSignal[]): PortfolioRisk {
  // Count active positions
  const activePositions = signals.filter((s) => s.action !== "WATCH");
  const totalExposure = activePositions.reduce((sum, s) => sum + s.kellyFraction, 0);

  // Check correlation (multiple YES on same side = high correlation)
  const yesPositions = activePositions.filter((s) => s.action.includes("YES"));
  const noPositions = activePositions.filter((s) => s.action.includes("NO"));
  const correlationRisk = (yesPositions.length > 3 || noPositions.length > 3)
    ? "high"
    : (yesPositions.length > 1 || noPositions.length > 1)
      ? "medium"
      : "low";

  // Max potential drawdown
  const maxDrawdown = totalExposure * 0.5; // Assume 50% loss rate

  let recommendation: string;
  if (totalExposure > 0.3) {
    recommendation = "持仓过重，建议降低总仓位至 30% 以内";
  } else if (correlationRisk === "high") {
    recommendation = "方向高度相关，建议分散投资";
  } else if (activePositions.length === 0) {
    recommendation = "暂无高确信信号，建议观望";
  } else {
    recommendation = `当前 ${activePositions.length} 个信号，总仓位 ${(totalExposure * 100).toFixed(1)}%，风险可控`;
  }

  return { totalExposure, correlationRisk, maxDrawdown, recommendation };
}
