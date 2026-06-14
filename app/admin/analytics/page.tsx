"use client";

import { useState } from "react";

type Platform = {
  platform: string;
  conversations: number;
  messages: number;
  avgMessages: number | null;
  resolutionRate: number | null;
};

type AfterSale = {
  type: string;
  count: number;
  percentage: number | null;
};

const defaultPlatforms: Platform[] = [];
const defaultAfterSale: AfterSale[] = [];

const t = {
  analytics: {
    conversations: "会话数",
    messages: "消息数",
    avgMessages: "平均消息",
    resolutionRate: "解决率",
  },
};

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"platform" | "aftersale">("platform");
  const [platforms] = useState<Platform[]>(defaultPlatforms);
  const [afterSale] = useState<AfterSale[]>(defaultAfterSale);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">数据分析</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("platform")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "platform"
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          平台数据
        </button>
        <button
          onClick={() => setTab("aftersale")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "aftersale"
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          售后数据
        </button>
      </div>

      {tab === "platform" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                  Platform
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                  {t.analytics.conversations}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                  {t.analytics.messages}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                  {t.analytics.avgMessages}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                  {t.analytics.resolutionRate}
                </th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p, index) => (
                <tr key={`${p.platform}-${index}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-3 font-semibold">{p.platform}</td>
                  <td className="px-6 py-3">{p.conversations}</td>
                  <td className="px-6 py-3">{p.messages}</td>
                  <td className="px-6 py-3">{(p.avgMessages ?? 0).toFixed(1)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${p.resolutionRate ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs">{(p.resolutionRate ?? 0).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {platforms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "aftersale" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {afterSale.map((a) => (
            <div key={a.type} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">{a.type}</p>
              <p className="text-2xl font-black text-slate-900">{a.count}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${a.percentage ?? 0}%` }}
                />
              </div>
            </div>
          ))}
          {afterSale.length === 0 && (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
              暂无数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}
