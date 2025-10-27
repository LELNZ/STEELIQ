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
  app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" }
  }));

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
