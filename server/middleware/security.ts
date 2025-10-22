/**
 * Security Middleware Configuration
 * Implements helmet, rate limiting, CORS, and other security measures
 * Part of Fortune 50 security hardening
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { config } from '../utils/envValidator.js';
import { log } from '../utils/logger.js';

/**
 * Configure Helmet for security headers
 */
export const helmetConfig = config.NODE_ENV === 'production' 
  ? helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"], 
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://api.anthropic.com", "wss:", "ws:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })
  : helmet({
      contentSecurityPolicy: false, // Disable CSP completely in development
      crossOriginEmbedderPolicy: false, // Disable to allow Vite HMR
      hsts: false, // Disable HSTS in development
    });

/**
 * Configure CORS
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);
    
    // Check if running on Replit - use REPLIT_DOMAINS which contains the actual domain
    const replitDomain = process.env.REPLIT_DOMAINS;
    if (replitDomain) {
      // Allow the specific Replit domain and any subdomains
      if (origin.includes(replitDomain) || 
          origin.includes('.replit.dev') || 
          origin.includes('.replit.app') || 
          origin.includes('.repl.co') ||
          origin.includes('.replit.com') ||
          origin.includes('replit.')) {
        return callback(null, true);
      }
    }
    
    // In development, be more permissive
    if (config.NODE_ENV === 'development') {
      // Allow localhost and 127.0.0.1 with any port
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow Replit domains in development mode
      if (origin.includes('.replit.dev') || 
          origin.includes('.replit.app') || 
          origin.includes('.repl.co')) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    const allowedOrigins = [
      ...config.CORS_ORIGIN,
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000',
      'https://localhost:5000',
      'https://localhost:3000',
      'https://127.0.0.1:5000',
      'https://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, log but allow; in production, block
      if (config.NODE_ENV === 'development') {
        log.info(`CORS: Allowing unmatched origin in development: ${origin}`);
        callback(null, true);
      } else {
        log.logSecurity('CORS Blocked', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
});

/**
 * Configure rate limiting
 */
export const createRateLimiter = (
  windowMs: number = config.RATE_LIMIT_WINDOW_MS,
  max: number = config.RATE_LIMIT_MAX_REQUESTS,
  message?: string
): RequestHandler => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      log.logSecurity('Rate Limit Exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent')
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests, please try again later.'
        }
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/api/health') {
        return true;
      }
      
      // Skip rate limiting for Vite dev server paths
      if (req.path.startsWith('/@vite/') || 
          req.path.startsWith('/@fs/') || 
          req.path.startsWith('/@id/') ||
          req.path.startsWith('/@react-refresh') ||
          req.path.includes('/__vite_ping') ||
          req.path.includes('/.vite/')) {
        return true;
      }
      
      // Skip rate limiting for static assets and development resources
      const staticExtensions = [
        '.js', '.mjs', '.jsx', '.ts', '.tsx',
        '.css', '.scss', '.sass', '.less',
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
        '.woff', '.woff2', '.ttf', '.eot', '.otf',
        '.map', '.json',
        '.html', '.xml', '.txt', '.md'
      ];
      
      // Check file extensions
      if (staticExtensions.some(ext => req.path.endsWith(ext))) {
        return true;
      }
      
      // Skip rate limiting for specific paths
      const skipPaths = [
        '/src/',
        '/client/',
        '/assets/',
        '/node_modules/',
        '/service-worker.js',
        '/favicon.ico',
        '/manifest.json',
        '/robots.txt'
      ];
      
      return skipPaths.some(path => req.path.includes(path));
    }
  });
};

// Specific rate limiters for different endpoints
export const apiLimiter = createRateLimiter();

export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests
  'Too many authentication attempts, please try again later.'
);

export const aiLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 requests
  'AI processing limit reached, please try again later.'
);

export const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  50, // 50 uploads
  'Upload limit reached, please try again later.'
);

/**
 * Security logging middleware
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,  // Directory traversal
    /<script/i,      // XSS attempts
    /union.*select/i, // SQL injection
    /eval\(/i,       // Code injection
    /base64/i,       // Encoded payloads
    /cmd=|exec=/i,   // Command injection
  ];
  
  const url = req.originalUrl || req.url;
  const body = JSON.stringify(req.body || {});
  const query = JSON.stringify(req.query || {});
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
      log.logSecurity('Suspicious Request Pattern', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        pattern: pattern.toString(),
        userAgent: req.get('user-agent')
      });
      break;
    }
  }
  
  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.get('content-length');
  const maxSize = 10 * 1024 * 1024; // 10MB default
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    log.logSecurity('Request Size Exceeded', {
      ip: req.ip,
      path: req.path,
      size: contentLength,
      maxSize
    });
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload too large'
      }
    });
  }
  
  next();
};

/**
 * XSS Protection middleware
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Set additional XSS protection headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Sanitize user input (basic implementation - consider using a library like DOMPurify)
  const sanitizeInput = (input: any): any => {
    if (typeof input === 'string') {
      // Remove script tags and dangerous attributes
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '');
    }
    if (Array.isArray(input)) {
      return input.map(sanitizeInput);
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const key in input) {
        sanitized[key] = sanitizeInput(input[key]);
      }
      return sanitized;
    }
    return input;
  };
  
  // Sanitize request body, query, and params
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  
  next();
};

/**
 * API Key validation middleware (for external API access)
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  
  if (!apiKey) {
    log.logSecurity('Missing API Key', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key required'
      }
    });
  }
  
  // TODO: Validate API key against database
  // For now, just check format
  if (!apiKey.startsWith('sk-') || apiKey.length < 32) {
    log.logSecurity('Invalid API Key', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key'
      }
    });
  }
  
  next();
};

/**
 * IP Whitelist middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    // Allow localhost in development
    if (config.NODE_ENV === 'development' && (clientIP === '::1' || clientIP === '127.0.0.1')) {
      return next();
    }
    
    if (!allowedIPs.includes(clientIP)) {
      log.logSecurity('IP Not Whitelisted', {
        ip: clientIP,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied'
        }
      });
    }
    
    next();
  };
};

/**
 * Session security middleware
 */
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (req.session) {
    // Regenerate session ID on login (prevent session fixation)
    if (req.path === '/api/auth/login' && req.method === 'POST') {
      const oldSession = req.session;
      req.session.regenerate((err) => {
        if (err) {
          log.logError(err, 'Session regeneration failed');
        }
        // Restore user data to new session
        Object.assign(req.session, oldSession);
        next();
      });
      return;
    }
    
    // Check session timeout
    if (req.session.lastActivity) {
      const now = Date.now();
      const lastActivity = new Date(req.session.lastActivity).getTime();
      
      if (now - lastActivity > config.SESSION_TIMEOUT_MS) {
        log.logSecurity('Session Timeout', {
          userId: req.session.userId,
          ip: req.ip
        });
        req.session.destroy((err) => {
          if (err) {
            log.logError(err, 'Session destruction failed');
          }
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'SESSION_TIMEOUT',
            message: 'Session expired, please login again'
          }
        });
      }
    }
    
    // Update last activity
    req.session.lastActivity = new Date();
  }
  
  next();
};

/**
 * Combine all security middleware
 */
export const securityMiddleware = [
  helmetConfig,
  corsConfig,
  apiLimiter,
  securityLogger,
  requestSizeLimiter,
  xssProtection,
  sessionSecurity
];

export default {
  helmetConfig,
  corsConfig,
  createRateLimiter,
  apiLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  securityLogger,
  requestSizeLimiter,
  xssProtection,
  apiKeyAuth,
  ipWhitelist,
  sessionSecurity,
  securityMiddleware
};