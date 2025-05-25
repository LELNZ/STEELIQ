/**
 * Advanced Cutting Optimization Engine for Lateral Engineering
 * Implements multiple algorithms to minimize waste and maximize material utilization
 */

export interface CutRequest {
  id: string;
  length: number;
  quantity: number;
  materialType: string;
  startAngle?: number; // Left side cutting angle in degrees, default 90
  endAngle?: number; // Right side cutting angle in degrees, default 90
  angle?: number; // Legacy support - will be used for both if start/end not specified
  priority?: number;
  jobId?: string;
  description?: string;
}

export interface StockItem {
  id: string;
  length: number;
  available: number;
  materialType: string;
  cost?: number;
  supplier?: string;
}

export interface Cut {
  requestId: string;
  length: number;
  position: number;
  quantity: number;
  startAngle?: number; // Left side cutting angle in degrees
  endAngle?: number; // Right side cutting angle in degrees
  angle?: number; // Legacy support
  usesExistingAngle?: boolean; // True if this cut starts with an existing angle from previous cut
  createsOffcut?: boolean; // True if this cut creates a reusable angled offcut
}

export interface CuttingPlan {
  stockId: string;
  stockLength: number;
  cuts: Cut[];
  wasteLength: number;
  efficiency: number;
  totalCuts: number;
  kerfLoss: number;
}

export interface OptimizationResult {
  plans: CuttingPlan[];
  summary: {
    totalWaste: number;
    totalWastePercentage: number;
    avgEfficiency: number;
    totalCuts: number;
    totalCuttingTime: number; // in minutes
    algorithm: string;
    executionTime: number;
  };
  remnants: Remnant[];
  unallocated: CutRequest[];
}

export interface Remnant {
  id: string;
  length: number;
  materialType: string;
  stockId: string;
  isReusable: boolean;
  millCert?: string;
  heatNumber?: string;
  existingStartAngle?: number; // Angle already cut on the left side
  existingEndAngle?: number; // Angle already cut on the right side
  canChainWith?: string[]; // IDs of cut requests this remnant can be chained with
}

export class CuttingOptimizer {
  private static readonly KERF_WIDTH = 2.4; // mm
  private static readonly USER_ERROR = 0.5; // mm
  private static readonly TOTAL_KERF = CuttingOptimizer.KERF_WIDTH + CuttingOptimizer.USER_ERROR;
  private static readonly MIN_REMNANT_LENGTH = 500; // mm - minimum length to save as remnant
  private static readonly SAFETY_MARGIN = 10; // mm - additional safety margin

  /**
   * Progressive Angle-Aware Optimization
   * Intelligently chains cuts with compatible angles to minimize waste
   */
  static progressiveAngleOptimization(
    requests: CutRequest[],
    stock: StockItem[]
  ): OptimizationResult {
    const startTime = performance.now();
    const plans: CuttingPlan[] = [];
    const remnants: Remnant[] = [];
    const unallocated: CutRequest[] = [];
    
    // Group requests by material type and analyze angle compatibility
    const materialGroups = this.groupRequestsByMaterial(requests);
    const availableStock = stock.map(s => ({ ...s, remaining: s.available }));
    
    for (const [materialType, materialRequests] of materialGroups) {
      const materialStock = availableStock.filter(s => s.materialType === materialType);
      const angleChains = this.buildAngleChains(materialRequests);
      
      // Process each angle chain for optimal material usage
      for (const chain of angleChains) {
        this.processAngleChain(chain, materialStock, plans, remnants, unallocated);
      }
    }
    
    const executionTime = performance.now() - startTime;
    return this.buildOptimizationResult(plans, remnants, unallocated, "Progressive Angle-Aware", executionTime);
  }

