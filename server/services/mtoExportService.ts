import * as XLSX from 'xlsx';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs/promises';
import path from 'path';
import { SelectAiEstimationResult, SelectMtoItem } from '@shared/schema';

interface ExportOptions {
  format: 'excel' | 'csv';
  includeEvidence?: boolean;
  includeMetadata?: boolean;
  groupByCategory?: boolean;
}

interface MTOExportRow {
  item_number: number;
  designation: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  location?: string;
  material_grade?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  confidence?: number;
  source_page?: number;
  evidence?: string;
}

class MTOExportService {
  private exportDir = path.join(process.cwd(), 'exports');

  constructor() {
    this.ensureExportDir();
  }

  private async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }
  }

  /**
   * Export MTO results to Excel or CSV format
   */
  async exportMTO(
    estimationResult: SelectAiEstimationResult,
    mtoItems: SelectMtoItem[],
    options: ExportOptions
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Prepare data for export
      const exportData = this.prepareMTOData(mtoItems, options);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `mto_export_${estimationResult.projectId}_${timestamp}`;

      if (options.format === 'excel') {
        return await this.exportToExcel(exportData, filename, estimationResult, options);
      } else {
        return await this.exportToCSV(exportData, filename);
      }
    } catch (error) {
      console.error('[MTO Export Error]:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Prepare MTO items for export
   */
  private prepareMTOData(mtoItems: SelectMtoItem[], options: ExportOptions): MTOExportRow[] {
    const rows: MTOExportRow[] = [];

    // Sort items by category and designation
    const sortedItems = [...mtoItems].sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return (a.designation || '').localeCompare(b.designation || '');
    });

    sortedItems.forEach((item, index) => {
      const row: MTOExportRow = {
        item_number: index + 1,
        designation: item.designation || '',
        description: item.description || '',
        category: item.category || 'UNCATEGORIZED',
        quantity: item.quantity || 0,
        unit: item.unit || 'EA',
        location: item.location || '',
        material_grade: item.materialGrade || '',
        weight: item.weight || 0,
        length: item.length || 0,
        width: item.width || 0,
        height: item.height || 0
      };

      if (options.includeEvidence) {
        row.confidence = item.confidence || 0;
        row.source_page = item.pageReference || 0;
        row.evidence = item.evidenceText || '';
      }

      rows.push(row);
    });

    return rows;
  }

  /**
   * Export to Excel format with multiple sheets
   */
  private async exportToExcel(
    data: MTOExportRow[],
    filename: string,
    estimationResult: SelectAiEstimationResult,
    options: ExportOptions
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const workbook = XLSX.utils.book_new();

      // Main MTO sheet
      const mtoSheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, mtoSheet, 'Material Take-Off');

      // Summary sheet
      if (options.includeMetadata) {
        const summaryData = this.generateSummaryData(data, estimationResult);
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      // Category breakdown sheet
      if (options.groupByCategory) {
        const categoryData = this.generateCategoryBreakdown(data);
        const categorySheet = XLSX.utils.json_to_sheet(categoryData);
        XLSX.utils.book_append_sheet(workbook, categorySheet, 'By Category');
      }

      // Apply column widths for better readability
      const worksheet = workbook.Sheets['Material Take-Off'];
      const colWidths = [
        { wch: 10 }, // item_number
        { wch: 20 }, // designation
        { wch: 40 }, // description
        { wch: 15 }, // category
        { wch: 12 }, // quantity
        { wch: 8 },  // unit
        { wch: 20 }, // location
        { wch: 15 }, // material_grade
        { wch: 12 }, // weight
        { wch: 12 }, // length
        { wch: 12 }, // width
        { wch: 12 }  // height
      ];
      worksheet['!cols'] = colWidths;

      // Write to file
      const filePath = path.join(this.exportDir, `${filename}.xlsx`);
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath
      };
    } catch (error) {
      console.error('[Excel Export Error]:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Excel export failed'
      };
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    data: MTOExportRow[],
    filename: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const filePath = path.join(this.exportDir, `${filename}.csv`);

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'item_number', title: 'Item #' },
          { id: 'designation', title: 'Designation' },
          { id: 'description', title: 'Description' },
          { id: 'category', title: 'Category' },
          { id: 'quantity', title: 'Quantity' },
          { id: 'unit', title: 'Unit' },
          { id: 'location', title: 'Location' },
          { id: 'material_grade', title: 'Material Grade' },
          { id: 'weight', title: 'Weight (kg)' },
          { id: 'length', title: 'Length (mm)' },
          { id: 'width', title: 'Width (mm)' },
          { id: 'height', title: 'Height (mm)' },
          { id: 'confidence', title: 'Confidence %' },
          { id: 'source_page', title: 'Source Page' },
          { id: 'evidence', title: 'Evidence Text' }
        ]
      });

      await csvWriter.writeRecords(data);

      return {
        success: true,
        filePath
      };
    } catch (error) {
      console.error('[CSV Export Error]:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV export failed'
      };
    }
  }

  /**
   * Generate summary data for Excel
   */
  private generateSummaryData(data: MTOExportRow[], result: SelectAiEstimationResult): any[] {
    const totalItems = data.length;
    const categories = [...new Set(data.map(d => d.category))];
    const totalWeight = data.reduce((sum, item) => sum + (item.weight || 0), 0);
    const avgConfidence = data.reduce((sum, item) => sum + (item.confidence || 0), 0) / totalItems;

    return [
      { Metric: 'Project ID', Value: result.projectId || 'N/A' },
      { Metric: 'Extraction Date', Value: new Date().toISOString() },
      { Metric: 'Total Items', Value: totalItems },
      { Metric: 'Total Categories', Value: categories.length },
      { Metric: 'Total Weight (kg)', Value: totalWeight.toFixed(2) },
      { Metric: 'Average Confidence', Value: `${avgConfidence.toFixed(1)}%` },
      { Metric: 'Extraction Method', Value: result.extractionMethod || 'AI' },
      { Metric: 'Processing Time (s)', Value: result.processingTimeSeconds || 'N/A' }
    ];
  }

  /**
   * Generate category breakdown for Excel
   */
  private generateCategoryBreakdown(data: MTOExportRow[]): any[] {
    const categoryMap = new Map<string, {
      count: number;
      totalQuantity: number;
      totalWeight: number;
    }>();

    data.forEach(item => {
      const category = item.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          count: 0,
          totalQuantity: 0,
          totalWeight: 0
        });
      }
      const cat = categoryMap.get(category)!;
      cat.count++;
      cat.totalQuantity += item.quantity;
      cat.totalWeight += item.weight || 0;
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      Category: category,
      'Item Count': stats.count,
      'Total Quantity': stats.totalQuantity,
      'Total Weight (kg)': stats.totalWeight.toFixed(2)
    }));
  }

  /**
   * Export batch processing results
   */
  async exportBatchResults(
    batchId: string,
    results: Array<{ estimationResult: SelectAiEstimationResult; mtoItems: SelectMtoItem[] }>,
    format: 'excel' | 'csv'
  ): Promise<{ success: boolean; filePaths?: string[]; error?: string }> {
    try {
      const filePaths: string[] = [];

      for (const { estimationResult, mtoItems } of results) {
        const result = await this.exportMTO(estimationResult, mtoItems, {
          format,
          includeEvidence: true,
          includeMetadata: true,
          groupByCategory: true
        });

        if (result.success && result.filePath) {
          filePaths.push(result.filePath);
        }
      }

      // Create a summary file for the batch
      if (format === 'excel') {
        await this.createBatchSummaryExcel(batchId, results, filePaths);
      }

      return {
        success: true,
        filePaths
      };
    } catch (error) {
      console.error('[Batch Export Error]:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch export failed'
      };
    }
  }

  /**
   * Create batch summary Excel file
   */
  private async createBatchSummaryExcel(
    batchId: string,
    results: Array<{ estimationResult: SelectAiEstimationResult; mtoItems: SelectMtoItem[] }>,
    filePaths: string[]
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();
    
    const summaryData = results.map((r, index) => ({
      'File #': index + 1,
      'Project ID': r.estimationResult.projectId,
      'Items Found': r.mtoItems.length,
      'Extraction Method': r.estimationResult.extractionMethod,
      'Processing Time': r.estimationResult.processingTimeSeconds,
      'Export Path': filePaths[index] || 'N/A'
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Batch Summary');

    const summaryPath = path.join(this.exportDir, `batch_${batchId}_summary.xlsx`);
    XLSX.writeFile(workbook, summaryPath);
  }
}

export const mtoExportService = new MTOExportService();