import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";
import { getWorldCupMarkets } from "@/lib/polymarket";
import { championProbabilities } from "@/lib/model";
import { TEAMS } from "@/lib/worldcup";

export const metadata: Metadata = {
  title: "World Cup Zen · AI 世界杯预测市场",
  description:
    "聚合 Polymarket / 币安 / OKX 的世界杯预测盘口，以 AI 扫描、价差雷达和胜率模型发现市场错价。",
};

export const revalidate = 120;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Live odds ticker fed by real Polymarket data (fail-soft to model odds).
  let items: { label: string; value: string; up?: boolean }[] = [];
  try {
    const markets = await getWorldCupMarkets();
    const winner = markets.find((m) => m.slug?.includes("winner")) ?? markets[0];
    if (winner) {
      items = winner.outcomes.slice(0, 14).map((o) => ({
        label: o.label,
        value: (o.price * 100).toFixed(1) + "%",
      }));
    }
  } catch {
    items = championProbabilities()
      .slice(0, 12)
      .map((c) => ({ label: c.team.name, value: (c.prob * 100).toFixed(1) + "%" }));
  }
  const codeByName = new Map(TEAMS.map((t) => [t.name, t.code]));
  const tickerItems = items.map((i) => ({ ...i, code: codeByName.get(i.label) }));

  return (
    <html lang="zh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ ["--font-sans" as string]: "'Inter', system-ui, sans-serif" }}>
        <div className="content-layer">
          <Nav />
          <Ticker items={tickerItems} />
          <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">{children}</main>
          <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
            <p>
              盘口数据来自 Polymarket 公开 API（实时）· AI 分析由 MiniMax 生成。足球赛程 / 球员为示例数据。
            </p>
            <p className="mt-1">
              ⚠️ 本站仅供信息参考，非投资建议。预测市场存在风险，请遵守所在地区法律。
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
