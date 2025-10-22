/**
 * Environment Variable Validator
 * Ensures all required environment variables are present and valid at startup
 * Part of Fortune 50 security hardening
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Required variables
  DATABASE_URL: string;
  SESSION_SECRET: string;
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: string;
  APP_NAME: string;
  APP_URL: string;
  
  // Optional but recommended
  ANTHROPIC_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  SENDGRID_FROM_NAME?: string;
  
  // Security configuration
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  CORS_ORIGIN?: string;
  SESSION_TIMEOUT_MS?: string;
  
  // Logging
  LOG_LEVEL?: string;
  LOG_OUTPUT?: string;
  LOG_FILE_PATH?: string;
  
  // Production monitoring
  PRODUCTION_DEFECT_RATE?: string;
  PRODUCTION_MONITORING_INTERVAL_MS?: string;
  
  // Business defaults
  DEFAULT_OVERHEAD_PERCENTAGE?: string;
  DEFAULT_PROFIT_MARGIN?: string;
  DEFAULT_GST_RATE?: string;
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  
  /**
   * Validate all environment variables
   */
  public validate(): void {
    console.log('🔍 Validating environment configuration...');
    
    // Check if .env file exists
    if (!existsSync('.env') && process.env.NODE_ENV === 'development') {
      this.warnings.push('.env file not found. Using system environment variables.');
    }
    
    // Validate required variables
    this.validateRequired();
    
    // Validate optional but recommended variables
    this.validateOptional();
    
    // Validate variable formats
    this.validateFormats();
    
    // Validate security settings
    this.validateSecurity();
    
    // Report results
    this.reportResults();
  }
  
  /**
   * Validate required environment variables
   */
  private validateRequired(): void {
    // Only DATABASE_URL is truly required
    if (!process.env.DATABASE_URL) {
      this.errors.push(`Missing required environment variable: DATABASE_URL`);
    } else if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      this.errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    
    // SESSION_SECRET is critical for security but we can generate a default for development
    if (!process.env.SESSION_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        this.errors.push('SESSION_SECRET is required in production');
      } else {
        this.warnings.push('SESSION_SECRET not set - using default for development');
        process.env.SESSION_SECRET = 'development-secret-key-not-for-production-use';
      }
    } else if (process.env.SESSION_SECRET.length < 32) {
      this.warnings.push('SESSION_SECRET should be at least 32 characters long for security');
    }
    
    // Validate NODE_ENV
    if (process.env.NODE_ENV && !['development', 'staging', 'production'].includes(process.env.NODE_ENV)) {
      this.errors.push('NODE_ENV must be one of: development, staging, production');
    }
    
    // Set defaults for other variables
    if (!process.env.PORT) {
      process.env.PORT = '5000';
      this.warnings.push('PORT not set - using default: 5000');
    } else {
      const port = parseInt(process.env.PORT);
      if (isNaN(port) || port < 1 || port > 65535) {
        this.errors.push('PORT must be a valid port number (1-65535)');
      }
    }
    
    if (!process.env.APP_NAME) {
      process.env.APP_NAME = 'STEELIQ';
      this.warnings.push('APP_NAME not set - using default: STEELIQ');
    }
    
    if (!process.env.APP_URL) {
      const port = process.env.PORT || '5000';
      process.env.APP_URL = `http://localhost:${port}`;
      this.warnings.push(`APP_URL not set - using default: http://localhost:${port}`);
    }
  }
  
  /**
   * Validate optional but recommended variables
   */
  private validateOptional(): void {
    // AI Configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      this.warnings.push('ANTHROPIC_API_KEY not set - AI estimation features will be disabled');
    } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      this.warnings.push('ANTHROPIC_API_KEY format appears invalid');
    }
    
    // Email Configuration - Only check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      this.warnings.push('SENDGRID_API_KEY not set - Email notifications will be disabled');
    } else {
      if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        this.warnings.push('SENDGRID_API_KEY format appears invalid');
      }
      if (!process.env.SENDGRID_FROM_EMAIL) {
        // Set a default for development
        if (process.env.NODE_ENV === 'production') {
          this.errors.push('SENDGRID_FROM_EMAIL is required when SENDGRID_API_KEY is set in production');
        } else {
          process.env.SENDGRID_FROM_EMAIL = 'noreply@steeliq.local';
          this.warnings.push('SENDGRID_FROM_EMAIL not set - using default: noreply@steeliq.local');
        }
      }
    }
    
    // Gmail Configuration
    if (process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_SECRET) {
      this.errors.push('GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is set');
    }
    
    if (process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_REDIRECT_URI) {
      this.errors.push('GOOGLE_REDIRECT_URI is required when GOOGLE_CLIENT_ID is set');
    }
  }
  
  /**
   * Validate variable formats
   */
  private validateFormats(): void {
    // Validate numeric environment variables
    const numericVars = [
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
      'SESSION_TIMEOUT_MS',
      'PRODUCTION_MONITORING_INTERVAL_MS',
      'DEFAULT_OVERHEAD_PERCENTAGE',
      'DEFAULT_PROFIT_MARGIN',
      'DB_POOL_MIN',
      'DB_POOL_MAX',
      'AI_TIMEOUT_MS',
      'AI_MAX_RETRIES',
      'MAX_FILE_SIZE_MB'
    ];
    
    for (const varName of numericVars) {
      if (process.env[varName] && isNaN(Number(process.env[varName]))) {
        this.errors.push(`${varName} must be a valid number`);
      }
    }
    
    // Validate decimal environment variables
    const decimalVars = [
      'DEFAULT_GST_RATE',
      'PRODUCTION_DEFECT_RATE',
      'DEFAULT_STEEL_PRICE_PER_KG',
      'DEFAULT_COATING_PRICE_PER_SQM',
      'DEFAULT_LABOR_RATE_PER_HOUR',
      'DEFAULT_OVERTIME_MULTIPLIER'
    ];
    
    for (const varName of decimalVars) {
      if (process.env[varName]) {
        const value = parseFloat(process.env[varName]);
        if (isNaN(value) || value < 0) {
          this.errors.push(`${varName} must be a valid positive decimal number`);
        }
      }
    }
    
    // Validate boolean environment variables
    const booleanVars = [
      'ENABLE_AI_ESTIMATION',
      'ENABLE_EMAIL_NOTIFICATIONS',
      'ENABLE_PRODUCTION_MONITORING',
      'ENABLE_COST_AGGREGATION',
      'ENABLE_2FA',
      'REQUIRE_PASSWORD_UPPERCASE',
      'REQUIRE_PASSWORD_NUMBERS',
      'REQUIRE_PASSWORD_SPECIAL'
    ];
    
    for (const varName of booleanVars) {
      if (process.env[varName] && !['true', 'false'].includes(process.env[varName].toLowerCase())) {
        this.errors.push(`${varName} must be 'true' or 'false'`);
      }
    }
    
    // Validate URL format
    if (process.env.APP_URL && !this.isValidUrl(process.env.APP_URL)) {
      this.errors.push('APP_URL must be a valid URL');
    }
    
    // Validate email format
    if (process.env.SENDGRID_FROM_EMAIL && !this.isValidEmail(process.env.SENDGRID_FROM_EMAIL)) {
      this.errors.push('SENDGRID_FROM_EMAIL must be a valid email address');
    }
    
    // Validate log level
    if (process.env.LOG_LEVEL) {
      const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
      if (!validLevels.includes(process.env.LOG_LEVEL.toLowerCase())) {
        this.errors.push(`LOG_LEVEL must be one of: ${validLevels.join(', ')}`);
      }
    }
  }
  
  /**
   * Validate security-related settings
   */
  private validateSecurity(): void {
    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      // Ensure HTTPS in production
      if (process.env.APP_URL && !process.env.APP_URL.startsWith('https://')) {
        this.warnings.push('APP_URL should use HTTPS in production');
      }
      
      // Ensure strong session secret
      if (process.env.SESSION_SECRET && (
        process.env.SESSION_SECRET === 'your-secure-session-secret-here' ||
        process.env.SESSION_SECRET === 'development-secret-key-not-for-production-use'
      )) {
        this.errors.push('SESSION_SECRET must be changed from default value in production');
      }
      
      // Ensure rate limiting is configured
      if (!process.env.RATE_LIMIT_WINDOW_MS || !process.env.RATE_LIMIT_MAX_REQUESTS) {
        this.warnings.push('Rate limiting should be configured in production');
      }
      
      // Ensure logging is configured
      if (!process.env.LOG_LEVEL || process.env.LOG_LEVEL === 'debug') {
        this.warnings.push('LOG_LEVEL should not be debug in production');
      }
      
      // Check for default passwords or keys
      const defaultValues = [
        'your-database-url-here',
        'your-secure-session-secret-here',
        'sk-ant-api03-xxxxx',
        'SG.xxxxx',
        'your-client-id-here'
      ];
      
      for (const value of defaultValues) {
        if (Object.values(process.env).includes(value)) {
          this.errors.push('Default/example values detected in environment variables');
          break;
        }
      }
    }
  }
  
  /**
   * Report validation results
   */
  private reportResults(): void {
    // Report warnings
    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Environment Configuration Warnings:');
      this.warnings.forEach((warning, index) => {
        console.warn(`  ${index + 1}. ${warning}`);
      });
    }
    
    // Report errors and exit if any
    if (this.errors.length > 0) {
      console.error('\n❌ Environment Configuration Errors:');
      this.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
      
      console.error('\n🚫 Environment validation failed. Please fix the errors above and restart.');
      console.error('📖 Refer to .env.example for configuration guidance.\n');
      
      // Exit with error code
      process.exit(1);
    }
    
    // Success message
    console.log('✅ Environment configuration validated successfully\n');
  }
  
  /**
   * Helper: Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Helper: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();

// Export configuration with defaults
export const config = {
  // Required
  DATABASE_URL: process.env.DATABASE_URL!,
  SESSION_SECRET: process.env.SESSION_SECRET || 'development-secret-key-not-for-production-use',
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production',
  PORT: process.env.PORT || '5000',
  APP_NAME: process.env.APP_NAME || 'STEELIQ',
  APP_URL: process.env.APP_URL || 'http://localhost:5000',
  
  // Optional
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@steeliq.local',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'STEELIQ',
  
  // Security
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:3000'],
  SESSION_TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT_MS || '86400000'),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_OUTPUT: process.env.LOG_OUTPUT || 'console',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs/app.log',
  
  // Production monitoring
  PRODUCTION_DEFECT_RATE: parseFloat(process.env.PRODUCTION_DEFECT_RATE || '0.02'),
  PRODUCTION_MONITORING_INTERVAL_MS: parseInt(process.env.PRODUCTION_MONITORING_INTERVAL_MS || '300000'),
  
  // Business defaults
  DEFAULT_OVERHEAD_PERCENTAGE: parseFloat(process.env.DEFAULT_OVERHEAD_PERCENTAGE || '15'),
  DEFAULT_PROFIT_MARGIN: parseFloat(process.env.DEFAULT_PROFIT_MARGIN || '20'),
  DEFAULT_GST_RATE: parseFloat(process.env.DEFAULT_GST_RATE || '0.15'),
  
  // Feature flags
  ENABLE_AI_ESTIMATION: process.env.ENABLE_AI_ESTIMATION !== 'false',
  ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
  ENABLE_PRODUCTION_MONITORING: process.env.ENABLE_PRODUCTION_MONITORING !== 'false',
  ENABLE_COST_AGGREGATION: process.env.ENABLE_COST_AGGREGATION !== 'false',
  ENABLE_2FA: process.env.ENABLE_2FA === 'true',
};