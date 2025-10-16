/**
 * V4.2 AUTO Response Transformer
 * Converts V4.2 AUTO format to our simplified MTO format for Phase 1
 */

import { MaterialTakeOffItem, MaterialTakeOffOperation } from './aiEstimationService';
import { V42AutoResponse } from '../prompts/v42AutoPrompt';

export class V42ResponseTransformer {
  /**
   * Transform V4.2 AUTO response to our MTO format
   */
  static transformToMTO(v42Response: V42AutoResponse): MaterialTakeOffItem[] {
    const mtoItems: MaterialTakeOffItem[] = [];
    
    if (!v42Response.elements || !Array.isArray(v42Response.elements)) {
      console.warn('No elements found in V4.2 response');
      return [];
    }
    
    for (const element of v42Response.elements) {
      // Map element type
      const type = this.mapElementType(element.element_type);
      
      // Build MTO item
      const mtoItem: MaterialTakeOffItem = {
        id: element.global_id || `EL-${Date.now()}-${Math.random()}`,
        designation: element.designation || 'UNDESIGNATED',
        type,
        description: this.buildDescription(element),
        material: element.section?.grade || 'AS350',
        dimensions: {
          length: element.geometry?.length_mm || 0,
          weight: element.takeoff?.mass_kg || 0,
        },
        quantity: element.quantity || element.takeoff?.quantity || 1, // Extract quantity from V4.2 response
        childItems: this.extractChildOperations(element),
        location: this.buildLocation(element),
        drawingReference: this.buildDrawingReference(element),
        confidence: element.confidence || 0.7,
        evidence: this.buildEvidence(element)
      };
      
      mtoItems.push(mtoItem);
    }
    
    // Also process assemblies (like handrails)
    if (v42Response.assemblies && Array.isArray(v42Response.assemblies)) {
      for (const assembly of v42Response.assemblies) {
        const assemblyItem = this.transformAssembly(assembly);
        if (assemblyItem) {
          mtoItems.push(assemblyItem);
        }
      }
    }
    
    return mtoItems;
  }
  
  /**
   * Map V4.2 element types to our simplified types
   */
  private static mapElementType(v42Type: string): MaterialTakeOffItem['type'] {
    const typeMap: Record<string, MaterialTakeOffItem['type']> = {
      'BEAM': 'beam',
      'COLUMN': 'column',
      'PLATE': 'plate',
      'BASE_PLATE': 'plate',
      'GUSSET': 'plate',
      'CLEAT': 'angle',
      'BRACING': 'angle',
      'PURLIN': 'channel',
      'GIRT': 'channel',
      'STIFFENER': 'plate'
    };
    
    return typeMap[v42Type] || 'other';
  }
  
  /**
   * Build description from V4.2 element
   */
  private static buildDescription(element: any): string {
    const parts = [];
    
    if (element.section?.catalog) {
      parts.push(element.section.catalog);
    }
    if (element.section?.size) {
      parts.push(element.section.size);
    }
    if (element.element_type) {
      parts.push(`(${element.element_type})`);
    }
    
    return parts.join(' ') || 'Steel element';
  }
  
  /**
   * Build location string from V4.2 element
   */
  private static buildLocation(element: any): string {
    const location = element.location;
    if (!location) return '';
    
    const parts = [];
    if (location.grid_start && location.grid_end) {
      parts.push(`Grid ${location.grid_start}-${location.grid_end}`);
    } else if (location.grid_start) {
      parts.push(`Grid ${location.grid_start}`);
    }
    
    if (location.level) {
      parts.push(`Level ${location.level}`);
    }
    
    return parts.join(', ');
  }
  
  /**
   * Build drawing reference from V4.2 element
   */
  private static buildDrawingReference(element: any): string {
    if (element.source_instances && element.source_instances.length > 0) {
      const source = element.source_instances[0];
      if (source.drawing_no) {
        return `Drawing ${source.drawing_no}`;
      }
      if (source.page) {
        return `Page ${source.page}`;
      }
    }
    
    if (element.evidence && element.evidence.length > 0) {
      const evidence = element.evidence[0];
      if (evidence.page) {
        return `Page ${evidence.page}`;
      }
    }
    
    return 'See drawings';
  }
  
