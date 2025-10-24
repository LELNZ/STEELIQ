// Enhanced security headers for Fortune-50 compliance
export function getHelmetConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isDevelopment
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "localhost:*"]
          : ["'self'", "'sha256-...'"], // Add specific hashes in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", process.env.API_URL || ""],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: !isDevelopment ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: 'DENY' },
    xContentTypeOptions: 'nosniff',
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: !isDevelopment,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    originAgentCluster: true,
    xDnsPrefetchControl: { allow: false },
    xDownloadOptions: 'noopen',
    xPermittedCrossDomainPolicies: false,
    xPoweredBy: false,
  };
}

export function getCorsConfig() {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];

  return {
    origin: allowedOrigins,
    credentials: true,
