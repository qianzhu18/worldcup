import { NextResponse } from "next/server";
import { matchById } from "@/lib/worldcup";
import { safeBattlePrediction } from "@/lib/ai";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const match = matchById(matchId);
  if (!match || !match.home || !match.away) {
    return NextResponse.json({ error: "Match not found or teams unknown" }, { status: 404 });
  }

  try {
    const predictions = await safeBattlePrediction(match.home, match.away);
    return NextResponse.json({ matchId, predictions });
  } catch (error) {
    console.error("[ai-predictions]", error);
    return NextResponse.json({ error: "AI prediction failed" }, { status: 500 });
  }
}
