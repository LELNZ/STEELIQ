/**
 * Environment-aware Security Configuration
 * Provides different security settings for development and production
 */

import { config } from '../utils/envValidator';

export const securityConfig = {
  development: {
    // Helmet CSP configuration for development
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Allow unsafe-inline and eval for Vite HMR and development
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*", "ws://localhost:*", "http://*.replit.dev", "ws://*.replit.dev", "https://*.replit.dev", "wss://*.replit.dev"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://*.replit.dev"],
          connectSrc: ["'self'", "ws://localhost:*", "http://localhost:*", "wss://*.replit.dev", "https://*.replit.dev", "https://api.anthropic.com", "https://api.openai.com"],
          frameAncestors: ["'self'", "https://*.replit.dev"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "blob:"],
          workerSrc: ["'self'", "blob:"],
        }
      },
      crossOriginEmbedderPolicy: false, // Allow Vite HMR
      hsts: false // Disable HSTS in development
    },
    
    // CORS configuration for development
    cors: {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      maxAge: 86400
    },
    
    // Rate limiting for development (more permissive)
    rateLimits: {
      general: { windowMs: 15 * 60 * 1000, max: 200 },
      auth: { windowMs: 15 * 60 * 1000, max: 20 },
      ai: { windowMs: 60 * 60 * 1000, max: 50 },
      upload: { windowMs: 60 * 60 * 1000, max: 100 }
    },
    
    // Security monitoring in development
    monitoring: {
      logLevel: 'debug',
      blockSuspiciousRequests: false, // Only log, don't block
      alertThreshold: 50 // Alert after 50 suspicious requests
    }
  },
  
  production: {
    // Helmet CSP configuration for production (strict)
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.anthropic.com", "https://api.openai.com"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [] as string[],
        }
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    },
    
    // CORS configuration for production (strict)
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (server-to-server)
        if (!origin) return callback(null, true);
        
        // Check against whitelist
        const allowedOrigins = [
          config.APP_URL,
          'https://*.replit.app',
          'https://*.replit.dev'
        ];
        
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed.includes('*')) {
            const pattern = new RegExp(allowed.replace('*', '.*'));
            return pattern.test(origin);
          }
          return allowed === origin;
        });
        
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      maxAge: 86400
    },
    
    // Rate limiting for production (strict)
    rateLimits: {
      general: { windowMs: 15 * 60 * 1000, max: 100 },
      auth: { windowMs: 15 * 60 * 1000, max: 5 },
      ai: { windowMs: 60 * 60 * 1000, max: 20 },
      upload: { windowMs: 60 * 60 * 1000, max: 50 }
    },
    
    // Security monitoring in production
    monitoring: {
      logLevel: 'warn',
      blockSuspiciousRequests: true, // Block and log
      alertThreshold: 10 // Alert after 10 suspicious requests
    }
  }
};

// Export the appropriate config based on environment
export const getSecurityConfig = () => {
  return config.NODE_ENV === 'production' 
    ? securityConfig.production 
    : securityConfig.development;
};

// Export specific configurations
export const getHelmetConfig = () => getSecurityConfig().helmet;
export const getCorsConfig = () => getSecurityConfig().cors;
export const getRateLimits = () => getSecurityConfig().rateLimits;
export const getMonitoringConfig = () => getSecurityConfig().monitoring;