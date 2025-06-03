// Debug Channel 75x40x6.1 calculation inconsistency
console.log("Channel 75x40x6.1 Debug Calculation:");
console.log("Width: 75mm, Depth: 40mm, Web: 6.1mm, Flange: 6.1mm");
console.log("");

// Path 1: Individual surfaces (used by green footer)
const externalFlangeTop = 75 / 1000; // 0.075
const externalFlangeBottom = 75 / 1000; // 0.075  
const externalWeb = 40 / 1000; // 0.040
const externalTotal = externalFlangeTop + externalFlangeBottom + externalWeb;

const internalFlangeWidth = 75 - 6.1; // 68.9
const internalWebDepth = 40 - (2 * 6.1); // 27.8
const internalFlangeTop = internalFlangeWidth / 1000; // 0.0689
const internalFlangeBottom = internalFlangeWidth / 1000; // 0.0689
const internalWeb = internalWebDepth / 1000; // 0.0278
const internalTotal = internalFlangeTop + internalFlangeBottom + internalWeb;

console.log("Individual Surfaces Method:");
console.log(`External: ${externalFlangeTop.toFixed(4)} + ${externalFlangeBottom.toFixed(4)} + ${externalWeb.toFixed(4)} = ${externalTotal.toFixed(4)}`);
console.log(`Internal: ${internalFlangeTop.toFixed(4)} + ${internalFlangeBottom.toFixed(4)} + ${internalWeb.toFixed(4)} = ${internalTotal.toFixed(4)}`);
console.log(`Total: ${(externalTotal + internalTotal).toFixed(4)} m²`);
console.log("");

// Path 2: Unified calculator method
const unifiedExternal = (75 + 75 + 40) / 1000; // 0.190
const unifiedInternal = ((75-6.1) + (75-6.1) + (40-12.2)) / 1000; // 0.1656
const unifiedTotal = unifiedExternal + unifiedInternal;

console.log("Unified Calculator Method:");
console.log(`External: ${unifiedExternal.toFixed(4)} m²`);
console.log(`Internal: ${unifiedInternal.toFixed(4)} m²`);
console.log(`Total: ${unifiedTotal.toFixed(4)} m²`);
console.log("");

console.log("Difference Analysis:");
console.log(`External diff: ${Math.abs(externalTotal - unifiedExternal).toFixed(6)}`);
console.log(`Internal diff: ${Math.abs(internalTotal - unifiedInternal).toFixed(6)}`);
console.log(`Total diff: ${Math.abs((externalTotal + internalTotal) - unifiedTotal).toFixed(6)}`);