import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Zap, Wrench, Droplets, Palette, Bolt } from "lucide-react";

interface ConsumableItem {
  id: string;
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
  consumables: ConsumableItem[];
  onUpdate: (consumables: ConsumableItem[]) => void;
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

export default function EnhancedConsumablesTab({ consumables, onUpdate }: EnhancedConsumablesTabProps) {
  const [newItem, setNewItem] = useState<Partial<ConsumableItem>>({
    category: 'welding',
    itemType: 'welding_rod',
    specification: 'E7018',
    quantity: 0,
    unit: 'kg',
    unitCost: 0
  });

  const addConsumableItem = () => {
    if (!newItem.specification || !newItem.quantity) return;

    const item: ConsumableItem = {
      id: `consumable-${Date.now()}`,
      category: newItem.category || 'welding',
      itemType: newItem.itemType || 'welding_rod',
      specification: newItem.specification,
      quantity: newItem.quantity || 0,
      unit: newItem.unit || 'kg',
      unitCost: newItem.unitCost || 0,
      totalCost: (newItem.quantity || 0) * (newItem.unitCost || 0),
      notes: newItem.notes
    };

    onUpdate([...consumables, item]);
    setNewItem({
      category: 'welding',
      itemType: 'welding_rod',
      specification: 'E7018',
      quantity: 0,
      unit: 'kg',
      unitCost: 0
    });
  };

  const updateConsumableItem = (id: string, updates: Partial<ConsumableItem>) => {
    const updatedConsumables = consumables.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.totalCost = updated.quantity * updated.unitCost;
        return updated;
      }
      return item;
    });
    onUpdate(updatedConsumables);
  };

  const removeConsumableItem = (id: string) => {
    onUpdate(consumables.filter(item => item.id !== id));
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
            <TabsList className="grid grid-cols-5 w-full">
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
                <div className="grid grid-cols-6 gap-4">
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
      <div className="grid grid-cols-6 gap-4">
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

      {/* Consumables Items Table */}
      {consumables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Consumables Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumables.map((item) => {
                  const categoryData = CONSUMABLE_CATEGORIES[item.category as keyof typeof CONSUMABLE_CATEGORIES];
                  const Icon = categoryData?.icon || Zap;
                  
                  return (
                    <TableRow key={item.id}>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}