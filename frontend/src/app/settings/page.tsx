"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Key,
  Shield,
  Save,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useTheme } from "@/components/ThemeContext";
import { apiFetch, ApiError, getAuthToken, setAuthToken } from "@/lib/api";
import { useRepo } from "@/lib/useRepo";
import { LoadingSkeleton, ErrorBlock } from "@/components/StateBlocks";

interface HealthResponse {
  status?: string;
  [key: string]: unknown;
}

function SettingsInner() {
  const { theme, toggleTheme } = useTheme();
  const repo = useRepo();
  const [saved, setSaved] = useState(false);
  const [token, setToken] = useState<string>("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(getAuthToken() || "");
    } catch {
      setToken("");
    }
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkHealth = () => {
    setHealthLoading(true);
    setHealthError(null);
    apiFetch<HealthResponse>("/health", { auth: false })
      .then(setHealth)
      .catch((e: unknown) => {
        setHealth(null);
        setHealthError(
          e instanceof ApiError ? e.message : "Backend unreachable."
        );
      })
      .finally(() => setHealthLoading(false));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthToken(token.trim() ? token.trim() : null);
    } catch {
      /* storage unavailable */
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-4xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <SettingsIcon className="w-4 h-4" />
            <span>Workspace Preferences</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Settings & API Integration Keys
          </h1>
          {repo && (
            <p className="text-xs font-mono text-slate-400">
              Repository context: {repo.owner}/{repo.repo}
            </p>
          )}
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend Status Card */}
        <div className="glass-panel p-6 rounded-lg space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Backend Status
          </h3>
          {healthLoading ? (
            <LoadingSkeleton lines={2} label="Checking backend status" />
          ) : healthError ? (
            <ErrorBlock message={healthError} onRetry={checkHealth} />
          ) : (
            <div className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">
                  Connected{health?.status ? ` — ${health.status}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={checkHealth}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 font-semibold transition-all"
              >
                Recheck
              </button>
            </div>
          )}
        </div>

        {/* API Credentials Card */}
        <div className="glass-panel p-6 rounded-lg space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            API & Integration Keys
          </h3>

          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <label
                htmlFor="devpilot-token"
                className="text-slate-300 font-sans font-semibold"
              >
                DevPilot Auth Token
              </label>
              <input
                id="devpilot-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your auth token (stored locally only)"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:border-cyan-400 focus:outline-none placeholder-slate-600"
              />
              <p className="text-[11px] text-slate-500">
                Saved to this browser only. Leave blank to clear and use
                unauthenticated requests.
              </p>
            </div>
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="glass-panel p-6 rounded-lg space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Appearance & Theme
          </h3>

          <div className="flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-white">Active Theme Mode</div>
              <div className="text-slate-400 font-mono">
                Current mode: {theme}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 font-semibold transition-all"
            >
              Toggle Theme
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-md bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={3} label="Loading settings" />}>
      <SettingsInner />
    </Suspense>
  );
}
