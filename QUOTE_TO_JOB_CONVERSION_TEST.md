# Quote-to-Job Conversion Test Plan

## Current State
- **Estimation**: "Steel Platform for Manufacturing Plant" (ID: 4)
- **Status**: Accepted (shown in green Won column)
- **Total Value**: $86,455.10
- **Data Loaded**: 
  - 3 Materials
  - 3 Labor entries (280 total hours)
  - 2 Equipment items
  - 2 Consumables
  - 1 Coating system

## Test Steps

### 1. Navigate to Estimation Pipeline
- Go to the Estimation Pipeline page
- Locate "Steel Platform for Manufacturing Plant" in the Won column (green)
- Verify it shows status "Accepted"

### 2. Create Job from Quote
- Click the "Create Job" button on the estimation card
- System should create a new job with:
  - Job number (auto-generated)
  - Client details from estimation
  - Project description
  - All cost data transferred

### 3. Verify Job Creation
- Check if redirected to Jobs page or new job details
- Confirm all data transferred:
  - Material costs
  - Labor hours and rates
  - Equipment costs
  - Consumables
  - Coating systems
  - Total project value

### 4. Check Database Relationships
- Job should have `estimation_id = 4`
- Original estimation should remain unchanged
- Resource allocations should be initialized

## Expected Results
- Seamless conversion from accepted quote to active job
- All financial data preserved
- Ready for production tracking and execution

## Known Issues to Watch For
- API endpoint for job creation from estimation
- Data mapping between estimation and job structures
- Proper status updates after conversion