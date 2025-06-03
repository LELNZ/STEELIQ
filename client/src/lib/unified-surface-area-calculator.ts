/**
 * Unified Surface Area Calculator
 * Single source of truth for all surface area calculations
 * Ensures consistency between surface area manager and material edit forms
 */

export interface MaterialDimensions {
  width?: number;
  depth?: number;
  webThickness?: number;
  flangeThickness?: number;
  outerDiameter?: number;
  diameter?: number; // Alternative name for diameter
  thickness?: number;
  width1?: number; // For unequal angles
  width2?: number; // For unequal angles
  height?: number; // Legacy compatibility
  flangeWidth?: number; // Legacy compatibility
}

export interface SurfaceAreaBreakdown {
  external: number;
  internal: number;
  total: number;
  details: {
    externalFlanges?: number;
    internalWeb?: number;
    internalFlanges?: number;
    internalFlangeTopLeft?: number;
    internalFlangeTopRight?: number;
    internalFlangeBottomLeft?: number;
    internalFlangeBottomRight?: number;
    externalSurfaces?: number;
    internalSurfaces?: number;
    // Angle iron specific surfaces
    externalLeg1?: number;
    externalLeg2?: number;
    internalLeg1?: number;
    internalLeg2?: number;
    // Flat/plate specific surfaces
    topSurface?: number;
    bottomSurface?: number;
    edges?: number;
    // Round/pipe specific surfaces
    outerSurface?: number;
    innerSurface?: number;
    // Square bar specific surfaces
    leftSurface?: number;
    rightSurface?: number;
  };
}

/**
 * Calculate Universal Column/Beam surface area using exact geometry
 * Now with separated internal flange surfaces (excluding web area)
 */
export function calculateUniversalSectionArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, depth, flangeThickness, webThickness } = dimensions;
  
  // External surfaces: 2 flanges (no external web)
  const externalFlanges = 2 * width; // mm
  
  // Internal surfaces: web depth + separated flange portions
  const internalWebDepth = depth - (2 * flangeThickness);
  const internalWeb = 2 * internalWebDepth; // mm (both web sides)
  
  // Each internal flange portion excludes web thickness
  const internalFlangePortionWidth = (width - webThickness) / 2; // mm per portion
  const internalFlangeTopLeft = internalFlangePortionWidth; // mm
  const internalFlangeTopRight = internalFlangePortionWidth; // mm
  const internalFlangeBottomLeft = internalFlangePortionWidth; // mm
  const internalFlangeBottomRight = internalFlangePortionWidth; // mm
  
  const totalInternalFlanges = internalFlangeTopLeft + internalFlangeTopRight + 
                               internalFlangeBottomLeft + internalFlangeBottomRight;
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalFlanges;
  } else if (coatingType === 'internal-only') {
    internal = internalWeb + totalInternalFlanges;
  } else if (coatingType === 'external-internal') {
    external = externalFlanges;
    internal = internalWeb + totalInternalFlanges;
  }
  
  return {
    external: external / 1000, // Convert to m²/m
    internal: internal / 1000, // Convert to m²/m
    total: (external + internal) / 1000, // Convert to m²/m
    details: {
      externalFlanges: externalFlanges / 1000,
      internalWeb: internalWeb / 1000,
      internalFlangeTopLeft: internalFlangeTopLeft / 1000,
      internalFlangeTopRight: internalFlangeTopRight / 1000,
      internalFlangeBottomLeft: internalFlangeBottomLeft / 1000,
      internalFlangeBottomRight: internalFlangeBottomRight / 1000
    }
  };
}

/**
 * Calculate Channel surface area using exact geometry - MATCHES surface-area-manager.tsx logic
 */
export function calculateChannelArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width = 0, depth = 0, webThickness = 0, flangeThickness = 0 } = dimensions;
  
  // External surfaces: exactly as calculated in surface-area-manager.tsx
  const externalFlangeTop = width; // Full flange width per meter
  const externalFlangeBottom = width; // Full flange width per meter  
  const externalWeb = depth; // Full web depth per meter
  const externalTotal = externalFlangeTop + externalFlangeBottom + externalWeb;
  
  // Internal surfaces: exactly as calculated in surface-area-manager.tsx
  const internalFlangeWidth = width - webThickness; // Flange width minus web thickness
  const internalWebDepth = depth - (2 * flangeThickness); // Web depth minus both flange thicknesses
  const internalFlangeTop = internalFlangeWidth;
  const internalFlangeBottom = internalFlangeWidth;
  const internalWeb = internalWebDepth;
  const internalTotal = internalFlangeTop + internalFlangeBottom + internalWeb;
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalTotal;
  } else if (coatingType === 'internal-only') {
    internal = internalTotal;
  } else if (coatingType === 'external-internal') {
    external = externalTotal;
    internal = internalTotal;
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      externalSurfaces: externalTotal / 1000,
      internalSurfaces: internalTotal / 1000
    }
  };
}

