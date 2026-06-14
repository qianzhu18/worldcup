import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";
import { Providers } from "@/components/Providers";
import { getWorldCupMarkets } from "@/lib/polymarket";
import { championProbabilities } from "@/lib/model";
import { TEAMS } from "@/lib/worldcup";

export const metadata: Metadata = {
  title: "JMWL World Cup · AI 世界杯预测市场",
  description:
    "扫描 Polymarket 世界杯预测盘口，以 AI 独立定价、错价雷达和胜率模型发现市场分歧。",
};

export const revalidate = 120;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
        <Providers>
        <div className="content-layer">
          <Nav />
          <Ticker items={tickerItems} />
          <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 pb-10">
            <div className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-[#07121b]/86">
              <div className="relative grid gap-5 px-6 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:px-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(39,245,138,0.10),transparent_38%),radial-gradient(circle_at_88%_45%,rgba(34,211,238,0.08),transparent_34%)]" />
                <div className="relative">
                  <div className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-300">
                    Contact
                  </div>
                  <div className="mt-1.5 text-xl font-black text-white md:text-2xl">
                    {"联系我，聊世界杯预测市场"}
                  </div>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
                    {"有想法、有问题、想合作？扫码加微信随时聊。"}
                  </p>
                </div>

                <div className="relative flex items-center gap-4 md:flex-col md:items-center">
                  <img
                    src="/wechat-qrcode.jpg"
                    alt="微信联系"
                    className="h-24 w-24 rounded-xl border border-emerald-400/30 object-cover shadow-lg md:h-28 md:w-28"
                  />
                  <span className="text-xs font-semibold text-emerald-300 md:mt-1">{"扫码添加微信"}</span>
                </div>
              </div>
              <div className="border-t border-white/10 px-6 py-3 text-center text-[11px] text-slate-500 md:px-8">
                <div>
                  {"盘口数据来自 Polymarket 公开 API（实时）· AI 分析由 TokenDance 多模型路由生成。仅供信息参考，非投资建议。"}
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <a href="/privacy" className="text-slate-400 hover:text-emerald-300">
                    隐私政策
                  </a>
                  <a href="/terms" className="text-slate-400 hover:text-emerald-300">
                    服务条款
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
        </Providers>
      </body>
    </html>
  );
}
