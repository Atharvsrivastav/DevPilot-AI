import { getApiBaseUrl } from "@/config/api";

const ACCESS_TOKEN_KEY = "devpilot-token";
const REFRESH_TOKEN_KEY = "devpilot-refresh-token";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

/**
 * Stored user token (from a real login flow). Returns null when absent.
 * No demo/mock token is ever hardcoded or sent.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function setAuthTokens(tokens: AuthTokens) {
  setAuthToken(tokens.access_token);
  try {
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
  } catch {
    /* storage unavailable */
  }
}

export function clearAuthTokens() {
  setAuthToken(null);
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  auth?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

/** Rotate the refresh token and store the new pair. At most one call at a time. */
async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        clearAuthTokens();
        return false;
      }
      const data = (await res.json()) as AuthTokens;
      if (!data.access_token || !data.refresh_token) {
        clearAuthTokens();
        return false;
      }
      setAuthTokens(data);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function apiFetchInternal<T>(
  path: string,
  options: ApiFetchOptions,
  retried: boolean
): Promise<T> {
  const { timeoutMs = 30000, auth = true, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = auth ? getAuthToken() : null;
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    if (!res.ok) {
      // A single transparent retry after rotating an expired access token.
      const replayable =
        rest.body === undefined ||
        rest.body === null ||
        typeof rest.body === "string";
      if (res.status === 401 && auth && !retried && replayable) {
        if (await refreshSession()) {
          return apiFetchInternal<T>(path, options, true);
        }
      }

      let detail = `Request failed (${res.status})`;
      let payload: unknown = null;
      try {
        payload = await res.json();
        const msg =
          (payload as Record<string, unknown>)?.detail ??
          (payload as Record<string, unknown>)?.message;
        if (typeof msg === "string" && msg) detail = msg;
      } catch {
        try {
          const text = await res.text();
          if (text) detail = text.slice(0, 300);
        } catch {
          /* ignore */
        }
      }
      throw new ApiError(res.status, detail, payload);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "Backend timed out. Is the API running?");
    }
    throw new ApiError(
      0,
      err instanceof Error
        ? `Cannot reach backend: ${err.message}`
        : "Cannot reach backend. Is the API running?"
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Central fetch wrapper: base URL, optional auth, timeout, JSON errors. */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  return apiFetchInternal<T>(path, options, false);
}

/** Parse `owner/name` from a pasted GitHub URL or shorthand. */
export function parseRepoInput(input: string): {
  owner: string;
  name: string;
  url: string;
} | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  if (!trimmed) return null;
  const m = trimmed.match(
    /github\.com[/:]([^/\s]+)\/([^/\s?#]+)/i
  );
  if (m) {
    return {
      owner: m[1],
      name: m[2],
      url: `https://github.com/${m[1]}/${m[2]}`,
    };
  }
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) {
    return {
      owner: short[1],
      name: short[2],
      url: `https://github.com/${short[1]}/${short[2]}`,
    };
  }
  return null;
}

export function repoSearch(owner: string, repo: string): string {
  return `?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
}
