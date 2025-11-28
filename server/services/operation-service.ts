import { db } from "../db";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  estimationOperations,
  estimationMaterials,
  estimationLabor,
  estimationConsumables,
  estimationCoatings,
  weldingStandards,
  drillingStandards,
  cuttingStandards,
  blastingStandards,
  coatingSystems,
  assemblyTemplates,
  EstimationOperation,
  EstimationLabor,
  EstimationConsumable,
  EstimationCoating
} from "@shared/schema";

interface OperationCreationParams {
  projectId: number;
  materialDesignation: string;
  materialId?: number;
  operationType: string;
  description: string;
  operationDesignation?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  operationData?: any;
  method?: string;
  position?: string;
  includeInLabor?: boolean;
  includeInConsumables?: boolean;
  includeInCoatings?: boolean;
  includeInEquipment?: boolean;
  sequenceOrder?: number;
  notes?: string;
  userId?: number;
}

interface OperationRouteConfig {
  laborItems?: Partial<EstimationLabor>[];
  consumableItems?: Partial<EstimationConsumable>[];
  coatingItems?: Partial<EstimationCoating>[];
}

export class OperationService {
  // PostgreSQL integer maximum value
  private static readonly POSTGRES_MAX_INT = 2147483647;

  // Validate that an ID doesn't exceed PostgreSQL's integer limit
  private validateIntegerRange(value: number | null | undefined, fieldName: string): void {
    if (value !== null && value !== undefined) {
      if (value > OperationService.POSTGRES_MAX_INT || value < -OperationService.POSTGRES_MAX_INT) {
        throw new Error(
          `${fieldName} value ${value} exceeds PostgreSQL integer range. ` +
          `Maximum allowed value is ${OperationService.POSTGRES_MAX_INT}. ` +
          `This often happens when using Date.now() or timestamp values instead of database IDs.`
        );
      }
    }
  }

