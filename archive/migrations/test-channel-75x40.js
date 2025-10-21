// Test specific channel: 75x40x6.1x3.8mm
const dimensions = {
  width: 75,        // Flange width
  depth: 40,        // Web depth  
  webThickness: 3.8, // Web thickness
  flangeThickness: 6.1, // Flange thickness
  length: 1000       // 1 meter
};

console.log('Channel 75x40x6.1x3.8mm Calculation Test');
console.log('Dimensions:', dimensions);
console.log('');

// External surfaces (per meter)
const external_flange_top = dimensions.width * dimensions.length / 1000000; // m²
const external_flange_bottom = dimensions.width * dimensions.length / 1000000; // m²
const external_web = dimensions.depth * dimensions.length / 1000000; // m²
const external_total = external_flange_top + external_flange_bottom + external_web;

console.log('External Surfaces:');
console.log(`- Top Flange: ${dimensions.width}mm x ${dimensions.length}mm = ${external_flange_top.toFixed(4)} m²`);
console.log(`- Bottom Flange: ${dimensions.width}mm x ${dimensions.length}mm = ${external_flange_bottom.toFixed(4)} m²`);
console.log(`- Web: ${dimensions.depth}mm x ${dimensions.length}mm = ${external_web.toFixed(4)} m²`);
console.log(`Total External: ${external_total.toFixed(4)} m²`);
console.log('');

// Internal surfaces
const internal_flange_width = dimensions.width - dimensions.webThickness;
const internal_web_depth = dimensions.depth - (2 * dimensions.flangeThickness);

const internal_flange_top = internal_flange_width * dimensions.length / 1000000; // m²
const internal_flange_bottom = internal_flange_width * dimensions.length / 1000000; // m²
const internal_web = internal_web_depth * dimensions.length / 1000000; // m²
const internal_total = internal_flange_top + internal_flange_bottom + internal_web;

console.log('Internal Surfaces:');
console.log(`- Top Flange: (${dimensions.width} - ${dimensions.webThickness})mm x ${dimensions.length}mm = ${internal_flange_top.toFixed(4)} m²`);
console.log(`- Bottom Flange: (${dimensions.width} - ${dimensions.webThickness})mm x ${dimensions.length}mm = ${internal_flange_bottom.toFixed(4)} m²`);
console.log(`- Web: (${dimensions.depth} - 2 x ${dimensions.flangeThickness})mm x ${dimensions.length}mm = ${internal_web.toFixed(4)} m²`);
console.log(`Total Internal: ${internal_total.toFixed(4)} m²`);
console.log('');

console.log('Total Surface Area (External + Internal):');
const total = external_total + internal_total;
console.log(`${total.toFixed(4)} m² per meter`);
console.log(`${total.toFixed(3)} m² per meter (3 decimal places)`);

// Test unified calculator logic
console.log('\n=== Unified Calculator Logic ===');
const width = 75, depth = 40, webThickness = 3.8, flangeThickness = 6.1;

// External: web + 2 flanges
const externalWeb = depth;
const externalFlanges = 2 * width;
const externalTotalCalc = externalWeb + externalFlanges;

// Internal: reduced dimensions  
const internalFlangeWidth = width - webThickness;
const internalWebDepth = depth - (2 * flangeThickness);
const internalTotalCalc = internalWebDepth + (2 * internalFlangeWidth);

const unified_total = (externalTotalCalc + internalTotalCalc) / 1000;
console.log(`Unified Calculator: ${unified_total.toFixed(4)} m²/m`);
console.log(`Unified Calculator: ${unified_total.toFixed(3)} m²/m (3 decimal places)`);