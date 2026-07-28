"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Key, Bell, Shield, Save, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/components/ThemeContext";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [keys, setKeys] = useState({
    openai: "sk-proj-************************************",
    anthropic: "sk-ant-************************************",
    github: "ghp_************************************",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
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
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Credentials Card */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4.5 h-4.5 text-cyan-400" />
            API & Integration Keys
          </h3>

          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-semibold">OpenAI API Key (PydanticAI)</label>
              <input
                type="password"
                value={keys.openai}
                onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-semibold">Anthropic API Key</label>
              <input
                type="password"
                value={keys.anthropic}
                onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-semibold">GitHub Personal Access Token (PAT)</label>
              <input
                type="password"
                value={keys.github}
                onChange={(e) => setKeys({ ...keys, github: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-indigo-400" />
            Appearance & Theme
          </h3>

          <div className="flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-white">Active Theme Mode</div>
              <div className="text-slate-400 font-mono">Current mode: {theme}</div>
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
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
