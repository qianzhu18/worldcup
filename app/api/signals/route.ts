import { NextResponse } from "next/server";
import { getWorldCupMarkets } from "@/lib/polymarket";
import { safeChampion } from "@/lib/ai";
import { rankChampionSignals, assessPortfolioRisk } from "@/lib/edge-engine";
import { getSignalPerformance, recordSignal, captureMarketSnapshot } from "@/lib/signal-tracker";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includePerformance = searchParams.get("performance") === "true";

    // Fetch live market data
    const markets = await getWorldCupMarkets();
    const winner = markets.find((m) => m.slug?.includes("winner"));

    if (!winner) {
      return NextResponse.json({ error: "No winner market found" }, { status: 404 });
    }

    // Fetch AI predictions
    const aiChampion = await safeChampion();

    // Compute edge signals
    const signals = rankChampionSignals(winner.outcomes, aiChampion);

    // Record signals and snapshots for tracking
    for (const signal of signals) {
      await recordSignal({
        signalType: "champion",
        targetId: signal.teamCode,
        marketProb: signal.marketProb,
        modelProb: signal.modelProb,
        aiProb: signal.aiProb,
        fusedProb: signal.fusedProb,
        edge: signal.adjustedEdge,
        action: signal.action,
        kellyFraction: signal.kellyFraction,
        confidence: signal.confidence,
      });

      await captureMarketSnapshot(
        winner.slug,
        signal.team,
        signal.marketProb,
        winner.volume,
        winner.liquidity,
      );
    }

    // Portfolio risk assessment
    const portfolioRisk = assessPortfolioRisk(signals);

    // Performance stats (optional)
    let performance = null;
    if (includePerformance) {
      performance = await getSignalPerformance("champion", 30);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      market: {
        id: winner.id,
        title: winner.title,
        slug: winner.slug,
        volume: winner.volume,
        liquidity: winner.liquidity,
      },
      signals: signals.map((s) => ({
        rank: s.rank,
        team: s.team,
        teamCode: s.teamCode,
        signalStrength: s.signalStrength,
        action: s.action,
        // Probabilities
        marketProb: roundPct(s.marketProb),
        modelProb: roundPct(s.modelProb),
        aiProb: s.aiProb !== undefined ? roundPct(s.aiProb) : null,
        fusedProb: roundPct(s.fusedProb),
        // Edge metrics
        rawEdge: roundPct(s.rawEdge),
        adjustedEdge: roundPct(s.adjustedEdge),
        // Position sizing
        kellyFraction: roundPct(s.kellyFraction),
        expectedValue: round4(s.expectedValue),
        confidence: round4(s.confidence),
        // Explanation
        factors: s.factors,
        sources: s.sources,
      })),
      portfolioRisk,
      performance,
    });
  } catch (error) {
    console.error("[signals API]", error);
    return NextResponse.json(
      { error: "Failed to compute signals" },
      { status: 500 }
    );
  }
}

// Helper to record match signals
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, outcome, result, pnl } = body;

    // This would update signal outcomes for backtesting
    // For now, return acknowledgment
    return NextResponse.json({ success: true, matchId, outcome });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function roundPct(n: number): number {
  return Math.round(n * 10000) / 100; // e.g., 0.1234 -> 12.34
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
