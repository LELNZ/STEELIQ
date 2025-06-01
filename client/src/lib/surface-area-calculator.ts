/**
 * Surface Area Calculator for Steel Profiles
 * Calculates surface area per meter (m²/m) for coating applications
 * All calculations use metric units (mm for dimensions, m²/m for results)
 */

import type { Material } from "@shared/schema";

export interface SteelDimensions {
  width?: number;      // mm
  height?: number;     // mm
  thickness?: number;  // mm
  depth?: number;      // mm
  flangeWidth?: number; // mm
  flangeThickness?: number; // mm
  webThickness?: number; // mm
  outerDiameter?: number; // mm
  innerDiameter?: number; // mm
}

export interface SurfaceAreaResult {
  totalArea: number;
  externalArea: number;
  internalArea: number;
  breakdown: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    web?: number;
    flange?: number;
    outer?: number;
    inner?: number;
  };
}

/**
 * Calculate surface area for Equal Angle (L-section)
 * Formula: 2 × (width - thickness) × 1000 + 2 × thickness × 1000
 */
export function calculateAngleArea(width: number, thickness: number): SurfaceAreaResult {
  const legLength = (width - thickness) / 1000; // Convert to meters
  const thicknessM = thickness / 1000;
  
  const legArea = 2 * legLength; // Two legs (external faces)
  const tipArea = 2 * thicknessM; // Two tip faces
  
  return {
    totalArea: Number((legArea + tipArea).toFixed(2)),
    externalArea: Number(legArea.toFixed(2)),
    internalArea: 0,
    breakdown: {
      left: Number((legLength / 2).toFixed(2)),
      right: Number((legLength / 2).toFixed(2)),
      top: Number(thicknessM.toFixed(2)),
      bottom: Number(thicknessM.toFixed(2))
    }
  };
}

/**
 * Calculate surface area for Unequal Angle
 */
export function calculateUnequalAngleArea(width: number, height: number, thickness: number): SurfaceAreaResult {
  const leg1Length = (width - thickness) / 1000;
  const leg2Length = (height - thickness) / 1000;
  const thicknessM = thickness / 1000;
  
  const legArea = leg1Length + leg2Length;
  const tipArea = 2 * thicknessM;
  
  return {
    totalArea: Number((legArea + tipArea).toFixed(2)),
    externalArea: Number(legArea.toFixed(2)),
    internalArea: 0,
    breakdown: {
      left: Number(leg1Length.toFixed(2)),
      right: Number(leg2Length.toFixed(2)),
      top: Number(thicknessM.toFixed(2)),
      bottom: Number(thicknessM.toFixed(2))
    }
  };
}

/**
 * Calculate surface area for RHS/SHS (Rectangular/Square Hollow Section)
 * External: 2 × (width + height) / 1000
 * Internal: 2 × (width - 2×thickness + height - 2×thickness) / 1000
 */
export function calculateRHSArea(width: number, height: number, thickness: number): SurfaceAreaResult {
  const widthM = width / 1000;
  const heightM = height / 1000;
  const thicknessM = thickness / 1000;
  
  const externalPerimeter = 2 * (widthM + heightM);
  const internalWidth = (width - 2 * thickness) / 1000;
  const internalHeight = (height - 2 * thickness) / 1000;
  const internalPerimeter = 2 * (internalWidth + internalHeight);
  
  return {
    totalArea: Number((externalPerimeter + internalPerimeter).toFixed(2)),
    externalArea: Number(externalPerimeter.toFixed(2)),
    internalArea: Number(internalPerimeter.toFixed(2)),
    breakdown: {
      top: Number(widthM.toFixed(2)),
      bottom: Number(widthM.toFixed(2)),
      left: Number(heightM.toFixed(2)),
      right: Number(heightM.toFixed(2))
    }
  };
}

/**
 * Calculate surface area for Universal Beam (UB)
 * External: 2 × flangeWidth + webHeight / 1000
 */
