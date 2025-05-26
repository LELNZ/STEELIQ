import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Scissors, Plus, Trash2, Play, Zap, Clock, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StandardCuttingPlan from "@/components/optimization/standard-cutting-plan";

interface CutRequirement {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  firstCutAngle: number;  // Right end cut (first cut in bandsaw operation)
  secondCutAngle: number; // Left end cut (second cut in bandsaw operation)
  kerfWidth?: number;     // Blade kerf width in mm
  description?: string;
}

interface StockItem {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
}

// Clean optimization function with proper error handling
const optimizeCutting = (cutRequirements: CutRequirement[], stockItems: StockItem[]) => {
  try {
    const plans: any[] = [];
    
    if (!cutRequirements || !stockItems || cutRequirements.length === 0 || stockItems.length === 0) {
      return plans;
    }
    
    // Group requirements by material type
    const materialGroups = cutRequirements.reduce((groups, req) => {
      if (!req.materialCode) return groups;
      if (!groups[req.materialCode]) {
        groups[req.materialCode] = [];
      }
      groups[req.materialCode].push(req);
      return groups;
    }, {} as Record<string, CutRequirement[]>);

    // Process each material type
    Object.entries(materialGroups).forEach(([materialCode, requirements]) => {
      // Find matching stock for this material
      const availableStock = stockItems.filter(stock => stock.materialCode === materialCode);
      
      if (availableStock.length === 0) return;

      // Sort stock by length (shortest first to minimize waste)
      const sortedStock = [...availableStock].sort((a, b) => a.length - b.length);
      
      // Expand requirements by quantity (create individual cuts)
      const expandedRequirements: CutRequirement[] = [];
      requirements.forEach(req => {
        for (let i = 0; i < (req.quantity || 1); i++) {
          expandedRequirements.push({
            ...req,
            id: `${req.id}-${i + 1}`,
            quantity: 1
          });
        }
      });

      // Process each stock bar
      for (let stockIndex = 0; stockIndex < sortedStock.length; stockIndex++) {
        if (expandedRequirements.length === 0) break;
        
        const stock = sortedStock[stockIndex];
        let currentPosition = 0;
        const cuts: any[] = [];
        let cutSequence = 1;
        
        // Try to fit cuts on this bar
        let i = 0;
        while (i < expandedRequirements.length && currentPosition < stock.length) {
          const req = expandedRequirements[i];
          const kerfWidth = req.kerfWidth || 2.4;
          
          // Check if this cut fits on current stock
          if (currentPosition + req.length + kerfWidth <= stock.length) {
            cuts.push({
              id: `${materialCode}-bar${stockIndex + 1}-cut${cutSequence}`,
              length: req.length,
              quantity: 1,
              startPosition: currentPosition,
              endPosition: currentPosition + req.length,
              firstCutAngle: req.firstCutAngle || 90,
              secondCutAngle: req.secondCutAngle || 90,
              description: req.description || `${req.length}mm piece`,
              materialCode: req.materialCode,
              cuttingTime: (req.firstCutAngle === 90 && req.secondCutAngle === 90) ? 10 : 12,
              kerfWidth: kerfWidth
            });
            
            currentPosition += req.length + kerfWidth;
            cutSequence++;
            
            // Remove this requirement as it's been placed
            expandedRequirements.splice(i, 1);
          } else {
            i++;
          }
        }

        // Create plan for this bar if it has cuts
        if (cuts.length > 0) {
          const totalCutsLength = cuts.reduce((sum, cut) => sum + cut.length, 0);
          const totalKerfAllowance = cuts.reduce((sum, cut) => sum + (cut.kerfWidth || 2.4), 0);
          const wasteLength = stock.length - totalCutsLength - totalKerfAllowance;
          const efficiency = ((totalCutsLength + totalKerfAllowance) / stock.length) * 100;
          
          plans.push({
            id: `plan-${materialCode}-${stockIndex + 1}`,
            stockLength: stock.length,
            cuts: cuts,
            wasteLength: Math.max(0, wasteLength),
            efficiency: Math.min(100, Math.max(0, efficiency)),
            totalCuts: cuts.length,
            materialType: materialCode,
            materialGrade: 'Standard Grade',
            barNumber: stockIndex + 1,
            instructions: {
              general: 'Check material grade before cutting',
              setup: 'Standard bandsaw setup',
              safety: 'Wear appropriate PPE'
            }
          });
        }
      }
    });

    return plans;
  } catch (error) {
    console.error('Optimization error:', error);
    return [];
  }
};

// Smart relative time formatter
const formatRelativeTime = (timestamp: string | Date) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // For older dates, show actual date
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (error) {
    return "Unknown time";
  }
};