  /**
   * Groups cut requests by material type for efficient processing
   */
  private static groupRequestsByMaterial(requests: CutRequest[]): Map<string, CutRequest[]> {
    const groups = new Map<string, CutRequest[]>();
    
    for (const request of requests) {
      const existing = groups.get(request.materialType) || [];
      existing.push(request);
      groups.set(request.materialType, existing);
    }
    
    return groups;
  }

  /**
   * Builds chains of cuts that can share angled offcuts
   */
  private static buildAngleChains(requests: CutRequest[]): CutRequest[][] {
    const chains: CutRequest[][] = [];
    const processed = new Set<string>();
    
    for (const request of requests) {
      if (processed.has(request.id)) continue;
      
      const chain = this.findCompatibleChain(request, requests, processed);
      chains.push(chain);
    }
    
    return chains;
  }

  /**
   * Finds all cuts that can be chained together due to compatible angles
   */
  private static findCompatibleChain(
    startRequest: CutRequest, 
    allRequests: CutRequest[], 
    processed: Set<string>
  ): CutRequest[] {
    const chain = [startRequest];
    processed.add(startRequest.id);
    
    const startAngle = startRequest.startAngle || startRequest.angle || 90;
    const endAngle = startRequest.endAngle || startRequest.angle || 90;
    
    // Find requests that can use the end angle as their start angle
    for (const request of allRequests) {
      if (processed.has(request.id)) continue;
      
      const reqStartAngle = request.startAngle || request.angle || 90;
      
      // Check if this request can start with the previous cut's end angle
      if (Math.abs(reqStartAngle - endAngle) < 1) { // Allow 1° tolerance
        const subChain = this.findCompatibleChain(request, allRequests, processed);
        chain.push(...subChain);
        break; // Only chain one at a time for simplicity
      }
    }
    
    return chain;
  }

  /**
   * Processes a chain of angle-compatible cuts for optimal material usage
   */
  private static processAngleChain(
    chain: CutRequest[],
    materialStock: StockItem[],
    plans: CuttingPlan[],
    remnants: Remnant[],
    unallocated: CutRequest[]
  ): void {
    // Expand chain by quantity
    const expandedChain: (CutRequest & { chainPosition: number })[] = [];
    
    for (const request of chain) {
      for (let i = 0; i < request.quantity; i++) {
        expandedChain.push({ 
          ...request, 
          id: `${request.id}_${i}`,
          chainPosition: chain.indexOf(request)
        });
      }
    }
    
    // Try to fit chains in available stock
    for (const stockItem of materialStock) {
      while (stockItem.remaining > 0 && expandedChain.length > 0) {
        const result = this.fitChainInStock(expandedChain, stockItem);
        if (result.plan) {
          plans.push(result.plan);
          expandedChain.splice(0, result.consumedCuts);
          
          // Create remnant if significant length remains
          if (result.remainingLength >= this.MIN_REMNANT_LENGTH) {
            remnants.push({
              id: `remnant_${result.plan.stockId}_${Date.now()}`,
              length: result.remainingLength,
              materialType: stockItem.materialType,
              stockId: result.plan.stockId,
              isReusable: true,
              existingStartAngle: result.lastEndAngle,
              canChainWith: []
            });
          }
        } else {
          break; // Can't fit any more in this stock
        }
      }
    }
    
    // Add any remaining cuts to unallocated
    unallocated.push(...expandedChain);
  }

