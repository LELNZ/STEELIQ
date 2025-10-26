/**
 * Production Monitoring Service
 * Tracks real-time production metrics and OEE calculations
 * Part of Wave 3 - Enterprise Integration
 * 
 * IMPORTANT: This service should integrate with real sensors/PLCs in production
 * Currently using configurable defaults for demonstration
 */

import { db } from '../db/index.ts';
import { 
  machines, 
  machineStatusLogs, 
  productionEvents, 
  productionMetrics,
  productionShifts,
  workOrders 
} from '@shared/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { config } from '../utils/envValidator.js';
import { log } from '../utils/logger.js';

// Get configurable values from environment
const PRODUCTION_CONFIG = {
  defectRate: config.PRODUCTION_DEFECT_RATE || 0.02, // Default 2%
  qualityThreshold: parseFloat(process.env.PRODUCTION_QUALITY_THRESHOLD || '0.05'), // Default 5%
  monitoringInterval: config.PRODUCTION_MONITORING_INTERVAL_MS || 300000, // Default 5 minutes
  eventRecordingInterval: parseInt(process.env.PRODUCTION_EVENT_INTERVAL_MS || '1800000'), // Default 30 minutes
  
  // Default availability and performance when no data
  defaultAvailability: parseFloat(process.env.DEFAULT_AVAILABILITY || '0.85'), // Default 85%
  defaultUtilization: parseFloat(process.env.DEFAULT_UTILIZATION || '0.75'), // Default 75%
  defaultPerformance: parseFloat(process.env.DEFAULT_PERFORMANCE || '0.85'), // Default 85%
  
  // Machine status check intervals
  statusLogInterval: parseInt(process.env.STATUS_LOG_INTERVAL_MS || '300000'), // Default 5 minutes
};

class ProductionMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start production monitoring
   */
  async startMonitoring(): Promise<void> {
    log.info('Starting production monitoring service', {
      defectRate: PRODUCTION_CONFIG.defectRate,
      monitoringInterval: PRODUCTION_CONFIG.monitoringInterval
    });
    
    // Clear any existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Collect data immediately
    await this.collectProductionData();
    
    // Set up periodic collection
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectProductionData();
      } catch (error) {
        log.logError(error as Error, 'Production monitoring error');
      }
    }, PRODUCTION_CONFIG.monitoringInterval);
  }
  
  /**
   * Stop production monitoring
   */
  stopMonitoring(): void {
    log.info('Stopping production monitoring service');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  /**
   * Collect production data from all sources
   */
  async collectProductionData(): Promise<void> {
    const now = new Date();
    log.debug('Collecting production data', { timestamp: now });
    
    // Get all active machines
    const activeMachines = await db.select()
      .from(machines)
      .where(eq(machines.status, 'active'));
    
    for (const machine of activeMachines) {
      // Get current status from latest status log
      const [latestStatus] = await db.select()
        .from(machineStatusLogs)
        .where(eq(machineStatusLogs.machineId, machine.id))
        .orderBy(desc(machineStatusLogs.timestamp))
        .limit(1);
      
      // If machine state changed or it's time for periodic log
      if (this.shouldLogStatus(machine, latestStatus)) {
        await this.logMachineStatus(machine, now);
      }
      
      // Check for production events to record
      await this.checkAndRecordProductionEvents(machine, now);
    }
    
    // Calculate and store production metrics
    await this.calculateAndStoreMetrics(now);
  }
  
  /**
   * Determine if we should log machine status
   */
  private shouldLogStatus(machine: any, latestStatus: any): boolean {
    if (!latestStatus) return true;
    
    const timeSinceLastLog = Date.now() - new Date(latestStatus.timestamp).getTime();
    
    // Log if status changed or it's been more than the configured interval
    return machine.operationalStatus !== latestStatus.status || 
           timeSinceLastLog > PRODUCTION_CONFIG.statusLogInterval;
  }
  
  /**
   * Log machine status
   */
  private async logMachineStatus(machine: any, timestamp: Date): Promise<void> {
    await db.insert(machineStatusLogs).values({
      machineId: machine.id,
      status: machine.operationalStatus || 'idle',
      timestamp,
      notes: `Automated status capture`
    });
    
    log.debug('Machine status logged', {
      machineId: machine.id,
      status: machine.operationalStatus
    });
  }
  
  /**
   * Check and record production events
   */
  private async checkAndRecordProductionEvents(machine: any, timestamp: Date): Promise<void> {
    // Get active work orders for this machine
    const activeWorkOrders = await db.select()
      .from(workOrders)
      .where(and(
        eq(workOrders.assignedMachine, machine.id),
        eq(workOrders.status, 'in_progress')
      ));
    
    for (const workOrder of activeWorkOrders) {
      // Check if we should record a production event
      const shouldRecord = await this.shouldRecordProductionEvent(workOrder, machine);
      
      if (shouldRecord) {
        await this.recordProductionEvent(workOrder, machine, timestamp);
      }
    }
  }
  
  /**
   * Determine if we should record a production event
   */
  private async shouldRecordProductionEvent(workOrder: any, machine: any): Promise<boolean> {
    // Get last production event for this work order
    const [lastEvent] = await db.select()
      .from(productionEvents)
      .where(and(
        eq(productionEvents.workOrderId, workOrder.id),
        eq(productionEvents.machineId, machine.id)
      ))
      .orderBy(desc(productionEvents.eventTime))
      .limit(1);
    
    if (!lastEvent) return true;
    
    const timeSinceLastEvent = Date.now() - new Date(lastEvent.eventTime).getTime();
    
    // Record event at configured interval for active work orders
    return timeSinceLastEvent > PRODUCTION_CONFIG.eventRecordingInterval;
  }
  
  /**
   * Record a production event
   * NOTE: In production, this should receive real data from sensors/PLCs
   */
  private async recordProductionEvent(
    workOrder: any,
    machine: any,
    timestamp: Date
  ): Promise<void> {
    const quantity = workOrder.plannedQuantity || 1;
    const targetQuantity = workOrder.plannedQuantity || 1;
    
    // Calculate production progress
    // TODO: Replace with real sensor data in Wave 4 (Physical Integration)
    const progressPercent = Math.min(
      100,
      (Date.now() - new Date(workOrder.startDate).getTime()) / 
      (new Date(workOrder.dueDate).getTime() - new Date(workOrder.startDate).getTime()) * 100
    );
    
    const producedQuantity = Math.floor((progressPercent / 100) * quantity);
    
    // Calculate defects based on configurable rate
    // TODO: Replace with real quality control data in Wave 4
    const defects = Math.floor(producedQuantity * PRODUCTION_CONFIG.defectRate);
    
    await db.insert(productionEvents).values({
      machineId: machine.id,
      jobId: workOrder.jobId,
      workOrderId: workOrder.id,
      eventType: 'production',
      eventTime: timestamp,
      quantity: producedQuantity,
      scrapQuantity: defects,
      passedQc: defects < (producedQuantity * PRODUCTION_CONFIG.qualityThreshold),
      operatorId: workOrder.assignedOperator,
      targetQuantity,
      actualVsTarget: ((producedQuantity / targetQuantity) * 100).toFixed(2),
      notes: `Production tracking (awaiting sensor integration)`
    });
    
    log.info('Production event recorded', {
      workOrderId: workOrder.id,
      machineId: machine.id,
      produced: producedQuantity,
      defects,
      defectRate: PRODUCTION_CONFIG.defectRate
    });
  }
  
  /**
   * Calculate and store production metrics
   */
  private async calculateAndStoreMetrics(timestamp: Date): Promise<void> {
    // Get current shift
    const [currentShift] = await db.select()
      .from(productionShifts)
      .where(and(
        lte(productionShifts.startTime, timestamp),
        gte(productionShifts.endTime, timestamp)
      ))
      .limit(1);
    
    if (!currentShift) {
      // Create a new shift if none exists
      const [newShift] = await db.insert(productionShifts).values({
        shiftName: this.getShiftName(timestamp),
        startTime: this.getShiftStartTime(timestamp),
        endTime: this.getShiftEndTime(timestamp)
      }).returning();
      
      await this.calculateMetricsForShift(newShift.id, timestamp);
    } else {
      await this.calculateMetricsForShift(currentShift.id, timestamp);
    }
  }
  
  /**
   * Calculate metrics for a specific shift
   */
  private async calculateMetricsForShift(shiftId: number, timestamp: Date): Promise<void> {
    const shift = await db.select()
      .from(productionShifts)
      .where(eq(productionShifts.id, shiftId))
      .limit(1);
    
    if (!shift[0]) return;
    
    // Get all production events for this shift
    const events = await db.select()
      .from(productionEvents)
      .where(and(
        gte(productionEvents.eventTime, shift[0].startTime),
        lte(productionEvents.eventTime, shift[0].endTime)
      ));
    
    // Calculate metrics
    const totalProduced = events.reduce((sum, e) => sum + (e.quantity || 0), 0);
    const totalScrap = events.reduce((sum, e) => sum + (e.scrapQuantity || 0), 0);
    const totalPassed = events.filter(e => e.passedQc).length;
    
    // Get machine utilization
    const machineData = await this.getMachineUtilization(
      shift[0].startTime,
      shift[0].endTime
    );
    
    // Calculate OEE components
    const availability = machineData.availability;
    const performance = this.calculatePerformance(events);
    const quality = totalProduced > 0 ? ((totalProduced - totalScrap) / totalProduced) : 0;
    const oee = availability * performance * quality;
    
    // Check if metric already exists for this shift
    const [existingMetric] = await db.select()
      .from(productionMetrics)
      .where(eq(productionMetrics.shiftId, shiftId))
      .limit(1);
    
    const metricData = {
      shiftId,
      oee: (oee * 100).toFixed(2),
      availability: (availability * 100).toFixed(2),
      performance: (performance * 100).toFixed(2),
      quality: (quality * 100).toFixed(2),
      totalProduction: totalProduced,
      totalDefects: totalScrap,
      utilizationRate: (machineData.utilization * 100).toFixed(2),
      recordedAt: timestamp
    };
    
    if (existingMetric) {
      // Update existing metric
      await db.update(productionMetrics)
        .set(metricData)
        .where(eq(productionMetrics.id, existingMetric.id));
    } else {
      // Create new metric
      await db.insert(productionMetrics).values(metricData);
    }
    
    log.info('Production metrics calculated', {
      shiftId,
      oee: metricData.oee,
      availability: metricData.availability,
      performance: metricData.performance,
      quality: metricData.quality
    });
  }
  
  /**
   * Get machine utilization for a time period
   */
  private async getMachineUtilization(
    startTime: Date,
    endTime: Date
  ): Promise<{ availability: number; utilization: number }> {
    const statusLogs = await db.select()
      .from(machineStatusLogs)
      .where(and(
        gte(machineStatusLogs.timestamp, startTime),
        lte(machineStatusLogs.timestamp, endTime)
      ));
    
    if (statusLogs.length === 0) {
      // Return configurable defaults when no data
      return { 
        availability: PRODUCTION_CONFIG.defaultAvailability, 
        utilization: PRODUCTION_CONFIG.defaultUtilization 
      };
    }
    
    const totalTime = endTime.getTime() - startTime.getTime();
    let runningTime = 0;
    let availableTime = 0;
    
    for (let i = 0; i < statusLogs.length - 1; i++) {
      const duration = new Date(statusLogs[i + 1].timestamp).getTime() - 
                      new Date(statusLogs[i].timestamp).getTime();
      
      if (statusLogs[i].status === 'running') {
        runningTime += duration;
        availableTime += duration;
      } else if (statusLogs[i].status === 'idle') {
        availableTime += duration;
      }
    }
    
    // Handle last status
    if (statusLogs.length > 0) {
      const lastLog = statusLogs[statusLogs.length - 1];
      const duration = endTime.getTime() - new Date(lastLog.timestamp).getTime();
      
      if (lastLog.status === 'running') {
        runningTime += duration;
        availableTime += duration;
      } else if (lastLog.status === 'idle') {
        availableTime += duration;
      }
    }
    
    return {
      availability: totalTime > 0 ? availableTime / totalTime : 0,
      utilization: availableTime > 0 ? runningTime / availableTime : 0
    };
  }
  
  /**
   * Calculate performance rate from production events
   */
  private calculatePerformance(events: any[]): number {
    if (events.length === 0) return PRODUCTION_CONFIG.defaultPerformance;
    
    let totalPerformance = 0;
    let validEvents = 0;
    
    for (const event of events) {
      if (event.actualVsTarget) {
        const performance = parseFloat(event.actualVsTarget) / 100;
        totalPerformance += Math.min(1, performance); // Cap at 100%
        validEvents++;
      }
    }
    
    return validEvents > 0 ? totalPerformance / validEvents : PRODUCTION_CONFIG.defaultPerformance;
  }
  
  /**
   * Get shift name based on time
   */
  private getShiftName(timestamp: Date): string {
    const hour = timestamp.getHours();
    
    if (hour >= 6 && hour < 14) return 'Morning Shift';
    if (hour >= 14 && hour < 22) return 'Afternoon Shift';
    return 'Night Shift';
  }
  
  /**
   * Get shift start time
   */
  private getShiftStartTime(timestamp: Date): Date {
    const hour = timestamp.getHours();
    const date = new Date(timestamp);
    
    if (hour >= 6 && hour < 14) {
      date.setHours(6, 0, 0, 0);
    } else if (hour >= 14 && hour < 22) {
      date.setHours(14, 0, 0, 0);
    } else {
      if (hour < 6) {
        // Previous day's night shift
        date.setDate(date.getDate() - 1);
      }
      date.setHours(22, 0, 0, 0);
    }
    
    return date;
  }
  
  /**
   * Get shift end time
   */
  private getShiftEndTime(timestamp: Date): Date {
    const hour = timestamp.getHours();
    const date = new Date(timestamp);
    
    if (hour >= 6 && hour < 14) {
      date.setHours(14, 0, 0, 0);
    } else if (hour >= 14 && hour < 22) {
      date.setHours(22, 0, 0, 0);
    } else {
      if (hour >= 22) {
        // Next day
        date.setDate(date.getDate() + 1);
      }
      date.setHours(6, 0, 0, 0);
    }
    
    return date;
  }
  
  /**
   * Get real-time dashboard data
   */
  async getDashboardData(): Promise<any> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Get today's production events
    const todayEvents = await db.select()
      .from(productionEvents)
      .where(gte(productionEvents.eventTime, startOfDay));
    
    // Get current shift metrics
    const [currentShift] = await db.select()
      .from(productionShifts)
      .where(and(
        lte(productionShifts.startTime, now),
        gte(productionShifts.endTime, now)
      ))
      .limit(1);
    
    let currentMetrics = null;
    if (currentShift) {
      [currentMetrics] = await db.select()
        .from(productionMetrics)
        .where(eq(productionMetrics.shiftId, currentShift.id))
        .limit(1);
    }
    
    // Get machine statuses
    const machineStatuses = await db.select({
      machine: machines,
      latestStatus: machineStatusLogs
    })
    .from(machines)
    .leftJoin(
      machineStatusLogs,
      eq(machines.id, machineStatusLogs.machineId)
    )
    .where(eq(machines.status, 'active'));
    
    // Calculate summary
    const totalProduced = todayEvents.reduce((sum, e) => sum + (e.quantity || 0), 0);
    const totalDefects = todayEvents.reduce((sum, e) => sum + (e.scrapQuantity || 0), 0);
    const qualityRate = totalProduced > 0 ? 
      ((totalProduced - totalDefects) / totalProduced) * 100 : 0;
    
    return {
      currentShift: currentShift ? {
        name: currentShift.shiftName,
        startTime: currentShift.startTime,
        endTime: currentShift.endTime
      } : null,
      metrics: currentMetrics ? {
        oee: currentMetrics.oee,
        availability: currentMetrics.availability,
        performance: currentMetrics.performance,
        quality: currentMetrics.quality,
        utilizationRate: currentMetrics.utilizationRate
      } : {
        oee: '0',
        availability: '0',
        performance: '0',
        quality: '0',
        utilizationRate: '0'
      },
      today: {
        totalProduced,
        totalDefects,
        qualityRate: qualityRate.toFixed(2),
        eventCount: todayEvents.length
      },
      machines: machineStatuses.map(ms => ({
        id: ms.machine.id,
        name: ms.machine.name,
        status: ms.latestStatus?.status || 'unknown',
        lastUpdate: ms.latestStatus?.timestamp
      })),
      config: {
        defectRate: (PRODUCTION_CONFIG.defectRate * 100).toFixed(1),
        qualityThreshold: (PRODUCTION_CONFIG.qualityThreshold * 100).toFixed(1),
        monitoringInterval: PRODUCTION_CONFIG.monitoringInterval / 1000 / 60, // minutes
      }
    };
  }
}

export default new ProductionMonitoringService();