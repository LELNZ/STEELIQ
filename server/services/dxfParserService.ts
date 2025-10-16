/**
 * DXF Parser Service for CAD Drawing Analysis
 * Fortune 50 compliant with comprehensive entity extraction
 */

import DxfParser from 'dxf-parser';
import * as fs from 'fs';
import { validateRealData, auditDataSource } from '../utils/noMockDataPolicy.js';

export interface DXFAnalysisResult {
  success: boolean;
  entities: DXFEntity[];
  layers: DXFLayer[];
  blocks: DXFBlock[];
  metadata: DXFMetadata;
  steelElements: ExtractedSteelElement[];
  processingTime: number;
  warnings: string[];
}

export interface DXFEntity {
  type: string;
  layer: string;
  handle: string;
  ownerHandle?: string;
  lineType?: string;
  visible?: boolean;
  colorIndex?: number;
  color?: number;
  // Geometry specific properties
  vertices?: Array<{ x: number; y: number; z?: number }>;
  startPoint?: { x: number; y: number; z?: number };
  endPoint?: { x: number; y: number; z?: number };
  center?: { x: number; y: number; z?: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
  position?: { x: number; y: number; z?: number };
  height?: number;
  rotation?: number;
}

export interface DXFLayer {
  name: string;
  color: number;
  lineType: string;
  visible: boolean;
  frozen: boolean;
  entities?: DXFEntity[];
}

export interface DXFBlock {
  name: string;
  entities: DXFEntity[];
  position?: { x: number; y: number; z?: number };
}

export interface DXFMetadata {
  acadVersion: string;
  fileSize: number;
  units: string;
  insunits?: number;
  extMin?: { x: number; y: number; z?: number };
  extMax?: { x: number; y: number; z?: number };
  variables: Record<string, any>;
}

export interface ExtractedSteelElement {
  id: string;
  designation: string;
  type: 'beam' | 'column' | 'brace' | 'plate' | 'connection';
  layer: string;
  profile?: string;
  material?: string;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    thickness?: number;
  };
  position: { x: number; y: number; z?: number };
  rotation?: number;
  annotations: string[];
  confidence: number;
}

class DXFParserService {
  private parser: DxfParser;
  
  constructor() {
    this.parser = new DxfParser();
  }
  
  /**
   * Parse DXF file and extract structural steel elements
   */
  async parseDXF(filePath: string): Promise<DXFAnalysisResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Read DXF file
      const dxfString = fs.readFileSync(filePath, 'utf-8');
      
      // Parse DXF
      const dxf = this.parser.parseSync(dxfString);
      
      if (!dxf) {
        throw new Error('Failed to parse DXF file');
      }
      
      console.log(`[DXF] Parsed successfully: ${dxf.entities?.length || 0} entities found`);
      
      // Extract layers
      const layers = this.extractLayers(dxf);
      
      // Extract blocks (reusable components)
      const blocks = this.extractBlocks(dxf);
      
      // Extract entities
      const entities = this.extractEntities(dxf);
      
      // Extract metadata
      const metadata = this.extractMetadata(dxf, dxfString.length);
      
      // Analyze and extract steel elements
      const steelElements = this.extractSteelElements(entities, layers, blocks);
      
      // Add warnings for missing elements
      if (steelElements.length === 0) {
        warnings.push('No structural steel elements detected');
        warnings.push('Check layer naming conventions (BEAM, COLUMN, STEEL, etc.)');
      }
      