export function calculateUBArea(depth: number, flangeWidth: number, webThickness: number, flangeThickness: number): SurfaceAreaResult {
  const flangeWidthM = flangeWidth / 1000;
  const webHeightM = (depth - 2 * flangeThickness) / 1000;
  const webThicknessM = webThickness / 1000;
  const flangeThicknessM = flangeThickness / 1000;
  
  const flangeArea = 2 * flangeWidthM; // Top and bottom flanges
  const webArea = webHeightM; // Web height
  const webEdges = 2 * webThicknessM; // Web edges
  const flangeEdges = 4 * flangeThicknessM; // Flange edges
  
  return {
    totalArea: Number((flangeArea + webArea + webEdges + flangeEdges).toFixed(2)),
    externalArea: Number((flangeArea + webArea).toFixed(2)),
    internalArea: 0,
    breakdown: {
      flange: Number(flangeArea.toFixed(2)),
      web: Number(webArea.toFixed(2))
    }
  };
}

/**
 * Calculate surface area for Universal Column (UC)
 * Similar to UB but typically wider flanges
 */
export function calculateUCArea(depth: number, flangeWidth: number, webThickness: number, flangeThickness: number): SurfaceAreaResult {
  return calculateUBArea(depth, flangeWidth, webThickness, flangeThickness);
}

/**
 * Calculate surface area for Parallel Flange Channel (PFC)
 * External: flangeWidth × 2 + webHeight + webThickness × 2 / 1000
 */
export function calculatePFCArea(depth: number, flangeWidth: number, webThickness: number, flangeThickness: number): SurfaceAreaResult {
  const flangeWidthM = flangeWidth / 1000;
  const webHeightM = (depth - 2 * flangeThickness) / 1000;
  const webThicknessM = webThickness / 1000;
  const flangeThicknessM = flangeThickness / 1000;
  
  const flangeArea = 2 * flangeWidthM; // Two flanges
  const webArea = webHeightM; // Web
  const webEdge = webThicknessM; // One web edge (open side)
  const flangeEdges = 4 * flangeThicknessM; // Flange edges
  
  const internalFlangeArea = 2 * (flangeWidthM - webThicknessM); // Internal flange surfaces
  const internalWebArea = webHeightM - 2 * flangeThicknessM; // Internal web surface
  
  return {
    totalArea: Number((flangeArea + webArea + webEdge + flangeEdges + internalFlangeArea + internalWebArea).toFixed(2)),
    externalArea: Number((flangeArea + webArea + webEdge + flangeEdges).toFixed(2)),
    internalArea: Number((internalFlangeArea + internalWebArea).toFixed(2)),
    breakdown: {
      flange: Number(flangeArea.toFixed(2)),
      web: Number(webArea.toFixed(2))
    }
  };
}

/**
 * Calculate surface area for Flat Bar/Plate
 * Area: 2 × width + 2 × thickness / 1000
 */
export function calculateFlatBarArea(width: number, thickness: number): SurfaceAreaResult {
  const widthM = width / 1000;
  const thicknessM = thickness / 1000;
  
  const faceArea = 2 * widthM; // Top and bottom faces
  const edgeArea = 2 * thicknessM; // Side edges
  
  return {
    totalArea: Number((faceArea + edgeArea).toFixed(2)),
    externalArea: Number((faceArea + edgeArea).toFixed(2)),
    internalArea: 0,
    breakdown: {
      top: Number(widthM.toFixed(2)),
      bottom: Number(widthM.toFixed(2)),
      left: Number(thicknessM.toFixed(2)),
      right: Number(thicknessM.toFixed(2))
    }
  };
}

/**
 * Calculate surface area for Square Bar
 * Area: 4 × width / 1000 (four sides of the square)
 */
