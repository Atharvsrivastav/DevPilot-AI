"use client";

import { useSearchParams } from "next/navigation";

export interface RepoRef {
  owner: string;
  repo: string;
}

/** Repository identity from the URL query string — the single source of truth. */
export function useRepo(): RepoRef | null {
  const params = useSearchParams();
  const owner = (params.get("owner") || "").trim();
  const repo = (params.get("repo") || "").trim();
  if (!owner || !repo) return null;
  return { owner, repo };
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
