export class CuttingCalculations {
  static readonly KERF_WIDTH = 2.4; // mm
  static readonly USER_ERROR = 0.5; // mm
  static readonly STANDARD_CUT_TIME = 10; // minutes
  static readonly ANGLE_CUT_TIME = 12; // minutes

  static calculateTotalKerf(): number {
    return this.KERF_WIDTH + this.USER_ERROR;
  }

  static calculateCutTime(quantity: number, hasAngleCuts: boolean = false): number {
    const baseTime = hasAngleCuts ? this.ANGLE_CUT_TIME : this.STANDARD_CUT_TIME;
    return quantity * baseTime;
  }

  static calculateMaterialWeight(
    length: number, // mm
    weightPerMeter: number // kg/m
  ): number {
    return (length / 1000) * weightPerMeter;
  }

  static calculateMaterialCost(
    length: number, // mm
    pricePerMeter?: number,
    pricePerKg?: number,
    weightPerMeter?: number
  ): number {
    const lengthInMeters = length / 1000;
    
    if (pricePerMeter) {
      return lengthInMeters * pricePerMeter;
    }
    
    if (pricePerKg && weightPerMeter) {
      const weight = this.calculateMaterialWeight(length, weightPerMeter);
      return weight * pricePerKg;
    }
    
    return 0;
  }

  static calculateWastePercentage(
    totalMaterialUsed: number,
    totalMaterialRequired: number
  ): number {
    if (totalMaterialRequired === 0) return 0;
    const waste = totalMaterialUsed - totalMaterialRequired;
    return (waste / totalMaterialUsed) * 100;
  }

  static calculateEfficiency(
    usedLength: number,
    totalLength: number
  ): number {
    if (totalLength === 0) return 0;
    return (usedLength / totalLength) * 100;
  }

  static generateQRCode(data: string): string {
    // In a real implementation, this would generate a proper QR code
    // For now, return a placeholder URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
  }

  static generateBarcode(data: string): string {
    // In a real implementation, this would generate a proper barcode
    // For now, return a placeholder URL
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(data)}&code=Code128&multiplebarcodes=false&translate-esc=false&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
  }

  static formatCurrency(amount: number, currency: string = 'NZD'): string {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  static formatDimensions(
    width?: number,
    thickness?: number,
    length?: number
  ): string {
    const parts = [];
    if (width) parts.push(`${width}mm`);
    if (thickness) parts.push(`${thickness}mm`);
    if (length) parts.push(`${length}mm`);
    return parts.join(' × ');
  }

  static calculateRushOrderPremium(
    baseAmount: number,
    premiumPercentage: number = 15
  ): number {
    return baseAmount * (premiumPercentage / 100);
  }

  static estimateProjectTimeline(
    totalCutTime: number, // minutes
    teamSize: number = 3,
    workingHoursPerDay: number = 8
  ): {
    totalHours: number;
    workingDays: number;
    estimatedWeeks: number;
  } {
    const totalHours = totalCutTime / 60;
    const dailyCapacity = teamSize * workingHoursPerDay;
    const workingDays = Math.ceil(totalHours / dailyCapacity);
    const estimatedWeeks = Math.ceil(workingDays / 5); // 5 working days per week

    return {
      totalHours,
      workingDays,
      estimatedWeeks,
    };
  }
}
