/**
 * Resolved at build time by Vite.
 * - Local dev  → "" (empty string, Vite proxy handles /api → localhost:8000)
 * - Production → "https://activity-report-extractor.onrender.com" (from .env.production)
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export function apiUrl(path) {
  // path must start with "/"
  return `${BASE}${path}`;
}
