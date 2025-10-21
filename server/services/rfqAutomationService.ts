/**
 * RFQ Automation Service
 * Fortune 50 compliant service that automates the creation of RFQs from MTO/Job Materials
 * Ensures complete traceability: MTO → Job Materials → Requisitions → RFQs → POs
 */

import { db } from '../db';
import {
  jobs,
  jobMaterials,
  materials,
  purchaseRequisitions,
  purchaseRequisitionItems,
  rfqRequests,
  rfqItems,
  suppliers,
  supplierMaterialCategories,
  numberingSequences,
  aiMtoElements
} from '@shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

interface RFQCreationOptions {
  jobId: number;
  requisitionId?: number;
  supplierIds?: number[];
  deadline?: Date;
  notes?: string;
  userId: number;
  autoSelectSuppliers?: boolean;
}

interface MaterialGroup {
  materials: any[];
  totalQuantity: number;
  totalEstimatedCost: number;
}

class RFQAutomationService {
  /**
   * Create RFQs from job materials or requisition
   * Main entry point for automated RFQ generation
   */
  async createRFQFromJob(options: RFQCreationOptions): Promise<{
    rfqIds: number[];
    suppliersNotified: number;
    materialGroups: number;
  }> {
    console.log(`[RFQ Automation] Creating RFQs for job ${options.jobId}`);
    
    return await db.transaction(async (tx) => {
      // 1. Get job details
      const [job] = await tx.select()
        .from(jobs)
        .where(eq(jobs.id, options.jobId))
        .limit(1);
      
      if (!job) {
        throw new Error(`Job ${options.jobId} not found`);
      }
      
      // 2. Get materials to quote
      let materialsToQuote: any[] = [];
      
      if (options.requisitionId) {
        // Get materials from specific requisition
        materialsToQuote = await this.getMaterialsFromRequisition(options.requisitionId, tx);
      } else {
        // Get all job materials
        materialsToQuote = await this.getMaterialsFromJob(options.jobId, tx);
      }
      
      if (materialsToQuote.length === 0) {
        throw new Error('No materials found to create RFQs');
      }
      
      console.log(`[RFQ Automation] Found ${materialsToQuote.length} materials to quote`);
      
      // 3. Group materials by category for efficient supplier matching
      const materialGroups = this.groupMaterialsByCategory(materialsToQuote);
      
      // 4. Find or select suppliers
      let selectedSuppliers: any[] = [];
      
      if (options.supplierIds && options.supplierIds.length > 0) {
        // Use specified suppliers
        selectedSuppliers = await tx.select()
          .from(suppliers)
          .where(inArray(suppliers.id, options.supplierIds));
      } else if (options.autoSelectSuppliers) {
        // Auto-select suppliers based on material categories
        selectedSuppliers = await this.autoSelectSuppliers(materialGroups, tx);
      } else {
        // Get all active suppliers as fallback
        selectedSuppliers = await tx.select()
          .from(suppliers)
          .where(eq(suppliers.status, 'active'))
          .limit(5); // Limit to top 5 suppliers
      }
      
      if (selectedSuppliers.length === 0) {
        throw new Error('No suppliers available for RFQ');
      }
      
      console.log(`[RFQ Automation] Selected ${selectedSuppliers.length} suppliers`);
      
      // 5. Create RFQs for each supplier
      const rfqIds: number[] = [];
      
      for (const supplier of selectedSuppliers) {
        const rfqId = await this.createRFQForSupplier(
          supplier,
          materialsToQuote,
          job,
          options,
          tx
        );
        rfqIds.push(rfqId);
      }
      
      // 6. Update requisition status if applicable
      if (options.requisitionId) {
        await tx.update(purchaseRequisitions)
          .set({
            status: 'rfq_sent',
            updatedAt: new Date()
          })
          .where(eq(purchaseRequisitions.id, options.requisitionId));
      }
      
      console.log(`[RFQ Automation] Created ${rfqIds.length} RFQs`);
      
      return {
        rfqIds,
        suppliersNotified: selectedSuppliers.length,
        materialGroups: Object.keys(materialGroups).length
      };
    });
  }
  
  /**
   * Get materials from a requisition
   */
  private async getMaterialsFromRequisition(requisitionId: number, tx: any): Promise<any[]> {
    const items = await tx.select({
      reqItem: purchaseRequisitionItems,
      material: materials
    })
    .from(purchaseRequisitionItems)
    .leftJoin(materials, eq(purchaseRequisitionItems.materialId, materials.id))
    .where(eq(purchaseRequisitionItems.requisitionId, requisitionId));
    
    return items.map(item => ({
      materialId: item.material?.id,
      description: item.reqItem.description,
      quantity: Number(item.reqItem.quantity),
      unit: item.reqItem.unit,
      specifications: item.reqItem.specifications,
      estimatedPrice: Number(item.reqItem.estimatedUnitPrice) || 0,
      category: item.material?.category || 'steel',
      type: item.material?.type,
      grade: item.material?.grade
    }));
  }
  