      // Audit data source for Fortune 50 compliance
      auditDataSource({
        source: 'DXF_PARSER',
        entityCount: entities.length,
        layerCount: layers.length,
        blockCount: blocks.length,
        steelElementCount: steelElements.length,
        processingTimeMs: Date.now() - startTime
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`[DXF] Analysis complete: ${steelElements.length} steel elements extracted in ${processingTime}ms`);
      
      return {
        success: true,
        entities,
        layers,
        blocks,
        metadata,
        steelElements,
        processingTime,
        warnings
      };
      
    } catch (error) {
      console.error('[DXF] Parsing failed:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        entities: [],
        layers: [],
        blocks: [],
        metadata: {} as DXFMetadata,
        steelElements: [],
        processingTime,
        warnings: ['DXF parsing failed: ' + (error as Error).message]
      };
    }
  }
  
  /**
   * Extract layers from DXF
   */
  private extractLayers(dxf: any): DXFLayer[] {
    const layers: DXFLayer[] = [];
    
    if (dxf.tables && dxf.tables.layer) {
      const layerTable = dxf.tables.layer;
      
      Object.keys(layerTable.layers).forEach(layerName => {
        const layer = layerTable.layers[layerName];
        layers.push({
          name: layerName,
          color: layer.color || 7,
          lineType: layer.lineType || 'CONTINUOUS',
          visible: !layer.hidden,
          frozen: layer.frozen || false
        });
      });
    }
    
    return layers;
  }
  
  /**
   * Extract blocks from DXF
   */
  private extractBlocks(dxf: any): DXFBlock[] {
    const blocks: DXFBlock[] = [];
    
    if (dxf.blocks) {
      Object.keys(dxf.blocks).forEach(blockName => {
        const block = dxf.blocks[blockName];
        
        if (block.entities && block.entities.length > 0) {
          blocks.push({
            name: blockName,
            entities: block.entities.map((e: any) => this.convertEntity(e)),
            position: block.position
          });
        }
      });
    }
    
    return blocks;
  }
  
  /**
   * Extract entities from DXF
   */
  private extractEntities(dxf: any): DXFEntity[] {
    const entities: DXFEntity[] = [];
    
    if (dxf.entities) {
      dxf.entities.forEach((entity: any) => {
        const converted = this.convertEntity(entity);
        if (converted) {
          entities.push(converted);
        }
      });
    }
    
    return entities;
  }
  
  /**
   * Convert raw entity to typed format
   */
  private convertEntity(entity: any): DXFEntity {
    const base: DXFEntity = {
      type: entity.type,
      layer: entity.layer || '0',
      handle: entity.handle,
      ownerHandle: entity.ownerHandle,
      lineType: entity.lineType,
      visible: entity.visible !== false,
      colorIndex: entity.colorIndex,
      color: entity.color
    };
    
    // Add geometry based on entity type
    switch (entity.type) {
      case 'LINE':
        base.startPoint = entity.vertices?.[0];
        base.endPoint = entity.vertices?.[1];
        break;
        
      case 'POLYLINE':
      case 'LWPOLYLINE':
        base.vertices = entity.vertices;
        break;
        
      case 'CIRCLE':
        base.center = entity.center;
        base.radius = entity.radius;
        break;
        
      case 'ARC':
        base.center = entity.center;
        base.radius = entity.radius;
        base.startAngle = entity.startAngle;
        base.endAngle = entity.endAngle;
        break;
        
      case 'TEXT':
      case 'MTEXT':
        base.text = entity.text || entity.string;
        base.position = entity.position;
        base.height = entity.height;
        base.rotation = entity.rotation;
        break;
        
      case 'INSERT':
        base.position = entity.position;
        base.rotation = entity.rotation;
        break;
    }
    
    return base;
  }
  
  /**
   * Extract metadata from DXF
   */
  private extractMetadata(dxf: any, fileSize: number): DXFMetadata {
    const header = dxf.header || {};
    
    return {
      acadVersion: header.$ACADVER || 'Unknown',
      fileSize,
      units: this.getUnitsString(header.$INSUNITS),
      insunits: header.$INSUNITS,
      extMin: header.$EXTMIN,
      extMax: header.$EXTMAX,
      variables: header
    };
  }
  
  /**
   * Get units string from INSUNITS value
   */
  private getUnitsString(insunits?: number): string {
    const units: Record<number, string> = {
      0: 'Unitless',
      1: 'Inches',
      2: 'Feet',
      3: 'Miles',
      4: 'Millimeters',
      5: 'Centimeters',
      6: 'Meters',
      7: 'Kilometers',
      8: 'Microinches',
      9: 'Mils',
      10: 'Yards',
      11: 'Angstroms',
      12: 'Nanometers',
      13: 'Microns',
      14: 'Decimeters',
      15: 'Decameters',
      16: 'Hectometers',
      17: 'Gigameters',
      18: 'Astronomical units',
      19: 'Light years',
      20: 'Parsecs'
    };
    
    return units[insunits || 4] || 'Millimeters'; // Default to mm
  }
  
  /**
   * Extract structural steel elements from entities
   */
  private extractSteelElements(
    entities: DXFEntity[],
    layers: DXFLayer[],
    blocks: DXFBlock[]
  ): ExtractedSteelElement[] {
    const steelElements: ExtractedSteelElement[] = [];
    const steelLayerPatterns = [
      /BEAM/i, /COLUMN/i, /STEEL/i, /STRUCT/i,
      /FRAME/i, /BRACE/i, /GIRT/i, /PURLIN/i,
      /CONNECTION/i, /PLATE/i, /ANGLE/i
    ];
    
    // Find steel-related layers
    const steelLayers = layers.filter(layer => 
      steelLayerPatterns.some(pattern => pattern.test(layer.name))
    );
    
    console.log(`[DXF] Found ${steelLayers.length} steel-related layers`);
    
    // Group entities by proximity to text annotations
    const textEntities = entities.filter(e => e.type === 'TEXT' || e.type === 'MTEXT');
    const geometryEntities = entities.filter(e => 
      ['LINE', 'POLYLINE', 'LWPOLYLINE', 'ARC', 'CIRCLE'].includes(e.type)
    );
    
    // Process geometry entities on steel layers
    geometryEntities.forEach(entity => {
      // Check if entity is on a steel layer
      const isSteel = steelLayers.some(layer => layer.name === entity.layer) ||
                      steelLayerPatterns.some(pattern => pattern.test(entity.layer));
      
      if (isSteel) {
        // Find nearby text annotations
        const nearbyText = this.findNearbyText(entity, textEntities);
        const designation = this.extractDesignation(nearbyText);
        const profile = this.extractProfile(nearbyText);
        
        // Calculate dimensions
        const dimensions = this.calculateDimensions(entity);
        
        // Determine element type
        const elementType = this.determineElementType(entity.layer, nearbyText);
        
        steelElements.push({
          id: `DXF-${entity.handle}`,
          designation: designation || `${elementType.toUpperCase()}-${entity.handle}`,
          type: elementType,
          layer: entity.layer,
          profile,
          material: this.extractMaterial(nearbyText),
          dimensions,
          position: this.getEntityPosition(entity),
          rotation: entity.rotation,
          annotations: nearbyText,
          confidence: designation ? 0.9 : 0.7
        });
      }
    });
    
    // Process block references (INSERT entities)
    entities.filter(e => e.type === 'INSERT').forEach(insert => {
      const blockName = (insert as any).name;
      const block = blocks.find(b => b.name === blockName);
      
      if (block && this.isStructuralBlock(blockName)) {
        steelElements.push({
          id: `BLOCK-${insert.handle}`,
          designation: blockName,
          type: this.getBlockType(blockName),
          layer: insert.layer,
          dimensions: {},
          position: insert.position || { x: 0, y: 0 },
          rotation: insert.rotation,
          annotations: [],
          confidence: 0.8
        });
      }
    });
    
    return steelElements;
  }
  
  /**
   * Find text entities near a geometry entity
   */
  private findNearbyText(entity: DXFEntity, textEntities: DXFEntity[]): string[] {
    const maxDistance = 100; // Units depend on drawing scale
    const position = this.getEntityPosition(entity);
    const nearbyText: string[] = [];
    
    textEntities.forEach(text => {
      if (text.position) {
        const distance = Math.sqrt(
          Math.pow(text.position.x - position.x, 2) +
          Math.pow(text.position.y - position.y, 2)
        );
        
        if (distance < maxDistance && text.text) {
          nearbyText.push(text.text);
        }
      }
    });
    
    return nearbyText;
  }
  
  /**
   * Get entity center position
   */
  private getEntityPosition(entity: DXFEntity): { x: number; y: number; z?: number } {
    if (entity.center) return entity.center;
    if (entity.position) return entity.position;
    if (entity.startPoint && entity.endPoint) {
      return {
        x: (entity.startPoint.x + entity.endPoint.x) / 2,
        y: (entity.startPoint.y + entity.endPoint.y) / 2,
        z: ((entity.startPoint.z || 0) + (entity.endPoint.z || 0)) / 2
      };
    }
    if (entity.vertices && entity.vertices.length > 0) {
      const sumX = entity.vertices.reduce((sum, v) => sum + v.x, 0);
      const sumY = entity.vertices.reduce((sum, v) => sum + v.y, 0);
      return {
        x: sumX / entity.vertices.length,
        y: sumY / entity.vertices.length
      };
    }
    return { x: 0, y: 0 };
  }
  
  /**
   * Extract designation from text annotations
   */
  private extractDesignation(texts: string[]): string | null {
    const designationPattern = /^[A-Z]+\d+/;
    
    for (const text of texts) {
      const match = text.match(designationPattern);
      if (match) return match[0];
    }
    
    return null;
  }
  
  /**
   * Extract profile from text annotations
   */
  private extractProfile(texts: string[]): string | null {
    const profilePatterns = [
      /\d{3}UB\d+(\.\d+)?/i, // Universal Beam
      /\d{3}UC\d+(\.\d+)?/i, // Universal Column
      /\d{3}PFC\d+(\.\d+)?/i, // Parallel Flange Channel
      /\d+x\d+x\d+/i, // Angle/RHS/SHS
      /HSS\d+x\d+x\d+/i, // Hollow Structural Section
      /W\d+x\d+/i, // Wide Flange (US)
    ];
    
    for (const text of texts) {
      for (const pattern of profilePatterns) {
        const match = text.match(pattern);
        if (match) return match[0];
      }
    }
    
    return null;
  }
  
  /**
   * Extract material grade from text annotations
   */
  private extractMaterial(texts: string[]): string | null {
    const materialPatterns = [
      /AS\d{3}/i, // Australian Standard
      /S\d{3}/i, // European Standard
      /A\d{2,3}/i, // ASTM
      /GRADE\s*\d{3}/i
    ];
    
    for (const text of texts) {
      for (const pattern of materialPatterns) {
        const match = text.match(pattern);
        if (match) return match[0].toUpperCase();
      }
    }
    
    return 'AS350'; // Default
  }
  
  /**
   * Calculate dimensions from entity geometry
   */
  private calculateDimensions(entity: DXFEntity): any {
    const dimensions: any = {};
    
    if (entity.startPoint && entity.endPoint) {
      dimensions.length = Math.sqrt(
        Math.pow(entity.endPoint.x - entity.startPoint.x, 2) +
        Math.pow(entity.endPoint.y - entity.startPoint.y, 2) +
        Math.pow((entity.endPoint.z || 0) - (entity.startPoint.z || 0), 2)
      );
    }
    
    if (entity.radius) {
      dimensions.radius = entity.radius;
      dimensions.diameter = entity.radius * 2;
    }
    
    return dimensions;
  }
  
  /**
   * Determine element type from layer name and annotations
   */
  private determineElementType(layer: string, texts: string[]): ExtractedSteelElement['type'] {
    const layerUpper = layer.toUpperCase();
    const textCombined = texts.join(' ').toUpperCase();
    
    if (layerUpper.includes('BEAM') || textCombined.includes('BEAM')) return 'beam';
    if (layerUpper.includes('COLUMN') || textCombined.includes('COLUMN')) return 'column';
    if (layerUpper.includes('BRACE') || textCombined.includes('BRACE')) return 'brace';
    if (layerUpper.includes('PLATE') || textCombined.includes('PLATE')) return 'plate';
    if (layerUpper.includes('CONNECTION') || textCombined.includes('CONNECTION')) return 'connection';
    
    return 'beam'; // Default
  }
  
  /**
   * Check if block name represents a structural element
   */
  private isStructuralBlock(blockName: string): boolean {
    const structuralPatterns = [
      /BEAM/i, /COLUMN/i, /BRACE/i, /CONNECTION/i,
      /BASEPLATE/i, /ENDPLATE/i, /CLEAT/i
    ];
    
    return structuralPatterns.some(pattern => pattern.test(blockName));
  }
  
  /**
   * Get block type from name
   */
  private getBlockType(blockName: string): ExtractedSteelElement['type'] {
    const nameUpper = blockName.toUpperCase();
    
    if (nameUpper.includes('BEAM')) return 'beam';
    if (nameUpper.includes('COLUMN')) return 'column';
    if (nameUpper.includes('BRACE')) return 'brace';
    if (nameUpper.includes('PLATE')) return 'plate';
    
    return 'connection';
  }
  
  /**
   * Convert DXF analysis to text format for AI processing
   */
  convertToText(analysis: DXFAnalysisResult): string {
    let text = '=== DXF DRAWING ANALYSIS ===\n\n';
    
    // Add metadata
    text += `Drawing Information:\n`;
    text += `- CAD Version: ${analysis.metadata.acadVersion}\n`;
    text += `- Units: ${analysis.metadata.units}\n`;
    text += `- Layers: ${analysis.layers.length}\n`;
    text += `- Entities: ${analysis.entities.length}\n\n`;
    
    // Add layer information
    text += `Layers:\n`;
    analysis.layers.forEach(layer => {
      text += `- ${layer.name}\n`;
    });
    text += '\n';
    
    // Add steel elements
    text += `Detected Steel Elements (${analysis.steelElements.length}):\n`;
    analysis.steelElements.forEach(element => {
      text += `\n${element.designation}:\n`;
      text += `  Type: ${element.type}\n`;
      text += `  Layer: ${element.layer}\n`;
      if (element.profile) text += `  Profile: ${element.profile}\n`;
      if (element.material) text += `  Material: ${element.material}\n`;
      if (element.dimensions.length) {
        text += `  Length: ${Math.round(element.dimensions.length)}mm\n`;
      }
      if (element.annotations.length > 0) {
        text += `  Annotations: ${element.annotations.join(', ')}\n`;
      }
      text += `  Confidence: ${Math.round(element.confidence * 100)}%\n`;
    });
    
    return text;
  }
}

export default new DXFParserService();