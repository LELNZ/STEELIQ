import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Search,
  Filter,
  Settings,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ConsumptionRate {
  id: number;
  operationType: string;
  method?: string;
  materialType?: string;
  thicknessMin?: number;
  thicknessMax?: number;
  diameterMin?: number;
  diameterMax?: number;
  laborHoursPerUnit?: number;
  laborUnit?: string;
  skillLevel?: string;
  crewSize?: number;
  primaryConsumable?: string;
  primaryConsumableRate?: number;
  primaryConsumableUnit?: string;
  secondaryConsumable?: string;
  secondaryConsumableRate?: number;
  secondaryConsumableUnit?: string;
  equipmentCostPerHour?: number;
  equipmentUtilization?: number;
  isCompanyDefault: boolean;
  isActive: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

const OPERATION_TYPES = [
  "cutting",
  "drilling", 
  "welding",
  "grinding",
  "blasting",
  "painting",
  "material_handling",
  "assembly"
];

const CONSUMABLE_UNITS = [
  // Rate-based units (most common)
  "per cut",
  "per hole",
  "per meter",
  "per m²",
  "per piece",
  "per hour",
  "per kg",
  
  // Quantity units
  "L",
  "L per cut",
  "L per hole", 
  "L per meter",
  "L per m²",
  "L per hour",
  
  // Disc/blade units
  "disc",
  "disc per cut",
  "disc per m²",
  "blade per cut",
  
  // Other units
  "kg",
  "pcs",
  "tips",
  "belt per m²"
];

export default function ConsumptionRates() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ConsumptionRate | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(OPERATION_TYPES);
  const [formData, setFormData] = useState<Partial<ConsumptionRate>>({
    operationType: "",
    primaryConsumable: "",
    primaryConsumableRate: 0,
    primaryConsumableUnit: "per cut",
    isActive: true,
    isCompanyDefault: false,
  });

  // Fetch consumption rates
  const { data: rates, isLoading } = useQuery({
    queryKey: ['/api/consumption-rates', { activeOnly: false }],
    queryFn: async () => {
      const response = await fetch('/api/consumption-rates?activeOnly=false', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch rates');
      return response.json() as Promise<ConsumptionRate[]>;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ConsumptionRate>) => {
      // Convert camelCase to snake_case for backend - only include defined fields
      const backendData: any = {};
      
      // Only add fields that are not undefined
      if (data.operationType !== undefined) backendData.operation_type = data.operationType;
      if (data.method !== undefined) backendData.method = data.method;
      if (data.materialType !== undefined) backendData.material_type = data.materialType;
      if (data.thicknessMin !== undefined) backendData.thickness_min = data.thicknessMin;
      if (data.thicknessMax !== undefined) backendData.thickness_max = data.thicknessMax;
      if (data.diameterMin !== undefined) backendData.diameter_min = data.diameterMin;
      if (data.diameterMax !== undefined) backendData.diameter_max = data.diameterMax;
      if (data.laborHoursPerUnit !== undefined) backendData.labor_hours_per_unit = data.laborHoursPerUnit;
      if (data.laborUnit !== undefined) backendData.labor_unit = data.laborUnit;
      if (data.skillLevel !== undefined) backendData.skill_level = data.skillLevel;
      if (data.crewSize !== undefined) backendData.crew_size = data.crewSize;
      if (data.primaryConsumable !== undefined) backendData.primary_consumable = data.primaryConsumable;
      if (data.primaryConsumableRate !== undefined) backendData.primary_consumable_rate = data.primaryConsumableRate;
      if (data.primaryConsumableUnit !== undefined) backendData.primary_consumable_unit = data.primaryConsumableUnit;
      if (data.secondaryConsumable !== undefined) backendData.secondary_consumable = data.secondaryConsumable;
      if (data.secondaryConsumableRate !== undefined) backendData.secondary_consumable_rate = data.secondaryConsumableRate;
      if (data.secondaryConsumableUnit !== undefined) backendData.secondary_consumable_unit = data.secondaryConsumableUnit;
      if (data.equipmentCostPerHour !== undefined) backendData.equipment_cost_per_hour = data.equipmentCostPerHour;
      if (data.equipmentUtilization !== undefined) backendData.equipment_utilization = data.equipmentUtilization;
      if (data.notes !== undefined) backendData.notes = data.notes;
      if (data.isActive !== undefined) backendData.is_active = data.isActive;
      if (data.isCompanyDefault !== undefined) backendData.is_company_default = data.isCompanyDefault;
      
      if (editingRate) {
        // Update existing rate
        return apiRequest(`/api/consumption-rates/${editingRate.id}`, 'PATCH', backendData);
      } else {
        // Create new rate
        return apiRequest('/api/consumption-rates', 'POST', backendData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/consumption-rates'] });
      toast({
        title: editingRate ? "Rate updated" : "Rate created",
        description: "Consumption rate has been saved successfully",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save consumption rate",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/consumption-rates/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/consumption-rates'] });
      toast({
        title: "Rate deleted",
        description: "Consumption rate has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete consumption rate",
        variant: "destructive",
      });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest(`/api/consumption-rates/${id}`, 'PATCH', { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/consumption-rates'] });
      toast({
        title: "Status updated",
        description: "Rate active status has been changed",
      });
    },
  });

  const handleOpenDialog = (rate?: ConsumptionRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        operationType: rate.operationType,
        method: rate.method,
        materialType: rate.materialType,
        thicknessMin: rate.thicknessMin,
        thicknessMax: rate.thicknessMax,
        diameterMin: rate.diameterMin,
        diameterMax: rate.diameterMax,
        laborHoursPerUnit: rate.laborHoursPerUnit,
        laborUnit: rate.laborUnit,
        skillLevel: rate.skillLevel,
        crewSize: rate.crewSize,
        primaryConsumable: rate.primaryConsumable,
        primaryConsumableRate: rate.primaryConsumableRate,
        primaryConsumableUnit: rate.primaryConsumableUnit || "per cut",
        secondaryConsumable: rate.secondaryConsumable,
        secondaryConsumableRate: rate.secondaryConsumableRate,
        secondaryConsumableUnit: rate.secondaryConsumableUnit || undefined,
        equipmentCostPerHour: rate.equipmentCostPerHour,
        equipmentUtilization: rate.equipmentUtilization,
        notes: rate.notes,  // Add the notes field here
        isActive: rate.isActive,
        isCompanyDefault: rate.isCompanyDefault,
      });
    } else {
      setEditingRate(null);
      setFormData({
        operationType: "",
        primaryConsumable: "",
        primaryConsumableRate: 0,
        primaryConsumableUnit: "per cut",
        isActive: true,
        isCompanyDefault: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRate(null);
    setFormData({
      operationType: "",
      primaryConsumable: "",
      primaryConsumableRate: 0,
      primaryConsumableUnit: "per cut",
      isActive: true,
      isCompanyDefault: false,
    });
  };

  const handleSubmit = () => {
    if (!formData.operationType || !formData.primaryConsumable) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDuplicate = (rate: ConsumptionRate) => {
    const { id, createdAt, updatedAt, createdBy, ...duplicateData } = rate;
    setEditingRate(null);
    setFormData({
      ...duplicateData,
    });
    setDialogOpen(true);
  };

  // Filter rates
  const filteredRates = rates?.filter(rate => {
    const matchesSearch = 
      rate.operationType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.primaryConsumable?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.materialType?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || rate.operationType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Group rates by operation type
  const groupedRates = filteredRates?.reduce((acc, rate) => {
    const type = rate.operationType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(rate);
    return acc;
  }, {} as Record<string, ConsumptionRate[]>);

  const toggleSection = (operationType: string) => {
    setExpandedSections(prev => 
      prev.includes(operationType) 
        ? prev.filter(t => t !== operationType)
        : [...prev, operationType]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Consumption Rates Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure consumption rates for materials and consumables used in operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-rates"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {OPERATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} data-testid="button-add-rate">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRate ? 'Edit Consumption Rate' : 'Add Consumption Rate'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure consumption rates for operations and materials
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="operationType">Operation Type *</Label>
                      <Select
                        value={formData.operationType || ""}
                        onValueChange={(value) => setFormData({...formData, operationType: value})}
                      >
                        <SelectTrigger id="operationType" data-testid="select-operation-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATION_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="operationMethod">Method (Optional)</Label>
                      <Input
                        id="operationMethod"
                        value={formData.method || ""}
                        onChange={(e) => setFormData({...formData, method: e.target.value})}
                        placeholder="e.g., Bandsaw, Gas Cut"
                        data-testid="input-operation-method"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="primaryConsumable">Primary Consumable *</Label>
                      <Input
                        id="primaryConsumable"
                        value={formData.primaryConsumable || ""}
                        onChange={(e) => setFormData({...formData, primaryConsumable: e.target.value})}
                        placeholder="e.g., Cutting disc"
                        data-testid="input-primary-consumable"
                      />
                    </div>

                    <div>
                      <Label htmlFor="primaryRate">Rate *</Label>
                      <Input
                        id="primaryRate"
                        type="number"
                        step="0.01"
                        value={formData.primaryConsumableRate || ""}
                        onChange={(e) => setFormData({...formData, primaryConsumableRate: parseFloat(e.target.value)})}
                        placeholder="0.1"
                        data-testid="input-primary-rate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="primaryUnit">Unit *</Label>
                      <Select
                        value={formData.primaryConsumableUnit || "per cut"}
                        onValueChange={(value) => setFormData({...formData, primaryConsumableUnit: value})}
                      >
                        <SelectTrigger id="primaryUnit" data-testid="select-primary-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONSUMABLE_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="secondaryConsumable">Secondary Consumable</Label>
                      <Input
                        id="secondaryConsumable"
                        value={formData.secondaryConsumable || ""}
                        onChange={(e) => setFormData({...formData, secondaryConsumable: e.target.value})}
                        placeholder="e.g., Coolant"
                        data-testid="input-secondary-consumable"
                      />
                    </div>

                    <div>
                      <Label htmlFor="secondaryRate">Rate</Label>
                      <Input
                        id="secondaryRate"
                        type="number"
                        step="0.01"
                        value={formData.secondaryConsumableRate || ""}
                        onChange={(e) => setFormData({...formData, secondaryConsumableRate: parseFloat(e.target.value)})}
                        data-testid="input-secondary-rate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="secondaryUnit">Unit</Label>
                      <Select
                        value={formData.secondaryConsumableUnit}
                        onValueChange={(value) => setFormData({...formData, secondaryConsumableUnit: value})}
                      >
                        <SelectTrigger id="secondaryUnit" data-testid="select-secondary-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONSUMABLE_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional notes or special conditions..."
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive !== undefined ? formData.isActive : true}
                        onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                        data-testid="switch-is-active"
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDefault"
                        checked={formData.isCompanyDefault || false}
                        onCheckedChange={(checked) => setFormData({...formData, isCompanyDefault: checked})}
                        data-testid="switch-is-default"
                      />
                      <Label htmlFor="isDefault">Company Default</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-rate">
                    {saveMutation.isPending ? "Saving..." : editingRate ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading consumption rates...
            </div>
          ) : !groupedRates || Object.keys(groupedRates).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No consumption rates found. Click "Add Rate" to create your first rate.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedRates).map(([operationType, operationRates]) => (
                <Collapsible
                  key={operationType}
                  open={expandedSections.includes(operationType)}
                  onOpenChange={() => toggleSection(operationType)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedSections.includes(operationType) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <h3 className="font-semibold">
                        {operationType.charAt(0).toUpperCase() + operationType.slice(1).replace('_', ' ')}
                      </h3>
                      <Badge variant="outline" className="ml-2">
                        {operationRates.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead>Diameter/Size</TableHead>
                          <TableHead>Primary Consumable</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Secondary</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operationRates.map((rate) => (
                          <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                            <TableCell>
                              {rate.method?.replace(/_/g, ' ') || "-"}
                            </TableCell>
                            <TableCell>
                              {rate.diameterMin && rate.diameterMax ? (
                                rate.diameterMin === rate.diameterMax 
                                  ? `${rate.diameterMin}mm`
                                  : `${rate.diameterMin}-${rate.diameterMax}mm`
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              {rate.primaryConsumable}
                            </TableCell>
                            <TableCell>
                              {rate.primaryConsumableRate} {rate.primaryConsumableUnit}
                            </TableCell>
                            <TableCell>
                              {rate.secondaryConsumable ? (
                                <span className="text-sm">
                                  {rate.secondaryConsumable} ({rate.secondaryConsumableRate} {rate.secondaryConsumableUnit})
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rate.isActive}
                                  onCheckedChange={(checked) => toggleActiveMutation.mutate({ 
                                    id: rate.id, 
                                    isActive: checked 
                                  })}
                                  data-testid={`switch-active-${rate.id}`}
                                />
                                {rate.isCompanyDefault && (
                                  <Badge variant="secondary" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDialog(rate)}
                                  data-testid={`button-edit-${rate.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDuplicate(rate)}
                                  data-testid={`button-duplicate-${rate.id}`}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this rate?')) {
                                      deleteMutation.mutate(rate.id);
                                    }
                                  }}
                                  data-testid={`button-delete-${rate.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Understanding Consumption Rates</CardTitle>
          <CardDescription>
            How consumption rates are used in estimations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Common Examples:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Cutting:</strong> 1 disc per 10 cuts (0.1 disc per cut)</li>
              <li><strong>Drilling:</strong> 1 drill bit per 100 holes (0.01 bit per hole)</li>
              <li><strong>Welding:</strong> 15L gas per hour, 1 tip per 5m weld</li>
              <li><strong>Grinding:</strong> 1 disc per 50kg material (0.02 disc per kg)</li>
              <li><strong>Painting:</strong> 0.35L paint per m² per coat</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Set company defaults for commonly used rates</li>
              <li>Use the method field to differentiate between equipment (e.g., Bandsaw vs Gas Cut)</li>
              <li>Secondary consumables are optional but help track all costs</li>
              <li>Deactivate old rates instead of deleting to maintain history</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}