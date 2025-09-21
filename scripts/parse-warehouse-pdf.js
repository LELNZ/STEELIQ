import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractMaterialsFromPDF(pdfPath) {
  try {
    // Import pdf-parse dynamically to avoid initialization issues
    const { default: pdfParse } = await import('pdf-parse');
    
    // Read PDF file
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Parse PDF
    console.log('Parsing PDF...');
    const data = await pdfParse(dataBuffer);
    
    // Extract text from PDF
    const text = data.text;
    
    // Save raw text for inspection
    fs.writeFileSync('./uploads/drawings/raw_text.txt', text);
    console.log('Raw text saved to raw_text.txt');
    
    // Find material specifications in the text
    const materials = [];
    const lines = text.split('\n');
    
    // Look for common structural steel patterns
    lines.forEach((line) => {
      // Universal Beams (e.g., 310UB40.4)
      const ubMatch = line.match(/(\d{3})UB([\d.]+)/);
      if (ubMatch) {
        materials.push({
          type: 'BEAM',
          section: `${ubMatch[1]}UB${ubMatch[2]}`,
          description: line.trim()
        });
      }
      
      // Universal Columns (e.g., 200UC59.5)
      const ucMatch = line.match(/(\d{3})UC([\d.]+)/);
      if (ucMatch) {
        materials.push({
          type: 'COLUMN',
          section: `${ucMatch[1]}UC${ucMatch[2]}`,
          description: line.trim()
        });
      }
      
      // SHS sections (e.g., 100x100x6 SHS)
      const shsMatch = line.match(/(\d+)x(\d+)x([\d.]+)\s*SHS/);
      if (shsMatch) {
        materials.push({
          type: 'SHS',
          section: `${shsMatch[1]}x${shsMatch[2]}x${shsMatch[3]} SHS`,
          description: line.trim()
        });
      }
      
      // RHS sections (e.g., 150x100x5 RHS)
      const rhsMatch = line.match(/(\d+)x(\d+)x([\d.]+)\s*RHS/);
      if (rhsMatch) {
        materials.push({
          type: 'RHS',
          section: `${rhsMatch[1]}x${rhsMatch[2]}x${rhsMatch[3]} RHS`,
          description: line.trim()
        });
      }
      
      // Plates (e.g., PLATE 20MM)
      const plateMatch = line.match(/PLATE\s+(\d+)MM/i);
      if (plateMatch) {
        materials.push({
          type: 'PLATE',
          section: `PLATE ${plateMatch[1]}MM`,
          description: line.trim()
        });
      }
    });
    
    return {
      pageCount: data.numpages,
      materials,
      metadata: data.info
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

// Run extraction
const pdfPath = path.join(path.dirname(__dirname), 'uploads/drawings/SHL6538_Warehouse_Extension.pdf');
console.log('Processing PDF:', pdfPath);

extractMaterialsFromPDF(pdfPath)
  .then(result => {
    console.log('\nPDF Analysis Results:');
    console.log(`Total Pages: ${result.pageCount}`);
    console.log(`\nMaterials Found (${result.materials.length} items):`);
    console.log('=====================================');
    
    // Group materials by type
    const groupedMaterials = {};
    result.materials.forEach(material => {
      if (!groupedMaterials[material.type]) {
        groupedMaterials[material.type] = [];
      }
      groupedMaterials[material.type].push(material.section);
    });
    
    Object.entries(groupedMaterials).forEach(([type, sections]) => {
      console.log(`\n${type}:`);
      const uniqueSections = [...new Set(sections)];
      uniqueSections.forEach(section => console.log(`  - ${section}`));
    });
    
    // Save to JSON for processing
    fs.writeFileSync('./uploads/drawings/extracted_materials.json', JSON.stringify(result, null, 2));
    console.log('\n✓ Materials saved to extracted_materials.json');
  })
  .catch(err => console.error('Error:', err));