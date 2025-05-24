import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Scissors, Plus, Trash2, Play, BarChart3, Package, Clock, Zap } from "lucide-react";
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
  const [openMaterialSearch, setOpenMaterialSearch] = useState(false);
  const [openStockMaterialSearch, setOpenStockMaterialSearch] = useState(false);

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

  // Create searchable material list with code, name, and category
  const searchableMaterials = materials?.map(material => ({
    value: material.code || material.name,
    label: `${material.code} - ${material.name}`,
    category: material.category || "Other",
    material
  })) || [];

  const addCutRequest = () => {
    if (!newCut.length || !newCut.materialType) return;

    const request: CutRequest = {
      id: `cut_${Date.now()}`,
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
      id: `stock_${Date.now()}`,
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
              <div className="grid grid-cols-5 gap-2">
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
                  <Label htmlFor="cut-quantity">Qty</Label>
                  <Input
                    id="cut-quantity"
                    type="number"
                    value={newCut.quantity}
                    onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                    min="1"
                  />
                </div>
                <div>
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
                <div>
                  <Label htmlFor="cut-material">Material</Label>
                  <Popover open={openMaterialSearch} onOpenChange={setOpenMaterialSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openMaterialSearch}
                        className="w-full justify-between"
                      >
                        {newCut.materialType
                          ? searchableMaterials.find((material) => material.value === newCut.materialType)?.label
                          : "Search materials..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Type to search materials..." />
                        <CommandEmpty>No material found.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-y-auto">
                          {searchableMaterials.map((material) => (
                            <CommandItem
                              key={material.value}
                              value={material.label}
                              onSelect={() => {
                                setNewCut({ ...newCut, materialType: material.value });
                                setOpenMaterialSearch(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  newCut.materialType === material.value ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div>
                                <div className="font-medium">{material.material.code}</div>
                                <div className="text-sm text-muted-foreground">{material.material.name}</div>
                                <div className="text-xs text-muted-foreground">{material.category}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end">
                  <Button onClick={addCutRequest} size="sm" className="w-full">
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
              <div className="grid grid-cols-4 gap-2">
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
                  <Label htmlFor="stock-available">Qty</Label>
                  <Input
                    id="stock-available"
                    type="number"
                    value={newStock.available}
                    onChange={(e) => setNewStock({ ...newStock, available: e.target.value })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="stock-material">Material</Label>
                  <Popover open={openStockMaterialSearch} onOpenChange={setOpenStockMaterialSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openStockMaterialSearch}
                        className="w-full justify-between"
                      >
                        {newStock.materialType
                          ? searchableMaterials.find((material) => material.value === newStock.materialType)?.label
                          : "Search materials..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Type to search materials..." />
                        <CommandEmpty>No material found.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-y-auto">
                          {searchableMaterials.map((material) => (
                            <CommandItem
                              key={material.value}
                              value={material.label}
                              onSelect={() => {
                                setNewStock({ ...newStock, materialType: material.value });
                                setOpenStockMaterialSearch(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  newStock.materialType === material.value ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div>
                                <div className="font-medium">{material.material.code}</div>
                                <div className="text-sm text-muted-foreground">{material.material.name}</div>
                                <div className="text-xs text-muted-foreground">{material.category}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end">
                  <Button onClick={addStockItem} size="sm" className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="stock-cost">Cost per meter (optional)</Label>
                <Input
                  id="stock-cost"
                  type="number"
                  step="0.01"
                  value={newStock.cost}
                  onChange={(e) => setNewStock({ ...newStock, cost: e.target.value })}
                  placeholder="25.00"
                />
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