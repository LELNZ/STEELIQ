import { DatabaseStorage } from './server/storage';
import drawingStorageService from './server/services/drawingStorageService';
import aiEstimationService from './server/services/aiEstimationService';

async function runRealAIAnalysis() {
  console.log('🚀 STEELIQ Production AI Engine - NO MOCK DATA');
  console.log('📄 Analyzing real PDF: SHL6538_Structural_Warehouse Extension_BC.pdf');
  console.log('🤖 Using: Anthropic Claude Sonnet 4.0\n');

  const storage = new DatabaseStorage();
  const drawing = await storage.getDrawingDocument(2);

  if (!drawing) {
    console.error('❌ Drawing not found');
    process.exit(1);
  }

  console.log('✅ Found drawing in database:', drawing.originalFileName);

  // Get real PDF file
  const pdfBuffer = await drawingStorageService.getFile(drawing.fileName);
  console.log('✅ PDF loaded from storage:', pdfBuffer.length, 'bytes\n');

  console.log('🔍 Starting REAL AI analysis with Anthropic API...');
  console.log('⏳ Processing your warehouse extension drawings...\n');

  try {
    // Call the real AI service with Anthropic Claude
    const result = await aiEstimationService.analyzeDrawingForMTO(
      pdfBuffer,
      [],
      drawing.originalFileName
    );
    
    console.log('\n✨ REAL AI ANALYSIS COMPLETE!\n');
    console.log('=' + '='.repeat(70));
    console.log('📊 ACTUAL EXTRACTED ELEMENTS FROM YOUR PDF:');
    console.log('=' + '='.repeat(70));
    
    if (result.mtoItems && result.mtoItems.length > 0) {
      result.mtoItems.forEach((item: any, i: number) => {
        console.log(`\n${i+1}. ${item.designation || item.id}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Description: ${item.description}`);
        console.log(`   Quantity: ${item.quantity} ${item.unit}`);
        if (item.material) console.log(`   Material: ${item.material}`);
        if (item.size) console.log(`   Size: ${item.size}`);
        if (item.weight) console.log(`   Weight: ${item.weight} kg`);
        if (item.confidence) console.log(`   AI Confidence: ${Math.round(item.confidence * 100)}%`);
      });
    } else {
      console.log('\nNo MTO items extracted. This could mean:');
      console.log('1. The PDF might not contain structural drawings');
      console.log('2. The AI needs more specific prompting');
      console.log('3. The PDF format needs preprocessing');
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log('📈 ANALYSIS SUMMARY:');
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Total Elements Extracted: ${result.mtoItems?.length || 0}`);
    console.log(`🎯 AI Confidence: ${Math.round((result.aiAnalysis?.confidence || 0) * 100)}%`);
    console.log(`⏱️  Processing Time: ${result.aiAnalysis?.processingTime || 'N/A'}`);
    
    // Save to real database
    const saved = await storage.createAIDrawingAnalysis({
      drawingId: 2,
      analysisType: 'mto_extraction',
      results: result,
      confidence: result.aiAnalysis?.confidence || 0,
      status: 'completed',
      extractedElements: result.mtoItems || [],
      hierarchicalStructure: result.hierarchicalStructure || []
    });
    
    console.log('\n✅ Saved to production database');
    console.log('🎉 100% Production-Ready System - NO MOCK DATA');
    console.log('📊 Ready for use in Drawing Intelligence page');
    
  } catch (error: any) {
    console.error('\n❌ AI Analysis Error:', error.message);
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.log('\n⚠️  Check: ANTHROPIC_API_KEY may be invalid or expired');
    } else if (error.message?.includes('rate limit')) {
      console.log('\n⚠️  API rate limit reached. Try again in a moment.');
    } else if (error.message?.includes('timeout')) {
      console.log('\n⚠️  Request timed out. The PDF might be too large.');
    } else {
      console.log('\n📝 Full error:', error);
    }
  }
}

// Run the analysis
runRealAIAnalysis().catch(console.error);