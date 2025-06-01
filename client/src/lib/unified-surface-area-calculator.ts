/**
 * Unified Surface Area Calculator
 * Single source of truth for all surface area calculations
 * Ensures consistency between surface area manager and material edit forms
 */

export interface MaterialDimensions {
  width: number;
  depth: number;
  webThickness: number;
  flangeThickness: number;
  outerDiameter?: number;
  thickness?: number;
}

export interface SurfaceAreaBreakdown {
  external: number;
  internal: number;
  total: number;
  details: {
    externalFlanges?: number;
    internalWeb?: number;
    internalFlanges?: number;
    externalSurfaces?: number;
    internalSurfaces?: number;
  };
}

/**
 * Calculate Universal Column/Beam surface area using exact geometry
 */
export function calculateUniversalSectionArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, depth, flangeThickness } = dimensions;
  
  // External surfaces: 2 flanges (no external web)
  const externalFlanges = 2 * width; // mm
  
  // Internal surfaces: web depth + flange undersides
  const internalWebDepth = depth - (2 * flangeThickness);
  const internalWeb = 2 * internalWebDepth; // mm (both web sides)
  const internalFlanges = 2 * width; // mm (flange undersides)
  
  let external = 0;
  let internal = 0;
  
  if (coatingType === 'external-only') {
    external = externalFlanges;
  } else if (coatingType === 'internal-only') {
    internal = internalWeb + internalFlanges;
  } else if (coatingType === 'external-internal') {
    external = externalFlanges;
    internal = internalWeb + internalFlanges;
  }
  
  return {
    external: external / 1000, // Convert to m²/m
    internal: internal / 1000, // Convert to m²/m
    total: (external + internal) / 1000, // Convert to m²/m
    details: {
      externalFlanges: externalFlanges / 1000,
      internalWeb: internalWeb / 1000,
      internalFlanges: internalFlanges / 1000
    }
  };
}

/**
 * Calculate Channel surface area using exact geometry
 */
export function calculateChannelArea(
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const { width, depth, webThickness, flangeThickness } = dimensions;
  
  // External surfaces: web + 2 flanges
  const externalWeb = depth;
  const externalFlanges = 2 * width;
  const externalTotal = externalWeb + externalFlanges;
  
  // Internal surfaces: reduced dimensions
  const internalFlangeWidth = width - webThickness;
  const internalWebDepth = depth - (2 * flangeThickness);
  const internalTotal = internalWebDepth + (2 * internalFlangeWidth);
  
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
 * Calculate surface area for any material type
 */
export function calculateMaterialSurfaceArea(
  category: string,
  dimensions: MaterialDimensions,
  coatingType: 'external-only' | 'internal-only' | 'external-internal'
): SurfaceAreaBreakdown {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('universal') || categoryLower.includes('uc') || categoryLower.includes('ub')) {
    return calculateUniversalSectionArea(dimensions, coatingType);
  } else if (categoryLower.includes('channel')) {
    return calculateChannelArea(dimensions, coatingType);
  } else if (categoryLower.includes('rhs') || categoryLower.includes('shs') || categoryLower.includes('hollow')) {
    return calculateHollowSectionArea(dimensions, coatingType);
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