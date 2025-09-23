import { db } from "./db";
import { eq, and, or, like, sql } from "drizzle-orm";
import { 
  weldingStandards, 
  drillingStandards, 
  cuttingStandards, 
  connectionComponents, 
  blastingStandards, 
  coatingSystems, 
  assemblyTemplates 
} from "@shared/schema";

export async function unifiedOperationLibrary(req: any, res: any) {
  try {
    const { category, type, q, compatibility, show_all, limit = 50, offset = 0 } = req.query;
    
    console.log('Operation library request:', { category, type, q, compatibility, show_all, limit, offset });

    if (!category || !type) {
      return res.status(400).json({ error: "Category and type are required" });
    }

    // Normalize search term
    const searchTerm = q ? `%${String(q).toLowerCase()}%` : null;
    const limitNum = Math.min(parseInt(String(limit)), 100);
    const offsetNum = parseInt(String(offset)) || 0;
    const showAllOptions = show_all === 'true';
    
    // Results array for normalized items
    let results = [];

    // Route to appropriate table based on category and type
    console.log('About to switch on category:', category, typeof category);
    switch (String(category).trim().toLowerCase()) {
      case 'fabrication':
        switch (type) {
          case 'cutting':
            let cuttingQuery = db.select().from(cuttingStandards)
              .where(eq(cuttingStandards.is_active, true));
            
            if (searchTerm) {
              cuttingQuery = cuttingQuery.where(
                or(
                  like(sql`LOWER(${cuttingStandards.name})`, searchTerm),
                  like(sql`LOWER(${cuttingStandards.equipment})`, searchTerm),
                  like(sql`LOWER(${cuttingStandards.description})`, searchTerm)
                )
              );
            }
            
            const cuttingResults = await cuttingQuery
              .limit(limitNum)
              .offset(offsetNum)
              .orderBy(cuttingStandards.thickness_max);
            
            results = cuttingResults.map(item => {
              // Fabrication operations are generally compatible with all sections
              const isCompatible = !compatibility || compatibility === 'ALL' || showAllOptions;
              
              return {
                id: `cutting_standards_${item.id}`,
                source: { table: 'cutting_standards', id: item.id },
                category: 'fabrication',
                type: 'cutting',
                code: item.name,
                name: item.name,
                description: item.description || `${item.material_type} ${item.thickness_min}-${item.thickness_max}mm`,
                unit: 'meter',
                defaults: {
                  laborHours: parseFloat(item.time_per_meter) / 60,
                  method: item.equipment
                },
                dimensions: {
                  thickness_min: parseFloat(item.thickness_min),
                  thickness_max: parseFloat(item.thickness_max)
                },
                compatibility: {
                  sections: ['ALL'],
                  isCompatible,
                  warning: !isCompatible ? 'May need thickness adjustment for this section' : null
                },
                appliesTo: 'single'
              };
            });
            break;
            
          case 'drilling':
            let drillingQuery = db.select().from(drillingStandards)
              .where(eq(drillingStandards.is_active, true));
            
            if (searchTerm) {
              drillingQuery = drillingQuery.where(
                or(
                  like(sql`LOWER(${drillingStandards.name})`, searchTerm),
                  like(sql`LOWER(${drillingStandards.method})`, searchTerm),
                  like(sql`LOWER(${drillingStandards.description})`, searchTerm)
                )
              );
            }
            
            const drillingResults = await drillingQuery
              .limit(limitNum)
              .offset(offsetNum)
              .orderBy(drillingStandards.diameter_max);
            
            results = drillingResults.map(item => {
              const isCompatible = !compatibility || compatibility === 'ALL' || showAllOptions;
              
              return {
                id: `drilling_standards_${item.id}`,
                source: { table: 'drilling_standards', id: item.id },
                category: 'fabrication',
                type: 'drilling',
                code: item.name,
                name: item.name,
                description: item.description || `${item.diameter_min}-${item.diameter_max}mm holes`,
                unit: 'hole',
                defaults: {
                  laborHours: parseFloat(item.time_per_hole) / 60,
                  method: item.method
                },
                dimensions: {
                  diameter_min: parseFloat(item.diameter_min),
                  diameter_max: parseFloat(item.diameter_max)
                },
                compatibility: {
                  sections: ['ALL'],
                  isCompatible,
                  warning: !isCompatible ? 'Verify hole size for this section' : null
                },
                appliesTo: 'single'
              };
            });
            break;
            
          case 'welding':
          case 'weld':
            let weldingQuery = db.select().from(weldingStandards)
              .where(eq(weldingStandards.is_active, true));
            
            if (searchTerm) {
              weldingQuery = weldingQuery.where(
                or(
                  like(sql`LOWER(${weldingStandards.weld_type})`, searchTerm),
                  like(sql`LOWER(${weldingStandards.position})`, searchTerm),
                  like(sql`LOWER(${weldingStandards.description})`, searchTerm)
                )
              );
            }
            
            const weldingResults = await weldingQuery
              .limit(limitNum)
              .offset(offsetNum)
              .orderBy(weldingStandards.size);
            
            results = weldingResults.map(item => {
              const isCompatible = !compatibility || compatibility === 'ALL' || showAllOptions;
              
              return {
                id: `welding_standards_${item.id}`,
                source: { table: 'welding_standards', id: item.id },
                category: 'fabrication',
                type: 'welding',
                code: `${item.weld_type} ${item.size}mm`,
                name: `${item.weld_type} ${item.size}mm - ${item.position}`,
                description: item.description || `Welding standard for ${item.weld_type}`,
                unit: 'meter',
                defaults: {
                  laborHours: parseFloat(item.time_per_meter) / 60,
                  method: item.weld_type,
                  position: item.position,
                  size: item.size
                },
                dimensions: { size: parseFloat(item.size) },
                compatibility: {
                  sections: ['ALL'],
                  isCompatible,
                  warning: !isCompatible ? 'Verify weld size for this section' : null
                },
                appliesTo: 'single'
              };
            });
            break;
        }
        break;
        
        
      case 'surface':
        switch (type) {
          case 'blasting':
            let blastingQuery = db.select().from(blastingStandards)
              .where(eq(blastingStandards.is_active, true));
            
            if (searchTerm) {
              blastingQuery = blastingQuery.where(
                or(
                  like(sql`LOWER(${blastingStandards.name})`, searchTerm),
                  like(sql`LOWER(${blastingStandards.surface_profile})`, searchTerm),
                  like(sql`LOWER(${blastingStandards.grit_type})`, searchTerm)
                )
              );
            }
            
            const blastingResults = await blastingQuery
              .limit(limitNum)
              .offset(offsetNum)
              .orderBy(blastingStandards.surface_profile);
            
            results = blastingResults.map(item => {
              const isCompatible = !compatibility || compatibility === 'ALL' || showAllOptions;
              
              return {
                id: `blasting_standards_${item.id}`,
                source: { table: 'blasting_standards', id: item.id },
                category: 'surface',
                type: 'blasting',
                code: item.surface_profile,
                name: item.name,
                description: `${item.surface_profile} - ${item.grit_type}`,
                unit: 'm²',
                defaults: {
                  laborHours: parseFloat(item.labor_hours_per_m2),
                  coverageRate: parseFloat(item.coverage_rate_m2_per_hour),
                  consumptionRate: parseFloat(item.consumption_kg_per_m2),
                  preparationType: item.preparation_type
                },
                dimensions: {},
                compatibility: {
                  sections: ['ALL'],
                  isCompatible,
                  warning: !isCompatible ? 'Surface preparation may vary by section' : null
                },
                tags: [item.surface_cleanliness, item.equipment].filter(Boolean),
                appliesTo: 'single'
              };
            });
            break;
            
          case 'painting':
          case 'priming':
          case 'galvanizing':
          case 'powder_coating':
            let coatingQuery = db.select().from(coatingSystems)
              .where(and(
                eq(coatingSystems.isActive, true),
                like(coatingSystems.coatingType, `%${type === 'priming' ? 'primer' : type}%`)
              ));
            
            if (searchTerm) {
              coatingQuery = coatingQuery.where(
                or(
                  like(sql`LOWER(${coatingSystems.name})`, searchTerm),
                  like(sql`LOWER(${coatingSystems.description})`, searchTerm),
                  like(sql`LOWER(${coatingSystems.applicationMethod})`, searchTerm)
                )
              );
            }
            
            const coatingResults = await coatingQuery
              .limit(limitNum)
              .offset(offsetNum)
              .orderBy(coatingSystems.name);
            
            results = coatingResults.map(item => {
              const isCompatible = !compatibility || compatibility === 'ALL' || showAllOptions;
              
              return {
                id: `coating_systems_${item.id}`,
                source: { table: 'coating_systems', id: item.id },
                category: 'surface',
                type: String(type),
                code: `COAT_${item.id}`,
                name: item.name,
                description: item.description || `${item.coatingType} coating`,
                unit: item.pricingMethod === 'per_sqm' ? 'm²' : item.pricingMethod === 'per_kg' ? 'kg' : 'piece',
                pricingMethod: item.pricingMethod,
                defaults: {
                  unitCost: parseFloat(item.pricePerUnit) || 0,
                  coverageRate: parseFloat(item.coverageRate) || 0,
                  coatsRequired: item.coatsRequired || 1,
                  preparationRequired: item.preparationRequired,
                  dryingTime: item.dryingTime,
                  applicationMethod: item.applicationMethod,
                  preparationMethods: item.preparationMethods || [],
                  coverageAdjustmentFactors: item.coverageAdjustmentFactors || {},
                  applicationMethodFactors: item.applicationMethodFactors || {}
                },
                dimensions: {},
                compatibility: {
                  sections: ['ALL'],
                  isCompatible,
                  warning: !isCompatible ? 'Coating application may vary by section' : null
                },
                tags: [item.applicationMethod, item.preparationRequired].filter(Boolean),
                appliesTo: 'single'
              };
            });
            break;
        }
        break;
        
      case 'connection': {
        // For connections, we use assembly templates that match the connection types
        console.log('Processing connection category - type:', type, 'searchTerm:', searchTerm);
        
        let whereConditions = [eq(assemblyTemplates.is_active, true)];
        
        // Filter by connection type using code pattern or name matching
        if (type && type !== 'any') {
          const typeMapping: Record<string, string[]> = {
            'stiffener': ['STIFF'],
            'endplate': ['ENDPL', 'END-PLATE'],
            'baseplate': ['BASEP', 'BASE-PLATE'],
            'cleat': ['CLEAT', 'ANGLE'],
            'gusset': ['GUSST', 'GUSSET'],
            'bracket': ['BRACK', 'BRACKET'],
            'bolt': ['BOLT'],
            'weld': ['WELD']
          };
          
          const patterns = typeMapping[type];
          console.log('Type patterns:', patterns);
          
          if (patterns && patterns.length > 0) {
            const patternConditions = patterns.map(pattern => 
              like(sql`UPPER(${assemblyTemplates.code})`, `${pattern}%`)
            );
            whereConditions.push(or(...patternConditions)!);
          }
        }
        
        let connectionQuery = db.select().from(assemblyTemplates)
          .where(and(...whereConditions));
        
        if (searchTerm) {
          connectionQuery = connectionQuery.where(
            or(
              like(sql`LOWER(${assemblyTemplates.code})`, searchTerm),
              like(sql`LOWER(${assemblyTemplates.name})`, searchTerm),
              like(sql`LOWER(${assemblyTemplates.description})`, searchTerm)
            )
          );
        }
        
        const connectionResults = await connectionQuery
          .limit(limitNum)
          .offset(offsetNum)
          .orderBy(assemblyTemplates.code);
        
        results = connectionResults.map(item => {
          const components = item.components || [];
          const isCompatible = !compatibility || 
            compatibility === 'ALL' || 
            !item.main_material || 
            item.main_material === compatibility ||
            showAllOptions;
          
          // Build preview summary for connection templates
          const componentSummary = components.length > 0 
            ? components.map((c: any) => `${c.quantity}x ${c.type}`).join(', ')
            : 'No components defined';
          
          return {
            id: `connection_template_${item.id}`,
            source: { table: 'assembly_templates', id: item.id },
            category: 'connection',
            type: item.connection_type || type,
            code: item.code,
            name: item.name,
            description: item.description || `Connection template: ${componentSummary}`,
            unit: 'connection',
            defaults: {
              totalLaborHours: components.reduce((acc: number, c: any) => 
                acc + (c.laborHours || 0) * (c.quantity || 1), 0),
              totalCost: components.reduce((acc: number, c: any) => 
                acc + (c.unitCost || 0) * (c.quantity || 1), 0)
            },
            dimensions: {
              componentCount: components.length
            },
            compatibility: { 
              sections: item.main_material ? [item.main_material] : ['ALL'], 
              isCompatible,
              warning: !isCompatible ? `Template designed for ${item.main_material} sections` : null
            },
            appliesTo: 'composite',
            components,
            preview: {
              summary: componentSummary,
              operationCount: components.length,
              estimatedTime: components.reduce((acc: number, c: any) => 
                acc + (c.laborHours || 0) * (c.quantity || 1), 0)
            }
          };
        });
        break;
      }
        
      case 'assembly': {
        let assemblyQuery = db.select().from(assemblyTemplates)
          .where(eq(assemblyTemplates.is_active, true));
        
        if (searchTerm) {
          assemblyQuery = assemblyQuery.where(
            or(
              like(sql`LOWER(${assemblyTemplates.code})`, searchTerm),
              like(sql`LOWER(${assemblyTemplates.name})`, searchTerm),
              like(sql`LOWER(${assemblyTemplates.description})`, searchTerm)
            )
          );
        }
        
        const assemblyResults = await assemblyQuery
          .limit(limitNum)
          .offset(offsetNum)
          .orderBy(assemblyTemplates.code);
        
        results = assemblyResults.map(item => {
          const components = item.components || [];
          const isCompatible = !compatibility || 
            compatibility === 'ALL' || 
            !item.main_material || 
            item.main_material === compatibility ||
            showAllOptions;
          
          // Build preview summary for assembly templates
          const componentSummary = components.length > 0 
            ? components.map((c: any) => `${c.quantity}x ${c.type}`).join(', ')
            : 'No components defined';
          
          return {
            id: `assembly_templates_${item.id}`,
            source: { table: 'assembly_templates', id: item.id },
            category: 'assembly',
            type: 'template',
            code: item.code,
            name: item.name,
            description: item.description || `Assembly template: ${componentSummary}`,
            unit: 'assembly',
            defaults: {
              totalLaborHours: components.reduce((acc: number, c: any) => 
                acc + (c.laborHours || 0) * (c.quantity || 1), 0),
              totalCost: components.reduce((acc: number, c: any) => 
                acc + (c.unitCost || 0) * (c.quantity || 1), 0)
            },
            dimensions: {
              componentCount: components.length
            },
            compatibility: { 
              sections: item.main_material ? [item.main_material] : ['ALL'], 
              isCompatible,
              warning: !isCompatible ? `Template designed for ${item.main_material} sections` : null
            },
            appliesTo: 'composite',
            components,
            preview: {
              summary: componentSummary,
              operationCount: components.length,
              estimatedTime: components.reduce((acc: number, c: any) => 
                acc + (c.laborHours || 0) * (c.quantity || 1), 0)
            }
          };
        });
        break;
      }
        
      case 'handling':
        // Handling operations are typically custom or project-specific
        // Return empty for now until we have handling standards table
        results = [];
        break;
        
      default:
        return res.status(400).json({ error: `Unknown category: ${category}` });
    }

    res.json({
      items: results,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: results.length
      }
    });
    
  } catch (error) {
    console.error("Error in operation library:", error);
    res.status(500).json({ error: "Failed to fetch operation library items" });
  }
}

