export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // In browser, use relative URL so Next.js proxy rewrites handle all API requests
    // seamlessly without CORS or CSP restrictions across any host or IP.
    return "";
  }
  const url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};
