# STEELIQ Test Matrix - Critical Path Coverage

## Test Coverage Requirements
- **Target Coverage:** 80% for critical paths
- **Current Coverage:** 0% (No tests implemented)
- **Priority:** P0 - Must implement before production

## Critical Path Test Scenarios

### 1. AI Estimation Pipeline

#### Unit Tests
```typescript
describe('AI Estimation Service', () => {
  test('should extract MTO from valid PDF', async () => {
    // Input: Sample structural drawing PDF
    // Expected: Hierarchical MTO with materials and operations
  });
  
  test('should handle multi-page drawings', async () => {
    // Input: 10-page construction drawing
    // Expected: Elements from all pages extracted
  });
  
  test('should apply self-learning feedback', async () => {
    // Input: MTO with user corrections
    // Expected: Pattern library updated, accuracy improved
  });
  
  test('should validate against AS/NZS standards', async () => {
    // Input: MTO with standard materials
    // Expected: All materials match AS/NZS catalog
  });
});
```

#### Integration Tests
```typescript
describe('PDF to MTO Workflow', () => {
  test('should complete full PDF analysis workflow', async () => {
    // Upload PDF → Extract text → Call AI → Parse response → Store MTO
  });
  
  test('should handle DXF file processing', async () => {
    // Upload DXF → Parse geometry → Extract elements → Generate MTO
  });
});
```

#### Golden Tests (Expected Outputs)
```typescript
const GOLDEN_TESTS = {
  'simple-beam': {
    input: 'test-drawings/simple-beam.pdf',
    expectedMTO: {
      beams: 1,
      weight: 456.7,
      operations: ['cutting', 'drilling', 'welding']
    }
  },
  'complex-structure': {
    input: 'test-drawings/complex-structure.pdf',
    expectedMTO: {
      beams: 24,
      columns: 8,
      plates: 16,
      totalWeight: 8934.5
    }
  }
};
```

### 2. Job Lifecycle Management

#### Unit Tests
```typescript
describe('Job Lifecycle Service', () => {
  test('should create job from estimation', async () => {
    // Input: Valid estimation with MTO
    // Expected: Job created with materials, requisition optional
  });
  
  test('should generate unique job numbers', async () => {
    // Input: Multiple concurrent job creations
    // Expected: All job numbers unique, sequential
  });
  
  test('should validate MTO before job creation', async () => {
    // Input: Estimation without MTO
    // Expected: Error - "No MTO elements found"
  });
});
```

#### Integration Tests
```typescript
describe('Estimation to Job Workflow', () => {
  test('should complete estimation → job → requisition flow', async () => {
    // Create estimation → Extract MTO → Create job → Generate requisition
  });
  
  test('should handle job material updates', async () => {
    // Create job → Update materials → Recalculate costs
  });
});
```

### 3. RFQ Automation

#### Unit Tests
```typescript
describe('RFQ Automation Service', () => {
  test('should match suppliers by category', async () => {
    // Input: Steel materials
    // Expected: Only steel suppliers selected
  });
  
  test('should generate RFQ from job materials', async () => {
    // Input: Job with 10 materials
    // Expected: RFQ with all materials, quantities correct
  });
  
  test('should handle multi-supplier RFQs', async () => {
    // Input: 3 suppliers selected
    // Expected: 3 separate RFQs created
  });
});
```

#### Integration Tests
```typescript
describe('Job to RFQ Workflow', () => {
  test('should complete job → requisition → RFQ → email flow', async () => {
    // Create job → Generate requisition → Create RFQs → Send emails
  });
});
```

### 4. Production Monitoring

#### Unit Tests
```typescript
describe('Production Monitoring Service', () => {
  test('should calculate OEE correctly', async () => {
    // Input: Machine logs with downtime
    // Expected: OEE = Availability × Performance × Quality
  });
  
  test('should detect production anomalies', async () => {
    // Input: Defect rate > 5%
    // Expected: Quality alert triggered
  });
});
```

#### Integration Tests
```typescript
describe('Production Event Tracking', () => {
  test('should track work order progress', async () => {
    // Create work order → Log production events → Calculate progress
  });
});
```

### 5. Cost Aggregation

#### Unit Tests
```typescript
describe('Cost Aggregation Service', () => {
  test('should aggregate costs from multiple sources', async () => {
    // Input: POs, invoices, time entries
    // Expected: Total cost calculated correctly
  });
  
  test('should calculate cost variances', async () => {
    // Input: Estimated $1000, Actual $1200
    // Expected: Variance = 20% over
  });
});
```

### 6. Authentication & Security