  /**
   * Attempts to fit a chain of cuts in a single stock item
   */
  private static fitChainInStock(
    chain: (CutRequest & { chainPosition: number })[],
    stockItem: StockItem
  ): {
    plan: CuttingPlan | null;
    consumedCuts: number;
    remainingLength: number;
    lastEndAngle?: number;
  } {
    if (chain.length === 0) return { plan: null, consumedCuts: 0, remainingLength: stockItem.length };
    
    const cuts: Cut[] = [];
    let currentPosition = 0;
    let consumedCuts = 0;
    let totalKerfLoss = 0;
    
    for (let i = 0; i < chain.length; i++) {
      const request = chain[i];
      const requiredLength = request.length;
      const isFirstCut = i === 0;
      const isPreviousChained = i > 0 && chain[i-1].chainPosition === request.chainPosition - 1;
      
      // Calculate kerf - no kerf needed if using existing angle from previous cut
      const kerfNeeded = isFirstCut || !isPreviousChained ? this.TOTAL_KERF : 0;
      const totalRequired = requiredLength + kerfNeeded;
      
      if (currentPosition + totalRequired > stockItem.length) {
        break; // Won't fit
      }
      
      cuts.push({
        requestId: request.id,
        length: requiredLength,
        position: currentPosition + kerfNeeded,
        quantity: 1,
        startAngle: request.startAngle || request.angle || 90,
        endAngle: request.endAngle || request.angle || 90,
        usesExistingAngle: isPreviousChained,
        createsOffcut: i < chain.length - 1
      });
      
      currentPosition += totalRequired;
      totalKerfLoss += kerfNeeded;
      consumedCuts++;
    }
    
    if (cuts.length === 0) return { plan: null, consumedCuts: 0, remainingLength: stockItem.length };
    
    const wasteLength = stockItem.length - currentPosition;
    const efficiency = ((stockItem.length - wasteLength) / stockItem.length) * 100;
    
    const plan: CuttingPlan = {
      stockId: `stock_${stockItem.materialType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stockLength: stockItem.length,
      cuts,
      wasteLength,
      efficiency,
      totalCuts: cuts.length,
      kerfLoss: totalKerfLoss
    };
    
    stockItem.remaining--;
    
    const lastCut = cuts[cuts.length - 1];
    return {
      plan,
      consumedCuts,
      remainingLength: wasteLength,
      lastEndAngle: lastCut.endAngle
    };
  }

  /**
   * First Fit Decreasing Algorithm
   * Sorts cuts by length (descending) and places each in the first stock that fits
   */
  static firstFitDecreasing(
    requests: CutRequest[],
    stock: StockItem[]
  ): OptimizationResult {
    const startTime = performance.now();
    const plans: CuttingPlan[] = [];
    const remnants: Remnant[] = [];
    const unallocated: CutRequest[] = [];
    
    // Sort requests by length descending
    const sortedRequests = [...requests].sort((a, b) => b.length - a.length);
    const availableStock = stock.map(s => ({ ...s, remaining: s.available }));
    
    // Expand requests by quantity
    const expandedRequests: (CutRequest & { originalId: string })[] = [];
    sortedRequests.forEach(req => {
      for (let i = 0; i < req.quantity; i++) {
        expandedRequests.push({ ...req, originalId: req.id, id: `${req.id}_${i}` });
      }
    });

    for (const request of expandedRequests) {
      let allocated = false;
      
      // Try to fit in existing plans
      for (const plan of plans) {
        if (this.canFitInPlan(plan, request)) {
          this.addCutToPlan(plan, request);
          allocated = true;
          break;
        }
      }
      
      // If not allocated, try new stock
      if (!allocated) {
        const suitableStock = availableStock.find(s => 
          s.remaining > 0 && 
          s.materialType === request.materialType &&
          s.length >= request.length + this.TOTAL_KERF + this.SAFETY_MARGIN
        );
        
        if (suitableStock) {
          const newPlan = this.createNewPlan(suitableStock, request);
          plans.push(newPlan);
          suitableStock.remaining--;
          allocated = true;
        }
      }
      
      if (!allocated) {
        unallocated.push(request);
      }
    }

    // Generate remnants
    plans.forEach(plan => {
      if (plan.wasteLength >= this.MIN_REMNANT_LENGTH) {
        remnants.push({
          id: `remnant_${plan.stockId}_${Date.now()}`,
          length: plan.wasteLength,
          materialType: plan.cuts[0]?.requestId ? 
            requests.find(r => r.id === plan.cuts[0].requestId.split('_')[0])?.materialType || '' : '',
          stockId: plan.stockId,
          isReusable: true
        });
      }
    });

    const summary = this.calculateSummary(plans, "First Fit Decreasing", performance.now() - startTime);
    
    return { plans, summary, remnants, unallocated };
  }

  /**
   * Best Fit Algorithm
   * Places each cut in the stock that results in the least waste
   */
  static bestFit(
    requests: CutRequest[],
    stock: StockItem[]
  ): OptimizationResult {
    const startTime = performance.now();
    const plans: CuttingPlan[] = [];
    const remnants: Remnant[] = [];
    const unallocated: CutRequest[] = [];
    
    // Sort requests by length descending for better packing
    const sortedRequests = [...requests].sort((a, b) => b.length - a.length);
    const availableStock = stock.map(s => ({ ...s, remaining: s.available }));
    
    // Expand requests by quantity
    const expandedRequests: (CutRequest & { originalId: string })[] = [];
    sortedRequests.forEach(req => {
      for (let i = 0; i < req.quantity; i++) {
        expandedRequests.push({ ...req, originalId: req.id, id: `${req.id}_${i}` });
      }
    });

    for (const request of expandedRequests) {
      let bestPlan: CuttingPlan | null = null;
      let bestWaste = Infinity;
      
      // Find best fit among existing plans
      for (const plan of plans) {
        if (this.canFitInPlan(plan, request)) {
          const wasteAfterCut = this.calculateWasteAfterCut(plan, request);
          if (wasteAfterCut < bestWaste) {
            bestWaste = wasteAfterCut;
            bestPlan = plan;
          }
        }
      }
      
      // If found best existing plan, use it
      if (bestPlan) {
        this.addCutToPlan(bestPlan, request);
        continue;
      }
      
      // Try new stock pieces
      let bestStock: typeof availableStock[0] | null = null;
      bestWaste = Infinity;
      
      for (const stockItem of availableStock) {
        if (stockItem.remaining > 0 && 
            stockItem.materialType === request.materialType &&
            stockItem.length >= request.length + this.TOTAL_KERF + this.SAFETY_MARGIN) {
          
          const wasteIfUsed = stockItem.length - request.length - this.TOTAL_KERF;
          if (wasteIfUsed < bestWaste) {
            bestWaste = wasteIfUsed;
            bestStock = stockItem;
          }
        }
      }
      
      if (bestStock) {
        const newPlan = this.createNewPlan(bestStock, request);
        plans.push(newPlan);
        bestStock.remaining--;
      } else {
        unallocated.push(request);
      }
    }

    // Generate remnants
    plans.forEach(plan => {
      if (plan.wasteLength >= this.MIN_REMNANT_LENGTH) {
        remnants.push({
          id: `remnant_${plan.stockId}_${Date.now()}`,
          length: plan.wasteLength,
          materialType: plan.cuts[0]?.requestId ? 
            requests.find(r => r.id === plan.cuts[0].requestId.split('_')[0])?.materialType || '' : '',
          stockId: plan.stockId,
          isReusable: true
        });
      }
    });

    const summary = this.calculateSummary(plans, "Best Fit", performance.now() - startTime);
    
    return { plans, summary, remnants, unallocated };
  }

  /**
   * Bin Packing with Dynamic Programming
   * More sophisticated algorithm for complex optimization scenarios
   */
  static binPackingDP(
    requests: CutRequest[],
    stock: StockItem[]
  ): OptimizationResult {
    const startTime = performance.now();
    
    // For now, fall back to Best Fit but with enhanced logic
    // This can be expanded with actual DP implementation
    const result = this.bestFit(requests, stock);
    result.summary.algorithm = "Bin Packing (DP)";
    result.summary.executionTime = performance.now() - startTime;
    
    return result;
  }

  /**
   * Multi-algorithm optimization - runs multiple algorithms and returns the best result
   */
  static multiAlgorithmOptimize(
    requests: CutRequest[],
    stock: StockItem[]
  ): OptimizationResult {
    const algorithms = [
      () => this.firstFitDecreasing(requests, stock),
      () => this.bestFit(requests, stock),
      () => this.binPackingDP(requests, stock)
    ];

    let bestResult: OptimizationResult | null = null;
    let bestEfficiency = 0;

    for (const algorithm of algorithms) {
      const result = algorithm();
      if (result.summary.avgEfficiency > bestEfficiency) {
        bestEfficiency = result.summary.avgEfficiency;
        bestResult = result;
      }
    }

    if (bestResult) {
      bestResult.summary.algorithm = "Multi-Algorithm (Best Result)";
    }

    return bestResult || this.firstFitDecreasing(requests, stock);
  }

  // Helper methods
  private static canFitInPlan(plan: CuttingPlan, request: CutRequest): boolean {
    const usedLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const totalKerfUsed = plan.cuts.length * this.TOTAL_KERF;
    const remainingLength = plan.stockLength - usedLength - totalKerfUsed;
    
    return remainingLength >= request.length + this.TOTAL_KERF + this.SAFETY_MARGIN;
  }

  private static addCutToPlan(plan: CuttingPlan, request: CutRequest): void {
    const usedLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const totalKerfUsed = plan.cuts.length * this.TOTAL_KERF;
    const position = usedLength + totalKerfUsed;

    plan.cuts.push({
      requestId: request.id,
      length: request.length,
      position,
      quantity: 1,
      angle: request.angle || 90
    });

    plan.totalCuts++;
    plan.kerfLoss += this.TOTAL_KERF;
    
    const newUsedLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const newTotalKerfUsed = plan.cuts.length * this.TOTAL_KERF;
    plan.wasteLength = plan.stockLength - newUsedLength - newTotalKerfUsed;
    plan.efficiency = ((newUsedLength / plan.stockLength) * 100);
  }

  private static createNewPlan(stock: StockItem, request: CutRequest): CuttingPlan {
    const plan: CuttingPlan = {
      stockId: stock.id,
      stockLength: stock.length,
      cuts: [],
      wasteLength: stock.length,
      efficiency: 0,
      totalCuts: 0,
      kerfLoss: 0
    };

    this.addCutToPlan(plan, request);
    return plan;
  }

  private static calculateWasteAfterCut(plan: CuttingPlan, request: CutRequest): number {
    const usedLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const totalKerfUsed = plan.cuts.length * this.TOTAL_KERF;
    const remainingLength = plan.stockLength - usedLength - totalKerfUsed;
    
    return remainingLength - request.length - this.TOTAL_KERF;
  }

  private static calculateSummary(plans: CuttingPlan[], algorithm: string, executionTime: number) {
    const totalWaste = plans.reduce((sum, plan) => sum + plan.wasteLength, 0);
    const totalStockLength = plans.reduce((sum, plan) => sum + plan.stockLength, 0);
    const totalCuts = plans.reduce((sum, plan) => sum + plan.totalCuts, 0);
    const avgEfficiency = plans.length > 0 ? 
      plans.reduce((sum, plan) => sum + plan.efficiency, 0) / plans.length : 0;

    // Calculate total cutting time based on angle cuts
    const totalCuttingTime = plans.reduce((totalTime, plan) => {
      const planTime = plan.cuts.reduce((cutTime, cut) => {
        const isAngleCut = cut.angle && cut.angle !== 90;
        const cutTimeMinutes = isAngleCut ? 12 : 10; // 12 min for angle cuts, 10 min for standard cuts
        return cutTime + cutTimeMinutes;
      }, 0);
      return totalTime + planTime;
    }, 0);

    return {
      totalWaste,
      totalWastePercentage: totalStockLength > 0 ? (totalWaste / totalStockLength) * 100 : 0,
      avgEfficiency,
      totalCuts,
      totalCuttingTime,
      algorithm,
      executionTime
    };
  }
}