export function calculateSquareBarArea(width: number): SurfaceAreaResult {
  const widthM = width / 1000;
  const totalArea = 4 * widthM; // Four sides
  
  return {
    totalArea: Number(totalArea.toFixed(4)),
    externalArea: Number(totalArea.toFixed(4)),
    internalArea: 0,
    breakdown: {
      top: Number(widthM.toFixed(4)),
      bottom: Number(widthM.toFixed(4)),
      left: Number(widthM.toFixed(4)),
      right: Number(widthM.toFixed(4))
    }
  };
}



/**
 * Calculate surface area for Round Bar/Pipe
 * External: π × diameter / 1000
 * Internal (for pipe): π × (diameter - 2×thickness) / 1000
 */
export function calculateRoundArea(outerDiameter: number, thickness?: number): SurfaceAreaResult {
  const outerDiameterM = outerDiameter / 1000;
  const externalArea = Math.PI * outerDiameterM;
  
  let internalArea = 0;
  if (thickness && thickness > 0) {
    const innerDiameter = (outerDiameter - 2 * thickness) / 1000;
    internalArea = Math.PI * innerDiameter;
  }
  
  return {
    totalArea: Number((externalArea + internalArea).toFixed(2)),
    externalArea: Number(externalArea.toFixed(2)),
    internalArea: Number(internalArea.toFixed(2)),
    breakdown: {
      outer: Number(externalArea.toFixed(2)),
      inner: Number(internalArea.toFixed(2))
    }
  };
}

/**
 * Auto-detect profile type and calculate surface area
 */
export function calculateSurfaceArea(
  category: string,
  dimensions: SteelDimensions
): SurfaceAreaResult {
  const cat = category.toLowerCase();
  
  if (cat.includes('angle') || cat.includes('equal angle')) {
    if (dimensions.width && dimensions.thickness) {
      if (dimensions.height && dimensions.height !== dimensions.width) {
        return calculateUnequalAngleArea(dimensions.width, dimensions.height, dimensions.thickness);
      }
      return calculateAngleArea(dimensions.width, dimensions.thickness);
    }
  }
  
  if (cat.includes('rhs') || cat.includes('rectangular')) {
    if (dimensions.width && dimensions.height && dimensions.thickness) {
      return calculateRHSArea(dimensions.width, dimensions.height, dimensions.thickness);
    }
  }
  
  if (cat.includes('shs') || (cat.includes('square') && cat.includes('hollow'))) {
    if (dimensions.width && dimensions.thickness) {
      return calculateRHSArea(dimensions.width, dimensions.width, dimensions.thickness); // Square hollow section
    }
  }
  
  if (cat.includes('square') && !cat.includes('hollow')) {
    if (dimensions.width) {
      return calculateSquareBarArea(dimensions.width); // Solid square bar
    }
  }
  
  if (cat.includes('universal beam') || cat.includes('ub')) {
    if (dimensions.depth && dimensions.flangeWidth && dimensions.webThickness && dimensions.flangeThickness) {
      return calculateUBArea(dimensions.depth, dimensions.flangeWidth, dimensions.webThickness, dimensions.flangeThickness);
    }
  }
  
  if (cat.includes('universal column') || cat.includes('uc')) {
    if (dimensions.depth && dimensions.flangeWidth && dimensions.webThickness && dimensions.flangeThickness) {
      return calculateUCArea(dimensions.depth, dimensions.flangeWidth, dimensions.webThickness, dimensions.flangeThickness);
    }
  }
  
  if (cat.includes('pfc') || cat.includes('channel')) {
    if (dimensions.depth && dimensions.flangeWidth && dimensions.webThickness && dimensions.flangeThickness) {
      return calculatePFCArea(dimensions.depth, dimensions.flangeWidth, dimensions.webThickness, dimensions.flangeThickness);
    }
  }
  
  if (cat.includes('flat') || cat.includes('plate')) {
    if (dimensions.width && dimensions.thickness) {
      return calculateFlatBarArea(dimensions.width, dimensions.thickness);
    }
  }
  
  if (cat.includes('round') || cat.includes('pipe') || cat.includes('tube')) {
    if (dimensions.outerDiameter) {
      return calculateRoundArea(dimensions.outerDiameter, dimensions.thickness);
    }
  }
  
  // Default fallback
  return {
    totalArea: 0,
    externalArea: 0,
    internalArea: 0,
    breakdown: {}
  };
}

