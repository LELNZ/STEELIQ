/**
 * Add demonstration UB and Square Bar materials to test the Material Library
 */

const steel_materials = [
  // Universal Beams
  {
    code: "UB200x90",
    name: "200UB25.4",
    category: "Universal Beam",
    width: "203",
    depth: "90", 
    webTw: "5.8",
    flangeTf: "10.2",
    weightPerMeter: "25.4",
    pricePerMeter: "45.20",
    standard: "AS/NZS 3679.1",
    grade: "300",
    supplier: "ASMUSS Steel"
  },
  {
    code: "UB250x125",
    name: "250UB31.4",
    category: "Universal Beam", 
    width: "250",
    depth: "125", 
    webTw: "6.0",
    flangeTf: "11.5",
    weightPerMeter: "31.4",
    pricePerMeter: "55.80",
    standard: "AS/NZS 3679.1",
    grade: "300",
    supplier: "ASMUSS Steel"
  },
  {
    code: "UB310x165",
    name: "310UB46.2",
    category: "Universal Beam",
    width: 314,
    depth: 165,
    webTw: 6.7,
    flangeTf: 13.0,
    weightPerMeter: 46.2,
    pricePerMeter: 82.00,
    standard: "AS/NZS 3679.1",
    grade: "300",
    supplier: "ASMUSS Steel"
  },
  
  // Square Bars
  {
    code: "SQ12",
    name: "12x12 Square Bar",
    category: "Square Bar",
    width: 12,
    depth: 12,
    weightPerMeter: 1.13,
    pricePerMeter: 2.80,
    standard: "AS/NZS 3678",
    grade: "250",
    supplier: "ASMUSS Steel"
  },
  {
    code: "SQ20",
    name: "20x20 Square Bar", 
    category: "Square Bar",
    width: 20,
    depth: 20,
    weightPerMeter: 3.14,
    pricePerMeter: 7.20,
    standard: "AS/NZS 3678",
    grade: "250",
    supplier: "ASMUSS Steel"
  },
  {
    code: "SQ25",
    name: "25x25 Square Bar",
    category: "Square Bar", 
    width: 25,
    depth: 25,
    weightPerMeter: 4.91,
    pricePerMeter: 11.50,
    standard: "AS/NZS 3678",
    grade: "250",
    supplier: "ASMUSS Steel"
  },
  {
    code: "SQ30",
    name: "30x30 Square Bar",
    category: "Square Bar",
    width: 30,
    depth: 30,
    weightPerMeter: 7.07,
    pricePerMeter: 16.80,
    standard: "AS/NZS 3678",
    grade: "250", 
    supplier: "ASMUSS Steel"
  }
];

// Add materials via API
async function addDemoMaterials() {
  console.log('Adding demonstration steel materials...');
  
  for (const material of steel_materials) {
    try {
      const response = await fetch('http://localhost:5000/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material)
      });
      
      if (response.ok) {
        console.log(`✓ Added: ${material.name}`);
      } else {
        console.log(`✗ Failed: ${material.name}`);
      }
    } catch (error) {
      console.log(`✗ Error adding ${material.name}:`, error.message);
    }
  }
  
  console.log('Demo materials added successfully!');
}

addDemoMaterials();