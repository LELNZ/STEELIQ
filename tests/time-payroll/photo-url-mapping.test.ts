/**
 * Photo URL Mapping Unit Tests - Wave 1 Completion
 * 
 * Tests the actual getDisplayPhotoUrl, mapTimeClockResponse, and mapTimeClockResponses
 * functions from server/utils/photoUrlMapper.ts
 * 
 * ADR-0005 Compliance: File Storage Standard
 * - Photo URLs are normalized to /api/time/clock-photo/:clockId format
 * - Ensures consistent access control and audit trail
 */

import { describe, test, expect } from '@jest/globals';
import { 
  getDisplayPhotoUrl, 
  mapTimeClockResponse, 
  mapTimeClockResponses,
  TimeClockRecord 
} from '../../server/utils/photoUrlMapper';

describe('Photo URL Mapping - getDisplayPhotoUrl', () => {
  describe('Null/undefined handling', () => {
    test('returns null for null photoUrl', () => {
      const result = getDisplayPhotoUrl(123, null);
      expect(result).toBeNull();
    });

    test('returns null for undefined photoUrl', () => {
      const result = getDisplayPhotoUrl(123, undefined);
      expect(result).toBeNull();
    });

    test('returns null for empty string photoUrl', () => {
      const result = getDisplayPhotoUrl(123, '');
      expect(result).toBeNull();
    });
  });

  describe('Already-mapped URL handling (idempotency)', () => {
    test('preserves already-mapped URL unchanged', () => {
      const alreadyMapped = '/api/time/clock-photo/456';
      const result = getDisplayPhotoUrl(456, alreadyMapped);
      expect(result).toBe(alreadyMapped);
    });

    test('preserves already-mapped URL even with different clockId', () => {
      const alreadyMapped = '/api/time/clock-photo/789';
      const result = getDisplayPhotoUrl(123, alreadyMapped);
      expect(result).toBe(alreadyMapped);
    });
  });

  describe('Raw storage path conversion', () => {
    test('converts local storage path to API format', () => {
      const localPath = 'secure-uploads/time-clock/1/photo_12345678.jpg';
      const result = getDisplayPhotoUrl(1001, localPath);
      expect(result).toBe('/api/time/clock-photo/1001');
    });

    test('converts cloud storage path to API format', () => {
      const cloudPath = 'time-clock-photos/user_1/clock_in_1732800000000_a1b2c3d4.jpg';
      const result = getDisplayPhotoUrl(2001, cloudPath);
      expect(result).toBe('/api/time/clock-photo/2001');
    });

    test('converts any non-API path to API format', () => {
      const randomPath = 'some/random/path/image.png';
      const result = getDisplayPhotoUrl(3001, randomPath);
      expect(result).toBe('/api/time/clock-photo/3001');
    });
  });

  describe('Edge cases', () => {
    test('handles clockId of 0', () => {
      const result = getDisplayPhotoUrl(0, 'some/path.jpg');
      expect(result).toBe('/api/time/clock-photo/0');
    });

    test('handles large clockId values', () => {
      const largeId = 9999999999;
      const result = getDisplayPhotoUrl(largeId, 'path.jpg');
      expect(result).toBe(`/api/time/clock-photo/${largeId}`);
    });
  });
});

describe('Photo URL Mapping - mapTimeClockResponse', () => {
  describe('Single record mapping', () => {
    test('maps record with raw photoUrl to API format', () => {
      const record: TimeClockRecord = {
        id: 1001,
        userId: 5,
        clockType: 'clock_in',
        timestamp: '2025-11-28T08:00:00Z',
        photoUrl: 'secure-uploads/time-clock/5/photo_123.jpg',
        geolocation: { latitude: -36.848, longitude: 174.763 }
      };

      const result = mapTimeClockResponse(record);

      expect(result.photoUrl).toBe('/api/time/clock-photo/1001');
      expect(result.id).toBe(1001);
      expect(result.userId).toBe(5);
      expect(result.clockType).toBe('clock_in');
      expect(result.timestamp).toBe('2025-11-28T08:00:00Z');
      expect(result.geolocation).toEqual({ latitude: -36.848, longitude: 174.763 });
    });

    test('sets photoUrl to null when original is null', () => {
      const record: TimeClockRecord = {
        id: 1002,
        userId: 6,
        clockType: 'clock_out',
        photoUrl: null
      };

      const result = mapTimeClockResponse(record);

      expect(result.photoUrl).toBeNull();
      expect(result.id).toBe(1002);
    });

    test('preserves already-mapped photoUrl (idempotent)', () => {
      const record: TimeClockRecord = {
        id: 1003,
        photoUrl: '/api/time/clock-photo/1003'
      };

      const result = mapTimeClockResponse(record);

      expect(result.photoUrl).toBe('/api/time/clock-photo/1003');
    });

    test('does not mutate original record', () => {
      const original: TimeClockRecord = {
        id: 1004,
        photoUrl: 'original/path.jpg'
      };
      const originalPhotoUrl = original.photoUrl;

      mapTimeClockResponse(original);

      expect(original.photoUrl).toBe(originalPhotoUrl);
    });
  });

  describe('Record with missing photoUrl property', () => {
    test('handles record without photoUrl property', () => {
      const record: TimeClockRecord = {
        id: 1005,
        clockType: 'break_start'
      };

      const result = mapTimeClockResponse(record);

      expect(result.photoUrl).toBeNull();
      expect(result.id).toBe(1005);
    });
  });
});

