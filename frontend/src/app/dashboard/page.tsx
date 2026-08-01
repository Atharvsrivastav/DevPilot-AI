"use client";

import React, { useState, useEffect } from "react";
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
  const [activeOwner, setActiveOwner] = useState("enterprise-org");
  const [activeUrl, setActiveUrl] = useState("https://github.com/enterprise-org/DevPilot-AI");

  // Real Health Score Report state from backend
  const [healthData, setHealthData] = useState<{
    overallScore: number | null;
    securityScore: number | null;
    architectureScore: number | null;
    qualityScore: number | null;
    grade: string;
    pillars: Array<{ name: string; score: number | null; color: string }>;
    formulas: Record<string, string>;
  }>({
    overallScore: null,
    securityScore: null,
    architectureScore: null,
    qualityScore: null,
    grade: "Not Analyzed",
    pillars: [
      { name: "Security", score: null, color: "bg-emerald-400" },
      { name: "Code Quality", score: null, color: "bg-cyan-400" },
      { name: "Architecture", score: null, color: "bg-indigo-400" },
      { name: "Performance", score: null, color: "bg-amber-400" },
      { name: "Documentation", score: null, color: "bg-purple-400" },
      { name: "Dependencies", score: null, color: "bg-teal-400" },
      { name: "Testing", score: null, color: "bg-rose-400" },
    ],
    formulas: {},
  });

  const fetchLatestAnalysis = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("http://localhost:8000/api/v1/analysis/latest", {
        headers: { Authorization: "Bearer mock_jwt_token_demo" },
      });
      if (res.ok) {
        const data = await res.json();
        updateDashboardFromData(data);
      }
    } catch (err) {
      console.log("No backend analysis record found yet:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const updateDashboardFromData = (data: any) => {
    if (!data) return;

    if (data.repository) {
      setActiveRepoName(data.repository.name || "DevPilot-AI");
      setActiveOwner(data.repository.owner || "enterprise-org");
      setActiveUrl(data.repository.url || "https://github.com/enterprise-org/DevPilot-AI");
    }

    const health = data.health || {};
    const ind = health.individual_scores || {};
    const sec = data.security?.security_score ?? ind.security_score ?? null;
    const qual = data.quality?.quality_score ?? ind.code_quality_score ?? null;
    const arch = data.architecture?.architecture_score ?? ind.architecture_score ?? null;
    const doc = data.documentation?.documentation_score ?? ind.documentation_score ?? null;
    const perf = ind.performance_score ?? null;
    const deps = ind.dependencies_score ?? null;
    const test = ind.testing_score ?? null;
    const overall = health.overall_health_score ?? null;
    const grade = health.health_grade || "Not Analyzed";

    setHealthData({
      overallScore: overall,
      securityScore: sec,
      architectureScore: arch,
      qualityScore: qual,
      grade: grade,
      pillars: [
        { name: "Security", score: sec, color: "bg-emerald-400" },
        { name: "Code Quality", score: qual, color: "bg-cyan-400" },
        { name: "Architecture", score: arch, color: "bg-indigo-400" },
        { name: "Performance", score: perf, color: "bg-amber-400" },
        { name: "Documentation", score: doc, color: "bg-purple-400" },
        { name: "Dependencies", score: deps, color: "bg-teal-400" },
        { name: "Testing", score: test, color: "bg-rose-400" },
      ],
      formulas: health.formulas_used || {},
    });
  };

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

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
            onClick={fetchLatestAnalysis}
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
        owner={activeOwner}
        url={activeUrl}
        defaultBranch="main"
        framework="Next.js 15 + FastAPI"
        isPrivate={true}
      />

      {/* Top Scores Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreWidget title="Overall Health Score" score={healthData.overallScore} grade={healthData.grade} icon="health" formula={healthData.formulas.overall_health_score} />
        <ScoreWidget title="Security Compliance" score={healthData.securityScore} grade={healthData.securityScore !== null ? "Calculated" : "Not Analyzed"} icon="security" formula={healthData.formulas.security || "100 - (Critical*25 + High*15 + Medium*8 + Low*3)"} />
        <ScoreWidget title="Architecture Rating" score={healthData.architectureScore} grade={healthData.architectureScore !== null ? "Calculated" : "Not Analyzed"} icon="health" formula={healthData.formulas.architecture || "BasePatternScore + (LayerCount*2) - (Coupling*0.1)"} />
        <ScoreWidget title="Code Quality Index" score={healthData.qualityScore} grade={healthData.qualityScore !== null ? "Calculated" : "Not Analyzed"} icon="health" formula={healthData.formulas.quality || "100 - (HighComplexity*5 + DeadCode*4 + UnusedImports*2)"} />
      </div>

      {/* Analytics & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PillarChartWidget pillars={healthData.pillars} />
        <RecentAnalysisWidget />
      </div>

      {/* Detailed Analysis Pillar Tabs */}
      <AnalysisDetailTabs />

      {/* Analyze New Repository Modal */}
      <AnalyzeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAnalysisComplete={(data) => {
          updateDashboardFromData(data);
        }}
      />
    </motion.div>
  );
}
