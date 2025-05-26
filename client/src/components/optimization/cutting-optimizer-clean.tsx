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
import { Scissors, Plus, Trash2, Play, BarChart3, Package, Clock, Zap, Star, Download, FileText, Table, QrCode, Briefcase, ToggleLeft, ToggleRight, History, Settings } from "lucide-react";
import jsPDF from "jspdf";
import { SimulationHistoryWorking } from "./simulation-history-working";
import { ComplexCutsConfigurator } from "./complex-cuts-configurator";
import StandardCuttingPlan from "./standard-cutting-plan";
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

  // Fetch materials
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // New cut request form
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialType: "",
    startAngle: 90,
    endAngle: 90,
    description: "",
    complexCuts: [] as any[]
  });

  // New stock item form
  const [newStock, setNewStock] = useState({
    length: "",
    available: "1",
    materialType: "",
    cost: ""
  });

  const runOptimization = async () => {
    if (cutRequests.length === 0 || stockItems.length === 0) return;

    setIsOptimizing(true);
    
    // Add small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    let result: OptimizationResult;

    switch (selectedAlgorithm) {
      case "angleAware":
        result = CuttingOptimizer.progressiveAngleOptimization(cutRequests, stockItems);
        break;
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

    // Save simulation to localStorage for history
    if (!isJobMode) {
      const simulationId = `SIM-${Date.now()}`;
      setCurrentSimulationId(simulationId);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Cutting Optimization</h1>
            <p className="text-muted-foreground">
              Minimize waste and maximize efficiency with advanced cutting algorithms
            </p>
          </div>
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
                {/* Add cut form */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Material Specification</h4>
                  
                  <div>
                    <Label htmlFor="cut-material" className="text-xs font-medium text-slate-600">Material</Label>
                    <InstantMaterialSearch
                      value={newCut.materialType}
                      onSelect={(materialCode) => setNewCut({ ...newCut, materialType: materialCode })}
                      placeholder="Type to search materials..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="cut-length" className="text-xs font-medium text-slate-600">Length (mm)</Label>
                      <Input
                        id="cut-length"
                        type="number"
                        value={newCut.length}
                        onChange={(e) => setNewCut({ ...newCut, length: e.target.value })}
                        placeholder="1000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cut-quantity" className="text-xs font-medium text-slate-600">Qty</Label>
                      <Input
                        id="cut-quantity"
                        type="number"
                        value={newCut.quantity}
                        onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                        min="1"
                        className="mt-1 w-20"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      if (newCut.length && newCut.materialType) {
                        const cutRequest: CutRequest = {
                          id: `cut_${Date.now()}`,
                          length: parseFloat(newCut.length),
                          quantity: parseInt(newCut.quantity),
                          materialType: newCut.materialType,
                          startAngle: newCut.startAngle,
                          endAngle: newCut.endAngle,
                          description: newCut.description,
                          priority: 1
                        };
                        setCutRequests([...cutRequests, cutRequest]);
                        setNewCut({
                          length: "",
                          quantity: "1",
                          materialType: "",
                          startAngle: 90,
                          endAngle: 90,
                          description: "",
                          complexCuts: []
                        });
                      }
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cut Requirement
                  </Button>
                </div>

                {/* Cut requests list */}
                <div className="space-y-2">
                  {cutRequests.map((cut, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{cut.materialType}</Badge>
                        <span className="font-medium">{cut.length}mm</span>
                        <span className="text-sm text-muted-foreground">× {cut.quantity}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCutRequests(cutRequests.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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
                  <div className="col-span-4">
                    <Label htmlFor="stock-material">Material</Label>
                    <InstantMaterialSearch
                      value={newStock.materialType}
                      onSelect={(materialCode) => setNewStock({ ...newStock, materialType: materialCode })}
                      placeholder="Search materials..."
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>&nbsp;</Label>
                    <Button 
                      onClick={() => {
                        if (newStock.length && newStock.materialType) {
                          const stockItem: StockItem = {
                            id: `stock_${Date.now()}`,
                            length: parseFloat(newStock.length),
                            available: parseInt(newStock.available),
                            materialType: newStock.materialType,
                            cost: parseFloat(newStock.cost) || 0
                          };
                          setStockItems([...stockItems, stockItem]);
                          setNewStock({
                            length: "",
                            available: "1",
                            materialType: "",
                            cost: ""
                          });
                        }
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stock
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {stockItems.map((stock, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{stock.materialType}</Badge>
                        <span className="font-medium">{stock.length}mm</span>
                        <span className="text-sm text-muted-foreground">× {stock.available}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStockItems(stockItems.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Optimization Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="algorithm">Algorithm</Label>
                  <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select algorithm" />
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
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Optimization Results
                    </CardTitle>
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

                    <Progress 
                      value={optimizationResult.summary.avgEfficiency} 
                      className="h-2"
                    />
                  </CardContent>
                </Card>

                {/* Professional Workshop Cutting Plans */}
                <StandardCuttingPlan 
                  plans={optimizationResult.plans.map(plan => ({
                    stockLength: plan.stockLength,
                    cuts: plan.cuts.map(cut => ({
                      id: cut.requestId || `cut-${Date.now()}`,
                      length: cut.length,
                      position: cut.position,
                      startAngle: cut.startAngle,
                      endAngle: cut.endAngle,
                      description: cut.requestId || '',
                      quantity: cut.quantity || 1,
                      cuttingInstructions: cut.usesExistingAngle ? 'Use existing angle cut' : undefined
                    })),
                    wasteLength: plan.wasteLength,
                    efficiency: plan.efficiency,
                    totalCuts: plan.cuts.length,
                    materialType: plan.cuts[0]?.requestId?.split('_')[0] || 'Mixed Materials',
                    materialGrade: 'AS/NZS 3678-350',
                    instructions: {
                      general: 'Deburr all edges after cutting',
                      cuttingMethod: 'Bandsaw - standard setup',
                      heatNumber: 'H12345-2024',
                      millCertNumber: 'MC-789456'
                    }
                  }))}
                  materialCode={optimizationResult.plans[0]?.cuts[0]?.requestId?.split('_')[0] || 'MIXED'}
                  jobNumber={currentSimulationId || `SIM-${Date.now()}`}
                />

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
    </div>
  );
}