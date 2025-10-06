import { db } from "../db";
import { eq, and, or, between, sql, desc, gte, lte, isNull } from "drizzle-orm";
import { 
  consumptionRateSettings, 
  operationTemplates,
  type ConsumptionRateSetting,
  type OperationTemplate,
  type InsertConsumptionRateSetting,
  type InsertOperationTemplate
} from "@shared/schema";

export class ConsumptionRatesService {
  // Get consumption rates for an operation type
  async getConsumptionRates(
    operationType: string,
    method?: string,
    materialType?: string,
    thickness?: number,
    diameter?: number
  ): Promise<ConsumptionRateSetting | null> {
    // Build query conditions
    const conditions = [
      eq(consumptionRateSettings.operationType, operationType),
      eq(consumptionRateSettings.isActive, true)
    ];

    // Add optional method condition (match specific or null)
    if (method) {
      conditions.push(
        or(
          eq(consumptionRateSettings.method, method),
          isNull(consumptionRateSettings.method)
        )!
      );
    }

    // Add optional material type condition (match specific or null)
    if (materialType) {
      conditions.push(
        or(
          eq(consumptionRateSettings.materialType, materialType),
          isNull(consumptionRateSettings.materialType)
        )!
      );
    }

    // Add thickness range condition
    if (thickness !== undefined) {
      conditions.push(
        or(
          and(
            isNull(consumptionRateSettings.thicknessMin),
            isNull(consumptionRateSettings.thicknessMax)
          ),
          and(
            gte(sql`${thickness}`, sql`COALESCE(${consumptionRateSettings.thicknessMin}, 0)`),
            lte(sql`${thickness}`, sql`COALESCE(${consumptionRateSettings.thicknessMax}, 9999)`)
          )
        )!
      );
    }

    // Add diameter range condition
    if (diameter !== undefined) {
      conditions.push(
        or(
          and(
            isNull(consumptionRateSettings.diameterMin),
            isNull(consumptionRateSettings.diameterMax)
          ),
          and(
            gte(sql`${diameter}`, sql`COALESCE(${consumptionRateSettings.diameterMin}, 0)`),
            lte(sql`${diameter}`, sql`COALESCE(${consumptionRateSettings.diameterMax}, 9999)`)
          )
        )!
      );
    }

    const result = await db
      .select()
      .from(consumptionRateSettings)
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${consumptionRateSettings.method} IS NOT NULL THEN 0 ELSE 1 END`,
        sql`CASE WHEN ${consumptionRateSettings.materialType} IS NOT NULL THEN 0 ELSE 1 END`,
        desc(consumptionRateSettings.isCompanyDefault)
      )
      .limit(1);

    return result[0] || null;
  }

  // Create or update consumption rate setting
  async saveConsumptionRate(rate: Partial<ConsumptionRateSetting>, userId: number): Promise<ConsumptionRateSetting> {
    const now = new Date();
    
    if (rate.id) {
      // Update existing using Drizzle ORM
      const updateData: Partial<InsertConsumptionRateSetting> = {
        ...(rate.operationType !== undefined && { operationType: rate.operationType }),
        method: rate.method || null,
        materialType: rate.materialType || null,
        thicknessMin: rate.thicknessMin?.toString() || null,
        thicknessMax: rate.thicknessMax?.toString() || null,
        diameterMin: rate.diameterMin?.toString() || null,
        diameterMax: rate.diameterMax?.toString() || null,
        laborHoursPerUnit: rate.laborHoursPerUnit?.toString() || null,
        laborUnit: rate.laborUnit || null,
        skillLevel: rate.skillLevel || null,
        crewSize: rate.crewSize ?? null,
        primaryConsumable: rate.primaryConsumable || null,
        primaryConsumableRate: rate.primaryConsumableRate?.toString() || null,
        primaryConsumableUnit: rate.primaryConsumableUnit || null,
        secondaryConsumable: rate.secondaryConsumable || null,
        secondaryConsumableRate: rate.secondaryConsumableRate?.toString() || null,
        secondaryConsumableUnit: rate.secondaryConsumableUnit || null,
        tertiaryConsumable: rate.tertiaryConsumable || null,
        tertiaryConsumableRate: rate.tertiaryConsumableRate?.toString() || null,
        tertiaryConsumableUnit: rate.tertiaryConsumableUnit || null,
        consumablesDetails: rate.consumablesDetails || null,
        equipmentCostPerHour: rate.equipmentCostPerHour?.toString() || null,
        equipmentUtilization: rate.equipmentUtilization?.toString() || null,
        notes: rate.notes || null,
        ...(rate.isCompanyDefault !== undefined && { isCompanyDefault: rate.isCompanyDefault }),
        ...(rate.isActive !== undefined && { isActive: rate.isActive }),
        updatedAt: now,
      };

      const result = await db
        .update(consumptionRateSettings)
        .set(updateData)
        .where(eq(consumptionRateSettings.id, rate.id))
        .returning();
      
      return result[0];
    } else {
      // Create new using Drizzle ORM
      const insertData: Partial<InsertConsumptionRateSetting> = {
        operationType: rate.operationType!,
        method: rate.method || null,
        materialType: rate.materialType || null,
        thicknessMin: rate.thicknessMin?.toString() || null,
        thicknessMax: rate.thicknessMax?.toString() || null,
        diameterMin: rate.diameterMin?.toString() || null,
        diameterMax: rate.diameterMax?.toString() || null,
        laborHoursPerUnit: rate.laborHoursPerUnit?.toString() || null,
        laborUnit: rate.laborUnit || null,
        skillLevel: rate.skillLevel || null,
        crewSize: rate.crewSize ?? 1,
        primaryConsumable: rate.primaryConsumable || null,
        primaryConsumableRate: rate.primaryConsumableRate?.toString() || null,
        primaryConsumableUnit: rate.primaryConsumableUnit || null,
        secondaryConsumable: rate.secondaryConsumable || null,
        secondaryConsumableRate: rate.secondaryConsumableRate?.toString() || null,
        secondaryConsumableUnit: rate.secondaryConsumableUnit || null,
        tertiaryConsumable: rate.tertiaryConsumable || null,
        tertiaryConsumableRate: rate.tertiaryConsumableRate?.toString() || null,
        tertiaryConsumableUnit: rate.tertiaryConsumableUnit || null,
        consumablesDetails: rate.consumablesDetails || null,
        equipmentCostPerHour: rate.equipmentCostPerHour?.toString() || null,
        equipmentUtilization: rate.equipmentUtilization?.toString() || null,
        notes: rate.notes || null,
        isCompanyDefault: rate.isCompanyDefault ?? false,
        isActive: rate.isActive ?? true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      };

      const result = await db
        .insert(consumptionRateSettings)
        .values(insertData as InsertConsumptionRateSetting)
        .returning();
      
      return result[0];
    }
  }

  // Get all consumption rate settings
  async getAllConsumptionRates(activeOnly: boolean = true): Promise<ConsumptionRateSetting[]> {
    const query = db
      .select()
      .from(consumptionRateSettings)
      .orderBy(consumptionRateSettings.operationType, consumptionRateSettings.method);

    if (activeOnly) {
      return await query.where(eq(consumptionRateSettings.isActive, true));
    }
    
    return await query;
  }

  // Update consumption rate setting
  async updateConsumptionRate(id: number, rate: Partial<ConsumptionRateSetting>, userId: number): Promise<ConsumptionRateSetting> {
    // Add the id to the rate object and call saveConsumptionRate which handles updates
    return this.saveConsumptionRate({ ...rate, id }, userId);
  }

  // Delete consumption rate setting
  async deleteConsumptionRate(id: number): Promise<void> {
    await db
      .delete(consumptionRateSettings)
      .where(eq(consumptionRateSettings.id, id));
  }

  // Get operation templates
  async getOperationTemplates(
    category?: string,
    operationType?: string,
    activeOnly: boolean = true
  ): Promise<OperationTemplate[]> {
    const conditions = [];

    if (activeOnly) {
      conditions.push(eq(operationTemplates.isActive, true));
    }

    if (category) {
      conditions.push(eq(operationTemplates.category, category));
    }

    if (operationType) {
      conditions.push(eq(operationTemplates.operationType, operationType));
    }

    const query = db
      .select()
      .from(operationTemplates)
      .orderBy(
        desc(operationTemplates.isCompanyStandard),
        desc(operationTemplates.usageCount),
        operationTemplates.name
      );

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  // Get template by code
  async getTemplateByCode(code: string): Promise<OperationTemplate | null> {
    const result = await db
      .select()
      .from(operationTemplates)
      .where(and(
        eq(operationTemplates.code, code),
        eq(operationTemplates.isActive, true)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  // Save operation template
  async saveOperationTemplate(template: Partial<OperationTemplate>, userId: number): Promise<OperationTemplate> {
    const now = new Date();

    if (template.id) {
      // Update existing template using Drizzle ORM
      const updateData: Partial<InsertOperationTemplate> = {
        ...(template.code !== undefined && { code: template.code }),
        ...(template.name !== undefined && { name: template.name }),
        description: template.description || null,
        ...(template.operationType !== undefined && { operationType: template.operationType }),
        ...(template.category !== undefined && { category: template.category }),
        operationData: template.operationData || null,
        method: template.method || null,
        position: template.position || null,
        defaultLaborHours: template.defaultLaborHours?.toString() || null,
        defaultHourlyRate: template.defaultHourlyRate?.toString() || null,
        includeInLabor: template.includeInLabor ?? true,
        includeInConsumables: template.includeInConsumables ?? false,
        includeInCoatings: template.includeInCoatings ?? false,
        includeInEquipment: template.includeInEquipment ?? false,
        isCompanyStandard: template.isCompanyStandard ?? false,
        isActive: template.isActive ?? true,
        updatedAt: now
      };

      const result = await db
        .update(operationTemplates)
        .set(updateData)
        .where(eq(operationTemplates.id, template.id))
        .returning();

      return result[0];
    } else {
      // Create new template using Drizzle ORM
      const insertData: Partial<InsertOperationTemplate> = {
        code: template.code!,
        name: template.name!,
        description: template.description || null,
        operationType: template.operationType!,
        category: template.category!,
        operationData: template.operationData || null,
        method: template.method || null,
        position: template.position || null,
        defaultLaborHours: template.defaultLaborHours?.toString() || null,
        defaultHourlyRate: template.defaultHourlyRate?.toString() || null,
        includeInLabor: template.includeInLabor ?? true,
        includeInConsumables: template.includeInConsumables ?? false,
        includeInCoatings: template.includeInCoatings ?? false,
        includeInEquipment: template.includeInEquipment ?? false,
        isCompanyStandard: template.isCompanyStandard ?? false,
        isActive: template.isActive ?? true,
        usageCount: 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      };

      const result = await db
        .insert(operationTemplates)
        .values(insertData as InsertOperationTemplate)
        .returning();

      return result[0];
    }
  }

  // Increment template usage count
  async incrementTemplateUsage(templateId: number): Promise<void> {
    await db
      .update(operationTemplates)
      .set({
        usageCount: sql`${operationTemplates.usageCount} + 1`
      })
      .where(eq(operationTemplates.id, templateId));
  }

  // Delete operation template
  async deleteOperationTemplate(id: number): Promise<void> {
    await db
      .delete(operationTemplates)
      .where(eq(operationTemplates.id, id));
  }

  // Initialize default consumption rates
  async initializeDefaultRates(userId: number): Promise<void> {
    const defaultRates = [
      {
        operation_type: 'cutting',
        method: 'plasma',
        labor_hours_per_unit: 0.5,
        labor_unit: 'meter',
        skill_level: 'intermediate',
        primary_consumable: 'Plasma consumables',
        primary_consumable_rate: 0.1,
        primary_consumable_unit: 'set',
        is_company_default: true
      },
      {
        operation_type: 'cutting',
        method: 'saw',
        labor_hours_per_unit: 0.3,
        labor_unit: 'meter',
        skill_level: 'intermediate',
        primary_consumable: 'Saw blade',
        primary_consumable_rate: 0.05,
        primary_consumable_unit: 'blade',
        is_company_default: true
      },
      {
        operation_type: 'drilling',
        method: 'mag_drill',
        diameter_min: 10,
        diameter_max: 30,
        labor_hours_per_unit: 0.25,
        labor_unit: 'hole',
        skill_level: 'intermediate',
        primary_consumable: 'Drill bit',
        primary_consumable_rate: 0.05,
        primary_consumable_unit: 'bit',
        is_company_default: true
      },
      {
        operation_type: 'welding',
        method: 'MIG',
        labor_hours_per_unit: 1.0,
        labor_unit: 'meter',
        skill_level: 'advanced',
        primary_consumable: 'MIG wire',
        primary_consumable_rate: 0.5,
        primary_consumable_unit: 'kg',
        secondary_consumable: 'Shielding gas',
        secondary_consumable_rate: 0.2,
        secondary_consumable_unit: 'm³',
        is_company_default: true
      },
      {
        operation_type: 'welding',
        method: 'TIG',
        labor_hours_per_unit: 1.5,
        labor_unit: 'meter',
        skill_level: 'expert',
        primary_consumable: 'TIG rod',
        primary_consumable_rate: 0.3,
        primary_consumable_unit: 'kg',
        secondary_consumable: 'Argon gas',
        secondary_consumable_rate: 0.3,
        secondary_consumable_unit: 'm³',
        is_company_default: true
      },
      {
        operation_type: 'blasting',
        method: 'grit',
        labor_hours_per_unit: 0.5,
        labor_unit: 'm²',
        skill_level: 'intermediate',
        primary_consumable: 'Blasting grit',
        primary_consumable_rate: 10,
        primary_consumable_unit: 'kg',
        equipment_cost_per_hour: 50,
        is_company_default: true
      },
      {
        operation_type: 'painting',
        method: 'spray',
        labor_hours_per_unit: 0.75,
        labor_unit: 'm²',
        skill_level: 'intermediate',
        primary_consumable: 'Paint',
        primary_consumable_rate: 0.1,
        primary_consumable_unit: 'L/m²',
        is_company_default: true
      }
    ];

    for (const rate of defaultRates) {
      await this.saveConsumptionRate(rate, userId);
    }
  }

  // Initialize default operation templates
  async initializeDefaultTemplates(userId: number): Promise<void> {
    const defaultTemplates = [
      {
        code: 'CUT_PLASMA_STD',
        name: 'Plasma Cutting - Standard',
        description: 'Standard plasma cutting operation for steel plates',
        operation_type: 'cutting',
        category: 'fabrication',
        method: 'plasma',
        default_labor_hours: 0.5,
        default_hourly_rate: 75,
        include_in_labor: true,
        include_in_consumables: true,
        is_company_standard: true,
        operation_data: {
          kerf_width: 2,
          cut_quality: 'standard'
        }
      },
      {
        code: 'DRILL_MAG_STD',
        name: 'Magnetic Drilling - Standard',
        description: 'Standard magnetic drilling for bolt holes',
        operation_type: 'drilling',
        category: 'fabrication',
        method: 'mag_drill',
        default_labor_hours: 0.25,
        default_hourly_rate: 70,
        include_in_labor: true,
        include_in_consumables: true,
        is_company_standard: true,
        operation_data: {
          drill_type: 'HSS',
          coolant_required: true
        }
      },
      {
        code: 'WELD_MIG_FILLET',
        name: 'MIG Fillet Weld',
        description: 'Standard MIG fillet welding',
        operation_type: 'welding',
        category: 'fabrication',
        method: 'MIG',
        position: '1F',
        default_labor_hours: 1.0,
        default_hourly_rate: 85,
        include_in_labor: true,
        include_in_consumables: true,
        is_company_standard: true,
        operation_data: {
          weld_size: 6,
          passes: 1,
          wire_diameter: 1.2
        }
      },
      {
        code: 'BLAST_SA25',
        name: 'Blast Clean SA 2.5',
        description: 'Grit blast to SA 2.5 surface preparation',
        operation_type: 'blasting',
        category: 'surface',
        method: 'grit',
        default_labor_hours: 0.5,
        default_hourly_rate: 65,
        include_in_labor: true,
        include_in_consumables: true,
        is_company_standard: true,
        operation_data: {
          surface_standard: 'SA 2.5',
          profile: '50-75 microns'
        }
      },
      {
        code: 'PAINT_PRIMER',
        name: 'Apply Primer Coat',
        description: 'Application of primer coat by spray',
        operation_type: 'painting',
        category: 'surface',
        method: 'spray',
        default_labor_hours: 0.75,
        default_hourly_rate: 70,
        include_in_labor: true,
        include_in_coatings: true,
        is_company_standard: true,
        operation_data: {
          coat_type: 'primer',
          dft: 75,
          coverage_rate: 10
        }
      }
    ];

    for (const template of defaultTemplates) {
      await this.saveOperationTemplate(template, userId);
    }
  }
}

// Export singleton instance
export const consumptionRatesService = new ConsumptionRatesService();