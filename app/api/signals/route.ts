import { NextResponse } from "next/server";
import { getWorldCupMarkets } from "@/lib/polymarket";
import { safeChampion } from "@/lib/ai";
import { rankChampionSignals, assessPortfolioRisk } from "@/lib/edge-engine";
import { getSignalPerformance, recordSignal, captureMarketSnapshot } from "@/lib/signal-tracker";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includePerformance = searchParams.get("performance") === "true";
    const includeAi = searchParams.get("ai") === "true";
    const track = searchParams.get("track") === "true";

    // Fetch live market data
    const markets = await getWorldCupMarkets();
    const winner = markets.find((m) => m.slug?.includes("winner"));

    if (!winner) {
      return NextResponse.json({ error: "No winner market found" }, { status: 404 });
    }

    // Fetch AI predictions only when explicitly requested. The live dashboard
    // prioritizes responsiveness and can still rank signals from market+model.
    const aiChampion = includeAi ? await withTimeout(safeChampion(), 8000, []) : [];

    // Compute edge signals
    const signals = rankChampionSignals(winner.outcomes, aiChampion);

    // Durable tracking should run from a scheduled/admin context. Keep request-time
    // writes opt-in so public reads stay fast even when Supabase or RLS is slow.
    if (track) {
      void recordSignalsBestEffort(winner, signals);
    }

    // Portfolio risk assessment
    const portfolioRisk = assessPortfolioRisk(signals);

    // Performance stats (optional)
    let performance = null;
    if (includePerformance) {
      performance = await withTimeout(getSignalPerformance("champion", 30), 3000, null);
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function recordSignalsBestEffort(
  winner: {
    slug: string;
    volume?: number;
    liquidity?: number;
  },
  signals: ReturnType<typeof rankChampionSignals>,
) {
  await Promise.allSettled(
    signals.map(async (signal) => {
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
    }),
  );
}
