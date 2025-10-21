# Labor Rate Management System Implementation Roadmap

## Current State Analysis

### Existing Components
1. **Team Members Table** - Has compensation fields (hourlyRate, overtimeRate, siteAllowance)
2. **Labor Defaults Table** - Only stores operation types and site premiums (no rates)
3. **Estimation Labor Table** - Stores rates per line item (no master rates)
4. **Roles & Departments** - Exist but not connected to labor rates

### Critical Gaps
- No centralized labor rate management
- No role/skill-based rate tables
- No rate history tracking
- No connection between team rates and estimations
- No overtime/allowance integration

## Implementation Phases

### Phase 1: Database Schema Enhancement (Week 1)

#### 1.1 Create Labor Rate Tables
```sql
-- Master labor rates by role and skill level
labor_rates (
  id, roleId, skillLevel, baseRate, overtimeMultiplier,
  siteAllowanceRate, effectiveDate, expiryDate, isActive
)

-- Rate history tracking
labor_rate_history (
  id, rateId, previousRate, newRate, changeReason,
  changedBy, changedAt
)

-- Project-specific rate overrides
project_labor_rates (
  id, projectId, roleId, skillLevel, customRate,
  reason, approvedBy
)

-- Skill level definitions
skill_levels (
  id, code, name, description, multiplier, requiredExperience
)
```

#### 1.2 Enhance Existing Tables
- Add roleId and skillLevel to estimationLabor
- Add default skill levels to teamMembers
- Create link between operations and required skills

### Phase 2: API Development (Week 1-2)

#### 2.1 Core Endpoints
- GET/POST/PUT `/api/labor-rates` - Manage base rates
- GET `/api/labor-rates/history/:roleId` - View rate history
- POST `/api/labor-rates/bulk-update` - Update multiple rates
- GET `/api/labor-rates/calculate` - Calculate rates with allowances

#### 2.2 Integration Endpoints
- GET `/api/estimation/:id/labor-rates` - Get rates for estimation
- POST `/api/estimation/:id/apply-team-rates` - Apply team member rates
- GET `/api/team/members/:id/rate-history` - Member rate history

### Phase 3: UI Implementation (Week 2-3)

#### 3.1 Labor Rate Management Interface
- **Location**: Operations Settings > Labor Rates tab
- **Features**:
  - Role-based rate grid with inline editing
  - Skill level multipliers configuration
  - Bulk rate updates with effective dates
  - Rate history visualization
  - Export/import functionality

#### 3.2 Estimation Integration
- **Auto-populate rates** from master tables
- **Role/skill selector** in labor tab
- **Rate override** with justification
- **Team member assignment** with automatic rate application
- **Real-time cost recalculation**

#### 3.3 Team Management Enhancement
- **Rate visibility** in team member profiles
- **Rate change notifications**
- **Skill progression tracking**
- **Rate comparison** across team members

### Phase 4: Advanced Features (Week 3-4)

#### 4.1 Rate Calculation Engine
- **Base rate × skill multiplier**
- **Overtime calculations** (1.5x, 2x rates)
- **Site allowances** (percentage or fixed)
- **Public holiday rates**
- **Night shift differentials**

#### 4.2 Reporting & Analytics
- **Labor cost analysis** by project/role/skill
- **Rate trend analysis**
- **Margin impact reporting**
- **Team utilization vs rates**

#### 4.3 Automation
- **Annual rate review reminders**
- **Automatic CPI adjustments**
- **Budget variance alerts**
- **Rate approval workflows**

## Integration Points

### 1. Estimation System
- Auto-populate labor rates based on operation type
- Calculate labor costs with proper allowances
- Track rate variances between estimate and actual

### 2. Team Management
- Display current rates in team profiles
- Track rate changes in employee history
- Link performance reviews to rate adjustments

### 3. Project Management
- Apply project-specific rate overrides
- Track labor cost performance
- Generate rate-based project reports

### 4. Financial Reporting
- Include labor rates in margin analysis
- Track labor cost trends
- Benchmark against industry standards

## Success Metrics

1. **Efficiency**: 80% reduction in manual rate entry
2. **Accuracy**: 95% rate consistency across estimations  
3. **Visibility**: Real-time rate tracking for all roles
4. **Compliance**: 100% rate history auditability
5. **Profitability**: 5% improvement in labor margin accuracy

## Risk Mitigation

1. **Data Migration**: Preserve existing estimation rates
2. **Access Control**: Role-based permissions for rate changes
3. **Validation**: Prevent unrealistic rate entries
4. **Backup**: Regular rate table backups
5. **Training**: Comprehensive user guides

## Next Steps

1. Review and approve implementation plan
2. Create detailed technical specifications
3. Set up development environment
4. Begin Phase 1 implementation
5. Schedule user training sessions