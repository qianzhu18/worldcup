// TokenDance (词元跳动) OpenAI-compatible gateway client for AI odds analysis.
// Principle: the AI prices events BLIND to any market/Polymarket price, so the
// AI-vs-market comparison stays meaningful. Server-side only; results cached.
// Supports model fallback: primary -> fallback1 -> fallback2.
import { TEAMS, teamByCode } from "./worldcup";
import { aiMatchProbabilities } from "./model";
import { proxyFetch } from "./proxy-fetch";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_AI_TIMEOUT_MS = 45_000;
const DEFAULT_AI_BATTLE_TIMEOUT_MS = 8_000;

// Read env at call time (Cloudflare Workers only populate env per-request).
function cfg() {
  return {
    BASE: process.env.AI_BASE_URL || "https://tokendance.space/gateway/v1",
    MODEL: process.env.AI_MODEL || "minimax-m3:free",
    FALLBACKS: (process.env.AI_FALLBACK_MODELS || "deepseek-v4-pro,qwen3.7-max")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    KEY: process.env.AI_API_KEY,
  };
}

function envTimeoutMs(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1_000, Math.min(value, DEFAULT_AI_TIMEOUT_MS));
}

async function callModel(
  base: string,
  model: string,
  key: string,
  messages: Msg[],
  maxTokens: number,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await proxyFetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`${model} HTTP ${r.status}: ${body.slice(0, 200)}`);
    }
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Try primary model, then fallbacks in order.
async function chat(messages: Msg[], maxTokens = 1400): Promise<string> {
  const { BASE, MODEL, FALLBACKS, KEY } = cfg();
  if (!KEY) throw new Error("AI_API_KEY missing");

  const models = [MODEL, ...FALLBACKS];
  let lastErr: Error | null = null;

  for (const model of models) {
    try {
      return await callModel(BASE, model, KEY, messages, maxTokens);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.warn(`[ai] ${model} failed: ${lastErr.message}, trying next...`);
    }
  }
  throw lastErr || new Error("all AI models failed");
}

