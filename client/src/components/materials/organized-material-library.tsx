import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Material, ConnectionComponent } from "@shared/schema";
import { Search, Package, Edit, Trash2, DollarSign, Plus, Wrench, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface OrganizedMaterialLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function OrganizedMaterialLibrary({ 
  searchQuery, 
  setSearchQuery 
}: OrganizedMaterialLibraryProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials", searchQuery],
  });

  const filteredMaterials = materials?.filter(material => {
    const matchesSearch = !searchQuery || 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.grade?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === "all") return matchesSearch;
    
    // Categorize materials based on their codes and names
    const category = getMaterialCategory(material);
    return matchesSearch && category === activeCategory;
  });

  function getMaterialCategory(material: Material): string {
    const code = material.code.toUpperCase();
    const name = material.name.toLowerCase();
    
    if (code.startsWith('SHS') || name.includes('square hollow')) return 'shs';
    if (code.startsWith('RHS') || name.includes('rectangular hollow')) return 'rhs';
    if (code.startsWith('SF') || name.includes('flat')) return 'flats';
    if (code.startsWith('SA') || name.includes('equal angle')) return 'angles';
    if (code.startsWith('SUA') || name.includes('unequal angle')) return 'angles';
    if (code.startsWith('SR') || name.includes('round')) return 'rounds';
    if (code.startsWith('SQ') || name.includes('square bar')) return 'squares';
    if (code.startsWith('SC') || name.includes('channel')) return 'channels';
    if (code.startsWith('CONS') || name.includes('consumable') || material.category === 'Consumables') return 'consumables';
    if (code.startsWith('PL') || name.includes('plate')) return 'plates';
    if (code.startsWith('SH') || code.startsWith('GSH') || code.startsWith('EGS') || name.includes('sheet')) return 'sheets';
    if (code.includes('PIPE') || name.includes('pipe')) return 'pipes';
    
    return 'other';
  }

  // Fetch connection components count
  const { data: connectionComponents } = useQuery<ConnectionComponent[]>({
    queryKey: ["/api/connection-components"],
  });

  const materialCategories = [
    { id: 'all', label: 'All Materials', count: materials?.length || 0 },
    { id: 'shs', label: 'SHS', count: materials?.filter(m => getMaterialCategory(m) === 'shs').length || 0 },
    { id: 'rhs', label: 'RHS', count: materials?.filter(m => getMaterialCategory(m) === 'rhs').length || 0 },
    { id: 'flats', label: 'Flats', count: materials?.filter(m => getMaterialCategory(m) === 'flats').length || 0 },
    { id: 'angles', label: 'Angles', count: materials?.filter(m => getMaterialCategory(m) === 'angles').length || 0 },
    { id: 'rounds', label: 'Rounds', count: materials?.filter(m => getMaterialCategory(m) === 'rounds').length || 0 },
    { id: 'squares', label: 'Squares', count: materials?.filter(m => getMaterialCategory(m) === 'squares').length || 0 },
    { id: 'channels', label: 'Channels', count: materials?.filter(m => getMaterialCategory(m) === 'channels').length || 0 },
    { id: 'plates', label: 'Plates', count: materials?.filter(m => getMaterialCategory(m) === 'plates').length || 0 },
    { id: 'sheets', label: 'Sheets', count: materials?.filter(m => getMaterialCategory(m) === 'sheets').length || 0 },
    { id: 'pipes', label: 'Pipes', count: materials?.filter(m => getMaterialCategory(m) === 'pipes').length || 0 },
    { id: 'consumables', label: 'Consumables', count: materials?.filter(m => getMaterialCategory(m) === 'consumables').length || 0 },
    { id: 'connections', label: 'Connections', count: connectionComponents?.length || 0 },
    { id: 'other', label: 'Other', count: materials?.filter(m => getMaterialCategory(m) === 'other').length || 0 },
  ].filter(cat => cat.count > 0 || cat.id === 'all' || cat.id === 'connections');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by material name, code, or grade..."
          className="pl-10 w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Material Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 mb-6">
          {materialCategories.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="text-xs px-2 py-1"
            >
              <div className="flex flex-col items-center">
                <span>{category.label}</span>
                <Badge variant="secondary" className="text-xs mt-1">
                  {category.count}
                </Badge>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="space-y-4">
          {activeCategory === 'consumables' ? (
            <ConsumablesTab materials={filteredMaterials?.filter(m => getMaterialCategory(m) === 'consumables') || []} />
          ) : activeCategory === 'connections' ? (
            <ConnectionComponentsTab connectionComponents={connectionComponents || []} />
          ) : filteredMaterials && filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMaterials.map((material) => (
                <Card key={material.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium leading-tight">
                          {material.name}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {material.code}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {material.width && (
                        <div>
                          <p className="text-muted-foreground">Width</p>
                          <p className="font-medium">{material.width}mm</p>
                        </div>
                      )}
                      {material.thickness && (
                        <div>
                          <p className="text-muted-foreground">Thickness</p>
                          <p className="font-medium">{material.thickness}mm</p>
                        </div>
                      )}
                      {material.diameter && (
                        <div>
                          <p className="text-muted-foreground">Diameter</p>
                          <p className="font-medium">{material.diameter}mm</p>
                        </div>
                      )}
                      {material.height && (
                        <div>
                          <p className="text-muted-foreground">Height</p>
                          <p className="font-medium">{material.height}mm</p>
                        </div>
                      )}
                    </div>

                    {/* Weight */}
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Weight</p>
                        <p className="font-medium">{material.weightPerMeter || 0} kg/m</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">Grade</p>
                        <p className="font-medium">{material.grade || 'Standard'}</p>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center justify-between border-t pt-2">
                      <div className="flex items-center space-x-4 text-sm">
                        {material.pricePerMeter && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="font-medium text-green-600">
                              ${material.pricePerMeter}/m
                            </span>
                          </div>
                        )}
                        {material.pricePerKg && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-600">
                              ${material.pricePerKg}/kg
                            </span>
                          </div>
                        )}
                        {!material.pricePerMeter && !material.pricePerKg && (
                          <span className="text-xs text-muted-foreground">No pricing</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No materials found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? `No materials match "${searchQuery}" in ${activeCategory === 'all' ? 'any category' : materialCategories.find(c => c.id === activeCategory)?.label}`
                    : `No materials in ${activeCategory === 'all' ? 'library' : materialCategories.find(c => c.id === activeCategory)?.label} category`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Consumables Tab Component with Add functionality
function ConsumablesTab({ materials }: { materials: Material[] }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "Consumables",
    unitCost: 0,
    supplier: "",
    grade: "",
    standard: "",
    notes: ""
  });

  const addConsumableMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to add consumable");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsAddDialogOpen(false);
      setFormData({
        code: "",
        name: "",
        category: "Consumables",
        unitCost: 0,
        supplier: "",
        grade: "",
        standard: "",
        notes: ""
      });
      toast({
        title: "Success",
        description: "Consumable added successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add consumable",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConsumableMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Consumables & Supplies</h3>
          <p className="text-sm text-muted-foreground">
            Welding electrodes, cutting discs, fasteners, gas, and safety equipment
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Consumable
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Consumable</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. CONS-WEL-001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. 7018 Welding Electrodes 3.2mm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitCost">Unit Cost ($) *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="e.g. ASMUSS Steel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    placeholder="e.g. E7018"
                  />
                </div>
                <div>
                  <Label htmlFor="standard">Standard</Label>
                  <Input
                    id="standard"
                    value={formData.standard}
                    onChange={(e) => setFormData(prev => ({ ...prev, standard: e.target.value }))}
                    placeholder="e.g. AWS A5.1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details about the consumable"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addConsumableMutation.isPending}>
                  {addConsumableMutation.isPending ? "Adding..." : "Add Consumable"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Consumables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.length > 0 ? (
          materials.map((material) => (
            <Card key={material.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">{material.code}</CardTitle>
                  </div>
                  <Badge variant="secondary">Consumable</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{material.name}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {material.unitCost && (
                    <div>
                      <p className="text-sm text-muted-foreground">Unit Cost</p>
                      <p className="font-medium text-lg">${material.unitCost}</p>
                    </div>
                  )}
                  
                  {material.grade && (
                    <div>
                      <p className="text-sm text-muted-foreground">Grade</p>
                      <p className="font-medium">{material.grade}</p>
                    </div>
                  )}
                  
                  {material.supplier && (
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">{material.supplier}</p>
                    </div>
                  )}
                  
                  {material.standard && (
                    <div>
                      <p className="text-sm text-muted-foreground">Standard</p>
                      <p className="font-medium">{material.standard}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No consumables found</p>
            <p className="text-sm text-muted-foreground">Add welding electrodes, cutting discs, and other supplies</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Connection Components Tab Component with Add functionality
function ConnectionComponentsTab({ connectionComponents }: { connectionComponents: ConnectionComponent[] }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    component_type: "end_plate",
    section_compatibility: "",
    name: "",
    height: 0,
    width: 0,
    thickness: 0,
    weld_time_per_hour: 0,
    material_grade: "250",
    category: "Connection Components",
    subcategory: "",
    standard: "AS/NZS",
    specification: "",
    notes: ""
  });

  const addComponentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/connection-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to add connection component");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-components"] });
      setIsAddDialogOpen(false);
      setFormData({
        component_type: "end_plate",
        section_compatibility: "",
        name: "",
        height: 0,
        width: 0,
        thickness: 0,
        weld_time_per_hour: 0,
        material_grade: "250",
        category: "Connection Components",
        subcategory: "",
        standard: "AS/NZS",
        specification: "",
        notes: ""
      });
      toast({
        title: "Success",
        description: "Connection component added successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add connection component",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addComponentMutation.mutate(formData);
  };

  // Filter components by type
  const filteredComponents = connectionComponents?.filter(component => {
    if (selectedType === "all") return true;
    return component.component_type === selectedType;
  });

  // Group components by type for display
  const componentTypes = [
    { id: "all", label: "All Components", count: connectionComponents?.length || 0 },
    { id: "end_plate", label: "End Plates", count: connectionComponents?.filter(c => c.component_type === "end_plate").length || 0 },
    { id: "stiffener_plate", label: "Stiffener Plates", count: connectionComponents?.filter(c => c.component_type === "stiffener_plate").length || 0 },
    { id: "base_plate", label: "Base Plates", count: connectionComponents?.filter(c => c.component_type === "base_plate").length || 0 },
    { id: "cleat", label: "Cleats", count: connectionComponents?.filter(c => c.component_type === "cleat").length || 0 },
  ].filter(type => type.count > 0 || type.id === "all");

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Connection Components Library</h3>
          <p className="text-sm text-muted-foreground">
            Standard connection components with exact dimensions and weld times
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-connection">
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Add New Connection Component</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="component_type">Component Type *</Label>
                  <Select 
                    value={formData.component_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, component_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_plate">End Plate</SelectItem>
                      <SelectItem value="stiffener_plate">Stiffener Plate</SelectItem>
                      <SelectItem value="base_plate">Base Plate</SelectItem>
                      <SelectItem value="cleat">Cleat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="section_compatibility">Section Compatibility *</Label>
                  <Input
                    id="section_compatibility"
                    value={formData.section_compatibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, section_compatibility: e.target.value }))}
                    placeholder="e.g. 150UB, 200UC, ALL"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Component Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. End Plate for 150UB18.0"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="height">Height (mm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (mm) *</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={formData.width}
                    onChange={(e) => setFormData(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="thickness">Thickness (mm) *</Label>
                  <Input
                    id="thickness"
                    type="number"
                    step="0.1"
                    value={formData.thickness}
                    onChange={(e) => setFormData(prev => ({ ...prev, thickness: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weld_time_per_hour">Weld Time (h/h)</Label>
                  <Input
                    id="weld_time_per_hour"
                    type="number"
                    step="0.001"
                    value={formData.weld_time_per_hour}
                    onChange={(e) => setFormData(prev => ({ ...prev, weld_time_per_hour: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g. 0.325"
                  />
                </div>
                <div>
                  <Label htmlFor="material_grade">Material Grade</Label>
                  <Input
                    id="material_grade"
                    value={formData.material_grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, material_grade: e.target.value }))}
                    placeholder="e.g. 250"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="standard">Standard</Label>
                  <Input
                    id="standard"
                    value={formData.standard}
                    onChange={(e) => setFormData(prev => ({ ...prev, standard: e.target.value }))}
                    placeholder="e.g. AS/NZS 1554"
                  />
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="e.g. Heavy Duty"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specification">Specification</Label>
                <Textarea
                  id="specification"
                  value={formData.specification}
                  onChange={(e) => setFormData(prev => ({ ...prev, specification: e.target.value }))}
                  placeholder="Technical specifications, hole patterns, etc."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about usage, installation, etc."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addComponentMutation.isPending}>
                  {addComponentMutation.isPending ? "Adding..." : "Add Component"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Component Type Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto">
        {componentTypes.map((type) => (
          <Button
            key={type.id}
            variant={selectedType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(type.id)}
            className="whitespace-nowrap"
            data-testid={`filter-${type.id}`}
          >
            {type.label}
            <Badge variant="secondary" className="ml-2">
              {type.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComponents && filteredComponents.length > 0 ? (
          filteredComponents.map((component) => (
            <Card key={component.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-sm font-medium leading-tight">
                      {component.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge variant="outline" className="text-xs">
                      {component.component_type.replace('_', ' ')}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compatible: {component.section_compatibility}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Height</p>
                    <p className="font-medium">{component.height}mm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Width</p>
                    <p className="font-medium">{component.width}mm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Thickness</p>
                    <p className="font-medium">{component.thickness}mm</p>
                  </div>
                </div>

                {/* Weld Time and Grade */}
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Weld Time</p>
                    <p className="font-medium">{component.weld_time_per_hour} h/h</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Grade</p>
                    <p className="font-medium">{component.material_grade || '250'}</p>
                  </div>
                </div>

                {/* Weight and Surface Area */}
                {(component.weight || component.surface_area) && (
                  <div className="flex items-center justify-between border-t pt-2 text-sm">
                    {component.weight && (
                      <div>
                        <p className="text-muted-foreground text-xs">Weight</p>
                        <p className="font-medium">{component.weight} kg</p>
                      </div>
                    )}
                    {component.surface_area && (
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">Surface</p>
                        <p className="font-medium">{component.surface_area} m²</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard */}
                {component.standard && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground">Standard: {component.standard}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No connection components found</p>
            <p className="text-sm text-muted-foreground">
              {selectedType === "all" 
                ? "Add end plates, stiffener plates, and other connection components"
                : `No ${selectedType.replace('_', ' ')} components available`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}