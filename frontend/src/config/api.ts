export const getApiBaseUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      url = url.replace("localhost", host).replace("127.0.0.1", host);
    }
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
};
