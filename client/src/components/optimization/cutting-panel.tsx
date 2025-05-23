import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CutPattern from "./cut-pattern";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LinearOptimizer } from "@/lib/optimization";
import { CuttingCalculations } from "@/lib/calculations";
import { 
  Zap, 
  Download, 
  FileText, 
  Clock,
  DollarSign,
  Percent,
  AlertCircle,
  CheckCircle,
  Package
} from "lucide-react";
import { Material } from "@shared/schema";
import { OptimizationResult, MaterialRequirement, StockMaterial } from "@/types";

interface CuttingPanelProps {
  algorithm: 'minimize_waste' | 'minimize_cuts' | 'balanced';
}

export default function CuttingPanel({ algorithm }: CuttingPanelProps) {
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
  const [stockMaterials, setStockMaterials] = useState<StockMaterial[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { toast } = useToast();

  const { data: materials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const optimizeMutation = useMutation({
    mutationFn: async (data: {
      requirements: MaterialRequirement[];
      stockLengths: StockMaterial[];
      algorithm: string;
    }) => {
      const response = await apiRequest("POST", "/api/optimize/linear", data);
      return response.json();
    },
    onSuccess: (result) => {
      setOptimizationResult(result);
      toast({
        title: "Optimization Complete",
        description: `Generated ${result.plans.length} cutting plans with ${result.summary.avgEfficiency.toFixed(1)}% efficiency`,
      });
    },
    onError: (error) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize cuts",
        variant: "destructive",
      });
    },
  });

  const runOptimization = () => {
    if (requirements.length === 0 || stockMaterials.length === 0) {
      toast({
        title: "Error",
        description: "Please add material requirements and stock materials",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    optimizeMutation.mutate({
      requirements,
      stockLengths: stockMaterials,
      algorithm,
    });
    setIsOptimizing(false);
  };

  const addRequirement = () => {
    setRequirements([...requirements, {
      materialId: 0,
      length: 0,
      quantity: 1,
      angle: 90,
    }]);
  };

  const updateRequirement = (index: number, field: keyof MaterialRequirement, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const addStockMaterial = () => {
    setStockMaterials([...stockMaterials, {
      materialId: 0,
      length: 6000, // Default 6m length
      available: 1,
    }]);
  };

  const updateStockMaterial = (index: number, field: keyof StockMaterial, value: any) => {
    const updated = [...stockMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setStockMaterials(updated);
  };

  const removeStockMaterial = (index: number) => {
    setStockMaterials(stockMaterials.filter((_, i) => i !== index));
  };

  const generateCutList = () => {
    if (!optimizationResult) return;

    const cutList = LinearOptimizer.generateCutList(optimizationResult.plans);
    const csvContent = [
      "Stock Number,Stock Length (mm),Cut Number,Cut Length (mm),Start Position (mm),End Position (mm)",
      ...cutList.flatMap(stock =>
        stock.cuts.map(cut =>
          `${stock.stockNumber},${stock.stockLength},${cut.cutNumber},${cut.length},${cut.position},${cut.endPosition}`
        )
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cut-list-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const calculateTotalCost = () => {
    if (!optimizationResult || !materials) return 0;

    return optimizationResult.plans.reduce((total, plan) => {
      const usedLength = plan.stockLength - plan.wasteLength;
      // For simplicity, use average material cost
      return total + CuttingCalculations.calculateMaterialCost(usedLength, 10); // $10/m average
    }, 0);
  };

  const calculateTotalTime = () => {
    if (!optimizationResult) return 0;

    const totalCuts = optimizationResult.plans.reduce((total, plan) => total + plan.cuts.length, 0);
    return CuttingCalculations.calculateCutTime(totalCuts);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="cutlist">Cut List</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Material Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Material Requirements
                  <Button onClick={addRequirement} size="sm">
                    Add Requirement
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requirements.map((req, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Requirement {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRequirement(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Material</Label>
                        <Select
                          value={req.materialId.toString()}
                          onValueChange={(value) => updateRequirement(index, 'materialId', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials?.map((material) => (
                              <SelectItem key={material.id} value={material.id.toString()}>
                                {material.code} - {material.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Length (mm)</Label>
                        <Input
                          type="number"
                          value={req.length}
                          onChange={(e) => updateRequirement(index, 'length', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={req.quantity}
                          onChange={(e) => updateRequirement(index, 'quantity', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label>Cut Angle (°)</Label>
                        <Input
                          type="number"
                          value={req.angle || 90}
                          onChange={(e) => updateRequirement(index, 'angle', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    {req.materialId > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const material = materials?.find(m => m.id === req.materialId);
                          const isAngleCut = req.angle !== 90;
                          const cutTime = CuttingCalculations.calculateCutTime(req.quantity, isAngleCut);
                          return (
                            <div className="grid grid-cols-2 gap-2">
                              <span>Cut time: {cutTime} minutes</span>
                              <span>{isAngleCut ? "Angle cut" : "Standard cut"}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
                
                {requirements.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2" />
                    <p>No requirements added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Available Stock
                  <Button onClick={addStockMaterial} size="sm">
                    Add Stock
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stockMaterials.map((stock, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Stock {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStockMaterial(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Material</Label>
                        <Select
                          value={stock.materialId.toString()}
                          onValueChange={(value) => updateStockMaterial(index, 'materialId', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials?.map((material) => (
                              <SelectItem key={material.id} value={material.id.toString()}>
                                {material.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Length (mm)</Label>
                        <Input
                          type="number"
                          value={stock.length}
                          onChange={(e) => updateStockMaterial(index, 'length', parseFloat(e.target.value))}
                        />
                      </div>

                      <div>
                        <Label>Available</Label>
                        <Input
                          type="number"
                          value={stock.available}
                          onChange={(e) => updateStockMaterial(index, 'available', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {stockMaterials.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2" />
                    <p>No stock materials added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Optimization Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Ready to Optimize</h3>
                  <p className="text-muted-foreground">
                    Algorithm: {algorithm.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
                <Button
                  onClick={runOptimization}
                  disabled={isOptimizing || optimizeMutation.isPending}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {isOptimizing ? "Optimizing..." : "Run Optimization"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {optimizationResult ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-accent" />
                      <div>
                        <p className="text-sm text-muted-foreground">Efficiency</p>
                        <p className="text-lg font-bold text-accent">
                          {optimizationResult.summary.avgEfficiency.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Waste</p>
                        <p className="text-lg font-bold text-warning">
                          {optimizationResult.summary.totalWaste.toFixed(0)}mm
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cut Time</p>
                        <p className="text-lg font-bold text-secondary">
                          {Math.round(calculateTotalTime() / 60)}h {calculateTotalTime() % 60}m
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Cost</p>
                        <p className="text-lg font-bold text-foreground">
                          ${calculateTotalCost().toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cut Patterns */}
              <CutPattern plans={optimizationResult.plans} />
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Optimization Results</h3>
                <p className="text-muted-foreground">
                  Run the optimization to see cutting plans and efficiency analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cutlist" className="space-y-6">
          {optimizationResult ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Cut List</CardTitle>
                  <Button onClick={generateCutList}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {LinearOptimizer.generateCutList(optimizationResult.plans).map((stock) => (
                    <div key={stock.stockNumber} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">
                          Stock #{stock.stockNumber} ({stock.stockLength}mm)
                        </h4>
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline">
                            {stock.cuts.length} cuts
                          </Badge>
                          <Badge variant={stock.efficiency > 95 ? "default" : "secondary"}>
                            {stock.efficiency.toFixed(1)}% efficiency
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {stock.cuts.map((cut) => (
                          <div key={cut.cutNumber} className="p-2 bg-muted rounded text-sm">
                            <div className="flex justify-between">
                              <span>Cut #{cut.cutNumber}</span>
                              <span className="font-medium">{cut.length}mm</span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Position: {cut.position}mm - {cut.endPosition}mm
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {stock.wasteLength > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Waste: {stock.wasteLength.toFixed(0)}mm
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Cut List Available</h3>
                <p className="text-muted-foreground">
                  Generate optimization results first to create a cut list
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
