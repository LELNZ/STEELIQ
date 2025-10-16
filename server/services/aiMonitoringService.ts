/**
 * AI Monitoring Service for Fortune 50-level Observability
 * Provides comprehensive logging, metrics, and alerting
 * Tracks performance, errors, usage patterns, and costs
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface LogEntry {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  service: string;
  operation: string;
  message: string;
  metadata?: any;
  correlationId?: string;
  userId?: number;
  organizationKey?: string;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface Alert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
}

interface UsageMetrics {
  totalRequests: number;
  uniqueUsers: number;
  apiCalls: number;
  tokensConsumed: number;
  estimatedCost: number;
  cacheHitRate: number;
}

interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueDepth: number;
  lastCheck: Date;
}

class AIMonitoringService extends EventEmitter {
  private logs: LogEntry[] = [];
  private metrics: Metric[] = [];
  private alerts: Alert[] = [];
  private correlationMap = new Map<string, LogEntry[]>();
  
  // Performance tracking
  private responseTimes: number[] = [];
  private errorCounts = new Map<string, number>();
  private successCounts = new Map<string, number>();
  
  // Usage tracking
  private requestCounts = new Map<string, number>();
  private userActivity = new Map<number, Date>();
  private tokenUsage = new Map<string, number>();
  
  // Alert thresholds
  private readonly THRESHOLDS = {
    ERROR_RATE: 0.05, // 5% error rate
    RESPONSE_TIME_P95: 5000, // 5 seconds
    MEMORY_USAGE: 0.85, // 85% memory
    QUEUE_DEPTH: 100,
    TOKEN_COST: 100, // $100 per day
    CACHE_HIT_RATE: 0.5 // 50% minimum
  };
  
  // Cost estimation
  private readonly COST_PER_1K_TOKENS = 0.015;
  
  constructor() {
    super();
    this.startMonitoring();
    this.setupAlertChecks();
  }

  /**
   * Log an event with structured data
   */
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    };
    
    // Add to logs
    this.logs.push(logEntry);
    
    // Group by correlation ID if present
    if (logEntry.correlationId) {
      if (!this.correlationMap.has(logEntry.correlationId)) {
        this.correlationMap.set(logEntry.correlationId, []);
      }
      this.correlationMap.get(logEntry.correlationId)!.push(logEntry);
    }
    
    // Track errors
    if (logEntry.level === 'ERROR' || logEntry.level === 'CRITICAL') {
      const errorKey = `${logEntry.service}:${logEntry.operation}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
      
      // Emit error event for real-time monitoring
      this.emit('error', logEntry);
      
      // Check if we need to create an alert
      this.checkErrorRateAlert(logEntry.service);
    }
    
    // Track success
    if (logEntry.level === 'INFO' && !logEntry.error) {
      const successKey = `${logEntry.service}:${logEntry.operation}`;
      this.successCounts.set(successKey, (this.successCounts.get(successKey) || 0) + 1);
    }
    
    // Track performance
    if (logEntry.duration) {
      this.responseTimes.push(logEntry.duration);
      this.checkResponseTimeAlert(logEntry.duration);
    }
    
    // Keep logs size manageable (last 10000 entries)
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }
    
    // Persist critical logs to database
    if (logEntry.level === 'CRITICAL' || logEntry.level === 'ERROR') {
      this.persistLog(logEntry);
    }
  }

  /**
   * Record a metric
   */
  recordMetric(metric: Omit<Metric, 'timestamp'>): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date()
    };
    
    this.metrics.push(fullMetric);
    
    // Emit metric event for real-time dashboards
    this.emit('metric', fullMetric);
    
    // Track specific metrics
    if (metric.name === 'api_tokens_used') {
      const org = metric.tags?.organization || 'default';
      this.tokenUsage.set(org, (this.tokenUsage.get(org) || 0) + metric.value);
      this.checkTokenUsageAlert(org);
    }
    
    // Keep metrics size manageable
    if (this.metrics.length > 5000) {
      this.metrics = this.metrics.slice(-2500);
    }
  }

  /**
   * Track user activity
   */
  trackUserActivity(userId: number, operation: string): void {
    this.userActivity.set(userId, new Date());
    
    const key = `${userId}:${operation}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    
    this.recordMetric({
      name: 'user_activity',
      value: 1,
      unit: 'count',
      tags: { userId: userId.toString(), operation }
    });
  }

  /**
   * Track API usage and costs
   */
  trackAPIUsage(service: string, tokens: number, organizationKey: string): void {
    const cost = (tokens / 1000) * this.COST_PER_1K_TOKENS;
    
    this.recordMetric({
      name: 'api_tokens_used',
      value: tokens,
      unit: 'tokens',
      tags: { service, organization: organizationKey }
    });
    
    this.recordMetric({
      name: 'api_cost',
      value: cost,
      unit: 'USD',
      tags: { service, organization: organizationKey }
    });
    
    this.log({
      level: 'INFO',
      service: 'AI_API',
      operation: 'token_consumption',
      message: `Consumed ${tokens} tokens ($${cost.toFixed(4)})`,
      metadata: { tokens, cost, organizationKey }
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const totalRequests = this.successCounts.size + this.errorCounts.size;
    
    return {
      avgResponseTime: this.calculateAverage(this.responseTimes),
      p95ResponseTime: this.calculatePercentile(sortedTimes, 95),
      p99ResponseTime: this.calculatePercentile(sortedTimes, 99),
      throughput: totalRequests / (this.getUptime() / 1000), // requests per second
      errorRate: this.calculateErrorRate(),
      successRate: 1 - this.calculateErrorRate()
    };
  }

  /**
   * Get usage metrics
   */
  getUsageMetrics(): UsageMetrics {
    const totalTokens = Array.from(this.tokenUsage.values()).reduce((sum, v) => sum + v, 0);
    const estimatedCost = (totalTokens / 1000) * this.COST_PER_1K_TOKENS;
    
    return {
      totalRequests: Array.from(this.requestCounts.values()).reduce((sum, v) => sum + v, 0),
      uniqueUsers: this.userActivity.size,
      apiCalls: this.successCounts.size + this.errorCounts.size,
      tokensConsumed: totalTokens,
      estimatedCost,
      cacheHitRate: this.getCacheHitRate()
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Determine health status
    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    
    if (this.calculateErrorRate() > 0.1 || memUsage.heapUsed / memUsage.heapTotal > 0.9) {
      status = 'UNHEALTHY';
    } else if (this.calculateErrorRate() > 0.05 || memUsage.heapUsed / memUsage.heapTotal > 0.85) {
      status = 'DEGRADED';
    }
    
    return {
      status,
      uptime,
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      activeConnections: this.userActivity.size,
      queueDepth: 0, // Would need to integrate with queue service
      lastCheck: new Date()
    };
  }

  /**
   * Get correlated logs for a specific operation
   */
  getCorrelatedLogs(correlationId: string): LogEntry[] {
    return this.correlationMap.get(correlationId) || [];
  }

  /**
   * Search logs with filters
   */
  searchLogs(filters: {
    level?: LogEntry['level'];
    service?: string;
    operation?: string;
    startTime?: Date;
    endTime?: Date;
    userId?: number;
    organizationKey?: string;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (filters.level) {
      filtered = filtered.filter(l => l.level === filters.level);
    }
    
    if (filters.service) {
      filtered = filtered.filter(l => l.service === filters.service);
    }
    
    if (filters.operation) {
      filtered = filtered.filter(l => l.operation === filters.operation);
    }
    
    if (filters.startTime) {
      filtered = filtered.filter(l => l.timestamp >= filters.startTime!);
    }
    
    if (filters.endTime) {
      filtered = filtered.filter(l => l.timestamp <= filters.endTime!);
    }
    
    if (filters.userId) {
      filtered = filtered.filter(l => l.userId === filters.userId);
    }
    
    if (filters.organizationKey) {
      filtered = filtered.filter(l => l.organizationKey === filters.organizationKey);
    }
    
    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    
    return filtered;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
      
      this.log({
        level: 'INFO',
        service: 'MONITORING',
        operation: 'alert_resolved',
        message: `Alert ${alertId} resolved`,
        metadata: { alert }
      });
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }
    
    return JSON.stringify({
      performance: this.getPerformanceMetrics(),
      usage: this.getUsageMetrics(),
      health: this.getSystemHealth(),
      alerts: this.getActiveAlerts()
    }, null, 2);
  }

  /**
   * Private helper methods
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private calculateErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, v) => sum + v, 0);
    const totalSuccess = Array.from(this.successCounts.values()).reduce((sum, v) => sum + v, 0);
    const total = totalErrors + totalSuccess;
    
    return total > 0 ? totalErrors / total : 0;
  }

  private getCacheHitRate(): number {
    // Would need to integrate with cache service
    return 0.75; // Placeholder
  }

  private getUptime(): number {
    return process.uptime() * 1000; // Convert to milliseconds
  }

  private checkErrorRateAlert(service: string): void {
    const errorRate = this.calculateErrorRate();
    
    if (errorRate > this.THRESHOLDS.ERROR_RATE) {
      const alert: Alert = {
        id: `error_rate_${Date.now()}`,
        severity: errorRate > 0.1 ? 'CRITICAL' : 'HIGH',
        type: 'ERROR_RATE',
        message: `Error rate for ${service} exceeds threshold`,
        threshold: this.THRESHOLDS.ERROR_RATE,
        currentValue: errorRate,
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.push(alert);
      this.emit('alert', alert);
    }
  }

  private checkResponseTimeAlert(responseTime: number): void {
    if (responseTime > this.THRESHOLDS.RESPONSE_TIME_P95) {
      const alert: Alert = {
        id: `response_time_${Date.now()}`,
        severity: responseTime > 10000 ? 'CRITICAL' : 'MEDIUM',
        type: 'RESPONSE_TIME',
        message: 'Response time exceeds threshold',
        threshold: this.THRESHOLDS.RESPONSE_TIME_P95,
        currentValue: responseTime,
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.push(alert);
      this.emit('alert', alert);
    }
  }

  private checkTokenUsageAlert(organization: string): void {
    const tokens = this.tokenUsage.get(organization) || 0;
    const cost = (tokens / 1000) * this.COST_PER_1K_TOKENS;
    
    if (cost > this.THRESHOLDS.TOKEN_COST) {
      const alert: Alert = {
        id: `token_cost_${organization}_${Date.now()}`,
        severity: 'HIGH',
        type: 'TOKEN_COST',
        message: `Token usage cost for ${organization} exceeds daily limit`,
        threshold: this.THRESHOLDS.TOKEN_COST,
        currentValue: cost,
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.push(alert);
      this.emit('alert', alert);
    }
  }

  private async persistLog(log: LogEntry): Promise<void> {
    try {
      // Store critical logs in database
      await db.execute(sql`
        INSERT INTO ai_monitoring_logs (
          timestamp, level, service, operation, message, 
          metadata, correlation_id, user_id, organization_key, error
        ) VALUES (
          ${log.timestamp}, ${log.level}, ${log.service}, ${log.operation}, 
          ${log.message}, ${JSON.stringify(log.metadata)}, ${log.correlationId}, 
          ${log.userId}, ${log.organizationKey}, ${JSON.stringify(log.error)}
        )
      `);
    } catch (error) {
      console.error('[Monitoring] Failed to persist log:', error);
    }
  }

  private exportPrometheusMetrics(): string {
    const metrics = this.getPerformanceMetrics();
    const usage = this.getUsageMetrics();
    
    return `
# HELP ai_response_time_seconds Response time in seconds
# TYPE ai_response_time_seconds histogram
ai_response_time_seconds{quantile="0.5"} ${metrics.avgResponseTime / 1000}
ai_response_time_seconds{quantile="0.95"} ${metrics.p95ResponseTime / 1000}
ai_response_time_seconds{quantile="0.99"} ${metrics.p99ResponseTime / 1000}

# HELP ai_error_rate Error rate
# TYPE ai_error_rate gauge
ai_error_rate ${metrics.errorRate}

# HELP ai_total_requests Total number of requests
# TYPE ai_total_requests counter
ai_total_requests ${usage.totalRequests}

# HELP ai_tokens_consumed Total tokens consumed
# TYPE ai_tokens_consumed counter
ai_tokens_consumed ${usage.tokensConsumed}

# HELP ai_estimated_cost_usd Estimated cost in USD
# TYPE ai_estimated_cost_usd gauge
ai_estimated_cost_usd ${usage.estimatedCost}
`;
  }

  private startMonitoring(): void {
    // Log system health every minute
    setInterval(() => {
      const health = this.getSystemHealth();
      this.log({
        level: 'INFO',
        service: 'MONITORING',
        operation: 'health_check',
        message: `System health: ${health.status}`,
        metadata: health
      });
    }, 60000);
  }

  private setupAlertChecks(): void {
    // Check for stale alerts every 5 minutes
    setInterval(() => {
      const now = Date.now();
      this.alerts.forEach(alert => {
        if (!alert.resolved && now - alert.timestamp.getTime() > 3600000) {
          // Auto-resolve alerts older than 1 hour
          this.resolveAlert(alert.id);
        }
      });
    }, 300000);
  }
}

export const aiMonitoringService = new AIMonitoringService();