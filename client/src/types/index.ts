export interface OptimizationResult {
  plans: CutPlan[];
  summary: {
    totalWaste: number;
    avgEfficiency: number;
    algorithm: string;
  };
}

export interface CutPlan {
  stockLength: number;
  cuts: Cut[];
  wasteLength: number;
  efficiency: number;
}

export interface Cut {
  length: number;
  position: number;
}

export interface MaterialRequirement {
  materialId: number;
  length: number;
  quantity: number;
  angle?: number;
}

export interface StockMaterial {
  materialId: number;
  length: number;
  available: number;
}

export interface JobStats {
  activeJobs: number;
  completedJobs: number;
  totalValue: number;
  avgEfficiency: number;
  weeklyVolume: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  time: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface InventoryAlert {
  id: number;
  materialCode: string;
  materialName: string;
  currentStock: number;
  minimumStock: number;
  status: 'low' | 'out';
}
