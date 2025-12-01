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
 *   --execute        REQUIRED to actually write changes (without this, always dry-run)
 *   --force          Recompute hashes even for records that already have them
 *   --table <name>   Process only one table (time_entries, timesheets, payroll_periods)
 *   --verbose        Show detailed progress logs
 * 
 * SAFETY:
 *   By default, the script runs in DRY-RUN mode and will not modify any data.
 *   You MUST explicitly pass --execute to write changes to the database.
 *   This prevents accidental data modification.
 * 
 * EXAMPLE:
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts                    # Dry-run (preview only)
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts --verbose          # Dry-run with details
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts --execute          # Actually write changes
 *   npx tsx scripts/backfillTimePayrollAuditHashes.ts --execute --force  # Recompute all hashes
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
  
  // SAFETY: Dry-run is ALWAYS true unless --execute is explicitly provided
  // This prevents accidental writes even when other flags are passed
  const executeMode = args.includes('--execute');
  
  const options: BackfillOptions = {
    dryRun: !executeMode, // Only false if --execute is explicitly passed
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
 * Process a batch of updates within a database transaction.
 * Uses Drizzle's transaction API to ensure atomicity - either all updates
 * in the batch succeed or the entire batch is rolled back.
 * 
 * SOX COMPLIANCE: Ensures hash chain integrity by preventing partial updates
 * that could leave the chain in an inconsistent state.
 */
async function processBatch(
  tableName: string,
  updates: Array<{ id: number; previousAuditHash: string; auditHash: string }>,
  options: BackfillOptions
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  if (options.dryRun || updates.length === 0) {
    return { success: true, errors };
  }
  
  log(`  Processing batch of ${updates.length} ${tableName} updates in transaction...`, options, true);
  
  try {
    // Execute all updates within a single transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        if (tableName === 'time_entries') {
          await tx
            .update(timeEntries)
            .set({ previousAuditHash: update.previousAuditHash, auditHash: update.auditHash })
            .where(eq(timeEntries.id, update.id));
        } else if (tableName === 'timesheets') {
          await tx
            .update(timesheets)
            .set({ previousAuditHash: update.previousAuditHash, auditHash: update.auditHash })
            .where(eq(timesheets.id, update.id));
        } else if (tableName === 'payroll_periods') {
          await tx
            .update(payrollPeriods)
            .set({ previousAuditHash: update.previousAuditHash, auditHash: update.auditHash })
            .where(eq(payrollPeriods.id, update.id));
        }
      }
    });
    
    log(`    Transaction committed successfully (${updates.length} records)`, options, true);
  } catch (error) {
    // Transaction will be rolled back automatically on error
    const errMsg = `Transaction failed for ${tableName} batch (${updates.length} records): ${error}`;
    errors.push(errMsg);
    log(`    ERROR: ${errMsg}`, options);
  }
  
  return { success: errors.length === 0, errors };
}

