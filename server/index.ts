import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./viteV5";

// Import security and logging utilities
import { envValidator, config } from "./utils/envValidator.js";
import { log, stream } from "./utils/logger.js";
import { 
  sessionSecurity,
  xssProtection,
  requestSizeLimiter,
  createRateLimiter,
  securityLogger 
} from "./middleware/security.js";
import { getHelmetConfig, getCorsConfig, getRateLimits } from "./config/securityConfig";
import { rbacMiddleware } from "./middleware/rbac";

// Validate environment variables before starting
envValidator.validate();
import { applySecurityBaseline } from "./middleware/securityBaseline";
import { applyObservability } from "./middleware/observability";

// Fortune 50 Compliance: Dual Authorization Bootstrap
import { rehydrateDualAuthManager, cleanupExpiredDualAuthRequests } from "./services/dualAuthBootstrap";

// Real-time Notifications: WebSocket Service
import WebSocketService from "./services/webSocketService";

// Fortune 50 Compliance: Data Retention Services
import { GPSArchivalService } from "./services/gpsArchivalService";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();
applyObservability(app);
applySecurityBaseline(app);
app.set('trust proxy', 1);

(async () => {
  try {

    // ===== PHASE 2: VITE AND STATIC ASSETS (No Security) =====
    // Setup static serving in production (Vite setup happens after server creation in dev)
    if (app.get("env") !== "development") {
      serveStatic(app);
    }

    // ===== PHASE 3: GLOBAL MIDDLEWARE (Applied to all routes) =====
    // These are safe for both Vite and API routes
    
    // Wave 3: Capture raw body as Buffer for webhook signature verification
    // Preserves exact bytes for HMAC computation per provider specs
    app.use(express.json({ 
      limit: '50mb',
      verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
        // Only capture raw body for webhook routes - store as Buffer to preserve exact bytes
        if (req.url?.startsWith('/api/payroll-integrations/webhooks')) {
          (req as any).rawBodyBuffer = Buffer.from(buf);
        }
      }
    }));
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(cookieParser());

    // Session middleware - needed for authentication
    app.use(sessionSecurity);

    // ===== PHASE 4: HEALTH CHECK ENDPOINTS (No security needed) =====
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // ===== PHASE 5: API ROUTES WITH SECURITY =====
    // Apply security middleware conditionally to /api routes only
    const applyToApiOnly = (middleware: any) => {
      return (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api')) {
          return middleware(req, res, next);
        }
        next();
      };
    };
    
    // Apply security middleware stack only to API routes
    // Note: Basic security (helmet, CORS, X-Frame-Options) is already applied in securityBaseline.ts
    app.use(applyToApiOnly(securityLogger));
    app.use(applyToApiOnly(xssProtection));
    app.use(applyToApiOnly(requestSizeLimiter));
    
    // Apply RBAC middleware in shadow mode initially
    app.use(applyToApiOnly(rbacMiddleware()));
    
    // Apply rate limiting with path-specific limits
    const rateLimits = getRateLimits();
    app.use('/api/auth', createRateLimiter(rateLimits.auth.windowMs, rateLimits.auth.max, 'Too many authentication attempts'));
    app.use('/api/ai', createRateLimiter(rateLimits.ai.windowMs, rateLimits.ai.max, 'AI processing limit reached'));
    app.use('/api/upload', createRateLimiter(rateLimits.uploads.windowMs, rateLimits.uploads.max, 'Upload limit reached'));
    app.use('/api/files', createRateLimiter(rateLimits.uploads.windowMs, rateLimits.uploads.max, 'Upload limit reached'));
    app.use(applyToApiOnly(createRateLimiter(rateLimits.general.windowMs, rateLimits.general.max)));
    
    // ===== FORTUNE 50 COMPLIANCE: DUAL AUTH REHYDRATION =====
    // Rehydrate dual authorization manager from database before routes are registered
    // This ensures pending approval workflows survive server restarts
    const rehydrationResult = await rehydrateDualAuthManager();
    if (!rehydrationResult.success) {
      log.warn('[Startup] Dual auth rehydration failed, continuing with empty state', {
        error: rehydrationResult.error
      });
    } else {
      log.info('[Startup] Dual auth rehydration complete', {
        hydratedCount: rehydrationResult.hydratedCount,
        expiredCount: rehydrationResult.expiredCount
      });
    }
    
    // Setup periodic cleanup of expired dual auth requests (every 5 minutes)
    setInterval(async () => {
      try {
        await cleanupExpiredDualAuthRequests();
      } catch (error) {
        log.warn('[Cleanup] Failed to cleanup expired dual auth requests', { error });
      }
    }, 5 * 60 * 1000);
    
    // ===== FORTUNE 50 COMPLIANCE: GPS DATA ARCHIVAL (Daily at midnight) =====
    // Runs GPS data compression (90 days), archival (365 days), and purging (7 years)
    const runGPSArchival = async () => {
      try {
        log.info('[GPS Archival] Starting daily GPS data archival job');
        const gpsArchivalService = new GPSArchivalService();
        const result = await gpsArchivalService.archiveGPSData();
        log.info('[GPS Archival] Completed', {
          compressed: result.compressed,
          archived: result.archived,
          deleted: result.deleted,
          errors: result.errors.length
        });
      } catch (error) {
        log.error('[GPS Archival] Failed', { error });
      }
    };
    
    // Run GPS archival every 24 hours (86400000ms)
    setInterval(runGPSArchival, 24 * 60 * 60 * 1000);
    // Also run once at startup (after 10 second delay to allow server to stabilize)
    setTimeout(runGPSArchival, 10000);
    
    // ===== FORTUNE 50 COMPLIANCE: NOTIFICATION RETENTION ENFORCEMENT =====
    // Enforces notification retention_days field, purges expired notifications
    const enforceNotificationRetention = async () => {
      try {
        log.info('[Notification Retention] Starting retention enforcement');
        
        // Find and purge expired notifications based on retention_days
        const result = await db.execute(sql`
          UPDATE notifications 
          SET 
            subject = '[PURGED]',
            body = '[Content purged per retention policy]',
            pii_redacted = true,
            updated_at = NOW()
          WHERE 
            retention_days IS NOT NULL 
            AND created_at < NOW() - (retention_days * INTERVAL '1 day')
            AND subject != '[PURGED]'
          RETURNING id
        `);
        
        const purgedCount = result.rows?.length || 0;
        log.info('[Notification Retention] Completed', { purgedCount });
      } catch (error) {
        log.error('[Notification Retention] Failed', { error });
      }
    };
    
    // Run notification retention every 6 hours (21600000ms)
    setInterval(enforceNotificationRetention, 6 * 60 * 60 * 1000);
    // Also run once at startup (after 15 second delay)
    setTimeout(enforceNotificationRetention, 15000);
    
    // Register all API routes (registerRoutes handles server creation)
    const httpServer = await registerRoutes(app);

    // ===== WAVE 2: INITIALIZE WEBSOCKET SERVICE =====
    // Real-time notifications require WebSocket connection
    try {
      WebSocketService.getInstance().initialize(httpServer);
      log.info('[Startup] WebSocket service initialized for real-time notifications');
    } catch (wsError) {
      log.warn('[Startup] WebSocket initialization failed, real-time notifications disabled', {
        error: wsError
      });
    }

    // ===== ERROR HANDLING MIDDLEWARE =====
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      // Log the error
      log.logError(err, `API Error: ${req.method} ${req.path}`);
      
      // Don't leak error details in production
      const isDevelopment = config.NODE_ENV === 'development';
      const status = err.status || err.statusCode || 500;
      const message = isDevelopment ? err.message : 'Internal Server Error';
      
      res.status(status).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message,
          ...(isDevelopment && { stack: err.stack })
        }
      });
    });

    // ===== 404 HANDLER (Only for production) =====
    if (app.get("env") !== "development") {
      app.use((req: Request, res: Response) => {
        log.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
        
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found'
          }
        });
      });
    }
    
    // ===== PHASE 6: SETUP VITE IN DEVELOPMENT =====
    if (app.get("env") === "development") {
      log.info("Setting up Vite development server...");
      await setupVite(app, httpServer);
      log.info("Vite development server setup complete");
    }

    // ===== START SERVER =====
    const port = config.PORT || 5000;
    httpServer.listen({
      port: Number(port),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log.logStartup(port, config.NODE_ENV);
      log.info(`🚀 STEELIQ Server Running`, {
        port,
        environment: config.NODE_ENV,
        url: config.APP_URL,
        features: {
          ai: config.ENABLE_AI_ESTIMATION,
          email: config.ENABLE_EMAIL_NOTIFICATIONS,
          monitoring: config.ENABLE_PRODUCTION_MONITORING,
          costAggregation: config.ENABLE_COST_AGGREGATION,
          twoFA: config.ENABLE_2FA
        }
      });
    });

    // ===== GRACEFUL SHUTDOWN =====
    const gracefulShutdown = (signal: string) => {
      log.logShutdown(signal);
      
      httpServer.close(() => {
        log.info('HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        log.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    log.logError(error as Error, 'Failed to start server');
    process.exit(1);
  }
})();