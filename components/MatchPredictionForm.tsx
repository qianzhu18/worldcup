"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  modelSnapshot?: Record<string, unknown>;
};

const OPTIONS = [
  { value: "home", label: "主胜" },
  { value: "draw", label: "平局" },
  { value: "away", label: "客胜" },
];

export function MatchPredictionForm({
  matchId,
  homeLabel,
  awayLabel,
  kickoff,
  modelSnapshot,
}: Props) {
  const [userReady, setUserReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [selection, setSelection] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useMemo(() => new Date(kickoff) <= new Date(), [kickoff]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const isSignedIn = !!data.user;
      setSignedIn(isSignedIn);
      setUserReady(true);
      if (isSignedIn) {
        fetch(`/api/predictions?game_type=match_1x2&target_id=${encodeURIComponent(matchId)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            const current = json?.predictions?.[0];
            if (current) {
              setSelection(current.selection);
              setConfidence(Number(current.confidence ?? 3));
            }
          })
          .catch(() => {});
      }
    });
  }, [matchId]);

  async function save() {
    setMessage("");
    if (!selection) {
      setMessage("请选择一个结果。");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameType: "match_1x2",
        targetId: matchId,
        selection,
        confidence,
        metadata: {
          homeLabel,
          awayLabel,
          kickoff,
          modelSnapshot: modelSnapshot ?? {},
        },
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "预测已保存。" : "保存失败，请稍后重试。");
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mono text-[11px] uppercase tracking-[0.26em] text-emerald-300">
            prediction arena
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">提交你的胜平负预测</h2>
          <p className="mt-1 text-sm text-slate-400">
            {homeLabel} vs {awayLabel}
          </p>
        </div>
        <Link href="/predictions" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
          我的预测
        </Link>
      </div>

      {!userReady ? (
        <div className="mt-4 h-10 animate-pulse rounded-xl bg-white/10" />
      ) : !signedIn ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-slate-300">
          <Link href="/login" className="font-bold text-emerald-300 hover:text-emerald-200">
            登录
          </Link>
          后即可保存预测并进入排行榜。
        </div>
      ) : locked ? (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-400/5 p-4 text-sm text-orange-200">
          本场已开赛或锁盘，无法提交新预测。
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((option) => {
              const label =
                option.value === "home"
                  ? `${homeLabel}胜`
                  : option.value === "away"
                    ? `${awayLabel}胜`
                    : option.label;
              const active = selection === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelection(option.value)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                    active
                      ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              信心值 {confidence}/5
            </span>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-400"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存预测"}
            </button>
            {message && <span className="text-sm text-slate-300">{message}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
