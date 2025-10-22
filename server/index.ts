import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import apiRouter from "./apiRouter";

// Import security and logging utilities
import { envValidator, config } from "./utils/envValidator.js";
import { log, stream } from "./utils/logger.js";
import { sessionSecurity } from "./middleware/security.js";

// Validate environment variables before starting
envValidator.validate();

const app = express();
app.set('trust proxy', 1);

(async () => {
  try {
    // ===== PHASE 1: CREATE HTTP SERVER =====
    const server = createServer(app);

    // ===== PHASE 2: VITE AND STATIC ASSETS (No Security) =====
    // Setup Vite or static serving FIRST, before any middleware
    // This ensures Vite's assets bypass all security middleware
    if (app.get("env") === "development") {
      log.info("Setting up Vite development server...");
      await setupVite(app, server);
      log.info("Vite development server setup complete");
    } else {
      // Setup static file serving in production
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

    // ===== PHASE 5: API ROUTES WITH FULL SECURITY =====
    // Mount the API router with all security middleware
    app.use('/api', apiRouter);
    
    // Register all API routes on the API router
    await registerRoutes(app);

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
    server.listen({
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
      
      server.close(() => {
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