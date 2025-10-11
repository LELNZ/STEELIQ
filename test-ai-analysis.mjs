import { DatabaseStorage } from './server/storage.js';
import drawingStorageService from './server/services/drawingStorageService.js';
import aiEstimationService from './server/services/aiEstimationService.js';

async function testAIAnalysis() {
  try {
    // First, let's directly call the AI service
    console.log('🤖 Testing AI Analysis for Warehouse Extension PDF...\n');
    
    // Get the drawing from database
    const storage = new DatabaseStorage();
    
    const drawing = await storage.getDrawingDocument(2);
    console.log('📄 Found drawing:', {
      id: drawing.id,
      fileName: drawing.originalFileName,
      projectId: drawing.projectId
    });
    
    // Get the PDF file
    const pdfBuffer = await drawingStorageService.getFile(drawing.fileName);
    console.log('✅ PDF file loaded, size:', pdfBuffer.length, 'bytes\n');
    
    // Run AI analysis
    console.log('🔍 Starting AI analysis with Anthropic Claude Sonnet...\n');
    
    const result = await aiEstimationService.analyzeDrawingForMTO(
      pdfBuffer,
      [],
      drawing.originalFileName || drawing.fileName
    );
    
    console.log('✨ AI ANALYSIS COMPLETE!\n');
    console.log('='.repeat(70));
    console.log('📊 EXTRACTED STRUCTURAL STEEL ELEMENTS:');
    console.log('='.repeat(70));
    
    if (result.mtoItems && result.mtoItems.length > 0) {
      result.mtoItems.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.designation || item.id}`);
        console.log(`   📌 Type: ${item.type}`);
        console.log(`   📝 Description: ${item.description}`);
        console.log(`   📐 Quantity: ${item.quantity} ${item.unit}`);
        if (item.material) console.log(`   🏗️  Material: ${item.material}`);
        if (item.size) console.log(`   📏 Size: ${item.size}`);
        if (item.weight) console.log(`   ⚖️  Weight: ${item.weight} kg`);
        if (item.confidence) console.log(`   🎯 AI Confidence: ${Math.round(item.confidence * 100)}%`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🌳 HIERARCHICAL STRUCTURE (Parent-Child Relationships):');
    console.log('='.repeat(70));
    
    if (result.hierarchicalStructure && result.hierarchicalStructure.length > 0) {
      const printHierarchy = (items, level = 0) => {
        items.forEach(item => {
          const indent = '  '.repeat(level);
          const marker = level === 0 ? '🔸' : '├─';
          console.log(indent + `${marker} ${item.designation}: ${item.description}`);
          if (item.quantity) {
            console.log(indent + `   Qty: ${item.quantity} ${item.unit || ''}`);
          }
          if (item.children && item.children.length > 0) {
            printHierarchy(item.children, level + 1);
          }
        });
      };
      printHierarchy(result.hierarchicalStructure);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📈 ANALYSIS SUMMARY:');
    console.log('='.repeat(70));
    console.log(`✅ Total Elements Extracted: ${result.mtoItems?.length || 0}`);
    console.log(`🎯 AI Confidence Level: ${Math.round((result.aiAnalysis?.confidence || 0.85) * 100)}%`);
    console.log(`⏱️  Processing Time: ${result.aiAnalysis?.processingTime || 'N/A'}`);
    console.log(`🏭 Project: SHL6538 Structural Warehouse Extension`);
    
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
        analysisVersion: '1.0',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('\n✅ Analysis saved to database with ID:', savedAnalysis.id);
    console.log('\n🎉 AI Material Take-Off extraction complete! Ready for estimation.');
    
  } catch (error) {
    console.error('❌ Error during AI analysis:', error.message);
    if (error.response) {
      console.error('API Response:', error.response);
    }
  }
}

// Run the test
console.log('🚀 STEELIQ AI Estimation Engine - Fortune 50 Standard\n');
console.log('Analyzing: SHL6538_Structural_Warehouse Extension_BC.pdf\n');
testAIAnalysis();