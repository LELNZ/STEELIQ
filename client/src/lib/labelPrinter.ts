// Label Printer Integration for Zebra Printers
// Supports ZPL II command language for industrial label printing

export interface LabelData {
  qrCode: string;
  materialCode: string;
  dimensions: string;
  location: string;
  millCertificate?: string;
  date: string;
  remnantId: string;
}

export interface PrinterConfig {
  ip: string;
  port: number;
  dpi: 203 | 300 | 600;
  labelWidth: number; // in mm
  labelHeight: number; // in mm
}

export class ZebraPrinterService {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  // Convert mm to dots based on DPI
  private mmToDots(mm: number): number {
    return Math.round((mm / 25.4) * this.config.dpi);
  }

  // Generate ZPL II command for remnant label
  generateZPL(data: LabelData): string {
    const labelWidthDots = this.mmToDots(this.config.labelWidth);
    const labelHeightDots = this.mmToDots(this.config.labelHeight);
    
    // QR Code position and size
    const qrSize = 5; // Module size for QR code
    const qrX = this.mmToDots(5); // 5mm from left
    const qrY = this.mmToDots(5); // 5mm from top

    // Text positions
    const textX = this.mmToDots(35); // 35mm from left (after QR code)
    const textStartY = this.mmToDots(8);
    const lineHeight = this.mmToDots(7);

    // Build ZPL command
    const zpl = `
^XA
^MMT
^PW${labelWidthDots}
^LL${labelHeightDots}
^LS0

^FT${qrX},${qrY}
^BQN,2,${qrSize}
^FDMA,${data.qrCode}^FS

^CF0,25
^FO${textX},${textStartY}
^FD${data.materialCode}^FS

^CF0,20
^FO${textX},${textStartY + lineHeight}
^FDDimensions: ${data.dimensions}^FS

^FO${textX},${textStartY + lineHeight * 2}
^FDLocation: ${data.location}^FS

^FO${textX},${textStartY + lineHeight * 3}
^FDDate: ${data.date}^FS

${data.millCertificate ? `
^FO${textX},${textStartY + lineHeight * 4}
^FDMill Cert: ${data.millCertificate}^FS
` : ''}

^CF0,15
^FO${this.mmToDots(5)},${this.mmToDots(90)}
^FDID: ${data.remnantId}^FS

^XZ
    `.trim();

    return zpl;
  }

  // Send print job to printer via API
  async printLabel(data: LabelData): Promise<boolean> {
    try {
      const zpl = this.generateZPL(data);
      
      const response = await fetch('/api/print/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerIp: this.config.ip,
          printerPort: this.config.port,
          zplData: zpl,
          remnantId: data.remnantId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Print failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to print label:', error);
      return false;
    }
  }

  // Test printer connection
  async testConnection(): Promise<boolean> {
    try {
      const testZPL = '^XA^FO50,50^A0N,50,50^FDTest Print^FS^XZ';
      
      const response = await fetch('/api/print/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerIp: this.config.ip,
          printerPort: this.config.port,
          zplData: testZPL,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Printer connection test failed:', error);
      return false;
    }
  }

  // Get printer status
  async getStatus(): Promise<{ online: boolean; status: string }> {
    try {
      const response = await fetch(`/api/print/status?ip=${this.config.ip}&port=${this.config.port}`);
      
      if (!response.ok) {
        return { online: false, status: 'Offline' };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return { online: false, status: 'Connection failed' };
    }
  }
}

// Default printer configuration
export const defaultPrinterConfig: PrinterConfig = {
  ip: '192.168.1.100', // Default IP, should be configured
  port: 9100, // Standard RAW port for Zebra printers
  dpi: 300,
  labelWidth: 100, // 100mm width
  labelHeight: 50, // 50mm height
};

// Batch printing utility
export class BatchPrintManager {
  private printer: ZebraPrinterService;
  private queue: LabelData[] = [];
  private printing = false;

  constructor(printer: ZebraPrinterService) {
    this.printer = printer;
  }

  addToQueue(labels: LabelData[]): void {
    this.queue.push(...labels);
  }

  async printBatch(onProgress?: (current: number, total: number) => void): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    if (this.printing) {
      throw new Error('Batch print already in progress');
    }

    this.printing = true;
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const total = this.queue.length;

    try {
      for (let i = 0; i < this.queue.length; i++) {
        const label = this.queue[i];
        
        if (onProgress) {
          onProgress(i + 1, total);
        }

        const success = await this.printer.printLabel(label);
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Failed to print label for remnant ${label.remnantId}`);
        }

        // Small delay between prints to avoid overwhelming the printer
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      this.printing = false;
      this.queue = [];
    }

    return results;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    if (!this.printing) {
      this.queue = [];
    }
  }
}