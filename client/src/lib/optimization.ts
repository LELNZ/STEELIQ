import { MaterialRequirement, StockMaterial, OptimizationResult, CutPlan } from "@/types";

const KERF_WIDTH = 2.4; // mm
const USER_ERROR = 0.5; // mm
const TOTAL_KERF = KERF_WIDTH + USER_ERROR;

export class LinearOptimizer {
  static optimizeLinearCuts(
    requirements: MaterialRequirement[],
    stockMaterials: StockMaterial[],
    algorithm: 'minimize_waste' | 'minimize_cuts' | 'balanced' = 'minimize_waste'
  ): OptimizationResult {
    const plans: CutPlan[] = [];
    let totalWaste = 0;
    let totalEfficiency = 0;

    // Group requirements by material
    const materialGroups = requirements.reduce((groups, req) => {
      if (!groups[req.materialId]) {
        groups[req.materialId] = [];
      }
      groups[req.materialId].push(req);
      return groups;
    }, {} as Record<number, MaterialRequirement[]>);

    // Optimize each material group
    Object.entries(materialGroups).forEach(([materialId, reqs]) => {
      const materialStocks = stockMaterials.filter(s => s.materialId === parseInt(materialId));
      
      materialStocks.forEach(stock => {
        if (stock.available <= 0) return;

        const plan = this.optimizeSingleStock(reqs, stock, algorithm);
        if (plan.cuts.length > 0) {
          plans.push(plan);
          totalWaste += plan.wasteLength;
          totalEfficiency += plan.efficiency;
        }
      });
    });

    const avgEfficiency = plans.length > 0 ? totalEfficiency / plans.length : 0;

    return {
      plans,
      summary: {
        totalWaste,
        avgEfficiency,
        algorithm,
      },
    };
  }

  private static optimizeSingleStock(
    requirements: MaterialRequirement[],
    stock: StockMaterial,
    algorithm: string
  ): CutPlan {
    const plan: CutPlan = {
      stockLength: stock.length,
      cuts: [],
      wasteLength: stock.length,
      efficiency: 0,
    };

    let remainingLength = stock.length;
    const remainingReqs = [...requirements];

    // Sort requirements based on algorithm
    switch (algorithm) {
      case 'minimize_waste':
        remainingReqs.sort((a, b) => b.length - a.length); // Largest first
        break;
      case 'minimize_cuts':
        remainingReqs.sort((a, b) => a.length - b.length); // Smallest first
        break;
      case 'balanced':
        remainingReqs.sort((a, b) => (b.length * b.quantity) - (a.length * a.quantity)); // By total length needed
        break;
    }

    // First Fit Decreasing algorithm
    for (let i = 0; i < remainingReqs.length; i++) {
      const req = remainingReqs[i];
      let cutCount = 0;

      while (cutCount < req.quantity && remainingLength >= req.length + TOTAL_KERF) {
        plan.cuts.push({
          length: req.length,
          position: stock.length - remainingLength,
        });
        
        remainingLength -= (req.length + TOTAL_KERF);
        cutCount++;
      }

      // Update remaining quantity
      remainingReqs[i] = { ...req, quantity: req.quantity - cutCount };
    }

    // Remove the last kerf if we made cuts (no kerf needed after last cut)
    if (plan.cuts.length > 0) {
      remainingLength += TOTAL_KERF;
    }

    plan.wasteLength = remainingLength;
    plan.efficiency = ((stock.length - remainingLength) / stock.length) * 100;

    return plan;
  }

  static calculateCutTime(cuts: number, avgCutTime: number = 10): number {
    // Standard cut time is 10 minutes, angle cuts are 12 minutes
    return cuts * avgCutTime;
  }

  static calculateMaterialCost(
    length: number,
    pricePerMeter: number,
    pricePerKg?: number,
    weightPerMeter?: number
  ): number {
    const lengthInMeters = length / 1000;
    
    if (pricePerMeter) {
      return lengthInMeters * pricePerMeter;
    }
    
    if (pricePerKg && weightPerMeter) {
      return lengthInMeters * weightPerMeter * pricePerKg;
    }
    
    return 0;
  }

  static generateCutList(plans: CutPlan[]): Array<{
    stockNumber: number;
    stockLength: number;
    cuts: Array<{
      cutNumber: number;
      length: number;
      position: number;
      endPosition: number;
    }>;
    wasteLength: number;
    efficiency: number;
  }> {
    return plans.map((plan, stockIndex) => ({
      stockNumber: stockIndex + 1,
      stockLength: plan.stockLength,
      cuts: plan.cuts.map((cut, cutIndex) => ({
        cutNumber: cutIndex + 1,
        length: cut.length,
        position: cut.position,
        endPosition: cut.position + cut.length,
      })),
      wasteLength: plan.wasteLength,
      efficiency: plan.efficiency,
    }));
  }
}
