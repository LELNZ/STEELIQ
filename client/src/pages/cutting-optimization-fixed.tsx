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

export default function CuttingOptimizationFixed() {
  // Core state
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch optimization simulations from database
  const { data: dbSimulations = [] } = useQuery<any[]>({
    queryKey: ["/api/optimization-simulations"],
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Material handling time settings (loading + unloading per piece)
  const [handlingTimes, setHandlingTimes] = useState({
    crane: { loading: 5, unloading: 5, total: 10 }, // 40.01kg+ requires crane
    heavy: { loading: 3, unloading: 2, total: 5 }, // 20.01-40kg manual heavy lift
    medium: { loading: 2, unloading: 1, total: 3 }, // 5.01-20kg two-person lift
    light: { loading: 0.5, unloading: 0.5, total: 1 }, // 0-5kg single person
  });

  // Fetch materials
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // General instructions for cutting plans
  const [generalInstructions, setGeneralInstructions] = useState<string[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");
  const [cuttingMethod, setCuttingMethod] = useState("Bandsaw - standard setup");

  // Quick-select instruction categories
  const instructionCategories = {
    safety: [
      "Wear correct PPE - safety glasses, gloves, ear protection",
      "Use two-person lift for heavy pieces",
      "Use crane for over 40.1kg pieces",
      "Use correct lifting form"
    ],
    finishing: [
      "Deburr all edges after cutting",
      "Stack on pallet when complete"
    ],
    quality: [
      "Check dimensions before cutting",
      "Mark part number on material as per drawing",
      "Verify angles with protractor before cutting"
    ]
  };

  // Form state
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialCode: "",
    firstCutAngle: 90,
    secondCutAngle: 90,
    kerfWidth: 2.4,
    description: "",
    specificInstructions: ""
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

  // Get material weight from database and determine category
  const getMaterialWeight = (materialCode: string, length: number): { weightPerMeter: number; totalWeight: number; category: 'crane' | 'heavy' | 'medium' | 'light' } => {
    // Find material in database by code
    const material = materialsData.find(m => m.code === materialCode);
    const weightPerMeter = material?.weightPerMeter ? parseFloat(material.weightPerMeter.toString()) : 10; // Default if not found
    
    const totalWeight = (weightPerMeter * length) / 1000; // Convert mm to meters
    
    // Categorize based on total weight with crane requirement
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

  // Get material weight category (updated to include crane)
  const getMaterialWeightCategory = (materialCode: string, length: number = 1000): 'crane' | 'heavy' | 'medium' | 'light' => {
    return getMaterialWeight(materialCode, length).category;
  };

  // Advanced cutting optimization for sub-5% waste
  const runCleanCuttingOptimization = (cuts: CutRequirement[], stock: StockItem[]) => {
    const plans: any[] = [];
    
    // Group cuts by material code (process separately)
    const materialGroups = cuts.reduce((groups: { [key: string]: CutRequirement[] }, cut) => {
      if (!groups[cut.materialCode]) {
        groups[cut.materialCode] = [];
      }
      groups[cut.materialCode].push(cut);
      return groups;
    }, {});

    // Process each material type separately
    Object.entries(materialGroups).forEach(([materialCode, requirements]) => {
      const availableStock = stock.filter(s => s.materialCode === materialCode);
      if (availableStock.length === 0) return;

      // Expand requirements by quantity into individual cuts
      const allCuts: any[] = [];
      requirements.forEach(req => {
        for (let i = 0; i < req.quantity; i++) {
          allCuts.push({
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

      // Sort cuts by complexity and length for optimal nesting
      // Priority: Complex angles first, then by length (longest first)
      allCuts.sort((a, b) => {
        const aComplexity = (a.firstCutAngle !== 90 || a.secondCutAngle !== 90) ? 1 : 0;
        const bComplexity = (b.firstCutAngle !== 90 || b.secondCutAngle !== 90) ? 1 : 0;
        
        if (aComplexity !== bComplexity) {
          return bComplexity - aComplexity; // Complex cuts first
        }
        return b.length - a.length; // Then longest first
      });

      // Create individual stock bars from quantities
      const stockBars: any[] = [];
      availableStock.forEach((stockItem) => {
        for (let i = 0; i < stockItem.quantity; i++) {
          stockBars.push({
            length: stockItem.length,
            materialCode: stockItem.materialCode,
            barNumber: stockBars.length + 1
          });
        }
      });

      // Sort stock bars by length (shortest first to minimize waste)
      stockBars.sort((a, b) => a.length - b.length);

      let cutIndex = 0;
      let barIndex = 0;

      // Process all cuts with advanced offcut utilization
      while (cutIndex < allCuts.length && barIndex < stockBars.length) {
        const currentBar = stockBars[barIndex];
        let currentPosition = 0;
        const barCuts: any[] = [];

        // First pass: Fill with cuts in order
        let tempCutIndex = cutIndex;
        while (tempCutIndex < allCuts.length) {
          const cut = allCuts[tempCutIndex];
          const kerfWidth = cut.kerfWidth || 2.4;
          
          if (currentPosition + cut.length + kerfWidth <= currentBar.length) {
            // Calculate weight and handling time
            const weightData = getMaterialWeight(materialCode, cut.length);
            const category = getMaterialWeightCategory(materialCode, cut.length);
            const handlingTime = handlingTimes[category].total;
            
            // Add cut to this bar
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
              weight: weightData.totalWeight,
              weightPerMeter: weightData.weightPerMeter
            });
            
            currentPosition += cut.length + kerfWidth;
            
            // Remove this cut from remaining cuts
            allCuts.splice(tempCutIndex, 1);
          } else {
            tempCutIndex++;
          }
        }

        // Second pass: Try to fit smaller cuts in remaining space (offcut utilization)
        const remainingSpace = currentBar.length - currentPosition;
        if (remainingSpace > 100) { // If significant space remains
          tempCutIndex = 0;
          while (tempCutIndex < allCuts.length) {
            const cut = allCuts[tempCutIndex];
            const kerfWidth = cut.kerfWidth || 2.4;
            
            if (cut.length + kerfWidth <= remainingSpace) {
              // Calculate weight and handling time
              const weightData = getMaterialWeight(materialCode, cut.length);
              const category = getMaterialWeightCategory(materialCode, cut.length);
              const handlingTime = handlingTimes[category].total;
              
              // Add cut to this bar
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
                weight: weightData.totalWeight,
                weightPerMeter: weightData.weightPerMeter
              });
              
              currentPosition += cut.length + kerfWidth;
              
              // Remove this cut from remaining cuts
              allCuts.splice(tempCutIndex, 1);
              
              // Update remaining space for next iteration
              const newRemainingSpace = currentBar.length - currentPosition;
              if (newRemainingSpace < 100) break; // No point continuing if space too small
            } else {
              tempCutIndex++;
            }
          }
        }

        // Create cutting plan for this bar
        if (barCuts.length > 0) {
          const totalCutLength = barCuts.reduce((sum, cut) => sum + cut.length, 0);
          const wasteLength = currentBar.length - currentPosition;
          const efficiency = ((totalCutLength / currentBar.length) * 100);
          const wastePercentage = (wasteLength / currentBar.length) * 100;

          plans.push({
            id: `${materialCode}-bar-${currentBar.barNumber}`,
            stockLength: currentBar.length,
            cuts: barCuts,
            wasteLength: wasteLength,
            wastePercentage: Math.round(wastePercentage * 10) / 10,
            efficiency: Math.round(efficiency * 10) / 10,
            totalCuts: barCuts.length,
            materialCode: materialCode,
            totalCuttingTime: barCuts.reduce((sum, cut) => sum + (cut.cuttingTime || 10), 0),
            totalHandlingTime: barCuts.reduce((sum, cut) => sum + (cut.handlingTime || 3), 0),
            totalWeight: barCuts.reduce((sum, cut) => sum + (cut.weight || 0), 0),
            instructions: {
              general: 'Deburr all edges after cutting',
              cuttingMethod: 'Bandsaw - standard setup',
              heatNumber: 'TBD',
              millCertNumber: 'TBD'
            }
          });
        }
        
        barIndex++; // Move to next bar
      }
    });

    return plans;
  };

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

      // Smart stock selection: Calculate waste efficiency for each stock length
      const stockWithEfficiency = availableStock.map(stock => {
        // Calculate potential cuts that could fit
        const potentialCuts = allCuts.filter(cut => cut.length + (cut.kerfWidth || 2.4) <= stock.length);
        const totalCutLength = potentialCuts.reduce((sum, cut) => sum + cut.length + (cut.kerfWidth || 2.4), 0);
        const wastePercentage = stock.length > 0 ? ((stock.length - totalCutLength) / stock.length) * 100 : 100;
        
        return {
          ...stock,
          wastePercentage,
          potentialCuts: potentialCuts.length
        };
      });

      // Sort by efficiency: prefer stocks with lower waste percentage and more potential cuts
      const sortedStock = stockWithEfficiency.sort((a, b) => {
        // Primary: Lower waste percentage
        if (Math.abs(a.wastePercentage - b.wastePercentage) > 5) {
          return a.wastePercentage - b.wastePercentage;
        }
        // Secondary: More potential cuts
        if (a.potentialCuts !== b.potentialCuts) {
          return b.potentialCuts - a.potentialCuts;
        }
        // Tertiary: Shorter length to use efficiently
        return a.length - b.length;
      });

      // Distribute cuts across optimally selected stock bars
      sortedStock.forEach((stockBar, stockIndex) => {
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
            // Calculate handling time based on piece weight
            const category = getMaterialWeightCategory(materialCode, cut.length);
            const handlingTime = handlingTimes[category].total;
            
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
              handlingTime: handlingTime,
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
            totalHandlingTime: barCuts.reduce((sum, cut) => sum + (cut.handlingTime || 3), 0),
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
        description: "",
        specificInstructions: ""
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
      
      const results = runCleanCuttingOptimization(cutRequirements, stockItems);
      setOptimizationResult(results);
      
      // Save to history with original requirements
      const simulation = {
        id: `SIM-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        results: results,
        cutRequests: JSON.stringify(cutRequirements),  // Store as JSON string
        stockItems: JSON.stringify(stockItems),        // Store as JSON string
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
    console.log('Loading simulation:', sim);
    
    // Load optimization results
    setOptimizationResult(sim.results);
    
    // Restore original cut requirements if available
    if (sim.cutRequests) {
      try {
        const originalRequirements = typeof sim.cutRequests === 'string' 
          ? JSON.parse(sim.cutRequests) 
          : sim.cutRequests;
        setCutRequirements(originalRequirements);
        console.log('Restored cut requirements:', originalRequirements);
      } catch (error) {
        console.warn('Could not parse cut requirements:', error);
      }
    }
    
    // Restore stock items if available
    if (sim.stockItems) {
      try {
        const originalStock = typeof sim.stockItems === 'string' 
          ? JSON.parse(sim.stockItems) 
          : sim.stockItems;
        setStockItems(originalStock);
        console.log('Restored stock items:', originalStock);
      } catch (error) {
        console.warn('Could not parse stock items:', error);
      }
    }
    
    setShowHistory(false);
    console.log('Simulation loaded successfully');
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
                  <InstantMaterialSearch
                    onSelect={(materialCode) => setNewCut({ ...newCut, materialCode })}
                    placeholder="Type to search materials..."
                    value={newCut.materialCode}
                  />
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

              {/* Specific Instructions for Individual Cut */}
              <div>
                <Label htmlFor="specific-instructions" className="text-xs">Specific Instructions (Optional)</Label>
                <Input
                  id="specific-instructions"
                  value={newCut.specificInstructions}
                  onChange={(e) => setNewCut({ ...newCut, specificInstructions: e.target.value })}
                  placeholder="Special handling for this cut..."
                  className="h-8"
                />
              </div>

              <Button onClick={handleAddCut} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Cut Requirement
              </Button>
            </div>

            {/* General Instructions - Compact */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-medium mb-2 text-blue-800 text-sm">General Instructions</h4>
              
              {/* Compact grid layout */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(instructionCategories).map(([category, instructions]) => (
                  <div key={category} className="space-y-1">
                    <div className="font-medium text-blue-700 capitalize text-xs">{category}</div>
                    {instructions.map((instruction, index) => (
                      <label key={index} className="flex items-start space-x-1">
                        <input
                          type="checkbox"
                          checked={generalInstructions.includes(instruction)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGeneralInstructions([...generalInstructions, instruction]);
                            } else {
                              setGeneralInstructions(generalInstructions.filter(i => i !== instruction));
                            }
                          }}
                          className="h-3 w-3 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-slate-700 leading-tight">{instruction}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>

              {/* Compact custom instruction */}
              <div className="mt-2 flex gap-1">
                <Input
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Custom instruction..."
                  className="h-7 text-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (customInstruction.trim()) {
                      setGeneralInstructions([...generalInstructions, customInstruction.trim()]);
                      setCustomInstruction("");
                    }
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Add
                </Button>
              </div>

              {/* Compact selected display */}
              {generalInstructions.length > 0 && (
                <div className="mt-2 p-1 bg-white rounded">
                  <div className="flex flex-wrap gap-1">
                    {generalInstructions.map((instruction, index) => (
                      <span key={index} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {instruction.length > 30 ? `${instruction.substring(0, 30)}...` : instruction}
                        <button
                          onClick={() => setGeneralInstructions(generalInstructions.filter((_, i) => i !== index))}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Material requirements summary */}
            {cutRequirements.length > 0 && (
              <div className="bg-muted/30 p-2 rounded text-xs">
                <h4 className="font-medium mb-1">Required Materials</h4>
                <div className="space-y-0.5">
                  {Object.entries(
                    cutRequirements.reduce((acc, cut) => {
                      if (!acc[cut.materialCode]) {
                        acc[cut.materialCode] = 0;
                      }
                      // Include kerf waste per cut in total material calculation
                      const kerfWaste = (cut.kerfWidth || 2.4) * cut.quantity;
                      acc[cut.materialCode] += (cut.length * cut.quantity) + kerfWaste;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([materialCode, totalLength]) => (
                    <div key={materialCode} className="flex justify-between">
                      <span className="font-medium">{materialCode}</span>
                      <span className="text-muted-foreground">{Math.round(totalLength)}mm</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <InstantMaterialSearch
                    onSelect={(materialCode) => setNewStock({ ...newStock, materialCode })}
                    placeholder="Type to search materials..."
                    value={newStock.materialCode}
                  />
                </div>
              </div>
              <Button onClick={handleAddStock} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Stock Item
              </Button>
            </div>

            {/* Stock availability summary */}
            {stockItems.length > 0 && cutRequirements.length > 0 && (
              <div className="bg-muted/30 p-2 rounded text-xs">
                <h4 className="font-medium mb-1">Stock Status</h4>
                <div className="space-y-0.5">
                  {Object.entries(
                    cutRequirements.reduce((acc, cut) => {
                      if (!acc[cut.materialCode]) {
                        acc[cut.materialCode] = 0;
                      }
                      // Include kerf waste per cut in required material calculation
                      const kerfWaste = (cut.kerfWidth || 2.4) * cut.quantity;
                      acc[cut.materialCode] += (cut.length * cut.quantity) + kerfWaste;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([materialCode, requiredLength]) => {
                    const availableLength = stockItems
                      .filter(stock => stock.materialCode === materialCode)
                      .reduce((sum, stock) => sum + (stock.length * stock.quantity), 0);
                    const isAvailable = availableLength >= requiredLength;
                    
                    return (
                      <div key={materialCode} className="flex justify-between items-center">
                        <span className="font-medium">{materialCode}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            {Math.round(requiredLength)}/{Math.round(availableLength)}mm
                          </span>
                          <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                      <div className="text-xs text-center font-medium text-orange-600">
                        Total: {handlingTimes.crane.total}min
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Heavy Materials</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Heavy Materials (20.01-40kg):</p>
                              <p>• Loading into cutting bay: 3min</p>
                              <p>• Unloading finished pieces: 2min</p>
                              <p>• Manual heavy lift required</p>
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
                      <div className="text-xs text-center font-medium text-blue-600">
                        Total: {handlingTimes.heavy.total}min
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Medium Materials</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Medium Materials (5.01-20kg):</p>
                              <p>• Loading into cutting bay: 2min</p>
                              <p>• Unloading finished pieces: 1min</p>
                              <p>• Two-person lift required</p>
                              <p className="text-muted-foreground mt-1 italic">Weight calculated from material code and cut length</p>
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
                      <div className="text-xs text-center font-medium text-blue-600">
                        Total: {handlingTimes.medium.total}min
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-xs">Light Materials</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs max-w-48">
                              <p className="font-medium mb-1">Light Materials (0-5kg):</p>
                              <p>• Loading into cutting bay: 0.5min</p>
                              <p>• Unloading finished pieces: 0.5min</p>
                              <p>• Easy single-person handling</p>
                              <p className="text-muted-foreground mt-1 italic">Weight calculated from material code and cut length</p>
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
          {/* Create Estimate Button */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Create Professional Estimate</h3>
                  <p className="text-sm text-muted-foreground">
                    Convert this cutting plan into a detailed estimate with material costs, labor calculations, and markup
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    // Navigate to estimate creation with cutting plan data
                    console.log('Creating estimate from cutting plan:', optimizationResult);
                    // TODO: Implement estimate creation navigation
                  }}
                  className="flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Create Estimate
                </Button>
              </div>
            </CardContent>
          </Card>

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