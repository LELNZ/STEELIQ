import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import fetch from 'node-fetch';

// Polyfills for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.fetch = fetch as any;

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/steeliq_test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';

// Mock window object for browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator for geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  }
});

// Mock MediaDevices for camera
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  }
});

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not wrapped in act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
export const waitForAsync = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const mockUser = (role: string, permissions: Record<string, boolean> = {}) => ({
  id: Math.floor(Math.random() * 1000),
  email: `test-${role}@lateraleng.com`,
  role,
  permissions
});

export const mockTimesheet = (overrides: any = {}) => ({
  id: Math.floor(Math.random() * 1000),
  employee_id: 1,
  period_start: new Date('2024-11-11'),
  period_end: new Date('2024-11-17'),
  regular_hours: 40,
  overtime_hours: 0,
  total_hours: 40,
  status: 'draft',
  ...overrides
});

export const mockClockEvent = (type: string, timestamp: Date = new Date()) => ({
  id: Math.floor(Math.random() * 1000),
  employee_id: 1,
  clock_type: type,
  timestamp,
  job_id: null,
  gps_latitude: null,
  gps_longitude: null,
  photo_url: null
});