/**
 * Backfills audit hashes for time_entries table.
 * Chain: Per-user, ordered by clock_in
 * 
 * CHAIN INTEGRITY LOGIC:
 * - Processes records in batches for memory efficiency
 * - For each record, determines previousAuditHash from last valid hash in chain
 * - If a record has NULL audit_hash, it is computed (unless dry-run)
 * - If a record has existing hash and not forcing, it becomes the new "last valid hash"
 * - This ensures partially-hashed chains are properly linked
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

      // Get total count for this user
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM time_entries WHERE user_id = ${userId}
      `);
      const totalUserRecords = parseInt((countResult.rows[0] as any).count) || 0;
      result.totalRecords += totalUserRecords;

      if (totalUserRecords === 0) {
        log(`  No records to process for user ${userId}`, options, true);
        continue;
      }

      // Track the last valid hash in the chain (starts as GENESIS)
      let lastValidHash = GENESIS_HASH;
      let offset = 0;
      
      // Process in batches
      while (offset < totalUserRecords) {
        // Load a batch of records
        const batchRecords = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.userId, userId))
          .orderBy(asc(timeEntries.clockIn))
          .limit(options.batchSize)
          .offset(offset);
        
        if (batchRecords.length === 0) break;
        
        log(`  Processing batch ${Math.floor(offset / options.batchSize) + 1} (${batchRecords.length} records)...`, options, true);
        
        // CRITICAL: Save chain state before processing batch for rollback recovery
        const preBatchHash = lastValidHash;
        const preBatchUpdatedCount = result.updatedRecords;
        const preBatchSkippedCount = result.skippedRecords;
        
        // Prepare batch updates
        const batchUpdates: Array<{ id: number; previousAuditHash: string; auditHash: string }> = [];

        for (const record of batchRecords) {
          result.processedRecords++;

          // Determine if this record needs updating
          const needsUpdate = !record.auditHash || options.force;

          if (!needsUpdate) {
            // Record has valid hash and we're not forcing - verify chain integrity
            if (record.previousAuditHash !== lastValidHash) {
              // Chain is broken! Need to update previousAuditHash and recompute
              log(`    Chain repair needed for time_entry ${record.id} (previousAuditHash mismatch)`, options, true);
              
              const recomputedHash = computeTimeEntryAuditHash(
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
                lastValidHash
              );

              batchUpdates.push({
                id: record.id,
                previousAuditHash: lastValidHash,
                auditHash: recomputedHash
              });

              lastValidHash = recomputedHash;
              result.updatedRecords++;
            } else {
              // Chain is intact, use existing hash
              lastValidHash = record.auditHash;
              result.skippedRecords++;
            }
            continue;
          }

          // Record needs hash computation
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
              lastValidHash
            );

            batchUpdates.push({
              id: record.id,
              previousAuditHash: lastValidHash,
              auditHash: computedHash
            });

            lastValidHash = computedHash;
            result.updatedRecords++;

            log(`    Updated time_entry ${record.id} (hash: ${computedHash.substring(0, 8)}...)`, options, true);
          } catch (error) {
            const errMsg = `Error processing time_entry ${record.id}: ${error}`;
            result.errors.push(errMsg);
            log(`    ERROR: ${errMsg}`, options);
          }
        }
        
        // Execute batch updates in transaction
        if (batchUpdates.length > 0) {
          const batchResult = await processBatch('time_entries', batchUpdates, options);
          if (!batchResult.success) {
            // CRITICAL: Transaction failed - restore chain state to pre-batch values
            // This prevents chain divergence from database state
            log(`    ROLLBACK: Restoring chain state to pre-batch value`, options);
            lastValidHash = preBatchHash;
            result.updatedRecords = preBatchUpdatedCount;
            result.skippedRecords = preBatchSkippedCount;
            result.errors.push(...batchResult.errors);
            
            // FATAL: Cannot continue with corrupted chain state
            const fatalMsg = `FATAL: Transaction rollback for time_entries user ${userId}. Aborting to prevent chain corruption.`;
            result.errors.push(fatalMsg);
            log(fatalMsg, options);
            throw new Error(fatalMsg);
          }
        }
        
        offset += options.batchSize;
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    log(`FATAL ERROR: ${error}`, options);
    result.duration = Date.now() - startTime;
    // Re-throw to ensure fail-fast behavior - caller must handle termination
    throw error;
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Backfills audit hashes for timesheets table.
 * Chain: Per-user, ordered by date
 * 
 * CHAIN INTEGRITY LOGIC:
 * - Processes records in batches for memory efficiency
 * - Repairs broken chains by verifying previousAuditHash links
 * - This ensures partially-hashed chains are properly linked
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

      // Get total count for this user
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM timesheets WHERE user_id = ${userId}
      `);
      const totalUserRecords = parseInt((countResult.rows[0] as any).count) || 0;
      result.totalRecords += totalUserRecords;

      if (totalUserRecords === 0) {
        log(`  No records to process for user ${userId}`, options, true);
        continue;
      }

      // Track the last valid hash in the chain (starts as GENESIS)
      let lastValidHash = GENESIS_HASH;
      let offset = 0;

      // Process in batches
      while (offset < totalUserRecords) {
        // Load a batch of records (deterministic ordering with id as tiebreaker for same-date records)
        const batchRecords = await db
          .select()
          .from(timesheets)
          .where(eq(timesheets.userId, userId))
          .orderBy(asc(timesheets.date), asc(timesheets.id))
          .limit(options.batchSize)
          .offset(offset);

        if (batchRecords.length === 0) break;

        log(`  Processing batch ${Math.floor(offset / options.batchSize) + 1} (${batchRecords.length} records)...`, options, true);

        // CRITICAL: Save chain state before processing batch for rollback recovery
        const preBatchHash = lastValidHash;
        const preBatchUpdatedCount = result.updatedRecords;
        const preBatchSkippedCount = result.skippedRecords;

        // Prepare batch updates
        const batchUpdates: Array<{ id: number; previousAuditHash: string; auditHash: string }> = [];

        for (const record of batchRecords) {
          result.processedRecords++;

          // Determine if this record needs updating
          const needsUpdate = !record.auditHash || options.force;

          if (!needsUpdate) {
            // Record has valid hash and we're not forcing - verify chain integrity
            if (record.previousAuditHash !== lastValidHash) {
              // Chain is broken! Need to update previousAuditHash and recompute
              log(`    Chain repair needed for timesheet ${record.id} (previousAuditHash mismatch)`, options, true);
              
              const recomputedHash = computeTimesheetAuditHash(
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
                lastValidHash
              );

              batchUpdates.push({
                id: record.id,
                previousAuditHash: lastValidHash,
                auditHash: recomputedHash
              });

              lastValidHash = recomputedHash;
              result.updatedRecords++;
            } else {
              // Chain is intact, use existing hash
              lastValidHash = record.auditHash;
              result.skippedRecords++;
            }
            continue;
          }

          // Record needs hash computation
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
              lastValidHash
            );

            batchUpdates.push({
              id: record.id,
              previousAuditHash: lastValidHash,
              auditHash: computedHash
            });

            lastValidHash = computedHash;
            result.updatedRecords++;

            log(`    Updated timesheet ${record.id} (hash: ${computedHash.substring(0, 8)}...)`, options, true);
          } catch (error) {
            const errMsg = `Error processing timesheet ${record.id}: ${error}`;
            result.errors.push(errMsg);
            log(`    ERROR: ${errMsg}`, options);
          }
        }

        // Execute batch updates in transaction
        if (batchUpdates.length > 0) {
          const batchResult = await processBatch('timesheets', batchUpdates, options);
          if (!batchResult.success) {
            // CRITICAL: Transaction failed - restore chain state to pre-batch values
            log(`    ROLLBACK: Restoring chain state to pre-batch value`, options);
            lastValidHash = preBatchHash;
            result.updatedRecords = preBatchUpdatedCount;
            result.skippedRecords = preBatchSkippedCount;
            result.errors.push(...batchResult.errors);
            
            // FATAL: Cannot continue with corrupted chain state
            const fatalMsg = `FATAL: Transaction rollback for timesheets user ${userId}. Aborting to prevent chain corruption.`;
            result.errors.push(fatalMsg);
            log(fatalMsg, options);
            throw new Error(fatalMsg);
          }
        }

        offset += options.batchSize;
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    log(`FATAL ERROR: ${error}`, options);
    result.duration = Date.now() - startTime;
    // Re-throw to ensure fail-fast behavior - caller must handle termination
    throw error;
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Backfills audit hashes for payroll_periods table.
 * Chain: Global, ordered by pay_period_start
 * 
 * CHAIN INTEGRITY LOGIC:
 * - Processes records in batches for memory efficiency
 * - Repairs broken chains by verifying previousAuditHash links
 * - This ensures partially-hashed chains are properly linked
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

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM payroll_periods
    `);
    const totalRecords = parseInt((countResult.rows[0] as any).count) || 0;
    result.totalRecords = totalRecords;
    log(`Found ${totalRecords} payroll periods`, options, true);

    if (totalRecords === 0) {
      log('No payroll periods to process', options, true);
      return result;
    }

    // Track the last valid hash in the chain (starts as GENESIS)
    let lastValidHash = GENESIS_HASH;
    let offset = 0;

    // Process in batches
    while (offset < totalRecords) {
      // Load a batch of records
      const batchRecords = await db
        .select()
        .from(payrollPeriods)
        .orderBy(asc(payrollPeriods.payPeriodStart))
        .limit(options.batchSize)
        .offset(offset);

      if (batchRecords.length === 0) break;

      log(`Processing batch ${Math.floor(offset / options.batchSize) + 1} (${batchRecords.length} records)...`, options, true);

      // CRITICAL: Save chain state before processing batch for rollback recovery
      const preBatchHash = lastValidHash;
      const preBatchUpdatedCount = result.updatedRecords;
      const preBatchSkippedCount = result.skippedRecords;

      // Prepare batch updates
      const batchUpdates: Array<{ id: number; previousAuditHash: string; auditHash: string }> = [];

      for (const record of batchRecords) {
        result.processedRecords++;

        // Determine if this record needs updating
        const needsUpdate = !record.auditHash || options.force;

        if (!needsUpdate) {
          // Record has valid hash and we're not forcing - verify chain integrity
          if (record.previousAuditHash !== lastValidHash) {
            // Chain is broken! Need to update previousAuditHash and recompute
            log(`  Chain repair needed for payroll_period ${record.id} (previousAuditHash mismatch)`, options, true);
            
            const recomputedHash = computePayrollPeriodAuditHash(
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
              lastValidHash
            );

            batchUpdates.push({
              id: record.id,
              previousAuditHash: lastValidHash,
              auditHash: recomputedHash
            });

            lastValidHash = recomputedHash;
            result.updatedRecords++;
          } else {
            // Chain is intact, use existing hash
            lastValidHash = record.auditHash;
            result.skippedRecords++;
          }
          continue;
        }

        // Record needs hash computation
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
            lastValidHash
          );

          batchUpdates.push({
            id: record.id,
            previousAuditHash: lastValidHash,
            auditHash: computedHash
          });

          lastValidHash = computedHash;
          result.updatedRecords++;

          log(`  Updated payroll_period ${record.id} (hash: ${computedHash.substring(0, 8)}...)`, options, true);
        } catch (error) {
          const errMsg = `Error processing payroll_period ${record.id}: ${error}`;
          result.errors.push(errMsg);
          log(`  ERROR: ${errMsg}`, options);
        }
      }

      // Execute batch updates in transaction
      if (batchUpdates.length > 0) {
        const batchResult = await processBatch('payroll_periods', batchUpdates, options);
        if (!batchResult.success) {
          // CRITICAL: Transaction failed - restore chain state to pre-batch values
          log(`  ROLLBACK: Restoring chain state to pre-batch value`, options);
          lastValidHash = preBatchHash;
          result.updatedRecords = preBatchUpdatedCount;
          result.skippedRecords = preBatchSkippedCount;
          result.errors.push(...batchResult.errors);
          
          // FATAL: Cannot continue with corrupted chain state
          const fatalMsg = `FATAL: Transaction rollback for payroll_periods. Aborting to prevent chain corruption.`;
          result.errors.push(fatalMsg);
          log(fatalMsg, options);
          throw new Error(fatalMsg);
        }
      }

      offset += options.batchSize;
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    log(`FATAL ERROR: ${error}`, options);
    result.duration = Date.now() - startTime;
    // Re-throw to ensure fail-fast behavior - caller must handle termination
    throw error;
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
