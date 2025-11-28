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
import { Plus, Trash2, Zap, Wrench, Droplets, Palette, Bolt, Package, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConsumableItem {
  id: number; // Database-backed ID
  projectId: number;
  designation?: string; // Material designation (e.g., C1, B2, PL1)
  parentMaterialId?: number; // Reference to parent material for proper grouping
  operationId?: number; // Direct link to operation for tracking
  operationDesignation?: string; // Operation designation (e.g., C1-310-cut-1, B2-400-drill-2)
  operationType?: string; // Type of operation that created this consumable need
  category: string;
  itemType: string;
  specification: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

interface EnhancedConsumablesTabProps {
  projectId?: number;
  consumables: ConsumableItem[];
  setConsumables: (consumables: ConsumableItem[]) => void;
}

const CONSUMABLE_CATEGORIES = {
  welding: {
    icon: Zap,
    color: "text-blue-500",
    types: ['welding_rod', 'welding_wire', 'flux', 'shielding_gas'],
    specifications: {
      welding_rod: ['E7018', 'E6013', 'E7024', 'E308L', 'E316L'],
      welding_wire: ['ER70S-6', 'ER308L', 'ER316L', 'ER4043', 'ER5356'],
      flux: ['F7A2', 'F7A4', 'F7A6'],
      shielding_gas: ['Argon', 'CO2', 'Argon/CO2 Mix', 'Helium']
    },
    units: ['kg', 'rods', 'm³', 'bottles']
  },
  cutting: {
    icon: Wrench,
    color: "text-red-500",
    types: ['cutting_disc', 'grinding_disc', 'fibre_disc', 'plasma_consumables'],
    specifications: {
      cutting_disc: ['115mm x 1.2mm', '125mm x 1.2mm', '230mm x 2.0mm', '300mm x 3.0mm'],
      grinding_disc: ['115mm x 6mm', '125mm x 6mm', '180mm x 6mm'],
      fibre_disc: ['115mm P60', '125mm P80', '180mm P120'],
      plasma_consumables: ['40A Tips', '60A Tips', '80A Tips', 'Electrodes']
    },
    units: ['pieces', 'boxes', 'sets']
  },
  fasteners: {
    icon: Bolt,
    color: "text-gray-500",
    types: ['bolts', 'nuts', 'washers', 'chemical_anchors'],
    specifications: {
      bolts: ['M12x80', 'M16x100', 'M20x120', 'M24x150'],
      nuts: ['M12', 'M16', 'M20', 'M24'],
      washers: ['M12 Plain', 'M16 Spring', 'M20 Plain', 'M24 Spring'],
      chemical_anchors: ['M12x160', 'M16x200', 'M20x250', 'M24x300']
    },
    units: ['pieces', 'boxes', 'sets']
  },
  gas: {
    icon: Droplets,
    color: "text-green-500",
    types: ['compressed_gas', 'fuel_gas', 'inert_gas'],
    specifications: {
      compressed_gas: ['Oxygen', 'Acetylene', 'Propane', 'Nitrogen'],
      fuel_gas: ['LPG', 'Natural Gas', 'Acetylene'],
      inert_gas: ['Argon', 'Helium', 'CO2']
    },
    units: ['m³', 'bottles', 'cylinders']
  },
  paint: {
    icon: Palette,
    color: "text-purple-500",
    types: ['primer', 'topcoat', 'protective_coating', 'thinners'],
    specifications: {
      primer: ['Zinc Rich', 'Epoxy Primer', 'Etch Primer'],
      topcoat: ['Acrylic', 'Polyurethane', 'Epoxy'],
      protective_coating: ['Galvanizing', 'Hot Dip Galv', 'Powder Coating'],
      thinners: ['Standard Thinner', 'Slow Thinner', 'Fast Thinner']
    },
    units: ['litres', 'kg', 'cans']
  }
};

export default function EnhancedConsumablesTab({ projectId, consumables, setConsumables }: EnhancedConsumablesTabProps) {
  const { toast } = useToast();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<Partial<ConsumableItem>>({
    category: 'welding',
    itemType: 'welding_rod',
    specification: 'E7018',
    quantity: 0,
    unit: 'kg',
    unitCost: 0
  });

  // Fetch consumables from database
  const { data: consumableItems, isLoading, refetch } = useQuery({
    queryKey: ['/api/estimation/projects', projectId, 'consumables'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/estimation/projects/${projectId}/consumables`);
      if (!response.ok) throw new Error('Failed to fetch consumable items');
      return response.json();
    },
    enabled: !!projectId
  });

  // Sync database items with local state
  useEffect(() => {
    if (consumableItems && consumableItems.length > 0) {
      setConsumables(consumableItems);
    }
  }, [consumableItems, setConsumables]);

  // Create consumable item mutation
  const createConsumableMutation = useMutation({
    mutationFn: async (consumableData: Partial<ConsumableItem>) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      return apiRequest(`/api/estimation/projects/${projectId}/consumables`, {
        method: 'POST',
        body: JSON.stringify(consumableData)
      });
    },
    onSuccess: (newConsumable) => {
      // Add the new consumable item with database-generated ID
      const updatedConsumables = [...consumables, newConsumable];
      setConsumables(updatedConsumables);
      
      toast({
        title: "Consumable item created",
        description: "Consumable item has been saved to the database"
      });
      
      // Refetch to ensure sync
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating consumable item",
        description: error.message || "Failed to save consumable item",
        variant: "destructive"
      });
    }
  });

  // Update consumable item mutation
  const updateConsumableMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ConsumableItem> }) => {
      return apiRequest(`/api/estimation/consumables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: (updatedItem) => {
      // Update the local state
      const updatedConsumables = consumables.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      setConsumables(updatedConsumables);
      
      toast({
        title: "Consumable item updated",
        description: "Changes have been saved"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating consumable item",
        description: error.message || "Failed to update consumable item",
        variant: "destructive"
      });
    }
  });

  // Delete consumable item mutation
  const deleteConsumableMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/estimation/consumables/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, deletedId) => {
      // Remove from local state
      const updatedConsumables = consumables.filter(item => item.id !== deletedId);
      setConsumables(updatedConsumables);
      
      toast({
        title: "Consumable item deleted",
        description: "Consumable item has been removed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting consumable item",
        description: error.message || "Failed to delete consumable item",
        variant: "destructive"
      });
    }
  });

  // Group consumable items by parent material ID for true parent-child relationship
  const groupedConsumables = useMemo(() => {
    const groups: { [key: string]: { designation: string; items: ConsumableItem[] } } = {};
    
    consumables.forEach(item => {
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
    
    const result: { [key: string]: { designation: string; items: ConsumableItem[] } } = {};
    sortedGroups.forEach(key => {
      result[key] = groups[key];
    });
    
    return result;
  }, [consumables]);

  // Calculate summary for a group
  const getGroupSummary = (items: ConsumableItem[]) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const itemCount = items.length;
    
    return {
      totalQuantity,
      totalCost,
      itemCount
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
      setExpandedGroups(Object.keys(groupedConsumables));
    } else {
      setExpandedGroups([]);
    }
  };

  const addConsumableItem = () => {
    if (!newItem.specification || !newItem.quantity) return;

    const consumableData: Partial<ConsumableItem> = {
      projectId: projectId,
      category: newItem.category || 'welding',
      itemType: newItem.itemType || 'welding_rod',
      specification: newItem.specification,
      quantity: newItem.quantity || 0,
      unit: newItem.unit || 'kg',
      unitCost: newItem.unitCost || 0,
      totalCost: (newItem.quantity || 0) * (newItem.unitCost || 0),
      notes: newItem.notes
    };

    createConsumableMutation.mutate(consumableData);
    
    // Reset form
    setNewItem({
      category: 'welding',
      itemType: 'welding_rod',
      specification: 'E7018',
      quantity: 0,
      unit: 'kg',
      unitCost: 0
    });
  };

  const updateConsumableItem = (id: number, updates: Partial<ConsumableItem>) => {
    // Calculate totalCost if quantity or unitCost changes
    if (updates.quantity !== undefined || updates.unitCost !== undefined) {
      const item = consumables.find(c => c.id === id);
      if (item) {
        const quantity = updates.quantity !== undefined ? updates.quantity : item.quantity;
        const unitCost = updates.unitCost !== undefined ? updates.unitCost : item.unitCost;
        updates.totalCost = quantity * unitCost;
      }
    }
    
    updateConsumableMutation.mutate({ id, updates });
  };

  const removeConsumableItem = (id: number) => {
    deleteConsumableMutation.mutate(id);
  };

  const updateItemType = (category: string, itemType: string) => {
    const categoryData = CONSUMABLE_CATEGORIES[category as keyof typeof CONSUMABLE_CATEGORIES];
    const specifications = categoryData.specifications[itemType as keyof typeof categoryData.specifications];
    const units = categoryData.units;
    
    setNewItem(prev => ({
      ...prev,
      category,
      itemType,
      specification: specifications[0],
      unit: units[0]
    }));
  };

  const getCategoryTotal = (category: string) => {
    return consumables
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + item.totalCost, 0);
  };

  const getTotalConsumables = () => {
    return consumables.reduce((sum, item) => sum + item.totalCost, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading consumables...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Enhanced Consumables Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="welding">
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 w-full">
              {Object.entries(CONSUMABLE_CATEGORIES).map(([key, category]) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(CONSUMABLE_CATEGORIES).map(([categoryKey, categoryData]) => (
              <TabsContent key={categoryKey} value={categoryKey} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <Label>Item Type</Label>
                    <Select 
                      value={newItem.itemType} 
                      onValueChange={(value) => updateItemType(categoryKey, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryData.types.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Specification</Label>
                    <Select 
                      value={newItem.specification} 
                      onValueChange={(value) => setNewItem(prev => ({ ...prev, specification: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {newItem.itemType && categoryData.specifications[newItem.itemType as keyof typeof categoryData.specifications]?.map(spec => (
                          <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={newItem.quantity || 0}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label>Unit</Label>
                    <Select 
                      value={newItem.unit} 
                      onValueChange={(value) => setNewItem(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryData.units.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Unit Cost ($)</Label>
                    <Input
                      type="number"
                      value={newItem.unitCost || 0}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={() => {
                        setNewItem(prev => ({ ...prev, category: categoryKey }));
                        addConsumableItem();
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Consumables Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(CONSUMABLE_CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${category.color}`} />
                  <span className="text-sm font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </div>
                <div className="text-2xl font-bold">${getCategoryTotal(key).toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <div className="text-2xl font-bold">${getTotalConsumables().toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Consumables Items Grouped by Parent Designation */}
      {consumables.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Consumables Breakdown by Material Designation</CardTitle>
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
              {Object.entries(groupedConsumables).map(([materialId, group]) => {
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
                            {summary.itemCount} consumable{summary.itemCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            <Package className="inline h-4 w-4 mr-1" />
                            {summary.totalQuantity.toFixed(0)} items
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
                              <TableHead>Category</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Specification</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Unit Cost</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item) => {
                              const categoryData = CONSUMABLE_CATEGORIES[item.category as keyof typeof CONSUMABLE_CATEGORIES];
                              const Icon = categoryData?.icon || Zap;
                              
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground">
                                      {item.operationDesignation || '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Icon className={`h-4 w-4 ${categoryData?.color || 'text-gray-500'}`} />
                                      <Badge variant="outline">{item.category}</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>{item.itemType.replace('_', ' ')}</TableCell>
                                  <TableCell className="font-mono text-sm">{item.specification}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateConsumableItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                      className="w-20"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{item.unit}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={item.unitCost}
                                      onChange={(e) => updateConsumableItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })}
                                      className="w-20"
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">${item.totalCost.toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeConsumableItem(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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

export { EnhancedConsumablesTab };