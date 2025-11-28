# Wave 1.5 (AI MTO) - Immediate Next Steps

## 🚀 Quick Start Actions

### Step 1: Set Up Anthropic Claude Integration (Day 1)
```bash
# The integration is already added but needs configuration
# Need to request API key from user
```

**Required Actions:**
1. Request ANTHROPIC_API_KEY from user
2. Configure rate limiting (3 requests/second)
3. Set up vision model (claude-3-sonnet-20240229)
4. Create prompt templates for MTO extraction

### Step 2: Create AI Estimation Service (Days 2-3)

Create `server/services/aiEstimationService.ts`:
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

export class AIEstimationService {
  private anthropic: Anthropic;
  
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  
  async analyzeDrawing(file: Buffer, fileType: 'pdf' | 'dxf' | 'dwg') {
    // 1. Extract content based on file type
    // 2. Send to Claude Vision API
    // 3. Parse response for steel elements
    // 4. Match against AS/NZS patterns
    // 5. Generate hierarchical MTO
  }
}
```

### Step 3: Enhance DXF Parser (Day 4)

Update `server/services/dxfParserService.ts`:
```typescript
// Add pattern recognition for:
- Steel sections by layer name
- Dimension extraction
- Annotation parsing
- Assembly grouping
- Connection identification
```

### Step 4: Create Pattern Library (Days 5-6)

Create `server/services/steelPatterns.ts`:
```typescript
export const AS_NZS_PATTERNS = {
  'UB': { // Universal Beams
    regex: /UB\s*(\d{3})\s*x\s*(\d{2,3})\s*x\s*(\d{2})/,
    properties: ['depth', 'width', 'weight'],
    category: 'beam'
  },
  'UC': { // Universal Columns
    regex: /UC\s*(\d{3})\s*x\s*(\d{2,3})\s*x\s*(\d{2})/,
    properties: ['depth', 'width', 'weight'],
    category: 'column'
  },
  // Add all 18 patterns...
}
```

### Step 5: Build MTO Generator UI (Days 7-8)

Create `client/src/components/ai/AIEstimationPanel.tsx`:
```typescript
export function AIEstimationPanel() {
  // Features:
  // - Drag & drop drawing upload
  // - Real-time processing status
  // - Element highlighting on drawing
  // - Confidence score display
  // - Manual correction interface
  // - Export to procurement
}
```

## 📋 Immediate TODO List

### Backend Tasks
- [ ] Create `aiEstimationService.ts` with Claude integration
- [ ] Add vision API endpoint `/api/ai/analyze-drawing`
- [ ] Implement pattern matching for AS/NZS standards
- [ ] Create MTO aggregation logic
- [ ] Add learning feedback endpoint `/api/ai/feedback`

### Frontend Tasks
- [ ] Create AI estimation UI components
- [ ] Add drawing viewer with element highlighting
- [ ] Build confidence score visualization
- [ ] Implement correction workflow
- [ ] Add export to procurement button

### Database Tasks
- [ ] Add `ai_estimation_sessions` table for tracking
- [ ] Create `ai_pattern_library` table for templates
- [ ] Add `ai_learning_feedback` table for improvements
- [ ] Create `ai_confidence_scores` table for metrics

## 🎯 Week 1 Deliverables

### Monday-Tuesday
1. Get Anthropic API key configured
2. Create basic AI estimation service
3. Test with sample PDF drawing

### Wednesday-Thursday
1. Implement pattern matching
2. Parse first real drawing
3. Extract steel elements

### Friday
1. Generate first MTO
2. Create basic UI
3. Demo to stakeholders

## 📊 Success Criteria

### Technical Metrics
- Process drawing in < 60 seconds ⏱️
- Extract 90%+ of elements 🎯
- Identify all major steel sections ✅
- Generate valid MTO format 📋

### Business Metrics
- Reduce estimation time by 50% 📉
- Improve accuracy to 95%+ 📊
- Enable self-service for simple jobs 🚀
- Provide audit trail for all extractions 📝

## 🔧 Configuration Required

### Environment Variables
```env
# AI Configuration
ANTHROPIC_API_KEY=your-api-key-here
AI_MODEL_VERSION=claude-3-sonnet-20240229
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.1
AI_RATE_LIMIT=3

# Processing Settings
MAX_DRAWING_SIZE_MB=50
PROCESSING_TIMEOUT_SECONDS=120
CONFIDENCE_THRESHOLD=0.8
```

### API Endpoints to Create
```typescript
POST /api/ai/analyze-drawing
GET  /api/ai/estimation/:id
POST /api/ai/estimation/:id/correct
POST /api/ai/estimation/:id/approve
GET  /api/ai/patterns
POST /api/ai/patterns/custom
GET  /api/ai/learning/metrics
POST /api/ai/learning/feedback
```

## 🚦 Risk Mitigation

### Technical Risks
- **OCR Quality**: Use pre-processing to enhance scanned drawings
- **Pattern Variations**: Build fuzzy matching with tolerance
- **Large Files**: Implement chunking for big drawings
- **API Limits**: Add queue system for batch processing

### Business Risks
- **User Adoption**: Provide training and simple UI
- **Accuracy Concerns**: Show confidence scores clearly
- **Integration Issues**: Test with existing systems first

## 📞 Next Actions

1. **Request Anthropic API Key** from user
2. **Create AI service skeleton** 
3. **Upload sample drawings** for testing
4. **Build first pattern matcher**
5. **Demo basic extraction** capability

---

**Ready to Start Wave 1.5 Implementation!** 🚀