function extractJSON<T>(s: string): T {
  const cleaned = s.replace(/```json/gi, "").replace(/```/g, "");
  const start = cleaned.search(/[[{]/);
  if (start < 0) throw new Error("no json in response");
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

// ---- tiny in-memory TTL cache (per server process) ----
const cache = new Map<string, { t: number; v: unknown }>();
const TTL = 30 * 60 * 1000; // 30 min
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v as T;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

export type AiChampion = { code: string; name: string; prob: number; factors: string[] };

// Independent (blind-to-market) champion probability for top contenders.
export async function aiChampionAnalysis(): Promise<AiChampion[]> {
  return cached("champ", async () => {
    const contenders = [...TEAMS].sort((a, b) => b.elo - a.elo).slice(0, 12);
    const list = contenders.map((t) => `${t.name}(FIFA#${t.fifaRank})`).join(", ");
    const sys: Msg = {
      role: "system",
      content:
        "你是资深足球赛事分析师，为 2026 年世界杯做夺冠概率的独立评估。" +
        "只依据你对各队实力、阵容深度、近期状态与历史大赛表现的认知给出判断，" +
        "严禁参考任何博彩公司或预测市场（如 Polymarket）的赔率。",
    };
    const usr: Msg = {
      role: "user",
      content:
        `请为以下球队各自评估夺得 2026 世界杯冠军的概率（百分比，各队独立估计，不必加和为100）：\n${list}\n\n` +
        `只返回 JSON 数组，每个元素：{"team": 英文队名(与上面一致), "prob": 数字(0-100), "factors": [两条简短中文关键理由]}。不要输出 JSON 以外的任何文字。`,
    };
    const raw = await chat([sys, usr]);
    const arr = extractJSON<{ team: string; prob: number; factors: string[] }[]>(raw);
    const byName = new Map(TEAMS.map((t) => [t.name.toLowerCase(), t]));
    return arr
      .map((a) => {
        const t = byName.get(String(a.team).toLowerCase());
        if (!t) return null;
        return {
          code: t.code,
          name: t.name,
          prob: Math.max(0, Math.min(100, Number(a.prob))) / 100,
          factors: Array.isArray(a.factors) ? a.factors.slice(0, 2) : [],
        };
      })
      .filter(Boolean) as AiChampion[];
  });
}

export type AiMatch = {
  home: number;
  draw: number;
  away: number;
  confidence: number;
  factors: string[];
  summary: string;
};

export async function aiMatchAnalysis(homeCode: string, awayCode: string): Promise<AiMatch> {
  const h = teamByCode(homeCode);
  const a = teamByCode(awayCode);
  if (!h || !a) throw new Error("unknown teams");
  return cached(`match:${homeCode}:${awayCode}`, async () => {
    const sys: Msg = {
      role: "system",
      content:
        "你是资深足球赛事分析师。为指定对阵做独立的胜平负概率评估，" +
        "只依据两队实力、阵容、近期状态与战术克制，严禁参考任何博彩或预测市场赔率。",
    };
    const usr: Msg = {
      role: "user",
      content:
        `对阵：${h.name}(主, FIFA#${h.fifaRank}) vs ${a.name}(客, FIFA#${a.fifaRank})，2026 世界杯小组赛，中立球场。\n` +
        `只返回 JSON：{"home": 主胜概率%, "draw": 平局概率%, "away": 客胜概率%, "confidence": 0到1的把握度, "factors": [三条简短中文关键依据], "summary": "一句话中文总结"}。三个概率加和为100。不要输出 JSON 以外的文字。`,
    };
    const raw = await chat([sys, usr], 900);
    const o = extractJSON<any>(raw);
    const sum = (Number(o.home) + Number(o.draw) + Number(o.away)) || 100;
    return {
      home: Number(o.home) / sum,
      draw: Number(o.draw) / sum,
      away: Number(o.away) / sum,
      confidence: Math.max(0, Math.min(1, Number(o.confidence) || 0.5)),
      factors: Array.isArray(o.factors) ? o.factors.slice(0, 3) : [],
      summary: String(o.summary || ""),
    };
  });
}

// Safe wrappers — never break the page if AI is unavailable.
export async function safeChampion(): Promise<AiChampion[]> {
  try {
    return await aiChampionAnalysis();
  } catch {
    return [];
  }
}
export async function safeMatch(h: string, a: string): Promise<AiMatch | null> {
  try {
    return await aiMatchAnalysis(h, a);
  } catch {
    return null;
  }
}

// ---- Multi-model "AI Battle" predictions ----
export type AiPersona = {
  id: string;
  model: string;
  displayName: string;
  emoji: string;
  systemPrompt: string;
  color: string;
};

export const AI_PERSONAS: AiPersona[] = [
  {
    id: "minimax",
    model: "minimax-m3:free",
    displayName: "MiniMax",
    emoji: "📊",
    color: "emerald",
    systemPrompt:
      "你是「数据派分析师 MiniMax」，风格理性严谨，极度依赖 FIFA 排名、ELO 评分、历史交锋数据和统计模型。" +
      "你的口头禅是「数据不会说谎」。偶尔会嘲讽其他 AI 不看数据。" +
      "为指定对阵做独立的胜平负概率评估，只依据客观数据。",
  },
  {
    id: "deepseek",
    model: "deepseek-v4-pro",
    displayName: "DeepSeek",
    emoji: "♟️",
    color: "blue",
    systemPrompt:
      "你是「战术大师 DeepSeek」，风格深谋远虑，擅长分析阵型克制、球员状态、教练战术和近期表现。" +
      "你的口头禅是「战术决定一切」。喜欢指出数据派的盲点。" +
      "为指定对阵做独立的胜平负概率评估，侧重战术层面分析。",
  },
  {
    id: "qwen",
    model: "qwen3.7-max",
    displayName: "Qwen",
    emoji: "🔮",
    color: "purple",
    systemPrompt:
      "你是「直觉型预言家 Qwen」，风格感性直觉，相信大赛气场、球队精神面貌和「足球是圆的」哲学。" +
      "你的口头禅是「足球不是数学题」。喜欢挑战冷门，相信奇迹。" +
      "为指定对阵做独立的胜平负概率评估，侧重心理和气场因素。",
  },
];

export type AiBattleResult = {
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
};

function normalizeBattleProbabilities(home: number, draw: number, away: number) {
  const safeHome = Math.max(0.05, home);
  const safeDraw = Math.max(0.08, draw);
  const safeAway = Math.max(0.05, away);
  const sum = safeHome + safeDraw + safeAway;
  return {
    home: safeHome / sum,
    draw: safeDraw / sum,
    away: safeAway / sum,
  };
}

function localBattlePrediction(homeCode: string, awayCode: string, persona: AiPersona): AiBattleResult {
  const h = teamByCode(homeCode);
  const a = teamByCode(awayCode);
  if (!h || !a) throw new Error("unknown teams");

  const base = aiMatchProbabilities(homeCode, awayCode);
  const eloDiff = h.elo - a.elo;
  const favorite = eloDiff >= 0 ? h : a;
  let home = base.home;
  let draw = base.draw;
  let away = base.away;
  let confidence = 0.66;
  let factors: string[] = [];
  let summary = "";

  if (persona.id === "deepseek") {
    const tacticalTilt = Math.min(0.04, Math.abs(eloDiff) / 10_000);
    if (eloDiff >= 0) home += tacticalTilt;
    else away += tacticalTilt;
    draw -= tacticalTilt / 2;
    confidence = 0.64 + Math.min(0.16, Math.abs(eloDiff) / 2_500);
    factors = [
      `${favorite.zh}综合强度略占上风，战术容错更高`,
      `ELO 差值 ${Math.abs(eloDiff)}，比赛走势仍保留平局空间`,
      "外部 AI 暂不可用，使用本地战术兜底模型",
    ];
    summary = `战术盘面更偏向${favorite.zh}，但世界杯小组赛节奏不会太开放。`;
  } else if (persona.id === "qwen") {
    const upsetTilt = 0.035;
    if (eloDiff >= 0) away += upsetTilt;
    else home += upsetTilt;
    draw += 0.025;
    if (eloDiff >= 0) home -= upsetTilt + 0.015;
    else away -= upsetTilt + 0.015;
    confidence = 0.58;
    factors = [
      "大赛首轮容易受心理状态和临场节奏影响",
      "弱势方仍有制造冷门或拖入平局的窗口",
      "外部 AI 暂不可用，使用本地直觉兜底模型",
    ];
    summary = "足球不是数学题，这场要给冷门和僵局留一点想象空间。";
  } else {
    confidence = 0.68 + Math.min(0.18, Math.abs(eloDiff) / 2_800);
    factors = [
      `${h.zh} ELO ${h.elo}，${a.zh} ELO ${a.elo}`,
      `${h.zh} FIFA#${h.fifaRank} vs ${a.zh} FIFA#${a.fifaRank}`,
      "外部 AI 暂不可用，使用本地数据兜底模型",
    ];
    summary = `数据模型给出${favorite.zh}更高胜面，平局概率取决于双方实力接近程度。`;
  }

  const normalized = normalizeBattleProbabilities(home, draw, away);
  return {
    personaId: persona.id,
    displayName: persona.displayName,
    emoji: persona.emoji,
    color: persona.color,
    home: normalized.home,
    draw: normalized.draw,
    away: normalized.away,
    confidence: Math.max(0, Math.min(1, confidence)),
    factors,
    summary,
  };
}

export async function aiMatchPrediction(
  homeCode: string,
  awayCode: string,
  persona: AiPersona,
): Promise<AiBattleResult> {
  const h = teamByCode(homeCode);
  const a = teamByCode(awayCode);
  if (!h || !a) throw new Error("unknown teams");

  const cacheKey = `battle:${persona.id}:${homeCode}:${awayCode}`;
  return cached(cacheKey, async () => {
    const sys: Msg = { role: "system", content: persona.systemPrompt };
    const usr: Msg = {
      role: "user",
      content:
        `对阵：${h.name}(主, FIFA#${h.fifaRank}, ELO ${h.elo}) vs ${a.name}(客, FIFA#${a.fifaRank}, ELO ${a.elo})，2026 世界杯，中立球场。\n` +
        `只返回 JSON：{"home": 主胜概率%, "draw": 平局概率%, "away": 客胜概率%, "confidence": 0到1, "factors": [三条简短中文理由], "summary": "一句话中文总结（带点你的人设风格）"}。三个概率加和为100。`,
    };
    const { BASE, KEY } = cfg();
    if (!KEY) throw new Error("AI_API_KEY missing");
    const raw = await callModel(
      BASE,
      persona.model,
      KEY,
      [sys, usr],
      900,
      envTimeoutMs("AI_BATTLE_MODEL_TIMEOUT_MS", DEFAULT_AI_BATTLE_TIMEOUT_MS),
    );
    const o = extractJSON<any>(raw);
    const sum = (Number(o.home) + Number(o.draw) + Number(o.away)) || 100;
    return {
      personaId: persona.id,
      displayName: persona.displayName,
      emoji: persona.emoji,
      color: persona.color,
      home: Number(o.home) / sum,
      draw: Number(o.draw) / sum,
      away: Number(o.away) / sum,
      confidence: Math.max(0, Math.min(1, Number(o.confidence) || 0.5)),
      factors: Array.isArray(o.factors) ? o.factors.slice(0, 3) : [],
      summary: String(o.summary || ""),
    };
  });
}

export async function safeBattlePrediction(
  homeCode: string,
  awayCode: string,
): Promise<AiBattleResult[]> {
  const timeoutMs = envTimeoutMs("AI_BATTLE_MODEL_TIMEOUT_MS", DEFAULT_AI_BATTLE_TIMEOUT_MS) + 1_000;
  const results = await Promise.all(
    AI_PERSONAS.map(async (p) => {
      try {
        return await withTimeout(aiMatchPrediction(homeCode, awayCode, p), timeoutMs, `AI battle ${p.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[ai-battle] ${p.id} failed: ${message}; using local fallback`);
        return localBattlePrediction(homeCode, awayCode, p);
      }
    }),
  );
  return results;
}
