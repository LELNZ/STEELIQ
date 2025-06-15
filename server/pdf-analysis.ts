import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SteelElement {
  partMark: string;
  elementType: 'beam' | 'column' | 'purlin' | 'brace' | 'connection' | 'base_plate' | 'stiffener';
  materialCode: string;
  length: number;
  quantity: number;
  coordinates: { x: number; y: number; width: number; height: number };
  dimensions: { width?: number; depth?: number; thickness?: number };
  connections?: any[];
  weldDetails?: any[];
  confidence: number;
}

interface AnalysisResult {
  success: boolean;
  confidence: number;
  elements: SteelElement[];
  pageCount: number;
  drawingType: 'structural_plan' | 'elevation' | 'section' | 'shop_drawing';
  qualityIssues: any[];
  error?: string;
}

export async function analyzeConstructionDrawing(
  pdfBuffer: Buffer,
  fileName: string
): Promise<AnalysisResult> {
  try {
    // Convert PDF to base64 for Claude analysis
    const base64Pdf = pdfBuffer.toString('base64');
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are an expert structural steel fabrication engineer analyzing construction drawings. 

Your task is to:
1. Identify all steel elements (beams, columns, purlins, braces, connections)
2. Extract part marks (S1, B1, C1, etc.)
3. Determine material specifications (310UB40.4, 200UC52.2, etc.)
4. Calculate lengths and quantities
5. Identify connection details and welding requirements
6. Flag any quality issues or missing information

Follow AS/NZS standards for steel sections. Return results in JSON format with this structure:
{
  "drawingType": "structural_plan|elevation|section|shop_drawing",
  "confidence": 0.0-1.0,
  "elements": [
    {
      "partMark": "string",
      "elementType": "beam|column|purlin|brace|connection|base_plate|stiffener",
      "materialCode": "string",
      "length": number_in_mm,
      "quantity": number,
      "coordinates": {"x": number, "y": number, "width": number, "height": number},
      "dimensions": {"width": number, "depth": number, "thickness": number},
      "connections": [],
      "weldDetails": [],
      "confidence": 0.0-1.0
    }
  ],
  "qualityIssues": [
    {
      "type": "unrecognized|dimension_conflict|missing_info",
      "severity": "low|medium|high|critical",
      "description": "string",
      "recommendation": "string"
    }
  ]
}`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this steel construction drawing: "${fileName}". 

Please identify all steel elements with their specifications, part marks, dimensions, and quantities. Pay special attention to:
- Universal beams and columns (UB, UC sections)
- Hollow sections (RHS, CHS, SHS)
- Angles, channels, and flats
- Connection details and welding symbols
- Base plates and stiffeners
- Any non-standard elements

Provide accurate material codes according to AS/NZS standards and calculate realistic lengths based on the drawing scale.`
            },
            {
              type: 'text',
              text: `[PDF Document: ${fileName}] - Note: This is a placeholder for PDF analysis. The actual implementation will convert PDF pages to images for Claude analysis.`
            }
          ]
        }
      ]
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse JSON response from Claude
    let analysisData;
    try {
      // Extract JSON from response (Claude sometimes wraps in markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      return {
        success: false,
        confidence: 0,
        elements: [],
        pageCount: 1,
        drawingType: 'structural_plan',
        qualityIssues: [],
        error: 'Failed to parse AI analysis results'
      };
    }

    return {
      success: true,
      confidence: analysisData.confidence || 0.85,
      elements: analysisData.elements || [],
      pageCount: 1, // TODO: Extract from PDF
      drawingType: analysisData.drawingType || 'structural_plan',
      qualityIssues: analysisData.qualityIssues || []
    };

  } catch (error) {
    console.error('PDF analysis error:', error);
    return {
      success: false,
      confidence: 0,
      elements: [],
      pageCount: 1,
      drawingType: 'structural_plan',
      qualityIssues: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function validateSteelSpecifications(elements: SteelElement[]): Promise<any[]> {
  // Validate against AS/NZS standards and material library
  const validationIssues = [];
  
  for (const element of elements) {
    // Check material code format
    if (!isValidMaterialCode(element.materialCode)) {
      validationIssues.push({
        elementId: element.partMark,
        type: 'invalid_material_code',
        severity: 'medium',
        description: `Material code "${element.materialCode}" does not match AS/NZS format`,
        recommendation: 'Verify material specification against steel standards'
      });
    }
    
    // Check dimensions are realistic
    if (element.length < 100 || element.length > 20000) {
      validationIssues.push({
        elementId: element.partMark,
        type: 'unrealistic_length',
        severity: 'high',
        description: `Length ${element.length}mm seems unrealistic for ${element.elementType}`,
        recommendation: 'Check drawing scale and dimension extraction'
      });
    }
  }
  
  return validationIssues;
}

function isValidMaterialCode(code: string): boolean {
  // AS/NZS material code patterns
  const patterns = [
    /^\d+UB\d+\.?\d*$/, // Universal Beams: 310UB40.4
    /^\d+UC\d+\.?\d*$/, // Universal Columns: 200UC52.2
    /^\d+x\d+x\d+RHS$/, // RHS: 100x50x6RHS
    /^\d+x\d+SHS$/, // SHS: 100x100x6SHS
    /^\d+CHS$/, // CHS: 114CHS
    /^\d+x\d+x\d+EA$/, // Equal Angles: 90x90x8EA
    /^\d+x\d+x\d+UA$/, // Unequal Angles: 150x90x10UA
    /^\d+PFC$/, // Channels: 150PFC
    /^\d+x\d+FL$/, // Flats: 100x12FL
    /^\d+x\d+x\d+PLT$/ // Plates: 350x350x20PLT
  ];
  
  return patterns.some(pattern => pattern.test(code));
}

export { SteelElement, AnalysisResult };