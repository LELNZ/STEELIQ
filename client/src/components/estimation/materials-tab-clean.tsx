import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  DollarSign,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SupplierPriceRefresh } from "./supplier-price-refresh";
import { LaborStandardsCalculator } from "./labor-standards-calculator";
import AddOperationDialog from "./add-operation-dialog";

interface MaterialCost {
  id: string;
  materialId?: number;
  materialCode: string;
  materialName: string;
  section?: string; // Steel section (e.g., "UB 457x152x52")
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
  // Surface area and weight for coating integration
  surfaceAreaPerMeter?: number;
  weightPerMeter?: number;
  totalSurfaceArea?: number;
  totalWeight?: number;
  // STRUMIS-style designation and assembly tracking
  designation?: string; // e.g., "C1", "B2", "PF1"
  drawingReference?: string; // Drawing sheet reference
  assemblyMark?: string; // Assembly mark for fabrication
  phase?: string; // Construction phase
  level?: string; // Building level/floor
  gridLine?: string; // Grid reference (e.g., "A-1")
  sequenceNumber?: number; // Sequence for ordering
  // Child items for connections and accessories
  childItems?: MaterialChildItem[];
  parentId?: string; // If this is a child item
  isExpanded?: boolean; // For UI tree view
}

interface MaterialChildItem {
  id: string;
  type: 'stiffener' | 'endplate' | 'baseplate' | 'cleat' | 'bolt' | 'weld' | 'other';
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  thickness?: number; // For plates
  size?: string; // For bolts, cleats
  length?: number; // For welds
  notes?: string;
  weldTime?: number; // Weld time from library component (minutes)
  libraryComponentId?: number; // Track which library component was used
}

