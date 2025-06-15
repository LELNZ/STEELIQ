import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Truck, Settings, Fuel, User } from "lucide-react";

interface EquipmentItem {
  id: string;
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
  equipment: EquipmentItem[];
  onUpdate: (equipment: EquipmentItem[]) => void;
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

export default function EnhancedEquipmentTab({ equipment, onUpdate }: EnhancedEquipmentTabProps) {
  const [newItem, setNewItem] = useState<Partial<EquipmentItem>>({
    equipmentType: 'inhouse',
    category: 'transport',
    hours: 0,
    rate: 45,
    fuelCost: 25,
    operatorCost: 55
  });

  const addEquipmentItem = () => {
    if (!newItem.name || !newItem.hours) return;

    const item: EquipmentItem = {
      id: `equipment-${Date.now()}`,
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

    onUpdate([...equipment, item]);
    setNewItem({
      equipmentType: 'inhouse',
      category: 'transport',
      hours: 0,
      rate: 45,
      fuelCost: 25,
      operatorCost: 55
    });
  };

  const updateEquipmentItem = (id: string, updates: Partial<EquipmentItem>) => {
    const updatedEquipment = equipment.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.totalCost = (updated.hours * updated.rate) + updated.fuelCost + updated.operatorCost;
        return updated;
      }
      return item;
    });
    onUpdate(updatedEquipment);
  };

  const removeEquipmentItem = (id: string) => {
    onUpdate(equipment.filter(item => item.id !== id));
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Enhanced Equipment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inhouse">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="inhouse">Inhouse Equipment</TabsTrigger>
              <TabsTrigger value="rental">Rental Equipment</TabsTrigger>
            </TabsList>

            <TabsContent value="inhouse" className="space-y-4">
              <div className="grid grid-cols-7 gap-4">
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
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rental" className="space-y-4">
              <div className="grid grid-cols-7 gap-4">
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
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Equipment Summary */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Equipment Items Table */}
      {equipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}