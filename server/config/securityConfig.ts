/**
 * Minimal security config surface used by server/index.ts
 * Feel free to harden these later; this is a build-safe, sensible baseline.
 */

export type RateLimitBucket = { windowMs: number; max: number };
export type RateLimits = {
  general: RateLimitBucket;
  auth: RateLimitBucket;
  ai: RateLimitBucket;
  uploads: RateLimitBucket;
};

export function getHelmetConfig() {
  // Keep permissive; harden as required (e.g., contentSecurityPolicy)
  return {
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // enable & tune later if needed
  };
}

export function getCorsConfig() {
  // Allow tools/local previews. Tighten to specific origins in prod.
  const isProd = process.env.NODE_ENV === 'production';
  return {
    origin: isProd ? [/\.yourdomain\.com$/] : true,
    credentials: true,
  };
}

export function getRateLimits(
  env: "development" | "test" | "production" = (process.env.NODE_ENV as any) || "development"
): RateLimits {
  const isDev = env !== "production";
  return {
    general:  { windowMs: 15 * 60 * 1000, max: isDev ? 1000 : 300 },
    auth:     { windowMs: 10 * 60 * 1000, max: isDev ? 100  : 10  },
    ai:       { windowMs:  1 * 60 * 1000, max: isDev ? 120  : 30  },
    uploads:  { windowMs: 30 * 60 * 1000, max: isDev ? 200  : 60  },
  };
}
