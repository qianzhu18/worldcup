export type TradeAction = "YES" | "NO" | "WATCH";

export type TradeRecommendation = {
  action: TradeAction;
  label: string;
  tone: "yes" | "no" | "watch";
  edge: number;
  reason: string;
};

const MIN_EDGE = 0.02;

export function recommendYesNo(modelProb: number, marketProb: number): TradeRecommendation {
  const edge = modelProb - marketProb;

  if (edge >= MIN_EDGE) {
    return {
      action: "YES",
      label: "买 YES",
      tone: "yes",
      edge,
      reason: `AI 高于市场 ${formatSignedPct(edge)}，YES 有价值空间`,
    };
  }

  if (edge <= -MIN_EDGE) {
    return {
      action: "NO",
      label: "买 NO",
      tone: "no",
      edge,
      reason: `AI 低于市场 ${formatSignedPct(edge)}，NO 更合理`,
    };
  }

  return {
    action: "WATCH",
    label: "观望",
    tone: "watch",
    edge,
    reason: `差值 ${formatSignedPct(edge)}，可能被手续费/点差吃掉`,
  };
}

export function formatSignedPct(value: number): string {
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
