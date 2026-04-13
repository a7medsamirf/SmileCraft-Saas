/**
 * Robust ID Generation Utility
 * Provides a fallback for environments where crypto.randomUUID() is not available
 * (e.g., non-secure contexts in the browser).
 */

export function generateId(): string {
  // Use crypto.randomUUID() if available (modern browsers, Node.js 14.17+)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Robust Math.random-based fallback
  // This produces a UUID v4-like string
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
