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
  Info,
  Settings
} from "lucide-react";
import InstantMaterialSearch from "@/components/materials/instant-material-search";
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

export default function CuttingOptimizationWorking() {
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [useAngleGrouping, setUseAngleGrouping] = useState(false);
  const [loadingSimulation, setLoadingSimulation] = useState(false);

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

  const [handlingTimes, setHandlingTimes] = useState({
    crane: { loading: 5, unloading: 5, total: 10 },
    heavy: { loading: 3, unloading: 2, total: 5 },
    medium: { loading: 2, unloading: 1, total: 3 },
    light: { loading: 0.5, unloading: 0.5, total: 1 }
  });

  // Materials query
  const { data: materialsData } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
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
        console.error('Error loading simulation history:', error);
      }
    };

    loadHistory();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      loadHistory();
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get material weight from database and determine category
  const getMaterialWeight = (materialCode: string, length: number): { weightPerMeter: number; totalWeight: number; category: 'crane' | 'heavy' | 'medium' | 'light' } => {
    if (!materialsData) {
      return { weightPerMeter: 10, totalWeight: 0.1, category: 'light' };
    }
    
    const material = materialsData.find(m => m.code === materialCode);
    const weightPerMeter = material?.weightPerMeter ? parseFloat(material.weightPerMeter.toString()) : 10;
    
    const totalWeight = (weightPerMeter * length) / 1000;
    
    let category: 'crane' | 'heavy' | 'medium' | 'light';
    if (totalWeight <= 5) {
      category = 'light';
    } else if (totalWeight <= 20) {
      category = 'medium';
    } else if (totalWeight <= 40) {
      category = 'heavy';
    } else {
      category = 'crane';
    }
    
    return { weightPerMeter, totalWeight, category };
  };

  // Simple cutting optimization function
  const runCuttingOptimization = (cuts: CutRequirement[], stock: StockItem[]) => {
    const plans: any[] = [];
    
    // Group cuts by material
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

      // Apply sorting strategy based on user selection
      if (useAngleGrouping) {
        allCuts.sort((a, b) => {
          if (a.firstCutAngle !== b.firstCutAngle) {
            if (a.firstCutAngle === 90) return -1;
            if (b.firstCutAngle === 90) return 1;
            return a.firstCutAngle - b.firstCutAngle;
          }
          return b.length - a.length;
        });
      } else {
        allCuts.sort((a, b) => b.length - a.length);
      }

      // Sort stock by length
      const sortedStock = [...availableStock].sort((a, b) => a.length - b.length);

      // Distribute cuts across stock bars
      sortedStock.forEach((stockBar, stockIndex) => {
        if (allCuts.length === 0) return;

        let currentPosition = 0;
        const barCuts: any[] = [];

        let i = 0;
        while (i < allCuts.length && currentPosition < stockBar.length) {
          const cut = allCuts[i];
          const kerfWidth = cut.kerfWidth || 2.4;
          
          if (currentPosition + cut.length + kerfWidth <= stockBar.length) {
            const { weightPerMeter, totalWeight, category } = getMaterialWeight(materialCode, cut.length);
            const handlingTime = handlingTimes[category].total;
            
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
              handlingTime: handlingTime,
              kerfWidth: kerfWidth,
              weightPerMeter: weightPerMeter,
              partWeight: totalWeight
            });
            
            currentPosition += cut.length + kerfWidth;
            allCuts.splice(i, 1);
          } else {
            i++;
          }
        }

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
            totalHandlingTime: barCuts.reduce((sum, cut) => sum + (cut.handlingTime || 3), 0)
          });
        }
      });
    });

    return plans;
  };

  const handleAddCut = () => {
    if (newCut.length && newCut.materialCode) {
      const cutRequirement: CutRequirement = {
        id: `cut-${Date.now()}`,
        length: parseInt(newCut.length),
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
        length: parseInt(newStock.length),
        quantity: parseInt(newStock.quantity),
        materialCode: newStock.materialCode
      };
      
      setStockItems([...stockItems, stockItem]);
      setNewStock({
        length: "",
        quantity: "1",
        materialCode: ""
      });
    }
  };

  const handleOptimize = async () => {
    if (cutRequirements.length === 0 || stockItems.length === 0) return;
    
    setIsOptimizing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = runCuttingOptimization(cutRequirements, stockItems);
      setOptimizationResult(result);
      
      const totalWaste = result.reduce((acc, plan) => acc + plan.wasteLength, 0);
      const avgEfficiency = result.reduce((acc, plan) => acc + plan.efficiency, 0) / result.length;
      
      const simulation = {
        id: `SIM-${Date.now()}`,
        timestamp: new Date().toISOString(),
        cuts: cutRequirements,
        stock: stockItems,
        result: result,
        totalWaste: totalWaste,
        efficiency: avgEfficiency,
        useAngleGrouping: useAngleGrouping,
        handlingTimes: handlingTimes,
        totalCuts: result.reduce((acc: number, plan: any) => acc + plan.totalCuts, 0),
        totalPlans: result.length
      };
      
      setSimulationHistory(prev => [simulation, ...prev.slice(0, 9)]);
      localStorage.setItem('cutting_simulations', JSON.stringify([simulation, ...simulationHistory.slice(0, 9)]));
      
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = currentTime.getTime();
    const time = new Date(timestamp).getTime();
    const diffMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const loadSimulation = async (sim: any) => {
    setLoadingSimulation(true);
    
    try {
      console.log('Loading simulation:', sim);
      
      // Clear current state first
      setCutRequirements([]);
      setStockItems([]);
      setOptimizationResult(null);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Load cut requirements with proper validation
      if (sim.cuts && Array.isArray(sim.cuts)) {
        const validatedCuts = sim.cuts.map((cut: any) => ({
          id: cut.id || `cut-${Date.now()}-${Math.random()}`,
          length: parseInt(cut.length) || 0,
          quantity: parseInt(cut.quantity) || 1,
          materialCode: cut.materialCode || '',
          firstCutAngle: cut.firstCutAngle || 90,
          secondCutAngle: cut.secondCutAngle || 90,
          kerfWidth: cut.kerfWidth || 2.4,
          description: cut.description || ''
        }));
        setCutRequirements(validatedCuts);
        console.log('Loaded cut requirements:', validatedCuts);
      }
      
      // Load stock items with proper validation
      if (sim.stock && Array.isArray(sim.stock)) {
        const validatedStock = sim.stock.map((stock: any) => ({
          id: stock.id || `stock-${Date.now()}-${Math.random()}`,
          length: parseInt(stock.length) || 0,
          quantity: parseInt(stock.quantity) || 1,
          materialCode: stock.materialCode || ''
        }));
        setStockItems(validatedStock);
        console.log('Loaded stock items:', validatedStock);
      }
      
      // Load optimization result if it exists
      if (sim.result && Array.isArray(sim.result)) {
        setOptimizationResult(sim.result);
        console.log('Loaded optimization result:', sim.result);
      }
      
      // Load angle grouping setting
      setUseAngleGrouping(sim.useAngleGrouping || false);
      
      // Update handling times if saved in simulation
      if (sim.handlingTimes) {
        setHandlingTimes(sim.handlingTimes);
      }
      
      // Close history panel
      setShowHistory(false);
      
      console.log('Simulation loaded successfully');
      
    } catch (error) {
      console.error('Error loading simulation:', error);
    } finally {
      setLoadingSimulation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cutting Optimization</h1>
          <p className="text-muted-foreground">Create optimized cutting plans for steel fabrication</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          History ({simulationHistory.length})
        </Button>
      </div>

      {/* Simulation History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Simulations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {simulationHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No simulations yet</p>
            ) : (
              <div className="space-y-2">
                {simulationHistory.map((sim) => (
                  <div
                    key={sim.id}
                    className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                      loadingSimulation ? 'opacity-50 pointer-events-none' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => !loadingSimulation && loadSimulation(sim)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{sim.id}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(sim.timestamp)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {sim.totalCuts || 0} cuts • {sim.totalPlans || 0} plans • {sim.useAngleGrouping ? 'Angle Grouped' : 'Standard'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{sim.efficiency?.toFixed(1) || '0.0'}% efficient</div>
                      <div className="text-sm text-muted-foreground">{sim.totalWaste?.toFixed(0) || '0'}mm waste</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {loadingSimulation ? 'Loading...' : 'Click to load'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Simulation Indicator */}
      {loadingSimulation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-medium text-blue-900">Loading Historical Simulation</p>
                <p className="text-sm text-blue-700">Restoring cut requirements, stock items, and optimization results...</p>
              </div>
            </div>
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
                    placeholder="e.g., 2400"
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
                  <Label htmlFor="cut-material">Material</Label>
                  <InstantMaterialSearch
                    value={newCut.materialCode}
                    onSelect={(material) => setNewCut({ ...newCut, materialCode: material })}
                    placeholder="Search materials..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first-angle">First Cut Angle (°)</Label>
                  <Input
                    id="first-angle"
                    type="number"
                    value={newCut.firstCutAngle}
                    onChange={(e) => setNewCut({ ...newCut, firstCutAngle: parseInt(e.target.value) || 90 })}
                    min="0"
                    max="180"
                  />
                </div>
                <div>
                  <Label htmlFor="second-angle">Second Cut Angle (°)</Label>
                  <Input
                    id="second-angle"
                    type="number"
                    value={newCut.secondCutAngle}
                    onChange={(e) => setNewCut({ ...newCut, secondCutAngle: parseInt(e.target.value) || 90 })}
                    min="0"
                    max="180"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newCut.description}
                  onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                  placeholder="e.g., Frame member, support bracket..."
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
                    placeholder="e.g., 6000"
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
                  <Label htmlFor="stock-material">Material</Label>
                  <InstantMaterialSearch
                    value={newStock.materialCode}
                    onSelect={(material) => setNewStock({ ...newStock, materialCode: material })}
                    placeholder="Search materials..."
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
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="outline">{stock.materialCode}</Badge>
                    <span className="font-medium">{stock.length}mm</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">×</span>
                      <Input
                        type="number"
                        value={stock.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          const updatedStock = [...stockItems];
                          updatedStock[index] = { ...stock, quantity: newQuantity };
                          setStockItems(updatedStock);
                        }}
                        className="w-16 h-7 text-sm"
                        min="1"
                      />
                    </div>
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

            {/* Material Handling Time Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Material Handling Time (per piece)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Crane Required</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Crane Materials (40.01kg+):</p>
                              <p>• Loading with crane: 5min</p>
                              <p>• Unloading with crane: 5min</p>
                              <p>• Heavy beams, large sections</p>
                              <p className="text-muted-foreground mt-1 italic">Weight calculated from material library data</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.crane.loading}
                          onChange={(e) => {
                            const loading = parseFloat(e.target.value) || 5;
                            const unloading = handlingTimes.crane.unloading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              crane: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Load</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.crane.unloading}
                          onChange={(e) => {
                            const unloading = parseFloat(e.target.value) || 5;
                            const loading = handlingTimes.crane.loading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              crane: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Unload</span>
                      </div>
                      <div className="text-xs text-center font-medium text-red-600">
                        Total: {handlingTimes.crane.total}min
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Heavy</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Heavy Materials (20.01-40kg):</p>
                              <p>• Loading time: 3min</p>
                              <p>• Unloading time: 2min</p>
                              <p>• Medium structural sections</p>
                              <p className="text-muted-foreground mt-1 italic">Weight calculated from material library data</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.heavy.loading}
                          onChange={(e) => {
                            const loading = parseFloat(e.target.value) || 3;
                            const unloading = handlingTimes.heavy.unloading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              heavy: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Load</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.heavy.unloading}
                          onChange={(e) => {
                            const unloading = parseFloat(e.target.value) || 2;
                            const loading = handlingTimes.heavy.loading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              heavy: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Unload</span>
                      </div>
                      <div className="text-xs text-center font-medium text-orange-600">
                        Total: {handlingTimes.heavy.total}min
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Medium</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Medium Materials (5.01-20kg):</p>
                              <p>• Loading time: 2min</p>
                              <p>• Unloading time: 1min</p>
                              <p>• Small structural sections</p>
                              <p className="text-muted-foreground mt-1 italic">Weight calculated from material library data</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.medium.loading}
                          onChange={(e) => {
                            const loading = parseFloat(e.target.value) || 2;
                            const unloading = handlingTimes.medium.unloading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              medium: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Load</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.medium.unloading}
                          onChange={(e) => {
                            const unloading = parseFloat(e.target.value) || 1;
                            const loading = handlingTimes.medium.loading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              medium: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Unload</span>
                      </div>
                      <div className="text-xs text-center font-medium text-yellow-600">
                        Total: {handlingTimes.medium.total}min
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Light</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Light Materials (0-5kg):</p>
                              <p>• Loading time: 0.5min</p>
                              <p>• Unloading time: 0.5min</p>
                              <p>• Small bars, flats, angles</p>
                              <p className="text-muted-foreground mt-1 italic">Weight calculated from material library data</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.light.loading}
                          onChange={(e) => {
                            const loading = parseFloat(e.target.value) || 0.5;
                            const unloading = handlingTimes.light.unloading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              light: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Load</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={handlingTimes.light.unloading}
                          onChange={(e) => {
                            const unloading = parseFloat(e.target.value) || 0.5;
                            const loading = handlingTimes.light.loading;
                            setHandlingTimes({
                              ...handlingTimes, 
                              light: { loading, unloading, total: loading + unloading }
                            });
                          }}
                          className="h-7 text-xs"
                          min="0.1"
                        />
                        <span className="text-xs text-muted-foreground">Unload</span>
                      </div>
                      <div className="text-xs text-center font-medium text-blue-600">
                        Total: {handlingTimes.light.total}min
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimization Strategy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Cutting Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="angle-grouping"
                    checked={useAngleGrouping}
                    onChange={(e) => setUseAngleGrouping(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="angle-grouping" className="text-sm font-medium">
                    Smart Angle Grouping
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {useAngleGrouping 
                    ? "Groups cuts by angle to minimize bandsaw setup time (90° cuts first, then others)" 
                    : "Standard optimization prioritizes longest cuts first for maximum material efficiency"
                  }
                </p>
              </CardContent>
            </Card>

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
        <div className="space-y-4">
          <StandardCuttingPlan 
            plans={optimizationResult}
            materialCode={cutRequirements[0]?.materialCode || 'MIXED'}
            jobNumber={`JOB-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
          />
        </div>
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