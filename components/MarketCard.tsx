import type { Market } from "@/lib/polymarket";
import { HeatBadge } from "./ui";
import { teamByCode, TEAMS, flag } from "@/lib/worldcup";

function codeForName(name: string): string | undefined {
  return TEAMS.find((t) => t.name === name || t.zh === name)?.code;
}

export function MarketCard({ market, rank }: { market: Market; rank: number }) {
  const top = market.outcomes.slice(0, 4);
  const hot = market.heat >= 60;
  const leading = top[0];
  const confidence = Math.min(0.98, 0.55 + market.heat / 180);
  return (
    <a
      href={market.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card group flex flex-col gap-3 overflow-hidden p-4 animate-fade-up"
    >
      {hot && (
        <span className="halo bg-emerald-400/10" aria-hidden />
      )}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="mono rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-sm font-bold text-emerald-300">
            #{String(rank).padStart(2, "0")}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="chip border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">{market.platform}</span>
              <span className="chip border border-white/10 bg-white/[0.06] text-slate-300">{market.category}</span>
              {hot && <span className="chip border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">LIVE</span>}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-emerald-200">
              {market.title}
            </h3>
          </div>
        </div>
        <HeatBadge heat={market.heat} />
      </div>

      {leading && (
        <div className="rounded-lg border border-emerald-400/15 bg-[#07121b]/80 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Top Outcome</span>
            <span>model confidence {(confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            {codeForName(leading.label) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flag(codeForName(leading.label)!)}
                alt=""
                className="h-4 w-6 rounded-[2px] object-cover"
              />
            )}
            <span className="flex-1 truncate text-sm font-semibold text-slate-100">{leading.label}</span>
            <span className="mono text-lg font-black text-emerald-300">{(leading.price * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {top.map((o) => {
          const code = codeForName(o.label);
          return (
            <div key={o.label} className="flex items-center gap-2">
              {code && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={flag(code)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
              )}
              <span className="w-28 truncate text-xs text-slate-300">{o.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
                  style={{ width: `${Math.min(100, o.price * 100)}%` }}
                />
              </div>
              <span className="mono w-12 text-right text-xs font-semibold tabular-nums text-emerald-300">
                {(o.price * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-1 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs">
        <Metric label="成交" value={`$${abbr(market.volume)}`} />
        <Metric label="热度" value={market.heat.toFixed(1)} accent={hot} />
        <Metric label="状态" value={hot ? "扫描" : "观察"} accent={hot} />
      </div>
    </a>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mono mt-0.5 text-sm font-bold ${accent ? "text-emerald-300" : "text-slate-200"}`}>{value}</div>
    </div>
  );
}

function abbr(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}
