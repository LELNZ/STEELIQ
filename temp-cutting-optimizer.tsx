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
import { useToast } from "@/hooks/use-toast";
import { SimulationHistoryWorking } from "./simulation-history-working";
import { ComplexCutsConfigurator } from "./complex-cuts-configurator";
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
  const [viewMode, setViewMode] = useState<'detailed' | 'simple'>('detailed');
  const { toast } = useToast();

  // Fetch materials
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Form state
  const [materialCode, setMaterialCode] = useState<string>("");
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "",
    materialType: "",
    startAngle: 90,
    endAngle: 90,
    description: ""
  });

  const [newStock, setNewStock] = useState({
    length: "",
    quantity: "",
    materialType: "",
    cost: ""
  });

  // Group identical plans for display
  const processPlansForDisplay = (plans: CuttingPlan[]) => {
    if (!groupIdenticalPlans) {
      return plans.map(plan => ({ plan, repeatCount: 1 }));
    }

    const planSignatures = new Map<string, number[]>();
    
    plans.forEach((plan, index) => {
      const signature = JSON.stringify({
        stockLength: plan.stockLength,
        cuts: plan.cuts.map(cut => ({
          length: cut.length,
          startAngle: cut.startAngle,
          endAngle: cut.endAngle
        }))
      });
      
      if (!planSignatures.has(signature)) {
        planSignatures.set(signature, []);
      }
      planSignatures.get(signature)!.push(index);
    });

    const grouped: { plan: CuttingPlan, repeatCount: number }[] = [];
    const processedIndexes = new Set<number>();

    planSignatures.forEach((indexes) => {
      if (!processedIndexes.has(indexes[0])) {
        const plan = plans[indexes[0]];
        grouped.push({
          plan,
          repeatCount: indexes.length
        });
        indexes.forEach(idx => processedIndexes.add(idx));
      }
    });

    return grouped;
  };

  // PDF Export Function with both modes
  const exportToPDF = (mode: 'detailed' | 'simple' = 'detailed') => {
    if (!optimizationResult) return;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Lateral Engineering - Cutting Plan', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    doc.text(`View: ${mode === 'detailed' ? 'Detailed Visual' : 'Simple Traditional'}`, 20, yPos + 7);
    yPos += 20;
    
    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Optimization Summary', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Plans: ${optimizationResult.plans.length}`, 20, yPos);
    yPos += 20;
    
    // Plans
    const plansToShow = processPlansForDisplay(optimizationResult.plans);
    
    plansToShow.forEach((planGroup, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Stock #${index + 1}${planGroup.repeatCount > 1 ? ` (Repeat ${planGroup.repeatCount}x)` : ''}`, 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Length: ${planGroup.plan.stockLength}mm | Efficiency: ${planGroup.plan.efficiency.toFixed(1)}%`, 20, yPos);
      yPos += 10;
      
      if (mode === 'detailed') {
        // Detailed view with full cut information
        planGroup.plan.cuts.forEach((cut, cutIndex) => {
          let cutText = `Cut ${cutIndex + 1}: ${cut.length}mm @ ${cut.position.toFixed(0)}mm`;
          if (cut.startAngle !== 90) cutText += ` Start:${cut.startAngle}°`;
          if (cut.endAngle !== 90) cutText += ` End:${cut.endAngle}°`;
          if (cut.usesExistingAngle) cutText += ' [CHAINED]';
          doc.text(cutText, 30, yPos);
          yPos += 6;
        });
      } else {
        // Simple table format
        doc.text('Cut | Length | Position | Start° | End°', 30, yPos);
        yPos += 6;
        planGroup.plan.cuts.forEach((cut, cutIndex) => {
          const simpleText = `${cutIndex + 1} | ${cut.length}mm | ${cut.position.toFixed(0)}mm | ${cut.startAngle || 90}° | ${cut.endAngle || 90}°`;
          doc.text(simpleText, 30, yPos);
          yPos += 5;
        });
      }
      
      yPos += 10;
    });
    
    doc.save(`Cutting-Plan-${mode}-${Date.now()}.pdf`);
    toast({
      title: "PDF Exported",
      description: `${mode === 'detailed' ? 'Detailed' : 'Simple'} cutting plan downloaded successfully.`,
    });
  };

  const addCutRequest = () => {
    if (!newCut.length || !newCut.quantity) return;
    
    const request: CutRequest = {
      id: Date.now().toString(),
      length: parseInt(newCut.length),
      quantity: parseInt(newCut.quantity),
      materialCode: materialCode,
      startAngle: newCut.startAngle,
      endAngle: newCut.endAngle,
      description: newCut.description
    };

    setCutRequests([...cutRequests, request]);
    setNewCut({ ...newCut, length: "", quantity: "", description: "" });
  };

  const addStockItem = () => {
    if (!newStock.length || !newStock.quantity) return;
    
    const stock: StockItem = {
      id: Date.now().toString(),
      length: parseInt(newStock.length),
      quantity: parseInt(newStock.quantity),
      materialCode: materialCode,
      cost: parseFloat(newStock.cost) || 0
    };

    setStockItems([...stockItems, stock]);
    setNewStock({ ...newStock, length: "", quantity: "", cost: "" });
  };

  const runOptimization = async () => {
    if (cutRequests.length === 0 || stockItems.length === 0) return;
    
    setIsOptimizing(true);
    
    try {
      let result: OptimizationResult;
      
      switch (selectedAlgorithm) {
        case "firstFit":
          result = CuttingOptimizer.firstFit(cutRequests, stockItems);
          break;
        case "bestFit":
          result = CuttingOptimizer.bestFit(cutRequests, stockItems);
          break;
        case "worstFit":
          result = CuttingOptimizer.worstFit(cutRequests, stockItems);
          break;
        case "binPacking":
          result = CuttingOptimizer.binPacking(cutRequests, stockItems);
          break;
        default:
          result = CuttingOptimizer.multiAlgorithm(cutRequests, stockItems);
      }
      
      setOptimizationResult(result);
      setIsOptimizing(false);
      
      if (isJobMode) {
        // Handle job creation if needed
      }
    } catch (error) {
      console.error("Optimization error:", error);
      setIsOptimizing(false);
    }
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
              
              <div className="space-y-2">
                <Label>Material</Label>
                <InstantMaterialSearch
                  value={materialCode}
                  onValueChange={setMaterialCode}
                  placeholder="Type to search materials..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Length (mm)</Label>
                  <Input
                    type="number"
                    value={newCut.length}
                    onChange={(e) => setNewCut({ ...newCut, length: e.target.value })}
                    placeholder="1000"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    value={newCut.quantity}
                    onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                    placeholder="1"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={addCutRequest} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Cut
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Angle (°)</Label>
                  <Input
                    type="number"
                    value={newCut.startAngle}
                    onChange={(e) => setNewCut({ ...newCut, startAngle: parseInt(e.target.value) || 90 })}
                    placeholder="90"
                  />
                  <p className="text-xs text-muted-foreground">Left side cut cutting left to right</p>
                </div>
                <div className="space-y-2">
                  <Label>End Angle (°)</Label>
                  <Input
                    type="number"
                    value={newCut.endAngle}
                    onChange={(e) => setNewCut({ ...newCut, endAngle: parseInt(e.target.value) || 90 })}
                    placeholder="90"
                  />
                  <p className="text-xs text-muted-foreground">Right side cut</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Requested Cuts ({cutRequests.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cutRequests.map((request, index) => (
                  <div key={request.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <div>
                      <span className="font-medium">{request.length}mm</span>
                      <span className="text-sm text-muted-foreground ml-2">Qty: {request.quantity}</span>
                      {(request.startAngle !== 90 || request.endAngle !== 90) && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                          {request.startAngle}° → {request.endAngle}°
                        </span>
                      )}
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
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Length (mm)</Label>
                <Input
                  type="number"
                  value={newStock.length}
                  onChange={(e) => setNewStock({ ...newStock, length: e.target.value })}
                  placeholder="6000"
                />
              </div>
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  value={newStock.quantity}
                  onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($/m)</Label>
                <Input
                  type="number"
                  value={newStock.cost}
                  onChange={(e) => setNewStock({ ...newStock, cost: e.target.value })}
                  placeholder="25.60"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={addStockItem} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stock Items ({stockItems.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stockItems.map((stock, index) => (
                  <div key={stock.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <div>
                      <span className="font-medium">{stock.length}mm</span>
                      <span className="text-sm text-muted-foreground ml-2">x{stock.quantity}</span>
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
            </div>

            <Button
              onClick={runOptimization}
              disabled={isOptimizing || cutRequests.length === 0 || stockItems.length === 0}
              className="w-full"
              size="lg"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

      {/* Optimization Results */}
      {optimizationResult && (
        <div className="space-y-6">
          {/* Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Optimization Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {optimizationResult.efficiency.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {optimizationResult.wastePercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Waste</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{optimizationResult.totalMaterialLength}mm</div>
                  <div className="text-sm text-muted-foreground">Total Material Length</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{optimizationResult.totalCuts}</div>
                  <div className="text-sm text-muted-foreground">Total Cuts</div>
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
                    onClick={() => exportToPDF(viewMode)}
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 max-h-96 overflow-y-auto">
              {processPlansForDisplay(optimizationResult.plans).map((planGroup, groupIndex) => (
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
                    <div className="text-right">
                      <Badge variant={planGroup.plan.efficiency > 90 ? "default" : planGroup.plan.efficiency > 75 ? "secondary" : "destructive"} className="text-sm">
                        {planGroup.plan.efficiency.toFixed(1)}% Efficiency
                      </Badge>
                    </div>
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

                  {viewMode === 'detailed' ? (
                    // Detailed Visual View
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

                      {/* Detailed cut list */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Cut Sequence:</h4>
                        <div className="grid gap-2">
                          {planGroup.plan.cuts.map((cut, cutIndex) => {
                            const colors = [
                              'border-blue-500 bg-blue-50',
                              'border-green-500 bg-green-50', 
                              'border-purple-500 bg-purple-50',
                              'border-yellow-500 bg-yellow-50',
                              'border-pink-500 bg-pink-50',
                              'border-cyan-500 bg-cyan-50'
                            ];
                            const cutColor = colors[cutIndex % colors.length];
                            
                            return (
                              <div key={cutIndex} className={`flex justify-between items-center text-sm p-3 border-2 rounded ${cutColor}`}>
                                <div className="flex items-center gap-3">
                                  <div className="font-bold text-lg w-8">#{cutIndex + 1}</div>
                                  <div>
                                    <div className="font-medium">{cut.length}mm piece</div>
                                    <div className="text-xs text-muted-foreground">
                                      Position: {cut.position.toFixed(0)}mm
                                      {cut.startAngle && cut.startAngle !== 90 && ` • Start: ${cut.startAngle}°`}
                                      {cut.endAngle && cut.endAngle !== 90 && ` • End: ${cut.endAngle}°`}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex gap-1">
                                    {cut.usesExistingAngle && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                                        ⚡ Chained
                                      </Badge>
                                    )}
                                    {cut.createsOffcut && (
                                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                                        ↻ Creates offcut
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {cut.quantity} piece{cut.quantity > 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                  ) : (
                    // Simple Traditional View
                    <div className="space-y-3">
                      {/* Simple cut list table */}
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
                        {/* Waste info */}
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
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Remnants */}
          {optimizationResult.remnants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Reusable Remnants ({optimizationResult.remnants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {optimizationResult.remnants.map((remnant, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">{remnant.length.toFixed(0)}mm</span>
                      <Badge variant="secondary">
                        {remnant.materialCode}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}