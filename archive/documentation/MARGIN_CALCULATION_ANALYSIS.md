# Margin Calculation Analysis & Industry Standards

## Current Implementation Issues Found

### Problem 1: Inconsistent Calculation Base
- **Current Logic**: `margin = (directCosts + overheads) * margin%`
- **Issue**: This compounds margin on top of overheads, inflating final price

### Problem 2: Industry Standard vs Current
- **Industry Standard**: Margin should be calculated on direct costs before overheads
- **Steel Fabrication Industry**: 15-25% margin on direct costs is standard

## Industry Standard Margin Calculation Methods

### Method 1: Margin on Direct Costs (Recommended)
```
Direct Costs = Materials + Labor + Equipment + Consumables + Coatings
Overheads = Direct Costs × Overhead%
Margin = Direct Costs × Margin%
Total = Direct Costs + Overheads + Margin
```

### Method 2: Markup on Total Costs (Alternative)
```
Direct Costs = Materials + Labor + Equipment + Consumables + Coatings
Overheads = Direct Costs × Overhead%
Subtotal = Direct Costs + Overheads
Margin = Subtotal × Margin%
Total = Subtotal + Margin
```

### Method 3: Gross Profit Margin (Financial Reporting)
```
Gross Profit Margin = (Revenue - COGS) / Revenue × 100
Where COGS = Direct Materials + Direct Labor + Direct Production Costs
```

## Steel Fabrication Industry Benchmarks

### Margin Standards
- **Small Projects (<$50k)**: 20-30% margin
- **Medium Projects ($50k-$500k)**: 15-25% margin
- **Large Projects (>$500k)**: 10-20% margin

### Cost Structure Benchmarks
- **Direct Costs**: 60-70% of total revenue
- **Overheads**: 15-25% of direct costs
- **Margin**: 15-25% of direct costs
- **Material Cost Ratio**: 40-60% of direct costs

## Recommended Implementation

### Fixed Calculation Logic
```typescript
const directCosts = materials + labor + equipment + consumables + coatings;
const overheads = directCosts * (overheadPercentage / 100);
const margin = directCosts * (marginPercentage / 100);
const subtotal = directCosts + overheads + margin;
const gst = subtotal * 0.15; // NZ GST
const total = subtotal + gst;
```

### Key Performance Indicators
1. **Gross Profit Percentage**: (Revenue - DirectCosts) / Revenue × 100
2. **Gross Profit per Hour**: GrossProfit / TotalLaborHours
3. **Material Cost Ratio**: Materials / DirectCosts × 100
4. **Overhead Recovery Rate**: RecoveredOverheads / ActualOverheads × 100

## Validation Rules
- Margin should typically be 15-25% for steel fabrication
- Direct costs should be 60-70% of total revenue
- Material costs should be 40-60% of direct costs
- Overhead recovery should aim for 100%+