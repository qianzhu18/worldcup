import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="heading text-3xl text-white">个人中心</h1>
        <p className="mt-2 text-slate-400">账号资料和世界杯预测战绩。</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-xl font-black text-emerald-300">
            {(profile?.name || user.email || "U")[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-black text-white">{profile?.name || user.user_metadata?.name || "Player"}</div>
            <div className="text-sm text-slate-400">{user.email}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniStat label="账号状态" value={user.email_confirmed_at ? "已验证" : "待验证"} />
          <MiniStat label="登录方式" value="Supabase Auth" />
          <MiniStat label="用户数据" value="云端持久化" accent />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/predictions"
          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400"
        >
          查看我的预测
        </Link>
        <Link
          href="/timeline"
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5"
        >
          去赛程提交预测
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-black ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
