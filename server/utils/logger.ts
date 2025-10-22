/**
 * Winston Logger Configuration
 * Structured logging for production-grade observability
 * Part of Fortune 50 security hardening
 */

import winston from 'winston';
import path from 'path';
import { config } from './envValidator.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (config.LOG_OUTPUT === 'console' || config.LOG_OUTPUT === 'both' || config.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: config.NODE_ENV === 'development' ? consoleFormat : logFormat,
      level: config.LOG_LEVEL
    })
  );
}

// File transport (if configured)
if (config.LOG_OUTPUT === 'file' || config.LOG_OUTPUT === 'both') {
  // Ensure log directory exists
  const logDir = path.dirname(config.LOG_FILE_PATH);
  
  // Application log file
  transports.push(
    new winston.transports.File({
      filename: config.LOG_FILE_PATH,
      format: logFormat,
      level: config.LOG_LEVEL,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );
  
  // Error log file (separate)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      format: logFormat,
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  levels,
  level: config.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false
});

// Create a stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Extend logger with custom methods
class Logger {
  private winston: winston.Logger;
  
  constructor(winstonLogger: winston.Logger) {
    this.winston = winstonLogger;
  }
  
  // Standard log methods
  error(message: string, meta?: any) {
    this.winston.error(message, meta);
  }
  
  warn(message: string, meta?: any) {
    this.winston.warn(message, meta);
  }
  
  info(message: string, meta?: any) {
    this.winston.info(message, meta);
  }
  
  http(message: string, meta?: any) {
    this.winston.http(message, meta);
  }
  
  verbose(message: string, meta?: any) {
    this.winston.verbose(message, meta);
  }
  
  debug(message: string, meta?: any) {
    this.winston.debug(message, meta);
  }
  
  silly(message: string, meta?: any) {
    this.winston.silly(message, meta);
  }
  
  // Custom methods for specific use cases
  
  /**
   * Log API request
   */
  logRequest(req: any, res: any, responseTime: number) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('user-agent')
    };
    
    if (res.statusCode >= 400) {
      this.winston.warn('API Request Error', logData);
    } else {
      this.winston.http('API Request', logData);
    }
  }
  
  /**
   * Log database query
   */
  logQuery(query: string, params?: any[], duration?: number) {
    this.winston.debug('Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      params: params?.length ? `${params.length} parameters` : 'none',
      duration: duration ? `${duration}ms` : undefined
    });
  }
  
  /**
   * Log AI service call
   */
  logAI(service: string, action: string, details: any) {
    this.winston.info(`AI Service: ${service}`, {
      action,
      ...details
    });
  }
  
  /**
   * Log security event
   */
  logSecurity(event: string, details: any) {
    this.winston.warn(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
  
  /**
   * Log business metric
   */
  logMetric(metric: string, value: number, unit?: string, metadata?: any) {
    this.winston.info(`Metric: ${metric}`, {
      value,
      unit,
      ...metadata
    });
  }
  
  /**
   * Log audit event
   */
  logAudit(action: string, userId: number, entityType: string, entityId: number, changes?: any) {
    this.winston.info('Audit Event', {
      action,
      userId,
      entityType,
      entityId,
      changes,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log error with stack trace
   */
  logError(error: Error, context?: string) {
    this.winston.error(context || 'Application Error', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
  
  /**
   * Log startup information
   */
  logStartup(port: string | number, environment: string) {
    this.winston.info('🚀 Application Started', {
      port,
      environment,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime()
    });
  }
  
  /**
   * Log shutdown
   */
  logShutdown(reason: string) {
    this.winston.info('Application Shutting Down', {
      reason,
      uptime: process.uptime()
    });
  }
}

// Export singleton logger instance
export const log = new Logger(logger);

// Also export raw winston logger if needed
export const winstonLogger = logger;

// Replace console methods in production
if (config.NODE_ENV === 'production') {
  console.log = (...args) => log.info(args.join(' '));
  console.error = (...args) => log.error(args.join(' '));
  console.warn = (...args) => log.warn(args.join(' '));
  console.debug = (...args) => log.debug(args.join(' '));
  console.info = (...args) => log.info(args.join(' '));
}

// Log unhandled errors
process.on('uncaughtException', (error: Error) => {
  log.logError(error, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled Rejection', {
    reason,
    promise
  });
});

export default log;