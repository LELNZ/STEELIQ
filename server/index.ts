import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";

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

const app = express();
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
    app.use(express.json({ limit: '50mb' }));
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
    app.use(applyToApiOnly(securityLogger));
    app.use(applyToApiOnly(helmet(getHelmetConfig())));
    app.use(applyToApiOnly(cors(getCorsConfig() as any)));
    app.use(applyToApiOnly(xssProtection));
    app.use(applyToApiOnly(requestSizeLimiter));
    
    // Apply RBAC middleware in shadow mode initially
    app.use(applyToApiOnly(rbacMiddleware()));
    
    // Apply rate limiting with path-specific limits
    const rateLimits = getRateLimits();
    app.use('/api/auth/*', createRateLimiter(rateLimits.auth.windowMs, rateLimits.auth.max, 'Too many authentication attempts'));
    app.use('/api/ai/*', createRateLimiter(rateLimits.ai.windowMs, rateLimits.ai.max, 'AI processing limit reached'));
    app.use('/api/upload/*', createRateLimiter(rateLimits.uploads.windowMs, rateLimits.uploads.max, 'Upload limit reached'));
    app.use('/api/files/*', createRateLimiter(rateLimits.uploads.windowMs, rateLimits.uploads.max, 'Upload limit reached'));
    app.use(applyToApiOnly(createRateLimiter(rateLimits.general.windowMs, rateLimits.general.max)));
    
    // Register all API routes (registerRoutes handles server creation)
    const httpServer = await registerRoutes(app);
    
    // ===== PHASE 6: SETUP VITE IN DEVELOPMENT =====
    if (app.get("env") === "development") {
      log.info("Setting up Vite development server...");
      await setupVite(app, httpServer);
      log.info("Vite development server setup complete");
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

    // ===== 404 HANDLER =====
    app.use('*', (req: Request, res: Response) => {
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