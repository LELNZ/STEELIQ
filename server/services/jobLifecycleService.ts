/**
 * Job Lifecycle Integration Service
 * Fortune 50 compliant service that manages the complete lifecycle:
 * Estimation → Job Creation → MTO → Procurement
 * Ensures seamless data flow and maintains audit trail
 */

import { db } from '../db';
import {
  estimationProjects,
  jobs,
  jobMaterials,
  materials,
  aiMtoElements,
  purchaseRequisitions,
  purchaseRequisitionItems,
  materialTakeoffs,
  operationItems,
  clients,
  numberingSequences
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface JobCreationOptions {
  autoCreateRequisition?: boolean;
  assignedTo?: number;
  priority?: 'low' | 'standard' | 'high' | 'urgent';
  rushOrder?: boolean;
  notes?: string;
}

interface MaterialRequirement {
  materialId?: number;
  description: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  specifications?: any;
}

class JobLifecycleService {
  /**
   * Convert an estimation to a job with full MTO integration
   * This is the main entry point for job creation from estimations
   */
  async createJobFromEstimation(
    estimationId: number, 
    userId: number,
    options: JobCreationOptions = {}
  ): Promise<{
    job: any;
    materialsCreated: number;
    requisitionId?: number;
  }> {
    console.log(`[Job Lifecycle] Starting job creation from estimation ${estimationId}`);
    
    // Start transaction for atomic operation
    return await db.transaction(async (tx) => {
      // 1. Get estimation details
      const [estimation] = await tx.select()
        .from(estimationProjects)
        .where(eq(estimationProjects.id, estimationId))
        .limit(1);
        
      if (!estimation) {
        throw new Error(`Estimation ${estimationId} not found`);
      }
      
      // 2. Generate job number using database sequence
      const jobNumber = await this.generateJobNumber(tx);
      
      // 3. Get client information if available
      let clientData = {
        name: 'Unknown Client',
        contact: '',
        phone: '',
        email: '',
        address: ''
      };
      
      if (estimation.clientId) {
        const [client] = await tx.select()
          .from(clients)
          .where(eq(clients.id, estimation.clientId))
          .limit(1);
          
        if (client) {
          clientData = {
            name: client.name,
            contact: client.contactPerson || '',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || ''
          };
        }
      }
      
      // 4. Validate that we have MTO elements or takeoffs
      const mtoElementCount = await tx.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(aiMtoElements)
      .where(eq(aiMtoElements.projectId, estimationId));
      
      const takeoffCount = await tx.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(materialTakeoffs)
      .where(eq(materialTakeoffs.projectId, estimationId));
      
      const totalMaterials = (mtoElementCount[0]?.count || 0) + (takeoffCount[0]?.count || 0);
      
      if (totalMaterials === 0) {
        throw new Error(
          'Cannot create job: No MTO elements or material takeoffs found. ' +
          'Please ensure the estimation has been properly analyzed and materials extracted.'
        );
      }
      
      // 5. Calculate costs from AI MTO elements and operations
      const costs = await this.calculateJobCosts(estimationId, tx);
      
      // 6. Create the job
      const [newJob] = await tx.insert(jobs).values({
        jobNumber,
        estimationId,
        clientName: clientData.name,
        clientContact: clientData.contact,
        clientPhone: clientData.phone,
        clientEmail: clientData.email,
        clientAddress: clientData.address,
        projectDescription: estimation.description || estimation.name,
        status: 'active',
        priority: options.priority || 'standard',
        estimatedValue: estimation.totalCost,
        materialCost: costs.materials.toString(),
        laborCost: costs.labor.toString(),
        overheadCost: costs.overhead.toString(),
        profitMargin: estimation.margin,
        estimatedHours: estimation.estimatedHours,
        assignedTo: options.assignedTo,
        isRushOrder: options.rushOrder || false,
        notes: options.notes,
        internalNotes: `Created from estimation ${estimationId}`
      }).returning();
      
      console.log(`[Job Lifecycle] Created job ${newJob.jobNumber}`);
      
      // 6. Convert AI MTO elements to job materials
      const materialsCreated = await this.createJobMaterialsFromMTO(
        newJob.id, 
        estimationId, 
        tx
      );
      
      // 7. Update estimation status to accepted
      await tx.update(estimationProjects)
        .set({ 
          status: 'accepted',
          updatedAt: new Date()
        })
        .where(eq(estimationProjects.id, estimationId));
      
      // 8. Optionally create purchase requisition
      let requisitionId: number | undefined;
      if (options.autoCreateRequisition) {
        requisitionId = await this.createPurchaseRequisition(
          newJob.id,
          userId,
          tx
        );
      }
      
      console.log(`[Job Lifecycle] Job creation complete. Materials: ${materialsCreated}, Requisition: ${requisitionId || 'Not created'}`);
      
      return {
        job: newJob,
        materialsCreated,
        requisitionId
      };
    });
  }
  
  /**
   * Generate a unique job number using database sequence
   */
  private async generateJobNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JOB-${year}`;
    
    // Get or create sequence for this year
    const [sequence] = await tx.select()
      .from(numberingSequences)
      .where(and(
        eq(numberingSequences.type, 'job'),
        eq(numberingSequences.prefix, prefix)
      ))
      .limit(1);
    
    let nextNumber: number;
    
    if (sequence) {
      // Increment existing sequence
      nextNumber = sequence.currentNumber + 1;
      await tx.update(numberingSequences)
        .set({ 
          currentNumber: nextNumber,
          lastUsed: new Date()
        })
        .where(eq(numberingSequences.id, sequence.id));
    } else {
      // Create new sequence
      nextNumber = 1;
      await tx.insert(numberingSequences).values({
        type: 'job',
        prefix,
        currentNumber: nextNumber,
        lastUsed: new Date()
      });
    }
    
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  }
  
  /**
   * Calculate job costs from AI MTO elements and operations
   */
  private async calculateJobCosts(estimationId: number, tx: any): Promise<{
    materials: number;
    labor: number;
    overhead: number;
    total: number;
  }> {
    // Get AI MTO elements for this estimation
    const mtoElements = await tx.select()
      .from(aiMtoElements)
      .where(eq(aiMtoElements.projectId, estimationId));
    
    // Get operation items for this estimation
    const operations = await tx.select()
      .from(operationItems)
      .where(eq(operationItems.estimationId, estimationId));
    
    // Batch fetch material prices by type/grade to avoid N+1 queries
    const uniqueMaterials = new Map<string, number>(); // material_key -> price_per_kg
    const materialTypes = new Set<string>();
    const materialGrades = new Set<string>();
    
    // Collect unique material types and grades
    for (const element of mtoElements) {
      const material = element.material || 'AS350';
      const type = element.type || 'steel';
      materialTypes.add(type);
      materialGrades.add(material);
    }
    
    // Batch fetch prices for all unique material combinations
    if (materialTypes.size > 0) {
      const priceResults = await tx.select({
        grade: materials.grade,
        type: materials.type,
        avgPrice: sql<number>`AVG(CAST(${materials.pricePerKg} AS DECIMAL))`.as('avgPrice')
      })
      .from(materials)
      .where(eq(materials.category, 'steel'))
      .groupBy(materials.grade, materials.type);
      
      // Store prices in map
      for (const result of priceResults) {
        const key = `${result.type}_${result.grade}`;
        uniqueMaterials.set(key, result.avgPrice || 2.5);
      }
    }
    
    // Default prices if not found in database
    const defaultPricePerKg = 2.5;
    const defaultPricePerMeter = 25;
    
    let materialCost = 0;
    let laborCost = 0;
    
    // Calculate material costs using batched prices
    for (const element of mtoElements) {
      const dimensions = element.dimensions as any || {};
      const weight = dimensions.weight || 0;
      const length = dimensions.length || 0;
      const quantity = element.quantity || 1;
      
      // Get price for this material type/grade
      const materialKey = `${element.type || 'steel'}_${element.material || 'AS350'}`;
      const pricePerKg = uniqueMaterials.get(materialKey) || defaultPricePerKg;
      
      // Calculate cost based on weight or length
      if (weight > 0) {
        materialCost += weight * quantity * pricePerKg;
      } else if (length > 0) {
        // Convert mm to meters and use length-based pricing
        const pricePerMeter = pricePerKg * 10; // Approximate conversion
        materialCost += (length / 1000) * quantity * pricePerMeter;
      } else {
        // Fallback: estimate based on type
        const estimatedWeight = quantity * 50; // 50kg per item estimate
        materialCost += estimatedWeight * pricePerKg;
      }
    }
    
    // Calculate labor costs from operations
    for (const operation of operations) {
      const laborHours = Number(operation.laborHours) || 0;
      const unitCost = Number(operation.unitCost) || 0;
      const totalCost = Number(operation.totalCost) || 0;
      
      if (totalCost > 0) {
        laborCost += totalCost;
      } else if (laborHours > 0 && unitCost > 0) {
        laborCost += laborHours * unitCost;
      } else if (laborHours > 0) {
        // Use default labor rate if no unit cost specified
        const defaultRate = 85; // Should be fetched from laborRates table
        laborCost += laborHours * defaultRate;
      }
    }
    
    // Calculate overhead (15% default)
    const overhead = (materialCost + laborCost) * 0.15;
    
    return {
      materials: Math.round(materialCost),
      labor: Math.round(laborCost),
      overhead: Math.round(overhead),
      total: Math.round(materialCost + laborCost + overhead)
    };
  }
  
  /**
   * Get average material price from database
   */
  private async getAverageMaterialPrice(category: string, tx: any): Promise<number> {
    const result = await tx.select({
      avgPrice: sql<number>`AVG(CAST(${materials.pricePerKg} AS DECIMAL))`.as('avgPrice')
    })
    .from(materials)
    .where(eq(materials.category, category));
    
    return result[0]?.avgPrice || 2.5; // Default to $2.50/kg if no prices in database
  }
  
  /**
   * Create job materials from AI MTO elements
   */
  private async createJobMaterialsFromMTO(
    jobId: number, 
    estimationId: number,
    tx: any
  ): Promise<number> {
    console.log(`[Job Lifecycle] Converting MTO elements to job materials for job ${jobId}`);
    
    // Get all AI MTO elements for this estimation
    const mtoElements = await tx.select()
      .from(aiMtoElements)
      .where(eq(aiMtoElements.projectId, estimationId));
    
    if (mtoElements.length === 0) {
      console.log('[Job Lifecycle] No MTO elements found, checking material takeoffs');
      
      // Fallback to material takeoffs if no AI MTO elements
      const takeoffs = await tx.select()
        .from(materialTakeoffs)
        .where(eq(materialTakeoffs.projectId, estimationId));
      
      for (const takeoff of takeoffs) {
        // Find or create material
        const materialId = await this.findOrCreateMaterial({
          section: takeoff.section,
          grade: takeoff.grade || 'AS350',
          length: takeoff.length
        }, tx);
        
        await tx.insert(jobMaterials).values({
          jobId,
          materialId,
          requiredLength: (takeoff.length / 1000).toString(), // Convert mm to meters
          quantity: takeoff.quantity,
          notes: `From takeoff: ${takeoff.mark}`
        });
      }
      
      return takeoffs.length;
    }
    
    // Convert AI MTO elements to job materials
    let materialsCreated = 0;
    
    for (const element of mtoElements) {
      const dimensions = element.dimensions as any || {};
      
      // Find or create material based on element specifications
      const materialId = await this.findOrCreateMaterial({
        designation: element.designation,
        type: element.type,
        material: element.material || 'AS350',
        dimensions
      }, tx);
      
      // Create job material entry
      await tx.insert(jobMaterials).values({
        jobId,
        materialId,
        requiredLength: dimensions.length ? (dimensions.length / 1000).toString() : '1',
        quantity: element.quantity || 1,
        notes: `${element.designation}: ${element.description || ''}`
      });
      
      materialsCreated++;
    }
    
    console.log(`[Job Lifecycle] Created ${materialsCreated} job materials`);
    return materialsCreated;
  }
  
  /**
   * Find existing material or create new one
   */
  private async findOrCreateMaterial(specs: any, tx: any): Promise<number> {
    // Build material description
    const description = specs.designation || 
                       specs.section || 
                       `${specs.type || 'STEEL'} ${specs.material || 'AS350'}`;
    
    // Check if material exists
    const [existing] = await tx.select()
      .from(materials)
      .where(and(
        eq(materials.name, description),
        eq(materials.category, 'steel')
      ))
      .limit(1);
    
    if (existing) {
      return existing.id;
    }
    
    // Create new material
    const [newMaterial] = await tx.insert(materials).values({
      name: description,
      category: 'steel',
      type: specs.type || 'beam',
      grade: specs.material || specs.grade || 'AS350',
      length: specs.dimensions?.length || specs.length || 6000,
      width: specs.dimensions?.width || 100,
      height: specs.dimensions?.height || 100,
      thickness: specs.dimensions?.thickness || 10,
      weight: specs.dimensions?.weight || 10,
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 100,
      unit: 'meters',
      location: 'Warehouse',
      supplier: 'Steel Supplier',
      pricePerUnit: '100',
      pricePerKg: '2.50',
      notes: `Auto-created from MTO element`
    }).returning();
    
    return newMaterial.id;
  }
  
  /**
   * Create purchase requisition from job materials
   */
  private async createPurchaseRequisition(
    jobId: number,
    userId: number,
    tx: any
  ): Promise<number> {
    console.log(`[Job Lifecycle] Creating purchase requisition for job ${jobId}`);
    
    // Get job details
    const [job] = await tx.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    // Get all job materials - use different variable name to avoid collision
    const jobMaterialRows = await tx.select({
      jobMaterial: jobMaterials,
      material: materials
    })
    .from(jobMaterials)
    .innerJoin(materials, eq(jobMaterials.materialId, materials.id))
    .where(eq(jobMaterials.jobId, jobId));
    
    if (jobMaterialRows.length === 0) {
      console.log('[Job Lifecycle] No materials to requisition');
      return 0;
    }
    
    // Generate requisition number
    const reqNumber = await this.generateRequisitionNumber(tx);
    
    // Create requisition
    const [requisition] = await tx.insert(purchaseRequisitions).values({
      requisitionNumber: reqNumber,
      jobId,
      requestedBy: userId,
      status: 'pending',
      priority: job.priority || 'standard',
      justification: `Materials required for job ${job.jobNumber}`,
      notes: `Auto-generated from job creation`
    }).returning();
    
    // Create requisition items
    for (const row of jobMaterialRows) {
      const unitPrice = Number(row.material.pricePerUnit) || 100;
      const quantity = row.jobMaterial.quantity * Number(row.jobMaterial.requiredLength);
      
      await tx.insert(purchaseRequisitionItems).values({
        requisitionId: requisition.id,
        materialId: row.material.id,
        description: row.material.name,
        quantity: quantity.toString(),
        unit: row.material.unit || 'meters',
        estimatedUnitPrice: unitPrice.toString(),
        estimatedTotalPrice: (quantity * unitPrice).toString(),
        notes: row.jobMaterial.notes
      });
    }
    
    console.log(`[Job Lifecycle] Created requisition ${reqNumber}`);
    return requisition.id;
  }
  
  /**
   * Generate unique requisition number
   */
  private async generateRequisitionNumber(tx: any): Promise<string> {
    const prefix = 'REQ';
    
    const [sequence] = await tx.select()
      .from(numberingSequences)
      .where(and(
        eq(numberingSequences.type, 'requisition'),
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
        type: 'requisition',
        prefix,
        currentNumber: nextNumber,
        lastUsed: new Date()
      });
    }
    
    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }
  
  /**
   * Get job lifecycle status
   */
  async getJobLifecycleStatus(jobId: number): Promise<any> {
    const [job] = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    if (!job) {
      return null;
    }
    
    // Get related data
    const materials = await db.select()
      .from(jobMaterials)
      .where(eq(jobMaterials.jobId, jobId));
    
    const requisitions = await db.select()
      .from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.jobId, jobId));
    
    return {
      job,
      materials: materials.length,
      requisitions: requisitions.map(r => ({
        id: r.id,
        number: r.requisitionNumber,
        status: r.status
      })),
      lifecycle: {
        estimation: job.estimationId ? 'completed' : 'not_linked',
        jobCreation: 'completed',
        materialSetup: materials.length > 0 ? 'completed' : 'pending',
        procurement: requisitions.length > 0 ? 'in_progress' : 'pending'
      }
    };
  }
}

export default new JobLifecycleService();