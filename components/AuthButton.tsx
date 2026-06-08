"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function AuthButton() {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-20 animate-pulse rounded-lg bg-white/10" />
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-black transition hover:bg-emerald-400"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
          {session.user.name?.[0] || session.user.email?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#0a1929] p-1 shadow-xl">
            <div className="border-b border-white/10 px-3 py-2">
              <div className="text-sm font-medium text-white">{session.user.name}</div>
              <div className="text-xs text-slate-400">{session.user.email}</div>
            </div>
            <Link
              href="/profile"
              className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              onClick={() => setShowMenu(false)}
            >
              个人中心
            </Link>
            <Link
              href="/predictions"
              className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              onClick={() => setShowMenu(false)}
            >
              我的预测
            </Link>
            <button
              onClick={() => {
                setShowMenu(false);
                signOut();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-white/5"
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
