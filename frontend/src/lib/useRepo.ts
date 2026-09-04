"use client";

import { useSearchParams } from "next/navigation";

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface RepositoryState {
  owner: string;
  repo: string;
  url: string;
  defaultBranch: string;
  repositoryId: string;
  commitSha: string | null;
  analysisId: string | null;
}

export function saveRepositoryState(state: RepositoryState): void {
  try {
    if (typeof window === "undefined") return;
    const key = `devpilot:repo:${state.owner.toLowerCase()}/${state.repo.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem("devpilot:active_repo", JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("devpilot:repo_changed", { detail: state }));
  } catch {
    /* storage unavailable */
  }
}

export function getRepositoryState(owner?: string, repo?: string): RepositoryState | null {
  try {
    if (typeof window === "undefined") return null;
    if (owner && repo) {
      const key = `devpilot:repo:${owner.toLowerCase()}/${repo.toLowerCase()}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    }
    const active = localStorage.getItem("devpilot:active_repo");
    if (active) return JSON.parse(active);
  } catch {
    /* ignore */
  }
  return null;
}

/** Repository identity from URL query string or persisted active repo. */
export function useRepo(): RepoRef | null {
  const params = useSearchParams();
  const owner = (params.get("owner") || "").trim();
  const repo = (params.get("repo") || "").trim();
  if (owner && repo) {
    return { owner, repo };
  }

  if (typeof window !== "undefined") {
    const saved = getRepositoryState();
    if (saved && saved.owner && saved.repo) {
      return { owner: saved.owner, repo: saved.repo };
    }
  }

  return null;
}

export function repoKey(ref: RepoRef): string {
  return `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}`;
}

export function repoQuery(ref: RepoRef): string {
  return `owner=${encodeURIComponent(ref.owner)}&repo=${encodeURIComponent(ref.repo)}`;
}

/** Append the current repo query to an app path, preserving repo context. */
export function withRepo(path: string, ref: RepoRef | null): string {
  if (!ref) return path;
  return `${path}?${repoQuery(ref)}`;
}

