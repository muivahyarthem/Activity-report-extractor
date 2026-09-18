/**
 * Resolved at build time by Vite.
 * - Local dev  → "" (empty string, Vite proxy handles /api → localhost:8000)
 * - Production → "https://activity-report-extractor.onrender.com" (from .env.production or Vercel env)
 */
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const API_BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

export function apiUrl(path = "") {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Enhanced fetch that:
 * 1. Automatically resolves the correct backend URL
 * 2. Transmits credentials (cookies) across domains
 * 3. Manages and persists x-session-id header in localStorage as a fallback
 *    for browsers that block third-party cookies across domains.
 */
export async function apiFetch(path, options = {}) {
  const url = apiUrl(path);
  const sessionId = localStorage.getItem("activity_extractor_session_id");

  const headers = new Headers(options.headers || {});
  if (sessionId && !headers.has("x-session-id")) {
    headers.set("x-session-id", sessionId);
  }

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const returnedSessionId = response.headers.get("x-session-id");
  if (returnedSessionId) {
    localStorage.setItem("activity_extractor_session_id", returnedSessionId);
  }

  return response;
}
