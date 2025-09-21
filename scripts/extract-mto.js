import fs from 'fs';
import pdf from 'pdf-parse';

async function extractMaterialsFromPDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  
  // Extract text from PDF
  const text = data.text;
  
  // Regular expressions for structural steel sections
  const patterns = {
    universalBeams: /(\d+)UB([\d.]+)/g,
    universalColumns: /(\d+)UC([\d.]+)/g, 
    parallelFlangeChannels: /(\d+)PFC([\d.]+)/g,
    squareHollowSections: /(\d+)x(\d+)x([\d.]+)\s*SHS/g,
    rectangularHollowSections: /(\d+)x(\d+)x([\d.]+)\s*RHS/g,
    circularHollowSections: /(\d+)CHS([\d.]+)/g,
    plates: /PLATE\s+(\d+)MM/gi,
    bolts: /M(\d+)\s+BOLTS/gi,
    angles: /(\d+)x(\d+)x([\d.]+)\s*EA/g,
    roundBars: /(\d+)DIA\s+BAR/g
  };
  
  const materials = [];
  const processedMaterials = new Set();
  
  // Extract Universal Beams
  let match;
  while ((match = patterns.universalBeams.exec(text)) !== null) {
    const section = `${match[1]}UB${match[2]}`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'BEAM', section, grade: '300' });
      processedMaterials.add(section);
    }
  }
  
  // Extract Universal Columns
  while ((match = patterns.universalColumns.exec(text)) !== null) {
    const section = `${match[1]}UC${match[2]}`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'COLUMN', section, grade: '300' });
      processedMaterials.add(section);
    }
  }
  
  // Extract PFC sections
  while ((match = patterns.parallelFlangeChannels.exec(text)) !== null) {
    const section = `${match[1]}PFC${match[2]}`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'CHANNEL', section, grade: '300' });
      processedMaterials.add(section);
    }
  }
  
  // Extract SHS sections
  while ((match = patterns.squareHollowSections.exec(text)) !== null) {
    const section = `${match[1]}x${match[2]}x${match[3]} SHS`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'SHS', section, grade: '300' });
      processedMaterials.add(section);
    }
  }
  
  // Extract RHS sections
  while ((match = patterns.rectangularHollowSections.exec(text)) !== null) {
    const section = `${match[1]}x${match[2]}x${match[3]} RHS`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'RHS', section, grade: '300' });
      processedMaterials.add(section);
    }
  }
  
  // Extract Plates
  while ((match = patterns.plates.exec(text)) !== null) {
    const section = `PLATE ${match[1]}MM`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'PLATE', section, grade: '250' });
      processedMaterials.add(section);
    }
  }
  
  // Extract Bolts
  while ((match = patterns.bolts.exec(text)) !== null) {
    const section = `M${match[1]} BOLTS`;
    if (!processedMaterials.has(section)) {
      materials.push({ type: 'BOLTS', section, grade: 'GRADE 8.8' });
      processedMaterials.add(section);
    }
  }
  
  return {
    pageCount: data.numpages,
    materials,
    metadata: data.info
  };
}

// Run extraction
const pdfPath = './uploads/drawings/SHL6538_Warehouse_Extension.pdf';
extractMaterialsFromPDF(pdfPath)
  .then(result => {
    console.log('PDF Analysis Results:');
    console.log(`Total Pages: ${result.pageCount}`);
    console.log(`\nMaterials Found (${result.materials.length} unique items):`);
    console.log('=====================================');
    
    result.materials.forEach((material, index) => {
      console.log(`${index + 1}. ${material.type}: ${material.section} (Grade: ${material.grade})`);
    });
    
    // Save to JSON for processing
    fs.writeFileSync('./uploads/drawings/extracted_materials.json', JSON.stringify(result, null, 2));
    console.log('\n✓ Materials saved to extracted_materials.json');
  })
  .catch(err => console.error('Error:', err));