"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  Users,
  Code,
  FileCode,
  Folder,
  ExternalLink,
  Star,
  Eye,
  GitFork,
} from "lucide-react";

import { getApiBaseUrl } from "@/config/api";

export default function RepositoryPage() {
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [repoData, setRepoData] = useState<any>(null);

  React.useEffect(() => {
    const fetchRepoData = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/analysis/latest`, {
          headers: { Authorization: "Bearer mock_jwt_token_demo" },
        });
        if (res.ok) {
          const data = await res.json();
          setRepoData(data);
        }
      } catch (err) {
        console.error("Error loading repository analysis:", err);
      }
    };
    fetchRepoData();
  }, []);

  const repoInfo = repoData?.repository || {};
  const folderGraph = repoData?.architecture?.folder_graph || [];
  const treePaths = repoData?.architecture?.raw_metrics?.total_tree_files
    ? folderGraph.map((f: string) => ({ type: "folder", name: f, path: f }))
    : [
        { type: "folder", name: "backend/app", path: "backend/app" },
        { type: "file", name: "backend/app/main.py", path: "backend/app/main.py", size: "Real Code File" },
        { type: "file", name: "backend/app/core/config.py", path: "backend/app/core/config.py", size: "Real Config File" },
        { type: "folder", name: "frontend/src", path: "frontend/src" },
        { type: "file", name: "docker-compose.yml", path: "docker-compose.yml", size: "Config" },
        { type: "file", name: "README.md", path: "README.md", size: "Doc" },
      ];

  const repoName = repoInfo.name || "DevPilot-AI";
  const repoOwner = repoInfo.owner || "enterprise-org";
  const repoUrl = repoInfo.url || "https://github.com/enterprise-org/DevPilot-AI";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Repo Header */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Next.js 15 + FastAPI
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Private Repository
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {repoOwner} <span className="text-slate-500">/</span> <span className="linear-gradient-text">{repoName}</span>
            </h1>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
            >
              <span>{repoUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-white/10">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span>Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="main">main</option>
                <option value="master">master</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: File Tree & Commit History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree Component */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-4.5 h-4.5 text-cyan-400" />
            Repository File & Folder Tree ({treePaths.length} items)
          </h3>

          <div className="divide-y divide-white/5 font-mono text-xs max-h-96 overflow-y-auto">
            {treePaths.map((item: any, idx: number) => (
              <div key={idx} className="py-2.5 px-3 flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5">
                  {item.type === "folder" ? (
                    <Folder className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <FileCode className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className={item.type === "folder" ? "font-bold text-slate-200" : "text-slate-300"}>
                    {item.name || item.path}
                  </span>
                </div>
                {item.size && <span className="text-[11px] text-slate-500">{item.size}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Commit History & Languages */}
        <div className="space-y-6">
          {/* Language Breakdown */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              Language Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300 font-mono">
                <span>TypeScript / React</span>
                <span className="text-cyan-400">58.4%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: "58.4%" }} />
              </div>

              <div className="flex justify-between text-xs font-semibold text-slate-300 font-mono pt-2">
                <span>Python</span>
                <span className="text-indigo-400">35.2%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: "35.2%" }} />
              </div>
            </div>
          </div>

          {/* Recent Commits */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-amber-400" />
              Recent Commits
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {[
                { sha: "a8f3c91", msg: "feat: add PydanticAI code reviewer agent", time: "2 hours ago" },
                { sha: "b2d41ef", msg: "fix: update PostgreSQL pgvector session engine", time: "5 hours ago" },
                { sha: "c99a012", msg: "style: redesign UI with Apple glassmorphism", time: "1 day ago" },
              ].map((c) => (
                <div key={c.sha} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-400 font-bold">sha: {c.sha}</span>
                    <span className="text-slate-500">{c.time}</span>
                  </div>
                  <div className="text-slate-200">{c.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
