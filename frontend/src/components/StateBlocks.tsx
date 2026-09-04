"use client";

import React from "react";
import { AlertTriangle, Inbox } from "lucide-react";

export function LoadingSkeleton({
  lines = 3,
  label = "Loading…",
}: {
  lines?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="glass-panel rounded-3xl p-6 space-y-3"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 rounded-lg"
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-3"
    >
      <div className="flex items-center gap-2 font-bold">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Couldn&apos;t load data</span>
      </div>
      <p className="text-rose-200/80 leading-relaxed font-mono break-words">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="p-8 text-center glass-panel rounded-3xl space-y-2">
      <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
