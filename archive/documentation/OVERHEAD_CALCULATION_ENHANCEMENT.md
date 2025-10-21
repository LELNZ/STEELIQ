# Overhead Calculation Enhancement: OPEX/CAPEX Integration

## Current Overhead Calculation (Basic)
```typescript
const overheads = directCosts × (overheadPercentage / 100);
```

## Enhanced Overhead Calculation Framework

### 1. Operational Expenses (OPEX) - Monthly/Annual
- **Workshop Rent**: $8,000/month × 12 = $96,000/year
- **Utilities**: Power, gas, water - $2,500/month × 12 = $30,000/year
- **Insurance**: Public liability, equipment, workers comp - $15,000/year
- **Administration**: Office rent, accounting, software licenses - $36,000/year
- **Staff Overhead**: Non-billable staff costs - $120,000/year

**Total Annual OPEX**: $297,000

### 2. Capital Expenses (CAPEX) - Depreciation
- **Workshop Equipment**: $500,000 over 10 years = $50,000/year
- **Vehicles**: $150,000 over 5 years = $30,000/year
- **Tools & Machinery**: $100,000 over 7 years = $14,286/year

**Total Annual CAPEX Depreciation**: $94,286

### 3. Dynamic Overhead Rate Calculation
```typescript
const annualRevenue = 1500000; // $1.5M annual revenue target
const totalOverheads = annualOPEX + annualCAPEX; // $391,286
const overheadRate = (totalOverheads / annualRevenue) * 100; // 26.1%
```

### 4. Project-Specific Overhead Adjustments
- **Small Projects (<$50k)**: Base rate + 5% (higher admin burden)
- **Large Projects (>$200k)**: Base rate - 3% (economies of scale)
- **Site Work**: Base rate + 8% (travel, accommodation, site costs)
- **Workshop Only**: Base rate - 2% (no travel/site costs)

## Proposed Input Form for Overhead Management

### Monthly OPEX Tracking:
- Workshop rent/lease
- Utilities (power, gas, water)
- Insurance premiums
- Administration costs
- Non-billable staff costs
- Maintenance and repairs

### Annual CAPEX Planning:
- Equipment purchases and depreciation
- Vehicle costs and depreciation
- Software licenses and subscriptions
- Facility improvements

### Real-Time Overhead Rate:
- Quarterly adjustment based on actual costs
- Revenue-based scaling
- Project type modifiers

## Gross Profit Margin Color Coding System

### Proposed Thresholds:
- **Red (<20%)**: Below sustainable levels
- **Orange (20-29%)**: Acceptable but monitor closely
- **Green (30%+)**: Healthy profit margins

### Implementation:
```typescript
const getMarginColor = (grossProfitMargin: number) => {
  if (grossProfitMargin < 20) return 'text-red-600 bg-red-50';
  if (grossProfitMargin < 30) return 'text-orange-600 bg-orange-50';
  return 'text-green-600 bg-green-50';
};
```