  /**
   * Build evidence object for audit trail
   */
  private static buildEvidence(element: any): MaterialTakeOffItem['evidence'] {
    const evidence = element.evidence?.[0];
    
    if (evidence) {
      return {
        fileId: evidence.file_id || 'current.pdf',
        page: evidence.page || 1,
        bbox: evidence.bbox,
        extractionMethod: evidence.extraction_method || 'UNSPECIFIED'
      };
    }
    
    // Default evidence if not provided
    return {
      fileId: 'current.pdf',
      page: 1,
      extractionMethod: 'TEXT'
    };
  }
  
  /**
   * Extract child operations from connections
   */
  private static extractChildOperations(element: any): MaterialTakeOffOperation[] {
    const operations: MaterialTakeOffOperation[] = [];
    
    if (!element.connections || !Array.isArray(element.connections)) {
      return operations;
    }
    
    let opIndex = 1;
    
    for (const connection of element.connections) {
      const operation: MaterialTakeOffOperation = {
        id: `OP-${element.designation || 'X'}-${opIndex}`,
        parentDesignation: element.designation || '',
        operationId: `4.${opIndex}`,
        type: this.mapConnectionType(connection.type),
        description: connection.description || `${connection.type} connection`,
        specifications: this.extractSpecifications(connection),
        quantity: connection.quantity || 1,
        laborHours: this.estimateLaborHours(connection)
      };
      
      operations.push(operation);
      opIndex++;
    }
    
    return operations;
  }
  
  /**
   * Map connection types
   */
  private static mapConnectionType(connType: string): MaterialTakeOffOperation['type'] {
    const typeMap: Record<string, MaterialTakeOffOperation['type']> = {
      'END_PLATE': 'endplate',
      'STIFFENER': 'stiffener',
      'CLEAT': 'cleat',
      'BASE_PLATE': 'baseplate',
      'WELD': 'welding',
      'BOLT_SET': 'drilling'
    };
    
    return typeMap[connType] || 'cutting';
  }
  
  /**
   * Extract specifications from connection
   */
  private static extractSpecifications(connection: any): any {
    const specs: any = {};
    
    if (connection.bolt_pattern) {
      specs.holes = {
        diameter: connection.bolt_dia_mm || 20,
        count: connection.bolt_count || 4,
        pattern: connection.bolt_pattern || '2x2'
      };
    }
    
    if (connection.weld_size_mm) {
      specs.weldType = connection.weld_type || 'fillet';
      specs.weldSize = connection.weld_size_mm;
    }
    
    if (connection.plate_thickness_mm) {
      specs.plateThickness = connection.plate_thickness_mm;
    }
    
    if (connection.plate_dims) {
      specs.plateDimensions = {
        width: connection.plate_dims.width_mm,
        height: connection.plate_dims.height_mm
      };
    }
    
    return specs;
  }
  
  /**
   * Estimate labor hours for connection
   */
  private static estimateLaborHours(connection: any): number {
    // Simple estimation based on connection type
    const hourMap: Record<string, number> = {
      'END_PLATE': 2.0,
      'STIFFENER': 1.0,
      'CLEAT': 1.5,
      'BASE_PLATE': 2.5,
      'WELD': 1.0,
      'BOLT_SET': 0.5
    };
    
    return hourMap[connection.type] || 1.0;
  }
  
  /**
   * Transform assembly (like handrails) to MTO item
   */
  private static transformAssembly(assembly: any): MaterialTakeOffItem | null {
    if (!assembly) return null;
    
    return {
      id: assembly.assembly_id || `ASM-${Date.now()}`,
      designation: assembly.designation || 'HR-1',
      type: 'other',
      description: `${assembly.type || 'Assembly'} - ${assembly.description || ''}`,
      material: assembly.material || 'AS350',
      dimensions: {
        length: assembly.path_length_mm || 0,
        height: assembly.design_height_mm || 0,
        weight: assembly.mass_kg || 0
      },
      quantity: 1,
      childItems: this.extractAssemblyComponents(assembly),
      location: assembly.location || '',
      drawingReference: assembly.drawing_ref || '',
      confidence: assembly.confidence || 0.8,
      evidence: {
        fileId: 'current.pdf',
        page: assembly.page || 1,
        extractionMethod: 'TEXT'
      }
    };
  }
  
