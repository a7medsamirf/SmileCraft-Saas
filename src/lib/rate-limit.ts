// =============================================================================
// SmileCraft CMS — Rate Limiting Utility
// Upstash Redis with in-memory fallback for development
// =============================================================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimitConfig = {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp when the rate limit resets
};

// ---------------------------------------------------------------------------
// Predefined rate limit configurations for different action types
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  // Authentication actions — very strict
  AUTH_LOGIN: { maxRequests: 5, windowSeconds: 60 }, // 5 attempts per minute
  AUTH_SIGNUP: { maxRequests: 3, windowSeconds: 60 }, // 3 signups per minute
  AUTH_PASSWORD_RESET: { maxRequests: 3, windowSeconds: 300 }, // 3 resets per 5 minutes

  // Data mutation actions — moderate
  MUTATION_CREATE: { maxRequests: 20, windowSeconds: 60 }, // 20 creates per minute
  MUTATION_UPDATE: { maxRequests: 50, windowSeconds: 60 }, // 50 updates per minute
  MUTATION_DELETE: { maxRequests: 10, windowSeconds: 60 }, // 10 deletes per minute

  // Data read actions — lenient
  READ_PATIENTS: { maxRequests: 100, windowSeconds: 60 }, // 100 reads per minute
  READ_APPOINTMENTS: { maxRequests: 100, windowSeconds: 60 },
  READ_FINANCE: { maxRequests: 50, windowSeconds: 60 }, // More restrictive for sensitive data

  // File upload — very restrictive
  FILE_UPLOAD: { maxRequests: 10, windowSeconds: 60 }, // 10 uploads per minute

  // API endpoints — general
  GENERAL: { maxRequests: 60, windowSeconds: 60 }, // 60 requests per minute
} as const;

// ---------------------------------------------------------------------------
// In-memory store for development fallback
// ---------------------------------------------------------------------------

interface MemoryStoreEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryStoreEntry>();

function createMemoryRateLimit(): {
  limit: (key: string, config: RateLimitConfig) => Promise<RateLimitResult>;
} {
  return {
    async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
      const now = Date.now();
      const entry = memoryStore.get(key);

      if (!entry || now > entry.resetAt) {
        // First request or window expired
        memoryStore.set(key, {
          count: 1,
          resetAt: now + config.windowSeconds * 1000,
        });
        return {
          success: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          reset: now + config.windowSeconds * 1000,
        };
      }

      // Window still active
      entry.count += 1;
      const remaining = Math.max(0, config.maxRequests - entry.count);
      const success = entry.count <= config.maxRequests;

      return {
        success,
        limit: config.maxRequests,
        remaining,
        reset: entry.resetAt,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton rate limiter instance
// ---------------------------------------------------------------------------

let rateLimiter: ReturnType<typeof createMemoryRateLimit> | Ratelimit | null =
  null;

function getRateLimiter():
  | { limit: (key: string, config: RateLimitConfig) => Promise<RateLimitResult> }
  | Ratelimit {
  if (rateLimiter) return rateLimiter;

  // Try to initialize Upstash Redis
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    const redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });

    // Create a sliding window ratelimit
    rateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "60s"), // Default: 60 requests per 60s
      analytics: true,
    });

    console.log("[RateLimit] ✓ Using Upstash Redis");
  } else {
    // Fallback to in-memory store
    rateLimiter = createMemoryRateLimit();
    console.log(
      "[RateLimit] ⚠ Using in-memory fallback (configure UPSTASH_REDIS_REST_URL for production)"
    );
  }

  return rateLimiter;
}

// ---------------------------------------------------------------------------
// Helper to identify action type from the action name or context
// ---------------------------------------------------------------------------

function detectActionType(actionName: string): keyof typeof RATE_LIMITS {
  const name = actionName.toLowerCase();

  if (name.includes("login") || name.includes("signin")) return "AUTH_LOGIN";
  if (name.includes("signup") || name.includes("register"))
    return "AUTH_SIGNUP";
  if (name.includes("reset") || name.includes("forgot"))
    return "AUTH_PASSWORD_RESET";

  if (name.includes("create") || name.includes("add"))
    return "MUTATION_CREATE";
  if (name.includes("update") || name.includes("edit"))
    return "MUTATION_UPDATE";
  if (name.includes("delete") || name.includes("remove"))
    return "MUTATION_DELETE";

  if (name.includes("upload") || name.includes("file")) return "FILE_UPLOAD";
  if (name.includes("patient")) return "READ_PATIENTS";
  if (name.includes("appointment")) return "READ_APPOINTMENTS";
  if (name.includes("finance") || name.includes("payment") || name.includes("invoice"))
    return "READ_FINANCE";

  return "GENERAL";
}

