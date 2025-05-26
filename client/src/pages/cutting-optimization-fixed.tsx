import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Scissors, 
  Package, 
  Play, 
  Plus, 
  Trash2, 
  Zap,
  Clock,
  History,
  Info
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StandardCuttingPlan from "@/components/optimization/standard-cutting-plan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Material } from "@shared/schema";

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

export default function CuttingOptimizationFixed() {
  // Core state
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch materials
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Form state
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialCode: "",
    firstCutAngle: 90,
    secondCutAngle: 90,
    kerfWidth: 2.4,
    description: ""
  });

  const [newStock, setNewStock] = useState({
    length: "",
    quantity: "1",
    materialCode: ""
  });

  // Load simulation history
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('cutting_simulations');
        if (stored) {
          const simulations = JSON.parse(stored);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const validSimulations = simulations.filter((sim: any) => {
            const simDate = new Date(sim.timestamp);
            return simDate > sevenDaysAgo;
          });
          
          setSimulationHistory(validSimulations);
        }
      } catch (error) {
        console.error('Error loading history:', error);
        localStorage.removeItem('cutting_simulations');
      }
    };
    loadHistory();
  }, []);

  // Update time for relative formatting
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Simple cutting optimization function
  const runCuttingOptimization = (cuts: CutRequirement[], stock: StockItem[]) => {
    const plans: any[] = [];
    
    // Group by material
    const materialGroups = cuts.reduce((groups, cut) => {
      if (!groups[cut.materialCode]) {
        groups[cut.materialCode] = [];
      }
      groups[cut.materialCode].push(cut);
      return groups;
    }, {} as Record<string, CutRequirement[]>);

    // Process each material
    Object.entries(materialGroups).forEach(([materialCode, requirements]) => {
      const availableStock = stock.filter(s => s.materialCode === materialCode);
      if (availableStock.length === 0) return;

      // Expand requirements by quantity
      const allCuts: any[] = [];
      requirements.forEach(req => {
        for (let i = 0; i < req.quantity; i++) {
          allCuts.push({
            id: `${req.id}-${i + 1}`,
            length: req.length,
            firstCutAngle: req.firstCutAngle,
            secondCutAngle: req.secondCutAngle,
            description: req.description || `${req.length}mm piece`,
            kerfWidth: req.kerfWidth || 2.4
          });
        }
      });

      // Sort cuts by length (longest first for better optimization)
      allCuts.sort((a, b) => b.length - a.length);

      // Distribute cuts across stock bars
      availableStock.forEach((stockBar, stockIndex) => {
        if (allCuts.length === 0) return;

        let currentPosition = 0;
        const barCuts: any[] = [];
        let cutSequence = 1;

        // Fit cuts on this bar
        let i = 0;
        while (i < allCuts.length && currentPosition < stockBar.length) {
          const cut = allCuts[i];
          const kerfWidth = cut.kerfWidth || 2.4;
          
          if (currentPosition + cut.length + kerfWidth <= stockBar.length) {
            // Cut fits on this bar
            barCuts.push({
              id: cut.id,
              length: cut.length,
              quantity: 1,
              startPosition: currentPosition,
              endPosition: currentPosition + cut.length,
              firstCutAngle: cut.firstCutAngle,
              secondCutAngle: cut.secondCutAngle,
              description: cut.description,
              materialCode: materialCode,
              cuttingTime: (cut.firstCutAngle === 90 && cut.secondCutAngle === 90) ? 10 : 12,
              kerfWidth: kerfWidth
            });
            
            currentPosition += cut.length + kerfWidth;
            cutSequence++;
            
            // Remove this cut from the list
            allCuts.splice(i, 1);
          } else {
            // Cut doesn't fit, try next cut
            i++;
          }
        }

        // Create cutting plan for this bar if it has cuts
        if (barCuts.length > 0) {
          const totalCutLength = barCuts.reduce((sum, cut) => sum + cut.length, 0);
          const wasteLength = stockBar.length - currentPosition;
          const efficiency = ((totalCutLength / stockBar.length) * 100);

          plans.push({
            id: `${materialCode}-bar-${stockIndex + 1}`,
            stockLength: stockBar.length,
            cuts: barCuts,
            wasteLength: wasteLength,
            efficiency: Math.round(efficiency * 10) / 10,
            totalCuts: barCuts.length,
            materialCode: materialCode,
            totalCuttingTime: barCuts.reduce((sum, cut) => sum + (cut.cuttingTime || 10), 0),
            instructions: {
              general: 'Deburr all edges after cutting',
              cuttingMethod: 'Bandsaw - standard setup',
              heatNumber: 'H12345-2024',
              millCertNumber: 'MC-789456'
            }
          });
        }
      });
    });

    return plans;
  };

  // Handlers
  const handleAddCut = () => {
    if (newCut.length && newCut.materialCode) {
      const cutRequirement: CutRequirement = {
        id: `cut-${Date.now()}`,
        length: parseFloat(newCut.length),
        quantity: parseInt(newCut.quantity),
        materialCode: newCut.materialCode,
        firstCutAngle: newCut.firstCutAngle,
        secondCutAngle: newCut.secondCutAngle,
        kerfWidth: newCut.kerfWidth,
        description: newCut.description
      };
      setCutRequirements([...cutRequirements, cutRequirement]);
      setNewCut({ 
        length: "", 
        quantity: "1", 
        materialCode: "", 
        firstCutAngle: 90,
        secondCutAngle: 90,
        kerfWidth: 2.4,
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
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const results = runCuttingOptimization(cutRequirements, stockItems);
      setOptimizationResult(results);
      
      // Save to history
      const simulation = {
        id: `SIM-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        results: results,
        efficiency: results.length > 0 ? results.reduce((acc, plan) => acc + plan.efficiency, 0) / results.length : 0,
        totalWaste: results.reduce((acc, plan) => acc + plan.wasteLength, 0)
      };
      
      setSimulationHistory(prev => [simulation, ...prev.slice(0, 19)]);
      
      try {
        const existing = localStorage.getItem('cutting_simulations') || '[]';
        const simulations = JSON.parse(existing);
        const updated = [simulation, ...simulations].slice(0, 20);
        localStorage.setItem('cutting_simulations', JSON.stringify(updated));
      } catch (storageError) {
        console.warn('Could not save to localStorage:', storageError);
      }
      
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = currentTime;
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return "Yesterday";
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  };

  const loadSimulation = (sim: any) => {
    setOptimizationResult(sim.results);
    setShowHistory(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cutting Optimization</h1>
          <p className="text-muted-foreground">Generate professional workshop cutting plans</p>
        </div>
        <Button
          variant={showHistory ? "default" : "outline"}
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="h-4 w-4 mr-2" />
          {showHistory ? "Hide History" : "Show History"}
        </Button>
      </div>

      {/* History Card */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
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
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(sim.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{sim.efficiency?.toFixed(1) || '0.0'}% efficient</div>
                      <div className="text-sm text-muted-foreground">{sim.totalWaste?.toFixed(0) || '0'}mm waste</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cut Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Cut Requirements
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
                    placeholder="1000"
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
                  <Select onValueChange={(materialCode: string) => setNewCut({ ...newCut, materialCode })} value={newCut.materialCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materialsData.map((material) => (
                        <SelectItem key={material.id} value={material.code}>
                          {material.code} - {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <TooltipProvider>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="first-cut-angle" className="text-xs">First Angle</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-64">
                          <div className="text-center">
                            <p className="font-semibold text-blue-600">First Cut Angle (Right End)</p>
                            <p className="text-sm mt-1">This is the first cut made on the bandsaw.</p>
                            <p className="text-xs text-muted-foreground mt-1">90° = square cut, other angles = mitre cuts</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="first-cut-angle"
                      type="number"
                      value={newCut.firstCutAngle}
                      onChange={(e) => setNewCut({ ...newCut, firstCutAngle: parseFloat(e.target.value) || 90 })}
                      min="15"
                      max="135"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="second-cut-angle" className="text-xs">Second Angle</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-64">
                          <div className="text-center">
                            <p className="font-semibold text-blue-600">Second Cut Angle (Left End)</p>
                            <p className="text-sm mt-1">This is the second cut made on the bandsaw.</p>
                            <p className="text-xs text-muted-foreground mt-1">90° = square cut, other angles = mitre cuts</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="second-cut-angle"
                      type="number"
                      value={newCut.secondCutAngle}
                      onChange={(e) => setNewCut({ ...newCut, secondCutAngle: parseFloat(e.target.value) || 90 })}
                      min="15"
                      max="135"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kerf-width" className="text-xs">Kerf (mm)</Label>
                    <Input
                      id="kerf-width"
                      type="number"
                      step="0.1"
                      value={newCut.kerfWidth}
                      onChange={(e) => setNewCut({ ...newCut, kerfWidth: parseFloat(e.target.value) || 2.4 })}
                      className="h-8"
                    />
                  </div>
                </div>
              </TooltipProvider>
              
              <div>
                <Label htmlFor="cut-description">Description (Optional)</Label>
                <Input
                  id="cut-description"
                  value={newCut.description}
                  onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                  placeholder="Purpose or notes..."
                  className="h-8"
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
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="outline">{cut.materialCode}</Badge>
                    <span className="font-medium">{cut.length}mm</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">×</span>
                      <Input
                        type="number"
                        value={cut.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          const updatedRequirements = [...cutRequirements];
                          updatedRequirements[index] = { ...cut, quantity: newQuantity };
                          setCutRequirements(updatedRequirements);
                        }}
                        className="w-16 h-7 text-sm"
                        min="1"
                      />
                    </div>
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
              <Package className="h-5 w-5" />
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
                  <Select onValueChange={(materialCode: string) => setNewStock({ ...newStock, materialCode })} value={newStock.materialCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materialsData.map((material) => (
                        <SelectItem key={material.id} value={material.code}>
                          {material.code} - {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      {/* Results Section */}
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
  );
}