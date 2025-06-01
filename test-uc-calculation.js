// Test UC surface area calculation
// SUC150023: Universal Column 152x152x23mm, web=6.1mm, flange=6.8mm

const width = 152; // mm
const depth = 152; // mm  
const webThickness = 6.1; // mm
const flangeThickness = 6.8; // mm

console.log('Testing UC150023 Surface Area Calculation:');
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
console.log(`Internal flange portion width: (${width} - ${webThickness}) / 2 = ${internalFlangePortionWidth.toFixed(2)}mm`);
console.log(`Total internal flanges: 4 × ${internalFlangePortionWidth.toFixed(2)}mm = ${totalInternalFlanges.toFixed(2)}mm`);

// Convert to m²/m
const external = externalFlanges / 1000;
const internal = (internalWeb + totalInternalFlanges) / 1000;
const total = external + internal;

console.log('\nResults:');
console.log(`External: ${external.toFixed(3)} m²/m`);
console.log(`Internal: ${internal.toFixed(3)} m²/m`);
console.log(`Total (External + Internal): ${total.toFixed(3)} m²/m`);
console.log(`Current database value: 0.48 m²/m`);
console.log(`Difference: ${(total - 0.48).toFixed(3)} m²/m`);