/**
 * Automatically calculate surface area per meter for a material based on its category and dimensions
 * Returns surface area in m²/m or null if calculation is not possible
 */
export function calculateMaterialSurfaceArea(material: Material): number | null {
  try {
    const category = material.category?.toLowerCase() || '';
    
    // Parse dimensions from string fields
    const width = material.width ? parseFloat(material.width) : null;
    const depth = material.depth ? parseFloat(material.depth) : null;
    const thickness = material.thickness ? parseFloat(material.thickness) : null;
    const diameter = material.diameter ? parseFloat(material.diameter) : null;
    const webTw = material.webTw ? parseFloat(material.webTw) : null;
    const flangeTf = material.flangeTf ? parseFloat(material.flangeTf) : null;

    // Structural Channels (C-sections)
    if (category.includes('channel') || category.includes('structural channels')) {
      if (width && depth && webTw && flangeTf) {
        const result = calculatePFCArea(width, depth, webTw, flangeTf);
        return result.totalArea;
      }
    }
    
    // Universal Beams (I-beams)
    else if (category.includes('universal beam') || category.includes('i-beam')) {
      if (width && depth && webTw && flangeTf) {
        const result = calculateUBArea(width, depth, webTw, flangeTf);
        return result.totalArea;
      }
    }
    
    // Universal Columns (H-sections)
    else if (category.includes('universal column') || category.includes('h-section')) {
      if (width && depth && webTw && flangeTf) {
        const result = calculateUCArea(width, depth, webTw, flangeTf);
        return result.totalArea;
      }
    }
    
    // Angles (L-sections)
    else if (category.includes('angle') || category.includes('equal angle')) {
      if (width && thickness) {
        const result = calculateAngleArea(width, thickness);
        return result.totalArea;
      }
    }
    
    // Pipes (CHS - Circular Hollow Sections)
    else if (category.includes('pipe') || category.includes('chs') || category.includes('circular hollow')) {
      if (diameter && thickness) {
        const result = calculateRoundArea(diameter, thickness);
        return result.totalArea;
      }
    }
    
    // Round bars
    else if (category.includes('round') || category.includes('bar')) {
      if (diameter) {
        const result = calculateRoundArea(diameter, 0);
        return result.totalArea;
      }
    }
    
    // Square bars
    else if (category.includes('square') && category.includes('bar')) {
      if (width) {
        const result = calculateSquareBarArea(width);
        return result.totalArea;
      }
    }
    
    // Flat bars
    else if (category.includes('flat') || category.includes('plate')) {
      if (width && thickness) {
        const result = calculateFlatBarArea(width, thickness);
        return result.totalArea;
      }
    }
    
    // RHS (Rectangular Hollow Sections)
    else if (category.includes('rhs') || category.includes('rectangular hollow')) {
      if (width && depth && thickness) {
        const result = calculateRHSArea(width, depth, thickness);
        return result.totalArea;
      }
    }
    
    // SHS (Square Hollow Sections)
    else if (category.includes('shs') || category.includes('square hollow')) {
      if (width && thickness) {
        const result = calculateRHSArea(width, width, thickness);
        return result.totalArea;
      }
    }
    
    // Sheet metal
    else if (category.includes('sheet') || category.includes('plate')) {
      if (width && thickness) {
        const result = calculateFlatBarArea(width, thickness);
        return result.totalArea;
      }
    }
    
    // Reinforcing bars
    else if (category.includes('reinforc') || category.includes('rebar')) {
      if (diameter) {
        const result = calculateRoundArea(diameter, 0);
        return result.totalArea;
      }
    }
    
    return null; // Cannot calculate for this material type
  } catch (error) {
    console.error('Error calculating surface area for material:', material.name, error);
    return null;
  }
}