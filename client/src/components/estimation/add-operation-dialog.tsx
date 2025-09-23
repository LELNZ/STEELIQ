import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  Zap, 
  Wrench, 
  Paintbrush,
  Factory,
  Truck,
  AlertTriangle,
  Calculator,
  Clock,
  DollarSign,
  Info,
  ChevronRight,
  Settings,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationCombobox } from "./operation-combobox";
import { OperationSaveDialog } from "./operation-save-dialog";

// Operation Categories with Icons and Colors
const OPERATION_CATEGORIES = {
  fabrication: {
    label: "Fabrication",
    icon: Factory,
    color: "bg-blue-500",
    types: ["cutting", "drilling", "grinding", "coping", "notching", "punching"]
  },
  connection: {
    label: "Connections",
    icon: Package,
    color: "bg-green-500",
    types: ["stiffener", "endplate", "baseplate", "cleat", "gusset", "bracket", "bolt", "weld"]
  },
  assembly: {
    label: "Assembly",
    icon: Wrench,
    color: "bg-purple-500",
    types: ["fitting", "rigging", "installation", "alignment", "torquing"]
  },
  surface: {
    label: "Surface Treatment",
    icon: Paintbrush,
    color: "bg-orange-500",
    types: ["blasting", "priming", "painting", "galvanizing", "powder_coating"]
  },
  handling: {
    label: "Handling",
    icon: Truck,
    color: "bg-gray-500",
    types: ["crane_ops", "transport", "storage", "loading", "unloading"]
  }
};

// Industry-standard operation sequences
const OPERATION_SEQUENCES = {
  cutting: 100,
  drilling: 200,
  coping: 150,
  grinding: 300,
  fitting: 400,
  welding: 500,
  blasting: 600,
  priming: 700,
  painting: 800,
  inspection: 900
};

// Consumables formulas (industry standard)
const CONSUMABLES_FORMULAS = {
  cutting: {
    disc: { formula: "cuts / 10", unit: "disc", description: "1 disc per 10 cuts" }
  },
  grinding: {
    disc: { formula: "weight * 0.02", unit: "disc", description: "1 disc per 50kg" }
  },
  welding: {
    wire: { formula: "length * size * 0.0015", unit: "kg", description: "Wire consumption" },
    gas: { formula: "time * 15 / 60", unit: "L", description: "15L/min flow rate" },
    contact_tips: { formula: "length / 5000", unit: "tips", description: "1 tip per 5m weld" }
  },
  drilling: {
    drill_bits: { formula: "holes / 100", unit: "bits", description: "1 bit per 100 holes" },
    coolant: { formula: "holes * 0.01", unit: "L", description: "10ml per hole" }
  },
  blasting: {
    grit: { formula: "area * 25", unit: "kg", description: "25kg/m² consumption" }
  },
  painting: {
    paint: { formula: "area * coverage * coats", unit: "L", description: "Paint consumption" },
    thinner: { formula: "paint * 0.1", unit: "L", description: "10% thinner ratio" }
  }
};

interface OperationItem {
  id: string;
  estimationId: number;
  parentMaterialId: string;
  category: string;
  type: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  thickness?: number;
  size?: string;
  length?: number;
  width?: number;
  diameter?: number;
  area?: number;
  laborHours: number;
  laborLocation: string;
  skillLevel: string;
  weldTime?: number;
  consumablesData?: any[];
  coatingData?: any;
  sourceType: string;
  sourceId?: number;
  libraryComponentId?: number;
  method?: string;
  position?: string;
  includeInLabor: boolean;
  includeInMaterials: boolean;
  includeInConsumables: boolean;
  includeInCoatings: boolean;
  notes?: string;
  sequence?: number;
}

interface AddOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (operation: Partial<OperationItem>) => void;
  parentMaterial?: any;
  estimationId: number;
}

