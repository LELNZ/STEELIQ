# V4.2 AUTO Requirements Analysis - STEELIQ

## Executive Summary
The V4.2 AUTO specification requires a comprehensive, self-learning MTO extraction system with 10+ phases of analysis. Our current implementation covers ~30% of requirements.

## Requirements vs Implementation Status

### ✅ ALREADY IMPLEMENTED (30%)

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| Pattern Pack Learning | `pattern_pack_in` / `pattern_pack_proposed` system | ✅ Working |
| Telemetry Tracking | `ai_run_telemetry` table with metrics | ✅ Working |
| Compliance Linting | Australian standards validation | ⚠️ Needs alignment |
| NO Mock Data Policy | Strict enforcement, returns empty on failure | ✅ Working |
| Progress Indicator | Shows percentage during AI analysis | ✅ Working |
| Basic MTO Extraction | Extracts beams, columns, plates | ⚠️ Basic only |

### ❌ MISSING CRITICAL FEATURES (70%)

#### PHASE -1: AUTO-CONFIG & STYLE DISCOVERY
**Required**: Self-detect standards, units, bolt grades, coatings from drawings
**Current**: NONE - We don't auto-detect anything
**Impact**: CRITICAL - This is core to "AUTO" functionality

#### PHASE 0: DOCUMENT ASSESSMENT  
**Required**: Analyze PDF mode (vector/raster), quality, text legibility
**Current**: Only checks if text < 100 chars (crude)
**Impact**: HIGH - Can't handle mixed vector/raster PDFs

#### PHASE 1: VIEW CLASSIFICATION
**Required**: Classify PLAN, ELEVATION, SECTION, DETAIL, ISOMETRIC
**Current**: NONE - No view classification
**Impact**: HIGH - Can't cross-validate across views

#### PHASE 2: COORDINATE SYSTEM
**Required**: Extract grids (A,B,C / 1,2,3), levels, north arrow
**Current**: NONE - No grid extraction
**Impact**: HIGH - Can't locate elements properly

#### PHASE 3: MEASUREMENT PROTOCOL
**Required**: Text > tagged > scale bar > grid > visual (with NTS handling)
**Current**: Just rejects scanned PDFs entirely
**Impact**: CRITICAL - Can't handle NTS drawings

#### PHASE 4: ELEMENT EXTRACTION (GAPS)
**Missing Elements**:
- BRACING (rod/angle/HSS)
- GUSSETS/LUGS
- EMBEDS/CAST-IN PLATES
- Bolt patterns (rows/cols/pitch/gauge/e1/e2)
- Weld symbols and specifications
- Tapered/cellular beams
- Copes/notches
- Shear studs

#### PHASE 5: HANDRAILS & GUARDRAILS
**Required**: Auto-detect and extract handrail assemblies
**Current**: NONE
**Impact**: MEDIUM - Missing entire category

#### PHASE 6: VALIDATION & DEDUPLICATION
**Required**: Cross-validate across multiple views
**Current**: NONE - Single view processing only
**Impact**: HIGH - Can't reconcile conflicts

#### PHASE 8: COMPUTATIONS
**Required**: Calculate mass_kg, paint_area_m2
**Current**: NONE - No mass/area calculations
**Impact**: MEDIUM - Missing key MTO outputs

#### PHASE 9: ANNOTATION & EVIDENCE
**Required**: Bbox coordinates, line interpretation
**Current**: NONE - No coordinate tracking
**Impact**: HIGH - Can't provide evidence trail

### 🔴 CRITICAL ARCHITECTURAL GAPS

1. **JSON Output Format Mismatch**
   - Spec requires specific nested structure with 13 top-level keys
   - We output simple `mtoItems` array
   
2. **No Vision API Integration**
   - Can't handle scanned PDFs (we just reject them)
   - Need OCR or Anthropic Vision API
   
