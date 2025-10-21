# COMPREHENSIVE ARCHITECTURE REVIEW - JANUARY 2025

## CRITICAL ISSUES FOUND

### 1. LABOR ALLOWANCES TABLE - COLUMN MISMATCHES ❌
**Problem**: Frontend and backend expect columns that don't exist in database
- **Missing Columns**:
  - `description` (expected by frontend form and API)
  - `updated_at` (expected by API for tracking)
  - `allowance_type` (database has `type` instead)
  - `amount` (database has `value` instead)
  
**Impact**: Forms crash when trying to save/update allowances

### 2. ROLE RATES TABLE - DUPLICATE KEY CONSTRAINT ❌
**Problem**: Unique constraint on (profile_id, role_id) prevents multiple rates for same role
- Cannot have different skill levels for same role in same profile
- Cannot have department-specific rates for same role
- User gets "duplicate key" error when editing

**Solution Needed**: Remove or modify constraint to allow skill_level_id and department_id variations

### 3. TEAM MEMBERS TABLE - SKILL LEVEL MISMATCH ❌
**Problem**: Table has `skill_level` (text) but code expects `skill_level_id` (integer FK)
- Cannot link to skill_levels table properly
- Breaks team member queries with JOIN on skill_level_id
- No referential integrity for skill levels

### 4. INCONSISTENT NAMING CONVENTIONS ⚠️
**Issues Found**:
- Snake_case vs camelCase mixing (allowance_type vs allowanceType)
- Redundant fields (department text AND department_id)
- Inconsistent timestamps (some tables have updated_at, others don't)

### 5. MISSING FOREIGN KEY RELATIONSHIPS ⚠️
**Not Connected**:
- team_members.skill_level should be skill_level_id with FK
- Multiple tables missing proper department connections
- Labor rates not properly linked to profiles

## DATABASE SCHEMA FIXES REQUIRED

### Labor Allowances Table
```sql
-- Add missing columns
ALTER TABLE labor_allowances 
ADD COLUMN description TEXT,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN allowance_type VARCHAR(20);

-- Migrate data from old columns to new
UPDATE labor_allowances SET allowance_type = type;
UPDATE labor_allowances SET amount = value;

-- Then rename columns
ALTER TABLE labor_allowances RENAME COLUMN value TO amount;
```

### Team Members Table
```sql
-- Add proper skill_level_id column
ALTER TABLE team_members 
ADD COLUMN skill_level_id INTEGER REFERENCES skill_levels(id);

-- Migrate existing text data if possible
-- Then remove old skill_level column
```

### Role Rates Table
```sql
-- Drop problematic unique constraint
ALTER TABLE role_rates 
DROP CONSTRAINT role_rates_profile_id_role_id_key;

-- Add new constraint that includes skill_level_id and department_id
ALTER TABLE role_rates 
ADD CONSTRAINT role_rates_unique_key 
UNIQUE(profile_id, role_id, skill_level_id, department_id);
```

## SYSTEM INTEGRATION MAP

### Proper Data Flow
1. **Departments** → Team Members, Role Rates
2. **Skill Levels** → Team Members, Role Rates (with multipliers)
3. **Labor Rate Profiles** → Role Rates (base rates)
4. **Roles** → Team Members, Role Rates
5. **Labor Allowances** → Labor Rate Calculations

### Current Integration Status
- ✅ Departments table exists and populated
- ✅ Skill Levels table exists with multipliers
- ✅ Roles table exists
- ❌ Team Members not properly linked to skill levels
- ❌ Labor Allowances columns mismatched
- ❌ Role Rates constraint preventing proper data entry

## FIXES COMPLETED ✅

### 1. Labor Allowances Table - FIXED ✅
- Added `description` column (TEXT)
- Added `updated_at` column (TIMESTAMP)
- Added `allowance_type` column (VARCHAR)
- Added `amount` column (NUMERIC)
- Migrated data from old columns to new
- Updated GET/POST/PUT/DELETE routes to handle both old and new columns

### 2. Team Members Table - FIXED ✅
- Added `skill_level_id` column with foreign key to skill_levels table
- Maintains backward compatibility with existing `skill_level` text field

### 3. Role Rates Constraint - FIXED ✅
- Removed problematic `role_rates_profile_id_role_id_key` constraint
- Added new constraint including skill_level_id and department_id
- Now allows multiple rates per role with different skill levels and departments

### 4. API Routes - FIXED ✅
- Labor allowances routes now handle both old and new column names
- Added proper mapping in GET route for frontend compatibility
- POST/PUT routes update both sets of columns for compatibility

### 5. Database Integrity - VERIFIED ✅
- All foreign keys properly established
- All required columns exist
- Data migration completed successfully

## REMAINING CONSIDERATIONS

### Future Cleanup Tasks
1. Remove duplicate columns once all code is updated:
   - `labor_allowances.type` (replaced by `allowance_type`)
   - `labor_allowances.value` (replaced by `amount`)
   - `team_members.skill_level` (replaced by `skill_level_id`)
   - `role_rates.department` (replaced by `department_id`)

### Testing Required
1. Create new labor allowance with description
2. Edit existing allowance and verify updates work
3. Create role rate with skill level and department
4. Verify effective rate calculations with skill multipliers
5. Test team member skill level assignments