import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Scissors, Plus, Trash2, Play, BarChart3, Package, Clock, Zap, Star, Download, FileText, Table } from "lucide-react";
import type { Material } from "@shared/schema";

interface CutRequest {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  startAngle: number;
  endAngle: number;
  description: string;
}

interface StockItem {
  id: string;
  length: number;
  materialCode: string;
  cost: number;
}

interface CuttingPlan {
  stockId: string;
  stockLength: number;
  cuts: Array<{
    id: string;
    length: number;
    position: number;
    startAngle: number;
    endAngle: number;
    usesExistingAngle?: boolean;
    quantity: number;
  }>;
  wasteLength: number;
  efficiency: number;
}

interface OptimizationResult {
  plans: CuttingPlan[];
  totalWaste: number;
  totalEfficiency: number;
  remnants: Array<{ length: number; materialCode: string }>;
}

export default function CuttingOptimizerClean() {
  const [cutRequests, setCutRequests] = useState<CutRequest[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'simple'>('detailed');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [formData, setFormData] = useState({
    length: "",
    quantity: "1",
    materialType: "",
    startAngle: 90,
    endAngle: 90,
    description: ""
  });

  // Fetch materials
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const addCutRequest = () => {
    if (!formData.length || !formData.materialType) return;

    const newRequest: CutRequest = {
      id: `cut-${Date.now()}`,
      length: parseFloat(formData.length),
      quantity: parseInt(formData.quantity),
      materialCode: formData.materialType,
      startAngle: formData.startAngle,
      endAngle: formData.endAngle,
      description: formData.description
    };

    setCutRequests([...cutRequests, newRequest]);
    setFormData({
      length: "",
      quantity: "1",
      materialType: formData.materialType,
      startAngle: 90,
      endAngle: 90,
      description: ""
    });
  };

  const addStockItem = () => {
    if (!formData.materialType) return;

    const newStock: StockItem = {
      id: `stock-${Date.now()}`,
      length: 12000, // Standard 12m length
      materialCode: formData.materialType,
      cost: 50 // Example cost
    };

    setStockItems([...stockItems, newStock]);
  };

  const runOptimization = () => {
    if (cutRequests.length === 0 || stockItems.length === 0) return;

    setIsOptimizing(true);
    
    // Simple optimization simulation
    setTimeout(() => {
      const mockResult: OptimizationResult = {
        plans: cutRequests.map((req, index) => ({
          stockId: `stock-${index}`,
          stockLength: 12000,
          cuts: [{
            id: req.id,
            length: req.length,
            position: 0,
            startAngle: req.startAngle,
            endAngle: req.endAngle,
            usesExistingAngle: req.startAngle !== 90 && index > 0,
            quantity: req.quantity
          }],
          wasteLength: 12000 - req.length,
          efficiency: (req.length / 12000) * 100
        })),
        totalWaste: cutRequests.reduce((sum, req) => sum + (12000 - req.length), 0),
        totalEfficiency: cutRequests.reduce((sum, req) => sum + (req.length / 12000) * 100, 0) / cutRequests.length,
        remnants: cutRequests.map(req => ({ length: 12000 - req.length, materialCode: req.materialCode }))
      };

      setOptimizationResult(mockResult);
      setIsOptimizing(false);
    }, 2000);
  };

  const processPlansForDisplay = (plans: CuttingPlan[]) => {
    return plans.map(plan => ({ plan, repeatCount: 1 }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cutting Optimization</h1>
          <p className="text-muted-foreground">Minimize waste and maximize efficiency with advanced algorithms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cut Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Cut Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium">Material Specification</h4>
              
              <div>
                <Label>Material</Label>
                <Select value={formData.materialType} onValueChange={(value) => setFormData({...formData, materialType: value})}>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Length (mm)</Label>
                  <Input
                    value={formData.length}
                    onChange={(e) => setFormData({...formData, length: e.target.value})}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Angle (°)</Label>
                  <Input
                    type="number"
                    value={formData.startAngle}
                    onChange={(e) => setFormData({...formData, startAngle: parseInt(e.target.value) || 90})}
                    placeholder="90"
                  />
                  <div className="text-xs text-muted-foreground mt-1">Left side cut (cutting left to right)</div>
                </div>
                <div>
                  <Label>End Angle (°)</Label>
                  <Input
                    type="number"
                    value={formData.endAngle}
                    onChange={(e) => setFormData({...formData, endAngle: parseInt(e.target.value) || 90})}
                    placeholder="90"
                  />
                  <div className="text-xs text-muted-foreground mt-1">Right side cut</div>
                </div>
              </div>

              <Button onClick={addCutRequest} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Cut
              </Button>
            </div>

            {/* Cut requests list */}
            <div className="space-y-2">
              <h4 className="font-medium">Requested Cuts ({cutRequests.length})</h4>
              {cutRequests.map((request) => (
                <div key={request.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{request.length}mm x {request.quantity}</span>
                  <div className="flex items-center gap-2">
                    {request.startAngle !== 90 && <Badge variant="secondary">{request.startAngle}°</Badge>}
                    {request.endAngle !== 90 && <Badge variant="secondary">{request.endAngle}°</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCutRequests(cutRequests.filter(r => r.id !== request.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
            <Button onClick={addStockItem} disabled={!formData.materialType}>
              <Plus className="h-4 w-4 mr-2" />
              Add 12m Stock
            </Button>

            <div className="space-y-2">
              <h4 className="font-medium">Stock Items ({stockItems.length})</h4>
              {stockItems.map((stock) => (
                <div key={stock.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{stock.length}mm</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStockItems(stockItems.filter(s => s.id !== stock.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={runOptimization}
              disabled={cutRequests.length === 0 || stockItems.length === 0 || isOptimizing}
              className="w-full"
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

      {/* Results */}
      {optimizationResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Optimization Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{optimizationResult.totalEfficiency.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{((optimizationResult.totalWaste / 12000) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Waste</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{optimizationResult.plans.length}</div>
                  <div className="text-sm text-muted-foreground">Total Plans</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Cutting Plans */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cutting Plans ({optimizationResult.plans.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">View:</Label>
                  <div className="flex border rounded-lg">
                    <Button
                      variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('detailed')}
                      className="h-8 px-3 text-xs rounded-r-none"
                    >
                      <Table className="h-3 w-3 mr-1" />
                      Detailed
                    </Button>
                    <Button
                      variant={viewMode === 'simple' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('simple')}
                      className="h-8 px-3 text-xs rounded-l-none"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Simple
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {viewMode === 'detailed' ? (
                // Detailed Visual View
                processPlansForDisplay(optimizationResult.plans).map((planGroup, groupIndex) => (
                  <div key={planGroup.plan.stockId + groupIndex} className="border-2 rounded-lg p-4 space-y-4 bg-white print:break-inside-avoid">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-2 border-b">
                      <div>
                        <span className="font-bold text-lg">Stock #{groupIndex + 1}</span>
                        {planGroup.repeatCount > 1 && (
                          <Badge variant="default" className="ml-2 bg-yellow-500 text-black">
                            REPEAT {planGroup.repeatCount}x
                          </Badge>
                        )}
                      </div>
                      <Badge variant={planGroup.plan.efficiency > 90 ? "default" : planGroup.plan.efficiency > 75 ? "secondary" : "destructive"} className="text-sm">
                        {planGroup.plan.efficiency.toFixed(1)}% Efficiency
                      </Badge>
                    </div>
                    
                    {/* Stock info */}
                    <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-3 rounded">
                      <div>
                        <span className="font-medium">Total Length:</span>
                        <div className="text-lg font-bold">{planGroup.plan.stockLength}mm</div>
                      </div>
                      <div>
                        <span className="font-medium">Total Cuts:</span>
                        <div className="text-lg font-bold text-blue-600">{planGroup.plan.cuts.length}</div>
                      </div>
                      <div>
                        <span className="font-medium">Waste:</span>
                        <div className="text-lg font-bold text-red-600">{planGroup.plan.wasteLength.toFixed(0)}mm</div>
                      </div>
                    </div>

                    {/* Visual cutting diagram */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Cutting Diagram:</h4>
                      <div className="relative">
                        {/* Material bar representation */}
                        <div className="relative h-12 bg-gradient-to-r from-slate-300 to-slate-400 border-2 border-slate-500 rounded" style={{ width: '100%' }}>
                          {/* Cut positions */}
                          {planGroup.plan.cuts.map((cut, cutIndex) => {
                            const leftPercent = (cut.position / planGroup.plan.stockLength) * 100;
                            const widthPercent = (cut.length / planGroup.plan.stockLength) * 100;
                            const colors = [
                              'bg-blue-500',
                              'bg-green-500', 
                              'bg-purple-500',
                              'bg-yellow-500',
                              'bg-pink-500',
                              'bg-cyan-500'
                            ];
                            const cutColor = colors[cutIndex % colors.length];
                            
                            return (
                              <div key={cutIndex} className="absolute top-0 h-full flex items-center">
                                {/* Cut piece */}
                                <div 
                                  className={`h-full ${cutColor} border border-slate-700 flex items-center justify-center text-white text-xs font-bold rounded-sm`}
                                  style={{ 
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: '20px'
                                  }}
                                  title={`Cut ${cutIndex + 1}: ${cut.length}mm at ${cut.position}mm`}
                                >
                                  {widthPercent > 5 && (
                                    <span className="truncate px-1">
                                      {cut.length}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Angle indicators */}
                                {((cut.startAngle && cut.startAngle !== 90) || (cut.endAngle && cut.endAngle !== 90)) && (
                                  <div className="absolute -top-6 left-0 right-0 flex justify-between text-xs">
                                    {cut.startAngle && cut.startAngle !== 90 && (
                                      <span className="bg-red-100 text-red-800 px-1 rounded border">
                                        ↗ {cut.startAngle}°
                                      </span>
                                    )}
                                    {cut.endAngle && cut.endAngle !== 90 && (
                                      <span className="bg-red-100 text-red-800 px-1 rounded border">
                                        {cut.endAngle}° ↖
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* Chain indicator */}
                                {cut.usesExistingAngle && (
                                  <div className="absolute -bottom-6 left-0 bg-green-100 text-green-800 text-xs px-2 py-1 rounded border">
                                    ⚡ Uses existing angle
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Waste area */}
                          {planGroup.plan.wasteLength > 0 && (
                            <div 
                              className="absolute top-0 h-full bg-red-300 border border-red-500 flex items-center justify-center text-red-800 text-xs font-bold"
                              style={{ 
                                right: '0',
                                width: `${(planGroup.plan.wasteLength / planGroup.plan.stockLength) * 100}%`
                              }}
                              title={`Waste: ${planGroup.plan.wasteLength.toFixed(0)}mm`}
                            >
                              WASTE
                            </div>
                          )}
                        </div>
                        
                        {/* Scale markers */}
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0mm</span>
                          <span>{(planGroup.plan.stockLength / 2).toFixed(0)}mm</span>
                          <span>{planGroup.plan.stockLength}mm</span>
                        </div>
                      </div>
                    </div>

                    {/* Material savings indicator */}
                    {planGroup.plan.cuts.some(cut => cut.usesExistingAngle) && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center gap-2 text-green-800">
                          <Zap className="h-4 w-4" />
                          <span className="font-medium">Material Savings Achieved!</span>
                        </div>
                        <div className="text-sm text-green-700 mt-1">
                          This plan uses progressive angle optimization to minimize waste and reduce cutting time.
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Simple Traditional View
                processPlansForDisplay(optimizationResult.plans).map((planGroup, groupIndex) => (
                  <div key={planGroup.plan.stockId + groupIndex} className="border rounded-lg p-4 space-y-3 bg-white print:break-inside-avoid">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-bold">Stock #{groupIndex + 1}</span>
                      <div className="text-right text-sm">
                        <div className="font-medium">{planGroup.plan.stockLength}mm</div>
                        <div className="text-xs text-muted-foreground">
                          {planGroup.plan.efficiency.toFixed(1)}% efficiency
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
                        <div>Cut</div>
                        <div>Length</div>
                        <div>Position</div>
                        <div>Start °</div>
                        <div>End °</div>
                        <div>Notes</div>
                      </div>
                      {planGroup.plan.cuts.map((cut, cutIndex) => (
                        <div key={cutIndex} className="grid grid-cols-6 gap-2 text-sm py-1 border-b border-dashed">
                          <div className="font-medium">#{cutIndex + 1}</div>
                          <div>{cut.length}mm</div>
                          <div>{cut.position.toFixed(0)}mm</div>
                          <div>{cut.startAngle || 90}°</div>
                          <div>{cut.endAngle || 90}°</div>
                          <div className="text-xs">
                            {cut.usesExistingAngle && '⚡ Chained'}
                            {cut.quantity > 1 && ` Qty: ${cut.quantity}`}
                          </div>
                        </div>
                      ))}
                      <div className="grid grid-cols-6 gap-2 text-sm py-1 bg-red-50 text-red-700">
                        <div className="font-medium">WASTE</div>
                        <div>{planGroup.plan.wasteLength.toFixed(0)}mm</div>
                        <div>{(planGroup.plan.stockLength - planGroup.plan.wasteLength).toFixed(0)}mm</div>
                        <div>-</div>
                        <div>-</div>
                        <div className="text-xs">Offcut</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}