import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Truck, Settings, Fuel, User, Clock, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EquipmentItem {
  id: number; // Database-backed ID
  projectId: number;
  designation?: string; // Material designation (e.g., C1, B2, PL1)
  parentMaterialId?: number; // Reference to parent material for proper grouping
  operationId?: number; // Direct link to operation for tracking
  operationDesignation?: string; // Operation designation (e.g., C1-310-cut-1, B2-400-drill-2)
  operationType?: string; // Type of operation that created this equipment need
  equipmentType: 'inhouse' | 'rental';
  category: string;
  name: string;
  hours: number;
  rate: number;
  totalCost: number;
  fuelCost: number;
  operatorCost: number;
  notes?: string;
}

interface EnhancedEquipmentTabProps {
  projectId?: number;
  equipment: EquipmentItem[];
  setEquipment: (equipment: EquipmentItem[]) => void;
}

const EQUIPMENT_CATEGORIES = {
  transport: ['truck', 'hiab', 'crane', 'trailer'],
  power: ['generator', 'compressor', 'power_pack'],
  fabrication: ['plasma', 'gouging', 'welding_machine', 'grinder', 'drill'],
  lifting: ['crane', 'hoist', 'winch', 'forklift'],
  safety: ['scaffolding', 'barriers', 'lighting']
};

const STANDARD_EQUIPMENT = {
  // Inhouse equipment with standard rates
  inhouse: {
    'truck': { rate: 45, fuelCost: 25, operatorCost: 55 },
    'hiab': { rate: 65, fuelCost: 35, operatorCost: 75 },
    'crane': { rate: 85, fuelCost: 45, operatorCost: 95 },
    'generator': { rate: 15, fuelCost: 12, operatorCost: 0 },
    'plasma': { rate: 25, fuelCost: 8, operatorCost: 0 },
    'welding_machine': { rate: 20, fuelCost: 5, operatorCost: 0 }
  },
  // Rental equipment with standard rates
  rental: {
    'truck': { rate: 80, fuelCost: 35, operatorCost: 75 },
    'hiab': { rate: 120, fuelCost: 45, operatorCost: 85 },
    'crane': { rate: 180, fuelCost: 65, operatorCost: 105 },
    'generator': { rate: 35, fuelCost: 18, operatorCost: 0 },
    'plasma': { rate: 55, fuelCost: 15, operatorCost: 0 },
    'welding_machine': { rate: 45, fuelCost: 10, operatorCost: 0 }
  }
};