3. **No Multi-Page/Multi-View Processing**
   - Process single blob, not page-by-page
   - Can't cross-reference between sheets
   
4. **Missing Database Tables**
   - Need: `view_classifications`, `grid_systems`, `measurement_references`
   - Need: `element_evidence`, `cross_view_validations`

## Fortune 50 Parity Assessment

| Criteria | V4.2 AUTO Spec | Our Implementation | Gap |
|---------|---------------|-------------------|-----|
| **Data Integrity** | Evidence trail with bbox | No evidence tracking | 🔴 CRITICAL |
| **Auditability** | Every measurement sourced | Basic only | 🔴 CRITICAL |
| **Scalability** | Handles 100+ page sets | Single blob processing | 🟡 HIGH |
| **Accuracy** | Multi-view validation | Single extraction | 🔴 CRITICAL |
| **Compliance** | 8 lint types with severity | 6 basic lints | 🟡 MEDIUM |

## Required Infrastructure Changes

### 1. Database Schema Additions
```sql
-- View management
CREATE TABLE view_classifications (
  id SERIAL PRIMARY KEY,
  ai_analysis_id INTEGER,
  page_number INTEGER,
  view_type VARCHAR(20), -- PLAN, ELEVATION, etc
  scale VARCHAR(20),
  is_nts BOOLEAN,
  quality VARCHAR(20),
  bbox JSONB
);

-- Grid systems
CREATE TABLE grid_systems (
  id SERIAL PRIMARY KEY,
  ai_analysis_id INTEGER,
  grid_letters TEXT[],
  grid_numbers TEXT[],
  levels TEXT[],
  north_direction VARCHAR(20)
);

-- Element evidence
CREATE TABLE element_evidence (
  id SERIAL PRIMARY KEY,
  element_id INTEGER,
  file_name VARCHAR(255),
  page_number INTEGER,
  bbox JSONB,
  extraction_method VARCHAR(20),
  confidence_score DECIMAL(5,2)
);
```

### 2. AI Prompt Replacement
- Current: Simple 3-phase extraction
- Required: 12-phase AUTO protocol with exact JSON format

### 3. PDF Processing Enhancement
- Add pdf-lib for page-by-page analysis
- Integrate Vision API for scanned pages
- Implement scale calibration

### 4. Service Architecture Changes
```typescript
// New services needed:
- ViewClassificationService
- GridExtractionService  
- MeasurementProtocolService
- CrossViewValidationService
- MassCalculationService
- EvidenceTrackingService
```

## Implementation Effort Estimate

| Component | Effort | Priority |
|-----------|--------|----------|
| Update AI prompt to V4.2 AUTO | 4 hours | CRITICAL |
| Add auto-config detection | 8 hours | CRITICAL |
| Implement view classification | 6 hours | HIGH |
| Add grid/coordinate extraction | 6 hours | HIGH |
| Multi-view validation | 8 hours | HIGH |
| Handrail detection | 4 hours | MEDIUM |
| Mass/paint calculations | 4 hours | MEDIUM |
| Evidence tracking with bbox | 6 hours | CRITICAL |
| Database schema updates | 4 hours | CRITICAL |
| Testing & integration | 8 hours | CRITICAL |

**Total: ~58 hours for full V4.2 AUTO compliance**

## Immediate Actions Required

1. **CRITICAL**: Update AI prompt to exact V4.2 AUTO specification
2. **CRITICAL**: Add evidence tracking (bbox coordinates)
3. **HIGH**: Implement auto-config detection
4. **HIGH**: Add view classification system
5. **MEDIUM**: Integrate Vision API for scanned PDFs

## Risk Assessment

**Without these changes:**
- ❌ Cannot claim V4.2 AUTO compliance
- ❌ Missing 70% of specified functionality
- ❌ No audit trail (Fortune 50 requirement)
- ❌ Cannot handle real-world drawing sets
- ❌ No cross-view validation (accuracy risk)