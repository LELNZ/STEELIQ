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
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ConsumptionRate {
  id: number;
  operation_type: string;
  operation_method?: string;
  material_type?: string;
  thickness_min?: number;
  thickness_max?: number;
  diameter_min?: number;
  diameter_max?: number;
  primary_consumable?: string;
  primary_consumable_rate?: number;
  primary_consumable_unit?: string;
  secondary_consumable?: string;
  secondary_consumable_rate?: number;
  secondary_consumable_unit?: string;
  tertiary_consumable?: string;
  tertiary_consumable_rate?: number;
  tertiary_consumable_unit?: string;
  consumables_details?: any;
  notes?: string;
  is_active: boolean;
  is_company_default: boolean;
  created_by?: number;
  created_at?: string;
  updated_by?: number;
  updated_at?: string;
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
  "per cut",
  "per hole",
  "per meter",
  "per m²",
  "per kg",
  "per hour",
  "per piece",
  "disc",
  "kg",
  "L",
  "tips",
  "pcs"
];

export default function ConsumptionRates() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ConsumptionRate | null>(null);
  const [formData, setFormData] = useState<Partial<ConsumptionRate>>({
    operation_type: "",
    primary_consumable: "",
    primary_consumable_rate: 0,
    primary_consumable_unit: "per cut",
    is_active: true,
    is_company_default: false,
  });

  // Fetch consumption rates
  const { data: rates, isLoading } = useQuery({
    queryKey: ['/api/consumption-rates', { activeOnly: false }],
    queryFn: async () => {
      const response = await fetch('/api/consumption-rates?activeOnly=false');
      if (!response.ok) throw new Error('Failed to fetch rates');
      return response.json() as Promise<ConsumptionRate[]>;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ConsumptionRate>) => {
      if (editingRate) {
        // Update existing rate
        return apiRequest(`/api/consumption-rates/${editingRate.id}`, 'PATCH', data);
      } else {
        // Create new rate
        return apiRequest('/api/consumption-rates', 'POST', data);
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
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return apiRequest(`/api/consumption-rates/${id}`, 'PATCH', { is_active });
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
      setFormData(rate);
    } else {
      setEditingRate(null);
      setFormData({
        operation_type: "",
        primary_consumable: "",
        primary_consumable_rate: 0,
        primary_consumable_unit: "per cut",
        is_active: true,
        is_company_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRate(null);
    setFormData({
      operation_type: "",
      primary_consumable: "",
      primary_consumable_rate: 0,
      primary_consumable_unit: "per cut",
      is_active: true,
      is_company_default: false,
    });
  };

  const handleSubmit = () => {
    if (!formData.operation_type || !formData.primary_consumable) {
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
    const { id, created_at, updated_at, created_by, updated_by, ...duplicateData } = rate;
    setEditingRate(null);
    setFormData({
      ...duplicateData,
      notes: `Duplicated from rate #${id}`,
    });
    setDialogOpen(true);
  };

  // Filter rates
  const filteredRates = rates?.filter(rate => {
    const matchesSearch = 
      rate.operation_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.primary_consumable?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || rate.operation_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

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
                        value={formData.operation_type || ""}
                        onValueChange={(value) => setFormData({...formData, operation_type: value})}
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
                        value={formData.operation_method || ""}
                        onChange={(e) => setFormData({...formData, operation_method: e.target.value})}
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
                        value={formData.primary_consumable || ""}
                        onChange={(e) => setFormData({...formData, primary_consumable: e.target.value})}
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
                        value={formData.primary_consumable_rate || ""}
                        onChange={(e) => setFormData({...formData, primary_consumable_rate: parseFloat(e.target.value)})}
                        placeholder="0.1"
                        data-testid="input-primary-rate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="primaryUnit">Unit *</Label>
                      <Select
                        value={formData.primary_consumable_unit || "per cut"}
                        onValueChange={(value) => setFormData({...formData, primary_consumable_unit: value})}
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
                        value={formData.secondary_consumable || ""}
                        onChange={(e) => setFormData({...formData, secondary_consumable: e.target.value})}
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
                        value={formData.secondary_consumable_rate || ""}
                        onChange={(e) => setFormData({...formData, secondary_consumable_rate: parseFloat(e.target.value)})}
                        data-testid="input-secondary-rate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="secondaryUnit">Unit</Label>
                      <Select
                        value={formData.secondary_consumable_unit || ""}
                        onValueChange={(value) => setFormData({...formData, secondary_consumable_unit: value})}
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
                        checked={formData.is_active !== undefined ? formData.is_active : true}
                        onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                        data-testid="switch-is-active"
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDefault"
                        checked={formData.is_company_default || false}
                        onCheckedChange={(checked) => setFormData({...formData, is_company_default: checked})}
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
          ) : filteredRates?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No consumption rates found. Click "Add Rate" to create your first rate.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Primary Consumable</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Secondary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRates?.map((rate) => (
                  <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                    <TableCell className="font-medium">
                      {rate.operation_type.charAt(0).toUpperCase() + rate.operation_type.slice(1).replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {rate.operation_method || "-"}
                    </TableCell>
                    <TableCell>
                      {rate.primary_consumable}
                    </TableCell>
                    <TableCell>
                      {rate.primary_consumable_rate} {rate.primary_consumable_unit}
                    </TableCell>
                    <TableCell>
                      {rate.secondary_consumable ? (
                        <span className="text-sm">
                          {rate.secondary_consumable} ({rate.secondary_consumable_rate} {rate.secondary_consumable_unit})
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rate.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ 
                            id: rate.id, 
                            is_active: checked 
                          })}
                          data-testid={`switch-active-${rate.id}`}
                        />
                        {rate.is_company_default && (
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