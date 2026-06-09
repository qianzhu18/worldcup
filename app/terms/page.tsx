export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="zen-panel rounded-2xl p-6 md:p-8">
        <div className="mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">
          terms of service
        </div>
        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">服务条款</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          生效日期：2026-06-09。使用 JMWL World Cup 即表示你理解并接受以下条款。
        </p>
      </section>

      <section className="card space-y-5 p-6 text-sm leading-relaxed text-slate-300 md:p-8">
        <div>
          <h2 className="text-xl font-black text-white">信息用途</h2>
          <p className="mt-2">
            本站提供世界杯赛程、球队信息、公开预测市场数据和 AI 生成分析，仅用于研究、娱乐和信息参考，不构成投资、博彩、法律或税务建议。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">预测市场风险</h2>
          <p className="mt-2">
            预测市场价格会快速变化，AI 分析可能错误或过时。你需要自行判断并遵守所在地区法律法规。本站不提供资金托管、下注、交易撮合或收益承诺。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">账号责任</h2>
          <p className="mt-2">
            如果你创建账号，应保护登录方式并对账号下的预测、收藏和互动行为负责。不得尝试绕过访问限制、批量刷写数据或干扰服务运行。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">内容与数据</h2>
          <p className="mt-2">
            公开赛程、球队、市场和 AI 内容可能存在延迟、缺失或错误。我们会尽力维护准确性，但不保证任何数据连续、完整或适合特定目的。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">服务变更</h2>
          <p className="mt-2">
            我们可能调整功能、暂停部分服务或更新条款。重要变更会尽量在站内或相关沟通渠道提示。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">联系我们</h2>
          <p className="mt-2">
            对条款、隐私或合作有问题，可以通过页脚微信二维码联系。
          </p>
        </div>
      </section>
    </div>
  );
}
