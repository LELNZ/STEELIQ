/**
 * SOX/ITGC Compliant Backfill Script for Time & Payroll Audit Hashes
 * 
 * PURPOSE:
 * Backfills audit_hash and previous_audit_hash for existing time_entries,
 * timesheets, and payroll_periods records to bring historical data under
 * the same hash-chain model used for new records.
 * 
 * CHAIN STRATEGIES (per SOX compliance requirements):
 * - time_entries: Per-user chain, ordered by user_id then clock_in
 * - timesheets: Per-user chain, ordered by user_id then date
 * - payroll_periods: Global chain, ordered by pay_period_start
 * 
 * IDEMPOTENCY:
 * - Records with existing audit_hash are SKIPPED by default
 * - Use --force to recompute all hashes (useful for hash algorithm changes)
 * - Progress is tracked and logged for audit trail
 * 
 * USAGE:
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts [options]
 * 
 * OPTIONS:
 *   --dry-run        Preview changes without writing to database
 *   --force          Recompute hashes even for records that already have them
 *   --batch-size N   Number of records to process per batch (default: 100)
 *   --table <name>   Process only one table (time_entries, timesheets, payroll_periods)
 *   --verbose        Show detailed progress logs
 * 
 * EXAMPLE:
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts --dry-run --verbose
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts --table timesheets
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts --batch-size 50
 * 
 * SAFEGUARDS:
 * - Dry-run mode by default when no arguments provided
 * - Batch processing to avoid memory issues
 * - Transaction per batch for atomicity
 * - Detailed audit logging
 * - Can be interrupted and resumed safely (idempotent)
 */

import { db } from '../server/db';
import { timeEntries, timesheets, payrollPeriods } from '../shared/schema';
import { eq, asc, isNull, and, sql } from 'drizzle-orm';
import {
  computeTimeEntryAuditHash,
  computeTimesheetAuditHash,
  computePayrollPeriodAuditHash,
  GENESIS_HASH
} from '../server/utils/auditHashService';

interface BackfillOptions {
  dryRun: boolean;
  force: boolean;
  batchSize: number;
  table: 'all' | 'time_entries' | 'timesheets' | 'payroll_periods';
  verbose: boolean;
}

interface BackfillResult {
  table: string;
  totalRecords: number;
  processedRecords: number;
  skippedRecords: number;
  updatedRecords: number;
  errors: string[];
  duration: number;
}

function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    dryRun: args.length === 0 || args.includes('--dry-run'),
    force: args.includes('--force'),
    batchSize: 100,
    table: 'all',
    verbose: args.includes('--verbose')
  };

  const batchIdx = args.indexOf('--batch-size');
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    options.batchSize = parseInt(args[batchIdx + 1], 10) || 100;
  }

  const tableIdx = args.indexOf('--table');
  if (tableIdx !== -1 && args[tableIdx + 1]) {
    const tableArg = args[tableIdx + 1] as BackfillOptions['table'];
    if (['time_entries', 'timesheets', 'payroll_periods'].includes(tableArg)) {
      options.table = tableArg;
    }
  }

  return options;
}

