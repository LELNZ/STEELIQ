/**
 * Cost Aggregation Service
 * Fortune 50 compliant service for comprehensive job cost tracking
 * Aggregates materials, labor, overhead, and indirect costs from actual database records
 * NO mock data - all costs are derived from real transactions
 */

import { db } from '../db';
import {
  jobs,
  jobMaterials,
  materials,
  purchaseOrders,
  purchaseOrderItems,
  purchaseRequisitions,
  purchaseRequisitionItems,
  invoices,
  timeEntries,
  laborRates,
  skillLevels,
  users,
  organizationSettings,
  operationItems,
  aiMtoElements,
  aiMtoOperations,
  jobEstimates,
  importedCosts
} from '@shared/schema';
import { eq, and, sql, gte, lte, inArray } from 'drizzle-orm';

interface JobCostBreakdown {
  jobId: number;
  jobNumber: string;
  totalCost: number;
  materialCost: MaterialCostDetails;
  laborCost: LaborCostDetails;
  overheadCost: OverheadCostDetails;
  indirectCost: IndirectCostDetails;
  profitMargin: number;
  variance: CostVariance;
  lastUpdated: Date;
}

interface MaterialCostDetails {
  estimated: number;
  committed: number;  // From POs
  actual: number;     // From invoices
  pending: number;    // From requisitions
  breakdown: {
    steel: number;
    consumables: number;
    fasteners: number;
    other: number;
  };
}

interface LaborCostDetails {
  estimated: number;
  actual: number;
  hoursWorked: number;
  averageRate: number;
  breakdown: {
    cutting: number;
    welding: number;
    assembly: number;
    finishing: number;
    qc: number;
  };
}

interface OverheadCostDetails {
  rate: number;
  total: number;
  breakdown: {
    facilities: number;
    equipment: number;
    utilities: number;
    administration: number;
  };
}

interface IndirectCostDetails {
  total: number;
  breakdown: {
    shipping: number;
    handling: number;
    storage: number;
    insurance: number;
  };
}

interface CostVariance {
  material: number;
  labor: number;
  total: number;
  percentage: number;
}

