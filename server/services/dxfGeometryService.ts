import { db } from '../db';
import { aiMtoGeometries, aiMtoFeatures } from '../../shared/schema';
import { Decimal } from 'decimal.js';
import * as fs from 'fs';
import * as path from 'path';
import DxfParser from 'dxf-parser';
import { eq } from 'drizzle-orm';

// Set precision for all Decimal operations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

interface Point2D {
  x: number;
  y: number;
}

interface Point3D extends Point2D {
  z: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

interface GeometryFeature {
  type: 'hole' | 'fold_line' | 'notch' | 'cutout' | 'angle' | 'bend';
  profile?: Point3D[];
  diameter?: number;
  length?: number;
  width?: number;
  height?: number;
  orientation?: number;
  parentFeatureId?: number;
}

interface ParsedGeometry {
  type: string;
  layer: string;
  bbox: BoundingBox;
  centroid: Point3D;
  area?: number;
  perimeter?: number;
  thickness?: number;
  angle?: number;
  features: GeometryFeature[];
  rawData: any;
}

export class DxfGeometryService {
  private parser: DxfParser;
  private readonly TOLERANCE = 0.005; // ±0.005mm tolerance
  
  constructor() {
    this.parser = new DxfParser();
  }

  // Convert any unit to millimeters with 0.01mm precision
  private toMillimeters(value: number, unit: string = 'mm'): Decimal {
    const conversions: Record<string, number> = {
      'mm': 1,
      'cm': 10,
      'm': 1000,
      'in': 25.4,
      'ft': 304.8
    };
    
    const multiplier = conversions[unit.toLowerCase()] || 1;
    return new Decimal(value).mul(multiplier).toDP(4);
  }

  // Parse DXF file and extract all geometries
  async parseDxfFile(filePath: string, fileId: number): Promise<ParsedGeometry[]> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const dxf = this.parser.parseSync(fileContent);
    
    if (!dxf || !dxf.entities) {
      throw new Error('Invalid DXF file or no entities found');
    }

    const geometries: ParsedGeometry[] = [];
    
    // Process each entity
    for (const entity of dxf.entities) {
      const geometry = await this.processEntity(entity, dxf);
      if (geometry) {
        geometries.push(geometry);
      }
    }

    // Detect relationships and nested features
    this.detectNestedFeatures(geometries);
    
    return geometries;
  }

  // Process individual DXF entity
  private async processEntity(entity: any, dxf: any): Promise<ParsedGeometry | null> {
    const geometry: ParsedGeometry = {
      type: entity.type,
      layer: entity.layer || 'default',
      bbox: this.calculateBoundingBox(entity),
      centroid: this.calculateCentroid(entity),
      features: [],
      rawData: entity
    };

    switch (entity.type.toUpperCase()) {
      case 'CIRCLE':
        geometry.area = Math.PI * Math.pow(entity.radius, 2);
        geometry.perimeter = 2 * Math.PI * entity.radius;
        
        // A circle could be a hole
        if (this.isHole(entity, dxf)) {
          geometry.features.push({
            type: 'hole',
            diameter: entity.radius * 2,
            profile: [{ x: entity.center.x, y: entity.center.y, z: entity.center.z || 0 }]
          });
        }
        break;

      case 'ARC':
        const arcLength = entity.radius * Math.abs(entity.endAngle - entity.startAngle);
        geometry.perimeter = arcLength;
        geometry.angle = Math.abs(entity.endAngle - entity.startAngle) * (180 / Math.PI);
        
        // An arc could represent a bend or angle
        if (this.isBendLine(entity, dxf)) {
          geometry.features.push({
            type: 'bend',
            length: arcLength,
            orientation: entity.startAngle * (180 / Math.PI)
          });
        }
        break;

      case 'LINE':
        geometry.perimeter = this.calculateLineLength(entity.vertices[0], entity.vertices[1]);
        
        // Check if line represents a fold
        if (this.isFoldLine(entity, dxf)) {
          geometry.features.push({
            type: 'fold_line',
            length: geometry.perimeter,
            orientation: this.calculateLineAngle(entity.vertices[0], entity.vertices[1])
          });
        }
        break;

      case 'LWPOLYLINE':
      case 'POLYLINE':
        const { area, perimeter } = this.calculatePolylineMetrics(entity);
        geometry.area = area;
        geometry.perimeter = perimeter;
        
        // Check for notches or cutouts
        const features = this.detectPolylineFeatures(entity, dxf);
        geometry.features.push(...features);
        break;

      case 'SPLINE':
        geometry.perimeter = this.calculateSplineLength(entity);
        break;

      case '3DFACE':
        geometry.area = this.calculate3DFaceArea(entity);
        geometry.thickness = this.detect3DFaceThickness(entity);
        break;
    }

    return geometry;
  }

