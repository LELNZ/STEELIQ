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
  materialId?: string;
  operationType: string;
  description: string;
  operationData?: any;
  method?: string;
  position?: string;
  includeInLabor?: boolean;
  includeInConsumables?: boolean;
  includeInCoatings?: boolean;
  userId?: number;
}

interface OperationRouteConfig {
  laborItems?: Partial<EstimationLabor>[];
  consumableItems?: Partial<EstimationConsumable>[];
  coatingItems?: Partial<EstimationCoating>[];
}

export class OperationService {
  // Create an operation and route it to appropriate tabs
  async createOperation(params: OperationCreationParams): Promise<EstimationOperation> {
    const {
      projectId,
      materialDesignation,
      materialId,
      operationType,
      description,
      operationData = {},
      method,
      position,
      includeInLabor = false,
      includeInConsumables = false,
      includeInCoatings = false,
      userId
    } = params;

    // Generate unique operation designation
    const operationDesignation = await this.generateOperationDesignation(projectId, materialDesignation, operationType);

    // Create the operation record
    const [operation] = await db.insert(estimationOperations)
      .values({
        project_id: projectId,
        material_id: materialId || materialDesignation,
        material_designation: materialDesignation,
        operation_type: operationType,
        operation_designation: operationDesignation,
        description,
        operation_data: operationData,
        method,
        position,
        include_in_labor: includeInLabor,
        include_in_consumables: includeInConsumables,
        include_in_coatings: includeInCoatings,
        status: 'planned',
        created_by: userId
      })
      .returning();

    // Route to appropriate tabs based on operation type and flags
    await this.routeOperationToTabs(operation, operationData);

    return operation;
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
        eq(estimationOperations.project_id, projectId),
        eq(estimationOperations.material_designation, materialDesignation),
        eq(estimationOperations.operation_type, operationType)
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
    if (operation.include_in_labor && routeConfig.laborItems) {
      for (const laborItem of routeConfig.laborItems) {
        await db.insert(estimationLabor).values({
          ...laborItem,
          project_id: operation.project_id,
          designation: operation.operation_designation,
          parent_material_id: operation.material_designation,
          operation_type: operation.operation_type
        } as any);
      }
      
      // Update operation with labor item IDs
      const laborIds = await db.select({ id: estimationLabor.id })
        .from(estimationLabor)
        .where(and(
          eq(estimationLabor.project_id, operation.project_id),
          eq(estimationLabor.designation, operation.operation_designation)
        ));
      
      await db.update(estimationOperations)
        .set({ labor_item_ids: laborIds.map(l => l.id) })
        .where(eq(estimationOperations.id, operation.id));
    }

    // Create consumable items
    if (operation.include_in_consumables && routeConfig.consumableItems) {
      for (const consumableItem of routeConfig.consumableItems) {
        await db.insert(estimationConsumables).values({
          ...consumableItem,
          project_id: operation.project_id,
          designation: operation.operation_designation,
          parent_material_id: operation.material_designation,
          operation_type: operation.operation_type
        } as any);
      }
      
      // Update operation with consumable item IDs
      const consumableIds = await db.select({ id: estimationConsumables.id })
        .from(estimationConsumables)
        .where(and(
          eq(estimationConsumables.project_id, operation.project_id),
          eq(estimationConsumables.designation, operation.operation_designation)
        ));
      
      await db.update(estimationOperations)
        .set({ consumable_item_ids: consumableIds.map(c => c.id) })
        .where(eq(estimationOperations.id, operation.id));
    }

    // Create coating items
    if (operation.include_in_coatings && routeConfig.coatingItems) {
      for (const coatingItem of routeConfig.coatingItems) {
        await db.insert(estimationCoatings).values({
          ...coatingItem,
          project_id: operation.project_id,
          designation: operation.operation_designation,
          parent_material_id: operation.material_designation,
          operation_type: operation.operation_type
        } as any);
      }
      
      // Update operation with coating item IDs
      const coatingIds = await db.select({ id: estimationCoatings.id })
        .from(estimationCoatings)
        .where(and(
          eq(estimationCoatings.project_id, operation.project_id),
          eq(estimationCoatings.designation, operation.operation_designation)
        ));
      
      await db.update(estimationOperations)
        .set({ coating_item_ids: coatingIds.map(c => c.id) })
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
    switch (operation.operation_type.toLowerCase()) {
      case 'cutting':
        config.laborItems = [{
          category: 'fabrication',
          type: 'cutting',
          description: operation.description,
          hours: operationData.laborHours || 0.5,
          hourly_rate: 75,
          total_cost: (operationData.laborHours || 0.5) * 75,
          skill_level: 'intermediate',
          location: 'workshop'
        }];
        
        config.consumableItems = [{
          item: 'Cutting disc',
          category: 'cutting',
          quantity: operationData.discQuantity || 0.1,
          unit: 'disc',
          unit_cost: 15,
          total_cost: (operationData.discQuantity || 0.1) * 15
        }];
        break;

      case 'drilling':
        config.laborItems = [{
          category: 'fabrication',
          type: 'drilling',
          description: operation.description,
          hours: operationData.laborHours || 0.25,
          hourly_rate: 70,
          total_cost: (operationData.laborHours || 0.25) * 70,
          skill_level: 'intermediate',
          location: 'workshop'
        }];
        
        config.consumableItems = [{
          item: 'Drill bit',
          category: 'drilling',
          quantity: operationData.bitWear || 0.05,
          unit: 'bit',
          unit_cost: 25,
          total_cost: (operationData.bitWear || 0.05) * 25
        }];
        break;

      case 'welding':
        config.laborItems = [{
          category: 'fabrication',
          type: 'welding',
          description: operation.description,
          hours: operationData.laborHours || 1.0,
          hourly_rate: 85,
          total_cost: (operationData.laborHours || 1.0) * 85,
          skill_level: 'advanced',
          location: 'workshop',
          subcategory: operation.method || 'MIG'
        }];
        
        config.consumableItems = [{
          item: 'Welding wire',
          category: 'welding',
          quantity: operationData.wireQuantity || 0.5,
          unit: 'kg',
          unit_cost: 12,
          total_cost: (operationData.wireQuantity || 0.5) * 12
        }, {
          item: 'Shielding gas',
          category: 'welding',
          quantity: operationData.gasQuantity || 0.2,
          unit: 'm³',
          unit_cost: 25,
          total_cost: (operationData.gasQuantity || 0.2) * 25
        }];
        break;

      case 'blasting':
        config.laborItems = [{
          category: 'surface_treatment',
          type: 'blasting',
          description: operation.description,
          hours: operationData.laborHours || 0.5,
          hourly_rate: 65,
          total_cost: (operationData.laborHours || 0.5) * 65,
          skill_level: 'intermediate',
          location: 'blast_booth'
        }];
        
        config.consumableItems = [{
          item: 'Blasting grit',
          category: 'blasting',
          quantity: operationData.gritQuantity || 10,
          unit: 'kg',
          unit_cost: 2,
          total_cost: (operationData.gritQuantity || 10) * 2
        }];
        break;

      case 'painting':
      case 'priming':
        config.coatingItems = [{
          coating_type: operation.operation_type,
          description: operation.description,
          surface_area: operationData.surfaceArea || 1.0,
          coats_required: operationData.coatsRequired || 2,
          coverage_rate: operationData.coverageRate || 10,
          quantity: (operationData.surfaceArea || 1.0) / (operationData.coverageRate || 10) * (operationData.coatsRequired || 2),
          unit: 'L',
          unit_cost: operationData.unitCost || 25,
          total_cost: ((operationData.surfaceArea || 1.0) / (operationData.coverageRate || 10) * (operationData.coatsRequired || 2)) * (operationData.unitCost || 25),
          application_method: operationData.applicationMethod || 'spray',
          preparation_method: operationData.preparationMethod || 'blast_clean'
        }];
        
        config.laborItems = [{
          category: 'surface_treatment',
          type: operation.operation_type,
          description: operation.description,
          hours: operationData.laborHours || 0.75,
          hourly_rate: 70,
          total_cost: (operationData.laborHours || 0.75) * 70,
          skill_level: 'intermediate',
          location: 'paint_booth'
        }];
        break;

      default:
        // For other operation types, create basic labor item
        if (operation.include_in_labor) {
          config.laborItems = [{
            category: 'general',
            type: operation.operation_type,
            description: operation.description,
            hours: operationData.laborHours || 1.0,
            hourly_rate: 70,
            total_cost: (operationData.laborHours || 1.0) * 70,
            skill_level: 'intermediate',
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
        operationType: templateOp.operation_type,
        description: templateOp.description,
        operationData: templateOp.operation_data,
        method: templateOp.method || undefined,
        position: templateOp.position || undefined,
        includeInLabor: templateOp.include_in_labor,
        includeInConsumables: templateOp.include_in_consumables,
        includeInCoatings: templateOp.include_in_coatings,
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
    if (operation.operation_designation && operation.project_id) {
      // Delete labor items with this operation designation
      await db.delete(estimationLabor)
        .where(and(
          eq(estimationLabor.project_id, operation.project_id),
          eq(estimationLabor.designation, operation.operation_designation)
        ));

      // Delete consumable items with this operation designation
      await db.delete(estimationConsumables)
        .where(and(
          eq(estimationConsumables.project_id, operation.project_id),
          eq(estimationConsumables.designation, operation.operation_designation)
        ));

      // Delete coating items with this operation designation
      await db.delete(estimationCoatings)
        .where(and(
          eq(estimationCoatings.project_id, operation.project_id),
          eq(estimationCoatings.designation, operation.operation_designation)
        ));
    } else {
      // Fallback to ID-based deletion if designation isn't available
      if (operation.labor_item_ids && Array.isArray(operation.labor_item_ids)) {
        await db.delete(estimationLabor)
          .where(inArray(estimationLabor.id, operation.labor_item_ids as number[]));
      }

      if (operation.consumable_item_ids && Array.isArray(operation.consumable_item_ids)) {
        await db.delete(estimationConsumables)
          .where(inArray(estimationConsumables.id, operation.consumable_item_ids as number[]));
      }

      if (operation.coating_item_ids && Array.isArray(operation.coating_item_ids)) {
        await db.delete(estimationCoatings)
          .where(inArray(estimationCoatings.id, operation.coating_item_ids as number[]));
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
        eq(estimationOperations.project_id, projectId),
        eq(estimationOperations.material_designation, materialDesignation)
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
      .where(eq(estimationOperations.project_id, projectId))
      .orderBy(estimationOperations.material_designation, estimationOperations.sequence_order);

    // Group by material designation
    const grouped: Record<string, EstimationOperation[]> = {};
    for (const op of operations) {
      if (!grouped[op.material_designation]) {
        grouped[op.material_designation] = [];
      }
      grouped[op.material_designation].push(op);
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
          operationType: sourceOp.operation_type,
          description: sourceOp.description,
          operationData: sourceOp.operation_data,
          method: sourceOp.method || undefined,
          position: sourceOp.position || undefined,
          includeInLabor: sourceOp.include_in_labor,
          includeInConsumables: sourceOp.include_in_consumables,
          includeInCoatings: sourceOp.include_in_coatings,
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