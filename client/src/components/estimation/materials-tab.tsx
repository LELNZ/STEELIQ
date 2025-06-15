import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calculator, 
  Clock, 
  Package,
  AlertCircle,
  TrendingUp,
  Zap,
  Search,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MaterialCost {
  id: string;
  materialId?: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  wasteFactor: number;
  handlingTime: number;
  handlingCost: number;
  supplier?: string;
  leadTime?: number;
  notes?: string;
  aiSuggested?: boolean;
}

interface MaterialsTabProps {
  materials: MaterialCost[];
  availableMaterials: any[];
  onUpdate: (materials: MaterialCost[]) => void;
  projectId?: number;
}

export function MaterialsTab({ materials, availableMaterials, onUpdate, projectId }: MaterialsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialCost | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<MaterialCost[]>([]);
  

  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate handling time and cost based on material weight
  const calculateHandlingCost = (material: any, quantity: number) => {
    if (!material || !material.weightPerMeter) return { time: 0, cost: 0 };
    
    const totalWeight = parseFloat(material.weightPerMeter) * quantity;
    let handlingTimeMinutes = 0;
    let hourlyRate = 45; // Base handling rate per hour

    // Material handling categories based on weight
    if (totalWeight > 40) {
      // Crane required (40.01kg+)
      handlingTimeMinutes = 10; // 5min loading + 5min unloading
      hourlyRate = 85; // Crane operator rate
    } else if (totalWeight > 20) {
      // Heavy manual lift (20.01-40kg)
      handlingTimeMinutes = 5; // 3min loading + 2min unloading
      hourlyRate = 55; // Two-person team rate
    } else if (totalWeight > 5) {
      // Medium lift (5.01-20kg)
      handlingTimeMinutes = 3; // 2min loading + 1min unloading
      hourlyRate = 50; // Standard rate
    } else {
      // Light lift (0-5kg)
      handlingTimeMinutes = 1; // 0.5min loading + 0.5min unloading
      hourlyRate = 45; // Single person rate
    }

    const handlingCost = (handlingTimeMinutes / 60) * hourlyRate;
    return { time: handlingTimeMinutes, cost: handlingCost };
  };

  // AI-assisted material cost estimation
  const aiEstimateMutation = useMutation({
    mutationFn: async (materialData: any) => {
      return await apiRequest("POST", "/api/ai/estimate-material", {
        material: materialData,
        historicalData: true,
        marketTrends: true
      });
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions || []);
      setShowAiSuggestions(true);
      toast({
        title: "AI Cost Analysis Complete",
        description: `Found ${data.suggestions?.length || 0} cost optimization suggestions`,
      });
    }
  });

  // Update individual material field for inline editing
  const updateMaterialField = (materialId: string, field: keyof MaterialCost, value: any) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === materialId) {
        return { ...material, [field]: value };
      }
      return material;
    });
    onUpdate(updatedMaterials);
  };

  // Recalculate material total cost
  const recalculateMaterial = (materialId: string) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === materialId) {
        const adjustedQuantity = material.quantity * (1 + material.wasteFactor / 100);
        const newTotalCost = adjustedQuantity * material.unitCost + material.handlingCost;
        return { ...material, totalCost: newTotalCost };
      }
      return material;
    });
    onUpdate(updatedMaterials);
  };

  // Add new material to estimation
  const addMaterial = (materialData: Partial<MaterialCost>) => {
    const newMaterial: MaterialCost = {
      id: Date.now().toString(),
      materialCode: materialData.materialCode || "",
      materialName: materialData.materialName || "",
      quantity: materialData.quantity || 0,
      unit: materialData.unit || "m",
      unitCost: materialData.unitCost || 0,
      totalCost: 0,
      wasteFactor: materialData.wasteFactor || 5,
      handlingTime: materialData.handlingTime || 0,
      handlingCost: materialData.handlingCost || 0,
      supplier: materialData.supplier,
      leadTime: materialData.leadTime,
      notes: materialData.notes,
      ...materialData
    };

    // Calculate totals with waste factor
    const adjustedQuantity = newMaterial.quantity * (1 + newMaterial.wasteFactor / 100);
    newMaterial.totalCost = adjustedQuantity * newMaterial.unitCost + newMaterial.handlingCost;

    const updatedMaterials = [...materials, newMaterial];
    onUpdate(updatedMaterials);
    setIsAddDialogOpen(false);
  };

  // Update existing material
  const updateMaterial = (materialData: Partial<MaterialCost>) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === editingMaterial?.id) {
        const updated = { ...material, ...materialData };
        const adjustedQuantity = updated.quantity * (1 + updated.wasteFactor / 100);
        updated.totalCost = adjustedQuantity * updated.unitCost + updated.handlingCost;
        return updated;
      }
      return material;
    });
    onUpdate(updatedMaterials);
    setIsEditDialogOpen(false);
    setEditingMaterial(null);
  };

  // Remove material from estimation
  const removeMaterial = (materialId: string) => {
    const updatedMaterials = materials.filter(material => material.id !== materialId);
    onUpdate(updatedMaterials);
  };

  // Apply AI suggestion
  const applyAiSuggestion = (suggestion: MaterialCost) => {
    addMaterial({ ...suggestion, aiSuggested: true });
    toast({
      title: "AI Suggestion Applied",
      description: `Added ${suggestion.materialName} with optimized pricing`,
    });
  };



  const totalMaterialCost = materials.reduce((sum, material) => sum + material.totalCost, 0);
  const totalHandlingTime = materials.reduce((sum, material) => sum + material.handlingTime, 0);
  const totalHandlingCost = materials.reduce((sum, material) => sum + material.handlingCost, 0);

  return (
    <div className="space-y-6">
      {/* Materials Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Materials</p>
                <p className="text-2xl font-bold">${totalMaterialCost.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Material Items</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
              <Calculator className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Handling Time</p>
                <p className="text-2xl font-bold">{totalHandlingTime}min</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Handling Cost</p>
                <p className="text-2xl font-bold">${totalHandlingCost.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions Panel */}
      {showAiSuggestions && aiSuggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Zap className="h-5 w-5 mr-2" />
              AI Cost Optimization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{suggestion.materialName}</p>
                    <p className="text-sm text-muted-foreground">
                      ${suggestion.unitCost}/m - {suggestion.supplier} - {suggestion.leadTime} days
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => applyAiSuggestion(suggestion)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Add Material to Estimation</DialogTitle>
              </DialogHeader>
              <AddMaterialForm 
                availableMaterials={availableMaterials}
                onSubmit={addMaterial}
                calculateHandlingCost={calculateHandlingCost}
              />
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            onClick={() => aiEstimateMutation.mutate({ materials })}
            disabled={aiEstimateMutation.isPending}
          >
            <Zap className="h-4 w-4 mr-2" />
            AI Cost Analysis
          </Button>
        </div>
      </div>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Material Cost Breakdown
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Steel materials, sections, and raw materials required for the project.<br/>
                  Includes quantities, unit costs, waste factors, and handling costs.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No materials added yet</p>
              <p className="text-sm">Click "Add Material" to start building your estimation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Waste %</TableHead>
                  <TableHead>Handling</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>
                      <div>
                        <Input
                          value={material.materialName}
                          onChange={(e) => updateMaterialField(material.id, 'materialName', e.target.value)}
                          className="font-medium border-0 px-1 py-0 min-w-40 h-6"
                        />
                        {material.supplier && (
                          <Input
                            value={material.supplier || ''}
                            onChange={(e) => updateMaterialField(material.id, 'supplier', e.target.value)}
                            placeholder="Supplier"
                            className="text-sm text-muted-foreground border-0 px-1 py-0 mt-1 h-5"
                          />
                        )}
                        {material.aiSuggested && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            <Zap className="h-3 w-3 mr-1" />
                            AI Optimized
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={material.materialCode}
                        onChange={(e) => updateMaterialField(material.id, 'materialCode', e.target.value)}
                        className="font-mono text-sm w-24 border-0 px-1 py-0 h-6"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => {
                            const newQuantity = parseFloat(e.target.value) || 0;
                            updateMaterialField(material.id, 'quantity', newQuantity);
                            recalculateMaterial(material.id);
                          }}
                          className="w-20 border-0 px-1 py-0 h-6"
                        />
                        <Input
                          value={material.unit || 'm'}
                          onChange={(e) => updateMaterialField(material.id, 'unit', e.target.value)}
                          className="w-12 border-0 px-1 py-0 h-6"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={material.unitCost}
                        onChange={(e) => {
                          const newUnitCost = parseFloat(e.target.value) || 0;
                          updateMaterialField(material.id, 'unitCost', newUnitCost);
                          recalculateMaterial(material.id);
                        }}
                        className="w-24 border-0 px-1 py-0 h-6"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={material.wasteFactor}
                        onChange={(e) => {
                          const newWasteFactor = parseFloat(e.target.value) || 0;
                          updateMaterialField(material.id, 'wasteFactor', newWasteFactor);
                          recalculateMaterial(material.id);
                        }}
                        className="w-16 border-0 px-1 py-0 h-6"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={material.handlingTime}
                            onChange={(e) => {
                              const newTime = parseFloat(e.target.value) || 0;
                              updateMaterialField(material.id, 'handlingTime', newTime);
                              recalculateMaterial(material.id);
                            }}
                            className="w-16 border-0 px-1 py-0 text-xs h-5"
                          />
                          <span className="text-xs">min</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={material.handlingCost}
                          onChange={(e) => {
                            const newCost = parseFloat(e.target.value) || 0;
                            updateMaterialField(material.id, 'handlingCost', newCost);
                            recalculateMaterial(material.id);
                          }}
                          className="w-20 border-0 px-1 py-0 text-xs text-muted-foreground h-5"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">${material.totalCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => recalculateMaterial(material.id)}
                          title="Recalculate total"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMaterial(material.id)}
                          title="Remove material"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Material Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <EditMaterialForm
              material={editingMaterial}
              availableMaterials={availableMaterials}
              onSubmit={updateMaterial}
              calculateHandlingCost={calculateHandlingCost}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Material Form Component
function AddMaterialForm({ 
  availableMaterials, 
  onSubmit, 
  calculateHandlingCost 
}: {
  availableMaterials: any[];
  onSubmit: (data: Partial<MaterialCost>) => void;
  calculateHandlingCost: (material: any, quantity: number) => { time: number; cost: number };
}) {
  const [formData, setFormData] = useState({
    materialId: "",
    materialCode: "",
    materialName: "",
    quantity: "",
    unit: "m",
    unitCost: "",
    wasteFactor: "5",
    supplier: "",
    leadTime: "",
    notes: ""
  });

  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [handlingCalc, setHandlingCalc] = useState({ time: 0, cost: 0 });
  const [searchValue, setSearchValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredMaterials, setFilteredMaterials] = useState<any[]>([]);

  useEffect(() => {
    if (selectedMaterial && formData.quantity) {
      const calc = calculateHandlingCost(selectedMaterial, parseFloat(formData.quantity));
      setHandlingCalc(calc);
    }
  }, [selectedMaterial, formData.quantity, calculateHandlingCost]);

  // Filter materials based on search input
  useEffect(() => {
    if (!searchValue) {
      setFilteredMaterials([]);
      setShowDropdown(false);
    } else {
      const filtered = availableMaterials.filter(material =>
        material.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        material.code.toLowerCase().includes(searchValue.toLowerCase())
      ).slice(0, 10); // Limit to 10 results like Google
      setFilteredMaterials(filtered);
      setShowDropdown(filtered.length > 0);
    }
  }, [searchValue, availableMaterials]);

  const handleMaterialSelect = (material: any) => {
    setSelectedMaterial(material);
    setSearchValue(`${material.code} - ${material.name}`);
    setShowDropdown(false);
    setFormData(prev => ({
      ...prev,
      materialId: material.id.toString(),
      materialCode: material.code,
      materialName: material.name,
      unit: "m" // Default to meters for steel
    }));
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Clear selected material if user is typing a new search
    if (selectedMaterial && !value.includes(selectedMaterial.code)) {
      setSelectedMaterial(null);
      setFormData(prev => ({
        ...prev,
        materialId: "",
        materialCode: "",
        materialName: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      materialId: formData.materialId ? parseInt(formData.materialId) : undefined,
      materialCode: formData.materialCode,
      materialName: formData.materialName,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      unitCost: parseFloat(formData.unitCost),
      wasteFactor: parseFloat(formData.wasteFactor),
      handlingTime: handlingCalc.time,
      handlingCost: handlingCalc.cost,
      supplier: formData.supplier,
      leadTime: formData.leadTime ? parseInt(formData.leadTime) : undefined,
      notes: formData.notes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="material">Material Code</Label>
          <div className="relative">
            <Input
              id="material"
              placeholder="Type to search materials..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchValue && setShowDropdown(filteredMaterials.length > 0)}
              className="pr-8"
            />
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            
            {/* Google-style dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredMaterials.map((material, index) => (
                  <div
                    key={material.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleMaterialSelect(material)}
                  >
                    <div className="font-medium text-sm">{material.code}</div>
                    <div className="text-xs text-gray-600">{material.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="customMaterial">Or Enter Custom</Label>
          <Input
            id="customMaterial"
            placeholder="Custom material name"
            value={formData.materialName}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              materialName: e.target.value,
              materialCode: e.target.value.toUpperCase().replace(/\s+/g, '')
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="unit">Unit</Label>
          <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="m">Meters</SelectItem>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="pcs">Pieces</SelectItem>
              <SelectItem value="sqm">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unitCost">Unit Cost ($)</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="wasteFactor">Waste Factor (%)</Label>
          <Input
            id="wasteFactor"
            type="number"
            step="0.1"
            value={formData.wasteFactor}
            onChange={(e) => setFormData(prev => ({ ...prev, wasteFactor: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
            placeholder="Supplier name"
          />
        </div>

        <div>
          <Label htmlFor="leadTime">Lead Time (days)</Label>
          <Input
            id="leadTime"
            type="number"
            value={formData.leadTime}
            onChange={(e) => setFormData(prev => ({ ...prev, leadTime: e.target.value }))}
          />
        </div>
      </div>

      {/* Handling Cost Preview */}
      {handlingCalc.time > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">Auto-calculated Handling</p>
                <p className="text-sm text-blue-600">
                  {handlingCalc.time} minutes • ${handlingCalc.cost.toFixed(2)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit">Add Material</Button>
      </div>
    </form>
  );
}

// Edit Material Form Component
function EditMaterialForm({ 
  material, 
  availableMaterials, 
  onSubmit, 
  calculateHandlingCost 
}: {
  material: MaterialCost;
  availableMaterials: any[];
  onSubmit: (data: Partial<MaterialCost>) => void;
  calculateHandlingCost: (material: any, quantity: number) => { time: number; cost: number };
}) {
  const [formData, setFormData] = useState({
    materialCode: material.materialCode,
    materialName: material.materialName,
    quantity: material.quantity.toString(),
    unit: material.unit,
    unitCost: material.unitCost.toString(),
    wasteFactor: material.wasteFactor.toString(),
    supplier: material.supplier || "",
    leadTime: material.leadTime?.toString() || "",
    notes: material.notes || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      materialCode: formData.materialCode,
      materialName: formData.materialName,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      unitCost: parseFloat(formData.unitCost),
      wasteFactor: parseFloat(formData.wasteFactor),
      supplier: formData.supplier,
      leadTime: formData.leadTime ? parseInt(formData.leadTime) : undefined,
      notes: formData.notes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="materialCode">Material Code</Label>
          <Input
            id="materialCode"
            value={formData.materialCode}
            onChange={(e) => setFormData(prev => ({ ...prev, materialCode: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="materialName">Material Name</Label>
          <Input
            id="materialName"
            value={formData.materialName}
            onChange={(e) => setFormData(prev => ({ ...prev, materialName: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="unit">Unit</Label>
          <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="m">Meters</SelectItem>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="pcs">Pieces</SelectItem>
              <SelectItem value="sqm">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unitCost">Unit Cost ($)</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="wasteFactor">Waste Factor (%)</Label>
          <Input
            id="wasteFactor"
            type="number"
            step="0.1"
            value={formData.wasteFactor}
            onChange={(e) => setFormData(prev => ({ ...prev, wasteFactor: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="leadTime">Lead Time (days)</Label>
          <Input
            id="leadTime"
            type="number"
            value={formData.leadTime}
            onChange={(e) => setFormData(prev => ({ ...prev, leadTime: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit">Update Material</Button>
      </div>
    </form>
  );
}