export function getOperationTypes(req: any, res: any) {
  const { category } = req.query;
  
  const typeMap: Record<string, string[]> = {
    fabrication: ['cutting', 'drilling', 'welding', 'grinding', 'coping', 'notching', 'punching'],
    connection: ['stiffener', 'endplate', 'baseplate', 'cleat', 'gusset', 'bracket', 'bolt', 'weld'],
    surface: ['blasting', 'painting', 'priming', 'galvanizing', 'powder_coating', 'wire_brush', 'wipe_down'],
    assembly: ['column_connection', 'beam_connection', 'bracing_connection', 'template']
  };
  
  res.json(typeMap[String(category)] || []);
}

export async function expandAssemblyTemplate(req: any, res: any) {
  try {
    const id = parseInt(req.params.id);
    
    const [template] = await db.select()
      .from(assemblyTemplates)
      .where(eq(assemblyTemplates.id, id));
    
    if (!template) {
      return res.status(404).json({ error: "Assembly template not found" });
    }
    
    const operations = [];
    const components = template.components as any[] || [];
    
    // Expand each component into an operation
    for (const comp of components) {
      if (comp.type && comp.quantity) {
        // Try to find matching library component
        let libraryItem = null;
        if (['stiffener', 'endplate', 'baseplate', 'cleat'].includes(comp.type)) {
          const [dbComp] = await db.select()
            .from(connectionComponents)
            .where(and(
              eq(connectionComponents.component_type, comp.type),
              eq(connectionComponents.is_active, true)
            ))
            .limit(1);
          
          if (dbComp) {
            libraryItem = dbComp;
          }
        }
        
        operations.push({
          category: comp.category || 'connection',
          type: comp.type,
          description: comp.description || `${comp.type} from ${template.name}`,
          quantity: comp.quantity,
          unit: comp.unit || 'each',
          defaults: libraryItem ? {
            laborHours: libraryItem.labor_time ? parseFloat(libraryItem.labor_time) / 60 : 0,
            unitCost: parseFloat(libraryItem.material_cost) || 0
          } : {},
          sourceType: 'assembly_template',
          sourceId: template.id
        });
      }
    }
    
    res.json({
      template: {
        id: template.id,
        code: template.code,
        name: template.name,
        description: template.description
      },
      operations
    });
    
  } catch (error) {
    console.error("Error expanding assembly template:", error);
    res.status(500).json({ error: "Failed to expand assembly template" });
  }
}