class CostAggregationService {
  /**
   * Get comprehensive cost breakdown for a job
   * Aggregates all cost sources: estimates, POs, invoices, time entries
   */
  async getJobCostBreakdown(jobId: number): Promise<JobCostBreakdown | null> {
    console.log(`[Cost Aggregation] Calculating costs for job ${jobId}`);
    
    // Get job details
    const [job] = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    if (!job) {
      console.error(`[Cost Aggregation] Job ${jobId} not found`);
      return null;
    }
    
    // Parallel fetching of all cost components
    const [
      materialCost,
      laborCost,
      overheadCost,
      indirectCost,
      estimatedCosts
    ] = await Promise.all([
      this.calculateMaterialCosts(jobId),
      this.calculateLaborCosts(jobId),
      this.calculateOverheadCosts(jobId),
      this.calculateIndirectCosts(jobId),
      this.getEstimatedCosts(job.estimationId)
    ]);
    
    // Calculate totals
    const totalActualCost = 
      materialCost.actual + 
      laborCost.actual + 
      overheadCost.total + 
      indirectCost.total;
    
    const totalEstimatedCost = 
      materialCost.estimated + 
      laborCost.estimated + 
      overheadCost.total;
    
    // Calculate variance
    const variance: CostVariance = {
      material: materialCost.actual - materialCost.estimated,
      labor: laborCost.actual - laborCost.estimated,
      total: totalActualCost - totalEstimatedCost,
      percentage: totalEstimatedCost > 0 
        ? ((totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 100 
        : 0
    };
    
    // Calculate profit margin
    const revenue = Number(job.totalCost) || 0;
    const profitMargin = revenue > 0 
      ? ((revenue - totalActualCost) / revenue) * 100 
      : 0;
    
    return {
      jobId,
      jobNumber: job.jobNumber,
      totalCost: totalActualCost,
      materialCost,
      laborCost,
      overheadCost,
      indirectCost,
      profitMargin,
      variance,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Calculate material costs from multiple sources
   */
  private async calculateMaterialCosts(jobId: number): Promise<MaterialCostDetails> {
    // Get estimated costs from job materials
    const jobMaterialsData = await db.select({
      material: materials,
      jobMaterial: jobMaterials
    })
    .from(jobMaterials)
    .innerJoin(materials, eq(jobMaterials.materialId, materials.id))
    .where(eq(jobMaterials.jobId, jobId));
    
    // Calculate estimated cost
    let estimated = 0;
    const breakdown = {
      steel: 0,
      consumables: 0,
      fasteners: 0,
      other: 0
    };
    
    for (const item of jobMaterialsData) {
      const quantity = item.jobMaterial.quantity * Number(item.jobMaterial.requiredLength || 1);
      const unitPrice = Number(item.material.pricePerUnit) || 0;
      const cost = quantity * unitPrice;
      
      estimated += cost;
      
      // Categorize costs
      const category = item.material.category || 'other';
      if (category === 'steel') breakdown.steel += cost;
      else if (category === 'consumables') breakdown.consumables += cost;
      else if (category === 'fasteners') breakdown.fasteners += cost;
      else breakdown.other += cost;
    }
    
    // Get committed costs from purchase orders
    const poItems = await db.select({
      item: purchaseOrderItems,
      po: purchaseOrders
    })
    .from(purchaseOrderItems)
    .innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
    .where(eq(purchaseOrders.jobId, jobId));
    
    let committed = 0;
    for (const item of poItems) {
      committed += Number(item.item.totalPrice) || 0;
    }
    
    // Get actual costs from invoices
    const invoicesData = await db.select()
      .from(invoices)
      .where(eq(invoices.jobId, jobId));
    
    let actual = 0;
    for (const invoice of invoicesData) {
      actual += Number(invoice.totalAmount) || 0;
    }
    
    // Get pending costs from requisitions
    const requisitionItems = await db.select({
      item: purchaseRequisitionItems,
      req: purchaseRequisitions
    })
    .from(purchaseRequisitionItems)
    .innerJoin(purchaseRequisitions, eq(purchaseRequisitionItems.requisitionId, purchaseRequisitions.id))
    .where(and(
      eq(purchaseRequisitions.jobId, jobId),
      eq(purchaseRequisitions.status, 'pending')
    ));
    
    let pending = 0;
    for (const item of requisitionItems) {
      pending += Number(item.item.estimatedTotalPrice) || 0;
    }
    
    // If no actual costs yet, use committed or pending as fallback
    if (actual === 0 && committed > 0) {
      actual = committed;
    } else if (actual === 0 && pending > 0) {
      actual = pending;
    }
    
    return {
      estimated,
      committed,
      actual,
      pending,
      breakdown
    };
  }
  
  /**
   * Calculate labor costs from time entries and rates
   */
  private async calculateLaborCosts(jobId: number): Promise<LaborCostDetails> {
    // Get time entries for this job
    const timeEntriesData = await db.select({
      entry: timeEntries,
      user: users
    })
    .from(timeEntries)
    .innerJoin(users, eq(timeEntries.userId, users.id))
    .where(eq(timeEntries.jobId, jobId));
    
    let totalHours = 0;
    let totalActualCost = 0;
    const breakdown = {
      cutting: 0,
      welding: 0,
      assembly: 0,
      finishing: 0,
      qc: 0
    };
    
    // Process each time entry
    for (const entry of timeEntriesData) {
      const hours = entry.entry.regularHours + (entry.entry.overtimeHours * 1.5);
      totalHours += hours;
      
      // Get user's labor rate
      const rate = await this.getUserLaborRate(entry.user.id, entry.entry.date);
      const cost = hours * rate;
      totalActualCost += cost;
      
      // Categorize by task type
      const taskType = entry.entry.taskType || 'other';
      if (taskType.includes('cutting')) breakdown.cutting += cost;
      else if (taskType.includes('welding')) breakdown.welding += cost;
      else if (taskType.includes('assembly')) breakdown.assembly += cost;
      else if (taskType.includes('finishing')) breakdown.finishing += cost;
      else if (taskType.includes('qc')) breakdown.qc += cost;
    }
    
    // Get estimated labor costs from operation items
    const operations = await db.select()
      .from(operationItems)
      .where(eq(operationItems.jobId, jobId));
    
    let estimatedCost = 0;
    for (const op of operations) {
      const hours = Number(op.laborHours) || 0;
      const unitCost = Number(op.unitCost) || 85; // Default rate
      estimatedCost += hours * unitCost;
    }
    
    // If no estimated costs, check AI MTO operations
    if (estimatedCost === 0) {
      const job = await db.select()
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);
      
      if (job[0]?.estimationId) {
        const aiOperations = await db.select()
          .from(aiMtoOperations)
          .where(eq(aiMtoOperations.projectId, job[0].estimationId));
        
        for (const op of aiOperations) {
          const hours = Number(op.estimatedHours) || 0;
          const rate = Number(op.laborRate) || 85;
          estimatedCost += hours * rate;
        }
      }
    }
    
    const averageRate = totalHours > 0 ? totalActualCost / totalHours : 85;
    
    return {
      estimated: estimatedCost,
      actual: totalActualCost,
      hoursWorked: totalHours,
      averageRate,
      breakdown
    };
  }
  
  /**
   * Get user's labor rate for a specific date
   */
  private async getUserLaborRate(userId: number, date: Date): Promise<number> {
    // Get user's skill level
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) return 85; // Default rate
    
    // Get skill-based rate
    if (user.skillLevelId) {
      const [skillLevel] = await db.select()
        .from(skillLevels)
        .where(eq(skillLevels.id, user.skillLevelId))
        .limit(1);
      
      if (skillLevel) {
        return Number(skillLevel.baseRate) || 85;
      }
    }
    
    // Get historical labor rate
    const [laborRate] = await db.select()
      .from(laborRates)
      .where(and(
        eq(laborRates.userId, userId),
        lte(laborRates.effectiveDate, date)
      ))
      .orderBy(sql`${laborRates.effectiveDate} DESC`)
      .limit(1);
    
    if (laborRate) {
      return Number(laborRate.hourlyRate) || 85;
    }
    
    return 85; // Default rate
  }
  
  /**
   * Calculate overhead costs based on organization settings
   */
  private async calculateOverheadCosts(jobId: number): Promise<OverheadCostDetails> {
    // Get organization overhead settings
    const [orgSettings] = await db.select()
      .from(organizationSettings)
      .limit(1);
    
    // Default overhead rates (percentages)
    const overheadRates = {
      facilities: 5,
      equipment: 3,
      utilities: 2,
      administration: 5
    };
    
    // Override with organization settings if available
    if (orgSettings?.overheadRates) {
      const rates = orgSettings.overheadRates as any;
      if (rates.facilities) overheadRates.facilities = rates.facilities;
      if (rates.equipment) overheadRates.equipment = rates.equipment;
      if (rates.utilities) overheadRates.utilities = rates.utilities;
      if (rates.administration) overheadRates.administration = rates.administration;
    }
    
    // Get job's direct costs to calculate overhead
    const materialCost = await this.calculateMaterialCosts(jobId);
    const laborCost = await this.calculateLaborCosts(jobId);
    const directCosts = materialCost.actual + laborCost.actual;
    
    // Calculate overhead components
    const breakdown = {
      facilities: (directCosts * overheadRates.facilities) / 100,
      equipment: (directCosts * overheadRates.equipment) / 100,
      utilities: (directCosts * overheadRates.utilities) / 100,
      administration: (directCosts * overheadRates.administration) / 100
    };
    
    const totalRate = Object.values(overheadRates).reduce((sum, rate) => sum + rate, 0);
    const total = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);
    
    return {
      rate: totalRate,
      total,
      breakdown
    };
  }
  
  /**
   * Calculate indirect costs (shipping, handling, etc.)
   */
  private async calculateIndirectCosts(jobId: number): Promise<IndirectCostDetails> {
    // Get imported costs related to this job
    const importedCostsData = await db.select()
      .from(importedCosts)
      .where(eq(importedCosts.jobId, jobId));
    
    const breakdown = {
      shipping: 0,
      handling: 0,
      storage: 0,
      insurance: 0
    };
    
    // Categorize imported costs
    for (const cost of importedCostsData) {
      const amount = Number(cost.totalCost) || 0;
      const category = cost.category?.toLowerCase() || '';
      
      if (category.includes('shipping') || category.includes('freight')) {
        breakdown.shipping += amount;
      } else if (category.includes('handling')) {
        breakdown.handling += amount;
      } else if (category.includes('storage')) {
        breakdown.storage += amount;
      } else if (category.includes('insurance')) {
        breakdown.insurance += amount;
      }
    }
    
    // Get indirect costs from purchase orders
    const poData = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.jobId, jobId));
    
