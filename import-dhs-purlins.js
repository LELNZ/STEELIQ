/**
 * Import DHS Purlins data extracted from Diamond Hi-Span Purlins specification table
 * Data includes: DHS Section, Depth D, Width B, Thickness t, Mass (Weight Per Meter)
 * Steel Grade: G500 for thickness < 1.5mm, G450 for thickness ≥ 1.5mm
 */

const dhsPurlinsData = [
  {
    code: "DHS150/12",
    name: "DHS 150/12 Purlin",
    category: "DHS Purlins",
    depth: 150,      // Depth of Section D (mm)
    width: 65,       // Width of Section B (mm)
    thickness: 1.15, // Thickness t (mm)
    weightPerMeter: 2.99, // Mass (kg/m)
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS150/15",
    name: "DHS 150/15 Purlin",
    category: "DHS Purlins",
    depth: 150,
    width: 65,
    thickness: 1.45,
    weightPerMeter: 3.74,
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS200/12",
    name: "DHS 200/12 Purlin",
    category: "DHS Purlins",
    depth: 200,
    width: 75,
    thickness: 1.15,
    weightPerMeter: 3.71,
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS200/15",
    name: "DHS 200/15 Purlin",
    category: "DHS Purlins",
    depth: 200,
    width: 75,
    thickness: 1.45,
    weightPerMeter: 4.65,
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS200/18",
    name: "DHS 200/18 Purlin",
    category: "DHS Purlins",
    depth: 200,
    width: 75,
    thickness: 1.75,
    weightPerMeter: 5.59,
    grade: "G450",   // ≥ 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS250/13",
    name: "DHS 250/13 Purlin",
    category: "DHS Purlins",
    depth: 250,
    width: 85,
    thickness: 1.25,
    weightPerMeter: 4.87,
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS250/15",
    name: "DHS 250/15 Purlin",
    category: "DHS Purlins",
    depth: 250,
    width: 85,
    thickness: 1.45,
    weightPerMeter: 5.63,
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS250/18",
    name: "DHS 250/18 Purlin",
    category: "DHS Purlins",
    depth: 250,
    width: 85,
    thickness: 1.75,
    weightPerMeter: 6.76,
    grade: "G450",   // ≥ 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS300/15",
    name: "DHS 300/15 Purlin",
    category: "DHS Purlins",
    depth: 300,
    width: 100,
    thickness: 1.45,
    weightPerMeter: 6.66,
    grade: "G500",   // < 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS300/18",
    name: "DHS 300/18 Purlin",
    category: "DHS Purlins",
    depth: 300,
    width: 100,
    thickness: 1.75,
    weightPerMeter: 8.01,
    grade: "G450",   // ≥ 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS350/18",
    name: "DHS 350/18 Purlin",
    category: "DHS Purlins",
    depth: 350,
    width: 100,
    thickness: 1.75,
    weightPerMeter: 8.83,
    grade: "G450",   // ≥ 1.5mm thickness
    standard: "AS 1397"
  },
  {
    code: "DHS400/20",
    name: "DHS 400/20 Purlin",
    category: "DHS Purlins",
    depth: 400,
    width: 100,
    thickness: 1.95,
    weightPerMeter: 10.74,
    grade: "G450",   // ≥ 1.5mm thickness
    standard: "AS 1397"
  }
];

async function importDHSPurlins() {
  console.log('Starting DHS Purlins import...');
  
  try {
    for (const purlin of dhsPurlinsData) {
      const response = await fetch('http://localhost:5000/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: purlin.code,
          name: purlin.name,
          category: purlin.category,
          width: purlin.width.toString(),
          height: purlin.depth.toString(),
          thickness: purlin.thickness.toString(),
          weightPerMeter: purlin.weightPerMeter.toString(),
          grade: purlin.grade,
          standard: purlin.standard,
          // Manual surface area calculation - no automatic calculation for complex profile
          surfaceAreaPerMeter: null, // User input required
          standardLengths: null // No standard lengths - ordered per meter
        }),
      });

      if (response.ok) {
        console.log(`✓ Imported: ${purlin.name}`);
      } else {
        console.error(`✗ Failed to import: ${purlin.name}`, await response.text());
      }
    }
    
    console.log('DHS Purlins import completed!');
    console.log(`Total imported: ${dhsPurlinsData.length} purlin sections`);
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Execute import
importDHSPurlins();