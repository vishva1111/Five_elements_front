/**
 * API_URL — the one place the backend's base URL and its localhost fallback
 * are defined. Every page used to repeat
 *   import.meta.env.VITE_API_URL || 'http://localhost:5000'
 * under a different local name (API, BASE_URL, API_BASE, BACKEND, ...) —
 * harmless while every copy agreed, but a real risk the moment one drifted
 * (a typo'd port, a missed edit). One source now; each file still calls it
 * whatever it already called it, via `import { API_URL as <name> }`.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