/**
 * Calculate RHS/SHS surface area
 */
export function calculateHollowSectionArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, depth, thickness } = dimensions;
  
  // External: 4 sides (or 2 × width + 2 × depth for RHS)
  const externalPerimeter = 2 * (width + (depth || width));
  
  // Internal: reduced by wall thickness
  const internalWidth = width - (2 * (thickness || 0));
  const internalDepth = (depth || width) - (2 * (thickness || 0));
  const internalPerimeter = 2 * (internalWidth + internalDepth);
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalPerimeter;
  } else if (coatingType === 'internal-only') {
    internal = internalPerimeter;
  } else if (coatingType === 'external-internal') {
    external = externalPerimeter;
    internal = internalPerimeter;
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      externalSurfaces: externalPerimeter / 1000,
      internalSurfaces: internalPerimeter / 1000
    }
  };
}

/**
 * Calculate Equal Angle surface area with 4 selectable surfaces
 * External Leg 1, External Leg 2, Internal Leg 1, Internal Leg 2
 */
export function calculateEqualAngleArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, thickness } = dimensions;
  
  if (!width || !thickness) {
    return { external: 0, internal: 0, total: 0, details: {} };
  }
  
  // External leg surfaces (full width)
  const externalLeg1 = width; // mm per meter
  const externalLeg2 = width; // mm per meter
  
  // Internal leg surfaces (reduced by thickness)
  const internalLeg1 = width - thickness; // mm per meter
  const internalLeg2 = width - thickness; // mm per meter
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalLeg1 + externalLeg2;
  } else if (coatingType === 'internal-only') {
    internal = internalLeg1 + internalLeg2;
  } else if (coatingType === 'external-internal') {
    external = externalLeg1 + externalLeg2;
    internal = internalLeg1 + internalLeg2;
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      externalLeg1: externalLeg1 / 1000,
      externalLeg2: externalLeg2 / 1000,
      internalLeg1: internalLeg1 / 1000,
      internalLeg2: internalLeg2 / 1000
    }
  };
}

/**
 * Calculate Unequal Angle surface area with 4 selectable surfaces
 * Uses width1 (W1) and width2 (W2) dimensions
 */
export function calculateUnequalAngleArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  // Use width1/width2 if available, otherwise fallback to width/depth
  const width1 = dimensions.width1 || dimensions.width;
  const width2 = dimensions.width2 || dimensions.depth || dimensions.width;
  const thickness = dimensions.thickness || dimensions.webThickness || dimensions.flangeThickness;
  
  if (!width1 || !width2 || !thickness) {
    return { external: 0, internal: 0, total: 0, details: {} };
  }
  
  // External leg surfaces (full width)
  const externalLeg1 = width1; // mm per meter
  const externalLeg2 = width2; // mm per meter
  
  // Internal leg surfaces (reduced by thickness)
  const internalLeg1 = width1 - thickness; // mm per meter
  const internalLeg2 = width2 - thickness; // mm per meter
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalLeg1 + externalLeg2;
  } else if (coatingType === 'internal-only') {
    internal = internalLeg1 + internalLeg2;
  } else if (coatingType === 'external-internal') {
    external = externalLeg1 + externalLeg2;
    internal = internalLeg1 + internalLeg2;
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      externalLeg1: externalLeg1 / 1000,
      externalLeg2: externalLeg2 / 1000,
      internalLeg1: internalLeg1 / 1000,
      internalLeg2: internalLeg2 / 1000
    }
  };
}

/**
 * Calculate Square Bar surface area
 * For square bars: 4 sides of equal width per meter length
 */
