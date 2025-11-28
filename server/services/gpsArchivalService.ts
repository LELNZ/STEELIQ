import { db } from '../db';
import { locationTracking } from '@shared/schema';
import { and, lt, gte, sql, eq, isNull, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';

/**
 * GPS Archival Service - Fortune 50 Data Retention Strategy
 * 
 * Retention Policies:
 * - Active Period (0-90 days): Full resolution GPS data (30-second intervals)
 * - Archive Period (90-365 days): Compressed to 5-minute intervals
 * - Long-term Storage (>365 days): Summary data only (clock events + daily summaries)
 * - Compliance Hold (7 years): Maintain audit trails and hash chains
 * 
 * SOX Compliance:
 * - Hash chains must remain unbroken for 7 years
 * - Archived data must be tamper-evident
 * - Deletion must preserve chain integrity
 */
export class GPSArchivalService {
  // Retention periods in days
  private readonly ACTIVE_PERIOD = 90;
  private readonly ARCHIVE_PERIOD = 365;
  private readonly COMPLIANCE_HOLD = 7 * 365; // 7 years for SOX

  /**
   * Archive old GPS data based on retention policies
   * Should be run daily as a scheduled job
   */
  async archiveGPSData(): Promise<{
    compressed: number;
    archived: number;
    deleted: number;
    errors: string[];
  }> {
    const result = {
      compressed: 0,
      archived: 0,
      deleted: 0,
      errors: [] as string[]
    };

    try {
      // 1. Compress data older than 90 days but less than 365 days
      const compressionResult = await this.compressOldBreadcrumbs();
      result.compressed = compressionResult.count;

      // 2. Archive data older than 365 days
      const archiveResult = await this.archiveToLongTermStorage();
      result.archived = archiveResult.count;

      // 3. Delete non-essential data older than 7 years
      const deleteResult = await this.deleteExpiredData();
      result.deleted = deleteResult.count;

      // 4. Verify hash chain integrity after operations
      await this.verifyHashChainIntegrity();

    } catch (error) {
      result.errors.push(`Archival process failed: ${error.message}`);
      console.error('[GPS ARCHIVAL ERROR]', error);
    }

    return result;
  }

  /**
   * Compress GPS breadcrumbs from 30-second to 5-minute intervals
   * Preserves hash chain by keeping first and last record of each interval
   */
  private async compressOldBreadcrumbs(): Promise<{ count: number }> {
    const ninetyDaysAgo = new Date(Date.now() - this.ACTIVE_PERIOD * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - this.ARCHIVE_PERIOD * 24 * 60 * 60 * 1000);

    // Find records to compress (between 90-365 days old)
    const recordsToCompress = await db.select({
      userId: locationTracking.userId,
      timestamp: locationTracking.timestamp,
      id: locationTracking.id
    })
    .from(locationTracking)
    .where(
      and(
        lt(locationTracking.timestamp, ninetyDaysAgo),
        gte(locationTracking.timestamp, oneYearAgo),
        isNull(locationTracking.archivedAt) // Not already archived
      )
    )
    .orderBy(locationTracking.userId, locationTracking.timestamp);

    let compressedCount = 0;
    const userGroups = this.groupByUser(recordsToCompress);

    for (const [userId, records] of Object.entries(userGroups)) {
      // Group records into 5-minute buckets
      const buckets = this.groupIntoBuckets(records, 5 * 60 * 1000); // 5 minutes

      for (const bucket of buckets) {
        if (bucket.length <= 2) continue; // Keep if already minimal

        // Keep first and last record of each bucket for hash chain continuity
        const firstRecord = bucket[0];
        const lastRecord = bucket[bucket.length - 1];
        const toKeep = new Set([firstRecord.id, lastRecord.id]);
        const toArchive = bucket.filter(r => !toKeep.has(r.id)).map(r => r.id);

        // Mark intermediate records as archived
        if (toArchive.length > 0) {
          // CRITICAL: Re-hash the last record to maintain chain integrity
          // The last record's previousHash must skip over archived records
          await this.rehashRecordAfterCompression(Number(userId), lastRecord.id, firstRecord.id);
          
          // Now safe to archive intermediate records - use inArray for proper SQL generation
          await db.update(locationTracking)
            .set({ 
              archivedAt: new Date(),
              archiveReason: 'COMPRESSION_90_DAYS',
              // Clear PII from archived records
              wifiSSID: null,
              ipAddress: null,
              deviceId: null
            })
            .where(
              and(
                eq(locationTracking.userId, Number(userId)),
                inArray(locationTracking.id, toArchive as number[])
              )
            );

          compressedCount += toArchive.length;
        }
      }
    }

    console.log(`[GPS ARCHIVAL] Compressed ${compressedCount} GPS breadcrumbs`);
    return { count: compressedCount };
  }

  /**
   * Archive data to long-term storage (>365 days)
   * Creates summary records and marks originals for deletion
   */
  private async archiveToLongTermStorage(): Promise<{ count: number }> {
    const oneYearAgo = new Date(Date.now() - this.ARCHIVE_PERIOD * 24 * 60 * 60 * 1000);

    // Get records older than 1 year that haven't been archived
    const oldRecords = await db.select()
      .from(locationTracking)
      .where(
        and(
          lt(locationTracking.timestamp, oneYearAgo),
          isNull(locationTracking.archivedAt)
        )
      );

    // Group by user and day for summary creation
    const dailySummaries = new Map<string, any>();

    for (const record of oldRecords) {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      const key = `${record.userId}-${dateKey}`;

      if (!dailySummaries.has(key)) {
        dailySummaries.set(key, {
          userId: record.userId,
          date: dateKey,
          firstLocation: record,
          lastLocation: record,
          locationCount: 0,
          totalDistance: 0,
          geofenceViolations: 0,
          impossibleTravelEvents: 0
        });
      }

      const summary = dailySummaries.get(key);
      summary.locationCount++;
      summary.lastLocation = record;

      if (record.geofenceViolation) {
        summary.geofenceViolations++;
      }

      if (record.impossibleTravel) {
        summary.impossibleTravelEvents++;
      }
    }

    // Store summaries in a separate archive table (would need to be created)
    // For now, mark records as archived
    let archivedCount = 0;

    for (const record of oldRecords) {
      // Keep records linked to time clocks for compliance
      const hasTimeClockLink = await db.select({ id: locationTracking.id })
        .from(locationTracking)
        .where(
          and(
            eq(locationTracking.id, record.id),
            sql`EXISTS (
              SELECT 1 FROM time_clocks 
              WHERE time_clocks."locationTrackingId" = ${record.id}
            )`
          )
        )
        .limit(1);

      if (hasTimeClockLink.length === 0) {
        // Safe to archive if not linked to time clock
        await db.update(locationTracking)
          .set({ 
            archivedAt: new Date(),
            archiveReason: 'LONG_TERM_STORAGE_365_DAYS'
          })
          .where(eq(locationTracking.id, record.id));

        archivedCount++;
      }
    }

    console.log(`[GPS ARCHIVAL] Archived ${archivedCount} records to long-term storage`);
    return { count: archivedCount };
  }

  /**
   * Delete expired data beyond compliance hold period
   * Maintains hash chain integrity by updating links
   */
  private async deleteExpiredData(): Promise<{ count: number }> {
    const sevenYearsAgo = new Date(Date.now() - this.COMPLIANCE_HOLD * 24 * 60 * 60 * 1000);

    // Only delete archived records older than 7 years
    const expiredRecords = await db.select({
      id: locationTracking.id,
      previousHash: locationTracking.previousHash,
      currentHash: locationTracking.currentHash
    })
    .from(locationTracking)
    .where(
      and(
        lt(locationTracking.timestamp, sevenYearsAgo),
        sql`${locationTracking.archivedAt} IS NOT NULL`,
        // Never delete records linked to time clocks
        sql`NOT EXISTS (
          SELECT 1 FROM time_clocks 
          WHERE time_clocks."locationTrackingId" = ${locationTracking.id}
        )`
      )
    );

    // For SOX compliance, we don't actually delete but mark as purged
    // Real deletion would break hash chains
    let deletedCount = 0;

    for (const record of expiredRecords) {
      await db.update(locationTracking)
        .set({
          purgedAt: new Date(),
          // Clear PII but keep hash chain
          latitude: '0',
          longitude: '0',
          accuracy: '0',
          wifiSSID: null,
          ipAddress: null,
          deviceId: null,
          // Keep hashes for chain integrity
          previousHash: record.previousHash,
          currentHash: record.currentHash
        })
        .where(eq(locationTracking.id, record.id));

      deletedCount++;
    }

    console.log(`[GPS ARCHIVAL] Purged ${deletedCount} expired records`);
    return { count: deletedCount };
  }

  /**
   * Verify hash chain integrity for SOX compliance
   */
  private async verifyHashChainIntegrity(): Promise<void> {
    // Sample check - verify random chains
    const sampleUsers = await db.select({ userId: locationTracking.userId })
      .from(locationTracking)
      .groupBy(locationTracking.userId)
      .limit(10);

    for (const { userId } of sampleUsers) {
      const userChain = await db.select()
        .from(locationTracking)
        .where(eq(locationTracking.userId, userId))
        .orderBy(locationTracking.timestamp)
        .limit(100);

      let previousHash = 'GENESIS';
      let brokenLinks = 0;

      for (const record of userChain) {
        if (record.previousHash !== previousHash && record.previousHash !== 'GENESIS') {
          brokenLinks++;
          console.error(`[HASH CHAIN BROKEN] User ${userId} at record ${record.id}`);
        }
        previousHash = record.currentHash;
      }

      if (brokenLinks > 0) {
        // Alert for compliance violation
        console.error(`[SOX COMPLIANCE ALERT] Hash chain integrity violated for user ${userId}`);
      }
    }
  }

  /**
   * Get archival statistics for monitoring
   */
  async getArchivalStats(): Promise<{
    totalRecords: number;
    activeRecords: number;
    compressedRecords: number;
    archivedRecords: number;
    purgedRecords: number;
    oldestRecord: Date | null;
    storageGB: number;
  }> {
    const ninetyDaysAgo = new Date(Date.now() - this.ACTIVE_PERIOD * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - this.ARCHIVE_PERIOD * 24 * 60 * 60 * 1000);

    const [stats] = await db.select({
      totalRecords: sql<number>`COUNT(*)`,
      activeRecords: sql<number>`COUNT(*) FILTER (WHERE timestamp > ${ninetyDaysAgo})`,
      compressedRecords: sql<number>`COUNT(*) FILTER (WHERE timestamp <= ${ninetyDaysAgo} AND timestamp > ${oneYearAgo})`,
      archivedRecords: sql<number>`COUNT(*) FILTER (WHERE "archivedAt" IS NOT NULL)`,
      purgedRecords: sql<number>`COUNT(*) FILTER (WHERE "purgedAt" IS NOT NULL)`,
      oldestRecord: sql<Date>`MIN(timestamp)`,
      // Estimate storage (avg 500 bytes per record)
      storageGB: sql<number>`COUNT(*) * 500.0 / 1024 / 1024 / 1024`
    })
    .from(locationTracking);

    return {
      totalRecords: Number(stats.totalRecords) || 0,
      activeRecords: Number(stats.activeRecords) || 0,
      compressedRecords: Number(stats.compressedRecords) || 0,
      archivedRecords: Number(stats.archivedRecords) || 0,
      purgedRecords: Number(stats.purgedRecords) || 0,
      oldestRecord: stats.oldestRecord,
      storageGB: Number(stats.storageGB) || 0
    };
  }

  /**
   * Re-hash a record after compression to maintain chain integrity
   * Updates the previousHash to skip over archived records
   */
  private async rehashRecordAfterCompression(
    userId: number, 
    recordId: number,
    previousRecordId: number
  ): Promise<void> {
    // Get both records
    const [currentRecord] = await db.select()
      .from(locationTracking)
      .where(eq(locationTracking.id, recordId));
    
    const [previousRecord] = await db.select()
      .from(locationTracking)
      .where(eq(locationTracking.id, previousRecordId));
    
    if (!currentRecord || !previousRecord) {
      throw new Error(`Failed to find records for rehashing: ${recordId}, ${previousRecordId}`);
    }
    
    // Build data for new hash (excluding fields that change)
    const dataToHash = {
      userId: currentRecord.userId,
      timestamp: currentRecord.timestamp,
      latitude: currentRecord.latitude,
      longitude: currentRecord.longitude,
      accuracy: currentRecord.accuracy,
      previousHash: previousRecord.currentHash // Link to the kept previous record
    };
    
    // Generate new hash that maintains chain integrity
    const newHash = crypto.createHash('sha256')
      .update(JSON.stringify(dataToHash))
      .digest('hex');
    
    // Update the record with new hash chain
    await db.update(locationTracking)
      .set({
        previousHash: previousRecord.currentHash,
        currentHash: newHash,
        compressionRehashed: true // Flag to indicate this was rehashed
      })
      .where(eq(locationTracking.id, recordId));
    
    console.log(`[HASH CHAIN] Rehashed record ${recordId} to maintain chain integrity after compression`);
  }

  // Helper methods
  private groupByUser(records: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    for (const record of records) {
      if (!groups[record.userId]) {
        groups[record.userId] = [];
      }
      groups[record.userId].push(record);
    }
    return groups;
  }

  private groupIntoBuckets(records: any[], bucketSizeMs: number): any[][] {
    const buckets: any[][] = [];
    let currentBucket: any[] = [];
    let bucketStart: number | null = null;

    for (const record of records) {
      const timestamp = record.timestamp.getTime();

      if (!bucketStart || timestamp - bucketStart >= bucketSizeMs) {
        if (currentBucket.length > 0) {
          buckets.push(currentBucket);
        }
        currentBucket = [record];
        bucketStart = timestamp;
      } else {
        currentBucket.push(record);
      }
    }

    if (currentBucket.length > 0) {
      buckets.push(currentBucket);
    }

    return buckets;
  }
}

// Export singleton instance
export const gpsArchivalService = new GPSArchivalService();