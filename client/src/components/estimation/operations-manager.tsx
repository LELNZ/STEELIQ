import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Factory, Wrench, Package, Users, ChevronRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Operation {
  id?: number; // Changed from string to number for database-backed IDs
  projectId: number;
  materialId: number;
  materialDesignation: string; // C1, B2, PL1
  operationType: string; // cut, drill, weld, etc.
  operationDesignation: string; // C1-310-cut-1
  description: string;
  sequenceOrder?: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  method?: string; // bandsaw, plasma, laser, etc.
  position?: string; // flat, vertical, overhead
  
  // Time-based pricing
  timeFactor?: number; // Time per operation (e.g., 10 for "10 mins per cut")
  timeUnit?: 'mins' | 'hours'; // Time unit
  laborCategory?: 'workshop' | 'onsite' | 'subcontractor'; // Labor category
  skillLevel?: 'apprentice' | 'standard' | 'senior' | 'specialist' | 'master' | 'expert'; // Skill level
  hourlyRate?: number; // Selected hourly rate based on category and skill
  
  includeInLabor: boolean;
  includeInConsumables: boolean;
  includeInCoatings: boolean;
  includeInEquipment: boolean;
  includeInSubcontractor: boolean;
  operationData?: any; // Additional operation-specific data
  notes?: string;
}

interface OperationsManagerProps {
  projectId: number;
  material: any; // Parent material item
  operations?: Operation[];
  isLoading?: boolean; // Loading state from parent (e.g., during import)
  onOperationsChange?: (operations: Operation[]) => void;
}

const OPERATION_TYPES = {
  fabrication: ['cutting', 'drilling', 'grinding', 'coping', 'notching', 'punching'],
  assembly: ['welding', 'bolting', 'fitting', 'rigging', 'alignment'],
  surface: ['blasting', 'priming', 'painting', 'galvanizing'],
  handling: ['crane_ops', 'transport', 'loading', 'unloading']
};

const CUTTING_METHODS = {
  bandsaw: { name: 'Bandsaw', laborRate: 0.5, consumableRate: 0.02 },
  plasma: { name: 'Plasma', laborRate: 0.3, consumableRate: 0.05 },
  laser: { name: 'Laser', laborRate: 0.2, consumableRate: 0.03 },
  fiber_laser: { name: 'Fiber Laser', laborRate: 0.15, consumableRate: 0.02 },
  oxy: { name: 'Oxy-Acetylene', laborRate: 0.8, consumableRate: 0.1 },
  grinder_125: { name: '125mm Grinder', laborRate: 0.6, consumableRate: 0.08 },
  grinder_230: { name: '230mm Grinder', laborRate: 0.7, consumableRate: 0.12 }
};

// Labor rates structure matching the Labor tab
const LABOR_RATES = {
  workshop: {
    apprentice: 45,
    standard: 65,
    senior: 85,
    specialist: 105
  },
  onsite: {
    apprentice: 55,
    standard: 75,
    senior: 95,
    specialist: 115
  },
  subcontractor: {
    standard: 95,
    specialist: 125,
    master: 145,
    expert: 165
  }
};

