import { createSupabaseServerClient } from "./supabase/server";

export type AppProfile = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPrediction = {
  id: string;
  user_id: string;
  game_type: string;
  target_type: string;
  target_id: string;
  selection: string;
  confidence: number | null;
  status: string;
  actual_result: string | null;
  points: number;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export async function getUserByEmail(email: string): Promise<AppProfile | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data as AppProfile | undefined;
}

export async function getUserById(id: string): Promise<AppProfile | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data as AppProfile | undefined;
}

export async function upsertProfile(profile: {
  id: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data as AppProfile;
}

export async function savePrediction(
  userId: string,
  matchId: string,
  prediction: string,
  confidence?: number,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_predictions")
    .upsert(
      {
        user_id: userId,
        game_type: "match_1x2",
        target_type: "match",
        target_id: matchId,
        selection: prediction,
        confidence: confidence ?? null,
      },
      { onConflict: "user_id,game_type,target_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as UserPrediction;
}

export async function getUserPredictions(userId: string): Promise<UserPrediction[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as UserPrediction[];
}

export async function addFavorite(userId: string, itemType: string, itemId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_favorites")
    .upsert(
      { user_id: userId, item_type: itemType, item_id: itemId },
      { onConflict: "user_id,item_type,item_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFavorite(userId: string, itemType: string, itemId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId);
  if (error) throw error;
}

export async function getUserFavorites(userId: string, itemType?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("user_favorites").select("*").eq("user_id", userId);
  if (itemType) query = query.eq("item_type", itemType);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
