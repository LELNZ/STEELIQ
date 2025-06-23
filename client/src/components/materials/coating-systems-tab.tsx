import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Building2, Users, Filter, Search, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoatingSystem {
  id: number;
  name: string;
  type: "paint" | "galvanizing" | "powder_coating";
  category: "primer" | "topcoat" | "finish" | "protective";
  manufacturer?: string;
  productCode?: string;
  description?: string;
  coverage: number; // m2/L or m2/kg
  unitCost: number;
  unit: "L" | "kg" | "m2";
  dryTime?: number; // minutes
  coats: number;
  thickness?: number; // microns
  standard?: string;
  environment?: "interior" | "exterior" | "marine";
  isInhouse: boolean;
  supplier?: string;
  leadTime?: number;
  isActive: boolean;
}

export default function CoatingSystemsTab() {
  const [coatingSystems, setCoatingSystems] = useState<CoatingSystem[]>([
    {
      id: 1,
      name: "Epoxy Primer 2-Pack",
      type: "paint",
      category: "primer",
      manufacturer: "Dulux Protective Coatings",
      productCode: "EP2P-100",
      description: "High-build epoxy primer for structural steel",
      coverage: 8.5,
      unitCost: 45.20,
      unit: "L",
      dryTime: 240,
      coats: 1,
      thickness: 75,
      standard: "AS/NZS 2312",
      environment: "exterior",
      isInhouse: true,
      isActive: true
    },
    {
      id: 2,
      name: "Hot Dip Galvanizing",
      type: "galvanizing",
      category: "protective",
      description: "Hot dip galvanizing to AS/NZS 4680",
      coverage: 1.0,
      unitCost: 2.85,
      unit: "kg",
      coats: 1,
      thickness: 85,
      standard: "AS/NZS 4680",
      environment: "exterior",
      isInhouse: false,
      supplier: "Galvanizers Australia",
      leadTime: 14,
      isActive: true
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSystem, setEditingSystem] = useState<CoatingSystem | null>(null);
  const { toast } = useToast();

  const defaultSystem: Omit<CoatingSystem, 'id'> = {
    name: "",
    type: "paint",
    category: "primer",
    manufacturer: "",
    productCode: "",
    description: "",
    coverage: 0,
    unitCost: 0,
    unit: "L",
    dryTime: 0,
    coats: 1,
    thickness: 0,
    standard: "",
    environment: "exterior",
    isInhouse: true,
    supplier: "",
    leadTime: 0,
    isActive: true
  };

  const [newSystem, setNewSystem] = useState<Omit<CoatingSystem, 'id'>>(defaultSystem);

  const filteredSystems = coatingSystems.filter(system => {
    const matchesSearch = system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         system.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         system.productCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || system.type === filterType;
    return matchesSearch && matchesFilter && system.isActive;
  });

  const handleAddSystem = () => {
    if (!newSystem.name || newSystem.unitCost <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const system: CoatingSystem = {
      ...newSystem,
      id: Math.max(...coatingSystems.map(s => s.id), 0) + 1
    };

    setCoatingSystems([...coatingSystems, system]);
    setNewSystem(defaultSystem);
    setShowAddDialog(false);
    
    toast({
      title: "Coating System Added",
      description: `${system.name} has been added to the library`
    });
  };

  const handleEditSystem = (system: CoatingSystem) => {
    setEditingSystem(system);
    setNewSystem(system);
    setShowAddDialog(true);
  };

  const handleUpdateSystem = () => {
    if (!editingSystem) return;

    const updatedSystems = coatingSystems.map(system =>
      system.id === editingSystem.id ? { ...newSystem, id: editingSystem.id } : system
    );

    setCoatingSystems(updatedSystems);
    setEditingSystem(null);
    setNewSystem(defaultSystem);
    setShowAddDialog(false);
    
    toast({
      title: "Coating System Updated",
      description: `${newSystem.name} has been updated`
    });
  };

  const handleDeleteSystem = (id: number) => {
    const updatedSystems = coatingSystems.map(system =>
      system.id === id ? { ...system, isActive: false } : system
    );
    
    setCoatingSystems(updatedSystems);
    
    toast({
      title: "Coating System Removed",
      description: "Coating system has been deactivated"
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'paint': return 'bg-blue-100 text-blue-800';
      case 'galvanizing': return 'bg-zinc-100 text-zinc-800';
      case 'powder_coating': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primer': return 'bg-orange-100 text-orange-800';
      case 'topcoat': return 'bg-green-100 text-green-800';
      case 'finish': return 'bg-indigo-100 text-indigo-800';
      case 'protective': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Coating Systems</h2>
          <p className="text-gray-600">Manage paint systems, galvanizing, and powder coating specifications</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingSystem(null);
              setNewSystem(defaultSystem);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Coating System
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSystem ? 'Edit Coating System' : 'Add Coating System'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newSystem.name}
                    onChange={(e) => setNewSystem({...newSystem, name: e.target.value})}
                    placeholder="e.g., Epoxy Primer 2-Pack"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={newSystem.type} onValueChange={(value: any) => setNewSystem({...newSystem, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paint">Paint System</SelectItem>
                      <SelectItem value="galvanizing">Galvanizing</SelectItem>
                      <SelectItem value="powder_coating">Powder Coating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newSystem.category} onValueChange={(value: any) => setNewSystem({...newSystem, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primer">Primer</SelectItem>
                      <SelectItem value="topcoat">Topcoat</SelectItem>
                      <SelectItem value="finish">Finish</SelectItem>
                      <SelectItem value="protective">Protective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={newSystem.manufacturer}
                    onChange={(e) => setNewSystem({...newSystem, manufacturer: e.target.value})}
                    placeholder="e.g., Dulux Protective Coatings"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productCode">Product Code</Label>
                  <Input
                    id="productCode"
                    value={newSystem.productCode}
                    onChange={(e) => setNewSystem({...newSystem, productCode: e.target.value})}
                    placeholder="e.g., EP2P-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="coverage">Coverage *</Label>
                  <Input
                    id="coverage"
                    type="number"
                    step="0.1"
                    value={newSystem.coverage}
                    onChange={(e) => setNewSystem({...newSystem, coverage: parseFloat(e.target.value) || 0})}
                    placeholder="m²/L or m²/kg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost ($) *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={newSystem.unitCost}
                    onChange={(e) => setNewSystem({...newSystem, unitCost: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={newSystem.unit} onValueChange={(value: any) => setNewSystem({...newSystem, unit: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Litres (L)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="m2">Square Metres (m²)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="coats">Number of Coats</Label>
                  <Input
                    id="coats"
                    type="number"
                    min="1"
                    value={newSystem.coats}
                    onChange={(e) => setNewSystem({...newSystem, coats: parseInt(e.target.value) || 1})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="thickness">Thickness (microns)</Label>
                  <Input
                    id="thickness"
                    type="number"
                    value={newSystem.thickness}
                    onChange={(e) => setNewSystem({...newSystem, thickness: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="standard">Standard</Label>
                  <Input
                    id="standard"
                    value={newSystem.standard}
                    onChange={(e) => setNewSystem({...newSystem, standard: e.target.value})}
                    placeholder="e.g., AS/NZS 2312"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={newSystem.environment} onValueChange={(value: any) => setNewSystem({...newSystem, environment: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interior">Interior</SelectItem>
                      <SelectItem value="exterior">Exterior</SelectItem>
                      <SelectItem value="marine">Marine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newSystem.isInhouse}
                      onCheckedChange={(checked) => setNewSystem({...newSystem, isInhouse: checked})}
                    />
                    <Label>In-house work</Label>
                    {!newSystem.isInhouse && <Badge variant="outline">Subcontracted</Badge>}
                  </div>
                </div>
                
                {!newSystem.isInhouse && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        value={newSystem.supplier}
                        onChange={(e) => setNewSystem({...newSystem, supplier: e.target.value})}
                        placeholder="Subcontractor name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="leadTime">Lead Time (days)</Label>
                      <Input
                        id="leadTime"
                        type="number"
                        value={newSystem.leadTime}
                        onChange={(e) => setNewSystem({...newSystem, leadTime: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </>
                )}
                
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newSystem.description}
                    onChange={(e) => setNewSystem({...newSystem, description: e.target.value})}
                    placeholder="Additional details about the coating system"
                  />
                </div>
                
                <div className="col-span-3 flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={editingSystem ? handleUpdateSystem : handleAddSystem}>
                    {editingSystem ? 'Update' : 'Add'} Coating System
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search coating systems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="paint">Paint Systems</SelectItem>
            <SelectItem value="galvanizing">Galvanizing</SelectItem>
            <SelectItem value="powder_coating">Powder Coating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coating Systems Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Work Type</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSystems.map((system) => (
                <TableRow key={system.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{system.name}</p>
                      {system.manufacturer && (
                        <p className="text-sm text-gray-500">{system.manufacturer}</p>
                      )}
                      {system.productCode && (
                        <p className="text-xs text-gray-400">{system.productCode}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(system.type)}>
                      {system.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCategoryColor(system.category)}>
                      {system.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {system.coverage} m²/{system.unit}
                  </TableCell>
                  <TableCell>
                    ${system.unitCost.toFixed(2)}/{system.unit}
                  </TableCell>
                  <TableCell>
                    {system.isInhouse ? (
                      <Badge variant="secondary">
                        <Building2 className="w-3 h-3 mr-1" />
                        In-house
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {system.supplier || 'Subcontracted'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{system.standard || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSystem(system)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSystem(system.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredSystems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No coating systems found</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {coatingSystems.filter(s => s.type === 'paint' && s.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Paint Systems</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-600">
                {coatingSystems.filter(s => s.type === 'galvanizing' && s.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Galvanizing</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {coatingSystems.filter(s => s.type === 'powder_coating' && s.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Powder Coating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {coatingSystems.filter(s => s.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Total Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}