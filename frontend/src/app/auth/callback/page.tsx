"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { apiFetch, ApiError, AuthTokens, setAuthTokens } from "@/lib/api";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setError("Missing authorization code. Start the sign-in flow again.");
      return;
    }

    let cancelled = false;
    apiFetch<AuthTokens>("/api/v1/auth/exchange", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ code }),
    })
      .then((tokens) => {
        if (cancelled) return;
        setAuthTokens(tokens);
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not complete GitHub sign-in."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="max-w-md mx-auto py-24 px-4">
      <div className="glass-panel p-8 rounded-lg text-center space-y-4">
        {error ? (
          <>
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h1 className="text-xl font-bold text-white">Sign-in failed</h1>
            <p className="text-sm text-slate-400">{error}</p>
            <Link
              href="/settings"
              className="inline-block px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 text-xs font-semibold"
            >
              Back to settings
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-cyan-400 mx-auto animate-spin" />
            <h1 className="text-xl font-bold text-white">
              Completing sign-in
            </h1>
            <p className="text-sm text-slate-400">
              Exchanging the GitHub login code for a DevPilot session.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-24 px-4 text-center text-slate-400">
          Loading sign-in…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
