/**
 * Photo URL Routes Verification Tests - Wave 1 Completion
 * 
 * Static analysis tests that verify the production routes.ts file
 * correctly calls mapTimeClockResponse/mapTimeClockResponses for all
 * time clock endpoints.
 * 
 * This is a code verification test that ensures the wiring is correct,
 * complementing the unit tests for the mapper functions themselves.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Photo URL Routes Verification - Production Code Wiring', () => {
  let routesContent: string;

  beforeAll(() => {
    const routesPath = path.join(__dirname, '../../server/routes.ts');
    routesContent = fs.readFileSync(routesPath, 'utf-8');
  });

  describe('Import Verification', () => {
    test('routes.ts imports mapTimeClockResponse from photoUrlMapper', () => {
      expect(routesContent).toContain("import {");
      expect(routesContent).toContain("mapTimeClockResponse");
      expect(routesContent).toContain("mapTimeClockResponses");
      expect(routesContent).toContain('from "./utils/photoUrlMapper"');
    });

    test('routes.ts does NOT define inline photo URL functions', () => {
      const inlineGetDisplayPhotoUrl = /const getDisplayPhotoUrl\s*=\s*\(/.test(routesContent);
      const inlineMapTimeClockResponse = /const mapTimeClockResponse\s*=\s*</.test(routesContent);
      
      expect(inlineGetDisplayPhotoUrl).toBe(false);
      expect(inlineMapTimeClockResponse).toBe(false);
    });
  });

  describe('POST /api/time/clock Endpoint', () => {
    test('uses mapTimeClockResponse on response', () => {
      const endpointPattern = /app\.post\("\/api\/time\/clock"[\s\S]*?res\.json\(mapTimeClockResponse\(/;
      expect(routesContent).toMatch(endpointPattern);
    });
  });

  describe('GET /api/time/clocks/today Endpoint', () => {
    test('uses mapTimeClockResponses on response array', () => {
      const endpointPattern = /app\.get\("\/api\/time\/clocks\/today"[\s\S]*?res\.json\(mapTimeClockResponses\(/;
      expect(routesContent).toMatch(endpointPattern);
    });
  });

  describe('GET /api/time/summary/:date Endpoint', () => {
    test('uses mapTimeClockResponses for recentActivity', () => {
      const endpointPattern = /app\.get\("\/api\/time\/summary\/:date"[\s\S]*?recentActivity:\s*mapTimeClockResponses\(/;
      expect(routesContent).toMatch(endpointPattern);
    });
  });

  describe('GET /api/time/entries/recent Endpoint', () => {
    test('uses mapTimeClockResponses on response', () => {
      const endpointPattern = /app\.get\("\/api\/time\/entries\/recent"[\s\S]*?res\.json\(mapTimeClockResponses\(/;
      expect(routesContent).toMatch(endpointPattern);
    });
  });

  describe('Security - No Raw Photo URLs in Responses', () => {
    test('all time clock endpoints use mapper before sending response', () => {
      const endpoints = [
        '/api/time/clock',
        '/api/time/clocks/today',
        '/api/time/summary/:date',
        '/api/time/entries/recent'
      ];

      endpoints.forEach(endpoint => {
        const endpointEscaped = endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':date', ':date');
        const pattern = new RegExp(
          `app\\.(get|post)\\("${endpointEscaped}"[\\s\\S]*?(mapTimeClockResponse|mapTimeClockResponses)\\(`
        );
        expect(routesContent).toMatch(pattern);
      });
    });
  });
});

/**
 * Runtime verification that the utility module is properly structured
 */
describe('Photo URL Mapper Module Structure', () => {
  test('photoUrlMapper exports required functions', async () => {
    const mapper = await import('../../server/utils/photoUrlMapper');
    
    expect(typeof mapper.getDisplayPhotoUrl).toBe('function');
    expect(typeof mapper.mapTimeClockResponse).toBe('function');
    expect(typeof mapper.mapTimeClockResponses).toBe('function');
  });

  test('functions have correct signatures', async () => {
    const { getDisplayPhotoUrl, mapTimeClockResponse, mapTimeClockResponses } = 
      await import('../../server/utils/photoUrlMapper');

    // getDisplayPhotoUrl takes (clockId, photoUrl) and returns string|null
    const result1 = getDisplayPhotoUrl(1, 'path');
    expect(typeof result1).toBe('string');
    expect(getDisplayPhotoUrl(1, null)).toBeNull();

    // mapTimeClockResponse takes a record and returns transformed record
    const result2 = mapTimeClockResponse({ id: 1, photoUrl: 'path' });
    expect(typeof result2).toBe('object');
    expect(result2.id).toBe(1);

    // mapTimeClockResponses takes an array and returns transformed array
    const result3 = mapTimeClockResponses([{ id: 1, photoUrl: 'path' }]);
    expect(Array.isArray(result3)).toBe(true);
  });
});
