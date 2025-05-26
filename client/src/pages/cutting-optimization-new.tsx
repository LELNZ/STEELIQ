import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scissors, Plus, Trash2, Play, Zap } from "lucide-react";
import StandardCuttingPlan from "@/components/optimization/standard-cutting-plan";

interface CutRequirement {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  startAngle?: number;
  endAngle?: number;
  description?: string;
}

interface StockItem {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
}

// Mock optimization function - will be replaced with real algorithm
const runOptimization = (cuts: CutRequirement[], stock: StockItem[]) => {
  // Generate mock cutting plans using our StandardCuttingPlan format
  return [
    {
      stockLength: 6000,
      cuts: [
        {
          id: "cut-1",
          length: 1200,
          position: 0,
          startAngle: 90,
          endAngle: 45,
          description: "Main beam section",
          quantity: 2,
          cuttingInstructions: "Mark with job number after cutting"
        },
        {
          id: "cut-2",
          length: 800,
          position: 1220,
          startAngle: 45,
          endAngle: 90,
          description: "Angled brace",
          quantity: 1,
          cuttingInstructions: "Drill 10mm hole at 200mm from left end"
        },
        {
          id: "cut-3",
          length: 1500,
          position: 2040,
          startAngle: 90,
          endAngle: 90,
          description: "Standard length piece",
          quantity: 1
        }
      ],
      wasteLength: 1240,
      efficiency: 79.3,
      totalCuts: 4,
      materialType: "Universal Beam",
      materialGrade: "AS/NZS 3678-350",
      instructions: {
        general: "Deburr all edges after cutting",
        cuttingMethod: "Bandsaw - standard setup",
        heatNumber: "H12345-2024",
        millCertNumber: "MC-789456"
      }
    },
    {
      stockLength: 8000,
      cuts: [
        {
          id: "cut-4",
          length: 2000,
          position: 0,
          startAngle: 90,
          endAngle: 30,
          description: "Complex angled cut",
          quantity: 1,
          cuttingInstructions: "Check angles with protractor before cutting"
        },
        {
          id: "cut-5",
          length: 1000,
          position: 2020,
          startAngle: 30,
          endAngle: 60,
          description: "Complex angled piece",
          quantity: 1,
          cuttingInstructions: "Complex angled cut"
        }
      ],
      wasteLength: 4960,
      efficiency: 37.8,
      totalCuts: 2,
      materialType: "Universal Beam",
      materialGrade: "AS/NZS 3678-350",
      instructions: {
        general: "Use cutting fluid for all cuts",
        cuttingMethod: "Bandsaw - standard setup",
        heatNumber: "H67890-2024",
        millCertNumber: "MC-123789"
      }
    }
  ];
};

export default function CuttingOptimizationNew() {
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // New cut requirement form
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialCode: "",
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
        description: newCut.description,
        startAngle: 90,
        endAngle: 90
      };
      setCutRequirements([...cutRequirements, cutRequirement]);
      setNewCut({ length: "", quantity: "1", materialCode: "", description: "" });
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
    
    // Simulate optimization processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results = runOptimization(cutRequirements, stockItems);
    setOptimizationResult(results);
    setIsOptimizing(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Steel Cutting Optimization</h1>
          <p className="text-muted-foreground">
            Professional workshop cutting plans with detailed specifications and traceability
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
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
                      <Input
                        id="cut-material"
                        value={newCut.materialCode}
                        onChange={(e) => setNewCut({ ...newCut, materialCode: e.target.value })}
                        placeholder="UB200x100"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cut-description">Description (Optional)</Label>
                    <Input
                      id="cut-description"
                      value={newCut.description}
                      onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                      placeholder="Main beam section"
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
                    <div key={cut.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{cut.materialCode}</Badge>
                        <span className="font-medium">{cut.length}mm</span>
                        <span className="text-sm text-muted-foreground">× {cut.quantity}</span>
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

            {/* Stock Items */}
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
                      <Input
                        id="stock-material"
                        value={newStock.materialCode}
                        onChange={(e) => setNewStock({ ...newStock, materialCode: e.target.value })}
                        placeholder="UB200x100"
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
                    <div key={stock.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-3">
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
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {optimizationResult ? (
              <StandardCuttingPlan 
                plans={optimizationResult}
                materialCode={cutRequirements[0]?.materialCode || 'MIXED'}
                jobNumber={`JOB-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Optimize</h3>
                  <p className="text-muted-foreground">
                    Add your cut requirements and available stock, then generate your professional cutting plan.
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