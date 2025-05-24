import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InstantMaterialSearch from "@/components/materials/instant-material-search";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scissors, Plus, Trash2, Play, BarChart3, Package, Clock, Zap, Star, Download, FileText, Table, QrCode, Briefcase, ToggleLeft, ToggleRight } from "lucide-react";
import { 
  CuttingOptimizer, 
  CutRequest, 
  StockItem, 
  OptimizationResult,
  CuttingPlan 
} from "@/lib/cutting-optimization";
import { Material } from "@shared/schema";

export default function CuttingOptimizerComponent() {
  const [cutRequests, setCutRequests] = useState<CutRequest[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("multi");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isJobMode, setIsJobMode] = useState(false);
  const [groupIdenticalPlans, setGroupIdenticalPlans] = useState(true);
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false);
  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(null);

  // New cut request form
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialType: "",
    angle: "90",
    description: ""
  });

  // New stock item form
  const [newStock, setNewStock] = useState({
    length: "",
    available: "1",
    materialType: "",
    cost: ""
  });

  // Fetch materials for dropdown
  const { data: materials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const materialTypes = materials?.reduce((types, material) => {
    const category = material.category || "Other";
    if (!types.includes(category)) {
      types.push(category);
    }
    return types;
  }, [] as string[]) || [];



  const addCutRequest = () => {
    if (!newCut.length || !newCut.materialType) return;

    const request: CutRequest = {
      id: `cut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      length: parseFloat(newCut.length),
      quantity: parseInt(newCut.quantity),
      materialType: newCut.materialType,
      angle: parseFloat(newCut.angle),
      description: newCut.description || undefined
    };

    setCutRequests([...cutRequests, request]);
    setNewCut({ length: "", quantity: "1", materialType: "", angle: "90", description: "" });
  };

  const addStockItem = () => {
    if (!newStock.length || !newStock.materialType) return;

    const stock: StockItem = {
      id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      length: parseFloat(newStock.length),
      available: parseInt(newStock.available),
      materialType: newStock.materialType,
      cost: newStock.cost ? parseFloat(newStock.cost) : undefined
    };

    setStockItems([...stockItems, stock]);
    setNewStock({ length: "", available: "1", materialType: "", cost: "" });
  };

  const removeCutRequest = (id: string) => {
    setCutRequests(cutRequests.filter(req => req.id !== id));
  };

  const removeStockItem = (id: string) => {
    setStockItems(stockItems.filter(stock => stock.id !== id));
  };

  // Helper functions
  const generateJobNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LAT-${year}${month}${day}-${sequence}`;
  };

  const processPlansForDisplay = (plans: CuttingPlan[]) => {
    if (!groupIdenticalPlans) {
      return plans.map(plan => ({ plan, repeatCount: 1 }));
    }

    const grouped: { plan: CuttingPlan, repeatCount: number }[] = [];
    const processed = new Set<number>();

    plans.forEach((plan, index) => {
      if (processed.has(index)) return;

      const identical = plans.filter((otherPlan, otherIndex) => {
        if (otherIndex <= index || processed.has(otherIndex)) return false;
        return JSON.stringify(otherPlan.cuts) === JSON.stringify(plan.cuts) &&
               otherPlan.stockLength === plan.stockLength;
      });

      identical.forEach((_, idx) => {
        const actualIndex = plans.findIndex((p, i) => i > index && JSON.stringify(p.cuts) === JSON.stringify(plan.cuts));
        if (actualIndex !== -1) processed.add(actualIndex);
      });

      grouped.push({
        plan,
        repeatCount: identical.length + 1
      });
    });

    return grouped;
  };

  // Export functions
  const exportToPDF = () => {
    if (!optimizationResult) return;
    
    const identifier = isJobMode ? generateJobNumber() : `SIM-${Date.now()}`;
    const timestamp = new Date().toLocaleString('en-NZ');
    
    // Create professional workshop-friendly PDF content
    const pdfContent = `
═══════════════════════════════════════════════════════════════
                    LATERAL ENGINEERING LIMITED
                    CUTTING OPTIMIZATION REPORT
═══════════════════════════════════════════════════════════════

${isJobMode ? 'JOB' : 'SIMULATION'} ID: ${identifier}
Generated: ${timestamp}
Algorithm: ${optimizationResult.summary.algorithm}

───────────────────────────────────────────────────────────────
OPTIMIZATION SUMMARY
───────────────────────────────────────────────────────────────
✓ Total Efficiency:     ${optimizationResult.summary.avgEfficiency.toFixed(1)}%
✓ Total Waste:          ${optimizationResult.summary.totalWaste.toFixed(0)}mm (${optimizationResult.summary.totalWastePercentage.toFixed(1)}%)
✓ Total Cuts Required:  ${optimizationResult.summary.totalCuts}
✓ Estimated Cut Time:   ${Math.floor(optimizationResult.summary.totalCuttingTime / 60)}h ${optimizationResult.summary.totalCuttingTime % 60}m

───────────────────────────────────────────────────────────────
CUTTING SEQUENCE - WORKSHOP INSTRUCTIONS
───────────────────────────────────────────────────────────────

${processPlansForDisplay(optimizationResult.plans).map((planGroup, i) => {
  if (planGroup.repeatCount > 1) {
    return `
STOCK GROUP ${i + 1} - REPEAT ${planGroup.repeatCount}x
Stock Length: ${planGroup.plan.stockLength}mm
Material: ${planGroup.plan.cuts[0]?.requestId || 'Mixed'}
Efficiency: ${planGroup.plan.efficiency.toFixed(1)}%
Waste per stock: ${planGroup.plan.wasteLength.toFixed(0)}mm

Cut Sequence (repeat for each stock):
${planGroup.plan.cuts.map((cut, cutIndex) => 
  `  ${cutIndex + 1}. Cut ${cut.length}mm x${cut.quantity} @ ${cut.position.toFixed(0)}mm${cut.angle && cut.angle !== 90 ? ` (${cut.angle}° angle)` : ''}`
).join('\n')}

Total waste for group: ${(planGroup.plan.wasteLength * planGroup.repeatCount).toFixed(0)}mm
`;
  } else {
    return `
STOCK ${i + 1}
Stock Length: ${planGroup.plan.stockLength}mm
Material: ${planGroup.plan.cuts[0]?.requestId || 'Mixed'}
Efficiency: ${planGroup.plan.efficiency.toFixed(1)}%
Waste: ${planGroup.plan.wasteLength.toFixed(0)}mm

Cut Sequence:
${planGroup.plan.cuts.map((cut, cutIndex) => 
  `  ${cutIndex + 1}. Cut ${cut.length}mm x${cut.quantity} @ ${cut.position.toFixed(0)}mm${cut.angle && cut.angle !== 90 ? ` (${cut.angle}° angle)` : ''}`
).join('\n')}
`;
  }
}).join('\n')}

${optimizationResult.remnants.length > 0 ? `
───────────────────────────────────────────────────────────────
REMNANTS TO SAVE (>500mm)
───────────────────────────────────────────────────────────────
${optimizationResult.remnants.map(remnant => 
  `• ${remnant.length.toFixed(0)}mm ${remnant.materialType} - Label and store`
).join('\n')}
` : ''}

───────────────────────────────────────────────────────────────
SAFETY REMINDERS
───────────────────────────────────────────────────────────────
• Check all measurements twice before cutting
• Allow 2.4mm kerf + 0.5mm user error margin
• Verify material specifications match requirements
• Use appropriate PPE for cutting operations
• Label all remnants with mill cert/heat numbers

═══════════════════════════════════════════════════════════════
End of Cutting Report - ${identifier}
═══════════════════════════════════════════════════════════════
    `;

    // Create and download PDF-ready text file (will integrate proper PDF library later)
    const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isJobMode ? 'job' : 'simulation'}-cutting-plan-${identifier}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!optimizationResult) return;
    
    const identifier = isJobMode ? generateJobNumber() : `SIM-${Date.now()}`;
    const timestamp = new Date().toLocaleString('en-NZ');
    
    // Create professional Excel-friendly CSV content
    let csvContent = "LATERAL ENGINEERING - CUTTING OPTIMIZATION REPORT\n";
    csvContent += `${isJobMode ? 'JOB' : 'SIMULATION'} ID:,${identifier}\n`;
    csvContent += `Generated:,${timestamp}\n`;
    csvContent += `Algorithm:,${optimizationResult.summary.algorithm}\n\n`;
    
    csvContent += "OPTIMIZATION SUMMARY\n";
    csvContent += "Metric,Value,Unit\n";
    csvContent += `Total Efficiency,${optimizationResult.summary.avgEfficiency.toFixed(1)},percent\n`;
    csvContent += `Total Waste,${optimizationResult.summary.totalWaste.toFixed(0)},mm\n`;
    csvContent += `Waste Percentage,${optimizationResult.summary.totalWastePercentage.toFixed(1)},percent\n`;
    csvContent += `Total Cuts,${optimizationResult.summary.totalCuts},count\n`;
    csvContent += `Cutting Time,${Math.floor(optimizationResult.summary.totalCuttingTime / 60)},hours\n`;
    csvContent += `Cutting Time,${optimizationResult.summary.totalCuttingTime % 60},minutes\n\n`;
    
    csvContent += "DETAILED CUTTING PLANS\n";
    csvContent += "Stock #,Length (mm),Material,Efficiency (%),Waste (mm),Cut #,Cut Length (mm),Quantity,Position (mm),Angle (deg)\n";
    
    const processedPlans = processPlansForDisplay(optimizationResult.plans);
    let stockCounter = 1;
    
    processedPlans.forEach((planGroup) => {
      const plan = planGroup.plan;
      if (planGroup.repeatCount > 1) {
        csvContent += `Stock Group ${stockCounter}-${stockCounter + planGroup.repeatCount - 1} (${planGroup.repeatCount}x identical),${plan.stockLength},${plan.cuts[0]?.requestId || 'Mixed'},${plan.efficiency.toFixed(1)},${plan.wasteLength.toFixed(0)},,,,,\n`;
      }
      
      for (let repeat = 0; repeat < planGroup.repeatCount; repeat++) {
        plan.cuts.forEach((cut, cutIndex) => {
          csvContent += `${stockCounter},${plan.stockLength},${cut.requestId || 'Mixed'},${plan.efficiency.toFixed(1)},${plan.wasteLength.toFixed(0)},${cutIndex + 1},${cut.length},${cut.quantity},${cut.position.toFixed(0)},${cut.angle || 90}\n`;
        });
        stockCounter++;
      }
    });
    
    if (optimizationResult.remnants.length > 0) {
      csvContent += "\nREMNANTS TO SAVE\n";
      csvContent += "Length (mm),Material,Reusable,Notes\n";
      optimizationResult.remnants.forEach(remnant => {
        csvContent += `${remnant.length.toFixed(0)},${remnant.materialType},${remnant.isReusable ? 'Yes' : 'No'},Label with mill cert/heat number\n`;
      });
    }

    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isJobMode ? 'job' : 'simulation'}-cutting-data-${identifier}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateQRCode = () => {
    if (!optimizationResult) return;
    
    const jobId = `JOB-${Date.now()}`;
    const qrData = {
      jobId,
      timestamp: new Date().toISOString(),
      summary: {
        totalWaste: optimizationResult.summary.totalWaste,
        wastePercentage: optimizationResult.summary.totalWastePercentage,
        efficiency: optimizationResult.summary.avgEfficiency,
        totalCuts: optimizationResult.summary.totalCuts,
        cuttingTime: optimizationResult.summary.totalCuttingTime
      },
      plans: optimizationResult.plans.length
    };
    
    // For now, generate a simple QR code URL (will be integrated with JMS later)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    
    // Open QR code in new window
    window.open(qrCodeUrl, '_blank');
  };

  const runOptimization = async () => {
    if (cutRequests.length === 0 || stockItems.length === 0) return;

    setIsOptimizing(true);
    
    // Add small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    let result: OptimizationResult;

    switch (selectedAlgorithm) {
      case "firstFit":
        result = CuttingOptimizer.firstFitDecreasing(cutRequests, stockItems);
        break;
      case "bestFit":
        result = CuttingOptimizer.bestFit(cutRequests, stockItems);
        break;
      case "binPacking":
        result = CuttingOptimizer.binPackingDP(cutRequests, stockItems);
        break;
      case "multi":
      default:
        result = CuttingOptimizer.multiAlgorithmOptimize(cutRequests, stockItems);
        break;
    }

    setOptimizationResult(result);
    setIsOptimizing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cutting Optimization</h1>
          <p className="text-muted-foreground">
            Minimize waste and maximize efficiency with advanced algorithms
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Target: &lt;5% Waste
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="space-y-6">
          {/* Cut Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Cut Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new cut request */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="cut-length">Length (mm)</Label>
                  <Input
                    id="cut-length"
                    type="number"
                    value={newCut.length}
                    onChange={(e) => setNewCut({ ...newCut, length: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cut-quantity">Qty</Label>
                  <Input
                    id="cut-quantity"
                    type="number"
                    value={newCut.quantity}
                    onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cut-angle">Angle (°)</Label>
                  <Input
                    id="cut-angle"
                    type="number"
                    value={newCut.angle}
                    onChange={(e) => setNewCut({ ...newCut, angle: e.target.value })}
                    placeholder="90"
                    min="1"
                    max="180"
                  />
                </div>
                <div className="col-span-4">
                  <Label htmlFor="cut-material">Material</Label>
                  <InstantMaterialSearch
                    value={newCut.materialType}
                    onSelect={(materialCode) => setNewCut({ ...newCut, materialType: materialCode })}
                    placeholder="Type to search materials..."
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <Button onClick={addCutRequest} size="sm" className="px-3 py-2 h-10 w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="cut-description">Description (optional)</Label>
                <Input
                  id="cut-description"
                  value={newCut.description}
                  onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                  placeholder="Job reference or notes"
                />
              </div>

              {/* Cut requests list */}
              {cutRequests.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Separator />
                  <h4 className="font-medium">Requested Cuts ({cutRequests.length})</h4>
                  {cutRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <span className="font-medium">{request.length}mm</span>
                        <span className="text-muted-foreground"> × {request.quantity}</span>
                        {request.angle && request.angle !== 90 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {request.angle}° angle
                          </Badge>
                        )}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {request.materialType}
                        </Badge>
                        {request.description && (
                          <p className="text-xs text-muted-foreground">{request.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Est. time: {request.angle && request.angle !== 90 ? '12' : '10'} min per cut
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCutRequest(request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new stock item */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="stock-length">Length (mm)</Label>
                  <Input
                    id="stock-length"
                    type="number"
                    value={newStock.length}
                    onChange={(e) => setNewStock({ ...newStock, length: e.target.value })}
                    placeholder="6000"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="stock-available">Qty</Label>
                  <Input
                    id="stock-available"
                    type="number"
                    value={newStock.available}
                    onChange={(e) => setNewStock({ ...newStock, available: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="stock-cost">Cost ($/m)</Label>
                  <Input
                    id="stock-cost"
                    type="number"
                    step="0.01"
                    value={newStock.cost}
                    onChange={(e) => setNewStock({ ...newStock, cost: e.target.value })}
                    placeholder="25.50"
                  />
                </div>
                <div className="col-span-4">
                  <Label htmlFor="stock-material">Material</Label>
                  <InstantMaterialSearch
                    value={newStock.materialType}
                    onSelect={(materialCode) => setNewStock({ ...newStock, materialType: materialCode })}
                    placeholder="Type to search materials..."
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <Button onClick={addStockItem} size="sm" className="px-3 py-2 h-10 w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>



              {/* Stock items list */}
              {stockItems.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Separator />
                  <h4 className="font-medium">Stock Items ({stockItems.length})</h4>
                  {stockItems.map((stock) => (
                    <div key={stock.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <span className="font-medium">{stock.length}mm</span>
                        <span className="text-muted-foreground"> × {stock.available}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {stock.materialType}
                        </Badge>
                        {stock.cost && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ${stock.cost}/m
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStockItem(stock.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimization Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Optimization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="algorithm">Algorithm</Label>
                <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multi">Multi-Algorithm (Best Result)</SelectItem>
                    <SelectItem value="firstFit">First Fit Decreasing</SelectItem>
                    <SelectItem value="bestFit">Best Fit</SelectItem>
                    <SelectItem value="binPacking">Bin Packing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={runOptimization}
                disabled={cutRequests.length === 0 || stockItems.length === 0 || isOptimizing}
                className="w-full"
                size="lg"
              >
                {isOptimizing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Optimization
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {optimizationResult ? (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Optimization Results
                    </CardTitle>
                    <div className="flex gap-2">
                      {!isJobMode && (
                        <Button variant="default" size="sm" onClick={() => setShowCreateJobDialog(true)}>
                          <Briefcase className="h-4 w-4 mr-1" />
                          Create Job
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={exportToPDF}>
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportToExcel}>
                        <Table className="h-4 w-4 mr-1" />
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={generateQRCode}>
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Code
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {optimizationResult.summary.avgEfficiency.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Efficiency</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold text-orange-600">
                        {optimizationResult.summary.totalWastePercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Waste</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Cuts:</span>
                      <span className="font-medium">{optimizationResult.summary.totalCuts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Cutting Time:</span>
                      <span className="font-medium">
                        {Math.floor(optimizationResult.summary.totalCuttingTime / 60)}h {optimizationResult.summary.totalCuttingTime % 60}m
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Waste:</span>
                      <span className="font-medium">{optimizationResult.summary.totalWaste.toFixed(0)}mm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Algorithm:</span>
                      <span className="font-medium">{optimizationResult.summary.algorithm}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Execution Time:</span>
                      <span className="font-medium">{optimizationResult.summary.executionTime.toFixed(1)}ms</span>
                    </div>
                  </div>

                  <Progress 
                    value={optimizationResult.summary.avgEfficiency} 
                    className="h-2"
                  />
                </CardContent>
              </Card>

              {/* Cutting Plans */}
              <Card>
                <CardHeader>
                  <CardTitle>Cutting Plans ({optimizationResult.plans.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {optimizationResult.plans.map((plan, index) => (
                    <div key={plan.stockId} className="border rounded p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Stock #{index + 1}</span>
                        <Badge variant={plan.efficiency > 90 ? "default" : plan.efficiency > 75 ? "secondary" : "destructive"}>
                          {plan.efficiency.toFixed(1)}% efficiency
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Length: {plan.stockLength}mm | Cuts: {plan.cuts.length} | Waste: {plan.wasteLength.toFixed(0)}mm
                      </div>

                      <div className="space-y-1">
                        {plan.cuts.map((cut, cutIndex) => (
                          <div key={cutIndex} className="flex justify-between text-xs p-1 bg-muted rounded">
                            <div>
                              <span>Cut {cutIndex + 1}: {cut.length}mm</span>
                              {cut.angle && cut.angle !== 90 && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {cut.angle}°
                                </Badge>
                              )}
                            </div>
                            <span>@ {cut.position.toFixed(0)}mm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Remnants */}
              {optimizationResult.remnants.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reusable Remnants ({optimizationResult.remnants.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {optimizationResult.remnants.map((remnant) => (
                      <div key={remnant.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-medium">{remnant.length.toFixed(0)}mm</span>
                        <Badge variant="outline">{remnant.materialType}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Unallocated Cuts */}
              {optimizationResult.unallocated.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      Unallocated Cuts ({optimizationResult.unallocated.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {optimizationResult.unallocated.map((cut) => (
                      <div key={cut.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm">{cut.length}mm × {cut.quantity}</span>
                        <Badge variant="destructive">{cut.materialType}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Optimize</h3>
                <p className="text-muted-foreground">
                  Add your cut requirements and available stock, then run the optimization to get the best cutting plan.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}