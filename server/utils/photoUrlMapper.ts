/**
 * Photo URL Mapping Utilities - Wave 1 Core Feature
 * 
 * ADR-0005 Compliance: File Storage Standard
 * Normalizes photo URLs to the secure /api/time/clock-photo/:clockId format
 * ensuring consistent access control and audit trail.
 */

export interface TimeClockRecord {
  id: number;
  photoUrl?: string | null;
  [key: string]: any;
}

/**
 * Converts any photo URL format to the canonical display format.
 * - Returns null for missing photos
 * - Preserves already-mapped URLs (idempotent)
 * - Maps raw storage paths to API endpoint format
 */
export const getDisplayPhotoUrl = (clockId: number, photoUrl: string | null | undefined): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('/api/time/clock-photo/')) return photoUrl;
  return `/api/time/clock-photo/${clockId}`;
};

/**
 * Maps a single time clock record to use canonical photo URL format.
 * Preserves all other fields unchanged.
 */
export const mapTimeClockResponse = <T extends TimeClockRecord>(record: T): T => {
  return {
    ...record,
    photoUrl: record.photoUrl ? getDisplayPhotoUrl(record.id, record.photoUrl) : null
  };
};

/**
 * Maps an array of time clock records to use canonical photo URL format.
 */
export const mapTimeClockResponses = <T extends TimeClockRecord>(records: T[]): T[] => {
  return records.map(mapTimeClockResponse);
};
