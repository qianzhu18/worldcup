// Server-side Polymarket (Gamma API) client. Public, no key required.
import { TEAMS } from "./worldcup";

const GAMMA = "https://gamma-api.polymarket.com";

export type Outcome = { label: string; price: number };
export type Market = {
  id: string;
  platform: "Polymarket" | "Binance" | "OKX";
  title: string;
  slug: string;
  url: string;
  category: string;
  outcomes: Outcome[];
  volume: number;
  liquidity: number;
  endDate?: string;
  image?: string;
  // computed
  heat: number;
  topOutcome?: Outcome;
};

// Curated set of football-relevant Polymarket event slugs to aggregate.
// More per-match / prop markets list automatically as the tournament nears.
const WC_EVENT_SLUGS = [
  "world-cup-winner",
  "will-any-2026-fifa-world-cup-game-scheduled-in-the-us-be-relocated-abroad",
  "world-cup-golden-boot",
  "world-cup-top-scorer",
  "fifa-world-cup-2026-winner",
];

async function getJSON(url: string) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 120 }, // cache 2 min
  });
  if (!res.ok) throw new Error(`Polymarket ${res.status}`);
  return res.json();
}

function parseArr(s: unknown): string[] {
  try {
    return typeof s === "string" ? JSON.parse(s) : (s as string[]) ?? [];
  } catch {
    return [];
  }
}

function eventToMarket(ev: any): Market {
  const mkts: any[] = ev.markets ?? [];
  const outcomes: Outcome[] = mkts
    .map((m) => {
      const labels = parseArr(m.outcomes);
      const prices = parseArr(m.outcomePrices).map(Number);
      const label = m.groupItemTitle || labels[0] || m.question || "—";
      return { label, price: prices[0] ?? 0 };
    })
    .filter((o) => o.price > 0)
    .sort((a, b) => b.price - a.price);

  const volume = Number(ev.volume ?? 0);
  const liquidity = Number(ev.liquidity ?? 0);
  const vol24 = Number(ev.volume24hr ?? 0);
  // Heat: blend of 24h activity, total volume (log), liquidity, recency to close.
  const heat =
    0.45 * Math.min(1, vol24 / 5_000_000) +
    0.30 * Math.min(1, Math.log10(volume + 1) / 9) +
    0.15 * Math.min(1, liquidity / 2_000_000) +
    0.10 * 1;

  return {
    id: String(ev.id),
    platform: "Polymarket",
    title: (ev.title || "").trim(),
    slug: ev.slug,
    url: `https://polymarket.com/event/${ev.slug}`,
    category: "World Cup",
    outcomes,
    volume,
    liquidity,
    endDate: ev.endDate,
    image: ev.image,
    heat: Math.round(heat * 1000) / 10,
    topOutcome: outcomes[0],
  };
}

export async function getWorldCupMarkets(): Promise<Market[]> {
  const out: Market[] = [];
  const seen = new Set<string>();
  for (const slug of WC_EVENT_SLUGS) {
    try {
      const data = await getJSON(`${GAMMA}/events?slug=${slug}`);
      const events = Array.isArray(data) ? data : [data];
      for (const ev of events) {
        if (!ev || seen.has(String(ev.id))) continue;
        seen.add(String(ev.id));
        out.push(eventToMarket(ev));
      }
    } catch {
      /* skip unavailable slug */
    }
  }
  // Fallback discovery if curated slugs missed: search soccer tag.
  if (out.length === 0) {
    try {
      const data = await getJSON(
        `${GAMMA}/events?closed=false&limit=20&order=volume&ascending=false&tag=soccer`
      );
      for (const ev of data) {
        if (seen.has(String(ev.id))) continue;
        seen.add(String(ev.id));
        out.push(eventToMarket(ev));
      }
    } catch {
      /* ignore */
    }
  }
  return out.sort((a, b) => b.heat - a.heat);
}

// Cross-platform price-divergence radar. Polymarket implied probability vs our
// model's champion probability — surfaces potential value bets / mispricing.
export function divergenceSignals(
  market: Market,
  modelProb: (teamName: string) => number
) {
  return market.outcomes
    .map((o) => {
      const mp = modelProb(o.label);
      return {
        label: o.label,
        market: o.price,
        model: mp,
        edge: mp - o.price, // positive => model thinks underpriced
      };
    })
    .filter((d) => d.model > 0)
    .sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
}

export function teamNameSet(): Set<string> {
  return new Set(TEAMS.map((t) => t.name));
}

// Cross-platform price-divergence radar.
// Anchored on REAL Polymarket prices; Binance/OKX columns are ILLUSTRATIVE
// (deterministic offsets) until those venues' APIs are wired in. The point is to
// demonstrate the arbitrage/价差 surface — biggest spread floats to the top.
export type CrossRow = {
  label: string;
  code?: string;
  polymarket: number;
  binance: number;
  okx: number;
  best: "Polymarket" | "Binance" | "OKX";
  spread: number; // max-min, in probability points
};

export function crossPlatformSpread(market: Market): CrossRow[] {
  const nameToCode = new Map(TEAMS.map((t) => [t.name, t.code]));
  const rows = market.outcomes.slice(0, 8).map((o) => {
    // deterministic pseudo-offsets seeded by label length & first char
    const seed = (o.label.charCodeAt(0) + o.label.length) % 7;
    const bOff = ((seed % 3) - 1) * 0.018 - 0.006;
    const oOff = ((seed % 5) - 2) * 0.012 + 0.004;
    const binance = clamp(o.price + bOff);
    const okx = clamp(o.price + oOff);
    const prices = { Polymarket: o.price, Binance: binance, OKX: okx } as const;
    const best = (Object.keys(prices) as (keyof typeof prices)[]).reduce((a, b) =>
      prices[a] <= prices[b] ? a : b
    );
    const vals = [o.price, binance, okx];
    return {
      label: o.label,
      code: nameToCode.get(o.label),
      polymarket: o.price,
      binance,
      okx,
      best,
      spread: Math.max(...vals) - Math.min(...vals),
    };
  });
  return rows.sort((a, b) => b.spread - a.spread);
}

function clamp(v: number): number {
  return Math.max(0.005, Math.min(0.995, v));
}
