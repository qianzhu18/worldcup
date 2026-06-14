"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";

const links = [
  { href: "/", label: "市场扫描", short: "扫描" },
  { href: "/signals", label: "博弈信号", short: "信号" },
  { href: "/timeline", label: "赛程时间线", short: "赛程" },
  { href: "/leaderboard", label: "竞技排行榜", short: "排行", highlight: true },
  { href: "/teams", label: "球队", short: "球队" },
  { href: "/players", label: "球员", short: "球员" },
  { href: "/sports-guess", label: "体育竞猜", short: "竞猜" },
];

export function Nav() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-400/15 bg-[#05080f]/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-xs font-black text-emerald-300 shadow-glow-electric">
            AI
          </span>
          <span className="text-xl font-black tracking-normal text-white">
            <span className="zen-text">JMWL</span> World Cup
          </span>
          <span className="hidden rounded border border-electric/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-electric sm:inline">
            WC 2026
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-glow-electric"
                    : l.highlight
                      ? "text-gold-300 hover:bg-gold-300/10 hover:text-gold-200"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="hidden rounded-lg bg-gradient-to-r from-gold-300 to-gold-500 px-3 py-1.5 text-xs font-black text-pitch-900 shadow-glow transition hover:brightness-110 sm:inline"
          >
            🏆 AI 对赌
          </Link>
          <AuthButton />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="菜单"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 lg:hidden"
          >
            <span className="text-lg">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-[#05080f]/95 lg:hidden">
          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-1.5 px-4 py-3">
            {links.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border border-white/5 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