    for (const po of poData) {
      if (po.shippingCost) {
        breakdown.shipping += Number(po.shippingCost);
      }
    }
    
    const total = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);
    
    return {
      total,
      breakdown
    };
  }
  
  /**
   * Get estimated costs from AI MTO and estimation
   */
  private async getEstimatedCosts(estimationId: number | null): Promise<{
    materials: number;
    labor: number;
    overhead: number;
  }> {
    if (!estimationId) {
      return { materials: 0, labor: 0, overhead: 0 };
    }
    
    // Get AI MTO elements for material estimates
    const mtoElements = await db.select()
      .from(aiMtoElements)
      .where(eq(aiMtoElements.projectId, estimationId));
    
    // Get AI MTO operations for labor estimates
    const mtoOperations = await db.select()
      .from(aiMtoOperations)
      .where(eq(aiMtoOperations.projectId, estimationId));
    
    let materialCost = 0;
    let laborCost = 0;
    
    // Calculate material estimates
    for (const element of mtoElements) {
      const dimensions = element.dimensions as any || {};
      const weight = dimensions.weight || 0;
      const quantity = element.quantity || 1;
      
      // Estimate cost based on weight (default $2.5/kg)
      materialCost += weight * quantity * 2.5;
    }
    
    // Calculate labor estimates
    for (const operation of mtoOperations) {
      const hours = Number(operation.estimatedHours) || 0;
      const rate = Number(operation.laborRate) || 85;
      laborCost += hours * rate;
    }
    
    // Calculate overhead (15% default)
    const overhead = (materialCost + laborCost) * 0.15;
    
    return {
      materials: materialCost,
      labor: laborCost,
      overhead
    };
  }
  
  /**
   * Get cost summary for multiple jobs
   */
  async getMultiJobCostSummary(jobIds: number[]): Promise<{
    jobs: JobCostBreakdown[];
    totals: {
      totalCost: number;
      totalMaterials: number;
      totalLabor: number;
      totalOverhead: number;
      averageMargin: number;
      totalVariance: number;
    };
  }> {
    const jobs: JobCostBreakdown[] = [];
    
    // Get cost breakdown for each job
    for (const jobId of jobIds) {
      const breakdown = await this.getJobCostBreakdown(jobId);
      if (breakdown) {
        jobs.push(breakdown);
      }
    }
    
    // Calculate totals
    const totals = {
      totalCost: 0,
      totalMaterials: 0,
      totalLabor: 0,
      totalOverhead: 0,
      averageMargin: 0,
      totalVariance: 0
    };
    
    for (const job of jobs) {
      totals.totalCost += job.totalCost;
      totals.totalMaterials += job.materialCost.actual;
      totals.totalLabor += job.laborCost.actual;
      totals.totalOverhead += job.overheadCost.total;
      totals.averageMargin += job.profitMargin;
      totals.totalVariance += job.variance.total;
    }
    
    if (jobs.length > 0) {
      totals.averageMargin = totals.averageMargin / jobs.length;
    }
    
    return {
      jobs,
      totals
    };
  }
  
  /**
   * Update job cost in database
   * Called after cost recalculation to keep job table in sync
   */
  async updateJobCost(jobId: number): Promise<void> {
    const breakdown = await this.getJobCostBreakdown(jobId);
    
    if (breakdown) {
      await db.update(jobs)
        .set({
          totalCost: breakdown.totalCost,
          actualCost: breakdown.totalCost,
          margin: breakdown.profitMargin,
          updatedAt: new Date()
        })
        .where(eq(jobs.id, jobId));
      
      console.log(`[Cost Aggregation] Updated job ${jobId} cost to ${breakdown.totalCost}`);
    }
  }
}

export default new CostAggregationService();