  // Calculate bounding box for any entity
  private calculateBoundingBox(entity: any): BoundingBox {
    const points = this.extractPoints(entity);
    
    if (points.length === 0) {
      return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
    }

    const bbox: BoundingBox = {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY
    };

    for (const point of points) {
      bbox.minX = Math.min(bbox.minX, point.x);
      bbox.minY = Math.min(bbox.minY, point.y);
      bbox.minZ = Math.min(bbox.minZ, point.z || 0);
      bbox.maxX = Math.max(bbox.maxX, point.x);
      bbox.maxY = Math.max(bbox.maxY, point.y);
      bbox.maxZ = Math.max(bbox.maxZ, point.z || 0);
    }

    return bbox;
  }

  // Calculate centroid for any entity
  private calculateCentroid(entity: any): Point3D {
    const points = this.extractPoints(entity);
    
    if (points.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + (point.z || 0)
    }), { x: 0, y: 0, z: 0 });

    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
      z: sum.z / points.length
    };
  }

  // Extract all points from an entity
  private extractPoints(entity: any): Point3D[] {
    const points: Point3D[] = [];

    if (entity.center) {
      points.push({ x: entity.center.x, y: entity.center.y, z: entity.center.z || 0 });
    }

    if (entity.vertices) {
      for (const vertex of entity.vertices) {
        points.push({ x: vertex.x, y: vertex.y, z: vertex.z || 0 });
      }
    }

    if (entity.controlPoints) {
      for (const cp of entity.controlPoints) {
        points.push({ x: cp.x, y: cp.y, z: cp.z || 0 });
      }
    }

    return points;
  }

  // Feature detection methods
  private isHole(entity: any, dxf: any): boolean {
    // Check if circle is within a larger closed shape
    // Check layer naming conventions (e.g., "HOLES", "DRILLING")
    if (entity.layer && entity.layer.toUpperCase().includes('HOLE')) {
      return true;
    }
    
    // Check if diameter is typical for holes (e.g., 3-20mm)
    const diameter = entity.radius * 2;
    return diameter >= 3 && diameter <= 20;
  }

  private isFoldLine(entity: any, dxf: any): boolean {
    // Check layer naming conventions
    if (entity.layer && (
      entity.layer.toUpperCase().includes('FOLD') ||
      entity.layer.toUpperCase().includes('BEND')
    )) {
      return true;
    }
    
    // Check line style (dashed lines often indicate folds)
    return entity.lineType === 'DASHED' || entity.lineType === 'DASHDOT';
  }

  private isBendLine(entity: any, dxf: any): boolean {
    return entity.layer && entity.layer.toUpperCase().includes('BEND');
  }

  private detectPolylineFeatures(entity: any, dxf: any): GeometryFeature[] {
    const features: GeometryFeature[] = [];
    
    if (!entity.vertices || entity.vertices.length < 3) {
      return features;
    }

    // Check if polyline forms a notch (concave shape)
    const isNotch = this.detectNotch(entity.vertices);
    if (isNotch) {
      features.push({
        type: 'notch',
        profile: entity.vertices.map((v: any) => ({ x: v.x, y: v.y, z: v.z || 0 }))
      });
    }

    // Check if polyline forms a cutout
    if (entity.closed && entity.layer?.toUpperCase().includes('CUTOUT')) {
      const { area, perimeter } = this.calculatePolylineMetrics(entity);
      features.push({
        type: 'cutout',
        profile: entity.vertices.map((v: any) => ({ x: v.x, y: v.y, z: v.z || 0 })),
        width: Math.sqrt(area),
        height: Math.sqrt(area)
      });
    }

    return features;
  }

  private detectNotch(vertices: any[]): boolean {
    // Simple concavity detection
    if (vertices.length < 4) return false;
    
    // Check for sharp inward angles
    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const curr = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      
      const angle = this.calculateAngle(prev, curr, next);
      if (angle < 90) { // Sharp inward angle indicates a notch
        return true;
      }
    }
    
    return false;
  }

  private calculateAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const det = v1.x * v2.y - v1.y * v2.x;
    
    return Math.atan2(det, dot) * (180 / Math.PI);
  }

  private calculateLineLength(p1: any, p2: any): number {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow((p2.z || 0) - (p1.z || 0), 2)
    );
  }

  private calculateLineAngle(p1: any, p2: any): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  }

  private calculatePolylineMetrics(entity: any): { area: number; perimeter: number } {
    if (!entity.vertices || entity.vertices.length < 3) {
      return { area: 0, perimeter: 0 };
    }

    let area = 0;
    let perimeter = 0;
    
    // Calculate perimeter
    for (let i = 0; i < entity.vertices.length; i++) {
      const next = (i + 1) % entity.vertices.length;
      perimeter += this.calculateLineLength(entity.vertices[i], entity.vertices[next]);
    }

    // Calculate area using shoelace formula (for closed polylines)
    if (entity.closed) {
      for (let i = 0; i < entity.vertices.length; i++) {
        const next = (i + 1) % entity.vertices.length;
        area += entity.vertices[i].x * entity.vertices[next].y;
        area -= entity.vertices[next].x * entity.vertices[i].y;
      }
      area = Math.abs(area) / 2;
    }

    return { area, perimeter };
  }

  private calculateSplineLength(entity: any): number {
    // Approximate spline length using control points
    if (!entity.controlPoints || entity.controlPoints.length < 2) {
      return 0;
    }

    let length = 0;
    for (let i = 0; i < entity.controlPoints.length - 1; i++) {
      length += this.calculateLineLength(entity.controlPoints[i], entity.controlPoints[i + 1]);
    }

    return length;
  }

  private calculate3DFaceArea(entity: any): number {
    // Calculate area of 3D face using cross product
    if (!entity.vertices || entity.vertices.length < 3) {
      return 0;
    }

    const v1 = entity.vertices[0];
    const v2 = entity.vertices[1];
    const v3 = entity.vertices[2];

    const ab = {
      x: v2.x - v1.x,
      y: v2.y - v1.y,
      z: (v2.z || 0) - (v1.z || 0)
    };

    const ac = {
      x: v3.x - v1.x,
      y: v3.y - v1.y,
      z: (v3.z || 0) - (v1.z || 0)
    };

    const cross = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x
    };

    return Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) / 2;
  }

  private detect3DFaceThickness(entity: any): number {
    // Detect thickness from Z-coordinates
    if (!entity.vertices) return 0;

    const zValues = entity.vertices.map((v: any) => v.z || 0);
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);

    return maxZ - minZ;
  }

  private detectNestedFeatures(geometries: ParsedGeometry[]): void {
    // Detect parent-child relationships based on containment
    for (let i = 0; i < geometries.length; i++) {
      for (let j = 0; j < geometries.length; j++) {
        if (i === j) continue;
        
        if (this.isContained(geometries[i].bbox, geometries[j].bbox)) {
          // geometries[i] is contained within geometries[j]
          for (const feature of geometries[i].features) {
            // Mark as child feature
            feature.parentFeatureId = j;
          }
        }
      }
    }
  }

  private isContained(inner: BoundingBox, outer: BoundingBox): boolean {
    return inner.minX >= outer.minX && inner.maxX <= outer.maxX &&
           inner.minY >= outer.minY && inner.maxY <= outer.maxY &&
           inner.minZ >= outer.minZ && inner.maxZ <= outer.maxZ;
  }

  // Save parsed geometries to database
  async saveGeometries(elementId: number, geometries: ParsedGeometry[], sourceFileId: number, userId: number): Promise<void> {
    for (const geometry of geometries) {
      // Save main geometry
      const [insertedGeometry] = await db.insert(aiMtoGeometries).values({
        elementId,
        geometryType: geometry.type,
        sourceFileId,
        layer: geometry.layer,
        placement: 'parent',
        bboxMinX: this.toMillimeters(geometry.bbox.minX).toString(),
        bboxMinY: this.toMillimeters(geometry.bbox.minY).toString(),
        bboxMinZ: this.toMillimeters(geometry.bbox.minZ).toString(),
        bboxMaxX: this.toMillimeters(geometry.bbox.maxX).toString(),
        bboxMaxY: this.toMillimeters(geometry.bbox.maxY).toString(),
        bboxMaxZ: this.toMillimeters(geometry.bbox.maxZ).toString(),
        centroidX: this.toMillimeters(geometry.centroid.x).toString(),
        centroidY: this.toMillimeters(geometry.centroid.y).toString(),
        centroidZ: this.toMillimeters(geometry.centroid.z).toString(),
        areaMm2: geometry.area ? this.toMillimeters(geometry.area, 'mm').pow(2).toString() : null,
        perimeterMm: geometry.perimeter ? this.toMillimeters(geometry.perimeter).toString() : null,
        thicknessMm: geometry.thickness ? this.toMillimeters(geometry.thickness).toString() : null,
        angleDeg: geometry.angle?.toString() || null,
        metadata: geometry.rawData,
        createdBy: userId
      }).returning();

      // Save features
      for (const feature of geometry.features) {
        await db.insert(aiMtoFeatures).values({
          geometryId: insertedGeometry.id,
          featureType: feature.type,
          profileData: feature.profile ? 
            feature.profile.map(p => ({
              x: this.toMillimeters(p.x).toString(),
              y: this.toMillimeters(p.y).toString(),
              z: this.toMillimeters(p.z).toString()
            })) : null,
          diameterMm: feature.diameter ? this.toMillimeters(feature.diameter).toString() : null,
          lengthMm: feature.length ? this.toMillimeters(feature.length).toString() : null,
          widthMm: feature.width ? this.toMillimeters(feature.width).toString() : null,
          heightMm: feature.height ? this.toMillimeters(feature.height).toString() : null,
          orientationDeg: feature.orientation?.toString() || null,
          parentFeatureId: feature.parentFeatureId || null
        });
      }
    }
  }
}

export default new DxfGeometryService();