// Populate Connection Components with Excel Data
// This script imports the standard section plates data from the Excel sheet

import { db } from "./db";
import { connectionComponents } from "@shared/schema";

// Excel data from the screenshot - END PLATES
const endPlatesData = [
  // 50PFC series
  { section: "50PFC", height: 100, width: 50, weld_time: 0.325 },
  { section: "65PFC", height: 125, width: 65, weld_time: 0.38 },
  { section: "80PFC", height: 150, width: 75, weld_time: 0.435 },
  { section: "100PFC", height: 180, width: 90, weld_time: 0.505 },
  { section: "125PFC", height: 220, width: 110, weld_time: 0.615 },
  { section: "150PFC", height: 250, width: 125, weld_time: 0.695 },
  { section: "180PFC", height: 300, width: 150, weld_time: 0.835 },
  { section: "200PFC", height: 340, width: 170, weld_time: 0.945 },
  { section: "230PFC", height: 380, width: 190, weld_time: 1.055 },
  { section: "250PFC", height: 410, width: 205, weld_time: 1.14 },
  { section: "300PFC", height: 500, width: 250, weld_time: 1.385 },
  { section: "380PFC", height: 600, width: 300, weld_time: 1.665 },
  
  // UB sections
  { section: "150UB14", height: 150, width: 75, weld_time: 0.425 },
  { section: "150UB18", height: 150, width: 75, weld_time: 0.425 },
  { section: "180UB16", height: 175, width: 90, weld_time: 0.484 },
  { section: "180UB22", height: 175, width: 90, weld_time: 0.484 },
  { section: "200UB18", height: 195, width: 100, weld_time: 0.521 },
  { section: "200UB22", height: 200, width: 100, weld_time: 0.535 },
  { section: "200UB25", height: 207, width: 134, weld_time: 0.6 },
  { section: "200UB30", height: 207, width: 134, weld_time: 0.6 },
  { section: "250UB26", height: 248, width: 124, weld_time: 0.621 },
  { section: "250UB31", height: 252, width: 146, weld_time: 0.669 },
  { section: "250UB37", height: 256, width: 146, weld_time: 0.673 },
  { section: "310UB32", height: 308, width: 149, weld_time: 0.771 },
  { section: "310UB40", height: 314, width: 165, weld_time: 0.799 },
  { section: "310UB46", height: 307, width: 165, weld_time: 0.784 },
  { section: "360UB45", height: 352, width: 171, weld_time: 0.818 },
  { section: "360UB51", height: 356, width: 172, weld_time: 0.825 },
  { section: "360UB57", height: 363, width: 172, weld_time: 0.836 },
  { section: "410UB54", height: 403, width: 178, weld_time: 0.864 },
  { section: "410UB60", height: 406, width: 178, weld_time: 0.867 },
  { section: "460UB67", height: 454, width: 190, weld_time: 0.909 },
  { section: "460UB75", height: 460, width: 190, weld_time: 0.922 },
  { section: "460UB82", height: 460, width: 191, weld_time: 0.924 },
  { section: "530UB75", height: 526, width: 209, weld_time: 1.071 },
  { section: "530UB82", height: 533, width: 209, weld_time: 1.076 },
  { section: "610UB101", height: 602, width: 228, weld_time: 1.183 },
  { section: "610UB113", height: 607, width: 229, weld_time: 1.186 },
  { section: "610UB125", height: 612, width: 229, weld_time: 1.195 },
  
  // UC sections  
  { section: "100UC15", height: 97, width: 99, weld_time: 0.392 },
  { section: "150UC23", height: 152, width: 152, weld_time: 0.561 },
  { section: "150UC30", height: 158, width: 158, weld_time: 0.586 },
  { section: "200UC46", height: 203, width: 203, weld_time: 0.734 },
  { section: "200UC52", height: 206, width: 204, weld_time: 0.739 },
  { section: "250UC60", height: 219, width: 205, weld_time: 0.746 },
  { section: "250UC73", height: 254, width: 254, weld_time: 0.867 },
  { section: "250UC89", height: 260, width: 256, weld_time: 0.881 },
  { section: "310UC97", height: 308, width: 305, weld_time: 1.043 },
  { section: "310UC118", height: 314, width: 307, weld_time: 1.064 },
  { section: "310UC137", height: 320, width: 309, weld_time: 1.063 },
  { section: "310UC158", height: 327, width: 311, weld_time: 1.074 }
];

