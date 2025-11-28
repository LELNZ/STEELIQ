/**
 * Validation utilities for ensuring data integrity across the system
 */

// PostgreSQL integer maximum value (32-bit signed integer)
export const POSTGRES_MAX_INT = 2147483647;
export const POSTGRES_MIN_INT = -2147483647;

/**
 * Validates that a numeric value doesn't exceed PostgreSQL's integer limits
 * @param value - The value to validate
 * @param fieldName - The name of the field (for error messages)
 * @returns An error message if invalid, null if valid
 */
export function validateIntegerRange(
  value: number | string | null | undefined,
  fieldName: string
): string | null {
  if (value === null || value === undefined) {
    return null; // Null/undefined values are allowed
  }

  const numericValue = typeof value === 'number' ? value : parseInt(value.toString(), 10);

  if (isNaN(numericValue)) {
    return `${fieldName} must be a valid number, received: ${value}`;
  }

  if (numericValue > POSTGRES_MAX_INT || numericValue < POSTGRES_MIN_INT) {
    return `${fieldName} value ${numericValue} exceeds PostgreSQL integer range. Maximum allowed value is ${POSTGRES_MAX_INT}. This often happens when using Date.now() or timestamp values instead of database IDs.`;
  }

  return null;
}

/**
 * Checks if a value looks like a timestamp ID (common error pattern)
 * @param value - The value to check
 * @returns true if it appears to be a timestamp
 */
export function looksLikeTimestamp(value: number | string): boolean {
  const numericValue = typeof value === 'number' ? value : parseInt(value.toString(), 10);
  
  if (isNaN(numericValue)) {
    return false;
  }

  // Date.now() returns milliseconds since 1970
  // Any value > 1,000,000,000,000 (Sep 2001) is likely a timestamp
  // PostgreSQL max int is 2,147,483,647 (Jan 1970 + ~68 years)
  return numericValue > 1000000000000;
}

/**
 * Validates multiple ID fields at once
 * @param ids - Object containing field names and values
 * @returns Object with field names and error messages, or null if all valid
 */
export function validateMultipleIds(ids: Record<string, any>): Record<string, string> | null {
  const errors: Record<string, string> = {};

  for (const [fieldName, value] of Object.entries(ids)) {
    const error = validateIntegerRange(value, fieldName);
    if (error) {
      errors[fieldName] = error;
      
      // Add helpful hint if it looks like a timestamp
      if (looksLikeTimestamp(value)) {
        errors[fieldName] += ' (Detected possible timestamp - use database-generated IDs instead)';
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Sanitizes an ID value, converting timestamps to null
 * @param value - The value to sanitize
 * @param fieldName - The name of the field (for logging)
 * @returns The sanitized value or null
 */
export function sanitizeId(
  value: number | string | null | undefined,
  fieldName: string
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : parseInt(value.toString(), 10);

  if (isNaN(numericValue)) {
    console.warn(`${fieldName}: Invalid numeric value "${value}", using null`);
    return null;
  }

  if (looksLikeTimestamp(numericValue)) {
    console.warn(`${fieldName}: Detected timestamp ID ${numericValue}, using null instead`);
    return null;
  }

  if (numericValue > POSTGRES_MAX_INT || numericValue < POSTGRES_MIN_INT) {
    console.warn(`${fieldName}: Value ${numericValue} exceeds PostgreSQL limits, using null`);
    return null;
  }

  return numericValue;
}