  /**
   * Get materials directly from job
   */
  private async getMaterialsFromJob(jobId: number, tx: any): Promise<any[]> {
    const items = await tx.select({
      jobMaterial: jobMaterials,
      material: materials
    })
    .from(jobMaterials)
    .innerJoin(materials, eq(jobMaterials.materialId, materials.id))
    .where(eq(jobMaterials.jobId, jobId));
    
    return items.map(item => ({
      materialId: item.material.id,
      description: item.material.name,
      quantity: item.jobMaterial.quantity * Number(item.jobMaterial.requiredLength),
      unit: item.material.unit || 'meters',
      specifications: {
        length: item.jobMaterial.requiredLength,
        grade: item.material.grade,
        type: item.material.type
      },
      estimatedPrice: Number(item.material.pricePerUnit) || 100,
      category: item.material.category,
      type: item.material.type,
      grade: item.material.grade
    }));
  }
  
  /**
   * Group materials by category for supplier matching
   */
  private groupMaterialsByCategory(materials: any[]): { [key: string]: MaterialGroup } {
    const groups: { [key: string]: MaterialGroup } = {};
    
    for (const material of materials) {
      const category = material.category || 'general';
      
      if (!groups[category]) {
        groups[category] = {
          materials: [],
          totalQuantity: 0,
          totalEstimatedCost: 0
        };
      }
      
      groups[category].materials.push(material);
      groups[category].totalQuantity += material.quantity;
      groups[category].totalEstimatedCost += material.quantity * material.estimatedPrice;
    }
    
    return groups;
  }
  
  /**
   * Auto-select suppliers based on material categories
   */
  private async autoSelectSuppliers(
    materialGroups: { [key: string]: MaterialGroup },
    tx: any
  ): Promise<any[]> {
    const selectedSuppliers = new Set<number>();
    const supplierList: any[] = [];
    
    // Find suppliers for each material category
    for (const category of Object.keys(materialGroups)) {
      const suppliers = await tx.select({
        supplier: suppliers
      })
      .from(suppliers)
      .innerJoin(
        supplierMaterialCategories,
        eq(suppliers.id, supplierMaterialCategories.supplierId)
      )
      .where(and(
        eq(suppliers.status, 'active'),
        eq(supplierMaterialCategories.category, category),
        eq(supplierMaterialCategories.isActive, true)
      ))
      .limit(3); // Top 3 suppliers per category
      
      for (const sup of suppliers) {
        if (!selectedSuppliers.has(sup.supplier.id)) {
          selectedSuppliers.add(sup.supplier.id);
          supplierList.push(sup.supplier);
        }
      }
    }
    
    // If no category-specific suppliers, get general suppliers
    if (supplierList.length === 0) {
      const generalSuppliers = await tx.select()
        .from(suppliers)
        .where(and(
          eq(suppliers.status, 'active'),
          eq(suppliers.isPreferred, true)
        ))
        .limit(5);
      
      supplierList.push(...generalSuppliers);
    }
    
    return supplierList;
  }
  
  /**
   * Create RFQ for a specific supplier
   */
  private async createRFQForSupplier(
    supplier: any,
    materials: any[],
    job: any,
    options: RFQCreationOptions,
    tx: any
  ): Promise<number> {
    // Generate RFQ number
    const rfqNumber = await this.generateRFQNumber(tx);
    
    // Calculate deadline (default 7 days)
    const deadline = options.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Create RFQ request
    const [rfq] = await tx.insert(rfqRequests).values({
      rfqNumber,
      jobId: job.id,
      requisitionId: options.requisitionId,
      title: `RFQ for ${job.jobNumber} - Materials`,
      description: `Request for quotation for materials required for job ${job.jobNumber}: ${job.projectDescription || ''}`,
      status: 'draft',
      deadline,
      createdBy: options.userId,
      notes: options.notes
    }).returning();
    
    console.log(`[RFQ Automation] Created RFQ ${rfqNumber} for supplier ${supplier.name}`);
    
    // Create RFQ items
    for (const material of materials) {
      await tx.insert(rfqItems).values({
        rfqId: rfq.id,
        supplierId: supplier.id,
        description: material.description,
        quantity: material.quantity.toString(),
        unit: material.unit,
        specifications: material.specifications || {},
        estimatedUnitPrice: material.estimatedPrice.toString(),
        notes: `Category: ${material.category}, Type: ${material.type || 'N/A'}, Grade: ${material.grade || 'N/A'}`
      });
    }
    
    return rfq.id;
  }
  
