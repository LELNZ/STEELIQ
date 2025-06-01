// Test Channel Surface Area Calculations
// Example: Cold Formed Channel 100mm x 50mm x 15mm x 2.5mm
// Width = 100mm, Depth = 50mm, Web Thickness = 2.5mm, Flange Thickness = 2.5mm
// Length = 1000mm (1 meter)

const dimensions = {
  width: 100,        // Flange width
  depth: 50,         // Web depth  
  webThickness: 2.5, // Web thickness
  flangeThickness: 2.5, // Flange thickness
  length: 1000       // 1 meter
};

console.log('Channel Calculation Test');
console.log('Dimensions:', dimensions);
console.log('');

// External Surfaces
const external_flange_top = dimensions.width * dimensions.length / 1000000; // m²
const external_flange_bottom = dimensions.width * dimensions.length / 1000000; // m²
const external_web = dimensions.depth * dimensions.length / 1000000; // m²

console.log('External Surfaces:');
console.log(`- Top Flange: ${dimensions.width}mm x ${dimensions.length}mm = ${external_flange_top.toFixed(4)} m²`);
console.log(`- Bottom Flange: ${dimensions.width}mm x ${dimensions.length}mm = ${external_flange_bottom.toFixed(4)} m²`);
console.log(`- Web: ${dimensions.depth}mm x ${dimensions.length}mm = ${external_web.toFixed(4)} m²`);
console.log(`Total External: ${(external_flange_top + external_flange_bottom + external_web).toFixed(4)} m²`);
console.log('');

// Internal Surfaces
const internal_flange_width = dimensions.width - dimensions.webThickness;
const internal_web_depth = dimensions.depth - (2 * dimensions.flangeThickness);

const internal_flange_top = internal_flange_width * dimensions.length / 1000000; // m²
const internal_flange_bottom = internal_flange_width * dimensions.length / 1000000; // m²
const internal_web = internal_web_depth * dimensions.length / 1000000; // m²

console.log('Internal Surfaces:');
console.log(`- Top Flange: (${dimensions.width} - ${dimensions.webThickness})mm x ${dimensions.length}mm = ${internal_flange_top.toFixed(4)} m²`);
console.log(`- Bottom Flange: (${dimensions.width} - ${dimensions.webThickness})mm x ${dimensions.length}mm = ${internal_flange_bottom.toFixed(4)} m²`);
console.log(`- Web: (${dimensions.depth} - 2 x ${dimensions.flangeThickness})mm x ${dimensions.length}mm = ${internal_web.toFixed(4)} m²`);
console.log(`Total Internal: ${(internal_flange_top + internal_flange_bottom + internal_web).toFixed(4)} m²`);
console.log('');

console.log('Total Surface Area (External + Internal):');
const total = external_flange_top + external_flange_bottom + external_web + internal_flange_top + internal_flange_bottom + internal_web;
console.log(`${total.toFixed(4)} m² per meter`);