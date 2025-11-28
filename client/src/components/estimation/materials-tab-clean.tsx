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
import OperationsManager from "./operations-manager";

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
  // Length tracking for accurate calculations
  length?: number; // Individual piece length (default 6.0m)
  lengthUnit?: string; // Unit of measurement (m, mm, ft)
  totalLength?: number; // quantity × length
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
  type: 'stiffener' | 'endplate' | 'baseplate' | 'cleat' | 'bolt' | 'weld' | 'cutting' | 'drilling' | 'welding' | 'grinding' | 'punching' | 'coping' | 'notching' | 'other';
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
  operationOrchestrator?: any; // Fortune 50 compliant orchestrator for database operations
  onLaborUpdate?: (laborItems: any[]) => void;
  onConsumablesUpdate?: (consumableItems: any[]) => void;
  onLaborDelete?: (operationId: string) => void;
  onConsumablesDelete?: (operationId: string) => void;
  onQuantityChange?: (operationId: string, newQuantity: number, oldQuantity: number) => void;
  onMaterialAreaWeightChange?: (totalSurfaceArea: number, totalWeight: number) => void;
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
      
      // Transform takeoff data to MaterialCost format WITHOUT mock IDs
      // Parent component will handle saving to database and assigning real IDs
      const importedMaterials: Partial<MaterialCost>[] = takeoffsData.map((takeoff: any) => ({
        // NO ID HERE - will be assigned by database after save
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
      
      onImport(importedMaterials as MaterialCost[]);
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

// Helper function to map operation types to consumable categories
const getCategoryFromType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'drill_bits': 'cutting_tools',
    'drill bits': 'cutting_tools',
    'coolant': 'chemicals',
    'disc': 'cutting_tools',
    'wire': 'welding',
    'gas': 'welding',
    'contact_tips': 'welding',
    'contact tips': 'welding',
    'grit': 'abrasives',
    'paint': 'chemicals',
    'thinner': 'chemicals'
  };
  return typeMap[type.toLowerCase()] || 'general';
};

// Helper function to determine equipment needed for an operation
const determineEquipmentForOperation = (operationType: string, method?: string): any[] => {
  const equipment: any[] = [];
  
  switch (operationType) {
    case 'cutting':
      if (method === 'plasma') {
        equipment.push({ type: 'Plasma Cutter', category: 'cutting', rate: 180 });
      } else if (method === 'laser') {
        equipment.push({ type: 'Laser Cutter', category: 'cutting', rate: 250 });
      } else if (method === 'bandsaw') {
        equipment.push({ type: 'Bandsaw', category: 'cutting', rate: 120 });
      } else if (method === 'oxy') {
        equipment.push({ type: 'Oxy-Acetylene Set', category: 'cutting', rate: 100 });
      }
      break;
      
    case 'drilling':
      if (method === 'mag_drill') {
        equipment.push({ type: 'Magnetic Drill', category: 'drilling', rate: 150 });
      } else if (method === 'hand_drill') {
        equipment.push({ type: 'Hand Drill', category: 'drilling', rate: 50 });
      } else {
        equipment.push({ type: 'Drill Press', category: 'drilling', rate: 100 });
      }
      break;
      
    case 'welding':
    case 'weld':
      equipment.push({ type: 'MIG Welder', category: 'welding', rate: 150 });
      equipment.push({ type: 'Welding Positioner', category: 'welding', rate: 80 });
      break;
      
    case 'grinding':
      equipment.push({ type: 'Angle Grinder', category: 'grinding', rate: 60 });
      break;
      
    case 'blasting':
      equipment.push({ type: 'Sandblaster', category: 'surface_treatment', rate: 200 });
      break;
      
    case 'painting':
      equipment.push({ type: 'Spray Booth', category: 'surface_treatment', rate: 150 });
      equipment.push({ type: 'Paint Gun', category: 'surface_treatment', rate: 50 });
      break;
      
    case 'lifting':
      equipment.push({ type: 'Crane', category: 'material_handling', rate: 300 });
      break;
  }
  
  return equipment;
};

export function MaterialsTab({ materials, availableMaterials, onUpdate, operationOrchestrator, onLaborUpdate, onConsumablesUpdate, onLaborDelete, onConsumablesDelete, onQuantityChange, onMaterialAreaWeightChange, projectId }: MaterialsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialCost | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<MaterialCost[]>([]);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [addChildItemMaterialId, setAddChildItemMaterialId] = useState<string | null>(null);
  const [isOperationsManagerOpen, setIsOperationsManagerOpen] = useState(false);
  const [selectedMaterialForOperations, setSelectedMaterialForOperations] = useState<MaterialCost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load materials from database on mount
  useEffect(() => {
    if (projectId) {
      loadMaterialsFromDatabase();
    }
  }, [projectId]);

  const loadMaterialsFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/estimation/materials/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Transform database materials to MaterialCost format
        const transformedMaterials = data.map((dbMat: any) => ({
          id: dbMat.id, // Use actual database ID
          materialId: dbMat.material_id,
          materialCode: dbMat.material_code,
          materialName: dbMat.material_name,
          designation: dbMat.designation,
          drawingReference: dbMat.drawing_ref,
          assemblyMark: dbMat.assembly_mark,
          phase: dbMat.phase,
          sequence: dbMat.sequence,
          gridLine: dbMat.grid_line,
          length: parseFloat(dbMat.length) || 6.0,
          quantity: parseFloat(dbMat.quantity) || 1,
          unit: dbMat.unit || "m",
          unitCost: parseFloat(dbMat.unit_cost) || 0,
          totalCost: parseFloat(dbMat.total_cost) || 0,
          wasteFactor: parseFloat(dbMat.waste_factor) || 5,
          handlingCost: parseFloat(dbMat.handling_cost) || 0,
          supplier: dbMat.supplier,
          leadTime: dbMat.lead_time,
          notes: dbMat.notes,
          weight: dbMat.weight ? parseFloat(dbMat.weight) : undefined,
          weightPerMeter: dbMat.weight_per_meter ? parseFloat(dbMat.weight_per_meter) : undefined,
          width: dbMat.width ? parseFloat(dbMat.width) : undefined,
          height: dbMat.height ? parseFloat(dbMat.height) : undefined,
          thickness: dbMat.thickness ? parseFloat(dbMat.thickness) : undefined,
          surfaceArea: dbMat.surface_area ? parseFloat(dbMat.surface_area) : undefined,
          childItems: []
        }));
        
        onUpdate(transformedMaterials);
      }
    } catch (error) {
      console.error("Error loading materials from database:", error);
      toast({
        title: "Error",
        description: "Failed to load materials from database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate handling time and cost based on material weight
  const calculateHandlingCost = (material: any, quantity: number) => {
    if (!material || !material.weightPerMeter) return { time: 0, cost: 0 };
    
    const weightKg = material.weightPerMeter * quantity;
    const timeMinutes = Math.max(5, Math.ceil(weightKg * 0.5)); // 0.5 min per kg, minimum 5 min
    const cost = timeMinutes * 0.5; // $0.50 per minute handling
    
    return { time: timeMinutes, cost };
  };

  // Generate material designation based on material code
  const generateMaterialDesignation = (materialCode: string, existingDesignations: string[]): string => {
    // Extract type from material code
    let prefix = 'M'; // Default for unknown types
    
    if (materialCode.includes('UC')) prefix = 'C';  // Column
    else if (materialCode.includes('UB')) prefix = 'B';  // Beam
    else if (materialCode.includes('PFC')) prefix = 'CH'; // Channel
    else if (materialCode.includes('PLATE')) prefix = 'PL'; // Plate
    else if (materialCode.includes('SHS')) prefix = 'SHS'; // Square Hollow
    else if (materialCode.includes('RHS')) prefix = 'RHS'; // Rectangular Hollow
    else if (materialCode.includes('CHS')) prefix = 'CHS'; // Circular Hollow
    else if (materialCode.includes('ROD')) prefix = 'R';   // Rod
    else if (materialCode.includes('ANGLE')) prefix = 'L'; // Angle
    else if (materialCode.includes('FLAT')) prefix = 'FL'; // Flat Bar
    
    // Find next available number
    let counter = 1;
    while (existingDesignations.includes(`${prefix}${counter}`)) {
      counter++;
    }
    
    return `${prefix}${counter}`;
  };

  // Add new material to estimation
  const addMaterial = async (materialData: Partial<MaterialCost>) => {
    // Get existing designations
    const existingDesignations = materials.map(m => m.designation).filter(Boolean) as string[];
    
    // Generate designation if not provided
    const designation = materialData.designation || 
      generateMaterialDesignation(materialData.materialCode || '', existingDesignations);
    
    // Calculate totals with waste factor
    const quantity = materialData.quantity || 1;
    const unitCost = materialData.unitCost || 0;
    const wasteFactor = materialData.wasteFactor || 5;
    const handlingCost = materialData.handlingCost || 0;
    const adjustedQuantity = quantity * (1 + wasteFactor / 100);
    const totalCost = adjustedQuantity * unitCost + handlingCost;
    const totalLength = (materialData.length || 6.0) * quantity;

    try {
      // Save to database first
      const response = await fetch('/api/estimation/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          materialId: materialData.materialId,
          materialCode: materialData.materialCode || "",
          materialName: materialData.materialName || "",
          designation,
          drawingRef: materialData.drawingReference,
          assemblyMark: materialData.assemblyMark,
          phase: materialData.phase,
          sequence: materialData.sequenceNumber?.toString(),
          gridLine: materialData.gridLine,
          quantity,
          unit: materialData.unit || "m",
          unitCost,
          totalCost,
          wasteFactor,
          handlingCost,
          supplier: materialData.supplier || "",
          leadTime: materialData.leadTime,
          notes: materialData.notes,
          length: materialData.length || 6.0,
          width: materialData.width,
          height: materialData.height,
          thickness: materialData.thickness,
          weight: materialData.weight,
          weightPerMeter: materialData.weightPerMeter,
          surfaceArea: materialData.surfaceArea
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save material to database');
      }

      const savedMaterial = await response.json();
      
      // Create MaterialCost object with database ID
      const newMaterial: MaterialCost = {
        id: savedMaterial.id, // Use database ID
        materialId: savedMaterial.material_id,
        materialCode: savedMaterial.material_code,
        materialName: savedMaterial.material_name,
        designation: savedMaterial.designation,
        drawingReference: savedMaterial.drawing_ref,
        assemblyMark: savedMaterial.assembly_mark,
        phase: savedMaterial.phase,
        sequence: savedMaterial.sequence,
        gridLine: savedMaterial.grid_line,
        length: parseFloat(savedMaterial.length) || 6.0,
        lengthUnit: 'm',
        quantity: parseFloat(savedMaterial.quantity) || 1,
        unit: savedMaterial.unit || "m",
        unitCost: parseFloat(savedMaterial.unit_cost) || 0,
        totalCost: parseFloat(savedMaterial.total_cost) || 0,
        totalLength,
        wasteFactor: parseFloat(savedMaterial.waste_factor) || 5,
        handlingTime: materialData.handlingTime || 0,
        handlingCost: parseFloat(savedMaterial.handling_cost) || 0,
        supplier: savedMaterial.supplier || "",
        leadTime: savedMaterial.lead_time,
        notes: savedMaterial.notes,
        weight: savedMaterial.weight ? parseFloat(savedMaterial.weight) : undefined,
        weightPerMeter: savedMaterial.weight_per_meter ? parseFloat(savedMaterial.weight_per_meter) : undefined,
        width: savedMaterial.width ? parseFloat(savedMaterial.width) : undefined,
        height: savedMaterial.height ? parseFloat(savedMaterial.height) : undefined,
        thickness: savedMaterial.thickness ? parseFloat(savedMaterial.thickness) : undefined,
        surfaceArea: savedMaterial.surface_area ? parseFloat(savedMaterial.surface_area) : undefined,
        childItems: []
      };

      const updatedMaterials = [...materials, newMaterial];
      onUpdate(updatedMaterials);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Material added successfully",
      });
    } catch (error) {
      console.error("Error adding material:", error);
      toast({
        title: "Error",
        description: "Failed to add material",
        variant: "destructive"
      });
    }
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
  const updateMaterialField = async (id: string | number, field: keyof MaterialCost, value: any) => {
    // Track old quantity for parent material quantity changes
    let oldQuantity = 0;
    let materialId = '';
    
    const updatedMaterials = materials.map(material => {
      if (material.id === id) {
        oldQuantity = material.quantity;
        materialId = material.id;
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
    
    // Propagate parent material quantity changes to all associated child operations
    if (field === 'quantity' && onQuantityChange && oldQuantity !== value) {
      const material = materials.find(m => m.id === materialId);
      if (material?.childItems) {
        // Trigger recalculation for each child item
        material.childItems.forEach(child => {
          onQuantityChange(child.id, child.quantity, child.quantity);
        });
      }
    }
    
    // Trigger coatings recalculation when surface area or weight changes
    if (field === 'quantity' && onMaterialAreaWeightChange) {
      const material = updatedMaterials.find(m => m.id === materialId);
      if (material) {
        const totalArea = updatedMaterials.reduce((sum, m) => sum + (m.totalSurfaceArea || 0), 0);
        const totalWeight = updatedMaterials.reduce((sum, m) => sum + (m.totalWeight || 0), 0);
        onMaterialAreaWeightChange(totalArea, totalWeight);
      }
    }
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

  // Add child item to a material (legacy - keeping for backward compatibility)
  const addChildItem = (materialId: string) => {
    setAddChildItemMaterialId(materialId);
    setIsAddChildDialogOpen(true);
  };

  // Open Operations Manager for a material
  const openOperationsManager = (material: MaterialCost) => {
    setSelectedMaterialForOperations(material);
    setIsOperationsManagerOpen(true);
  };

  // Handle operation submission from new dialog
  const handleAddOperation = async (operation: any) => {
    const materialId = addChildItemMaterialId;
    if (!materialId || !projectId) {
      console.error('No material ID or project ID set for adding operation');
      return;
    }
    
    console.log('Adding operation to material:', materialId, operation);
    
    // Find parent material to get its designation
    const parentMaterial = materials.find(m => m.id === materialId);
    const parentDesignation = parentMaterial?.designation || `MAT-${materialId}`;

    // Fortune 50 Compliance: Use orchestrator for database-first ID generation
    if (operationOrchestrator) {
      try {
        // Create UI handle for tracking
        const uiHandle = `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        operationOrchestrator.registerUiHandle(uiHandle);
        
        // Create placeholder with pending status
        const placeholderItem: MaterialChildItem = {
          id: uiHandle, // Temporary handle, will be replaced
          type: operation.type as MaterialChildItem['type'],
          description: `${operation.description} (creating...)`,
          quantity: operation.quantity,
          unit: operation.unit,
          unitCost: operation.unitCost,
          totalCost: operation.totalCost,
          thickness: operation.thickness,
          size: operation.size,
          length: operation.length,
          notes: operation.notes,
          weldTime: operation.weldTime,
          libraryComponentId: operation.libraryComponentId,
        };
        
        // Show placeholder immediately for responsive UI
        const optimisticMaterials = materials.map(material => {
          if (material.id === materialId) {
            return {
              ...material,
              childItems: [...(material.childItems || []), placeholderItem],
              isExpanded: true
            };
          }
          return material;
        });
        onUpdate(optimisticMaterials);
        
        // Create operation in database with UI handle for tracking
        const dbOperation = await operationOrchestrator.createOperationImmediately(uiHandle, {
          projectId,
          materialId: Number(materialId),
          designation: `${parentDesignation}-${operation.type}`,
          description: operation.description,
          type: operation.type,
          quantity: operation.quantity,
          unit: operation.unit,
          unitCost: operation.unitCost,
          totalCost: operation.totalCost,
        });
        
        // Update with real database ID
        const finalItem: MaterialChildItem = {
          ...placeholderItem,
          id: dbOperation.id.toString(),
          description: operation.description, // Remove "creating..." suffix
        };
        
        // Replace placeholder with real item
        const updatedMaterials = materials.map(material => {
          if (material.id === materialId) {
            const updatedChildItems = material.childItems?.map(child =>
              child.id === uiHandle ? finalItem : child
            ) || [finalItem];
            
            const updated = {
              ...material,
              childItems: updatedChildItems,
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
        
        // Process follow-up items (labor, equipment, consumables) with proper context
        await processOperationFollowUps(dbOperation, operation, materialId, parentDesignation);
        
      } catch (error) {
        console.error('Failed to create operation:', error);
        toast({
          title: "Error",
          description: "Failed to create operation. Please try again.",
          variant: "destructive"
        });
        
        // Remove placeholder on error
        const revertedMaterials = materials.map(material => {
          if (material.id === materialId) {
            return {
              ...material,
              childItems: material.childItems?.filter(child => !child.id.startsWith('ui-'))
            };
          }
          return material;
        });
        onUpdate(revertedMaterials);
      }
    } else {
      // Fallback for when orchestrator is not available (shouldn't happen in production)
      console.warn('Operation orchestrator not available, operation not created');
      toast({
        title: "Warning",
        description: "Unable to create operation. Please refresh and try again.",
        variant: "destructive"
      });
    }
  };

  // Helper function to process follow-up items after operation creation
  const processOperationFollowUps = async (
    dbOperation: any, 
    originalOperation: any,
    materialId: string,
    parentDesignation: string
  ) => {
    const operationId = dbOperation.id;

    // Route to appropriate tabs
    if (originalOperation.includeInLabor && onLaborUpdate) {
      const laborRate = originalOperation.laborLocation === 'site' ? 120 : 85;
      const laborHours = originalOperation.laborHours || 0;
      // Map location to labor category
      const laborCategory = originalOperation.laborLocation === 'site' ? 'onsite' : 'workshop';
      
      onLaborUpdate([{
        // Use real database operation ID
        operationId: operationId.toString(),
        designation: `${parentDesignation}-${originalOperation.type}`, // Add designation for traceability
        description: originalOperation.description,
        hours: laborHours,
        location: originalOperation.laborLocation,
        skillLevel: originalOperation.skillLevel,
        rate: laborRate,
        totalCost: laborHours * laborRate, // Calculate totalCost
        parentMaterialId: materialId,
        category: laborCategory, // Use mapped category
        subcategory: originalOperation.type || 'fabrication', // Add subcategory
        notes: originalOperation.notes
      }]);
    }

    // Handle consumables routing
    if (originalOperation.includeInConsumables && originalOperation.consumablesData && originalOperation.consumablesData.length > 0 && onConsumablesUpdate) {
      // Map consumables data to the format expected by consumables tab
      const consumableItems = originalOperation.consumablesData.map((item: any, index: number) => ({
        // Use real database operation ID
        operationId: operationId.toString(),
        designation: parentDesignation,
        operationDesignation: `${parentDesignation}-${originalOperation.type}-${index + 1}`,
        category: getCategoryFromType(item.type),
        itemType: item.type || 'consumable',
        specification: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'each',
        unitCost: item.unitCost || 0,
        totalCost: (item.quantity || 1) * (item.unitCost || 0),
        notes: `Auto-generated from ${originalOperation.description}`,
        parentMaterialId: materialId
      }));
      
      onConsumablesUpdate(consumableItems);
      console.log('Routed consumables to consumables tab:', consumableItems);
    }
    
    // Handle equipment routing for operations that require machinery
    if (originalOperation.includeInEquipment && onEquipmentUpdate) {
      const equipmentNeeded = determineEquipmentForOperation(originalOperation.type, originalOperation.method);
      if (equipmentNeeded.length > 0) {
        const equipmentItems = equipmentNeeded.map((equipment: any, index: number) => ({
          // Use real database operation ID for linkage
          operationId: operationId.toString(),
          designation: `${parentDesignation}-${originalOperation.type}`,
          category: equipment.category || 'machinery',
          equipmentType: equipment.type,
          specification: equipment.specification || originalOperation.method || '',
          quantity: 1,
          unit: 'hours',
          hoursRequired: originalOperation.laborHours || 0, // Equipment hours match labor hours
          hourlyRate: equipment.rate || 150,
          totalCost: (originalOperation.laborHours || 0) * (equipment.rate || 150),
          notes: `Required for ${originalOperation.description}`,
          parentMaterialId: materialId
        }));
        
        onEquipmentUpdate(equipmentItems);
        console.log('Routed equipment to equipment tab:', equipmentItems);
      }
    }

    toast({
      title: "Operation Added",
      description: `${originalOperation.description} added successfully with ID ${operationId}`
    });
    
    setIsAddChildDialogOpen(false);
    setAddChildItemMaterialId(null);
  };
  
  // Legacy handler for backward compatibility
  const handleAddChildItem = (childData: Partial<MaterialChildItem>) => {
    if (!addChildItemMaterialId) return;

    const newChildItem: MaterialChildItem = {
      // Use a temporary client-side ID that won't overflow database integers
      id: `temp-child-${Math.random().toString(36).substr(2, 9)}`,
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
    // Track old quantity for propagation
    let oldQuantity = 0;
    let newQuantity = 0;
    
    const updatedMaterials = materials.map(material => {
      if (material.id === materialId && material.childItems) {
        const updatedChildItems = material.childItems.map(child => {
          if (child.id === childId) {
            oldQuantity = child.quantity;
            const updatedChild = { ...child, ...updates };
            newQuantity = updatedChild.quantity;
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
    
    // Propagate quantity change to labor and consumables if quantity changed
    if (updates.quantity !== undefined && onQuantityChange && oldQuantity !== newQuantity) {
      onQuantityChange(childId, newQuantity, oldQuantity);
    }
  };

  // Remove child item
  const removeChildItem = (materialId: string, childId: string) => {
    // Cascade delete to labor and consumables tabs
    if (onLaborDelete) {
      onLaborDelete(childId);
    }
    if (onConsumablesDelete) {
      onConsumablesDelete(childId);
    }
    
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
    
    // Show success message
    toast({
      title: "Operation Removed",
      description: "Operation and associated labor/consumables have been removed"
    });
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

  // Handle importing materials from MTO - Save to database first
  const handleImportMTO = async (importedMaterials: MaterialCost[]) => {
    // Show loading state to disable operations UI
    setIsLoading(true);
    
    try {
      // Save each imported material using the existing addMaterial logic
      const savedCount = { success: 0, failed: 0 };
      
      for (const material of importedMaterials) {
        try {
          // Use addMaterial to ensure proper database save and ID assignment
          await addMaterial(material);
          savedCount.success++;
        } catch (error) {
          console.error(`Failed to save material ${material.materialCode}:`, error);
          savedCount.failed++;
        }
      }
      
      // Show results
      if (savedCount.success > 0) {
        toast({
          title: "MTO Import Complete",
          description: `Successfully imported ${savedCount.success} of ${importedMaterials.length} materials`,
        });
      }
      
      if (savedCount.failed > 0) {
        toast({
          title: "Import Warnings",
          description: `${savedCount.failed} materials failed to import. Check console for details.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error during MTO import:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import materials. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Re-enable operations UI
      setIsLoading(false);
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
          {projectId && (
            <ImportMTODialog 
              projectId={projectId}
              onImport={handleImportMTO}
            />
          )}
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
                    <th className="text-left p-2">Length (m)</th>
                    <th className="text-left p-2">Weight (kg)</th>
                    <th className="text-left p-2">Surface Area (m²)</th>
                    <th className="text-left p-2">Drawing Ref</th>
                    <th className="text-left p-2">Quantity</th>
                    <th className="text-left p-2">Unit Cost</th>
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
                            type="number"
                            value={material.length || 6.0}
                            onChange={(e) => {
                              const length = parseFloat(e.target.value) || 6.0;
                              updateMaterialField(material.id, 'length', length);
                              // Also update total length
                              updateMaterialField(material.id, 'totalLength', length * material.quantity);
                            }}
                            step="0.1"
                            className="w-20 text-sm"
                            title="Individual piece length in meters"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={material.weight || 0}
                            onChange={(e) => updateMaterialField(material.id, 'weight', parseFloat(e.target.value) || 0)}
                            className="w-20 text-sm"
                            title="Total weight in kg"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={material.surfaceArea || 0}
                            onChange={(e) => updateMaterialField(material.id, 'surfaceArea', parseFloat(e.target.value) || 0)}
                            className="w-20 text-sm"
                            title="Total surface area in m²"
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
                                    onClick={() => openOperationsManager(material)}
                                    disabled={isLoading || !material.id || (typeof material.id === 'string' && material.id.length > 10)}
                                    title={isLoading ? "Saving materials..." : !material.id ? "Material must be saved first" : "Manage Operations"}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isLoading ? "Materials are being saved..." : !material.id ? "Save material first" : "Manage operations for this material"}</p>
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
                          <td className="p-2" colSpan={4}>
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
      {projectId && (
        <AddOperationDialog
          open={isAddChildDialogOpen}
          onOpenChange={setIsAddChildDialogOpen}
          onSubmit={handleAddOperation}
          parentMaterial={materials.find(m => m.id === addChildItemMaterialId)}
          estimationId={projectId}
        />
      )}

      {/* Operations Manager Dialog */}
      <Dialog open={isOperationsManagerOpen} onOpenChange={setIsOperationsManagerOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Operations Manager - {selectedMaterialForOperations?.designation || 'Material'}
            </DialogTitle>
          </DialogHeader>
          {selectedMaterialForOperations && projectId && (
            <OperationsManager
              projectId={projectId}
              material={selectedMaterialForOperations}
              isLoading={isLoading} // Pass loading state to disable operations during import
              onOperationsChange={(operations) => {
                // Handle operations updates
                console.log('Operations updated:', operations);
                toast({
                  title: "Operations Updated",
                  description: `Operations for ${selectedMaterialForOperations.designation} have been updated.`
                });
              }}
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
    gridLine: "",
    // Dimensional fields
    length: "6.0",
    width: "",
    height: "",
    thickness: "",
    weight: "",
    weightPerMeter: "",
    surfaceArea: "",
    surfaceAreaExposed: "",
    surfaceAreaConfig: "all" // 'all' or 'exposed'
  });

  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [handlingCalc, setHandlingCalc] = useState({ time: 0, cost: 0 });
  const [useAutoCalculate, setUseAutoCalculate] = useState(true);

  // Function to calculate surface area based on dimensions
  const calculateSurfaceArea = () => {
    if (!formData.width || !formData.height || !formData.length) return;
    
    const width = parseFloat(formData.width) / 1000; // Convert mm to m
    const height = parseFloat(formData.height) / 1000; // Convert mm to m
    const length = parseFloat(formData.length); // Already in m
    const thickness = formData.thickness ? parseFloat(formData.thickness) / 1000 : 0; // Convert mm to m
    
    let area = 0;
    
    // Calculate based on profile type (simplified for now)
    if (formData.materialName.toLowerCase().includes('hollow') || 
        formData.materialName.toLowerCase().includes('rhs') || 
        formData.materialName.toLowerCase().includes('shs')) {
      // Hollow section - calculate outer perimeter
      area = 2 * (width + height) * length;
    } else if (formData.materialName.toLowerCase().includes('plate') || 
               formData.materialName.toLowerCase().includes('sheet')) {
      // Plate - calculate both sides
      area = 2 * width * length; // Assuming width is the plate width and length is the plate length
    } else {
      // Standard beam/column - calculate all surfaces
      area = (2 * width + 2 * height) * length;
    }
    
    // Apply exposed surface configuration
    const exposedArea = formData.surfaceAreaConfig === 'exposed' ? area * 0.75 : area; // Assume 75% exposed
    
    setFormData(prev => ({
      ...prev,
      surfaceArea: area.toFixed(2),
      surfaceAreaExposed: exposedArea.toFixed(2)
    }));
  };

  useEffect(() => {
    if (selectedMaterial && formData.quantity) {
      const calc = calculateHandlingCost(selectedMaterial, parseFloat(formData.quantity));
      setHandlingCalc(calc);
    }
  }, [selectedMaterial, formData.quantity, calculateHandlingCost]);

  useEffect(() => {
    if (useAutoCalculate) {
      calculateSurfaceArea();
    }
  }, [formData.width, formData.height, formData.length, formData.thickness, formData.surfaceAreaConfig, useAutoCalculate]);

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
      gridLine: formData.gridLine,
      // Dimensional fields
      length: formData.length ? parseFloat(formData.length) : 6.0,
      width: formData.width ? parseFloat(formData.width) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      thickness: formData.thickness ? parseFloat(formData.thickness) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      weightPerMeter: formData.weightPerMeter ? parseFloat(formData.weightPerMeter) : undefined,
      surfaceArea: formData.surfaceArea ? parseFloat(formData.surfaceArea) : undefined,
      surfaceAreaExposed: formData.surfaceAreaExposed ? parseFloat(formData.surfaceAreaExposed) : undefined,
      surfaceAreaConfig: formData.surfaceAreaConfig
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

      {/* Dimensional Fields */}
      <div className="space-y-4">
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-4 text-muted-foreground">Dimensions & Weight</h4>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="length">Length (m)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                value={formData.length}
                onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))}
                placeholder="6.0"
              />
            </div>
            <div>
              <Label htmlFor="width">Width (mm)</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData(prev => ({ ...prev, width: e.target.value }))}
                placeholder="200"
              />
            </div>
            <div>
              <Label htmlFor="height">Height (mm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                placeholder="300"
              />
            </div>
            <div>
              <Label htmlFor="thickness">Thickness (mm)</Label>
              <Input
                id="thickness"
                type="number"
                step="0.1"
                value={formData.thickness}
                onChange={(e) => setFormData(prev => ({ ...prev, thickness: e.target.value }))}
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="weight">Total Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="Calculate or enter manually"
              />
            </div>
            <div>
              <Label htmlFor="weightPerMeter">Weight per Meter (kg/m)</Label>
              <Input
                id="weightPerMeter"
                type="number"
                step="0.01"
                value={formData.weightPerMeter}
                onChange={(e) => setFormData(prev => ({ ...prev, weightPerMeter: e.target.value }))}
                placeholder="Auto-calculated or manual"
              />
            </div>
          </div>
        </div>

        {/* Surface Area Calculator */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-4 text-muted-foreground">Surface Area Calculator</h4>
          
          <div className="flex items-center gap-2 mb-4">
            <Switch
              checked={useAutoCalculate}
              onCheckedChange={setUseAutoCalculate}
              id="auto-calculate"
            />
            <Label htmlFor="auto-calculate" className="text-sm cursor-pointer">
              Auto-calculate from dimensions
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Surface Configuration</Label>
              <Select 
                value={formData.surfaceAreaConfig} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, surfaceAreaConfig: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Surfaces</SelectItem>
                  <SelectItem value="exposed">Exposed Surfaces Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="surfaceArea">Total Surface Area (m²)</Label>
              <Input
                id="surfaceArea"
                type="number"
                step="0.01"
                value={formData.surfaceArea}
                onChange={(e) => setFormData(prev => ({ ...prev, surfaceArea: e.target.value }))}
                disabled={useAutoCalculate}
                placeholder={useAutoCalculate ? "Auto-calculated" : "Enter manually"}
              />
            </div>
            <div>
              <Label htmlFor="surfaceAreaExposed">Exposed Surface Area (m²)</Label>
              <Input
                id="surfaceAreaExposed"
                type="number"
                step="0.01"
                value={formData.surfaceAreaExposed}
                onChange={(e) => setFormData(prev => ({ ...prev, surfaceAreaExposed: e.target.value }))}
                disabled={useAutoCalculate}
                placeholder={useAutoCalculate ? "Auto-calculated" : "Enter manually"}
              />
            </div>
          </div>

          {useAutoCalculate && formData.surfaceArea && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Calculated: {formData.surfaceArea} m² total, {formData.surfaceAreaExposed} m² exposed</p>
            </div>
          )}
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

          {/* Dimensional Fields */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-4 text-muted-foreground">Dimensions & Surface Area</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="edit-length">Length (m)</Label>
                <Input
                  id="edit-length"
                  type="number"
                  step="0.1"
                  value={formData.length || 6.0}
                  onChange={(e) => setFormData(prev => ({ ...prev, length: parseFloat(e.target.value) || 6.0 }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-width">Width (mm)</Label>
                <Input
                  id="edit-width"
                  type="number"
                  value={formData.width || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, width: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-height">Height (mm)</Label>
                <Input
                  id="edit-height"
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, height: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-thickness">Thickness (mm)</Label>
                <Input
                  id="edit-thickness"
                  type="number"
                  step="0.1"
                  value={formData.thickness || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, thickness: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="edit-weight">Weight (kg)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.01"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-surface-area">Surface Area (m²)</Label>
                <Input
                  id="edit-surface-area"
                  type="number"
                  step="0.01"
                  value={formData.surfaceArea || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, surfaceArea: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-surface-area-exposed">Exposed Area (m²)</Label>
                <Input
                  id="edit-surface-area-exposed"
                  type="number"
                  step="0.01"
                  value={formData.surfaceAreaExposed || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, surfaceAreaExposed: parseFloat(e.target.value) || undefined }))}
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