#### Unit Tests
```typescript
describe('Authentication', () => {
  test('should hash passwords with bcrypt', async () => {
    // Input: Plain password
    // Expected: Hashed with proper salt rounds
  });
  
  test('should enforce password complexity', async () => {
    // Input: Weak password
    // Expected: Validation error
  });
  
  test('should handle 2FA correctly', async () => {
    // Input: Valid TOTP code
    // Expected: Authentication successful
  });
});
```

#### Security Tests
```typescript
describe('Security', () => {
  test('should prevent SQL injection', async () => {
    // Input: Malicious SQL in parameters
    // Expected: Query escaped, no injection
  });
  
  test('should enforce rate limiting', async () => {
    // Input: 100 requests in 1 second
    // Expected: Rate limit error after threshold
  });
  
  test('should validate RBAC permissions', async () => {
    // Input: Basic user accessing admin endpoint
    // Expected: 403 Forbidden
  });
});
```

### 7. Database Integrity

#### Unit Tests
```typescript
describe('Database Constraints', () => {
  test('should enforce foreign key constraints', async () => {
    // Input: Insert with invalid FK
    // Expected: Constraint violation error
  });
  
  test('should maintain audit trail', async () => {
    // Input: Any database modification
    // Expected: Audit event created
  });
  
  test('should use sequences for numbering', async () => {
    // Input: Create multiple entities
    // Expected: Sequential numbers, no gaps
  });
});
```

### 8. Email Integration

#### Unit Tests
```typescript
describe('Email Service', () => {
  test('should send RFQ emails', async () => {
    // Input: RFQ data
    // Expected: Email sent with correct template
  });
  
  test('should handle SendGrid failures', async () => {
    // Input: SendGrid API error
    // Expected: Retry with exponential backoff
  });
});
```

### 9. Error Handling

#### Unit Tests
```typescript
describe('Error Recovery', () => {
  test('should handle AI API failures', async () => {
    // Input: Anthropic API timeout
    // Expected: Graceful degradation, user notified
  });
  
  test('should recover from database errors', async () => {
    // Input: Connection pool exhausted
    // Expected: Retry with backoff, eventual success
  });
});
```

### 10. Data Validation

#### Unit Tests
```typescript
describe('Data Validation', () => {
  test('should reject mock data', async () => {
    // Input: Math.random() in data
    // Expected: NoMockDataViolationError
  });
  
  test('should validate material dimensions', async () => {
    // Input: Negative dimensions
    // Expected: Validation error
  });
});
```

## E2E Test Scenarios

### Complete Workflow Test
```typescript
describe('Full Lifecycle E2E', () => {
  test('should complete entire workflow', async () => {
    // Step 1: Upload drawing PDF
    // Step 2: AI extracts MTO
    // Step 3: Create estimation
    // Step 4: Convert to job
    // Step 5: Generate requisition
    // Step 6: Create RFQs
    // Step 7: Send to suppliers
    // Step 8: Receive quotes
    // Step 9: Generate PO
    // Step 10: Track production
    // Step 11: Calculate costs
    // Step 12: Generate invoice
    
    // Expected: All steps complete without errors
    // Data integrity maintained throughout
  });
});
```

## Performance Tests

### Load Testing
```typescript
describe('Performance', () => {
  test('should handle 100 concurrent users', async () => {
    // Input: 100 simultaneous requests
    // Expected: P95 < 500ms, no errors
  });
  
  test('should process large PDFs', async () => {
    // Input: 100-page PDF
    // Expected: Complete within 60 seconds
  });
});
```

## Test Implementation Priority

### P0 - Critical (Implement immediately)
1. AI Estimation golden tests
2. Job lifecycle integration tests
3. Authentication security tests
4. Database constraint tests

### P1 - High (Week 1)
1. RFQ automation tests
2. Cost aggregation tests
3. Error handling tests
4. Data validation tests

### P2 - Medium (Week 2)
1. Production monitoring tests
2. Email integration tests
3. Performance tests
4. Full E2E workflow

## Test Infrastructure Requirements

### Tools Needed
- **Test Runner:** Jest or Vitest
- **E2E Framework:** Playwright or Cypress
- **Load Testing:** K6 or Artillery
- **Mocking:** MSW for API mocking
- **Coverage:** Istanbul for coverage reports

### Test Data Requirements
- Sample PDFs (various complexities)
- DXF test files
- Mock supplier data
- Test user accounts
- Sample material catalogs

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Success Criteria

### Coverage Targets
- Unit Tests: 80% coverage
- Integration Tests: 100% critical paths
- E2E Tests: All user workflows
- Security Tests: All endpoints

### Performance Targets
- Test execution: < 5 minutes
- E2E suite: < 15 minutes
- Flakiness: < 1%

### Quality Gates
- No release without passing tests
- Coverage must not decrease
- Performance regression fails build
- Security tests mandatory

---
*Test Matrix Version: 1.0*  
*Next Review: After initial implementation*