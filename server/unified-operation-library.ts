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

    if (!category || !type) {
      return res.status(400).json({ error: "Category and type are required" });
    }

    // Normalize search term
    const searchTerm = q ? `%${String(q).toLowerCase()}%` : null;
    const limitNum = Math.min(parseInt(String(limit)), 100);
    const offsetNum = parseInt(String(offset)) || 0;
    
    // Results array for normalized items
    let results = [];

    // Route to appropriate table based on category and type
    switch (category) {
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
            
            results = cuttingResults.map(item => ({
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
              compatibility: { sections: ['ALL'], isCompatible: true },
              appliesTo: 'single'
            }));
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
            
            results = drillingResults.map(item => ({
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
              compatibility: { sections: ['ALL'], isCompatible: true },
              appliesTo: 'single'
            }));
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
            
            results = weldingResults.map(item => ({
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
              compatibility: { sections: ['ALL'], isCompatible: true },
              appliesTo: 'single'
            }));
            break;
        }
        break;
        
      case 'connection':
        let connectionQuery = db.select().from(connectionComponents)
          .where(and(
            eq(connectionComponents.is_active, true),
            eq(connectionComponents.component_type, String(type))
          ));
        
        // Handle compatibility filtering
        if (compatibility && compatibility !== 'ALL' && show_all !== 'true') {
          connectionQuery = connectionQuery.where(
            or(
              like(connectionComponents.section_compatibility, `%${compatibility}%`),
              eq(connectionComponents.section_compatibility, 'ALL'),
              eq(connectionComponents.section_compatibility, 'All Sections')
            )
          );
        }
        
        if (searchTerm) {
          connectionQuery = connectionQuery.where(
            or(
              like(sql`LOWER(${connectionComponents.name})`, searchTerm),
              like(sql`LOWER(${connectionComponents.code})`, searchTerm)
            )
          );
        }
        
        const connectionResults = await connectionQuery
          .limit(limitNum)
          .offset(offsetNum)
          .orderBy(connectionComponents.name);
        
        results = connectionResults.map(item => {
          const isCompatible = !compatibility || 
            compatibility === 'ALL' || 
            item.section_compatibility === 'ALL' ||
            item.section_compatibility === 'All Sections' ||
            item.section_compatibility.includes(String(compatibility));
          
          return {
            id: `connection_components_${item.id}`,
            source: { table: 'connection_components', id: item.id },
            category: 'connection',
            type: String(type),
            code: item.code || `${item.component_type}_${item.id}`,
            name: item.name,
            description: `${item.height}×${item.width}×${item.thickness}mm`,
            unit: item.unit || 'each',
            defaults: {
              laborHours: item.labor_time ? parseFloat(item.labor_time) / 60 : 0,
              unitCost: parseFloat(item.material_cost) || 0,
              weldTime: item.weld_time_per_hour ? parseFloat(item.weld_time_per_hour) : null
            },
            dimensions: {
              height: parseFloat(item.height),
              width: parseFloat(item.width),
              thickness: parseFloat(item.thickness),
              holes: item.holes,
              weight: parseFloat(item.weight),
              surface_area: parseFloat(item.surface_area)
            },
            compatibility: {
              sections: item.section_compatibility.split(',').map(s => s.trim()),
              isCompatible,
              warning: !isCompatible ? 'May require adjustment for this section' : null
            },
            appliesTo: 'single'
          };
        });
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
            
            results = blastingResults.map(item => ({
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
              compatibility: { sections: ['ALL'], isCompatible: true },
              tags: [item.surface_cleanliness, item.equipment].filter(Boolean),
              appliesTo: 'single'
            }));
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
            
            results = coatingResults.map(item => ({
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
              compatibility: { sections: ['ALL'], isCompatible: true },
              tags: [item.applicationMethod, item.preparationRequired].filter(Boolean),
              appliesTo: 'single'
            }));
            break;
        }
        break;
        
      case 'assembly':
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
        
        results = assemblyResults.map(item => ({
          id: `assembly_templates_${item.id}`,
          source: { table: 'assembly_templates', id: item.id },
          category: 'assembly',
          type: 'template',
          code: item.code,
          name: item.name,
          description: item.description || 'Assembly template',
          unit: 'assembly',
          defaults: {},
          dimensions: {},
          compatibility: { 
            sections: item.main_material ? [item.main_material] : ['ALL'], 
            isCompatible: true 
          },
          appliesTo: 'composite',
          components: item.components || []
        }));
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