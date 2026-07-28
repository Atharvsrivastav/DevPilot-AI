"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (data: any) => void;
}

export function AnalyzeModal({ isOpen, onClose, onAnalysisComplete }: AnalyzeModalProps) {
  const [repoUrl, setRepoUrl] = useState("https://github.com/fastapi/fastapi");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);

  // Live polling state
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (analysisId && loading) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/analysis/${analysisId}`, {
            headers: { Authorization: "Bearer mock_jwt_token_demo" },
          });
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status);
            setProgress(data.progress || 0);
            setCurrentStep(data.current_step || "");

            if (data.status === "COMPLETED") {
              setLoading(false);
              if (interval) clearInterval(interval);
              if (onAnalysisComplete) onAnalysisComplete(data);
              setTimeout(() => {
                onClose();
              }, 1200);
            } else if (data.status === "FAILED") {
              setLoading(false);
              setErrorMessage(data.error_message || "Analysis failed");
              if (interval) clearInterval(interval);
            }
          }
        } catch (err: any) {
          console.error("Polling error:", err);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analysisId, loading, onAnalysisComplete, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setStatus("QUEUED");
    setProgress(10);
    setCurrentStep("Queueing analysis task...");

    try {
      const response = await fetch("http://localhost:8000/api/v1/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_jwt_token_demo",
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          branch: branch,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalysisId(data.analysis_id);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(`Could not trigger analysis: ${err.message}. Make sure backend is running.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl relative space-y-6 shadow-2xl border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Live Analysis Engine</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Analyze GitHub Repository
          </h2>
          <p className="text-xs text-slate-400">
            Triggers security, code quality, architecture, & documentation scanners with live status polling.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">GitHub Repository URL</label>
            <input
              type="url"
              required
              disabled={loading}
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 text-sm font-mono focus:border-cyan-400 focus:outline-none transition-colors disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Default Branch</label>
            <input
              type="text"
              required
              disabled={loading}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 text-sm font-mono focus:border-cyan-400 focus:outline-none transition-colors disabled:opacity-60"
            />
          </div>

          {/* Live Progress Indicator */}
          {loading && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-cyan-400 uppercase">State: {status}</span>
                <span className="text-white">{progress}%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 flex-shrink-0" />
                <span>{currentStep}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing... ({progress}%)</span>
                </>
              ) : (
                <span>Start AI Analysis</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
