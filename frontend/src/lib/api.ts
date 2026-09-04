import { getApiBaseUrl } from "@/config/api";

export const DEMO_TOKEN_FALLBACK = "mock_jwt_token_demo";

export function getAuthToken(): string {
  try {
    return (
      localStorage.getItem("devpilot-token") ||
      process.env.NEXT_PUBLIC_DEMO_TOKEN ||
      DEMO_TOKEN_FALLBACK
    );
  } catch {
    return process.env.NEXT_PUBLIC_DEMO_TOKEN || DEMO_TOKEN_FALLBACK;
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

/** Central fetch wrapper: base URL, auth header, timeout, JSON errors. */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, auth = true, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        ...headers,
      },
    });

    if (!res.ok) {
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

/** Parse `owner/name` from a pasted GitHub URL or shorthand. */
export function parseRepoInput(input: string): {
  owner: string;
  name: string;
  url: string;
} | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  if (!trimmed) return null;
  const m = trimmed.match(
    /github\.com[/:]([^/\s]+)\/([^/\s]+)/i
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
