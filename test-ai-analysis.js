const fetch = require('node-fetch');

async function testAIAnalysis() {
  try {
    // First, let's directly call the AI service
    console.log('Testing AI Analysis for Warehouse Extension PDF...\n');
    
    // Get the drawing from database
    const { DatabaseStorage } = require('./server/storage');
    const storage = new DatabaseStorage();
    
    const drawing = await storage.getDrawingDocument(2);
    console.log('Found drawing:', {
      id: drawing.id,
      fileName: drawing.originalFileName,
      projectId: drawing.projectId
    });
    
    // Get the PDF file
    const drawingStorage = require('./server/services/drawingStorageService');
    const pdfBuffer = await drawingStorage.default.getFile(drawing.fileName);
    console.log('PDF file loaded, size:', pdfBuffer.length, 'bytes\n');
    
    // Run AI analysis
    const aiService = require('./server/services/aiEstimationService');
    console.log('Starting AI analysis...\n');
    
    const result = await aiService.default.analyzeDrawingForMTO(
      pdfBuffer,
      [],
      drawing.originalFileName || drawing.fileName
    );
    
    console.log('AI ANALYSIS COMPLETE!\n');
    console.log('='.repeat(60));
    console.log('EXTRACTED STRUCTURAL STEEL ELEMENTS:');
    console.log('='.repeat(60));
    
    if (result.mtoItems && result.mtoItems.length > 0) {
      result.mtoItems.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.designation || item.id}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Description: ${item.description}`);
        console.log(`   Quantity: ${item.quantity} ${item.unit}`);
        if (item.material) console.log(`   Material: ${item.material}`);
        if (item.size) console.log(`   Size: ${item.size}`);
        if (item.weight) console.log(`   Weight: ${item.weight} kg`);
        if (item.confidence) console.log(`   AI Confidence: ${Math.round(item.confidence * 100)}%`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('HIERARCHICAL STRUCTURE:');
    console.log('='.repeat(60));
    
    if (result.hierarchicalStructure && result.hierarchicalStructure.length > 0) {
      const printHierarchy = (items, level = 0) => {
        items.forEach(item => {
          console.log('  '.repeat(level) + `├─ ${item.designation}: ${item.description}`);
          if (item.children && item.children.length > 0) {
            printHierarchy(item.children, level + 1);
          }
        });
      };
      printHierarchy(result.hierarchicalStructure);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total Elements Extracted: ${result.mtoItems?.length || 0}`);
    console.log(`AI Confidence Level: ${Math.round((result.aiAnalysis?.confidence || 0.85) * 100)}%`);
    console.log(`Processing Time: ${result.aiAnalysis?.processingTime || 'N/A'}`);
    
    // Save to database
    const savedAnalysis = await storage.createAIDrawingAnalysis({
      drawingId: 2,
      analysisType: 'mto_extraction',
      results: result,
      confidence: result.aiAnalysis?.confidence || 0.85,
      status: 'completed',
      extractedElements: result.mtoItems || [],
      hierarchicalStructure: result.hierarchicalStructure || [],
      metadata: {
        fileName: drawing.originalFileName,
        analysisVersion: '1.0'
      }
    });
    
    console.log('\n✓ Analysis saved to database with ID:', savedAnalysis.id);
    
  } catch (error) {
    console.error('Error during AI analysis:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testAIAnalysis();