  /**
   * Extract assembly components as child operations
   */
  private static extractAssemblyComponents(assembly: any): MaterialTakeOffOperation[] {
    const operations: MaterialTakeOffOperation[] = [];
    
    if (assembly.components) {
      let opIndex = 1;
      
      for (const component of assembly.components) {
        operations.push({
          id: `OP-${assembly.designation || 'ASM'}-${opIndex}`,
          parentDesignation: assembly.designation || '',
          operationId: `5.${opIndex}`,
          type: 'cutting',
          description: component.description || 'Component',
          specifications: component.specifications || {},
          quantity: component.quantity || 1,
          laborHours: 1.0
        });
        opIndex++;
      }
    }
    
    return operations;
  }
  
  /**
   * Extract auto-config from V4.2 response
   */
  static extractAutoConfig(v42Response: V42AutoResponse): any {
    const autoConfig = v42Response.auto_config;
    
    if (!autoConfig) {
      return {
        regionCodeSet: 'AS/NZS',
        unitsDefault: 'mm',
        weldStandard: 'AS/NZS 1554',
        boltStandard: 'AS/NZS 1252',
        excludedPhrases: []
      };
    }
    
    return {
      regionCodeSet: autoConfig.region_code_set,
      unitsDefault: autoConfig.units_default,
      weldStandard: autoConfig.weld_standard,
      boltStandard: autoConfig.bolt_standard,
      excludedPhrases: autoConfig.excluded_by_notes_phrases || []
    };
  }
  
  /**
   * Extract pattern pack from V4.2 response
   */
  static extractPatternPack(v42Response: V42AutoResponse): any {
    if (!v42Response.pattern_pack_proposed) {
      return null;
    }
    
    return {
      version: v42Response.pattern_pack_proposed.version || 'V4.2',
      checksum: v42Response.pattern_pack_proposed.checksum,
      patterns: {
        legend_aliases: v42Response.pattern_pack_proposed.legend_aliases,
        hole_policy: v42Response.pattern_pack_proposed.hole_policy_extracted,
        bolt_grades: v42Response.pattern_pack_proposed.bolt_grade_policy,
        weld_symbols: v42Response.pattern_pack_proposed.weld_symbol_family,
        excluded_phrases: v42Response.pattern_pack_proposed.excluded_by_notes_phrases,
        style_features: v42Response.pattern_pack_proposed.style_features
      },
      confidence_thresholds: {
        high: 85,
        medium: 50,
        low: 25
      },
      measurement_guardrails: v42Response.pattern_pack_proposed.measurement_guardrails
    };
  }
  
  /**
   * Calculate summary from V4.2 response
   */
  static calculateSummary(v42Response: V42AutoResponse): any {
    let totalWeight = 0;
    let totalLength = 0;
    const steelGrades: { [grade: string]: number } = {};
    const itemCounts: { [type: string]: number } = {};
    let estimatedHours = 0;
    
    // Process elements
    for (const element of v42Response.elements || []) {
      const weight = element.takeoff?.mass_kg || 0;
      const length = element.geometry?.length_mm || 0;
      
      totalWeight += weight;
      totalLength += length;
      
      // Track steel grades
      const grade = element.section?.grade || 'AS350';
      steelGrades[grade] = (steelGrades[grade] || 0) + weight;
      
      // Track item types
      const type = element.element_type;
      itemCounts[type] = (itemCounts[type] || 0) + 1;
      
      // Estimate hours (simplified)
      estimatedHours += 2; // Base fabrication
      estimatedHours += (element.connections?.length || 0) * 0.5; // Connection work
    }
    
    // Process assemblies
    for (const assembly of v42Response.assemblies || []) {
      const weight = assembly.mass_kg || 0;
      totalWeight += weight;
      itemCounts['ASSEMBLY'] = (itemCounts['ASSEMBLY'] || 0) + 1;
      estimatedHours += 5; // Assembly work
    }
    
    return {
      totalWeight: Math.round(totalWeight),
      totalLength: Math.round(totalLength),
      steelGrade: steelGrades,
      itemCounts,
      estimatedFabricationHours: Math.round(estimatedHours),
      estimatedCost: {
        materials: Math.round(totalWeight * 2.5), // $2.50/kg
        labor: Math.round(estimatedHours * 85), // $85/hour
        coating: Math.round(totalWeight * 0.5), // $0.50/kg
        total: 0
      }
    };
  }
}