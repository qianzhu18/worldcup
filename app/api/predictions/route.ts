import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { matchById } from "@/lib/worldcup";

const VALID_SELECTIONS = new Set(["home", "draw", "away"]);

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const gameType = searchParams.get("game_type");
  const targetId = searchParams.get("target_id");

  let query = supabase
    .from("user_predictions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (gameType) query = query.eq("game_type", gameType);
  if (targetId) query = query.eq("target_id", targetId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load predictions" }, { status: 500 });
  }

  return NextResponse.json({ predictions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const gameType = String(body?.gameType ?? "match_1x2");
  const targetId = String(body?.targetId ?? "");
  const selection = String(body?.selection ?? "");
  const confidence = Number(body?.confidence ?? 1);
  const metadata = typeof body?.metadata === "object" && body.metadata ? body.metadata : {};

  if (gameType !== "match_1x2" || !targetId || !VALID_SELECTIONS.has(selection)) {
    return NextResponse.json({ error: "Invalid prediction" }, { status: 400 });
  }

  const match = matchById(targetId);
  if (!match || !match.home || !match.away) {
    return NextResponse.json({ error: "Match is not predictable yet" }, { status: 400 });
  }

  const kickoff = new Date(match.kickoff);
  if (Number.isNaN(kickoff.getTime()) || kickoff <= new Date()) {
    return NextResponse.json({ error: "Prediction is locked" }, { status: 409 });
  }

  const boundedConfidence = Math.max(1, Math.min(5, Math.round(confidence)));
  const { data, error } = await supabase
    .from("user_predictions")
    .upsert(
      {
        user_id: user.id,
        game_type: gameType,
        target_type: "match",
        target_id: targetId,
        selection,
        confidence: boundedConfidence,
        metadata,
        locked_at: match.kickoff,
        status: "pending",
      },
      { onConflict: "user_id,game_type,target_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
  }

  return NextResponse.json({ prediction: data });
}