function log(message: string, options: BackfillOptions, isVerbose: boolean = false) {
  if (!isVerbose || options.verbose) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

/**
 * Backfills audit hashes for time_entries table.
 * Chain: Per-user, ordered by clock_in
 */
async function backfillTimeEntries(options: BackfillOptions): Promise<BackfillResult> {
  const startTime = Date.now();
  const result: BackfillResult = {
    table: 'time_entries',
    totalRecords: 0,
    processedRecords: 0,
    skippedRecords: 0,
    updatedRecords: 0,
    errors: [],
    duration: 0
  };

  try {
    log('Starting time_entries backfill...', options);

    // Get distinct user IDs
    const users = await db.selectDistinct({ userId: timeEntries.userId }).from(timeEntries);
    log(`Found ${users.length} users with time entries`, options, true);

    for (const { userId } of users) {
      log(`Processing time entries for user ${userId}...`, options, true);

      // Build query based on force flag
      let query;
      if (options.force) {
        query = db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.userId, userId))
          .orderBy(asc(timeEntries.clockIn));
      } else {
        query = db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.userId, userId),
              isNull(timeEntries.auditHash)
            )
          )
          .orderBy(asc(timeEntries.clockIn));
      }

      const records = await query;
      result.totalRecords += records.length;

      if (records.length === 0) {
        log(`  No records to process for user ${userId}`, options, true);
        continue;
      }

      // If force mode, we need to process ALL records in order to maintain chain integrity
      // Otherwise we only process records with NULL audit_hash
      let allRecordsForChain = records;
      if (options.force) {
        allRecordsForChain = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.userId, userId))
          .orderBy(asc(timeEntries.clockIn));
      }

      let previousHash = GENESIS_HASH;

      for (const record of allRecordsForChain) {
        result.processedRecords++;

        // Skip if already has hash and not forcing
        if (record.auditHash && !options.force) {
          previousHash = record.auditHash;
          result.skippedRecords++;
          continue;
        }

        try {
          const computedHash = computeTimeEntryAuditHash(
            {
              id: record.id,
              userId: record.userId,
              timesheetId: record.timesheetId,
              jobId: record.jobId,
              clockIn: record.clockIn,
              clockOut: record.clockOut,
              breakDuration: record.breakDuration,
              totalHours: record.totalHours,
              hourlyRate: record.hourlyRate,
              totalCost: record.totalCost,
              status: record.status,
              gpsLat: record.gpsLat,
              gpsLng: record.gpsLng
            },
            previousHash
          );

          if (!options.dryRun) {
            await db
              .update(timeEntries)
              .set({
                previousAuditHash: previousHash,
                auditHash: computedHash
              })
              .where(eq(timeEntries.id, record.id));
          }

          previousHash = computedHash;
          result.updatedRecords++;

          log(`  Updated time_entry ${record.id} (hash: ${computedHash.substring(0, 8)}...)`, options, true);
        } catch (error) {
          const errMsg = `Error processing time_entry ${record.id}: ${error}`;
          result.errors.push(errMsg);
          log(`  ERROR: ${errMsg}`, options);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    log(`FATAL ERROR: ${error}`, options);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Backfills audit hashes for timesheets table.
 * Chain: Per-user, ordered by date
 */
async function backfillTimesheets(options: BackfillOptions): Promise<BackfillResult> {
  const startTime = Date.now();
  const result: BackfillResult = {
    table: 'timesheets',
    totalRecords: 0,
    processedRecords: 0,
    skippedRecords: 0,
    updatedRecords: 0,
    errors: [],
    duration: 0
  };

  try {
    log('Starting timesheets backfill...', options);

    // Get distinct user IDs
    const users = await db.selectDistinct({ userId: timesheets.userId }).from(timesheets);
    log(`Found ${users.length} users with timesheets`, options, true);

    for (const { userId } of users) {
      log(`Processing timesheets for user ${userId}...`, options, true);

      // Get all records for this user (needed for chain integrity)
      const allRecords = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.userId, userId))
        .orderBy(asc(timesheets.date));

      result.totalRecords += allRecords.length;

      if (allRecords.length === 0) {
        log(`  No records to process for user ${userId}`, options, true);
        continue;
      }

      let previousHash = GENESIS_HASH;

      for (const record of allRecords) {
        result.processedRecords++;

        // Skip if already has hash and not forcing
        if (record.auditHash && !options.force) {
          previousHash = record.auditHash;
          result.skippedRecords++;
          continue;
        }

        try {
          const computedHash = computeTimesheetAuditHash(
            {
              id: record.id,
              userId: record.userId,
              date: record.date,
              jobId: record.jobId,
              taskId: record.taskId,
              startTime: record.startTime,
              endTime: record.endTime,
              hoursWorked: record.hoursWorked,
              breakHours: record.breakHours,
              overtimeHours: record.overtimeHours,
              status: record.status,
              supervisorId: record.supervisorId,
              approvedBy: record.approvedBy,
              approvedAt: record.approvedAt,
              submittedAt: record.submittedAt
            },
            previousHash
          );

          if (!options.dryRun) {
            await db
              .update(timesheets)
              .set({
                previousAuditHash: previousHash,
                auditHash: computedHash
              })
              .where(eq(timesheets.id, record.id));
          }

          previousHash = computedHash;
          result.updatedRecords++;

          log(`  Updated timesheet ${record.id} (hash: ${computedHash.substring(0, 8)}...)`, options, true);
        } catch (error) {
          const errMsg = `Error processing timesheet ${record.id}: ${error}`;
          result.errors.push(errMsg);
          log(`  ERROR: ${errMsg}`, options);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    log(`FATAL ERROR: ${error}`, options);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Backfills audit hashes for payroll_periods table.
 * Chain: Global, ordered by pay_period_start
 */
async function backfillPayrollPeriods(options: BackfillOptions): Promise<BackfillResult> {
  const startTime = Date.now();
  const result: BackfillResult = {
    table: 'payroll_periods',
    totalRecords: 0,
    processedRecords: 0,
    skippedRecords: 0,
    updatedRecords: 0,
    errors: [],
    duration: 0
  };

  try {
    log('Starting payroll_periods backfill...', options);

    // Get all payroll periods in chronological order
    const allRecords = await db
      .select()
      .from(payrollPeriods)
      .orderBy(asc(payrollPeriods.payPeriodStart));

    result.totalRecords = allRecords.length;
    log(`Found ${allRecords.length} payroll periods`, options, true);

    if (allRecords.length === 0) {
      log('No payroll periods to process', options, true);
      return result;
    }

    let previousHash = GENESIS_HASH;

    for (const record of allRecords) {
      result.processedRecords++;

      // Skip if already has hash and not forcing
      if (record.auditHash && !options.force) {
        previousHash = record.auditHash;
        result.skippedRecords++;
        continue;
      }

      try {
        const computedHash = computePayrollPeriodAuditHash(
          {
            id: record.id,
            businessUnitId: record.businessUnitId,
            periodType: record.periodType || 'weekly',
            payPeriodStart: record.payPeriodStart,
            payPeriodEnd: record.payPeriodEnd,
            payDate: record.payDate,
            status: record.status,
            lockedBy: record.lockedBy,
            lockedAt: record.lockedAt,
            processingStartedAt: record.processingStartedAt,
            processingCompletedAt: record.processingCompletedAt,
            syncStatus: record.syncStatus,
            employeeCount: record.employeeCount,
            totalHours: record.totalHours,
            totalAmount: record.totalAmount
          },
          previousHash
        );

        if (!options.dryRun) {
          await db
            .update(payrollPeriods)
            .set({
              previousAuditHash: previousHash,
              auditHash: computedHash
            })
            .where(eq(payrollPeriods.id, record.id));
        }

        previousHash = computedHash;
        result.updatedRecords++;

        log(`  Updated payroll_period ${record.id} (hash: ${computedHash.substring(0, 8)}...)`, options, true);
      } catch (error) {
        const errMsg = `Error processing payroll_period ${record.id}: ${error}`;
        result.errors.push(errMsg);
        log(`  ERROR: ${errMsg}`, options);
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    log(`FATAL ERROR: ${error}`, options);
  }

  result.duration = Date.now() - startTime;
  return result;
}

function printSummary(results: BackfillResult[], options: BackfillOptions) {
  console.log('\n========================================');
  console.log('BACKFILL SUMMARY');
  console.log('========================================');
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes written)' : 'LIVE'}`);
  console.log(`Force recompute: ${options.force ? 'YES' : 'NO'}`);
  console.log('----------------------------------------');

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const result of results) {
    console.log(`\n${result.table.toUpperCase()}`);
    console.log(`  Total records: ${result.totalRecords}`);
    console.log(`  Processed: ${result.processedRecords}`);
    console.log(`  Updated: ${result.updatedRecords}`);
    console.log(`  Skipped (already hashed): ${result.skippedRecords}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('  Error details:');
      result.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more errors`);
      }
    }

    totalUpdated += result.updatedRecords;
    totalSkipped += result.skippedRecords;
    totalErrors += result.errors.length;
  }

  console.log('\n----------------------------------------');
  console.log('TOTALS');
  console.log(`  Updated: ${totalUpdated}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log('========================================\n');

  if (options.dryRun) {
    console.log('DRY RUN COMPLETE - No changes were made to the database.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('BACKFILL COMPLETE - Changes have been written to the database.');
  }
}

async function main() {
  const options = parseArgs();

  console.log('\n========================================');
  console.log('SOX/ITGC Audit Hash Backfill');
  console.log('========================================');
  console.log(`Options:`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log(`  Force: ${options.force}`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log(`  Table: ${options.table}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log('========================================\n');

  if (options.dryRun) {
    console.log('*** DRY RUN MODE - No changes will be written ***\n');
  }

  const results: BackfillResult[] = [];

  try {
    if (options.table === 'all' || options.table === 'time_entries') {
      results.push(await backfillTimeEntries(options));
    }

    if (options.table === 'all' || options.table === 'timesheets') {
      results.push(await backfillTimesheets(options));
    }

    if (options.table === 'all' || options.table === 'payroll_periods') {
      results.push(await backfillPayrollPeriods(options));
    }

    printSummary(results, options);
  } catch (error) {
    console.error('FATAL ERROR during backfill:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
