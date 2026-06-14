import Link from "next/link";

type Item = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  tone: "emerald" | "gold" | "electric" | "flame";
};

const ITEMS: Item[] = [
  { href: "/signals", emoji: "📡", title: "博弈信号", desc: "市场·模型·AI 三源融合寻找错价", tone: "emerald" },
  { href: "/leaderboard", emoji: "🏆", title: "AI 对赌榜", desc: "和 AI 对赌，看谁更准", tone: "gold" },
  { href: "/timeline", emoji: "📅", title: "赛程时间线", desc: "104 场小组赛按日扫描", tone: "electric" },
  { href: "/players", emoji: "⭐", title: "球员 Watchlist", desc: "1255 球员六维雷达", tone: "flame" },
];

const TONE: Record<Item["tone"], string> = {
  emerald: "hover:border-emerald-400/40 hover:bg-emerald-400/[0.07]",
  gold: "hover:border-gold-300/40 hover:bg-gold-300/[0.07]",
  electric: "hover:border-electric/40 hover:bg-electric/[0.07]",
  flame: "hover:border-flame/40 hover:bg-flame/[0.07]",
};

const ACCENT: Record<Item["tone"], string> = {
  emerald: "text-emerald-300",
  gold: "text-gold-300",
  electric: "text-electric",
  flame: "text-flame",
};

export function QuickNav() {
  return (
    <section aria-label="快速入口">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#07121b]/82 p-4 transition ${TONE[item.tone]}`}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
            <div className="flex items-start justify-between">
              <span className="text-2xl">{item.emoji}</span>
              <span className={`mono text-[10px] uppercase tracking-widest ${ACCENT[item.tone]}`}>
                →
              </span>
            </div>
            <div className="mt-3 text-base font-black text-white group-hover:text-white">
              {item.title}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-slate-400">{item.desc}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
