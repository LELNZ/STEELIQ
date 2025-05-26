// Simple, clean cutting optimization that properly handles overflow cuts

interface CutRequirement {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  firstCutAngle: number;
  secondCutAngle: number;
  kerfWidth?: number;
  description?: string;
}

interface StockItem {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
}

interface Cut {
  id: string;
  length: number;
  startPosition: number;
  endPosition: number;
  firstCutAngle: number;
  secondCutAngle: number;
  description: string;
  materialCode: string;
  cuttingTime: number;
  handlingTime: number;
  kerfWidth: number;
}

interface CuttingPlan {
  id: string;
  stockLength: number;
  cuts: Cut[];
  wasteLength: number;
  efficiency: number;
  totalCuts: number;
  materialCode: string;
  totalCuttingTime: number;
  totalHandlingTime: number;
}

export function optimizeCutting(
  cutRequirements: CutRequirement[], 
  stockItems: StockItem[],
  handlingTimes: any
): CuttingPlan[] {
  const plans: CuttingPlan[] = [];
  
  // Group by material
  const materialGroups = cutRequirements.reduce((groups: Record<string, CutRequirement[]>, req) => {
    if (!groups[req.materialCode]) groups[req.materialCode] = [];
    groups[req.materialCode].push(req);
    return groups;
  }, {});

  Object.entries(materialGroups).forEach(([materialCode, requirements]) => {
    const availableStock = stockItems.filter(s => s.materialCode === materialCode);
    if (availableStock.length === 0) return;

    // Create individual cuts from requirements
    const allCuts: any[] = [];
    requirements.forEach(req => {
      for (let i = 0; i < req.quantity; i++) {
        allCuts.push({
          originalId: req.id,
          id: `${req.id}-${i + 1}`,
          length: req.length,
          firstCutAngle: req.firstCutAngle,
          secondCutAngle: req.secondCutAngle,
          description: req.description || `${req.length}mm piece`,
          kerfWidth: req.kerfWidth || 2.4,
          materialCode: materialCode
        });
      }
    });

    // Sort cuts by length (longest first)
    allCuts.sort((a, b) => b.length - a.length);

    // Create stock bars array
    const stockBars: any[] = [];
    availableStock.forEach(stock => {
      for (let i = 0; i < stock.quantity; i++) {
        stockBars.push({
          length: stock.length,
          materialCode: stock.materialCode,
          barNumber: stockBars.length + 1
        });
      }
    });

    // Sort stock by length (shortest first)
    stockBars.sort((a, b) => a.length - b.length);

    let cutIndex = 0;
    let barIndex = 0;

    // Process all cuts across all bars
    while (cutIndex < allCuts.length && barIndex < stockBars.length) {
      const currentBar = stockBars[barIndex];
      const barCuts: Cut[] = [];
      let position = 0;

      // Fill current bar
      while (cutIndex < allCuts.length) {
        const cut = allCuts[cutIndex];
        const requiredLength = cut.length + cut.kerfWidth;

        if (position + requiredLength <= currentBar.length) {
          // Calculate handling time
          const category = getCutWeightCategory(cut.length);
          const handlingTime = handlingTimes[category]?.total || 3;

          barCuts.push({
            id: cut.id,
            length: cut.length,
            startPosition: position,
            endPosition: position + cut.length,
            firstCutAngle: cut.firstCutAngle,
            secondCutAngle: cut.secondCutAngle,
            description: cut.description,
            materialCode: cut.materialCode,
            cuttingTime: (cut.firstCutAngle === 90 && cut.secondCutAngle === 90) ? 10 : 12,
            handlingTime: handlingTime,
            kerfWidth: cut.kerfWidth
          });

          position += requiredLength;
          cutIndex++; // Move to next cut
        } else {
          break; // Cut doesn't fit, move to next bar
        }
      }

      // Create plan for this bar if it has cuts
      if (barCuts.length > 0) {
        const totalCutLength = barCuts.reduce((sum, cut) => sum + cut.length, 0);
        const wasteLength = currentBar.length - position;
        const efficiency = (totalCutLength / currentBar.length) * 100;

        plans.push({
          id: `${materialCode}-bar-${currentBar.barNumber}`,
          stockLength: currentBar.length,
          cuts: barCuts,
          wasteLength: Math.max(0, wasteLength),
          efficiency: Math.round(efficiency * 10) / 10,
          totalCuts: barCuts.length,
          materialCode: materialCode,
          totalCuttingTime: barCuts.reduce((sum, cut) => sum + cut.cuttingTime, 0),
          totalHandlingTime: barCuts.reduce((sum, cut) => sum + cut.handlingTime, 0)
        });
      }

      barIndex++; // Move to next bar
    }
  });

  return plans;
}

function getCutWeightCategory(length: number): 'light' | 'medium' | 'heavy' | 'crane' {
  // Simple weight estimation based on length
  if (length <= 1000) return 'light';
  if (length <= 3000) return 'medium';
  if (length <= 6000) return 'heavy';
  return 'crane';
}