import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";

// Import security and logging utilities
import { envValidator, config } from "./utils/envValidator.js";
import { log, stream } from "./utils/logger.js";
import { 
  helmetConfig,
  corsConfig,
  apiLimiter,
  securityLogger,
  requestSizeLimiter,
  xssProtection,
  sessionSecurity 
} from "./middleware/security.js";

// Validate environment variables before starting
envValidator.validate();

const app = express();
app.set('trust proxy', 1);

(async () => {
  try {
    // ===== APPLY SECURITY MIDDLEWARE ONLY FOR NON-VITE PATHS =====
    // In development, skip security for Vite paths
    const applySecurityMiddleware = (middleware: any) => {
      return (req: Request, res: Response, next: NextFunction) => {
        // In development, check if this is a Vite-related path
        if (config.NODE_ENV === 'development') {
          const isVitePath = req.path.startsWith('/@') ||
                           req.path.startsWith('/src/') ||
                           req.path.includes('/.vite/') ||
                           req.path.includes('/node_modules/') ||
                           req.path.endsWith('.tsx') ||
                           req.path.endsWith('.ts') ||
                           req.path.endsWith('.jsx') ||
                           req.path.endsWith('.js') ||
                           req.path.endsWith('.mjs') ||
                           req.path.endsWith('.css') ||
                           req.path.endsWith('.scss');
          
          if (isVitePath) {
            return next();
          }
        }
        return middleware(req, res, next);
      };
    };

    // Apply security middleware with Vite bypass
    // In development, don't use Helmet at all as it interferes with module loading
    if (config.NODE_ENV === 'production') {
      app.use(helmetConfig);
    }
    
    app.use(applySecurityMiddleware(corsConfig));
    app.use(applySecurityMiddleware(apiLimiter));
    app.use(applySecurityMiddleware(securityLogger));
    app.use(applySecurityMiddleware(requestSizeLimiter));
    app.use(applySecurityMiddleware(xssProtection));

    // ===== BODY PARSING =====
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(cookieParser());

    // ===== SESSION SECURITY =====
    app.use(applySecurityMiddleware(sessionSecurity));

    // ===== HEALTH CHECK ENDPOINTS =====
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        api: 'operational',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    // ===== REQUEST LOGGING =====
    app.use((req, res, next) => {
      const start = Date.now();
      
      res.on("finish", () => {
        const duration = Date.now() - start;
        
        // Only log API requests
        if (req.path.startsWith("/api")) {
          log.logRequest(req, res, duration);
        }
      });

      next();
    });

    // Register API routes - this returns the HTTP server
    const server = await registerRoutes(app);

    // Setup Vite in development AFTER creating the server but with highest priority
    if (app.get("env") === "development") {
      log.info("Setting up Vite development server...");
      await setupVite(app, server);
      log.info("Vite development server setup complete");
    } else {
      // Setup static file serving in production
      serveStatic(app);
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