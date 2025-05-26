import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Scissors, Plus, Trash2, Play, Zap, History, Briefcase, Settings } from "lucide-react";
import StandardCuttingPlan from "@/components/optimization/standard-cutting-plan";
import InstantMaterialSearch from "@/components/materials/instant-material-search";
import { Material } from "@shared/schema";

interface CutRequirement {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  firstCutAngle: number;  // Right end cut (first cut in bandsaw operation)
  secondCutAngle: number; // Left end cut (second cut in bandsaw operation)
  description?: string;
}

interface StockItem {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
}

// Mock optimization function for demonstration
const runOptimization = (cutRequirements: CutRequirement[], stockItems: StockItem[]) => {
  return [
    {
      id: "plan-1",
      stockLength: stockItems[0]?.length || 6000,
      materialCode: cutRequirements[0]?.materialCode || "UB200x100",
      cuts: cutRequirements.map((req, index) => ({
        id: `cut-${index + 1}`,
        length: req.length,
        quantity: req.quantity,
        startPosition: index * (req.length + 5),
        endPosition: (index * (req.length + 5)) + req.length,
        firstCutAngle: req.firstCutAngle,
        secondCutAngle: req.secondCutAngle,
        description: req.description || `Cut ${index + 1}`,
        materialCode: req.materialCode,
        cuttingTime: req.firstCutAngle === 90 && req.secondCutAngle === 90 ? 10 : 12
      })),
      wasteLength: Math.max(0, (stockItems[0]?.length || 6000) - cutRequirements.reduce((sum, req) => sum + req.length, 0) - (cutRequirements.length * 5)),
      efficiency: Math.min(95, ((cutRequirements.reduce((sum, req) => sum + (req.length * req.quantity), 0) / (stockItems[0]?.length || 6000)) * 100)),
      totalCuttingTime: cutRequirements.reduce((sum, req) => sum + (req.firstCutAngle === 90 && req.secondCutAngle === 90 ? 10 : 12), 0),
      instructions: {
        general: "Load material from left side of bandsaw. First cut is from right end.",
        safety: "Ensure proper clamping before each cut. Check blade condition.",
        sequence: "Follow cut sequence as shown. Mark completed cuts.",
        quality: "Verify angles with protractor. Deburr all cut edges."
      },
      heatNumber: "H2024-001-A",
      millCert: "MC-2024-001"
    }
  ];
};