// ---------------------------------------------------------------------------
// Core rate limiting function
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting to a Server Action.
 *
 * @param actionName - Name of the action (used to detect rate limit type)
 * @param customConfig - Optional custom rate limit config (overrides defaults)
 * @param customKey - Optional custom key (defaults to IP address)
 *
 * @returns RateLimitResult with success status
 *
 * @example
 * ```ts
 * export async function loginAction(_prevState: any, formData: FormData) {
 *   const rateLimit = await checkRateLimit("login");
 *   if (!rateLimit.success) {
 *     return { errors: { form: ["Too many attempts. Please try again later."] } };
 *   }
 *   // ... rest of action
 * }
 * ```
 */
export async function checkRateLimit(
  actionName: string,
  customConfig?: RateLimitConfig,
  customKey?: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();

  // Determine rate limit configuration
  const actionType = detectActionType(actionName);
  const config = customConfig ?? RATE_LIMITS[actionType];

  // Build the rate limit key
  // Format: {actionType}:{identifier}
  const identifier = customKey ?? (await getClientIdentifier());
  const key = `${actionType}:${identifier}`;

  // Apply rate limit
  let result: RateLimitResult;

  if ("limit" in limiter && typeof limiter.limit === "function") {
    // Check if it's the memory store or Upstash
    const limitFn = limiter.limit.bind(limiter);

    try {
      if (process.env.UPSTASH_REDIS_REST_URL) {
        // Upstash returns { success: boolean, limit: number, remaining: number, reset: number }
        const upstashResult = await (limiter as Ratelimit).limit(key);
        result = {
          success: upstashResult.success,
          limit: upstashResult.limit,
          remaining: upstashResult.remaining,
          reset: upstashResult.reset,
        };
      } else {
        // Memory store
        result = await limitFn(key, config);
      }
    } catch (error) {
      console.error("[RateLimit] Error:", error);
      // Fail open — allow request if rate limiter fails
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: Date.now() + config.windowSeconds * 1000,
      };
    }
  } else {
    // Fallback: allow request
    result = {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowSeconds * 1000,
    };
  }

  // Log rate limit events in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[RateLimit] ${key} → ${result.success ? "✓" : "✗"} (${result.remaining}/${result.limit} remaining)`
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Client identifier helpers
// ---------------------------------------------------------------------------

/**
 * Extract a unique client identifier for rate limiting.
 * Priority: IP address > headers > fallback
 */
async function getClientIdentifier(): Promise<string> {
  try {
    const headersList = await headers();

    // Try to get IP from various headers (in order of reliability)
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      headersList.get("cf-connecting-ip") ?? // Cloudflare
      "unknown";

    // Hash the IP for privacy (simple hash)
    return await hashIdentifier(ip);
  } catch {
    // Fallback for environments where headers() is not available
    return "fallback-client";
  }
}

/**
 * Simple hash function for identifiers.
 * Returns a truncated hash for privacy.
 */
async function hashIdentifier(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Return first 16 characters of hash
    return hashHex.substring(0, 16);
  }

  // Fallback: simple string hash
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

// ---------------------------------------------------------------------------
// Convenience wrappers for common scenarios
// ---------------------------------------------------------------------------

/**
 * Rate limit for login attempts — very strict (5 per minute)
 */
export async function checkLoginRateLimit(): Promise<RateLimitResult> {
  return checkRateLimit("login", RATE_LIMITS.AUTH_LOGIN);
}

/**
 * Rate limit for signup attempts (3 per minute)
 */
export async function checkSignupRateLimit(): Promise<RateLimitResult> {
  return checkRateLimit("signup", RATE_LIMITS.AUTH_SIGNUP);
}

/**
 * Rate limit for mutation actions (20-50 per minute depending on type)
 */
export async function checkMutationRateLimit(
  actionName: string
): Promise<RateLimitResult> {
  const actionType = detectActionType(actionName);
  const config =
    actionType === "MUTATION_CREATE"
      ? RATE_LIMITS.MUTATION_CREATE
      : actionType === "MUTATION_DELETE"
        ? RATE_LIMITS.MUTATION_DELETE
        : RATE_LIMITS.MUTATION_UPDATE;

  return checkRateLimit(actionName, config);
}

/**
 * Rate limit for read actions (50-100 per minute)
 */
export async function checkReadRateLimit(
  actionName: string
): Promise<RateLimitResult> {
  return checkRateLimit(actionName);
}

/**
 * Rate limit for file uploads (10 per minute)
 */
export async function checkUploadRateLimit(): Promise<RateLimitResult> {
  return checkRateLimit("upload", RATE_LIMITS.FILE_UPLOAD);
}
