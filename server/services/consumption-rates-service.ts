import { db } from "../db";
import { eq, and, or, between, sql } from "drizzle-orm";

// Define the table schemas locally since they're not in shared/schema yet
interface ConsumptionRateSetting {
  id: number;
  operation_type: string;
  method?: string | null;
  material_type?: string | null;
  thickness_min?: number | null;
  thickness_max?: number | null;
  diameter_min?: number | null;
  diameter_max?: number | null;
  labor_hours_per_unit?: number | null;
  labor_unit?: string | null;
  skill_level?: string | null;
  crew_size?: number | null;
  primary_consumable?: string | null;
  primary_consumable_rate?: number | null;
  primary_consumable_unit?: string | null;
  secondary_consumable?: string | null;
  secondary_consumable_rate?: number | null;
  secondary_consumable_unit?: string | null;
  equipment_cost_per_hour?: number | null;
  equipment_utilization?: number | null;
  is_company_default?: boolean | null;
  is_active?: boolean | null;
  created_by?: number | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

interface OperationTemplate {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  operation_type: string;
  category: string;
  operation_data?: any;
  method?: string | null;
  position?: string | null;
  default_labor_hours?: number | null;
  default_hourly_rate?: number | null;
  include_in_labor?: boolean | null;
  include_in_consumables?: boolean | null;
  include_in_coatings?: boolean | null;
  include_in_equipment?: boolean | null;
  is_company_standard?: boolean | null;
  is_active?: boolean | null;
  usage_count?: number | null;
  created_by?: number | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

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
      `operation_type = $1`,
      `is_active = true`
    ];
    const params: any[] = [operationType];
    let paramIndex = 2;

    if (method) {
      conditions.push(`(method = $${paramIndex} OR method IS NULL)`);
      params.push(method);
      paramIndex++;
    }

    if (materialType) {
      conditions.push(`(material_type = $${paramIndex} OR material_type IS NULL)`);
      params.push(materialType);
      paramIndex++;
    }

    if (thickness !== undefined) {
      conditions.push(`(
        (thickness_min IS NULL AND thickness_max IS NULL) OR 
        ($${paramIndex} BETWEEN COALESCE(thickness_min, 0) AND COALESCE(thickness_max, 9999))
      )`);
      params.push(thickness);
      paramIndex++;
    }

    if (diameter !== undefined) {
      conditions.push(`(
        (diameter_min IS NULL AND diameter_max IS NULL) OR 
        ($${paramIndex} BETWEEN COALESCE(diameter_min, 0) AND COALESCE(diameter_max, 9999))
      )`);
      params.push(diameter);
      paramIndex++;
    }

    const query = `
      SELECT * FROM consumption_rate_settings
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE WHEN method IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN material_type IS NOT NULL THEN 0 ELSE 1 END,
        is_company_default DESC
      LIMIT 1
    `;