export default function CuttingOptimizationNew() {
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Advanced settings
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("multi");
  const [isJobMode, setIsJobMode] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch materials for search integration
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // New cut requirement form with proper angles
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialCode: "",
    firstCutAngle: 90,  // Right end (first cut)
    secondCutAngle: 90, // Left end (second cut)
    description: ""
  });

  // New stock item form
  const [newStock, setNewStock] = useState({
    length: "",
    quantity: "1",
    materialCode: ""
  });

  const handleAddCut = () => {
    if (newCut.length && newCut.materialCode) {
      const cutRequirement: CutRequirement = {
        id: `cut-${Date.now()}`,
        length: parseFloat(newCut.length),
        quantity: parseInt(newCut.quantity),
        materialCode: newCut.materialCode,
        firstCutAngle: newCut.firstCutAngle,
        secondCutAngle: newCut.secondCutAngle,
        description: newCut.description
      };
      setCutRequirements([...cutRequirements, cutRequirement]);
      setNewCut({ 
        length: "", 
        quantity: "1", 
        materialCode: "", 
        firstCutAngle: 90,
        secondCutAngle: 90,
        description: "" 
      });
    }
  };

  const handleAddStock = () => {
    if (newStock.length && newStock.materialCode) {
      const stockItem: StockItem = {
        id: `stock-${Date.now()}`,
        length: parseFloat(newStock.length),
        quantity: parseInt(newStock.quantity),
        materialCode: newStock.materialCode
      };
      setStockItems([...stockItems, stockItem]);
      setNewStock({ length: "", quantity: "1", materialCode: "" });
    }
  };

  const handleOptimize = async () => {
    if (cutRequirements.length === 0 || stockItems.length === 0) return;

    setIsOptimizing(true);
    
    // Simulate optimization processing based on selected algorithm
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results = runOptimization(cutRequirements, stockItems);
    setOptimizationResult(results);
    
    // Save to simulation history
    const simulation = {
      id: `SIM-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithm: selectedAlgorithm,
      cutRequirements: [...cutRequirements],
      stockItems: [...stockItems],
      results: results,
      efficiency: results.reduce((acc: number, plan: any) => acc + plan.efficiency, 0) / results.length,
      totalWaste: results.reduce((acc: number, plan: any) => acc + plan.wasteLength, 0)
    };
    
    setSimulationHistory(prev => [simulation, ...prev.slice(0, 19)]); // Keep last 20
    setIsOptimizing(false);
  };

  const loadSimulation = (simulation: any) => {
    setCutRequirements(simulation.cutRequirements);
    setStockItems(simulation.stockItems);
    setOptimizationResult(simulation.results);
    setSelectedAlgorithm(simulation.algorithm);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cutting Optimization</h1>
            <p className="text-muted-foreground mt-1">
              Professional workshop-ready cutting plans with minimal waste
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              History ({simulationHistory.length})
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                checked={isJobMode}
                onCheckedChange={setIsJobMode}
                id="job-mode"
              />
              <Label htmlFor="job-mode" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Job Mode
              </Label>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Zap className="w-4 h-4 mr-2" />
              Enhanced
            </Badge>
          </div>
        </div>

        {/* Algorithm Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Optimization Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="algorithm">Cutting Algorithm</Label>
                <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multi">Multi-Algorithm (Recommended)</SelectItem>
                    <SelectItem value="firstfit">First Fit Decreasing</SelectItem>
                    <SelectItem value="bestfit">Best Fit Decreasing</SelectItem>
                    <SelectItem value="genetic">Genetic Algorithm</SelectItem>
                    <SelectItem value="binpacking">Advanced Bin Packing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedAlgorithm === "multi" && "Uses multiple algorithms and selects the best result"}
                {selectedAlgorithm === "firstfit" && "Fast algorithm, good for simple cuts"}
                {selectedAlgorithm === "bestfit" && "Optimizes for minimal waste"}
                {selectedAlgorithm === "genetic" && "Advanced optimization for complex requirements"}
                {selectedAlgorithm === "binpacking" && "Specialized for maximum material utilization"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulation History Panel */}
        {showHistory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Simulation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {simulationHistory.length === 0 ? (
                <p className="text-muted-foreground">No simulations yet. Run an optimization to see history.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {simulationHistory.map((sim) => (
                    <div
                      key={sim.id}
                      className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                      onClick={() => loadSimulation(sim)}
                    >
                      <div>
                        <div className="font-medium">{sim.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(sim.timestamp).toLocaleString()} • {sim.algorithm}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{sim.efficiency.toFixed(1)}% efficient</div>
                        <div className="text-sm text-muted-foreground">{sim.totalWaste.toFixed(0)}mm waste</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Input Section - Side by Side */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Cut Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Cut Requirements
                </div>
                {cutRequirements.length > 0 && (
                  <div className="text-sm">
                    <Badge variant="secondary">
                      {(() => {
                        const totals = cutRequirements.reduce((acc, cut) => {
                          const materialKey = cut.materialCode;
                          acc[materialKey] = (acc[materialKey] || 0) + (cut.length * cut.quantity);
                          return acc;
                        }, {} as Record<string, number>);
                        return Object.entries(totals).map(([material, total]) => 
                          `${material}: ${total.toLocaleString()}mm`
                        ).join(', ');
                      })()}
                    </Badge>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="cut-length">Length (mm)</Label>
                    <Input
                      id="cut-length"
                      type="number"
                      value={newCut.length}
                      onChange={(e) => setNewCut({ ...newCut, length: e.target.value })}
                      placeholder="1200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cut-quantity">Quantity</Label>
                    <Input
                      id="cut-quantity"
                      type="number"
                      value={newCut.quantity}
                      onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cut-material">Material Code</Label>
                    <InstantMaterialSearch
                      onSelect={(materialCode) => setNewCut({ ...newCut, materialCode })}
                      placeholder="Search materials..."
                      value={newCut.materialCode}
                    />
                  </div>
                </div>
                
                {/* Cut Angles - Proper Bandsaw Orientation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="first-cut-angle">First Cut Angle (Right End)</Label>
                    <Input
                      id="first-cut-angle"
                      type="number"
                      value={newCut.firstCutAngle}
                      onChange={(e) => setNewCut({ ...newCut, firstCutAngle: parseInt(e.target.value) })}
                      min="0"
                      max="90"
                      placeholder="90"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Right end cut (first in bandsaw operation)</p>
                  </div>
                  <div>
                    <Label htmlFor="second-cut-angle">Second Cut Angle (Left End)</Label>
                    <Input
                      id="second-cut-angle"
                      type="number"
                      value={newCut.secondCutAngle}
                      onChange={(e) => setNewCut({ ...newCut, secondCutAngle: parseInt(e.target.value) })}
                      min="0"
                      max="90"
                      placeholder="90"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Left end cut (second in bandsaw operation)</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="cut-description">Description (Optional)</Label>
                  <Input
                    id="cut-description"
                    value={newCut.description}
                    onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                    placeholder="Purpose or notes..."
                  />
                </div>
                <Button onClick={handleAddCut} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cut Requirement
                </Button>
              </div>

              {/* Cut requirements list */}
              <div className="space-y-2">
                {cutRequirements.map((cut, index) => (
                  <div key={cut.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{cut.materialCode}</Badge>
                      <span className="font-medium">{cut.length}mm</span>
                      <span className="text-sm text-muted-foreground">× {cut.quantity}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Angles: {cut.firstCutAngle}°/{cut.secondCutAngle}°</span>
                      </div>
                      {cut.description && (
                        <span className="text-sm text-muted-foreground">- {cut.description}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCutRequirements(cutRequirements.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Available Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="stock-length">Length (mm)</Label>
                    <Input
                      id="stock-length"
                      type="number"
                      value={newStock.length}
                      onChange={(e) => setNewStock({ ...newStock, length: e.target.value })}
                      placeholder="6000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock-quantity">Quantity</Label>
                    <Input
                      id="stock-quantity"
                      type="number"
                      value={newStock.quantity}
                      onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock-material">Material Code</Label>
                    <InstantMaterialSearch
                      onSelect={(materialCode) => setNewStock({ ...newStock, materialCode })}
                      placeholder="Search materials..."
                      value={newStock.materialCode}
                    />
                  </div>
                </div>
                <Button onClick={handleAddStock} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock Item
                </Button>
              </div>

              {/* Stock items list */}
              <div className="space-y-2">
                {stockItems.map((stock, index) => (
                  <div key={stock.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{stock.materialCode}</Badge>
                      <span className="font-medium">{stock.length}mm</span>
                      <span className="text-sm text-muted-foreground">× {stock.quantity}</span>
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

              {/* Optimization Button */}
              <Button
                onClick={handleOptimize}
                disabled={cutRequirements.length === 0 || stockItems.length === 0 || isOptimizing}
                className="w-full"
                size="lg"
              >
                {isOptimizing ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Cutting Plan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Full Width Results Section */}
        {optimizationResult ? (
          <StandardCuttingPlan 
            plans={optimizationResult}
            materialCode={cutRequirements[0]?.materialCode || 'MIXED'}
            jobNumber={`JOB-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
          />
        ) : cutRequirements.length > 0 && stockItems.length > 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Optimize</h3>
              <p className="text-muted-foreground">
                Click "Generate Cutting Plan" to create your professional workshop cutting plan.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}