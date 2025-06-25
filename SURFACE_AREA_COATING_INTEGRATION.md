# Surface Area & Coating Integration Analysis

## Current Implementation Status

### Materials Database Schema
- `surface_area_per_meter`: Decimal field storing m²/m for each material
- `weight_per_meter`: Decimal field storing kg/m for each material
- `coating_config`: JSONB field for surface area calculation preferences

### Surface Area Calculator System
- Unified calculator for all material types (SHS, RHS, UB, UC, Channels, Angles, Flats)
- Individual surface breakdown (external/internal surfaces)
- Coating type selection (external-only, internal-only, external-internal)

## Coating Calculation Requirements

### Paint Systems (per m²)
- Primer: Surface area × primer coverage rate × cost per m²
- Topcoat: Surface area × topcoat coverage rate × cost per m²
- Multi-coat systems: Each coat calculated separately

### Galvanizing (per kg)
- Hot Dip Galvanizing: Weight × price per kg
- No surface area calculation needed
- Lead time: 2-4 weeks typical

### Powder Coating (per m²)
- Surface area × powder coating rate × cost per m²
- Preparation costs may apply

## Integration Points Needed

### 1. Materials Tab → Coatings Tab Data Flow
```typescript
interface MaterialForCoating {
  materialCode: string;
  materialName: string;
  quantity: number; // meters
  surfaceAreaPerMeter: number; // m²/m
  weightPerMeter: number; // kg/m
  totalSurfaceArea: number; // quantity × surfaceAreaPerMeter
  totalWeight: number; // quantity × weightPerMeter
}
```

### 2. Automatic Coating Calculations
- When materials are added to estimation, system should:
  1. Calculate total surface area for all materials
  2. Calculate total weight for galvanizing
  3. Pre-populate coating requirements
  4. Apply coating systems to material groups

### 3. Surface Area Validation
- Each material must have accurate surface_area_per_meter value
- System validates against unified calculator
- User can override for custom situations

## Required Database Enhancements

### Enhanced Estimation Materials Table
```sql
ALTER TABLE estimation_materials ADD COLUMN surface_area_total DECIMAL(10,3);
ALTER TABLE estimation_materials ADD COLUMN weight_total DECIMAL(10,3);
ALTER TABLE estimation_materials ADD COLUMN coating_required BOOLEAN DEFAULT false;
```

### Coating Integration Table
```sql
CREATE TABLE material_coating_assignments (
  id SERIAL PRIMARY KEY,
  estimation_id INTEGER REFERENCES estimation_projects(id),
  material_id INTEGER REFERENCES estimation_materials(id),
  coating_id INTEGER REFERENCES coatings(id),
  surface_area_assigned DECIMAL(10,3),
  weight_assigned DECIMAL(10,3),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Calculation Accuracy Validation

### Current Material Surface Areas (Sample)
- SHS 35x35x3mm: 0.26 m²/m
- SHS 75x75x4mm: 0.57 m²/m
- Weight validation: SHS 75x75x4mm = 8.490 kg/m

### Formula Verification
- SHS Surface Area = 4 × width (perimeter) / 1000
- Weight calculation matches Australian steel standards
- Surface area calculations verified against manufacturer data

## Implementation Priority

1. **High Priority**: Fix margin calculation logic
2. **High Priority**: Create material → coating data flow
3. **Medium Priority**: Auto-populate coating requirements
4. **Medium Priority**: Validate all material surface areas
5. **Low Priority**: Advanced coating optimization

## Coating Supplier Integration

### In-house vs Subcontracted
- In-house: Workshop paint booth, basic primer/topcoat
- Subcontracted: Galvanizing, powder coating, specialized systems
- Supplier database integration for pricing and lead times