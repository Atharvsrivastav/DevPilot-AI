"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError, parseRepoInput } from "@/lib/api";

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  onAnalysisComplete?: (record: AnalysisRecord) => void;
}

export interface AnalysisRecord {
  analysis_id: string;
  status: string;
  progress: number;
  current_step: string;
  repository?: { owner?: string; name?: string };
  error_code?: string | null;
  error_message?: string | null;
  [key: string]: unknown;
}

export function AnalyzeModal({
  isOpen,
  onClose,
  initialUrl = "",
  onAnalysisComplete,
}: AnalyzeModalProps) {
  const [repoUrl, setRepoUrl] = useState(initialUrl);
  const [branch, setBranch] = useState("main");
  const [running, setRunning] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  // Reset whenever the modal is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setRepoUrl(initialUrl);
      setRunning(false);
      setAnalysisId(null);
      setCurrentStep("");
      setError(null);
      setDone(false);
      doneRef.current = false;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!analysisId || !running) return;
    timer.current = setInterval(async () => {
      try {
        const rec = await apiFetch<AnalysisRecord>(
          `/api/v1/analysis/${analysisId}`
        );
        setCurrentStep(rec.current_step || rec.status);
        if (rec.status === "COMPLETED") {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          setDone(true);
          if (!doneRef.current) {
            doneRef.current = true;
            onAnalysisComplete?.(rec);
          }
        } else if (rec.status === "FAILED") {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          setError(rec.error_message || "Analysis failed.");
        }
      } catch (e) {
        // Keep polling through transient network blips; surface only fatal.
        if (e instanceof ApiError && (e.status === 404 || e.status === 401)) {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          setError(e.message);
        }
      }
    }, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [analysisId, running, onAnalysisComplete]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRepoInput(repoUrl);
    if (!parsed) {
      setError("Enter a valid GitHub URL (github.com/owner/repo) or owner/repo.");
      return;
    }
    setError(null);
    setDone(false);
    setRunning(true);
    setAnalysisId(null);
    setCurrentStep("Queueing analysis...");
    try {
      const res = await apiFetch<{ analysis_id: string }>(`/api/v1/analysis`, {
        method: "POST",
        body: JSON.stringify({ repo_url: parsed.url, branch: branch.trim() || "main" }),
      });
      setAnalysisId(res.analysis_id);
    } catch (e) {
      setRunning(false);
      setError(e instanceof ApiError ? e.message : "Could not start analysis.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={() => !running && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Analyze repository"
    >
      <div
        className="glass-panel w-full max-w-lg p-6 rounded-lg relative space-y-6 shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          disabled={running}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white">Analyze repository</h2>
          <p className="text-xs text-slate-400">
            Fetches live data from GitHub and runs security, quality,
            architecture, and documentation scanners.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="am-repo-url" className="text-xs font-semibold text-slate-300">
              GitHub repository URL
            </label>
            <input
              id="am-repo-url"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/owner/repo"
              disabled={running}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-sm text-white font-mono placeholder-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="am-branch" className="text-xs font-semibold text-slate-300">
              Branch <span className="text-slate-500 font-normal">(falls back to default branch)</span>
            </label>
            <input
              id="am-branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              disabled={running}
              className="w-48 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-sm text-white font-mono placeholder-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          {running && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-md bg-white/[0.03] border border-white/10 space-y-2"
            >
              <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 flex-shrink-0" />
                <span>{currentStep || "Starting..."}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-cyan-400/80 animate-[devpilot-indeterminate_1.2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {done && (
            <div role="status" className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Analysis completed. Loading results...</span>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {done ? "Close" : "Cancel"}
            </button>
            {!done && (
              <button
                type="submit"
                disabled={running || !repoUrl.trim()}
                className="px-6 py-2.5 rounded-md bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Start analysis</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
