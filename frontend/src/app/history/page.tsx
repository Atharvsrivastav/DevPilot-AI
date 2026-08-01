"use client";

import React from "react";
import { motion } from "framer-motion";
import { History as HistoryIcon, GitCommit, CheckCircle2, Clock, Calendar } from "lucide-react";

import { getApiBaseUrl } from "@/config/api";

export default function HistoryPage() {
  const [historyList, setHistoryList] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/analysis/history`, {
          headers: { Authorization: "Bearer mock_jwt_token_demo" },
        });
        if (res.ok) {
          const list = await res.json();
          setHistoryList(list);
        }
      } catch (err) {
        console.error("Error loading analysis history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

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
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">Loading analysis history...</div>
          ) : historyList.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              No analysis records stored yet. Run an analysis from the dashboard.
            </div>
          ) : (
            historyList.map((item) => (
              <div key={item.analysis_id || item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="space-y-1 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.repository?.name || item.repo || "Repository"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {item.repository?.default_branch || item.branch || "main"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ID: {item.analysis_id || item.id}</span>
                    <span>•</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.created_at ? new Date(item.created_at).toLocaleString() : item.timestamp || "Recent"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-mono text-slate-400">Health Score</div>
                    <div className="text-xl font-bold text-emerald-400 font-mono">
                      {item.health?.overall_health_score !== undefined && item.health?.overall_health_score !== null
                        ? `${item.health.overall_health_score} / 100`
                        : "N/A"}
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {item.status || "COMPLETED"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