export default function EnhancedEquipmentTab({ projectId, equipment, setEquipment }: EnhancedEquipmentTabProps) {
  const { toast } = useToast();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<Partial<EquipmentItem>>({
    equipmentType: 'inhouse',
    category: 'transport',
    hours: 0,
    rate: 45,
    fuelCost: 25,
    operatorCost: 55
  });

  // Fetch equipment items from database
  const { data: equipmentItems, isLoading, refetch } = useQuery({
    queryKey: ['/api/estimation/projects', projectId, 'equipment'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/estimation/projects/${projectId}/equipment`);
      if (!response.ok) throw new Error('Failed to fetch equipment items');
      return response.json();
    },
    enabled: !!projectId
  });

  // Sync database items with local state
  useEffect(() => {
    if (equipmentItems && equipmentItems.length > 0) {
      setEquipment(equipmentItems);
    }
  }, [equipmentItems, setEquipment]);

  // Create equipment item mutation
  const createEquipmentMutation = useMutation({
    mutationFn: async (equipmentData: Partial<EquipmentItem>) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      return apiRequest(`/api/estimation/projects/${projectId}/equipment`, {
        method: 'POST',
        body: JSON.stringify(equipmentData)
      });
    },
    onSuccess: (newEquipment) => {
      // Add the new equipment item with database-generated ID
      const updatedEquipment = [...equipment, newEquipment];
      setEquipment(updatedEquipment);
      
      toast({
        title: "Equipment item created",
        description: "Equipment item has been saved to the database"
      });
      
      // Refetch to ensure sync
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating equipment item",
        description: error.message || "Failed to save equipment item",
        variant: "destructive"
      });
    }
  });

  // Update equipment item mutation
  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<EquipmentItem> }) => {
      return apiRequest(`/api/estimation/equipment/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: (updatedItem) => {
      // Update the local state
      const updatedEquipment = equipment.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      setEquipment(updatedEquipment);
      
      toast({
        title: "Equipment item updated",
        description: "Changes have been saved"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating equipment item",
        description: error.message || "Failed to update equipment item",
        variant: "destructive"
      });
    }
  });

  // Delete equipment item mutation
  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/estimation/equipment/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, deletedId) => {
      // Remove from local state
      const updatedEquipment = equipment.filter(item => item.id !== deletedId);
      setEquipment(updatedEquipment);
      
      toast({
        title: "Equipment item deleted",
        description: "Equipment item has been removed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting equipment item",
        description: error.message || "Failed to delete equipment item",
        variant: "destructive"
      });
    }
  });

  // Group equipment items by parent material ID for true parent-child relationship
  const groupedEquipment = useMemo(() => {
    const groups: { [key: string]: { designation: string; items: EquipmentItem[] } } = {};
    
    equipment.forEach(item => {
      // Use parentMaterialId as primary grouping key, fallback to designation
      const groupKey = item.parentMaterialId ? item.parentMaterialId.toString() : (item.designation || 'Unassigned');
      const displayDesignation = item.designation || 'Unassigned';
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          designation: displayDesignation,
          items: []
        };
      }
      groups[groupKey].items.push(item);
    });
    
    // Sort groups by designation
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const desA = groups[a].designation;
      const desB = groups[b].designation;
      return desA.localeCompare(desB);
    });
    
    const result: { [key: string]: { designation: string; items: EquipmentItem[] } } = {};
    sortedGroups.forEach(key => {
      result[key] = groups[key];
    });
    
    return result;
  }, [equipment]);

  // Calculate summary for a group
  const getGroupSummary = (items: EquipmentItem[]) => {
    const totalHours = items.reduce((sum, item) => sum + item.hours, 0);
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const equipmentCount = items.length;
    
    return {
      totalHours,
      totalCost,
      equipmentCount
    };
  };

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(key => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  // Toggle all groups
  const toggleAllGroups = (expand: boolean) => {
    if (expand) {
      setExpandedGroups(Object.keys(groupedEquipment));
    } else {
      setExpandedGroups([]);
    }
  };

  const addEquipmentItem = async () => {
    if (!newItem.name || !newItem.hours) return;
    
    if (!projectId) {
      toast({
        title: "Cannot add equipment item",
        description: "No project selected. Please select a project first.",
        variant: "destructive"
      });
      return;
    }

    const equipmentData = {
      equipmentType: newItem.equipmentType as EquipmentItem['equipmentType'],
      category: newItem.category || 'transport',
      name: newItem.name,
      hours: newItem.hours || 0,
      rate: newItem.rate || 45,
      totalCost: ((newItem.hours || 0) * (newItem.rate || 45)) + (newItem.fuelCost || 0) + (newItem.operatorCost || 0),
      fuelCost: newItem.fuelCost || 0,
      operatorCost: newItem.operatorCost || 0,
      notes: newItem.notes
    };

    // Create in database - will get back item with database-generated ID
    await createEquipmentMutation.mutate(equipmentData);
    
    // Reset form
    setNewItem({
      equipmentType: 'inhouse',
      category: 'transport',
      hours: 0,
      rate: 45,
      fuelCost: 25,
      operatorCost: 55,
      name: ''
    });
  };

  const updateEquipmentItem = (id: number, updates: Partial<EquipmentItem>) => {
    // Calculate total cost if hours, rate, fuel or operator cost changed
    if (updates.hours !== undefined || updates.rate !== undefined || 
        updates.fuelCost !== undefined || updates.operatorCost !== undefined) {
      const item = equipment.find(i => i.id === id);
      if (item) {
        const hours = updates.hours !== undefined ? updates.hours : item.hours;
        const rate = updates.rate !== undefined ? updates.rate : item.rate;
        const fuelCost = updates.fuelCost !== undefined ? updates.fuelCost : item.fuelCost;
        const operatorCost = updates.operatorCost !== undefined ? updates.operatorCost : item.operatorCost;
        updates.totalCost = (hours * rate) + fuelCost + operatorCost;
      }
    }
    
    updateEquipmentMutation.mutate({ id, updates });
  };

  const removeEquipmentItem = (id: number) => {
    deleteEquipmentMutation.mutate(id);
  };

  const updateStandardRates = (equipmentType: 'inhouse' | 'rental', category: string) => {
    const standardRates = STANDARD_EQUIPMENT[equipmentType][category as keyof typeof STANDARD_EQUIPMENT.inhouse];
    if (standardRates) {
      setNewItem(prev => ({
        ...prev,
        equipmentType,
        rate: standardRates.rate,
        fuelCost: standardRates.fuelCost,
        operatorCost: standardRates.operatorCost
      }));
    }
  };

  const getCategoryTotal = (equipmentType: string) => {
    return equipment
      .filter(item => item.equipmentType === equipmentType)
      .reduce((sum, item) => sum + item.totalCost, 0);
  };

  const getTotalEquipment = () => {
    return equipment.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const getAllCategories = () => {
    return Object.values(EQUIPMENT_CATEGORIES).flat();
  };

  const isCreating = createEquipmentMutation.isPending;
  const isUpdating = updateEquipmentMutation.isPending;
  const isDeleting = deleteEquipmentMutation.isPending;
  const isAnyOperationPending = isCreating || isUpdating || isDeleting || isLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Enhanced Equipment Management
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inhouse">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="inhouse">Inhouse Equipment</TabsTrigger>
              <TabsTrigger value="rental">Rental Equipment</TabsTrigger>
            </TabsList>

            <TabsContent value="inhouse" className="space-y-4">
              {!projectId && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                  <p className="text-sm text-yellow-800">
                    No project selected. Please select a project to add equipment items.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={newItem.category} 
                    onValueChange={(value) => {
                      setNewItem(prev => ({ ...prev, category: value }));
                      updateStandardRates('inhouse', value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllCategories().map(cat => (
                        <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Equipment Name</Label>
                  <Input
                    placeholder="Equipment name"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    value={newItem.hours || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Rate ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.rate || 45}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 45 }))}
                  />
                </div>

                <div>
                  <Label>Fuel Cost ($)</Label>
                  <Input
                    type="number"
                    value={newItem.fuelCost || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, fuelCost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Operator ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.operatorCost || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, operatorCost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={() => {
                      setNewItem(prev => ({ ...prev, equipmentType: 'inhouse' }));
                      addEquipmentItem();
                    }}
                    disabled={!projectId || isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rental" className="space-y-4">
              {!projectId && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                  <p className="text-sm text-yellow-800">
                    No project selected. Please select a project to add equipment items.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={newItem.category} 
                    onValueChange={(value) => {
                      setNewItem(prev => ({ ...prev, category: value }));
                      updateStandardRates('rental', value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllCategories().map(cat => (
                        <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Equipment Name</Label>
                  <Input
                    placeholder="Rental equipment name"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    value={newItem.hours || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Rental Rate ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.rate || 80}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 80 }))}
                  />
                </div>

                <div>
                  <Label>Fuel Cost ($)</Label>
                  <Input
                    type="number"
                    value={newItem.fuelCost || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, fuelCost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Operator ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.operatorCost || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, operatorCost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={() => {
                      setNewItem(prev => ({ ...prev, equipmentType: 'rental' }));
                      addEquipmentItem();
                    }}
                    disabled={!projectId || isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Equipment Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Inhouse Equipment</span>
            </div>
            <div className="text-2xl font-bold">${getCategoryTotal('inhouse').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Rental Equipment</span>
            </div>
            <div className="text-2xl font-bold">${getCategoryTotal('rental').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Total Equipment</span>
            </div>
            <div className="text-2xl font-bold">${getTotalEquipment().toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Items Grouped by Parent Designation */}
      {equipment.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Equipment Breakdown by Material Designation</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleAllGroups(true)}
                >
                  Expand All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleAllGroups(false)}
                >
                  Collapse All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" value={expandedGroups} className="w-full">
              {Object.entries(groupedEquipment).map(([materialId, group]) => {
                const summary = getGroupSummary(group.items);
                return (
                  <AccordionItem key={materialId} value={materialId}>
                    <AccordionTrigger onClick={() => toggleGroup(materialId)}>
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Badge className="text-sm font-semibold">
                            {group.designation}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {summary.equipmentCount} equipment item{summary.equipmentCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            <Clock className="inline h-4 w-4 mr-1" />
                            {summary.totalHours.toFixed(1)} hrs
                          </span>
                          <span className="text-sm font-medium">
                            ${summary.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Operation</TableHead>
                              <TableHead>Op Type</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Rate</TableHead>
                              <TableHead>Fuel</TableHead>
                              <TableHead>Operator</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <span className="text-xs font-mono">
                                    {item.operationDesignation || '-'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">
                                    {item.operationType || '-'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={item.equipmentType === 'inhouse' ? 'default' : 'secondary'}>
                                    {item.equipmentType}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{item.category}</Badge>
                                </TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.hours}
                                    onChange={(e) => updateEquipmentItem(item.id, { hours: parseFloat(e.target.value) || 0 })}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => updateEquipmentItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Fuel className="h-3 w-3" />
                                    <Input
                                      type="number"
                                      value={item.fuelCost}
                                      onChange={(e) => updateEquipmentItem(item.id, { fuelCost: parseFloat(e.target.value) || 0 })}
                                      className="w-16"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <Input
                                      type="number"
                                      value={item.operatorCost}
                                      onChange={(e) => updateEquipmentItem(item.id, { operatorCost: parseFloat(e.target.value) || 0 })}
                                      className="w-16"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">${item.totalCost.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEquipmentItem(item.id)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}