interface MaterialsTabProps {
  materials: MaterialCost[];
  availableMaterials: any[];
  onUpdate: (materials: MaterialCost[]) => void;
  onLaborUpdate?: (laborItems: any[]) => void;
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

// Import MTO Dialog Component
interface ImportMTODialogProps {
  projectId?: number;
  onImport: (materials: MaterialCost[]) => void;
}

function ImportMTODialog({ projectId, onImport }: ImportMTODialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch drawing projects
  const { data: drawingProjects = [], isLoading: isLoadingProjects, error: projectsError } = useQuery({
    queryKey: ['/api/drawing-projects'],
    enabled: isOpen
  });
  
  // Fetch drawings for selected project
  const { data: drawings = [], isLoading: isLoadingDrawings, error: drawingsError } = useQuery({
    queryKey: [`/api/drawings/${selectedProjectId}`],
    enabled: !!selectedProjectId && isOpen
  });
  
  // Fetch material takeoffs for selected drawing
  const { data: takeoffs = [], isLoading: isLoadingTakeoffs, error: takeoffsError } = useQuery({
    queryKey: [`/api/material-takeoffs/${selectedDrawingId}`],
    enabled: !!selectedDrawingId && isOpen
  });
  
  const handleImport = async () => {
    if (!selectedDrawingId) {
      toast({
        title: "Selection Required",
        description: "Please select a drawing to import materials from",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch detailed material takeoffs for the selected drawing
      const takeoffsData = await apiRequest(`/api/material-takeoffs/drawing/${selectedDrawingId}`, 'GET');
      
      // Transform takeoff data to MaterialCost format
      const importedMaterials: MaterialCost[] = takeoffsData.map((takeoff: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        materialCode: takeoff.mark || "",
        materialName: takeoff.section || `Material ${takeoff.mark}`,
        designation: `${takeoff.mark} - ${takeoff.section}`,
        drawingReference: takeoff.drawingRef || `Drawing Ref`,
        quantity: parseFloat(takeoff.quantity) || 1,
        unit: "EA",
        unitCost: parseFloat(takeoff.unitPrice) || 0,
        totalCost: parseFloat(takeoff.totalPrice) || 0,
        wasteFactor: parseFloat(takeoff.wastage) || 5,
        totalWeight: parseFloat(takeoff.weight) || 0,
        phase: takeoff.phase || "",
        handlingTime: 0,
        handlingCost: 0,
        notes: `Grade: ${takeoff.grade || 'N/A'}, Phase: ${takeoff.phase || 'N/A'}`,
        aiSuggested: false
      }));
      
      onImport(importedMaterials);
      setIsOpen(false);
      setSelectedProjectId("");
      setSelectedDrawingId("");
    } catch (error) {
      console.error("Error importing MTO:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import materials from takeoff",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetSelections = () => {
    setSelectedProjectId("");
    setSelectedDrawingId("");
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetSelections();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Import from MTO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Materials from Takeoff</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project">Select Drawing Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Choose a project..."} />
              </SelectTrigger>
              <SelectContent>
                {projectsError ? (
                  <SelectItem value="error" disabled>Error loading projects</SelectItem>
                ) : drawingProjects.length === 0 ? (
                  <SelectItem value="none" disabled>No projects available</SelectItem>
                ) : (
                  drawingProjects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedProjectId && (
            <div className="space-y-2">
              <Label htmlFor="drawing">Select Drawing</Label>
              <Select value={selectedDrawingId} onValueChange={setSelectedDrawingId} disabled={isLoadingDrawings}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDrawings ? "Loading drawings..." : "Choose a drawing..."} />
                </SelectTrigger>
                <SelectContent>
                  {drawingsError ? (
                    <SelectItem value="error" disabled>Error loading drawings</SelectItem>
                  ) : drawings.length === 0 ? (
                    <SelectItem value="none" disabled>No drawings available</SelectItem>
                  ) : (
                    drawings.map((drawing: any) => (
                      <SelectItem key={drawing.id} value={drawing.id.toString()}>
                        {drawing.fileName} {drawing.revisionNumber && `(Rev: ${drawing.revisionNumber})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {selectedDrawingId && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="text-sm">
                {isLoadingTakeoffs ? (
                  <p className="text-muted-foreground">Loading material takeoffs...</p>
                ) : takeoffsError ? (
                  <p className="text-destructive">Error loading takeoffs</p>
                ) : takeoffs.length === 0 ? (
                  <p className="text-muted-foreground">No material takeoffs found for this drawing</p>
                ) : (
                  <>
                    <p className="font-medium mb-2">Preview: {takeoffs.length} materials found</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {takeoffs.slice(0, 3).map((takeoff: any, index: number) => (
                        <li key={index}>
                          • {takeoff.mark}: {takeoff.section} - {takeoff.quantity} units
                        </li>
                      ))}
                      {takeoffs.length > 3 && (
                        <li>... and {takeoffs.length - 3} more</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!selectedDrawingId || isLoading}>
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import Materials
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaterialsTab({ materials, availableMaterials, onUpdate, onLaborUpdate, projectId }: MaterialsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialCost | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<MaterialCost[]>([]);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [addChildItemMaterialId, setAddChildItemMaterialId] = useState<string | null>(null);
  
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
          // Update surface area and weight totals for coating integration
          updated.totalSurfaceArea = updated.quantity * (updated.surfaceAreaPerMeter || 0);
          updated.totalWeight = updated.quantity * (updated.weightPerMeter || 0);
          
          // Add child items total if any
          if (updated.childItems && updated.childItems.length > 0) {
            const childTotal = updated.childItems.reduce((sum, child) => sum + child.totalCost, 0);
            updated.totalCost += childTotal;
          }
        }
        return updated;
      }
      return material;
    });
    onUpdate(updatedMaterials);
  };

  // Toggle expanded state for materials with child items
  const toggleMaterialExpanded = (id: string) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === id) {
        return { ...material, isExpanded: !material.isExpanded };
      }
      return material;
    });
    onUpdate(updatedMaterials);
  };

  // Add child item to a material
  const addChildItem = (materialId: string) => {
    setAddChildItemMaterialId(materialId);
    setIsAddChildDialogOpen(true);
  };

  // Handle operation submission from new dialog
  const handleAddOperation = (operation: any) => {
    const materialId = addChildItemMaterialId;
    if (!materialId) {
      console.error('No material ID set for adding operation');
      return;
    }
    
    console.log('Adding operation to material:', materialId, operation);

    // Create child item from operation
    const newChildItem: MaterialChildItem = {
      id: `op-${Date.now()}`,
      type: operation.type as MaterialChildItem['type'],
      description: operation.description,
      quantity: operation.quantity,
      unit: operation.unit,
      unitCost: operation.unitCost,
      totalCost: operation.totalCost,
      thickness: operation.thickness,
      size: operation.size,
      length: operation.length,
      notes: operation.notes,
      weldTime: operation.weldTime,
      libraryComponentId: operation.libraryComponentId
    };

    const updatedMaterials = materials.map(material => {
      if (material.id === materialId) {
        const currentChildItems = material.childItems || [];
        const updated = { 
          ...material, 
          childItems: [...currentChildItems, newChildItem],
          isExpanded: true
        };
        
        // Recalculate total including child items
        const adjustedQuantity = updated.quantity * (1 + updated.wasteFactor / 100);
        updated.totalCost = adjustedQuantity * updated.unitCost + updated.handlingCost;
        const childTotal = updated.childItems.reduce((sum, child) => sum + child.totalCost, 0);
        updated.totalCost += childTotal;
        
        return updated;
      }
      return material;
    });

    onUpdate(updatedMaterials);

    // Route to appropriate tabs
    if (operation.includeInLabor && onLaborUpdate) {
      const laborRate = operation.laborLocation === 'site' ? 120 : 85;
      const laborHours = operation.laborHours || 0;
      // Map location to labor category
      const laborCategory = operation.laborLocation === 'site' ? 'onsite' : 'workshop';
      
      onLaborUpdate([{
        id: `labor-${Date.now()}`,
        operationId: newChildItem.id,
        description: operation.description,
        hours: laborHours,
        location: operation.laborLocation,
        skillLevel: operation.skillLevel,
        rate: laborRate,
        totalCost: laborHours * laborRate, // Calculate totalCost
        parentMaterialId: materialId,
        category: laborCategory, // Use mapped category
        subcategory: operation.type || 'fabrication', // Add subcategory
        notes: operation.notes
      }]);
    }

    // Handle consumables routing
    if (operation.consumablesData && operation.consumablesData.length > 0) {
      // This would be sent to consumables tab
      console.log('Routing consumables:', operation.consumablesData);
    }

    toast({
      title: "Operation Added",
      description: `${operation.description} added successfully`
    });
    
    setIsAddChildDialogOpen(false);
    setAddChildItemMaterialId(null);
  };
  
  // Legacy handler for backward compatibility
  const handleAddChildItem = (childData: Partial<MaterialChildItem>) => {
    if (!addChildItemMaterialId) return;

    const newChildItem: MaterialChildItem = {
      id: Date.now().toString(),
      type: childData.type || 'stiffener',
      description: childData.description || '',
      quantity: childData.quantity || 1,
      unit: childData.unit || 'ea',
      unitCost: childData.unitCost || 0,
      totalCost: (childData.quantity || 1) * (childData.unitCost || 0),
      thickness: childData.thickness,
      size: childData.size,
      length: childData.length,
      notes: childData.notes || '',
      weldTime: (childData as any).weldTime, // Include weld time from library component
      libraryComponentId: (childData as any).libraryComponentId // Track library component source
    };

    const updatedMaterials = materials.map(material => {
      if (material.id === addChildItemMaterialId) {
        const childItems = material.childItems || [];
        const updated = { 
          ...material, 
          childItems: [...childItems, newChildItem],
          isExpanded: true 
        };
        
        // Recalculate total including child items
        const adjustedQuantity = updated.quantity * (1 + updated.wasteFactor / 100);
        updated.totalCost = adjustedQuantity * updated.unitCost + updated.handlingCost;
        const childTotal = updated.childItems.reduce((sum, child) => sum + child.totalCost, 0);
        updated.totalCost += childTotal;
        
        return updated;
      }
      return material;
    });
    onUpdate(updatedMaterials);
    setIsAddChildDialogOpen(false);
    setAddChildItemMaterialId(null);
  };

  // Update child item
  const updateChildItem = (materialId: string, childId: string, updates: Partial<MaterialChildItem>) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === materialId && material.childItems) {
        const updatedChildItems = material.childItems.map(child => {
          if (child.id === childId) {
            const updatedChild = { ...child, ...updates };
            updatedChild.totalCost = updatedChild.quantity * updatedChild.unitCost;
            return updatedChild;
          }
          return child;
        });
        
        const updated = { ...material, childItems: updatedChildItems };
        
        // Recalculate total including child items
        const adjustedQuantity = updated.quantity * (1 + updated.wasteFactor / 100);
        updated.totalCost = adjustedQuantity * updated.unitCost + updated.handlingCost;
        const childTotal = updatedChildItems.reduce((sum, child) => sum + child.totalCost, 0);
        updated.totalCost += childTotal;
        
        return updated;
      }
      return material;
    });
    onUpdate(updatedMaterials);
  };

  // Remove child item
  const removeChildItem = (materialId: string, childId: string) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === materialId && material.childItems) {
        const updatedChildItems = material.childItems.filter(child => child.id !== childId);
        const updated = { ...material, childItems: updatedChildItems };
        
        // Recalculate total
        const adjustedQuantity = updated.quantity * (1 + updated.wasteFactor / 100);
        updated.totalCost = adjustedQuantity * updated.unitCost + updated.handlingCost;
        const childTotal = updatedChildItems.reduce((sum, child) => sum + child.totalCost, 0);
        updated.totalCost += childTotal;
        
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

  // Handle importing materials from MTO
  const handleImportMTO = (importedMaterials: MaterialCost[]) => {
    // Filter out empty placeholder materials (those with no materialCode and no totalCost)
    const nonEmptyMaterials = materials.filter(m => 
      m.materialCode || m.materialName || m.totalCost > 0
    );
    
    // Replace empty materials with imported ones, or append if all existing materials have content
    const updatedMaterials = nonEmptyMaterials.length === materials.length 
      ? [...materials, ...importedMaterials]  // All existing have content, append
      : [...nonEmptyMaterials, ...importedMaterials]; // Replace empty ones
    
    onUpdate(updatedMaterials);
    
    toast({
      title: "MTO Import Successful",
      description: `Imported ${importedMaterials.length} materials from takeoff`,
    });
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
          <ImportMTODialog 
            projectId={projectId}
            onImport={handleImportMTO}
          />
          <SupplierPriceRefresh
            materials={materials}
            onPricesUpdate={onUpdate}
          />
          {onLaborUpdate && (
            <LaborStandardsCalculator
              materials={materials}
              onLaborUpdate={onLaborUpdate}
            />
          )}
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
                <TooltipContent className="max-w-[300px] p-3 bg-popover text-popover-foreground border shadow-md">
                  <p className="text-sm leading-relaxed">Steel materials, sections, and raw materials required for the project.</p>
                  <p className="text-sm leading-relaxed mt-1">Includes quantities, unit costs, waste factors, and handling costs.</p>
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
                  <tr className="border-b text-sm">
                    <th className="text-left p-2">Material</th>
                    <th className="text-left p-2">Designation</th>
                    <th className="text-left p-2">Drawing Ref</th>
                    <th className="text-left p-2">Quantity</th>
                    <th className="text-left p-2">Unit Cost</th>
                    <th className="text-left p-2">Waste %</th>
                    <th className="text-left p-2">Total Cost</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.filter(m => !m.parentId).map((material) => (
                    <React.Fragment key={material.id}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {material.childItems && material.childItems.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleMaterialExpanded(material.id)}
                              >
                                {material.isExpanded ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                              </Button>
                            )}
                            <div className="flex-1">
                              <MaterialSearch
                                value={material.materialName}
                                onChange={(value) => updateMaterialField(material.id, 'materialName', value)}
                                onSelect={(selectedMaterial) => handleMaterialSelect(material.id, selectedMaterial)}
                                availableMaterials={availableMaterials}
                                placeholder="Search materials..."
                                className="min-w-[200px]"
                              />
                              <div className="text-xs text-gray-500 mt-1">{material.materialCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <Input
                            value={material.designation || ''}
                            onChange={(e) => updateMaterialField(material.id, 'designation', e.target.value)}
                            placeholder="C1, B2..."
                            className="w-20 text-sm"
                            title="Member designation (e.g., C1 for Column 1, B2 for Beam 2)"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={material.drawingReference || ''}
                            onChange={(e) => updateMaterialField(material.id, 'drawingReference', e.target.value)}
                            placeholder="S-101"
                            className="w-24 text-sm"
                            title="Drawing sheet reference"
                          />
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
                          ${(material.totalCost || 0).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addChildItem(material.id)}
                                    title="Add Operation"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add stiffener, end plate, or connection detail</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                      {/* Child Items */}
                      {material.isExpanded && material.childItems?.map((child) => (
                        <tr key={child.id} className="bg-gray-50 border-b">
                          <td className="p-2 pl-12">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {child.type}
                              </Badge>
                              <span className="text-sm">{child.description}</span>
                            </div>
                          </td>
                          <td className="p-2" colSpan={2}>
                            {child.size && <span className="text-xs text-gray-600">Size: {child.size}</span>}
                            {child.thickness && <span className="text-xs text-gray-600">Thickness: {child.thickness}mm</span>}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={child.quantity}
                              onChange={(e) => updateChildItem(material.id, child.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-20 h-8"
                            />
                            <div className="text-xs text-gray-500">{child.unit}</div>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={child.unitCost}
                              onChange={(e) => updateChildItem(material.id, child.id, { unitCost: parseFloat(e.target.value) || 0 })}
                              className="w-24 h-8"
                            />
                          </td>
                          <td className="p-2">-</td>
                          <td className="p-2 font-medium">
                            ${(child.totalCost || 0).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChildItem(material.id, child.id)}
                              className="h-8"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
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

      {/* Add Operation Dialog */}
      <AddOperationDialog
        open={isAddChildDialogOpen}
        onOpenChange={setIsAddChildDialogOpen}
        onSubmit={handleAddOperation}
        parentMaterial={materials.find(m => m.id === addChildItemMaterialId)}
        estimationId={projectId || 0}
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
    notes: "",
    designation: "",
    drawingReference: "",
    assemblyMark: "",
    phase: "",
    sequenceNumber: undefined as number | undefined,
    gridLine: ""
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
      notes: formData.notes,
      designation: formData.designation,
      drawingReference: formData.drawingReference,
      assemblyMark: formData.assemblyMark,
      phase: formData.phase,
      sequenceNumber: formData.sequenceNumber,
      gridLine: formData.gridLine
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

      {/* Fortune 500/STRUMIS Fields */}
      <div className="space-y-4">
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-4 text-muted-foreground">Drawing Reference Fields</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="designation">
                Designation
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="inline ml-1 h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Element reference from drawings (e.g., B1, C2, S3)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="designation"
                value={formData.designation || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="e.g., B1, C2"
              />
            </div>

            <div>
              <Label htmlFor="drawingReference">
                Drawing Ref
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="inline ml-1 h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Drawing number where this item appears</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="drawingReference"
                value={formData.drawingReference || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, drawingReference: e.target.value }))}
                placeholder="e.g., S-101, A-201"
              />
            </div>

            <div>
              <Label htmlFor="assemblyMark">
                Assembly Mark
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="inline ml-1 h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Unique identifier for fabrication tracking</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="assemblyMark"
                value={formData.assemblyMark || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assemblyMark: e.target.value }))}
                placeholder="e.g., A101, B202"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="phase">
                Phase
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="inline ml-1 h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Construction phase (e.g., Phase 1, Foundation)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="phase"
                value={formData.phase || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                placeholder="e.g., Phase 1"
              />
            </div>

            <div>
              <Label htmlFor="sequenceNumber">
                Sequence
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="inline ml-1 h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Erection sequence number</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="sequenceNumber"
                type="number"
                value={formData.sequenceNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sequenceNumber: parseInt(e.target.value) || undefined }))}
                placeholder="e.g., 10, 20"
              />
            </div>

            <div>
              <Label htmlFor="gridLine">
                Grid Line
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="inline ml-1 h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Grid line reference (e.g., A-1, B-2)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="gridLine"
                value={formData.gridLine || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, gridLine: e.target.value }))}
                placeholder="e.g., A-1, B-2"
              />
            </div>
          </div>
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

// Edit Material Dialog Component
function EditMaterialDialog({ 
  material, 
  open, 
  onOpenChange, 
  onSave,
  availableMaterials 
}: {
  material: MaterialCost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<MaterialCost>) => void;
  availableMaterials: any[];
}) {
  const [formData, setFormData] = useState<Partial<MaterialCost>>({});

  useEffect(() => {
    if (material) {
      setFormData({ ...material });
    }
  }, [material]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Material</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-material-name">Material Name</Label>
              <Input
                id="edit-material-name"
                value={formData.materialName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, materialName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-material-code">Material Code</Label>
              <Input
                id="edit-material-code"
                value={formData.materialCode || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, materialCode: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                step="0.01"
                value={formData.quantity || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-unit-cost">Unit Cost ($)</Label>
              <Input
                id="edit-unit-cost"
                type="number"
                step="0.01"
                value={formData.unitCost || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-waste-factor">Waste %</Label>
              <Input
                id="edit-waste-factor"
                type="number"
                value={formData.wasteFactor || 5}
                onChange={(e) => setFormData(prev => ({ ...prev, wasteFactor: parseFloat(e.target.value) || 5 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-supplier">Supplier</Label>
              <Input
                id="edit-supplier"
                value={formData.supplier || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-handling-cost">Handling Cost ($)</Label>
              <Input
                id="edit-handling-cost"
                type="number"
                step="0.01"
                value={formData.handlingCost || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, handlingCost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Fortune 500/STRUMIS Fields */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-4 text-muted-foreground">Drawing Reference Fields</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={formData.designation || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g., B1, C2"
                />
              </div>
              <div>
                <Label htmlFor="edit-drawing-ref">Drawing Ref</Label>
                <Input
                  id="edit-drawing-ref"
                  value={formData.drawingReference || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, drawingReference: e.target.value }))}
                  placeholder="e.g., S-101"
                />
              </div>
              <div>
                <Label htmlFor="edit-assembly-mark">Assembly Mark</Label>
                <Input
                  id="edit-assembly-mark"
                  value={formData.assemblyMark || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assemblyMark: e.target.value }))}
                  placeholder="e.g., A101"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="edit-phase">Phase</Label>
                <Input
                  id="edit-phase"
                  value={formData.phase || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                  placeholder="e.g., Phase 1"
                />
              </div>
              <div>
                <Label htmlFor="edit-sequence">Sequence</Label>
                <Input
                  id="edit-sequence"
                  type="number"
                  value={formData.sequenceNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sequenceNumber: parseInt(e.target.value) || undefined }))}
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <Label htmlFor="edit-grid-line">Grid Line</Label>
                <Input
                  id="edit-grid-line"
                  value={formData.gridLine || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gridLine: e.target.value }))}
                  placeholder="e.g., A-1"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Child Item Form Component
function AddChildItemForm({ onSubmit, parentSection }: { 
  onSubmit: (data: Partial<MaterialChildItem>) => void;
  parentSection?: string;
}) {
  const [useLibrary, setUseLibrary] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<any>(null);
  const [libraryComponents, setLibraryComponents] = useState<any[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'stiffener' as MaterialChildItem['type'],
    description: '',
    quantity: 1,
    unit: 'ea',
    unitCost: 0,
    thickness: undefined as number | undefined,
    size: '',
    length: undefined as number | undefined,
    notes: '',
    weldTime: undefined as number | undefined // Add weld time for labor calculations
  });

  const connectionTypes = [
    { value: 'stiffener', label: 'Stiffener', fields: ['thickness', 'size'] },
    { value: 'endplate', label: 'End Plate', fields: ['thickness', 'size'] },
    { value: 'baseplate', label: 'Base Plate', fields: ['thickness', 'size'] },
    { value: 'cleat', label: 'Cleat', fields: ['size', 'thickness'] },
    { value: 'bolt', label: 'Bolts', fields: ['size'] },
    { value: 'weld', label: 'Welding', fields: ['length'] },
    { value: 'other', label: 'Other', fields: [] }
  ];

  const selectedType = connectionTypes.find(t => t.value === formData.type);

  // Load library components when type changes and library mode is active
  React.useEffect(() => {
    if (useLibrary && formData.type) {
      loadLibraryComponents();
    }
  }, [useLibrary, formData.type]);

  const loadLibraryComponents = async () => {
    setIsLoadingComponents(true);
    try {
      // Extract section from parent (e.g., "UB 457x152x52" -> "UB")
      const sectionType = parentSection?.split(' ')[0] || 'all';
      const response = await fetch(
        `/api/connection-components/search/${sectionType}?type=${formData.type}`
      );
      if (response.ok) {
        const components = await response.json();
        setLibraryComponents(components);
      }
    } catch (error) {
      console.error('Error loading library components:', error);
    } finally {
      setIsLoadingComponents(false);
    }
  };

  // Auto-populate fields when a library component is selected
  const handleLibrarySelection = (componentId: string) => {
    const component = libraryComponents.find(c => c.id.toString() === componentId);
    if (component) {
      setSelectedComponent(component);
      
      // Build size string from height and width
      let sizeStr = '';
      if (component.width && component.height) {
        sizeStr = `${component.width}x${component.height}`;
      } else if (component.width) {
        sizeStr = `${component.width}`;
      } else if (component.height) {
        sizeStr = `${component.height}`;
      }
      
      // Auto-populate form fields based on component data
      setFormData(prev => ({
        ...prev,
        description: component.name,
        thickness: component.thickness ? parseFloat(component.thickness) : undefined,
        size: sizeStr,
        unitCost: component.material_cost ? parseFloat(component.material_cost) : 0,
        notes: component.specification || '',
        weldTime: component.weld_time_per_hour ? parseFloat(component.weld_time_per_hour) * 60 : undefined // Convert hours to minutes
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Include weld time data in submission for labor calculations
    onSubmit({
      ...formData,
      libraryComponentId: selectedComponent?.id
    });
    // Reset form
    setFormData({
      type: 'stiffener',
      description: '',
      quantity: 1,
      unit: 'ea',
      unitCost: 0,
      thickness: undefined,
      size: '',
      length: undefined,
      notes: '',
      weldTime: undefined
    });
    setSelectedComponent(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Toggle between Manual Entry and Library Selection */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="space-y-0.5">
          <Label>Use Connection Library</Label>
          <p className="text-sm text-muted-foreground">
            Select from verified industry-standard components
          </p>
        </div>
        <Switch
          checked={useLibrary}
          onCheckedChange={(checked) => {
            setUseLibrary(checked);
            if (!checked) {
              setSelectedComponent(null);
              setLibraryComponents([]);
            }
          }}
        />
      </div>

      <div>
        <Label htmlFor="child-type">Connection Type</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => {
            setFormData(prev => ({ ...prev, type: value as any }));
            setSelectedComponent(null); // Clear selection when type changes
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {connectionTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Library Component Selection (when enabled) */}
      {useLibrary && (
        <div>
          <Label htmlFor="library-component">Select from Library</Label>
          {isLoadingComponents ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <span className="text-sm text-muted-foreground">Loading components...</span>
            </div>
          ) : libraryComponents.length > 0 ? (
            <Select 
              value={selectedComponent?.id?.toString() || ''} 
              onValueChange={handleLibrarySelection}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a component from library" />
              </SelectTrigger>
              <SelectContent>
                {libraryComponents.map(comp => (
                  <SelectItem key={comp.id} value={comp.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{comp.name}</span>
                      {comp.specifications && (
                        <span className="text-xs text-muted-foreground">{comp.specifications}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground p-3 border rounded-lg">
              No library components available for {selectedType?.label} in this section
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="child-description">Description</Label>
        <Input
          id="child-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={
            formData.type === 'stiffener' ? 'e.g., Web Stiffener 150x10' :
            formData.type === 'endplate' ? 'e.g., End Plate 200x200x16' :
            formData.type === 'baseplate' ? 'e.g., Base Plate 400x400x25' :
            formData.type === 'cleat' ? 'e.g., Angle Cleat 100x100x10' :
            formData.type === 'bolt' ? 'e.g., M20 Grade 8.8' :
            formData.type === 'weld' ? 'e.g., 6mm Fillet Weld' :
            'Description'
          }
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="child-quantity">Quantity</Label>
          <Input
            id="child-quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>
        
        <div>
          <Label htmlFor="child-unit">Unit</Label>
          <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ea">Each</SelectItem>
              <SelectItem value="m">Meters</SelectItem>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="set">Set</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="child-unit-cost">Unit Cost ($)</Label>
          <Input
            id="child-unit-cost"
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {/* Dynamic fields based on type */}
      {selectedType && (
        <div className="grid grid-cols-2 gap-4">
          {selectedType.fields.includes('thickness') && (
            <div>
              <Label htmlFor="child-thickness">Thickness (mm)</Label>
              <Input
                id="child-thickness"
                type="number"
                value={formData.thickness || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, thickness: parseFloat(e.target.value) || undefined }))}
                placeholder="e.g., 10"
              />
            </div>
          )}
          
          {selectedType.fields.includes('size') && (
            <div>
              <Label htmlFor="child-size">Size</Label>
              <Input
                id="child-size"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                placeholder={
                  formData.type === 'bolt' ? 'e.g., M20x60' :
                  formData.type === 'cleat' ? 'e.g., 100x100x10' :
                  'e.g., 150x150'
                }
              />
            </div>
          )}
          
          {selectedType.fields.includes('length') && (
            <div>
              <Label htmlFor="child-length">Weld Length (mm)</Label>
              <Input
                id="child-length"
                type="number"
                value={formData.length || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, length: parseFloat(e.target.value) || undefined }))}
                placeholder="Total length"
              />
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="child-notes">Notes</Label>
        <Textarea
          id="child-notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="Additional details or specifications"
        />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Total Cost: ${(formData.quantity * formData.unitCost).toFixed(2)}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Add Connection Detail</Button>
      </div>
    </form>
  );
}