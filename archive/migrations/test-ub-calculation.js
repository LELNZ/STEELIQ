// Test UB surface area calculation
// SUB150014: Universal Beam 150x75x14mm, web=5mm, flange=7mm

const width = 150; // mm
const depth = 75; // mm  
const webThickness = 5; // mm
const flangeThickness = 7; // mm

console.log('Testing UB150014 Surface Area Calculation:');
console.log(`Dimensions: ${width}mm x ${depth}mm, Web: ${webThickness}mm, Flange: ${flangeThickness}mm`);

// External surfaces: 2 flanges (no external web)
const externalFlanges = 2 * width; // mm per meter
console.log(`External flanges: 2 × ${width}mm = ${externalFlanges}mm`);

// Internal surfaces: web depth + separated flange portions
const internalWebDepth = depth - (2 * flangeThickness);
const internalWeb = 2 * internalWebDepth; // mm (both web sides)
console.log(`Internal web depth: ${depth} - (2 × ${flangeThickness}) = ${internalWebDepth}mm`);
console.log(`Internal web surfaces: 2 × ${internalWebDepth}mm = ${internalWeb}mm`);

// Each internal flange portion excludes web thickness
const internalFlangePortionWidth = (width - webThickness) / 2; // mm per portion
const totalInternalFlanges = 4 * internalFlangePortionWidth; // 4 portions
console.log(`Internal flange portion width: (${width} - ${webThickness}) / 2 = ${internalFlangePortionWidth}mm`);
console.log(`Total internal flanges: 4 × ${internalFlangePortionWidth}mm = ${totalInternalFlanges}mm`);

// Convert to m²/m
const external = externalFlanges / 1000;
const internal = (internalWeb + totalInternalFlanges) / 1000;
const total = external + internal;

console.log('\nResults:');
console.log(`External: ${external.toFixed(3)} m²/m`);
console.log(`Internal: ${internal.toFixed(3)} m²/m`);
console.log(`Total (External + Internal): ${total.toFixed(3)} m²/m`);
console.log(`Current database value: 0.32 m²/m`);
console.log(`Difference: ${(total - 0.32).toFixed(3)} m²/m`);