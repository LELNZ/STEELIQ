/**
 * Price Calculation Utilities
 * Handles automatic price/m ↔ price/kg conversion using weightPerMeter
 * Includes manual ton rate functionality
 */

/**
 * Calculate price per kg from price per meter
 */
export function calculatePricePerKg(pricePerMeter: number, weightPerMeter: number): string {
  if (weightPerMeter <= 0) return "0.00";
  return (pricePerMeter / weightPerMeter).toFixed(2);
}

/**
 * Calculate price per meter from price per kg
 */
export function calculatePricePerMeter(pricePerKg: number, weightPerMeter: number): string {
  return (pricePerKg * weightPerMeter).toFixed(2);
}

/**
 * Calculate ton rate (price per tonne)
 */
export function calculateTonRate(pricePerKg: number): string {
  return (pricePerKg * 1000).toFixed(2);
}

/**
 * Calculate price per kg from ton rate
 */
export function calculatePricePerKgFromTonRate(tonRate: number): string {
  return (tonRate / 1000).toFixed(2);
}

/**
 * Calculate price per meter from ton rate
 */
export function calculatePricePerMeterFromTonRate(tonRate: number, weightPerMeter: number): string {
  const pricePerKg = parseFloat(calculatePricePerKgFromTonRate(tonRate));
  return calculatePricePerMeter(pricePerKg, weightPerMeter);
}

/**
 * Validate price input and return formatted value
 */
export function validatePriceInput(value: string): number | null {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0) return null;
  return numValue;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "AUD"): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Auto-calculate missing price values
 */
export function autoCalculatePrices(input: {
  pricePerMeter?: string;
  pricePerKg?: string;
  tonRate?: string;
  weightPerMeter: number;
}): {
  pricePerMeter: string;
  pricePerKg: string;
  tonRate: string;
} {
  const { pricePerMeter, pricePerKg, tonRate, weightPerMeter } = input;

  // If price per meter is provided
  if (pricePerMeter && validatePriceInput(pricePerMeter)) {
    const priceMeter = parseFloat(pricePerMeter);
    const priceKg = calculatePricePerKg(priceMeter, weightPerMeter);
    const rate = calculateTonRate(parseFloat(priceKg));
    return {
      pricePerMeter: priceMeter.toFixed(2),
      pricePerKg: priceKg,
      tonRate: rate
    };
  }

  // If price per kg is provided
  if (pricePerKg && validatePriceInput(pricePerKg)) {
    const priceKgNum = parseFloat(pricePerKg);
    const priceMeter = calculatePricePerMeter(priceKgNum, weightPerMeter);
    const rate = calculateTonRate(priceKgNum);
    return {
      pricePerMeter: priceMeter,
      pricePerKg: priceKgNum.toFixed(2),
      tonRate: rate
    };
  }

  // If ton rate is provided
  if (tonRate && validatePriceInput(tonRate)) {
    const tonRateNum = parseFloat(tonRate);
    const priceKgCalc = calculatePricePerKgFromTonRate(tonRateNum);
    const priceMeter = calculatePricePerMeter(parseFloat(priceKgCalc), weightPerMeter);
    return {
      pricePerMeter: priceMeter,
      pricePerKg: priceKgCalc,
      tonRate: tonRateNum.toFixed(2)
    };
  }

  // Default values if nothing provided
  return {
    pricePerMeter: "0.00",
    pricePerKg: "0.00",
    tonRate: "0.00"
  };
}