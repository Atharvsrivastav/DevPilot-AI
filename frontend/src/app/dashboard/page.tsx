"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  RepositoryCard,
  ScoreWidget,
  PillarChartWidget,
  RecentAnalysisWidget,
} from "@/components/DashboardWidgets";
import { AnalyzeModal } from "@/components/AnalyzeModal";
import { AnalysisDetailTabs } from "@/components/AnalysisDetailTabs";
import { Sparkles, RefreshCw, Plus, ShieldCheck, Activity, Cpu, GitPullRequest } from "lucide-react";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRepoName, setActiveRepoName] = useState("DevPilot-AI");

  // State initialized to null ("Not Analyzed") until scanner outputs exist
  const [healthReport, setHealthReport] = useState<{
    overallScore: number | null;
    securityScore: number | null;
    architectureScore: number | null;
    qualityScore: number | null;
    grade: string;
    formulas: Record<string, string>;
  }>({
    overallScore: null,
    securityScore: null,
    architectureScore: null,
    qualityScore: null,
    grade: "Not Analyzed",
    formulas: {},
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DevPilot AI Engine v0.1.0</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight linear-gradient-text">
            Repository Intelligence Dashboard
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Real-time automated multi-dimensional analysis spanning Security, Quality, Architecture, & Performance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Re-run Analysis"}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Analyze Repo</span>
          </button>
        </div>
      </div>

      {/* Main Repository Card */}
      <RepositoryCard
        name={activeRepoName}
        owner="enterprise-org"
        url={`https://github.com/enterprise-org/${activeRepoName}`}
        defaultBranch="main"
        framework="Next.js 15 + FastAPI"
        isPrivate={true}
      />

      {/* Top Scores Grid (Real Scores or Not Analyzed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreWidget title="Overall Health Score" score={healthReport.overallScore} grade={healthReport.grade} icon="health" formula={healthReport.formulas.overall} />
        <ScoreWidget title="Security Compliance" score={healthReport.securityScore} grade={healthReport.securityScore !== null ? "Calculated" : "Not Analyzed"} icon="security" formula="100 - (Critical*25 + High*15 + Medium*8 + Low*3)" />
        <ScoreWidget title="Architecture Rating" score={healthReport.architectureScore} grade={healthReport.architectureScore !== null ? "Calculated" : "Not Analyzed"} icon="health" formula="BaseScore + (LayerCount*2) - (Coupling*0.1)" />
        <ScoreWidget title="Code Quality Index" score={healthReport.qualityScore} grade={healthReport.qualityScore !== null ? "Calculated" : "Not Analyzed"} icon="health" formula="100 - (HighComplexity*5 + DeadCode*4 + UnusedImports*2)" />
      </div>

      {/* Analytics & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PillarChartWidget />
        <RecentAnalysisWidget />
      </div>

      {/* Detailed Analysis Pillar Tabs */}
      <AnalysisDetailTabs />

      {/* Analyze New Repository Modal */}
      <AnalyzeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAnalysisComplete={(repoUrl) => {
          const parts = repoUrl.split("/");
          const repoName = parts[parts.length - 1] || "Analyzed-Repo";
          setActiveRepoName(repoName);
        }}
      />
    </motion.div>
  );
}
