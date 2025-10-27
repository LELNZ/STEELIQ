import type { Application, Request, Response, NextFunction } from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
      "response.headers.set-cookie"
    ],
    censor: "[REDACTED]"
  },
  base: undefined // don't include pid/hostname to keep logs clean in serverless/containers
});

export function applyObservability(app: Application) {
  // Request ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers["x-request-id"] as string) || uuidv4();
    (req as any).id = id;
    res.setHeader("X-Request-Id", id);
    next();
  });

  // Structured request logs
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => ((req as any).id as string) || uuidv4(),
      customLogLevel: (res, err) => {
        if (err) return "error";
        if (res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      }
    })
  );

  // Simple per-request timeout guard (does not kill the process; just logs & responds)
  const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const t = setTimeout(() => {
      try {
        (req as any).log?.warn({ timeoutMs }, "request timed out");
        if (!res.headersSent) {
          res.status(504).json({ error: "Gateway Timeout", requestId: (req as any).id });
        }
      } catch {}
    }, timeoutMs);
    res.on("finish", () => clearTimeout(t));
    res.on("close", () => clearTimeout(t));
    next();
  });

  // Centralized error handler (MUST be last)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    (req as any).log?.error({ err, status }, "unhandled error");
    if (res.headersSent) return;
    res
      .status(status)
      .json({
        error: status >= 500 ? "Internal Server Error" : (err?.message || "Request error"),
        requestId: (req as any).id
      });
  });
}
