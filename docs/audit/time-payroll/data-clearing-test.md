# Time & Payroll Data Clearing Test

**Date:** 2025-12-02T10:56:00Z  
**Environment:** Development

## Summary

**FINDING:** Time & Payroll data is NOT currently included in the Clear Data categories.

The Clear Data feature (Organization Settings → Data → Clear Data) currently supports these categories:
- `procurement` - Purchase orders, RFQs, requisitions
- `jobs` - Jobs, cutting operations, production data
- `finance` - Invoices, financial records
- `estimation` - Estimation projects, drawings
- `audit` - Document access logs, attachments, history

**Time & Payroll is missing** and would need to be added as a new category.

## Current Time & Payroll Data (Pre-Clear)

| Table | Record Count | Notes |
|-------|--------------|-------|
| time_entries | 1 | Clock in/out records |
| timesheets | 192 | Weekly timesheets |
| payroll_periods | 1 | Pay period definitions |
| timesheet_corrections | 0 | Correction requests |
| time_clocks | 3,919 | Clock events |
| location_tracking | 121 | GPS records |
| payroll_adjustments | 0 | Payroll adjustments |
| payroll_sync_log | 0 | Sync history |
| time_permissions | 0 | Time access permissions |

**Total Records:** 4,234

## Implementation Location

**Backend Route:**
```
POST /api/data-management/clear-data
```

**Storage Function:**
```typescript
// server/storage.ts
async clearAllBusinessData(categories: string[], userId: number)
```

**Current Categories Supported:**
```typescript
if (category === 'procurement') { ... }
if (category === 'jobs') { ... }
if (category === 'finance') { ... }
if (category === 'estimation') { ... }
if (category === 'audit') { ... }
// NOTE: 'time_payroll' category NOT implemented
```

## Recommended Addition

To add Time & Payroll clearing capability:

```typescript
if (category === 'time_payroll') {
  const counts: any = {};
  
  // Clear in dependency order
  await db.execute(sql`DELETE FROM time_entries RETURNING id`);
  await db.execute(sql`DELETE FROM timesheets RETURNING id`);
  await db.execute(sql`DELETE FROM time_clocks RETURNING id`);
  await db.execute(sql`DELETE FROM location_tracking RETURNING id`);
  await db.execute(sql`DELETE FROM timesheet_corrections RETURNING id`);
  await db.execute(sql`DELETE FROM payroll_adjustments RETURNING id`);
  await db.execute(sql`DELETE FROM payroll_sync_log RETURNING id`);
  // NOTE: payroll_periods may need special handling
  
  Object.assign(allCounts, counts);
}
```

## Frontend Category

The frontend component would need a new category in the UI:

```tsx
// client/src/components/organization-settings/data-management.tsx
const dataCategories = [
  // ... existing categories
  { 
    id: 'time_payroll', 
    label: 'Time & Payroll', 
    icon: Clock,
    description: 'Timesheets, time entries, payroll periods, GPS data',
    tables: ['time_entries', 'timesheets', 'payroll_periods', 'time_clocks', 'location_tracking']
  }
];
```

## Governance Considerations

When implementing Time & Payroll clearing:

1. **SOX Retention:** 7-year retention requirements may apply
2. **Audit Trail:** Consider archiving before deletion
3. **Hash Chain Integrity:** Breaking hash chains should be logged
4. **Dual-Auth:** May require dual authorization for production

## Test Result

| Test | Status |
|------|--------|
| Clear Data UI exists | PASS |
| Backend route exists | PASS |
| Time & Payroll category exists | **FAIL - NOT IMPLEMENTED** |
| Can clear Time data | **BLOCKED** |

## Recommendation

**Priority:** Medium

Add a `time_payroll` category to the Clear Data feature before production deployment. This will allow proper data reset during testing and development cycles.

For production, consider adding:
- Dual-auth requirement for Time & Payroll clearing
- Mandatory backup before clear
- Audit log of clearing operation
- Option to retain hash chain blocks for audit trail continuity

## Manual Clearing (Current Workaround)

In development, Time & Payroll data can be cleared via direct SQL:

```sql
-- WARNING: Development only
DELETE FROM time_entries;
DELETE FROM timesheets;
DELETE FROM time_clocks;
DELETE FROM location_tracking;
DELETE FROM timesheet_corrections;
DELETE FROM payroll_adjustments;
DELETE FROM payroll_sync_log;
-- payroll_periods: Consider retaining period definitions
```
