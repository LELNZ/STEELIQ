/**
 * Time Clock Type Constants
 * Central source of truth for all clock type values used in the system
 */

// Valid clock types as enforced by database constraint
export const CLOCK_TYPES = [
  'clock_in',
  'clock_out',
  'break_start',
  'break_end',
  'meal_start',  // To be added to DB constraint
  'meal_end'     // To be added to DB constraint
] as const;

export type ClockType = typeof CLOCK_TYPES[number];

// Export individual constants for easier use
export const CLOCK_IN = 'clock_in' as const;
export const CLOCK_OUT = 'clock_out' as const;
export const BREAK_START = 'break_start' as const;
export const BREAK_END = 'break_end' as const;
export const MEAL_START = 'meal_start' as const;
export const MEAL_END = 'meal_end' as const;

// Legacy hyphenated values mapping for backwards compatibility
export const LEGACY_CLOCK_TYPE_MAP: Record<string, ClockType> = {
  'clock-in': 'clock_in',
  'clock-out': 'clock_out',
  'break-start': 'break_start',
  'break-end': 'break_end',
  'meal-start': 'meal_start',
  'meal-end': 'meal_end',
  // Also support underscore versions
  'clock_in': 'clock_in',
  'clock_out': 'clock_out',
  'break_start': 'break_start',
  'break_end': 'break_end',
  'meal_start': 'meal_start',
  'meal_end': 'meal_end'
};

// UI display labels for clock types
export const CLOCK_TYPE_LABELS: Record<ClockType, string> = {
  'clock_in': 'Clock In',
  'clock_out': 'Clock Out',
  'break_start': 'Break Start',
  'break_end': 'Break End',
  'meal_start': 'Meal Start',
  'meal_end': 'Meal End'
};

// Helper function to normalize clock type values
export function normalizeClockType(value: string): ClockType | null {
  const normalized = LEGACY_CLOCK_TYPE_MAP[value];
  return normalized || null;
}

// Helper function to check if a value is a valid clock type
export function isValidClockType(value: string): value is ClockType {
  return CLOCK_TYPES.includes(value as ClockType);
}

// Helper to determine if a clock type is a start event
export function isStartEvent(clockType: ClockType): boolean {
  return clockType === 'clock_in' || 
         clockType === 'break_start' || 
         clockType === 'meal_start';
}

// Helper to determine if a clock type is an end event
export function isEndEvent(clockType: ClockType): boolean {
  return clockType === 'clock_out' || 
         clockType === 'break_end' || 
         clockType === 'meal_end';
}

// Helper to determine if a clock type is a break type
export function isBreakType(clockType: ClockType): boolean {
  return clockType === 'break_start' || 
         clockType === 'break_end';
}

// Helper to determine if a clock type is a meal type
export function isMealType(clockType: ClockType): boolean {
  return clockType === 'meal_start' || 
         clockType === 'meal_end';
}

// Helper to get the opposite clock type (for pairing)
export function getOppositeClockType(clockType: ClockType): ClockType | null {
  switch (clockType) {
    case 'clock_in': return 'clock_out';
    case 'clock_out': return 'clock_in';
    case 'break_start': return 'break_end';
    case 'break_end': return 'break_start';
    case 'meal_start': return 'meal_end';
    case 'meal_end': return 'meal_start';
    default: return null;
  }
}