export default function OperationsManager({ projectId, material, operations = [], isLoading = false, onOperationsChange }: OperationsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  
  // Validate material has a valid database ID (not a Date.now() timestamp)
  const isValidMaterialId = (id: any): boolean => {
    if (!id) return false;
    const numericId = typeof id === 'number' ? id : parseInt(id?.toString() || '0', 10);
    return !isNaN(numericId) && numericId > 0 && numericId <= 2147483647;
  };
  
  const canCreateOperations = !isLoading && isValidMaterialId(material.id);
  
  // Three-dropdown system states
  const [operationCategory, setOperationCategory] = useState<string>('');
  const [operationMethod, setOperationMethod] = useState<string>('');
  const [operationComplexity, setOperationComplexity] = useState<string>('');
  const [standardApplied, setStandardApplied] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<Operation>>({
    projectId,
    materialId: isValidMaterialId(material.id) ? material.id : null,
    materialDesignation: material.designation || '',
    operationType: '',
    operationDesignation: '',
    description: '',
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
    timeFactor: 0,
    timeUnit: 'mins',
    laborCategory: 'workshop',
    skillLevel: 'standard',
    hourlyRate: 65, // Default workshop standard rate
    includeInLabor: true,
    includeInConsumables: false,
    includeInCoatings: false,
    includeInEquipment: false,
    includeInSubcontractor: false,
  });

  // Query for operation templates from library
  const { data: operationTemplates = [] } = useQuery({
    queryKey: ['/api/operations/templates']
  });
  
  // Query for available options from selected method
  const { data: availableCuttingOptions = [] } = useQuery({
    queryKey: operationMethod ? [`/api/labor-standards/cutting?method=${operationMethod}`] : ['/api/labor-standards/cutting'],
    enabled: operationCategory === 'cutting' && !!operationMethod
  });
  
  const { data: availableDrillingOptions = [] } = useQuery({
    queryKey: operationMethod ? [`/api/labor-standards/drilling?method=${operationMethod}`] : ['/api/labor-standards/drilling'],
    enabled: operationCategory === 'drilling' && !!operationMethod
  });
  
  const { data: availableWeldingOptions = [] } = useQuery({
    queryKey: operationMethod ? [`/api/labor-standards/welding?method=${operationMethod}`] : ['/api/labor-standards/welding'],
    enabled: operationCategory === 'welding' && !!operationMethod
  });
  
  // Query for cutting standards - already fetched in availableCuttingOptions
  const cuttingStandards = availableCuttingOptions || [];
  
  // Query for drilling standards - already fetched in availableDrillingOptions
  const drillingStandards = availableDrillingOptions || [];
  
  // Query for welding standards - already fetched in availableWeldingOptions
  const weldingStandards = availableWeldingOptions || [];

  // Generate operation designation
  const generateDesignation = (type: string, sequenceNum: number) => {
    const materialId = material.id || '000';
    return `${material.designation}-${materialId}-${type}-${sequenceNum}`;
  };

  // Convert time to hours for calculation
  const convertToHours = (time: number, unit: 'mins' | 'hours') => {
    return unit === 'mins' ? time / 60 : time;
  };

  // Calculate unit cost based on time and rate
  const calculateUnitCost = (timeFactor: number, timeUnit: 'mins' | 'hours', hourlyRate: number) => {
    const timeInHours = convertToHours(timeFactor, timeUnit);
    return Math.round(timeInHours * hourlyRate * 100) / 100; // Round to 2 decimals
  };

  // Calculate total cost
  const calculateTotalCost = (quantity: number, unitCost: number) => {
    return Math.round(quantity * unitCost * 100) / 100; // Round to 2 decimals
  };

  // Get available skill levels for selected labor category
  const getAvailableSkillLevels = (category: string) => {
    if (!category) return [];
    return Object.keys(LABOR_RATES[category as keyof typeof LABOR_RATES] || {});
  };

  // Update hourly rate when category or skill changes
  const updateHourlyRate = (category: string, skill: string) => {
    const rates = LABOR_RATES[category as keyof typeof LABOR_RATES];
    if (rates && rates[skill as keyof typeof rates]) {
      return rates[skill as keyof typeof rates];
    }
    return 0;
  };
  
  // Auto-populate from standards when all three dropdowns are selected
  React.useEffect(() => {
    if (operationCategory && operationMethod && operationComplexity) {
      // Extract the ID from the selected value (it's the last part after the last underscore)
      const parts = operationComplexity.split('_');
      const standardId = parts[parts.length - 1]; // Get the ID from the end
      
      let timeValue = 0;
      let equipmentName = '';
      let operationName = '';
      let standard = null;
      
      if (operationCategory === 'cutting' && cuttingStandards.length > 0) {
        // Find the specific standard by ID
        standard = cuttingStandards.find(s => s.id === parseInt(standardId));
        if (standard) {
          timeValue = parseFloat(standard.time_per_meter) || 0;
          equipmentName = standard.equipment || '';
          operationName = standard.name || `${standard.method?.replace(/_/g, ' ')} ${standard.complexity} ${standard.material_type?.replace(/_/g, ' ') || ''}`;
          setStandardApplied(`${standard.name || standard.complexity} (${timeValue} mins/m)`);
        }
      } else if (operationCategory === 'drilling' && drillingStandards.length > 0) {
        // Find the specific standard by ID
        standard = drillingStandards.find(s => s.id === parseInt(standardId));
        if (standard) {
          timeValue = parseFloat(standard.time_per_hole) || 0;
          equipmentName = standard.equipment || '';
          operationName = standard.name || `${standard.method?.replace(/_/g, ' ')} ${standard.diameter_min}-${standard.diameter_max}mm`;
          setStandardApplied(`${standard.name || `${standard.diameter_min}-${standard.diameter_max}mm`} (${timeValue} mins/hole)`);
        }
      } else if (operationCategory === 'welding' && weldingStandards.length > 0) {
        // Find the specific standard by ID
        standard = weldingStandards.find(s => s.id === parseInt(standardId));
        if (standard) {
          timeValue = parseFloat(standard.time_per_meter) || 0;
          equipmentName = standard.equipment || '';
          operationName = standard.name || `${standard.method} ${standard.weld_type?.replace(/_/g, ' ')} ${standard.size}mm`;
          setStandardApplied(`${standard.name || `${standard.weld_type?.replace(/_/g, ' ')} ${standard.size}mm`} (${timeValue} mins/m)`);
        }
      }
      
      if (timeValue > 0 || operationName) {
        const unitCost = calculateUnitCost(timeValue, 'mins', formData.hourlyRate || 65);
        const totalCost = calculateTotalCost(formData.quantity || 1, unitCost);
        
        setFormData(prev => ({
          ...prev,
          timeFactor: timeValue,
          timeUnit: 'mins',
          unitCost,
          totalCost,
          operationType: operationCategory,
          method: operationMethod,
          description: operationName || `${operationMethod?.replace(/_/g, ' ').toUpperCase()}`,
          includeInEquipment: !!equipmentName
        }));
      }
    }
  }, [operationCategory, operationMethod, operationComplexity, cuttingStandards, drillingStandards, weldingStandards]);

  // Create operation and component records
  const createOperationMutation = useMutation({
    mutationFn: async (data: Operation) => {
      // Debug log to see what we're sending
      console.log('Sending operation data:', JSON.stringify(data, null, 2));
      console.log('Critical fields check:', {
        projectId: data.projectId,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost: data.totalCost,
        hasProjectId: !!data.projectId,
        hasQuantity: data.quantity !== undefined && data.quantity !== null,
        hasUnitCost: data.unitCost !== undefined && data.unitCost !== null,
        hasTotalCost: data.totalCost !== undefined && data.totalCost !== null,
      });
      
      // Extract only the fields the backend expects
      const operationPayload = {
        projectId: data.projectId,
        materialDesignation: data.materialDesignation,
        materialId: data.materialId,
        operationType: data.operationType,
        description: data.description,
        operationDesignation: data.operationDesignation,
        quantity: data.quantity || 1,
        unitCost: data.unitCost || 0,
        totalCost: data.totalCost || 0,
        operationData: {
          timeFactor: data.timeFactor,
          timeUnit: data.timeUnit,
          laborCategory: data.laborCategory,
          skillLevel: data.skillLevel,
          hourlyRate: data.hourlyRate,
          method: data.method,
          position: data.position,
          standardApplied: data.standardApplied
        },
        method: data.method,
        position: data.position,
        includeInLabor: data.includeInLabor,
        includeInConsumables: data.includeInConsumables,
        includeInCoatings: data.includeInCoatings,
        includeInEquipment: data.includeInEquipment,
        sequenceOrder: data.sequenceOrder,
        notes: data.notes
      };
      
      // First create the operation record
      const operation = await apiRequest('/api/operations', 'POST', operationPayload);
      
      // Then create component records based on routing flags
      const promises = [];
      
      if (data.includeInLabor) {
        // Calculate labor hours based on time factor
        const timeInHours = convertToHours(data.timeFactor || 0, data.timeUnit || 'mins');
        const totalHours = timeInHours * (data.quantity || 1);
        
        const laborData = {
          projectId: data.projectId,
          designation: data.operationDesignation,
          parentMaterialId: data.materialId,
          operationId: operation.id,
          operationType: data.operationType,
          operationDesignation: data.operationDesignation,
          category: data.laborCategory || 'workshop',
          subcategory: 'fabrication',
          description: `${data.description} - Labor`,
          hours: totalHours,
          rate: data.hourlyRate || 65,
          totalCost: totalHours * (data.hourlyRate || 65),
          location: data.laborCategory === 'onsite' ? 'site' : 'workshop',
          skillLevel: data.skillLevel || 'standard',
        };
        promises.push(apiRequest('/api/estimation/labor', 'POST', laborData));
      }

      if (data.includeInConsumables) {
        const consumableData = {
          projectId: data.projectId,
          designation: data.operationDesignation,
          parentMaterialId: data.materialId,
          operationId: operation.id,
          operationType: data.operationType,
          item: `Consumables for ${data.operationType}`,
          category: data.operationType,
          quantity: data.quantity * (CUTTING_METHODS[data.method as keyof typeof CUTTING_METHODS]?.consumableRate || 0.05),
          unit: 'unit',
          unitCost: 50,
          totalCost: 0,
        };
        consumableData.totalCost = consumableData.quantity * consumableData.unitCost;
        promises.push(apiRequest('/api/estimation/consumables', 'POST', consumableData));
      }

      if (data.includeInEquipment) {
        // Get equipment name from standards or use operation type
        let equipmentName = '';
        if (operationCategory === 'cutting' && cuttingStandards[0]?.equipment) {
          equipmentName = cuttingStandards[0].equipment;
        } else if (operationCategory === 'drilling' && drillingStandards[0]?.equipment) {
          equipmentName = drillingStandards[0].equipment;
        } else if (operationCategory === 'welding' && weldingStandards[0]?.equipment) {
          equipmentName = weldingStandards[0].equipment;
        } else if (data.method) {
          equipmentName = `${data.method.toUpperCase()} Equipment`;
        } else {
          equipmentName = `${data.operationType} Equipment`;
        }
        
        // Calculate equipment duration based on time factor
        const equipmentHours = data.quantity * (data.timeFactor || 1) / 60; // Convert minutes to hours
        
        const equipmentData = {
          projectId: data.projectId,
          designation: data.operationDesignation,
          parentMaterialId: data.materialId,
          operationId: operation.id,
          operationType: data.operationType,
          equipment: equipmentName,
          type: 'inhouse',
          duration: equipmentHours,
          unit: 'hours',
          rate: 150,
          totalCost: 0,
        };
        equipmentData.totalCost = equipmentData.duration * equipmentData.rate;
        promises.push(apiRequest('/api/estimation/equipment', 'POST', equipmentData));
      }

      if (data.includeInSubcontractor) {
        const subcontractorData = {
          projectId: data.projectId,
          designation: data.operationDesignation,
          parentMaterialId: data.materialId,
          operationId: operation.id,
          operationType: data.operationType,
          companyName: 'TBD - Edit Company Name',
          scope: `${data.description} - Subcontracted`,
          quantity: data.quantity,
          unit: 'each',
          unitCost: data.unitCost,
          totalCost: data.totalCost,
          includesLabor: true,
        };
        promises.push(apiRequest('/api/estimation/subcontractor', 'POST', subcontractorData));
      }

      await Promise.all(promises);
      return operation;
    },
    onSuccess: () => {
      toast({ title: "Operation created successfully with component records" });
      queryClient.invalidateQueries({ queryKey: [`/api/operations/${projectId}`] });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Operation creation error:", error);
      console.error("Error details:", error.response || error.message || error);
      toast({ 
        title: "Error creating operation", 
        description: error.message || "Failed to create operation. Check console for details.",
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      projectId,
      materialId: material.id,
      materialDesignation: material.designation || '',
      operationType: '',
      operationDesignation: '',
      description: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      timeFactor: 0,
      timeUnit: 'mins',
      laborCategory: 'workshop',
      skillLevel: 'standard',
      hourlyRate: 65, // Default workshop standard rate
      includeInLabor: true,
      includeInConsumables: false,
      includeInCoatings: false,
      includeInEquipment: false,
      includeInSubcontractor: false,
    });
    setEditingOperation(null);
    setOperationCategory('');
    setOperationMethod('');
    setOperationComplexity('');
    setStandardApplied('');
  };

  const handleSubmit = () => {
    if (!formData.operationType || !formData.description) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in operation type and description",
        variant: "destructive" 
      });
      return;
    }

    if (!formData.timeFactor || formData.timeFactor <= 0) {
      toast({ 
        title: "Missing time factor", 
        description: "Please enter the time required for this operation",
        variant: "destructive" 
      });
      return;
    }

    // Validate and set default quantity
    const quantity = formData.quantity && formData.quantity > 0 ? formData.quantity : 1;
    
    // Auto-generate designation if not provided
    if (!formData.operationDesignation) {
      const existingOps = operations.filter(op => op.operationType === formData.operationType);
      formData.operationDesignation = generateDesignation(formData.operationType, existingOps.length + 1);
    }

    // Ensure costs are calculated based on time factor
    const unitCost = calculateUnitCost(
      formData.timeFactor || 0, 
      formData.timeUnit || 'mins', 
      formData.hourlyRate || 65
    );
    const totalCost = calculateTotalCost(quantity, unitCost);

    const finalData = {
      ...formData,
      quantity,
      unitCost,
      totalCost
    };

    createOperationMutation.mutate(finalData as Operation);
  };

  return (
    <div className="space-y-4">
      {/* Operations List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Operations for {material.designation}</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            disabled={!canCreateOperations}
            title={!canCreateOperations ? (isLoading ? "Materials are being saved..." : "Material must have valid database ID") : "Add new operation"}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isLoading ? "Saving Materials..." : "Add Operation"}
          </Button>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No operations added yet. Click "Add Operation" to create operations for this material.
            </div>
          ) : (
            <div className="space-y-3">
              {operations.map((operation, index) => (
                <div key={operation.id || index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge>{operation.operationDesignation}</Badge>
                      <span className="font-medium">{operation.description}</span>
                      <Badge variant="outline">{operation.operationType}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Qty: {operation.quantity} × ${operation.unitCost} = ${operation.totalCost}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingOperation(operation);
                          setFormData(operation);
                          setShowAddDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {operation.includeInLabor && <Badge variant="secondary">Labor</Badge>}
                    {operation.includeInConsumables && <Badge variant="secondary">Consumables</Badge>}
                    {operation.includeInEquipment && <Badge variant="secondary">Equipment</Badge>}
                    {operation.includeInCoatings && <Badge variant="secondary">Coatings</Badge>}
                    {operation.includeInSubcontractor && <Badge variant="secondary">Subcontractor</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Operation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? 'Edit Operation' : 'Add New Operation'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Operation Designation */}
            <div>
              <Label htmlFor="designation">Operation Designation (SED)</Label>
              <Input
                id="designation"
                value={formData.operationDesignation}
                onChange={(e) => setFormData({ ...formData, operationDesignation: e.target.value })}
                placeholder={`e.g., ${material.designation}-${material.id}-cut-1`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: [Material]-[ID]-[Operation]-[Sequence]. Leave blank to auto-generate.
              </p>
            </div>

            {/* Three-Dropdown System for Operations */}
            <div className="space-y-4">
              {/* Standard Applied Indicator */}
              {standardApplied && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Using Standard:</strong> {standardApplied}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                {/* Dropdown 1: Operation Category */}
                <div>
                  <Label htmlFor="category">Operation Type</Label>
                  <Select
                    value={operationCategory}
                    onValueChange={(value) => {
                      setOperationCategory(value);
                      setOperationMethod('');
                      setOperationComplexity('');
                      setStandardApplied('');
                      setFormData({ ...formData, operationType: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cutting">Cutting</SelectItem>
                      <SelectItem value="drilling">Drilling</SelectItem>
                      <SelectItem value="welding">Welding</SelectItem>
                      <SelectItem value="grinding">Grinding</SelectItem>
                      <SelectItem value="assembly">Assembly</SelectItem>
                      <SelectItem value="surface">Surface Treatment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dropdown 2: Method */}
                {operationCategory && (
                  <div>
                    <Label htmlFor="method">
                      {operationCategory === 'cutting' && 'Cutting Method'}
                      {operationCategory === 'drilling' && 'Drilling Method'}
                      {operationCategory === 'welding' && 'Welding Method'}
                      {!['cutting', 'drilling', 'welding'].includes(operationCategory) && 'Method'}
                    </Label>
                    <Select
                      value={operationMethod}
                      onValueChange={(value) => {
                        setOperationMethod(value);
                        setOperationComplexity('');
                        setStandardApplied('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {operationCategory === 'cutting' && (
                          <>
                            <SelectItem value="bandsaw">Bandsaw</SelectItem>
                            <SelectItem value="grinder_125">Grinder 125mm</SelectItem>
                            <SelectItem value="grinder_230">Grinder 230mm</SelectItem>
                            <SelectItem value="oxy_hand">Oxy-Fuel Hand Cut</SelectItem>
                            <SelectItem value="plasma_hand">Plasma Hand Cut</SelectItem>
                          </>
                        )}
                        {operationCategory === 'drilling' && (
                          <>
                            <SelectItem value="hand_drill">Hand Drill</SelectItem>
                            <SelectItem value="mag_drill">Mag Drill</SelectItem>
                            <SelectItem value="drill_press">Drill Press</SelectItem>
                            <SelectItem value="oxy_fuel">Oxy Fuel</SelectItem>
                            <SelectItem value="plasma_hand">Plasma Hand</SelectItem>
                          </>
                        )}
                        {operationCategory === 'welding' && (
                          <>
                            <SelectItem value="MIG">MIG</SelectItem>
                            <SelectItem value="TIG">TIG</SelectItem>
                            <SelectItem value="MMAW">MMAW (Stick)</SelectItem>
                            <SelectItem value="FCAW">FCAW (Flux Core)</SelectItem>
                          </>
                        )}
                        {operationCategory === 'grinding' && (
                          <>
                            <SelectItem value="angle_grinder">Angle Grinder</SelectItem>
                            <SelectItem value="bench_grinder">Bench Grinder</SelectItem>
                            <SelectItem value="surface_grinder">Surface Grinder</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dropdown 3: Complexity/Weld Type - Dynamic based on available standards */}
                {operationMethod && (
                  <div>
                    <Label htmlFor="complexity">
                      {operationCategory === 'welding' ? 'Weld Type' : 'Available Standards'}
                    </Label>
                    <Select
                      value={operationComplexity}
                      onValueChange={(value) => {
                        setOperationComplexity(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select standard..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operationCategory === 'cutting' && (
                          <>
                            {/* Show standards returned by the API (already filtered by method on backend) */}
                            {availableCuttingOptions.length > 0 ? (
                              availableCuttingOptions.map((option: any, idx: number) => {
                                // Create a unique value combining complexity and material_type  
                                const uniqueValue = `${option.complexity}_${option.material_type || 'general'}_${option.id}`;
                                const displayName = option.name || 
                                  `${option.complexity?.charAt(0).toUpperCase() + option.complexity?.slice(1)} - ${option.material_type?.replace(/_/g, ' ') || 'General'}`;
                                
                                return (
                                  <SelectItem key={`${option.id}`} value={uniqueValue}>
                                    {displayName}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="custom">No standards available - Enter manually</SelectItem>
                            )}
                          </>
                        )}
                        {operationCategory === 'drilling' && (
                          <>
                            {/* Show standards returned by the API (already filtered by method on backend) */}
                            {availableDrillingOptions.length > 0 ? (
                              availableDrillingOptions.map((option: any, idx: number) => {
                                const uniqueValue = `${option.diameter_min}_${option.diameter_max}_${option.material_type || 'general'}_${option.id}`;
                                const displayName = option.name || 
                                  `${option.diameter_min}-${option.diameter_max}mm ${option.material_type?.replace(/_/g, ' ') || ''}`;
                                
                                return (
                                  <SelectItem key={`${option.id}`} value={uniqueValue}>
                                    {displayName}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="custom">No standards available - Enter manually</SelectItem>
                            )}
                          </>
                        )}
                        {operationCategory === 'welding' && (
                          <>
                            {/* Show standards returned by the API (already filtered by method on backend) */}
                            {availableWeldingOptions.length > 0 ? (
                              availableWeldingOptions.map((option: any, idx: number) => {
                                const uniqueValue = `${option.weld_type}_${option.size}_${option.id}`;
                                const displayName = option.name || 
                                  `${option.weld_type?.replace(/_/g, ' ')} ${option.size}mm`;
                                
                                return (
                                  <SelectItem key={`${option.id}`} value={uniqueValue}>
                                    {displayName}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <>
                                <SelectItem value="fillet">Fillet</SelectItem>
                                <SelectItem value="butt_single_v">Butt Single V</SelectItem>
                                <SelectItem value="butt_double_v">Butt Double V</SelectItem>
                                <SelectItem value="seal">Seal</SelectItem>
                                <SelectItem value="plug">Plug</SelectItem>
                              </>
                            )}
                          </>
                        )}
                        {!['cutting', 'drilling', 'welding'].includes(operationCategory) && (
                          <>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="heavy">Heavy</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the operation..."
              />
            </div>

            {/* Time Factor and Labor Rate Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold">Time-Based Pricing</h3>
              
              {/* Time Factor Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeFactor">Time Factor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="timeFactor"
                      type="number"
                      step="0.1"
                      value={formData.timeFactor}
                      onChange={(e) => {
                        const timeFactor = parseFloat(e.target.value) || 0;
                        const unitCost = calculateUnitCost(timeFactor, formData.timeUnit || 'mins', formData.hourlyRate || 0);
                        const totalCost = calculateTotalCost(formData.quantity || 1, unitCost);
                        setFormData({ ...formData, timeFactor, unitCost, totalCost });
                      }}
                      placeholder="e.g., 10"
                    />
                    <Select
                      value={formData.timeUnit}
                      onValueChange={(value: 'mins' | 'hours') => {
                        const unitCost = calculateUnitCost(formData.timeFactor || 0, value, formData.hourlyRate || 0);
                        const totalCost = calculateTotalCost(formData.quantity || 1, unitCost);
                        setFormData({ ...formData, timeUnit: value, unitCost, totalCost });
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mins">mins</SelectItem>
                        <SelectItem value="hours">hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Time per operation (e.g., "10 mins per cut")
                  </p>
                </div>

                {/* Labor Category and Skill Level */}
                <div>
                  <Label>Labor Category & Skill</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.laborCategory}
                      onValueChange={(value: 'workshop' | 'onsite' | 'subcontractor') => {
                        const availableSkills = getAvailableSkillLevels(value);
                        const defaultSkill = availableSkills.includes(formData.skillLevel || '') 
                          ? formData.skillLevel 
                          : availableSkills[0];
                        const hourlyRate = updateHourlyRate(value, defaultSkill || '');
                        const unitCost = calculateUnitCost(formData.timeFactor || 0, formData.timeUnit || 'mins', hourlyRate);
                        const totalCost = calculateTotalCost(formData.quantity || 1, unitCost);
                        setFormData({ 
                          ...formData, 
                          laborCategory: value, 
                          skillLevel: defaultSkill,
                          hourlyRate,
                          unitCost,
                          totalCost
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="onsite">On Site</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={formData.skillLevel}
                      onValueChange={(value) => {
                        const hourlyRate = updateHourlyRate(formData.laborCategory || 'workshop', value);
                        const unitCost = calculateUnitCost(formData.timeFactor || 0, formData.timeUnit || 'mins', hourlyRate);
                        const totalCost = calculateTotalCost(formData.quantity || 1, unitCost);
                        setFormData({ 
                          ...formData, 
                          skillLevel: value,
                          hourlyRate,
                          unitCost,
                          totalCost
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableSkillLevels(formData.laborCategory || 'workshop').map(skill => (
                          <SelectItem key={skill} value={skill}>
                            {skill.charAt(0).toUpperCase() + skill.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected Rate: ${formData.hourlyRate}/hour
                  </p>
                </div>
              </div>

              {/* Time Display */}
              {formData.timeFactor && formData.timeFactor > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                  <span className="font-medium">Time Calculation: </span>
                  {formData.timeFactor} {formData.timeUnit} = {convertToHours(formData.timeFactor, formData.timeUnit || 'mins').toFixed(2)} hours × ${formData.hourlyRate}/hr = ${formData.unitCost} per operation
                </div>
              )}
            </div>

            {/* Quantity and Cost */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantity}
                  placeholder="1"
                  onChange={(e) => {
                    const quantity = parseFloat(e.target.value) || 1;
                    const totalCost = calculateTotalCost(quantity, formData.unitCost || 0);
                    setFormData({ ...formData, quantity, totalCost });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="unitCost">Unit Cost ($)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={formData.unitCost}
                  disabled
                  className="bg-gray-100"
                  title="Unit cost is auto-calculated from time factor × hourly rate"
                />
              </div>
              <div>
                <Label htmlFor="totalCost">Total Cost ($)</Label>
                <Input
                  id="totalCost"
                  type="number"
                  step="0.01"
                  value={formData.totalCost}
                  disabled
                  className="bg-gray-100"
                  title="Total cost = Quantity × Unit Cost"
                />
              </div>
            </div>

            {/* Component Routing */}
            <div>
              <Label>Generate Components In:</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includeInLabor}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeInLabor: checked })}
                  />
                  <Label>Labor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includeInConsumables}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeInConsumables: checked })}
                  />
                  <Label>Consumables</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includeInEquipment}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeInEquipment: checked })}
                  />
                  <Label>Equipment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includeInCoatings}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeInCoatings: checked })}
                  />
                  <Label>Coatings</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includeInSubcontractor}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeInSubcontractor: checked })}
                  />
                  <Label>Subcontractor</Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingOperation ? 'Update' : 'Create'} Operation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}