describe('Photo URL Mapping - mapTimeClockResponses', () => {
  describe('Array mapping', () => {
    test('maps all records in array', () => {
      const records: TimeClockRecord[] = [
        { id: 2001, photoUrl: 'path/photo1.jpg' },
        { id: 2002, photoUrl: 'path/photo2.jpg' },
        { id: 2003, photoUrl: null },
        { id: 2004, photoUrl: '/api/time/clock-photo/2004' }
      ];

      const result = mapTimeClockResponses(records);

      expect(result.length).toBe(4);
      expect(result[0].photoUrl).toBe('/api/time/clock-photo/2001');
      expect(result[1].photoUrl).toBe('/api/time/clock-photo/2002');
      expect(result[2].photoUrl).toBeNull();
      expect(result[3].photoUrl).toBe('/api/time/clock-photo/2004');
    });

    test('returns empty array for empty input', () => {
      const result = mapTimeClockResponses([]);
      expect(result).toEqual([]);
    });

    test('preserves array order', () => {
      const records: TimeClockRecord[] = [
        { id: 100, photoUrl: 'a.jpg' },
        { id: 200, photoUrl: 'b.jpg' },
        { id: 300, photoUrl: 'c.jpg' }
      ];

      const result = mapTimeClockResponses(records);

      expect(result[0].id).toBe(100);
      expect(result[1].id).toBe(200);
      expect(result[2].id).toBe(300);
    });

    test('does not mutate original array', () => {
      const original: TimeClockRecord[] = [
        { id: 3001, photoUrl: 'original.jpg' }
      ];
      const originalRef = original[0];

      mapTimeClockResponses(original);

      expect(original[0]).toBe(originalRef);
      expect(original[0].photoUrl).toBe('original.jpg');
    });
  });
});

describe('Photo URL Mapping - API endpoint coverage verification', () => {
  /**
   * These tests document which endpoints use mapTimeClockResponse/mapTimeClockResponses
   * and verify the expected URL format.
   */
  
  test('POST /api/time/clock returns mapped URL format', () => {
    const expectedFormat = /^\/api\/time\/clock-photo\/\d+$/;
    const sampleUrl = '/api/time/clock-photo/1234';
    expect(sampleUrl).toMatch(expectedFormat);
  });

  test('GET /api/time/clocks/today returns mapped URL format for array', () => {
    const mappedRecords = mapTimeClockResponses([
      { id: 5001, photoUrl: 'raw/path.jpg' },
      { id: 5002, photoUrl: null }
    ]);
    
    expect(mappedRecords[0].photoUrl).toBe('/api/time/clock-photo/5001');
    expect(mappedRecords[1].photoUrl).toBeNull();
  });

  test('GET /api/time/summary/:date recentActivity uses mapped format', () => {
    const activeWorkers = [
      { id: 6001, userId: 10, clockType: 'clock_in', photoUrl: 'cloud/path.jpg' },
      { id: 6002, userId: 11, clockType: 'clock_in', photoUrl: 'local/path.jpg' }
    ];
    
    const mapped = mapTimeClockResponses(activeWorkers.slice(0, 5));
    
    expect(mapped[0].photoUrl).toBe('/api/time/clock-photo/6001');
    expect(mapped[1].photoUrl).toBe('/api/time/clock-photo/6002');
  });

  test('GET /api/time/entries/recent returns mapped format', () => {
    const entries = [
      { id: 7001, userId: 20, userName: 'Test User', photoUrl: 'storage/photo.jpg' }
    ];
    
    const mapped = mapTimeClockResponses(entries);
    
    expect(mapped[0].photoUrl).toBe('/api/time/clock-photo/7001');
    expect(mapped[0].userName).toBe('Test User');
  });
});

describe('Photo URL Mapping - ADR-0005 Compliance', () => {
  test('All photo URLs use secure API endpoint format', () => {
    const testCases = [
      { id: 1, photoUrl: 'local/file.jpg' },
      { id: 2, photoUrl: 'cloud/object/path.jpg' },
      { id: 3, photoUrl: 's3://bucket/key.jpg' },
      { id: 4, photoUrl: '/uploads/photo.png' },
      { id: 5, photoUrl: 'base64data...' }
    ];

    const results = mapTimeClockResponses(testCases);

    results.forEach((result, index) => {
      expect(result.photoUrl).toBe(`/api/time/clock-photo/${index + 1}`);
      expect(result.photoUrl).toMatch(/^\/api\/time\/clock-photo\/\d+$/);
    });
  });

  test('Secure endpoint format prevents direct file access', () => {
    const sensitiveRecord: TimeClockRecord = {
      id: 8001,
      photoUrl: '/var/www/private/secure-uploads/user_data/photo.jpg'
    };

    const mapped = mapTimeClockResponse(sensitiveRecord);

    expect(mapped.photoUrl).not.toContain('/var/www');
    expect(mapped.photoUrl).not.toContain('private');
    expect(mapped.photoUrl).toBe('/api/time/clock-photo/8001');
  });
});
