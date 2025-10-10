import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Scissors, 
  Package, 
  BarChart3, 
  Download, 
  Upload,
  History,
  Settings,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Calculator,
  FileText,
  TrendingUp,
  Zap
} from "lucide-react";
import { optimizeCutting } from "@/lib/simple-cutting-optimizer";
import StandardCuttingPlan from "@/components/optimization/standard-cutting-plan";
import { SimulationHistory } from "@/components/optimization/simulation-history";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CutRequirement {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  firstCutAngle: number;
  secondCutAngle: number;
  description?: string;
  jobNumber?: string;
  kerfWidth?: number;
}

interface StockItem {
  id: string;
  length: number;
  quantity: number;
  materialCode: string;
  isRemnant?: boolean;
  location?: string;
}

export default function OptimizationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("new");
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [cutRequirements, setCutRequirements] = useState<CutRequirement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showAddCutDialog, setShowAddCutDialog] = useState(false);
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  
  // Form state for new cut
  const [newCut, setNewCut] = useState<Partial<CutRequirement>>({
    length: 0,
    quantity: 1,
    firstCutAngle: 90,
    secondCutAngle: 90,
    kerfWidth: 2.4
  });

  // Form state for new stock
  const [newStock, setNewStock] = useState<Partial<StockItem>>({
    length: 6000,
    quantity: 1
  });

  // Fetch jobs for selection
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"]
  });

  // Fetch materials
  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ["/api/materials"]
  });

  // Fetch inventory for stock availability
  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"]
  });

  // Fetch remnants
  const { data: remnants = [] } = useQuery({
    queryKey: ["/api/remnants"]
  });

  // Fetch optimization history
  const { data: optimizationHistory = [] } = useQuery({
    queryKey: ["/api/optimization/history"]
  });

  // Fetch handling times for optimization
  const { data: handlingTimes = {} } = useQuery({
    queryKey: ["/api/settings/operations"],
    select: (data: any) => data?.handlingTimes || {
      light: { total: 2 },
      medium: { total: 3 },
      heavy: { total: 5 },
      crane: { total: 10 }
    }
  });

  // Save optimization mutation
  const saveOptimizationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/optimization/save", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimization/history"] });
      toast({
        title: "Success",
        description: "Optimization saved successfully"
      });
    }
  });

  // Load job requirements
  const loadJobRequirements = (jobId: string) => {
    const job = jobs.find(j => j.id === parseInt(jobId));
    if (job) {
      // In production, this would load actual job requirements
      // For now, we'll show a placeholder
      toast({
        title: "Job Selected",
        description: `Loading requirements for ${job.jobNumber}`
      });
    }
  };

  // Add cut requirement
  const addCutRequirement = () => {
    if (!selectedMaterial || !newCut.length || !newCut.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const material = materials.find(m => m.materialCode === selectedMaterial);
    const cut: CutRequirement = {
      id: `cut-${Date.now()}`,
      length: newCut.length!,
      quantity: newCut.quantity!,
      materialCode: selectedMaterial,
      firstCutAngle: newCut.firstCutAngle || 90,
      secondCutAngle: newCut.secondCutAngle || 90,
      description: newCut.description || `${material?.name || selectedMaterial} - ${newCut.length}mm`,
      kerfWidth: newCut.kerfWidth
    };

    setCutRequirements([...cutRequirements, cut]);
    setNewCut({
      length: 0,
      quantity: 1,
      firstCutAngle: 90,
      secondCutAngle: 90,
      kerfWidth: 2.4
    });
    setShowAddCutDialog(false);
  };

  // Add stock item
  const addStockItem = () => {
    if (!selectedMaterial || !newStock.length || !newStock.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const stock: StockItem = {
      id: `stock-${Date.now()}`,
      length: newStock.length!,
      quantity: newStock.quantity!,
      materialCode: selectedMaterial,
      isRemnant: false,
      location: newStock.location
    };

    setStockItems([...stockItems, stock]);
    setNewStock({
      length: 6000,
      quantity: 1
    });
    setShowAddStockDialog(false);
  };

  // Load available stock from inventory
  const loadInventoryStock = () => {
    const materialStock = inventory.filter(item => 
      item.materialCode === selectedMaterial && item.quantityInStock > 0
    );

    const stockFromInventory = materialStock.map(item => ({
      id: `inv-${item.id}`,
      length: item.standardLength || 6000,
      quantity: Math.floor(item.quantityInStock),
      materialCode: item.materialCode,
      isRemnant: false,
      location: item.location
    }));

    setStockItems(stockFromInventory);
    
    if (stockFromInventory.length > 0) {
      toast({
        title: "Stock Loaded",
        description: `Loaded ${stockFromInventory.length} stock items from inventory`
      });
    }
  };

  // Run optimization
  const runOptimization = () => {
    if (cutRequirements.length === 0 || stockItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add both cut requirements and stock items",
        variant: "destructive"
      });
      return;
    }

    const result = optimizeCutting(cutRequirements, stockItems, handlingTimes);
    setOptimizationResult(result);
    
    // Calculate statistics
    const totalCuts = result.reduce((sum: number, plan: any) => sum + plan.totalCuts, 0);
    const avgEfficiency = result.reduce((sum: number, plan: any) => sum + plan.efficiency, 0) / result.length;
    
    toast({
      title: "Optimization Complete",
      description: `Generated ${result.length} cutting plans with ${avgEfficiency.toFixed(1)}% average efficiency`
    });
  };

  // Clear all data
  const clearAll = () => {
    setCutRequirements([]);
    setStockItems([]);
    setOptimizationResult(null);
    setSelectedJob("");
    setSelectedMaterial("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            Cutting Optimization
          </h1>
          <p className="text-muted-foreground">
            Advanced 1D cutting optimization for steel fabrication with remnant management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button 
            onClick={() => optimizationResult && saveOptimizationMutation.mutate(optimizationResult)}
            disabled={!optimizationResult}
          >
            <Download className="h-4 w-4 mr-2" />
            Save Plan
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            New Optimization
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          {/* Job and Material Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Optimization</CardTitle>
              <CardDescription>Select job and material for optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job (Optional)</Label>
                  <Select value={selectedJob} onValueChange={(value) => {
                    setSelectedJob(value);
                    loadJobRequirements(value);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map(job => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobNumber} - {job.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Material</Label>
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map(material => (
                        <SelectItem key={material.materialCode} value={material.materialCode}>
                          {material.materialCode} - {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedMaterial && (
                <div className="mt-4">
                  <Button variant="outline" onClick={loadInventoryStock}>
                    <Upload className="h-4 w-4 mr-2" />
                    Load Stock from Inventory
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cut Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cut Requirements</span>
                <Button size="sm" onClick={() => setShowAddCutDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cut
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cutRequirements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No cut requirements added. Click "Add Cut" to begin.
                </p>
              ) : (
                <div className="space-y-2">
                  {cutRequirements.map((cut, idx) => (
                    <div key={cut.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <div>
                          <p className="font-medium">{cut.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {cut.length}mm × {cut.quantity} pcs | 
                            Angles: {cut.firstCutAngle}°/{cut.secondCutAngle}°
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setCutRequirements(cutRequirements.filter(c => c.id !== cut.id))}
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
              <CardTitle className="flex items-center justify-between">
                <span>Available Stock</span>
                <Button size="sm" onClick={() => setShowAddStockDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No stock items added. Load from inventory or add manually.
                </p>
              ) : (
                <div className="space-y-2">
                  {stockItems.map((stock, idx) => (
                    <div key={stock.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <div>
                          <p className="font-medium">
                            {stock.materialCode} - {stock.length}mm
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {stock.quantity} | 
                            {stock.isRemnant && " (Remnant)"} 
                            {stock.location && ` Location: ${stock.location}`}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setStockItems(stockItems.filter(s => s.id !== stock.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Run Optimization Button */}
          {cutRequirements.length > 0 && stockItems.length > 0 && (
            <div className="flex justify-center">
              <Button size="lg" onClick={runOptimization} className="px-8">
                <Zap className="h-5 w-5 mr-2" />
                Run Optimization
              </Button>
            </div>
          )}

          {/* Optimization Results */}
          {optimizationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Results</CardTitle>
              </CardHeader>
              <CardContent>
                <StandardCuttingPlan 
                  plans={optimizationResult}
                  materialCode={selectedMaterial}
                  jobNumber={selectedJob ? jobs.find(j => j.id === parseInt(selectedJob))?.jobNumber : undefined}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <SimulationHistory />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Settings</CardTitle>
              <CardDescription>Configure default parameters for cutting optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Kerf Width (mm)</Label>
                  <Input type="number" defaultValue="2.4" />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Remnant Length (mm)</Label>
                  <Input type="number" defaultValue="300" />
                </div>
                <div className="space-y-2">
                  <Label>Optimization Strategy</Label>
                  <Select defaultValue="efficiency">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efficiency">Maximum Efficiency</SelectItem>
                      <SelectItem value="minimal_waste">Minimal Waste</SelectItem>
                      <SelectItem value="minimal_bars">Minimal Stock Usage</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Include Remnants</Label>
                  <Select defaultValue="yes">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="preferred">Preferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Optimization settings affect how cutting plans are generated. 
                  Changes here will apply to all new optimizations.
                </AlertDescription>
              </Alert>

              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Cut Dialog */}
      <Dialog open={showAddCutDialog} onOpenChange={setShowAddCutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cut Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Length (mm)</Label>
              <Input 
                type="number" 
                value={newCut.length} 
                onChange={(e) => setNewCut({...newCut, length: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                value={newCut.quantity} 
                onChange={(e) => setNewCut({...newCut, quantity: parseInt(e.target.value)})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Cut Angle (°)</Label>
                <Input 
                  type="number" 
                  value={newCut.firstCutAngle} 
                  onChange={(e) => setNewCut({...newCut, firstCutAngle: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Second Cut Angle (°)</Label>
                <Input 
                  type="number" 
                  value={newCut.secondCutAngle} 
                  onChange={(e) => setNewCut({...newCut, secondCutAngle: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kerf Width (mm)</Label>
              <Input 
                type="number" 
                value={newCut.kerfWidth} 
                onChange={(e) => setNewCut({...newCut, kerfWidth: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input 
                value={newCut.description} 
                onChange={(e) => setNewCut({...newCut, description: e.target.value})}
                placeholder="e.g., Column C1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddCutDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addCutRequirement}>Add Cut</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={showAddStockDialog} onOpenChange={setShowAddStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stock Length (mm)</Label>
              <Input 
                type="number" 
                value={newStock.length} 
                onChange={(e) => setNewStock({...newStock, length: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity Available</Label>
              <Input 
                type="number" 
                value={newStock.quantity} 
                onChange={(e) => setNewStock({...newStock, quantity: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <Input 
                value={newStock.location} 
                onChange={(e) => setNewStock({...newStock, location: e.target.value})}
                placeholder="e.g., Rack A-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddStockDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addStockItem}>Add Stock</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}