  // Create an operation and route it to appropriate tabs
  async createOperation(params: OperationCreationParams): Promise<EstimationOperation> {
    const {
      projectId,
      materialDesignation,
      materialId,
      operationType,
      description,
      operationDesignation: providedDesignation,
      quantity = 1,
      unitCost = 0,
      totalCost = 0,
      operationData = {},
      method,
      position,
      includeInLabor = false,
      includeInConsumables = false,
      includeInCoatings = false,
      includeInEquipment = false,
      sequenceOrder,
      notes,
      userId
    } = params;

    try {
      // Validate projectId doesn't exceed integer limits
      this.validateIntegerRange(projectId, 'projectId');

      // Ensure materialId is numeric or null, not a string designation
      let validMaterialId: number | null = null;
      if (materialId) {
        // Check if materialId is numeric
        const numericId = typeof materialId === 'number' ? materialId : parseInt(materialId.toString(), 10);
        
        // Validate the numeric ID doesn't exceed PostgreSQL limits
        if (!isNaN(numericId)) {
          // Critical: Check for integer overflow before using
          this.validateIntegerRange(numericId, 'materialId');
          validMaterialId = numericId;
        } else {
          // If not numeric, try to look up the material by designation
          console.warn(`Material ID "${materialId}" is not numeric, attempting lookup by designation`);
          const [material] = await db.select()
            .from(estimationMaterials)
            .where(and(
              eq(estimationMaterials.projectId, projectId),
              eq(estimationMaterials.designation, materialId.toString())
            ))
            .limit(1);
          
          if (material) {
            validMaterialId = material.id;
          } else {
            console.warn(`Could not find material with designation "${materialId}", proceeding with null material_id`);
          }
        }
      }

      // Generate unique operation designation if not provided
      const operationDesignation = providedDesignation || await this.generateOperationDesignation(projectId, materialDesignation, operationType);

      // Log the data being inserted for debugging
      const insertData = {
        projectId: projectId,
        materialId: validMaterialId, // Use validated numeric ID or null
        materialDesignation: materialDesignation,
        operationType: operationType,
        operationDesignation: operationDesignation,
        description,
        quantity: quantity.toString(),
        unitCost: unitCost.toString(),
        totalCost: totalCost.toString(),
        operationData: operationData,
        method,
        position,
        sequenceOrder: sequenceOrder,
        includeInLabor: includeInLabor,
        includeInConsumables: includeInConsumables,
        includeInCoatings: includeInCoatings,
        includeInEquipment: includeInEquipment,
        status: 'planned',
        notes,
        createdBy: userId
      };

      console.log('Creating operation with data:', JSON.stringify(insertData, null, 2));

      // Create the operation record
      const [operation] = await db.insert(estimationOperations)
        .values(insertData)
        .returning();
      
      console.log('Operation created successfully:', operation);

      // Route to appropriate tabs based on operation type and flags
      await this.routeOperationToTabs(operation, operationData);

      return operation;
    } catch (error) {
      console.error('Failed to create operation - Database error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        params: {
          projectId,
          materialDesignation,
          operationType,
          description,
          includeInLabor,
          includeInConsumables,
          includeInCoatings
        }
      });
      throw error;
    }
  }

  // Generate unique operation designation (e.g., C1-cut-1, B2-drill-2, PL1-weld-3)
  private async generateOperationDesignation(
    projectId: number,
    materialDesignation: string,
    operationType: string
  ): Promise<string> {
    const shortType = this.getOperationShortCode(operationType);
    
    // Count existing operations of this type for this material
    const existingOps = await db.select({ id: estimationOperations.id })
      .from(estimationOperations)
      .where(and(
        eq(estimationOperations.projectId, projectId),
        eq(estimationOperations.materialDesignation, materialDesignation),
        eq(estimationOperations.operationType, operationType)
      ));
    
    const sequence = existingOps.length + 1;
    return `${materialDesignation}-${shortType}-${sequence}`;
  }

  // Get short code for operation type
  private getOperationShortCode(operationType: string): string {
    const codes: Record<string, string> = {
      'cutting': 'cut',
      'drilling': 'drill',
      'welding': 'weld',
      'grinding': 'grind',
      'blasting': 'blast',
      'painting': 'paint',
      'priming': 'prime',
      'galvanizing': 'galv',
      'assembly': 'asm',
      'stiffener': 'stiff',
      'endplate': 'endpl',
      'baseplate': 'base',
      'handling': 'hand'
    };
    return codes[operationType.toLowerCase()] || operationType.substring(0, 4).toLowerCase();
  }

  // Route operation to appropriate tabs based on type and configuration
  private async routeOperationToTabs(operation: EstimationOperation, operationData: any) {
    const routeConfig = await this.determineRouteConfig(operation, operationData);
    
    // Create labor items
    if (operation.includeInLabor && routeConfig.laborItems) {
      for (const laborItem of routeConfig.laborItems) {
        await db.insert(estimationLabor).values({
          ...laborItem,
          projectId: operation.projectId,
          designation: operation.operationDesignation,
          parentMaterialId: operation.materialDesignation,
          operationType: operation.operationType
        } as any);
      }
      
      // Update operation with labor item IDs
      const laborIds = await db.select({ id: estimationLabor.id })
        .from(estimationLabor)
        .where(and(
          eq(estimationLabor.projectId, operation.projectId),
          eq(estimationLabor.designation, operation.operationDesignation)
        ));
      
      await db.update(estimationOperations)
        .set({ laborItemIds: laborIds.map(l => l.id) })
        .where(eq(estimationOperations.id, operation.id));
    }

    // Create consumable items
    if (operation.includeInConsumables && routeConfig.consumableItems) {
      for (const consumableItem of routeConfig.consumableItems) {
        await db.insert(estimationConsumables).values({
          ...consumableItem,
          projectId: operation.projectId,
          designation: operation.operationDesignation,
          parentMaterialId: operation.materialDesignation,
          operationType: operation.operationType
        } as any);
      }
      
      // Update operation with consumable item IDs
      const consumableIds = await db.select({ id: estimationConsumables.id })
        .from(estimationConsumables)
        .where(and(
          eq(estimationConsumables.projectId, operation.projectId),
          eq(estimationConsumables.designation, operation.operationDesignation)
        ));
      
      await db.update(estimationOperations)
        .set({ consumableItemIds: consumableIds.map(c => c.id) })
        .where(eq(estimationOperations.id, operation.id));
    }

    // Create coating items
    if (operation.includeInCoatings && routeConfig.coatingItems) {
      for (const coatingItem of routeConfig.coatingItems) {
        await db.insert(estimationCoatings).values({
          ...coatingItem,
          projectId: operation.projectId,
          designation: operation.operationDesignation,
          parentMaterialId: operation.materialDesignation,
          operationType: operation.operationType
        } as any);
      }
      
      // Update operation with coating item IDs
      const coatingIds = await db.select({ id: estimationCoatings.id })
        .from(estimationCoatings)
        .where(and(
          eq(estimationCoatings.projectId, operation.projectId),
          eq(estimationCoatings.designation, operation.operationDesignation)
        ));
      
      await db.update(estimationOperations)
        .set({ coatingItemIds: coatingIds.map(c => c.id) })
        .where(eq(estimationOperations.id, operation.id));
    }
  }

  // Determine what items to create based on operation type and settings
  private async determineRouteConfig(operation: EstimationOperation, operationData: any): Promise<OperationRouteConfig> {
    const config: OperationRouteConfig = {
      laborItems: [],
      consumableItems: [],
      coatingItems: []
    };

    // Based on operation type, determine default routing
    switch (operation.operationType.toLowerCase()) {
      case 'cutting':
        config.laborItems = [{
          category: 'fabrication',
          type: 'cutting',
          description: operation.description,
          hours: operationData.laborHours || 0.5,
          hourlyRate: 75,
          totalCost: (operationData.laborHours || 0.5) * 75,
          skillLevel: 'intermediate',
          location: 'workshop'
        }];
        
        config.consumableItems = [{
          item: 'Cutting disc',
          category: 'cutting',
          quantity: operationData.discQuantity || 0.1,
          unit: 'disc',
          unitCost: 15,
          totalCost: (operationData.discQuantity || 0.1) * 15
        }];
        break;

      case 'drilling':
        config.laborItems = [{
          category: 'fabrication',
          type: 'drilling',
          description: operation.description,
          hours: operationData.laborHours || 0.25,
          hourlyRate: 70,
          totalCost: (operationData.laborHours || 0.25) * 70,
          skillLevel: 'intermediate',
          location: 'workshop'
        }];
        
        config.consumableItems = [{
          item: 'Drill bit',
          category: 'drilling',
          quantity: operationData.bitWear || 0.05,
          unit: 'bit',
          unitCost: 25,
          totalCost: (operationData.bitWear || 0.05) * 25
        }];
        break;

      case 'welding':
        config.laborItems = [{
          category: 'fabrication',
          type: 'welding',
          description: operation.description,
          hours: operationData.laborHours || 1.0,
          hourlyRate: 85,
          totalCost: (operationData.laborHours || 1.0) * 85,
          skillLevel: 'advanced',
          location: 'workshop',
          subcategory: operation.method || 'MIG'
        }];
        
        config.consumableItems = [{
          item: 'Welding wire',
          category: 'welding',
          quantity: operationData.wireQuantity || 0.5,
          unit: 'kg',
          unitCost: 12,
          totalCost: (operationData.wireQuantity || 0.5) * 12
        }, {
          item: 'Shielding gas',
          category: 'welding',
          quantity: operationData.gasQuantity || 0.2,
          unit: 'm³',
          unitCost: 25,
          totalCost: (operationData.gasQuantity || 0.2) * 25
        }];
        break;

      case 'blasting':
        config.laborItems = [{
          category: 'surface_treatment',
          type: 'blasting',
          description: operation.description,
          hours: operationData.laborHours || 0.5,
          hourlyRate: 65,
          totalCost: (operationData.laborHours || 0.5) * 65,
          skillLevel: 'intermediate',
          location: 'blast_booth'
        }];
        
        config.consumableItems = [{
          item: 'Blasting grit',
          category: 'blasting',
          quantity: operationData.gritQuantity || 10,
          unit: 'kg',
          unitCost: 2,
          totalCost: (operationData.gritQuantity || 10) * 2
        }];
        break;

      case 'painting':
      case 'priming':
        config.coatingItems = [{
          coatingType: operation.operationType,
          description: operation.description,
          surfaceArea: operationData.surfaceArea || 1.0,
          coatsRequired: operationData.coatsRequired || 2,
          coverageRate: operationData.coverageRate || 10,
          quantity: (operationData.surfaceArea || 1.0) / (operationData.coverageRate || 10) * (operationData.coatsRequired || 2),
          unit: 'L',
          unitCost: operationData.unitCost || 25,
          totalCost: ((operationData.surfaceArea || 1.0) / (operationData.coverageRate || 10) * (operationData.coatsRequired || 2)) * (operationData.unitCost || 25),
          applicationMethod: operationData.applicationMethod || 'spray',
          preparationMethod: operationData.preparationMethod || 'blast_clean'
        }];
        
        config.laborItems = [{
          category: 'surface_treatment',
          type: operation.operationType,
          description: operation.description,
          hours: operationData.laborHours || 0.75,
          hourlyRate: 70,
          totalCost: (operationData.laborHours || 0.75) * 70,
          skillLevel: 'intermediate',
          location: 'paint_booth'
        }];
        break;

      default:
        // For other operation types, create basic labor item
        if (operation.includeInLabor) {
          config.laborItems = [{
            category: 'general',
            type: operation.operationType,
            description: operation.description,
            hours: operationData.laborHours || 1.0,
            hourlyRate: 70,
            totalCost: (operationData.laborHours || 1.0) * 70,
            skillLevel: 'intermediate',
            location: 'workshop'
          }];
        }
        break;
    }

    return config;
  }

  // Apply operation template to multiple materials
  async applyToMultipleMaterials(
    templateOperationId: number,
    materialDesignations: string[],
    projectId: number,
    userId?: number
  ): Promise<EstimationOperation[]> {
    // Get template operation
    const [templateOp] = await db.select()
      .from(estimationOperations)
      .where(eq(estimationOperations.id, templateOperationId));

    if (!templateOp) {
      throw new Error('Template operation not found');
    }

    const createdOperations: EstimationOperation[] = [];

    // Apply to each material designation
    for (const designation of materialDesignations) {
      const newOp = await this.createOperation({
        projectId,
        materialDesignation: designation,
        operationType: templateOp.operationType,
        description: templateOp.description,
        operationData: templateOp.operationData,
        method: templateOp.method || undefined,
        position: templateOp.position || undefined,
        includeInLabor: templateOp.includeInLabor,
        includeInConsumables: templateOp.includeInConsumables,
        includeInCoatings: templateOp.includeInCoatings,
        userId
      });

      createdOperations.push(newOp);
    }

    return createdOperations;
  }

  // Delete operation and cascade to related items
  async deleteOperation(operationId: number): Promise<void> {
    // Get operation details
    const [operation] = await db.select()
      .from(estimationOperations)
      .where(eq(estimationOperations.id, operationId));

    if (!operation) {
      throw new Error('Operation not found');
    }

    // Delete related items by designation (more robust than ID arrays)
    // This ensures all related items are deleted even if IDs weren't stored
    if (operation.operationDesignation && operation.projectId) {
      // Delete labor items with this operation designation
      await db.delete(estimationLabor)
        .where(and(
          eq(estimationLabor.projectId, operation.projectId),
          eq(estimationLabor.designation, operation.operationDesignation)
        ));

      // Delete consumable items with this operation designation
      await db.delete(estimationConsumables)
        .where(and(
          eq(estimationConsumables.projectId, operation.projectId),
          eq(estimationConsumables.designation, operation.operationDesignation)
        ));

      // Delete coating items with this operation designation
      await db.delete(estimationCoatings)
        .where(and(
          eq(estimationCoatings.projectId, operation.projectId),
          eq(estimationCoatings.designation, operation.operationDesignation)
        ));
    } else {
      // Fallback to ID-based deletion if designation isn't available
      if (operation.laborItemIds && Array.isArray(operation.laborItemIds)) {
        await db.delete(estimationLabor)
          .where(inArray(estimationLabor.id, operation.laborItemIds as number[]));
      }

      if (operation.consumableItemIds && Array.isArray(operation.consumableItemIds)) {
        await db.delete(estimationConsumables)
          .where(inArray(estimationConsumables.id, operation.consumableItemIds as number[]));
      }

      if (operation.coatingItemIds && Array.isArray(operation.coatingItemIds)) {
        await db.delete(estimationCoatings)
          .where(inArray(estimationCoatings.id, operation.coatingItemIds as number[]));
      }
    }

    // Delete the operation itself
    await db.delete(estimationOperations)
      .where(eq(estimationOperations.id, operationId));
  }

  // Delete all operations for a material
  async deleteOperationsForMaterial(projectId: number, materialDesignation: string): Promise<void> {
    // Get all operations for this material
    const operations = await db.select()
      .from(estimationOperations)
      .where(and(
        eq(estimationOperations.projectId, projectId),
        eq(estimationOperations.materialDesignation, materialDesignation)
      ));

    // Delete each operation with cascade
    for (const op of operations) {
      await this.deleteOperation(op.id);
    }
  }

  // Get operations for a project grouped by material
  async getProjectOperations(projectId: number): Promise<Record<string, EstimationOperation[]>> {
    const operations = await db.select()
      .from(estimationOperations)
      .where(eq(estimationOperations.projectId, projectId))
      .orderBy(estimationOperations.materialDesignation, estimationOperations.sequenceOrder);

    // Group by material designation
    const grouped: Record<string, EstimationOperation[]> = {};
    for (const op of operations) {
      if (!grouped[op.materialDesignation]) {
        grouped[op.materialDesignation] = [];
      }
      grouped[op.materialDesignation].push(op);
    }

    return grouped;
  }

  // Update operation costs
  async updateOperationCosts(
    operationId: number,
    laborCost?: number,
    consumablesCost?: number,
    coatingsCost?: number
  ): Promise<void> {
    const updates: any = {};
    
    if (laborCost !== undefined) {
      updates.labor_cost_override = laborCost;
    }
    if (consumablesCost !== undefined) {
      updates.consumables_cost_override = consumablesCost;
    }
    if (coatingsCost !== undefined) {
      updates.coatings_cost_override = coatingsCost;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = sql`CURRENT_TIMESTAMP`;
      await db.update(estimationOperations)
        .set(updates)
        .where(eq(estimationOperations.id, operationId));
    }
  }

  // Batch create operations for multiple materials
  async batchCreateOperations(
    projectId: number,
    materialDesignations: string[],
    operations: Array<{
      operationType: string;
      description: string;
      operationData?: any;
      method?: string;
      position?: string;
      includeInLabor?: boolean;
      includeInConsumables?: boolean;
      includeInCoatings?: boolean;
    }>,
    userId?: number
  ): Promise<EstimationOperation[]> {
    const createdOperations: EstimationOperation[] = [];

    // For each material designation
    for (const designation of materialDesignations) {
      // Create each operation
      for (const opConfig of operations) {
        const operation = await this.createOperation({
          projectId,
          materialDesignation: designation,
          operationType: opConfig.operationType,
          description: opConfig.description,
          operationData: opConfig.operationData,
          method: opConfig.method,
          position: opConfig.position,
          includeInLabor: opConfig.includeInLabor,
          includeInConsumables: opConfig.includeInConsumables,
          includeInCoatings: opConfig.includeInCoatings,
          userId
        });

        createdOperations.push(operation);
      }
    }

    return createdOperations;
  }

  // Clone operations from one material to another
  async cloneOperations(
    projectId: number,
    sourceMaterialDesignation: string,
    targetMaterialDesignations: string[],
    userId?: number
  ): Promise<EstimationOperation[]> {
    // Get all operations for the source material
    const sourceOperations = await db.select()
      .from(estimationOperations)
      .where(and(
        eq(estimationOperations.project_id, projectId),
        eq(estimationOperations.material_designation, sourceMaterialDesignation)
      ));

    if (sourceOperations.length === 0) {
      throw new Error('No operations found for source material');
    }

    const clonedOperations: EstimationOperation[] = [];

    // Clone to each target material
    for (const targetDesignation of targetMaterialDesignations) {
      for (const sourceOp of sourceOperations) {
        const clonedOp = await this.createOperation({
          projectId,
          materialDesignation: targetDesignation,
          operationType: sourceOp.operationType,
          description: sourceOp.description,
          operationData: sourceOp.operationData,
          method: sourceOp.method || undefined,
          position: sourceOp.position || undefined,
          includeInLabor: sourceOp.includeInLabor,
          includeInConsumables: sourceOp.includeInConsumables,
          includeInCoatings: sourceOp.includeInCoatings,
          userId
        });

        clonedOperations.push(clonedOp);
      }
    }

    return clonedOperations;
  }

  // Get consumption rates from settings (placeholder for future implementation)
  async getConsumptionRates(operationType: string, method?: string): Promise<any> {
    // This will be expanded when consumption rate settings are implemented
    // For now, return default rates based on operation type
    const defaultRates: Record<string, any> = {
      'cutting': {
        discConsumption: 0.1, // discs per meter
        laborRate: 0.5 // hours per meter
      },
      'drilling': {
        bitWear: 0.05, // bits per hole
        laborRate: 0.25 // hours per hole
      },
      'welding': {
        wireConsumption: 0.5, // kg per meter
        gasConsumption: 0.2, // m³ per meter
        laborRate: 1.0 // hours per meter
      },
      'blasting': {
        gritConsumption: 10, // kg per m²
        laborRate: 0.5 // hours per m²
      },
      'painting': {
        coverageRate: 10, // m² per liter
        laborRate: 0.75 // hours per m²
      }
    };

    return defaultRates[operationType.toLowerCase()] || {};
  }
}

// Export singleton instance
export const operationService = new OperationService();