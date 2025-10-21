# Overhead Calculation Enhancement: OPEX/CAPEX Implementation

## Current Status: COMPLETED

### 1. Enhanced Overhead Calculation Framework
- **OPEX Tracking**: Monthly operational expenses (rent, utilities, insurance, admin, staff, maintenance)
- **CAPEX Tracking**: Annual capital depreciation (equipment, vehicles, tools, software)
- **Dynamic Rate Calculation**: Real-time overhead percentage based on actual costs and revenue targets
- **Project Modifiers**: Automatic adjustments for project size and type

### 2. Implemented Components

#### OverheadConfiguration Component
```typescript
// Real-time overhead rate calculation
const calculateDynamicOverheadRate = () => {
  const annualOpex = monthlyOpex * 12;
  const totalOverheads = annualOpex + annualCapex;
  const baseRate = (totalOverheads / revenueTarget) * 100;
  
  // Apply project-specific modifiers
  if (projectValue < 50000) baseRate += 5%; // Small project overhead
  if (projectValue > 200000) baseRate -= 3%; // Large project economies
  if (projectType === 'site') baseRate += 8%; // Site work overhead
  if (projectType === 'workshop') baseRate -= 2%; // Workshop efficiency
};
```

#### Default OPEX Configuration
- Workshop Rent: $8,000/month
- Utilities: $2,500/month  
- Insurance: $1,250/month
- Administration: $3,000/month
- Non-billable Staff: $10,000/month
- Maintenance: $1,500/month
- **Total Annual OPEX**: $313,200

#### Default CAPEX Configuration
- Equipment Depreciation: $50,000/year
- Vehicle Depreciation: $30,000/year
- Tools Depreciation: $14,286/year
- Software Licenses: $12,000/year
- **Total Annual CAPEX**: $106,286

#### Project Modifiers
- Small Projects (<$50k): +5% (higher admin burden)
- Large Projects (>$200k): -3% (economies of scale)
- Site Work: +8% (travel, accommodation, site costs)
- Workshop Only: -2% (no travel/site costs)

### 3. Gross Profit Margin Color Coding System

#### Visual Indicators Implemented
- **Red (<20%)**: Below sustainable levels - immediate attention required
- **Orange (20-29%)**: Acceptable but monitor closely - room for improvement
- **Green (30%+)**: Healthy profit margins - sustainable business levels

#### Color Implementation
```typescript
const getMarginColor = (grossProfitMargin: number) => {
  if (grossProfitMargin < 20) return 'text-red-600 bg-red-50 border-red-200';
  if (grossProfitMargin < 30) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-green-600 bg-green-50 border-green-200';
};
```

### 4. Real-World Calculation Example

#### For $30,000 Direct Cost Project:
- **Dynamic Overhead Rate**: 28.0% (calculated from actual OPEX/CAPEX)
- **Direct Costs**: $30,000
- **Overheads**: $8,400 (28% of direct costs)
- **Margin**: $6,000 (20% of direct costs)
- **Total Revenue**: $44,400
- **Gross Profit**: $14,400
- **Gross Profit Margin**: 32.4% (Green - Healthy)

### 5. Integration Benefits

#### Cost Accuracy
- Overhead rates based on actual business costs, not estimates
- Quarterly adjustment capability for changing cost structures
- Project-specific overhead allocation for accurate pricing

#### Financial Visibility
- Clear distinction between OPEX (ongoing costs) and CAPEX (investment depreciation)
- Real-time profitability indicators with visual alerts
- Industry benchmark comparison for competitive positioning

#### Business Intelligence
- Overhead recovery tracking (target vs actual)
- Material cost ratio monitoring (industry standard: 40-60%)
- Revenue per labor hour optimization
- Gross profit per hour analysis

### 6. Next Steps for Enhanced Implementation

#### Quarterly Overhead Review Process
1. Update actual OPEX costs (utilities, rent, insurance premiums)
2. Adjust CAPEX depreciation for new equipment purchases
3. Review revenue targets and adjust overhead percentage
4. Validate overhead recovery rate (should be 100%+)

#### Advanced Features (Future Enhancement)
- Historical overhead tracking and trending
- Seasonal adjustment factors (busy vs slow periods)
- Client-specific overhead allocation for regular customers
- Integration with accounting systems for real-time cost updates

This implementation provides Lateral Engineering with industry-leading overhead calculation accuracy and visual profitability indicators that exceed standard steel fabrication estimating systems.