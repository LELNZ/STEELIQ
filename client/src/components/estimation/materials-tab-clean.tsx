import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Package, 
  Plus, 
  Trash2, 
  Calculator, 
  Clock, 
  Zap, 
  Search,
  Info,
  Edit2,
  DollarSign
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

// Google-style Material Search Component
interface MaterialSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (material: any) => void;
  availableMaterials: any[];
  placeholder?: string;
  className?: string;
}

function MaterialSearch({ value, onChange, onSelect, availableMaterials, placeholder, className }: MaterialSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter materials based on search text (max 5 items)
  const filteredMaterials = availableMaterials.filter(material => {
    if (!searchText) return false;
    const searchLower = searchText.toLowerCase();
    return (
      material.code?.toLowerCase().includes(searchLower) ||
      material.name?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search text when value changes externally
  useEffect(() => {
    setSearchText(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchText(newValue);
    onChange(newValue);
    setIsOpen(newValue.length > 0);
  };

  const handleMaterialSelect = (material: any) => {
    const displayValue = `${material.code} - ${material.name}`;
    setSearchText(displayValue);
    onChange(displayValue);
    setIsOpen(false);
    onSelect(material);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchText}
          onChange={handleInputChange}
          onFocus={() => searchText && setIsOpen(filteredMaterials.length > 0)}
          placeholder={placeholder}
          className="pr-8"
        />
        <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Google-style dropdown */}
      {isOpen && filteredMaterials.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredMaterials.map((material) => (
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
  );
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
    
    const weightKg = material.weightPerMeter * quantity;
    const timeMinutes = Math.max(5, Math.ceil(weightKg * 0.5)); // 0.5 min per kg, minimum 5 min
    const cost = timeMinutes * 0.5; // $0.50 per minute handling
    
    return { time: timeMinutes, cost };
  };

  // Add new material to estimation
  const addMaterial = (materialData: Partial<MaterialCost>) => {
    const newMaterial: MaterialCost = {
      id: Date.now().toString(),
      materialId: materialData.materialId,
      materialCode: materialData.materialCode || "",
      materialName: materialData.materialName || "",
      quantity: materialData.quantity || 1,
      unit: materialData.unit || "m",
      unitCost: materialData.unitCost || 0,
      wasteFactor: materialData.wasteFactor || 5,
      handlingTime: materialData.handlingTime || 0,
      handlingCost: materialData.handlingCost || 0,
      supplier: materialData.supplier || "",
      leadTime: materialData.leadTime,
      notes: materialData.notes,
      totalCost: 0,
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

  // Update material field inline
  const updateMaterialField = (id: string, field: keyof MaterialCost, value: any) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === id) {
        const updated = { ...material, [field]: value };
        // Recalculate totals if quantity, unitCost, or wasteFactor changed
        if (['quantity', 'unitCost', 'wasteFactor', 'handlingCost'].includes(field)) {
          const adjustedQuantity = updated.quantity * (1 + updated.wasteFactor / 100);
          updated.totalCost = adjustedQuantity * updated.unitCost + updated.handlingCost;
        }
        return updated;
      }
      return material;
    });
    onUpdate(updatedMaterials);
  };

  // Handle material selection from search dropdown
  const handleMaterialSelect = (materialId: string, selectedMaterial: any) => {
    updateMaterialField(materialId, 'materialName', selectedMaterial.name);
    updateMaterialField(materialId, 'materialCode', selectedMaterial.code);
    updateMaterialField(materialId, 'materialId', selectedMaterial.id);
    
    // Auto-populate fields from material database
    if (selectedMaterial.pricePerKg) {
      updateMaterialField(materialId, 'unitCost', selectedMaterial.pricePerKg);
    }
    if (selectedMaterial.supplier) {
      updateMaterialField(materialId, 'supplier', selectedMaterial.supplier);
    }
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
                <p className="text-2xl font-bold">${totalHandlingCost.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Material Cost Breakdown</h3>
        <div className="flex gap-2">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Material</th>
                    <th className="text-left p-2">Quantity</th>
                    <th className="text-left p-2">Unit Cost</th>
                    <th className="text-left p-2">Waste %</th>
                    <th className="text-left p-2">Total Cost</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => (
                    <tr key={material.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <MaterialSearch
                          value={material.materialName}
                          onChange={(value) => updateMaterialField(material.id, 'materialName', value)}
                          onSelect={(selectedMaterial) => handleMaterialSelect(material.id, selectedMaterial)}
                          availableMaterials={availableMaterials}
                          placeholder="Search materials..."
                          className="min-w-[200px]"
                        />
                        <div className="text-xs text-gray-500 mt-1">{material.materialCode}</div>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateMaterialField(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={material.unitCost}
                          onChange={(e) => updateMaterialField(material.id, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={material.wasteFactor}
                          onChange={(e) => updateMaterialField(material.id, 'wasteFactor', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </td>
                      <td className="p-2 font-medium">
                        ${material.totalCost.toLocaleString()}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingMaterial(material);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Material Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
          </DialogHeader>
          <AddMaterialForm
            availableMaterials={availableMaterials}
            onSubmit={addMaterial}
            calculateHandlingCost={calculateHandlingCost}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <EditMaterialDialog
        material={editingMaterial}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={updateMaterial}
        availableMaterials={availableMaterials}
      />
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
  onSubmit: (data: any) => void;
  calculateHandlingCost: (material: any, quantity: number) => { time: number; cost: number };
}) {
  const [formData, setFormData] = useState({
    materialId: "",
    materialCode: "",
    materialName: "",
    quantity: "1",
    unit: "m",
    unitCost: "",
    wasteFactor: "5",
    supplier: "",
    leadTime: "",
    notes: ""
  });

  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [handlingCalc, setHandlingCalc] = useState({ time: 0, cost: 0 });

  useEffect(() => {
    if (selectedMaterial && formData.quantity) {
      const calc = calculateHandlingCost(selectedMaterial, parseFloat(formData.quantity));
      setHandlingCalc(calc);
    }
  }, [selectedMaterial, formData.quantity, calculateHandlingCost]);

  const handleMaterialSelect = (material: any) => {
    setSelectedMaterial(material);
    setFormData(prev => ({
      ...prev,
      materialId: material.id.toString(),
      materialCode: material.code,
      materialName: material.name,
      unitCost: material.pricePerKg ? material.pricePerKg.toString() : "",
      supplier: material.supplier || "",
      unit: "m" // Default to meters for steel
    }));
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
          <MaterialSearch
            value={formData.materialName}
            onChange={(value) => setFormData(prev => ({ ...prev, materialName: value }))}
            onSelect={handleMaterialSelect}
            availableMaterials={availableMaterials}
            placeholder="Type to search materials..."
          />
        </div>

        <div>
          <Label htmlFor="customMaterial">Or Enter Custom</Label>
          <Input
            id="customMaterial"
            placeholder="Custom material name"
            value={formData.materialName}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, materialName: e.target.value }));
              setSelectedMaterial(null);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="wasteFactor">Waste Factor (%)</Label>
          <Input
            id="wasteFactor"
            type="number"
            value={formData.wasteFactor}
            onChange={(e) => setFormData(prev => ({ ...prev, wasteFactor: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
            placeholder="Material supplier"
          />
        </div>
      </div>

      {handlingCalc.time > 0 && (
        <div className="bg-blue-50 p-3 rounded-md">
          <p className="text-sm text-blue-800">
            Estimated handling: {handlingCalc.time} minutes (${handlingCalc.cost.toFixed(2)})
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes or specifications"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Add Material</Button>
      </div>
    </form>
  );
}