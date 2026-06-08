import { SignalDashboard } from "@/components/SignalDashboard";

export const dynamic = "force-dynamic";

export default function SignalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading text-3xl text-white">博弈信号</h1>
        <p className="mt-2 text-slate-400">
          Polymarket 盘口 vs 量化模型 vs AI 独立定价 · 三源融合寻找错价机会
        </p>
      </div>

      {/* Methodology Explanation */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white">信号原理</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
            <div className="text-sm font-bold text-blue-400">量化模型 (55%)</div>
            <p className="mt-2 text-xs text-slate-400">
              基于 Elo 实力评分，叠加教练胜率、近一年状态、球员池强度等多因子调整。
              纯粹基于历史数据，不参考任何市场信息。
            </p>
          </div>
          <div className="rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
            <div className="text-sm font-bold text-purple-400">AI 独立定价 (35%)</div>
            <p className="mt-2 text-xs text-slate-400">
              AI 被严格禁止参考任何博彩或预测市场赔率，仅基于其对球队实力、阵容、
              近期状态和大赛经验的认知给出独立概率。
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="text-sm font-bold text-emerald-400">市场对照 (10%)</div>
            <p className="mt-2 text-xs text-slate-400">
              Polymarket 是真金白银的预测市场。当市场极端时，我们轻微反向调整
              (contrarian)，因为极端价格往往过度反应。
            </p>
          </div>
        </div>
      </div>

      {/* Signal Dashboard */}
      <SignalDashboard />

      {/* How to Use */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white">如何使用信号</h2>
        <div className="mt-4 space-y-4">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-400">
              1
            </span>
            <div>
              <div className="text-sm font-medium text-white">看信号等级</div>
              <p className="text-xs text-slate-400">
                A+ 和 A 级信号是高确信机会，B 级信号值得观察，C/D 级信号建议忽略。
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-400">
              2
            </span>
            <div>
              <div className="text-sm font-medium text-white">看凯利仓位</div>
              <p className="text-xs text-slate-400">
                凯利公式告诉你理论上应该下注多少。我们使用 1/4 凯利（保守策略），
                建议单笔不超过总资金的 10%。
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-400">
              3
            </span>
            <div>
              <div className="text-sm font-medium text-white">看期望值 (EV)</div>
              <p className="text-xs text-slate-400">
                EV 告诉你每投入 $1 预期能赚多少。正 EV 意味着长期来看有利可负，
                但单次结果仍有随机性。
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-400">
              4
            </span>
            <div>
              <div className="text-sm font-medium text-white">看信号因素</div>
              <p className="text-xs text-slate-400">
                点击信号行查看详细因素。如果模型和 AI 方向一致，信号更可靠；
                如果存在分歧，建议降低仓位或观望。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
        <div className="text-sm text-yellow-400">
          ⚠️ 风险提示
        </div>
        <p className="mt-2 text-xs text-slate-400">
          本系统提供的信号仅供参考，不构成投资建议。预测市场存在风险，
          过去的表现不代表未来的结果。请根据自己的风险承受能力做出决策，
          切勿投入超出承受范围的资金。
        </p>
      </div>
    </div>
  );
}