  /**
   * Generate unique RFQ number using database sequence
   */
  private async generateRFQNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RFQ-${year}`;
    
    // Get or create sequence
    const [sequence] = await tx.select()
      .from(numberingSequences)
      .where(and(
        eq(numberingSequences.type, 'rfq'),
        eq(numberingSequences.prefix, prefix)
      ))
      .limit(1);
    
    let nextNumber: number;
    
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await tx.update(numberingSequences)
        .set({ 
          currentNumber: nextNumber,
          lastUsed: new Date()
        })
        .where(eq(numberingSequences.id, sequence.id));
    } else {
      nextNumber = 1;
      await tx.insert(numberingSequences).values({
        type: 'rfq',
        prefix,
        currentNumber: nextNumber,
        lastUsed: new Date()
      });
    }
    
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  }
  
  /**
   * Create RFQ directly from AI MTO elements
   * Used when bypassing job creation for quick quotes
   */
  async createRFQFromMTO(
    estimationId: number,
    supplierIds: number[],
    userId: number
  ): Promise<{ rfqIds: number[]; totalElements: number }> {
    return await db.transaction(async (tx) => {
      // Get AI MTO elements
      const mtoElements = await tx.select()
        .from(aiMtoElements)
        .where(eq(aiMtoElements.projectId, estimationId));
      
      if (mtoElements.length === 0) {
        throw new Error('No MTO elements found for estimation');
      }
      
      // Convert MTO elements to material format
      const materials = mtoElements.map(element => {
        const dimensions = element.dimensions as any || {};
        return {
          description: `${element.designation}: ${element.description || element.type}`,
          quantity: element.quantity || 1,
          unit: 'each',
          specifications: {
            type: element.type,
            material: element.material,
            dimensions,
            location: element.location
          },
          estimatedPrice: 1000, // Default estimate
          category: 'steel',
          type: element.type,
          grade: element.material || 'AS350'
        };
      });
      
      // Get suppliers
      const suppliers = await tx.select()
        .from(suppliers)
        .where(inArray(suppliers.id, supplierIds));
      
      const rfqIds: number[] = [];
      
      // Create RFQ for each supplier
      for (const supplier of suppliers) {
        const rfqNumber = await this.generateRFQNumber(tx);
        
        const [rfq] = await tx.insert(rfqRequests).values({
          rfqNumber,
          title: `Quick RFQ from MTO - Estimation ${estimationId}`,
          description: 'Direct RFQ from AI-extracted MTO elements',
          status: 'draft',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: userId
        }).returning();
        
        // Create RFQ items from MTO elements
        for (const material of materials) {
          await tx.insert(rfqItems).values({
            rfqId: rfq.id,
            supplierId: supplier.id,
            description: material.description,
            quantity: material.quantity.toString(),
            unit: material.unit,
            specifications: material.specifications,
            estimatedUnitPrice: material.estimatedPrice.toString()
          });
        }
        
        rfqIds.push(rfq.id);
      }
      
      return {
        rfqIds,
        totalElements: mtoElements.length
      };
    });
  }
  
  /**
   * Get RFQ automation status for a job
   */
  async getRFQAutomationStatus(jobId: number): Promise<any> {
    // Get job details
    const [job] = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    if (!job) {
      return null;
    }
    
    // Get requisitions for job
    const requisitions = await db.select()
      .from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.jobId, jobId));
    
    // Get RFQs for job
    const rfqs = await db.select()
      .from(rfqRequests)
      .where(eq(rfqRequests.jobId, jobId));
    
    // Get job materials count
    const materialCount = await db.select({
      count: sql<number>`COUNT(*)`.as('count')
    })
    .from(jobMaterials)
    .where(eq(jobMaterials.jobId, jobId));
    
    return {
      job: {
        id: job.id,
        number: job.jobNumber,
        status: job.status
      },
      materials: materialCount[0]?.count || 0,
      requisitions: requisitions.map(r => ({
        id: r.id,
        number: r.requisitionNumber,
        status: r.status
      })),
      rfqs: rfqs.map(rfq => ({
        id: rfq.id,
        number: rfq.rfqNumber,
        status: rfq.status,
        deadline: rfq.deadline
      })),
      automationStatus: {
        materialsReady: materialCount[0]?.count > 0,
        requisitionsCreated: requisitions.length > 0,
        rfqsSent: rfqs.filter(r => r.status === 'sent').length > 0,
        readyForProcurement: rfqs.length > 0
      }
    };
  }
}

export default new RFQAutomationService();