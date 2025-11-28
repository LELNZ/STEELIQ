import type { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

function parseOrigins(raw?: string): (string | RegExp)[] | boolean {
  if (!raw) return true; // allow all if not set (dev)
  const list = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.map(o =>
    o.startsWith("/") && o.endsWith("/") ? new RegExp(o.slice(1, -1)) : o
  );
}

export function applySecurityBaseline(app: Application) {
  // Unified security configuration for Fortune 50 standards
  const isDev = process.env.NODE_ENV === 'development';
  const isReplit = process.env.REPLIT_DOMAINS || process.env.REPL_ID;
  
  // Apply helmet with environment-aware settings
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip security headers for static assets and Vite paths
    if (req.path.startsWith('/@vite/') || 
        req.path.startsWith('/@fs/') || 
        req.path.startsWith('/@id/') ||
        req.path.startsWith('/@react-refresh') ||
        req.path.includes('/__vite_ping') ||
        req.path.includes('/.vite/') ||
        req.path.endsWith('.js') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.png') ||
        req.path.endsWith('.jpg') ||
        req.path.endsWith('.svg')) {
      return next();
    }
    
    // Apply helmet configuration
    const helmetConfig = isDev ? {
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "no-referrer" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"], // Allow eval for Vite HMR and Google Maps API
          imgSrc: ["'self'", "data:", "https:", "http:", "blob:"], // Added http: for iframe asset loading
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://api.anthropic.com", "wss:", "ws:", "https://*.replit.dev", "https://nominatim.openstreetmap.org", "https://maps.googleapis.com", "https://*.googleapis.com"],
          frameSrc: ["'self'", "https://*.replit.dev", "https://www.google.com/maps/", "https://maps.google.com/", "https://maps.googleapis.com/", "https://www.openstreetmap.org"], // Allow Replit frames, Google Maps, and OpenStreetMap in dev
          frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://replit.com"], // Allow embedding in Replit
          objectSrc: ["'none'"],
          workerSrc: ["'self'", "blob:"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: null // null = omit directive in development (Fortune 50 best practice)
        }
      },
      frameguard: false // Disable X-Frame-Options in development to let CSP handle it
    } : {
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "no-referrer" },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://api.anthropic.com", "wss:", "ws:", "https://nominatim.openstreetmap.org", "https://maps.googleapis.com", "https://*.googleapis.com"],
          frameSrc: ["'self'", "https://www.google.com/maps/", "https://maps.google.com/", "https://maps.googleapis.com/", "https://www.openstreetmap.org"], // Allow Google Maps and OpenStreetMap in production
          frameAncestors: ["'none'"], // Deny all embedding in production
          objectSrc: ["'none'"],
          workerSrc: ["'self'", "blob:"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: [] // [] = enable directive in production (Fortune 50 standard)
        }
      },
      frameguard: { action: "deny" as const }
    };
    
    helmet(helmetConfig)(req, res, next);
  });
  
  // Note: X-Frame-Options is now handled by helmet's frameguard and CSP frame-ancestors
  // No need to set it explicitly as modern browsers prefer CSP frame-ancestors

  const origins = parseOrigins(process.env.ALLOWED_ORIGINS);
  app.use(cors({
    origin: origins,
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization","X-Request-Id"]
  }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_PER_MIN || 600),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
  });
  app.use("/api/", limiter);

  // simple query-size guard
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const q = JSON.stringify(req.query || {});
    if (q.length > 20000) {
      const err: any = new Error("Query too large");
      err.status = 413;
      return next(err);
    }
    next();
  });
}