    const result = await db.execute(sql.raw(query, params));
    return result.rows[0] as ConsumptionRateSetting | null;
  }

  // Create or update consumption rate setting
  async saveConsumptionRate(rate: Partial<ConsumptionRateSetting>, userId: number): Promise<ConsumptionRateSetting> {
    const now = new Date();
    
    if (rate.id) {
      // Update existing
      const updateQuery = `
        UPDATE consumption_rate_settings
        SET 
          operation_type = COALESCE($1, operation_type),
          method = $2,
          material_type = $3,
          thickness_min = $4,
          thickness_max = $5,
          diameter_min = $6,
          diameter_max = $7,
          labor_hours_per_unit = $8,
          labor_unit = $9,
          skill_level = $10,
          crew_size = $11,
          primary_consumable = $12,
          primary_consumable_rate = $13,
          primary_consumable_unit = $14,
          secondary_consumable = $15,
          secondary_consumable_rate = $16,
          secondary_consumable_unit = $17,
          equipment_cost_per_hour = $18,
          equipment_utilization = $19,
          is_company_default = $20,
          is_active = COALESCE($21, is_active),
          updated_at = $22
        WHERE id = $23
        RETURNING *
      `;
      
      const result = await db.execute(sql.raw(updateQuery, [
        rate.operation_type,
        rate.method,
        rate.material_type,
        rate.thickness_min,
        rate.thickness_max,
        rate.diameter_min,
        rate.diameter_max,
        rate.labor_hours_per_unit,
        rate.labor_unit,
        rate.skill_level,
        rate.crew_size,
        rate.primary_consumable,
        rate.primary_consumable_rate,
        rate.primary_consumable_unit,
        rate.secondary_consumable,
        rate.secondary_consumable_rate,
        rate.secondary_consumable_unit,
        rate.equipment_cost_per_hour,
        rate.equipment_utilization,
        rate.is_company_default,
        rate.is_active ?? true,
        now,
        rate.id
      ]));
      
      return result.rows[0] as ConsumptionRateSetting;
    } else {
      // Create new
      const insertQuery = `
        INSERT INTO consumption_rate_settings (
          operation_type, method, material_type,
          thickness_min, thickness_max, diameter_min, diameter_max,
          labor_hours_per_unit, labor_unit, skill_level, crew_size,
          primary_consumable, primary_consumable_rate, primary_consumable_unit,
          secondary_consumable, secondary_consumable_rate, secondary_consumable_unit,
          equipment_cost_per_hour, equipment_utilization,
          is_company_default, is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `;
      
      const result = await db.execute(sql.raw(insertQuery, [
        rate.operation_type,
        rate.method,
        rate.material_type,
        rate.thickness_min,
        rate.thickness_max,
        rate.diameter_min,
        rate.diameter_max,
        rate.labor_hours_per_unit,
        rate.labor_unit,
        rate.skill_level,
        rate.crew_size,
        rate.primary_consumable,
        rate.primary_consumable_rate,
        rate.primary_consumable_unit,
        rate.secondary_consumable,
        rate.secondary_consumable_rate,
        rate.secondary_consumable_unit,
        rate.equipment_cost_per_hour,
        rate.equipment_utilization,
        rate.is_company_default ?? false,
        rate.is_active ?? true,
        userId,
        now,
        now
      ]));
      
      return result.rows[0] as ConsumptionRateSetting;
    }
  }

  // Get all consumption rate settings
  async getAllConsumptionRates(activeOnly: boolean = true): Promise<ConsumptionRateSetting[]> {
    const query = activeOnly
      ? `SELECT * FROM consumption_rate_settings WHERE is_active = true ORDER BY operation_type, method`
      : `SELECT * FROM consumption_rate_settings ORDER BY operation_type, method`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows as ConsumptionRateSetting[];
  }

  // Delete consumption rate setting
  async deleteConsumptionRate(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM consumption_rate_settings WHERE id = ${id}`);
  }

  // Get operation templates
  async getOperationTemplates(
    category?: string,
    operationType?: string,
    activeOnly: boolean = true
  ): Promise<OperationTemplate[]> {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (activeOnly) {
      conditions.push(`is_active = true`);
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (operationType) {
      conditions.push(`operation_type = $${paramIndex}`);
      params.push(operationType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT * FROM operation_templates 
      ${whereClause}
      ORDER BY is_company_standard DESC, usage_count DESC, name
    `;

    const result = await db.execute(sql.raw(query, params));
    return result.rows as OperationTemplate[];
  }

  // Get template by code
  async getTemplateByCode(code: string): Promise<OperationTemplate | null> {
    const result = await db.execute(sql`
      SELECT * FROM operation_templates 
      WHERE code = ${code} AND is_active = true
      LIMIT 1
    `);
    
    return result.rows[0] as OperationTemplate | null;
  }

  // Save operation template
  async saveOperationTemplate(template: Partial<OperationTemplate>, userId: number): Promise<OperationTemplate> {
    const now = new Date();

    if (template.id) {
      // Update existing template
      const updateQuery = `
        UPDATE operation_templates
        SET 
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          description = $3,
          operation_type = COALESCE($4, operation_type),
          category = COALESCE($5, category),
          operation_data = $6,
          method = $7,
          position = $8,
          default_labor_hours = $9,
          default_hourly_rate = $10,
          include_in_labor = $11,
          include_in_consumables = $12,
          include_in_coatings = $13,
          include_in_equipment = $14,
          is_company_standard = $15,
          is_active = $16,
          updated_at = $17
        WHERE id = $18
        RETURNING *
      `;

      const result = await db.execute(sql.raw(updateQuery, [
        template.code,
        template.name,
        template.description,
        template.operation_type,
        template.category,
        JSON.stringify(template.operation_data || {}),
        template.method,
        template.position,
        template.default_labor_hours,
        template.default_hourly_rate,
        template.include_in_labor ?? true,
        template.include_in_consumables ?? false,
        template.include_in_coatings ?? false,
        template.include_in_equipment ?? false,
        template.is_company_standard ?? false,
        template.is_active ?? true,
        now,
        template.id
      ]));

      return result.rows[0] as OperationTemplate;
    } else {
      // Create new template
      const insertQuery = `
        INSERT INTO operation_templates (
          code, name, description, operation_type, category,
          operation_data, method, position,
          default_labor_hours, default_hourly_rate,
          include_in_labor, include_in_consumables, include_in_coatings, include_in_equipment,
          is_company_standard, is_active, usage_count,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;

      const result = await db.execute(sql.raw(insertQuery, [
        template.code,
        template.name,
        template.description,
        template.operation_type,
        template.category,
        JSON.stringify(template.operation_data || {}),
        template.method,
        template.position,
        template.default_labor_hours,
        template.default_hourly_rate,
        template.include_in_labor ?? true,
        template.include_in_consumables ?? false,
        template.include_in_coatings ?? false,
        template.include_in_equipment ?? false,
        template.is_company_standard ?? false,
        template.is_active ?? true,
        0,
        userId,
        now,
        now
      ]));

      return result.rows[0] as OperationTemplate;
    }
  }

  // Increment template usage count
  async incrementTemplateUsage(templateId: number): Promise<void> {
    await db.execute(sql`
      UPDATE operation_templates 
      SET usage_count = usage_count + 1
      WHERE id = ${templateId}
    `);
  }

  // Delete operation template
  async deleteOperationTemplate(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM operation_templates WHERE id = ${id}`);
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