export function calculateSquareBarArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, depth } = dimensions;
  
  // For square bars, use width as the side dimension
  // If depth is not provided, assume it equals width (true square)
  const sideWidth = width;
  const sideDepth = depth || width;
  
  if (!sideWidth) {
    return { external: 0, internal: 0, total: 0, details: {} };
  }
  
  // For square bars per meter:
  // 4 sides = 2 * (width + depth) per meter length
  const perimeter = 2 * (sideWidth + sideDepth); // mm per meter
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = perimeter;
  } else if (coatingType === 'internal-only') {
    // Solid square bars have no internal surfaces
    internal = 0;
  } else if (coatingType === 'external-internal') {
    external = perimeter;
    internal = 0; // Solid square bars have no internal surfaces
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      topSurface: sideWidth / 1000,
      bottomSurface: sideWidth / 1000,
      leftSurface: sideDepth / 1000,
      rightSurface: sideDepth / 1000
    }
  };
}

/**
 * Calculate Flat/Plate surface area 
 * For flat materials: top surface + bottom surface + edges
 */
export function calculateFlatPlateArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, thickness } = dimensions;
  
  if (!width || !thickness) {
    return { external: 0, internal: 0, total: 0, details: {} };
  }
  
  // For flat materials per meter:
  // Top surface = width (mm) per meter length
  // Bottom surface = width (mm) per meter length  
  // Edges = 2 * thickness (mm) per meter length (front and back edges)
  
  const topSurface = width; // mm per meter
  const bottomSurface = width; // mm per meter
  const edges = 2 * thickness; // mm per meter (front + back edges)
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = topSurface + bottomSurface + edges;
  } else if (coatingType === 'internal-only') {
    // For flat materials, internal surfaces would be minimal
    internal = 0;
  } else if (coatingType === 'external-internal') {
    external = topSurface + bottomSurface + edges;
    internal = 0; // Flat materials typically don't have significant internal surfaces
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      topSurface: topSurface / 1000,
      bottomSurface: bottomSurface / 1000,
      edges: edges / 1000
    }
  };
}

/**
 * Calculate Round Bar/Pipe surface area
 * For solid round: external surface = π × diameter per meter
 * For pipe: external + internal surfaces
 */
export function calculateRoundArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { diameter, outerDiameter, thickness } = dimensions;
  
  // Use either diameter or outerDiameter
  const effectiveDiameter = diameter || outerDiameter;
  
  if (!effectiveDiameter) {
    return { external: 0, internal: 0, total: 0, details: {} };
  }
  
  // External surface: π × diameter (mm per meter)
  const externalSurface = Math.PI * effectiveDiameter; // mm per meter
  
  // Internal surface for pipes (if thickness is specified)
  let internalSurface = 0;
  if (thickness && thickness > 0) {
    const innerDiameter = effectiveDiameter - (2 * thickness);
    if (innerDiameter > 0) {
      internalSurface = Math.PI * innerDiameter; // mm per meter
    }
  }
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalSurface;
  } else if (coatingType === 'internal-only') {
    internal = internalSurface;
  } else if (coatingType === 'external-internal') {
    external = externalSurface;
    internal = internalSurface;
  }
  
  return {
    external: external / 1000,
    internal: internal / 1000,
    total: (external + internal) / 1000,
    details: {
      outerSurface: externalSurface / 1000,
      innerSurface: internalSurface / 1000
    }
  };
}

/**
 * Calculate surface area for any material type
 */
export function calculateMaterialSurfaceArea(
  category: string,
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('channel') || categoryLower.includes('structural channels')) {
    return calculateChannelArea(dimensions, coatingType);
  } else if (categoryLower.includes('universal') || categoryLower.includes('uc') || categoryLower.includes('ub')) {
    return calculateUniversalSectionArea(dimensions, coatingType);
  } else if (categoryLower.includes('rhs') || categoryLower.includes('shs') || categoryLower.includes('hollow')) {
    return calculateHollowSectionArea(dimensions, coatingType);
  } else if (categoryLower.includes('unequal') && categoryLower.includes('angle')) {
    return calculateUnequalAngleArea(dimensions, coatingType);
  } else if (categoryLower.includes('angle') || categoryLower.includes('duragal')) {
    return calculateEqualAngleArea(dimensions, coatingType);
  } else if (categoryLower.includes('square') || categoryLower.includes('sq ')) {
    return calculateSquareBarArea(dimensions, coatingType);
  } else if (categoryLower.includes('flat') || categoryLower.includes('plate')) {
    return calculateFlatPlateArea(dimensions, coatingType);
  } else if (categoryLower.includes('round') || categoryLower.includes('pipe') || categoryLower.includes('tube')) {
    return calculateRoundArea(dimensions, coatingType);
  } else {
    // Fallback for other types
    return {
      external: 0,
      internal: 0,
      total: 0,
      details: {}
    };
  }
}