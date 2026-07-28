"use client";

import React from "react";
import { motion } from "framer-motion";
import { History as HistoryIcon, GitCommit, CheckCircle2, Clock, Calendar } from "lucide-react";

export default function HistoryPage() {
  const historyList = [
    {
      id: "anl_01h92k8a12",
      repo: "enterprise-org/DevPilot-AI",
      branch: "main",
      commit: "a8f3c91",
      score: 88,
      status: "COMPLETED",
      timestamp: "2026-07-28 21:30",
    },
    {
      id: "anl_01h92j7b05",
      repo: "fastapi/fastapi",
      branch: "master",
      commit: "b2d41ef",
      score: 94,
      status: "COMPLETED",
      timestamp: "2026-07-28 19:15",
    },
    {
      id: "anl_01h92i6c99",
      repo: "vercel/next.js",
      branch: "canary",
      commit: "c99a012",
      score: 82,
      status: "COMPLETED",
      timestamp: "2026-07-27 14:00",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <HistoryIcon className="w-4 h-4" />
            <span>Audit Trail & Analysis History</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Repository Analysis Log History
          </h1>
          <p className="text-xs text-slate-400">
            Chronological audit log tracking score trends and previous scanning executions.
          </p>
        </div>
      </div>

      {/* History Table List */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <div className="divide-y divide-white/10">
          {historyList.map((item) => (
            <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="space-y-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{item.repo}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {item.branch}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                  <span>sha: {item.commit}</span>
                  <span>•</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.timestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400">Health Score</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">{item.score} / 100</div>
                </div>
                <span className="text-xs font-bold uppercase px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
