export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="zen-panel rounded-2xl p-6 md:p-8">
        <div className="mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">
          privacy policy
        </div>
        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">隐私政策</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          生效日期：2026-06-09。本政策说明 JMWL World Cup 如何处理账号、预测记录和基础访问数据。
        </p>
      </section>

      <section className="card space-y-5 p-6 text-sm leading-relaxed text-slate-300 md:p-8">
        <div>
          <h2 className="text-xl font-black text-white">我们收集的信息</h2>
          <p className="mt-2">
            当你注册或登录时，Supabase Auth 会处理邮箱、账号标识和会话 Cookie。你提交预测、收藏或使用互动功能时，
            系统会保存相关比赛、选择、信心值、时间戳和必要的账号关联。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">自动生成的数据</h2>
          <p className="mt-2">
            Vercel、Supabase 和浏览器基础设施可能记录访问时间、请求路径、设备环境、错误日志和安全事件。这些数据用于运行服务、
            排查故障、防滥用和改进性能。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">AI 与市场数据</h2>
          <p className="mt-2">
            AI 分析主要基于公开球队、赛程和预测市场信息生成。当前产品不会为了生成公开 AI 盘口而主动发送你的个人预测记录给 AI 服务商。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">我们如何使用信息</h2>
          <p className="mt-2">
            这些信息用于登录鉴权、保存预测、展示个人记录、维护安全、分析服务稳定性，以及在你主动联系时回复合作或反馈。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">共享与保留</h2>
          <p className="mt-2">
            我们不会出售个人信息。为提供服务，数据会由 Vercel、Supabase 和必要的基础设施供应商处理。账号和预测记录会在服务运营期间保留，
            除非你要求删除或法律要求另行处理。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">你的选择</h2>
          <p className="mt-2">
            你可以停止使用账号功能，也可以通过页脚微信二维码联系删除或更正账号相关数据。删除请求完成后，部分安全日志可能仍会按基础设施策略短期保留。
          </p>
        </div>
      </section>
    </div>
  );
}