export default function AddOperationDialog({
  open,
  onOpenChange,
  onSubmit,
  parentMaterial,
  estimationId
}: AddOperationDialogProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [useLibrary, setUseLibrary] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<any>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogData, setSaveDialogData] = useState<any>(null);
  
  // Form data with comprehensive fields
  const [formData, setFormData] = useState<Partial<OperationItem>>({
    estimationId,
    parentMaterialId: parentMaterial?.id || "",
    description: "",
    quantity: 1,
    unit: "each",
    unitCost: 0,
    totalCost: 0,
    laborHours: 0,
    laborLocation: "workshop",
    skillLevel: "standard",
    sourceType: "manual",
    includeInLabor: true,
    includeInMaterials: false,
    includeInConsumables: false,
    includeInCoatings: false,
    sequence: 100
  });

  // Auto-calculated consumables
  const [calculatedConsumables, setCalculatedConsumables] = useState<any[]>([]);
  
  // Validation warnings
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Fetch operation types for selected category
  const { data: operationTypes = [] } = useQuery({
    queryKey: ['/api/operation-library/types', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ category: selectedCategory });
      const response = await fetch(`/api/operation-library/types?${params}`);
      if (!response.ok) throw new Error('Failed to fetch operation types');
      return response.json();
    },
    enabled: !!selectedCategory
  });

  // Fetch welding standards
  const { data: weldingStandards = [] } = useQuery({
    queryKey: ['/api/labor-standards/welding'],
    enabled: !!(selectedType === 'weld' || selectedType === 'welding')
  });

  // Fetch drilling standards
  const { data: drillingStandards = [] } = useQuery({
    queryKey: ['/api/labor-standards/drilling'],
    enabled: !!(selectedType === 'drilling')
  });

  // Fetch cutting standards
  const { data: cuttingStandards = [] } = useQuery({
    queryKey: ['/api/labor-standards/cutting'],
    enabled: !!(selectedType === 'cutting')
  });

  // Fetch assembly templates
  const { data: assemblyTemplates = [] } = useQuery({
    queryKey: ['/api/assembly-templates'],
    enabled: !!useLibrary
  });

  // Auto-calculate consumables when operation details change
  useEffect(() => {
    if (formData.type && CONSUMABLES_FORMULAS[formData.type]) {
      const consumables = calculateConsumables(formData);
      setCalculatedConsumables(consumables);
      setFormData(prev => ({
        ...prev,
        consumablesData: consumables
      }));
    }
  }, [formData.type, formData.quantity, formData.length, formData.area, formData.laborHours]);

  // Validate operation sequence
  useEffect(() => {
    const warnings = validateOperationSequence(formData, parentMaterial);
    setValidationWarnings(warnings);
  }, [formData.type, parentMaterial]);

  // Calculate consumables based on operation type
  const calculateConsumables = (operation: Partial<OperationItem>) => {
    const consumables = [];
    const formulas = CONSUMABLES_FORMULAS[operation.type || ""];
    
    if (!formulas) return [];

    for (const [consumable, config] of Object.entries(formulas)) {
      let quantity = 0;
      
      // Evaluate formula based on operation data
      switch (operation.type) {
        case "cutting":
          quantity = (operation.quantity || 0) / 10; // 1 disc per 10 cuts
          break;
        case "grinding":
          quantity = ((operation.quantity || 0) * (parentMaterial?.weightPerMeter || 0)) * 0.02;
          break;
        case "welding":
          if (consumable === "wire") {
            quantity = (operation.length || 0) * (operation.size ? parseFloat(operation.size) : 6) * 0.0015;
          } else if (consumable === "gas") {
            quantity = (operation.laborHours || 0) * 60 * 15 / 60; // 15L/min
          } else if (consumable === "contact_tips") {
            quantity = (operation.length || 0) / 5000;
          }
          break;
        case "drilling":
          if (consumable === "drill_bits") {
            quantity = (operation.quantity || 0) / 100;
          } else if (consumable === "coolant") {
            quantity = (operation.quantity || 0) * 0.01;
          }
          break;
        case "blasting":
          quantity = (operation.area || 0) * 25;
          break;
        case "painting":
          if (consumable === "paint") {
            quantity = (operation.area || 0) * 0.35 * 2; // 0.35L/m² × 2 coats
          } else if (consumable === "thinner") {
            quantity = ((operation.area || 0) * 0.35 * 2) * 0.1;
          }
          break;
      }

      if (quantity > 0) {
        consumables.push({
          type: consumable,
          description: config.description,
          quantity: Math.ceil(quantity * 100) / 100,
          unit: config.unit,
          unitCost: 0, // To be filled from consumables library
          designation: `${parentMaterial?.designation || "M1"}-${operation.type}-consumables`
        });
      }
    }

    return consumables;
  };

  // Validate operation sequence
  const validateOperationSequence = (operation: Partial<OperationItem>, material: any) => {
    const warnings = [];
    
    // Check if cutting is done before welding
    if (operation.type === "welding" && !material?.hasCutting) {
      warnings.push("Warning: Material should be cut before welding");
    }
    
    // Check if grinding is done after welding
    if (operation.type === "grinding" && !material?.hasWelding) {
      warnings.push("Info: Grinding typically follows welding operations");
    }
    
    // Check if painting is done after blasting
    if (operation.type === "painting" && !material?.hasBlasting) {
      warnings.push("Warning: Surface should be blasted before painting");
    }

    return warnings;
  };

  // Calculate labor hours based on standards
  const calculateLaborHours = () => {
    let hours = 0;
    
    switch (formData.type) {
      case "cutting":
        const cuttingStandard = cuttingStandards.find(s => s.method === formData.method);
        if (cuttingStandard) {
          hours = (formData.length || 0) / 1000 * (cuttingStandard.timePerMeter || 0) / 60;
        }
        break;
      case "drilling":
        const drillingStandard = drillingStandards.find(s => 
          s.method === formData.method && 
          formData.diameter >= s.diameterMin && 
          formData.diameter <= s.diameterMax
        );
        if (drillingStandard) {
          hours = (formData.quantity || 0) * (drillingStandard.timePerHole || 0) / 60;
        }
        break;
      case "welding":
      case "weld":
        const weldingStandard = weldingStandards.find(s => 
          s.weldType === formData.method && 
          s.size === formData.size
        );
        if (weldingStandard) {
          hours = (formData.length || 0) / 1000 * (weldingStandard.timePerMeter || 0) / 60;
          
          // Apply position factor
          if (formData.position === "overhead") hours *= 2;
          else if (formData.position === "vertical") hours *= 1.5;
          else if (formData.position === "horizontal") hours *= 1.2;
        }
        break;
    }
    
    // Apply skill level factor
    if (formData.skillLevel === "apprentice") hours *= 1.3;
    else if (formData.skillLevel === "senior") hours *= 0.9;
    else if (formData.skillLevel === "specialist") hours *= 0.8;
    
    setFormData(prev => ({ ...prev, laborHours: Math.round(hours * 100) / 100 }));
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedType("");
    setFormData(prev => ({
      ...prev,
      category,
      type: "",
      // Set default routing based on category
      includeInLabor: true,
      includeInMaterials: category === "connection",
      includeInConsumables: ["fabrication", "connection"].includes(category),
      includeInCoatings: category === "surface"
    }));
  };

  // Handle type selection
  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      type,
      description: `${OPERATION_CATEGORIES[selectedCategory]?.label} - ${type}`,
      sequence: OPERATION_SEQUENCES[type] || 100
    }));
  };

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    // Apply template operations to form
    if (template.components) {
      // This would create multiple operations from the template
      toast({
        title: "Template Applied",
        description: `${template.components.length} operations will be added from template`
      });
    }
  };

  // Handle library item selection
  const handleLibraryItemSelect = (item: any) => {
    if (!item) {
      setSelectedLibraryItem(null);
      return;
    }
    
    setSelectedLibraryItem(item);
    
    // Apply defaults from library item
    setFormData(prev => ({
      ...prev,
      description: item.description || prev.description,
      unit: item.unit || prev.unit,
      laborHours: item.defaults?.laborHours || prev.laborHours,
      unitCost: item.defaults?.unitCost || prev.unitCost,
      method: item.defaults?.method || prev.method,
      sourceType: 'library',
      sourceId: item.source?.id,
      libraryComponentId: item.source?.id
    }));
    
    // Handle assembly templates differently
    if (item.appliesTo === 'composite' && item.source?.table === 'assembly_templates') {
      handleTemplateSelect(item);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    console.log('AddOperationDialog handleSubmit called', { selectedCategory, selectedType, formData });
    
    // Validate required fields
    if (!selectedCategory || !selectedType) {
      toast({
        title: "Missing Information",
        description: "Please select both category and type",
        variant: "destructive"
      });
      return;
    }

    // Calculate total cost
    const totalCost = formData.quantity * formData.unitCost;
    
    // Add standard labor rate if not set
    let laborRate = 85; // Standard workshop rate
    if (formData.laborLocation === "site") laborRate = 120;
    else if (formData.skillLevel === "specialist") laborRate = 150;

    // Prepare operation data
    const operationData = {
      ...formData,
      category: selectedCategory,
      type: selectedType,
      totalCost,
      laborRate,
      consumablesData: calculatedConsumables,
      libraryItem: selectedLibraryItem
    };

    // Show save dialog if using library item with changes
    if (useLibrary && selectedLibraryItem) {
      setSaveDialogData(operationData);
      setShowSaveDialog(true);
    } else {
      // Direct submit for manual entry
      console.log('Submitting operation directly:', operationData);
      onSubmit(operationData);
      onOpenChange(false);
    }
  };

  // Handle save dialog response
  const handleSaveDialogConfirm = async (saveOption: 'estimate' | 'update' | 'create') => {
    if (!saveDialogData) return;
    
    console.log('Save dialog confirm:', saveOption, saveDialogData);
    
    if (saveOption === 'estimate') {
      // Just save to estimate
      console.log('Submitting operation from save dialog:', saveDialogData);
      onSubmit(saveDialogData);
    } else if (saveOption === 'update' && selectedLibraryItem?.source) {
      // Update library item
      try {
        const response = await fetch(`/api/${selectedLibraryItem.source.table}/${selectedLibraryItem.source.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveDialogData)
        });
        
        if (!response.ok) throw new Error('Failed to update library item');
        
        toast({
          title: "Library Updated",
          description: "The library item has been updated successfully"
        });
        
        onSubmit(saveDialogData);
      } catch (error) {
        toast({
          title: "Update Failed",
          description: "Failed to update the library item",
          variant: "destructive"
        });
      }
    } else if (saveOption === 'create') {
      // Create new library item
      try {
        const endpoint = selectedLibraryItem?.source?.table || 'connection-components';
        const response = await fetch(`/api/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveDialogData)
        });
        
        if (!response.ok) throw new Error('Failed to create library item');
        
        toast({
          title: "Library Item Created",
          description: "A new library item has been created successfully"
        });
        
        onSubmit(saveDialogData);
      } catch (error) {
        toast({
          title: "Creation Failed",
          description: "Failed to create the library item",
          variant: "destructive"
        });
      }
    }
    
    setShowSaveDialog(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Operation - {parentMaterial?.designation || "New Operation"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Category Selection */}
          {!selectedCategory ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
              {Object.entries(OPERATION_CATEGORIES).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card
                    key={key}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleCategorySelect(key)}
                  >
                    <CardHeader className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-3 rounded-full ${config.color} text-white`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-base">{config.label}</CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Category Badge */}
              <div className="flex items-center gap-2">
                <Badge className={OPERATION_CATEGORIES[selectedCategory].color}>
                  {OPERATION_CATEGORIES[selectedCategory].label}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedType("");
                  }}
                >
                  Change Category
                </Button>
              </div>

              {/* Type Selection */}
              {!selectedType ? (
                <div>
                  <Label>Select Operation Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {(operationTypes.length > 0 ? operationTypes : OPERATION_CATEGORIES[selectedCategory]?.types || []).map(type => (
                      <Button
                        key={type}
                        variant="outline"
                        onClick={() => handleTypeSelect(type)}
                      >
                        {type.replace(/_/g, " ").charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Type */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedType.replace(/_/g, " ").charAt(0).toUpperCase() + selectedType.slice(1).replace(/_/g, " ")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedType("")}
                    >
                      Change Type
                    </Button>
                  </div>

                  {/* Validation Warnings */}
                  {validationWarnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {validationWarnings.map((warning, i) => (
                          <div key={i}>{warning}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Use Library Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-library">Use Component Library</Label>
                    <Switch
                      id="use-library"
                      checked={useLibrary}
                      onCheckedChange={setUseLibrary}
                    />
                  </div>

                  {/* Library Selection */}
                  {useLibrary && (
                    <div className="space-y-2">
                      <Label>Select from Library</Label>
                      <OperationCombobox
                        category={selectedCategory}
                        type={selectedType}
                        parentSection={parentMaterial?.section}
                        value={selectedLibraryItem?.id}
                        onSelect={handleLibraryItemSelect}
                        placeholder="Search operations..."
                        showAllOptions={false}
                        onCreateNew={() => {
                          // Handle creating new library item
                          setUseLibrary(false);
                          toast({
                            title: "Create New",
                            description: "Fill in the details to create a new library item"
                          });
                        }}
                      />
                      
                      {selectedLibraryItem && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div>Selected: <strong>{selectedLibraryItem.name}</strong></div>
                              {selectedLibraryItem.description && (
                                <div className="text-sm text-muted-foreground">{selectedLibraryItem.description}</div>
                              )}
                              {selectedLibraryItem.compatibility?.warning && (
                                <div className="text-sm text-orange-600">
                                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                                  {selectedLibraryItem.compatibility.warning}
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Operation Details Tabs */}
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="labor">Labor</TabsTrigger>
                      <TabsTrigger value="consumables">Consumables</TabsTrigger>
                      <TabsTrigger value="routing">Routing</TabsTrigger>
                    </TabsList>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-4">
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Operation description"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="unit">Unit</Label>
                          <Select 
                            value={formData.unit}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="each">Each</SelectItem>
                              <SelectItem value="m">Meters</SelectItem>
                              <SelectItem value="m2">Square Meters</SelectItem>
                              <SelectItem value="kg">Kilograms</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="unitCost">Unit Cost ($)</Label>
                          <Input
                            id="unitCost"
                            type="number"
                            value={formData.unitCost}
                            onChange={(e) => setFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) }))}
                          />
                        </div>
                      </div>

                      {/* Type-specific fields */}
                      {selectedType === "cutting" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Cutting Method</Label>
                            <Select 
                              value={formData.method}
                              onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, method: value }));
                                calculateLaborHours();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bandsaw">Bandsaw</SelectItem>
                                <SelectItem value="plasma">Plasma</SelectItem>
                                <SelectItem value="laser">Laser</SelectItem>
                                <SelectItem value="oxy">Oxy Cut</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Cut Length (mm)</Label>
                            <Input
                              type="number"
                              value={formData.length}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, length: parseFloat(e.target.value) }));
                                calculateLaborHours();
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {selectedType === "drilling" && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Method</Label>
                            <Select 
                              value={formData.method}
                              onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, method: value }));
                                calculateLaborHours();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mag_drill">Mag Drill</SelectItem>
                                <SelectItem value="hand_drill">Hand Drill</SelectItem>
                                <SelectItem value="laser">Laser</SelectItem>
                                <SelectItem value="plasma">Plasma</SelectItem>
                                <SelectItem value="punch">Punch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Hole Diameter (mm)</Label>
                            <Input
                              type="number"
                              value={formData.diameter}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, diameter: parseFloat(e.target.value) }));
                                calculateLaborHours();
                              }}
                            />
                          </div>
                          <div>
                            <Label>Number of Holes</Label>
                            <Input
                              type="number"
                              value={formData.quantity}
                              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                            />
                          </div>
                        </div>
                      )}

                      {(selectedType === "welding" || selectedType === "weld") && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Weld Type</Label>
                              <Select 
                                value={formData.method}
                                onValueChange={(value) => {
                                  setFormData(prev => ({ ...prev, method: value }));
                                  calculateLaborHours();
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fillet">Fillet</SelectItem>
                                  <SelectItem value="butt_single_v">Single-V Butt</SelectItem>
                                  <SelectItem value="butt_double_v">Double-V Butt</SelectItem>
                                  <SelectItem value="seal">Seal</SelectItem>
                                  <SelectItem value="plug">Plug</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Weld Size (mm)</Label>
                              <Input
                                type="number"
                                value={formData.size}
                                onChange={(e) => {
                                  setFormData(prev => ({ ...prev, size: e.target.value }));
                                  calculateLaborHours();
                                }}
                              />
                            </div>
                            <div>
                              <Label>Length (mm)</Label>
                              <Input
                                type="number"
                                value={formData.length}
                                onChange={(e) => {
                                  setFormData(prev => ({ ...prev, length: parseFloat(e.target.value) }));
                                  calculateLaborHours();
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Position</Label>
                            <Select 
                              value={formData.position}
                              onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, position: value }));
                                calculateLaborHours();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">Flat (1x)</SelectItem>
                                <SelectItem value="horizontal">Horizontal (1.2x)</SelectItem>
                                <SelectItem value="vertical">Vertical (1.5x)</SelectItem>
                                <SelectItem value="overhead">Overhead (2x)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {["stiffener", "endplate", "baseplate", "cleat", "gusset"].includes(selectedType) && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Thickness (mm)</Label>
                            <Input
                              type="number"
                              value={formData.thickness}
                              onChange={(e) => setFormData(prev => ({ ...prev, thickness: parseFloat(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <Label>Size</Label>
                            <Input
                              value={formData.size}
                              onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                              placeholder="e.g., 150x100"
                            />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={formData.quantity}
                              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                            />
                          </div>
                        </div>
                      )}

                      {["blasting", "painting", "galvanizing"].includes(selectedType) && (
                        <div>
                          <Label>Surface Area (m²)</Label>
                          <Input
                            type="number"
                            value={formData.area}
                            onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) }))}
                            placeholder="Enter surface area"
                          />
                        </div>
                      )}
                    </TabsContent>

                    {/* Labor Tab */}
                    <TabsContent value="labor" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Labor Location</Label>
                          <Select 
                            value={formData.laborLocation}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, laborLocation: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="workshop">Workshop ($85/hr)</SelectItem>
                              <SelectItem value="site">Site ($120/hr)</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                              <SelectItem value="subcontractor">Subcontractor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Skill Level</Label>
                          <Select 
                            value={formData.skillLevel}
                            onValueChange={(value) => {
                              setFormData(prev => ({ ...prev, skillLevel: value }));
                              calculateLaborHours();
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apprentice">Apprentice (1.3x)</SelectItem>
                              <SelectItem value="standard">Standard (1x)</SelectItem>
                              <SelectItem value="senior">Senior (0.9x)</SelectItem>
                              <SelectItem value="specialist">Specialist (0.8x)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Labor Hours</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={formData.laborHours}
                            onChange={(e) => setFormData(prev => ({ ...prev, laborHours: parseFloat(e.target.value) }))}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={calculateLaborHours}
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            Calculate
                          </Button>
                        </div>
                      </div>

                      {formData.laborHours > 0 && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Labor Cost: {formData.laborHours} hrs × ${formData.laborLocation === "site" ? 120 : 85}/hr 
                            = ${(formData.laborHours * (formData.laborLocation === "site" ? 120 : 85)).toFixed(2)}
                          </AlertDescription>
                        </Alert>
                      )}
                    </TabsContent>

                    {/* Consumables Tab */}
                    <TabsContent value="consumables" className="space-y-4">
                      {calculatedConsumables.length > 0 ? (
                        <div className="space-y-2">
                          <Label>Auto-Calculated Consumables</Label>
                          {calculatedConsumables.map((consumable, index) => (
                            <Card key={index} className="p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{consumable.type}</div>
                                  <div className="text-sm text-muted-foreground">{consumable.description}</div>
                                </div>
                                <Badge variant="outline">
                                  {consumable.quantity} {consumable.unit}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Designation: {consumable.designation}
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No consumables required for this operation type.
                          </AlertDescription>
                        </Alert>
                      )}
                    </TabsContent>

                    {/* Routing Tab */}
                    <TabsContent value="routing" className="space-y-4">
                      <Label>This operation will be included in:</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-labor">Labor Tab</Label>
                          <Switch
                            id="include-labor"
                            checked={formData.includeInLabor}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeInLabor: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-materials">Materials Tab</Label>
                          <Switch
                            id="include-materials"
                            checked={formData.includeInMaterials}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeInMaterials: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-consumables">Consumables Tab</Label>
                          <Switch
                            id="include-consumables"
                            checked={formData.includeInConsumables}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeInConsumables: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-coatings">Coatings Tab</Label>
                          <Switch
                            id="include-coatings"
                            checked={formData.includeInCoatings}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeInCoatings: checked }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Operation Sequence</Label>
                        <Input
                          type="number"
                          value={formData.sequence}
                          onChange={(e) => setFormData(prev => ({ ...prev, sequence: parseInt(e.target.value) }))}
                          placeholder="100 = first, 900 = last"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Standard: Cut(100) → Drill(200) → Fit(400) → Weld(500) → Grind(300) → Blast(600) → Paint(800)
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes or special requirements"
                      rows={2}
                    />
                  </div>

                  {/* Cost Summary */}
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div>Material: ${(formData.quantity * formData.unitCost).toFixed(2)}</div>
                        <div>Labor: ${(formData.laborHours * (formData.laborLocation === "site" ? 120 : 85)).toFixed(2)}</div>
                        <div className="font-medium">
                          Total: ${((formData.quantity * formData.unitCost) + (formData.laborHours * (formData.laborLocation === "site" ? 120 : 85))).toFixed(2)}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedCategory || !selectedType}
          >
            Add Operation
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Save Dialog */}
      <OperationSaveDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveDialogConfirm}
        operationType={selectedType?.replace(/_/g, " ") || "operation"}
        userRole="admin"
      />
    </Dialog>
  );
}