// Excel data from the screenshot - STIFFENER PLATES
const stiffenerPlatesData = [
  // 50PFC series stiffeners
  { section: "50PFC", height: 86, width: 45, weld_time: 0.301 },
  { section: "65PFC", height: 101, width: 58, weld_time: 0.351 },
  { section: "80PFC", height: 131, width: 68, weld_time: 0.394 },
  { section: "100PFC", height: 158, width: 83, weld_time: 0.471 },
  { section: "125PFC", height: 193, width: 103, weld_time: 0.558 },
  { section: "150PFC", height: 230, width: 118, weld_time: 0.639 },
  { section: "180PFC", height: 273, width: 143, weld_time: 0.746 },
  { section: "200PFC", height: 308, width: 163, weld_time: 0.833 },
  { section: "230PFC", height: 352, width: 183, weld_time: 0.931 },
  { section: "250PFC", height: 383, width: 198, weld_time: 1.014 },
  { section: "300PFC", height: 463, width: 243, weld_time: 1.211 },
  { section: "380PFC", height: 563, width: 293, weld_time: 1.441 },
  
  // UB sections stiffeners  
  { section: "150UB14", height: 136, width: 35, weld_time: 0.405 },
  { section: "150UB18", height: 136, width: 35, weld_time: 0.405 },
  { section: "180UB16", height: 159, width: 43, weld_time: 0.47 },
  { section: "180UB22", height: 159, width: 42, weld_time: 0.468 },
  { section: "200UB18", height: 182, width: 47.25, weld_time: 0.485 },
  { section: "200UB22", height: 184, width: 64, weld_time: 0.541 },
  { section: "200UB25", height: 184, width: 64, weld_time: 0.541 },
  { section: "200UB30", height: 187, width: 62, weld_time: 0.541 },
  { section: "250UB26", height: 232, width: 60, weld_time: 0.567 },
  { section: "250UB31", height: 232, width: 60, weld_time: 0.567 },
  { section: "250UB37", height: 239, width: 70, weld_time: 0.5837 },
  { section: "310UB32", height: 292, width: 79, weld_time: 0.8598 },
  { section: "310UB40", height: 284, width: 80, weld_time: 0.8675 },
  { section: "310UB46", height: 281, width: 85, weld_time: 0.877 },
  { section: "360UB45", height: 333, width: 83.5, weld_time: 0.823 },
  { section: "360UB51", height: 333, width: 83.5, weld_time: 0.823 },
  { section: "360UB57", height: 341, width: 91, weld_time: 0.7351 },
  { section: "410UB54", height: 381, width: 83, weld_time: 0.7361 },
  { section: "410UB60", height: 384, width: 91, weld_time: 0.8751 },
  { section: "460UB67", height: 429, width: 91, weld_time: 0.7351 },
  { section: "460UB75", height: 432, width: 91, weld_time: 0.7361 },
  { section: "460UB82", height: 429, width: 100, weld_time: 0.826 },
  { section: "530UB75", height: 502, width: 100, weld_time: 0.826 },
  { section: "530UB82", height: 562, width: 109, weld_time: 0.888 },
  { section: "610UB101", height: 573, width: 109, weld_time: 0.92 },
  { section: "610UB113", height: 573, width: 109, weld_time: 0.918 },
  { section: "610UB125", height: 573, width: 109, weld_time: 0.918 },
  
  // UC sections stiffeners
  { section: "100UC15", height: 83, width: 47, weld_time: 0.392 },
  { section: "150UC23", height: 138, width: 73, weld_time: 0.490 },
  { section: "150UC30", height: 139, width: 73, weld_time: 0.1102 },
  { section: "200UC46", height: 181, width: 98, weld_time: 0.502 },
  { section: "200UC52", height: 181, width: 98, weld_time: 0.502 },
  { section: "250UC60", height: 162, width: 98, weld_time: 0.502 },
  { section: "250UC73", height: 237, width: 123, weld_time: 0.907 },
  { section: "250UC89", height: 237, width: 123, weld_time: 0.907 },
  { section: "310UC97", height: 277, width: 148, weld_time: 0.898 },
  { section: "310UC118", height: 277, width: 148, weld_time: 0.8977 },
  { section: "310UC137", height: 277, width: 148, weld_time: 0.8977 },
  { section: "310UC158", height: 277, width: 148, weld_time: 0.8977 }
];

export async function populateConnectionComponents() {
  try {
    console.log("Starting connection components population...");

    // Transform end plates data
    const endPlates = endPlatesData.map(item => ({
      component_type: "end_plate",
      section_compatibility: item.section,
      name: `${item.section} End Plate`,
      height: item.height,
      width: item.width,
      thickness: 10, // Default thickness - can be updated later
      weld_time_per_hour: item.weld_time,
      labor_time: item.weld_time * 60, // Convert to minutes
      material_grade: "250",
      weight: (item.height * item.width * 10 * 7.85) / 1000000, // Calculate weight in kg (7.85 kg/dm³)
      surface_area: ((item.height * item.width * 2) + (item.height * 10 * 2) + (item.width * 10 * 2)) / 1000000, // Surface area in m²
      material_cost: 0, // To be set later
      unit: "each",
      category: "connections",
      subcategory: "structural",
      standard: "AS/NZS 3678",
      specification: `Standard end plate for ${item.section} sections`,
      is_standard: true,
      is_active: true
    }));

    // Transform stiffener plates data  
    const stiffenerPlates = stiffenerPlatesData.map(item => ({
      component_type: "stiffener_plate",
      section_compatibility: item.section,
      name: `${item.section} Stiffener Plate`,
      height: item.height,
      width: item.width,
      thickness: 8, // Default thickness for stiffeners
      weld_time_per_hour: item.weld_time,
      labor_time: item.weld_time * 60, // Convert to minutes
      material_grade: "250",
      weight: (item.height * item.width * 8 * 7.85) / 1000000, // Calculate weight in kg
      surface_area: ((item.height * item.width * 2) + (item.height * 8 * 2) + (item.width * 8 * 2)) / 1000000, // Surface area in m²
      material_cost: 0, // To be set later
      unit: "each",
      category: "connections",
      subcategory: "structural",
      standard: "AS/NZS 3678",
      specification: `Standard stiffener plate for ${item.section} sections`,
      is_standard: true,
      is_active: true
    }));

    // Combine all components
    const allComponents = [...endPlates, ...stiffenerPlates];

    // Insert into database
    const result = await db.insert(connectionComponents).values(allComponents).returning();

    console.log(`Successfully imported ${result.length} connection components:`);
    console.log(`- ${endPlates.length} end plates`);
    console.log(`- ${stiffenerPlates.length} stiffener plates`);

    return result;
  } catch (error) {
    console.error("Error populating connection components:", error);
    throw error;
  }
}

// Run the population script
populateConnectionComponents()
  .then(() => {
    console.log("Population completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Population failed:", error);
    process.exit(1);
  });