export default function CuttingOptimizationNew() {
  // State management
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Advanced settings
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("multi");
  const [isJobMode, setIsJobMode] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load simulation history from localStorage on component mount
  useEffect(() => {
    const loadSimulationHistory = () => {
      try {
        const stored = localStorage.getItem('cutting_simulations');
        if (stored) {
          const simulations = JSON.parse(stored);
          
          // Filter out expired simulations (older than 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const validSimulations = simulations.filter((sim: any) => {
            const simDate = new Date(sim.timestamp);
            return simDate > sevenDaysAgo;
          });
          
          // Save filtered simulations back to localStorage
          if (validSimulations.length !== simulations.length) {
            localStorage.setItem('cutting_simulations', JSON.stringify(validSimulations));
          }
          
          setSimulationHistory(validSimulations);
        } else {
          setSimulationHistory([]);
        }
      } catch (error) {
        console.error('Error loading simulation history:', error);
        // If data is corrupted, clear it
        localStorage.removeItem('cutting_simulations');
        setSimulationHistory([]);
      }
    };

    loadSimulationHistory();
  }, []);

  // Update current time every minute for real-time relative date display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Common material codes for quick selection
  const commonMaterials = ['SHS10090', 'RHS10050', 'UB200', 'UC200', 'FLAT50x5'];

  // New cut requirement form with proper angles
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialCode: "",
    firstCutAngle: 90,  // Right end (first cut)
    secondCutAngle: 90, // Left end (second cut)
    kerfWidth: 2.4,
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
    
    // Simulate optimization processing based on selected algorithm
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results = optimizeCutting(cutRequirements, stockItems);
    setOptimizationResult(results);
    
    // Save to simulation history with localStorage persistence
    const simulation = {
      id: `SIM-${Date.now()}`,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      algorithm: selectedAlgorithm,
      cutRequirements: JSON.stringify(cutRequirements),
      stockItems: JSON.stringify(stockItems),
      optimizationData: JSON.stringify(results),
      results: results,
      efficiency: results.length > 0 ? results.reduce((acc: number, plan: any) => acc + (plan.efficiency || 0), 0) / results.length : 0,
      totalWaste: results.reduce((acc: number, plan: any) => acc + (plan.wasteLength || 0), 0),
      summary: JSON.stringify({
        totalMaterials: results.length,
        totalCuts: results.reduce((acc: number, plan: any) => acc + (plan.totalCuts || 0), 0),
        totalWaste: results.reduce((acc: number, plan: any) => acc + (plan.wasteLength || 0), 0),
        avgEfficiency: results.length > 0 ? results.reduce((acc: number, plan: any) => acc + (plan.efficiency || 0), 0) / results.length : 0
      })
    };
    
    // Update local state
    setSimulationHistory(prev => [simulation, ...prev.slice(0, 19)]);
    
    // Save to localStorage
    try {
      const existing = localStorage.getItem('cutting_simulations');
      const simulations = existing ? JSON.parse(existing) : [];
      simulations.unshift(simulation);
      
      // Keep only last 20 simulations
      if (simulations.length > 20) {
        simulations.splice(20);
      }
      
      localStorage.setItem('cutting_simulations', JSON.stringify(simulations));
    } catch (error) {
      console.error('Error saving simulation:', error);
    }
    
    setIsOptimizing(false);
  };

  const loadSimulation = (sim: any) => {
    try {
      setCutRequirements(JSON.parse(sim.cutRequirements));
      setStockItems(JSON.parse(sim.stockItems));
      setOptimizationResult(JSON.parse(sim.optimizationData));
    } catch (error) {
      console.error('Error loading simulation:', error);
    }
  };

  const getMaterialColor = (materialCode: string) => {
    const hash = materialCode.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cutting Optimization</h1>
          <p className="text-muted-foreground">Advanced steel cutting optimization with multi-bar distribution and angle-aware nesting</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showHistory ? "default" : "outline"}
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="h-4 w-4 mr-2" />
            History ({simulationHistory.length})
          </Button>
        </div>
      </div>

      {/* History Panel */}
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
                        {formatRelativeTime(sim.timestamp || sim.createdAt)} • {sim.algorithm}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{(typeof sim.efficiency === 'number') ? sim.efficiency.toFixed(1) : '0.0'}% efficient</div>
                      <div className="text-sm text-muted-foreground">{(typeof sim.totalWaste === 'number') ? sim.totalWaste.toFixed(0) : '0'}mm waste</div>
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
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const totals = cutRequirements.reduce((acc, cut) => {
                      const materialKey = cut.materialCode;
                      acc[materialKey] = (acc[materialKey] || 0) + (cut.length * cut.quantity);
                      return acc;
                    }, {} as Record<string, number>);
                    return Object.entries(totals).map(([material, total]) => (
                      <Badge key={material} variant="secondary" className={`text-xs`} style={{color: getMaterialColor(material)}}>
                        {material}: {total.toLocaleString()}mm
                      </Badge>
                    ));
                  })()}
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
                    placeholder="e.g. 1500"
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
              
              {/* Cut Angles and Kerf Width */}
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
                            <p className="text-sm">Material feeds from left, first cut is on the right end of your piece.</p>
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
                      max="165"
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
                            <p className="font-semibold text-green-600">Second Cut Angle (Left End)</p>
                            <p className="text-sm mt-1">This is the second cut made on the bandsaw.</p>
                            <p className="text-sm">After the first cut, this cuts the left end of your piece.</p>
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
                      max="165"
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
                <Textarea
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
              <Plus className="h-5 w-5" />
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
                    placeholder="e.g. 6000"
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
  );
}