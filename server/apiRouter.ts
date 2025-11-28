import { Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { 
  xssProtection,
  requestSizeLimiter,
  createRateLimiter,
  securityLogger
} from './middleware/security';
import { getHelmetConfig, getCorsConfig, getRateLimits } from './config/securityConfig';
import { config } from './utils/envValidator';
import { log } from './utils/logger';

// Create dedicated API router with full security stack
const apiRouter = Router();

// ===== SECURITY MONITORING =====
apiRouter.use(securityLogger);

// ===== XSS PROTECTION =====
// Note: Helmet and CORS are already applied globally in securityBaseline.ts
apiRouter.use(xssProtection);

// ===== REQUEST SIZE LIMITING =====
apiRouter.use(requestSizeLimiter);

// ===== GRANULAR RATE LIMITING =====
// Get environment-aware rate limits
const rateLimits = getRateLimits();

// Create rate limiters with environment-specific configurations
const generalRateLimiter = createRateLimiter(rateLimits.general.windowMs, rateLimits.general.max);
const authRateLimiter = createRateLimiter(rateLimits.auth.windowMs, rateLimits.auth.max, 'Too many authentication attempts');
const aiRateLimiter = createRateLimiter(rateLimits.ai.windowMs, rateLimits.ai.max, 'AI processing limit reached');
const uploadRateLimiter = createRateLimiter(rateLimits.upload.windowMs, rateLimits.upload.max, 'Upload limit reached');

// Apply different rate limits based on endpoint type
apiRouter.use('/auth/*', authRateLimiter);
apiRouter.use('/ai/*', aiRateLimiter);
apiRouter.use('/upload/*', uploadRateLimiter);
apiRouter.use('/files/*', uploadRateLimiter);
apiRouter.use(generalRateLimiter); // Default for all other endpoints

// Log security middleware initialization
log.info('API Router Security Stack Initialized', {
  environment: config.NODE_ENV,
  helmetEnabled: true,
  corsEnabled: true,
  xssProtectionEnabled: true,
  rateLimitingEnabled: true,
  endpoints: {
    auth: `${rateLimits.auth.max} req/${rateLimits.auth.windowMs / 60000} min`,
    ai: `${rateLimits.ai.max} req/${rateLimits.ai.windowMs / 60000} min`,
    upload: `${rateLimits.upload.max} req/${rateLimits.upload.windowMs / 60000} min`,
    general: `${rateLimits.general.max} req/${rateLimits.general.windowMs / 60000} min`
  }
});

export default apiRouter;