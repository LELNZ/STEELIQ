import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calculator, Trash2, Plus, Building2, Users, Palette, Search, FileText, Shield, Clock, Layers, Package, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CoatingCost {
  id: number; // Database-backed ID
  projectId: number;
  designation?: string; // Material designation (e.g., C1, B2, PL1)
  parentMaterialId?: number; // Reference to parent material for proper grouping
  operationId?: number; // Direct link to operation for tracking
  operationDesignation?: string; // Operation designation (e.g., C1-310-paint-1, B2-400-blast-2)
  operationType?: string; // Type of operation that created this coating need
  coatingName: string;
  coatingType: "paint" | "galvanizing" | "powder_coating";
  category: "primer" | "topcoat" | "finish" | "protective";
  surfaceArea?: number;
  weightKg?: number; // For galvanizing p/kg pricing
  coats: number;
  unitCost: number;
  totalCost: number;
  isInhouse: boolean;
  supplier?: string;
  supplierId?: number;
  leadTime?: number;
  notes: string;
}

interface CoatingsTabProps {
  projectId?: number;
  coatings: CoatingCost[];
  onCoatingsChange: (coatings: CoatingCost[]) => void;
  materials?: any[]; // Materials from materials tab for auto-calculation
}

export default function CoatingsTab({ projectId, coatings, onCoatingsChange, materials = [] }: CoatingsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCoating, setEditingCoating] = useState<CoatingCost | null>(null);
  const [selectedCoatingSystemId, setSelectedCoatingSystemId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Query coating systems from material library
  const { data: coatingSystems = [] } = useQuery({
    queryKey: ["/api/coating-systems"]
  });

  // Fetch coatings from database
  const { data: coatingItems, isLoading, refetch } = useQuery({
    queryKey: ['/api/estimation/projects', projectId, 'coatings'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/estimation/projects/${projectId}/coatings`);
      if (!response.ok) throw new Error('Failed to fetch coating items');
      return response.json();
    },
    enabled: !!projectId
  });

  // Sync database items with local state
  useEffect(() => {
    if (coatingItems && coatingItems.length > 0) {
      onCoatingsChange(coatingItems);
    }
  }, [coatingItems, onCoatingsChange]);

  // Create coating mutation
  const createCoatingMutation = useMutation({
    mutationFn: async (coatingData: Partial<CoatingCost>) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      return apiRequest(`/api/estimation/projects/${projectId}/coatings`, {
        method: 'POST',
        body: JSON.stringify(coatingData)
      });
    },
    onSuccess: (newCoating) => {
      const updatedCoatings = [...coatings, newCoating];
      onCoatingsChange(updatedCoatings);
      
      toast({
        title: "Coating added",
        description: "Coating has been saved to the database"
      });
      
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error adding coating",
        description: error.message || "Failed to save coating",
        variant: "destructive"
      });
    }
  });

  // Update coating mutation
  const updateCoatingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<CoatingCost> }) => {
      return apiRequest(`/api/estimation/coatings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: (updatedItem) => {
      const updatedCoatings = coatings.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      onCoatingsChange(updatedCoatings);
      
      toast({
        title: "Coating updated",
        description: "Changes have been saved"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating coating",
        description: error.message || "Failed to update coating",
        variant: "destructive"
      });
    }
  });

  // Delete coating mutation
  const deleteCoatingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/estimation/coatings/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, deletedId) => {
      const updatedCoatings = coatings.filter(item => item.id !== deletedId);
      onCoatingsChange(updatedCoatings);
      
      toast({
        title: "Coating removed",
        description: "Coating has been deleted"
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing coating",
        description: error.message || "Failed to delete coating",
        variant: "destructive"
      });
    }
  });

  // Calculate total surface area and weight from materials for auto-population
  const totalMaterialSurfaceArea = materials.reduce((sum, material) => 
    sum + (material.totalSurfaceArea || 0), 0
  );
  const totalMaterialWeight = materials.reduce((sum, material) => 
    sum + (material.totalWeight || 0), 0
  );
  
  // Group coating items by parent material ID for true parent-child relationship
  const groupedCoatings = useMemo(() => {
    const groups: { [key: string]: { designation: string; items: CoatingCost[] } } = {};
    
    coatings.forEach(item => {
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
    
    const result: { [key: string]: { designation: string; items: CoatingCost[] } } = {};
    sortedGroups.forEach(key => {
      result[key] = groups[key];
    });
    
    return result;
  }, [coatings]);

  // Calculate summary for a group
  const getGroupSummary = (items: CoatingCost[]) => {
    const totalSurfaceArea = items.reduce((sum, item) => sum + (item.surfaceArea || 0), 0);
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const coatingCount = items.length;
    
    return {
      totalSurfaceArea,
      totalCost,
      coatingCount
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
      setExpandedGroups(Object.keys(groupedCoatings));
    } else {
      setExpandedGroups([]);
    }
  };
  
  // Extract unique coating categories
  const coatingCategories = useMemo(() => {
    const categories = new Set(coatingSystems.map((system: any) => system.category));
    return Array.from(categories).filter(Boolean).sort();
  }, [coatingSystems]);
  
  // Filter coating systems based on search and category
  const filteredCoatingSystems = useMemo(() => {
    return coatingSystems.filter((system: any) => {
      const matchesSearch = searchTerm === "" || 
        system.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        system.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        system.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || system.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [coatingSystems, searchTerm, selectedCategory]);
  
  // Helper functions to map coating types and categories
  const getCoatingType = (category: string | undefined): "paint" | "galvanizing" | "powder_coating" => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('galvaniz')) return "galvanizing";
    if (cat.includes('powder')) return "powder_coating";
    return "paint";
  };
  
  const getCoatingCategory = (category: string | undefined): "primer" | "topcoat" | "finish" | "protective" => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('primer')) return "primer";
    if (cat.includes('topcoat')) return "topcoat";
    if (cat.includes('finish')) return "finish";
    return "protective";
  };

  const defaultCoating: Omit<CoatingCost, 'id'> = {
    coatingName: "",
    coatingType: "paint",
    category: "primer",
    surfaceArea: 0,
    weightKg: 0,
    coats: 1,
    unitCost: 0,
    totalCost: 0,
    isInhouse: true,
    supplier: "",
    supplierId: undefined,
    leadTime: 0,
    notes: ""
  };

  const [newCoating, setNewCoating] = useState<Omit<CoatingCost, 'id'>>(defaultCoating);

  const calculateTotal = (coating: Partial<CoatingCost>) => {
    if (coating.coatingType === "galvanizing" && coating.weightKg) {
      return coating.weightKg * (coating.unitCost || 0);
    }
    return (coating.surfaceArea || 0) * (coating.coats || 1) * (coating.unitCost || 0);
  };

  const handleAddCoating = async () => {
    const isGalvanizing = newCoating.coatingType === "galvanizing";
    const hasValidMeasurement = isGalvanizing ? (newCoating.weightKg || 0) > 0 : (newCoating.surfaceArea || 0) > 0;
    
    // Only require coating name and measurement - allow 0 unit cost for editing
    if (!newCoating.coatingName || !hasValidMeasurement) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter coating name and " + (isGalvanizing ? "weight" : "surface area"),
        variant: "destructive"
      });
      return;
    }

    const coatingData: Partial<CoatingCost> = {
      projectId: projectId,
      ...newCoating,
      totalCost: calculateTotal(newCoating)
    };

    createCoatingMutation.mutate(coatingData);
    setNewCoating(defaultCoating);
    setShowAddDialog(false);
  };

  const handleUpdateCoating = (id: number, updates: Partial<CoatingCost>) => {
    // Calculate totalCost if relevant fields change
    if ('surfaceArea' in updates || 'weightKg' in updates || 'coats' in updates || 'unitCost' in updates || 'coatingType' in updates) {
      const item = coatings.find(c => c.id === id);
      if (item) {
        const updated = { ...item, ...updates };
        updates.totalCost = calculateTotal(updated);
      }
    }
    
    updateCoatingMutation.mutate({ id, updates });
  };

  const handleRemoveCoating = (id: number) => {
    deleteCoatingMutation.mutate(id);
  };

  const getTotalCost = () => {
    return coatings.reduce((sum, coating) => sum + coating.totalCost, 0);
  };

  const getCoatingTypeColor = (type: string) => {
    switch (type) {
      case 'paint': return 'bg-blue-100 text-blue-800';
      case 'galvanizing': return 'bg-zinc-100 text-zinc-800';
      case 'powder_coating': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading coatings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Coating Systems</h3>
          <p className="text-sm text-gray-600">Manage paint systems, galvanizing, and powder coating</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setSelectedCoatingSystemId("");
            setNewCoating(defaultCoating);
            setSearchTerm("");
            setSelectedCategory("all");
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Coating
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl w-[80vw] h-[85vh] overflow-hidden">
            <DialogHeader className="pb-2">
              <DialogTitle>Add Coating System</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="library" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="library" className="text-sm">Select from Library</TabsTrigger>
                <TabsTrigger value="custom" className="text-sm">Create Custom</TabsTrigger>
              </TabsList>
              
              <TabsContent value="library" className="space-y-3 mt-3 h-[calc(85vh-120px)]">
                <div className="flex gap-3 h-full">
                  {/* Left side - Coating list */}
                  <div className="flex-1 space-y-3 overflow-y-auto h-[calc(85vh-200px)]">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search coating systems..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge 
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        className="cursor-pointer text-xs py-0.5 px-2"
                        onClick={() => setSelectedCategory("all")}
                      >
                        All ({coatingSystems.length})
                      </Badge>
                      {coatingCategories.slice(0, 5).map(category => (
                        <Badge
                          key={category}
                          variant={selectedCategory === category ? "default" : "outline"}
                          className="cursor-pointer text-xs py-0.5 px-2"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Coating Systems List */}
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
                      {filteredCoatingSystems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">
                          No coating systems found
                        </p>
                      ) : (
                        filteredCoatingSystems.map((system: any) => (
                          <Card 
                            key={system.id} 
                            className={`cursor-pointer transition-all p-2 ${
                              selectedCoatingSystemId === system.id.toString() ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedCoatingSystemId(system.id.toString());
                              const coatingType = getCoatingType(system.category);
                              setNewCoating({
                                ...newCoating,
                                coatingName: system.name,
                                coatingType: coatingType,
                                category: getCoatingCategory(system.category),
                                unitCost: parseFloat(system.pricePerKg || system.unitCost || 0),
                                surfaceArea: coatingType === "galvanizing" ? 0 : totalMaterialSurfaceArea,
                                weightKg: coatingType === "galvanizing" ? totalMaterialWeight : 0,
                                notes: `${system.asNzsReference || ''} ${system.applicationMethod || ''} ${system.layersDft || ''}`.trim()
                              });
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm">{system.name}</h4>
                                  {system.code && (
                                    <Badge variant="outline" className="text-xs py-0 px-1">
                                      {system.code}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-xs text-muted-foreground">{system.category}</p>
                                  {system.layersDft && (
                                    <span className="text-xs text-muted-foreground">• {system.layersDft}</span>
                                  )}
                                  {system.durabilityYears && (
                                    <span className="text-xs text-muted-foreground">• {system.durabilityYears} years</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">${system.pricePerKg || system.unitCost || 0}/kg</p>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Right side - Edit fields */}
                  {selectedCoatingSystemId && (
                    <div className="w-96 space-y-3 bg-gray-50 p-3 rounded-lg h-[calc(85vh-200px)] overflow-y-auto">
                      <h4 className="font-medium text-sm">Edit Details</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="editUnitCost" className="text-sm">
                            Unit Cost ({newCoating.coatingType === "galvanizing" ? "$/kg" : "$/m²"}) *
                          </Label>
                          <Input
                            id="editUnitCost"
                            type="number"
                            step="0.01"
                            value={newCoating.unitCost}
                            onChange={(e) => setNewCoating({...newCoating, unitCost: parseFloat(e.target.value) || 0})}
                            placeholder="Enter price"
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        {newCoating.coatingType === "galvanizing" ? (
                          <div className="space-y-1">
                            <Label htmlFor="editWeightKg" className="text-sm">Weight (kg) *</Label>
                            <Input
                              id="editWeightKg"
                              type="number"
                              step="0.01"
                              value={newCoating.weightKg}
                              onChange={(e) => setNewCoating({...newCoating, weightKg: parseFloat(e.target.value) || 0})}
                              className="h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Label htmlFor="editSurfaceArea" className="text-sm">Surface Area (m²) *</Label>
                            <Input
                              id="editSurfaceArea"
                              type="number"
                              step="0.01"
                              value={newCoating.surfaceArea}
                              onChange={(e) => setNewCoating({...newCoating, surfaceArea: parseFloat(e.target.value) || 0})}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                        
                        {newCoating.coatingType !== "galvanizing" && (
                          <div className="space-y-1">
                            <Label htmlFor="editCoats" className="text-sm">Number of Coats</Label>
                            <Input
                              id="editCoats"
                              type="number"
                              min="1"
                              value={newCoating.coats}
                              onChange={(e) => setNewCoating({...newCoating, coats: parseInt(e.target.value) || 1})}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <Label className="text-sm">Work Type</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <Switch
                              checked={newCoating.isInhouse}
                              onCheckedChange={(checked) => setNewCoating({...newCoating, isInhouse: checked})}
                            />
                            <Label className="text-sm">{newCoating.isInhouse ? 'In-house' : 'Subcontracted'}</Label>
                          </div>
                        </div>
                        
                        {!newCoating.isInhouse && (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="supplier" className="text-sm">Supplier</Label>
                              <Input
                                id="supplier"
                                value={newCoating.supplier}
                                onChange={(e) => setNewCoating({...newCoating, supplier: e.target.value})}
                                placeholder="Supplier name"
                                className="h-8 text-sm"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor="leadTime" className="text-sm">Lead Time (days)</Label>
                              <Input
                                id="leadTime"
                                type="number"
                                value={newCoating.leadTime}
                                onChange={(e) => setNewCoating({...newCoating, leadTime: parseInt(e.target.value) || 0})}
                                className="h-8 text-sm"
                              />
                            </div>
                          </>
                        )}
                        
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="notes" className="text-sm">Notes</Label>
                          <Textarea
                            id="notes"
                            value={newCoating.notes}
                            onChange={(e) => setNewCoating({...newCoating, notes: e.target.value})}
                            placeholder="Additional information"
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} className="h-8 text-sm">
                          Cancel
                        </Button>
                        <Button onClick={handleAddCoating} className="h-8 text-sm">
                          Add Coating
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer for when no coating is selected */}
                {!selectedCoatingSystemId && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} className="h-8 text-sm">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddCoating}
                      disabled={!selectedCoatingSystemId}
                      className="h-8 text-sm"
                    >
                      Select a Coating System
                    </Button>
                  </DialogFooter>
                )}
              </TabsContent>
              
              <TabsContent value="custom" className="space-y-3 mt-3 h-[calc(85vh-120px)] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="coatingName" className="text-sm">Coating Name *</Label>
                    <Input
                      id="coatingName"
                      value={newCoating.coatingName}
                      onChange={(e) => setNewCoating({...newCoating, coatingName: e.target.value})}
                      placeholder="e.g., Epoxy Primer"
                      className="h-8 text-sm"
                    />
                  </div>
                
                  <div className="space-y-1">
                    <Label htmlFor="coatingType" className="text-sm">Coating Type *</Label>
                    <Select value={newCoating.coatingType} onValueChange={(value: any) => setNewCoating({...newCoating, coatingType: value})}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paint">Paint System</SelectItem>
                        <SelectItem value="galvanizing">Galvanizing</SelectItem>
                        <SelectItem value="powder_coating">Powder Coating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-sm">Category</Label>
                    <Select value={newCoating.category} onValueChange={(value: any) => setNewCoating({...newCoating, category: value})}>
                      <SelectTrigger className="h-8 text-sm">
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
                  
                  {newCoating.coatingType === "galvanizing" ? (
                    <div className="space-y-1">
                      <Label htmlFor="weightKg" className="text-sm">Weight (kg) *</Label>
                      <Input
                        id="weightKg"
                        type="number"
                        step="0.01"
                        value={newCoating.weightKg}
                        onChange={(e) => setNewCoating({...newCoating, weightKg: parseFloat(e.target.value) || 0})}
                        className="h-8 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="surfaceArea" className="text-sm">Surface Area (m²) *</Label>
                      <Input
                        id="surfaceArea"
                        type="number"
                        step="0.01"
                        value={newCoating.surfaceArea}
                        onChange={(e) => setNewCoating({...newCoating, surfaceArea: parseFloat(e.target.value) || 0})}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  
                  {newCoating.coatingType !== "galvanizing" && (
                    <div className="space-y-1">
                      <Label htmlFor="coats" className="text-sm">Number of Coats</Label>
                      <Input
                        id="coats"
                        type="number"
                        min="1"
                        value={newCoating.coats}
                        onChange={(e) => setNewCoating({...newCoating, coats: parseInt(e.target.value) || 1})}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label htmlFor="unitCost" className="text-sm">
                      Unit Cost ({newCoating.coatingType === "galvanizing" ? "$/kg" : "$/m²"}) *
                    </Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={newCoating.unitCost}
                      onChange={(e) => setNewCoating({...newCoating, unitCost: parseFloat(e.target.value) || 0})}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-sm">Work Type</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        checked={newCoating.isInhouse}
                        onCheckedChange={(checked) => setNewCoating({...newCoating, isInhouse: checked})}
                      />
                      <Label className="text-sm">{newCoating.isInhouse ? 'In-house' : 'Subcontracted'}</Label>
                    </div>
                  </div>
                  
                  {!newCoating.isInhouse && (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="supplier" className="text-sm">Supplier</Label>
                        <Input
                          id="supplier"
                          value={newCoating.supplier}
                          onChange={(e) => setNewCoating({...newCoating, supplier: e.target.value})}
                          placeholder="Supplier name"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="leadTime" className="text-sm">Lead Time (days)</Label>
                        <Input
                          id="leadTime"
                          type="number"
                          value={newCoating.leadTime}
                          onChange={(e) => setNewCoating({...newCoating, leadTime: parseInt(e.target.value) || 0})}
                          className="h-8 text-sm"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="col-span-3 space-y-1">
                    <Label htmlFor="notes" className="text-sm">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newCoating.notes}
                      onChange={(e) => setNewCoating({...newCoating, notes: e.target.value})}
                      placeholder="Special requirements, standards, or additional information"
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="h-8 text-sm">
                    Cancel
                  </Button>
                  <Button onClick={handleAddCoating} className="h-8 text-sm">
                    Add Custom Coating
                  </Button>
                </DialogFooter>
              </TabsContent>

            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coatings Grouped by Parent Designation */}
      {coatings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No coatings added</h3>
            <p className="text-gray-500 text-center mb-4">
              Add coating systems to include painting, galvanizing, or powder coating costs in your estimation.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Coating
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Coatings Breakdown by Material Designation</CardTitle>
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
              {Object.entries(groupedCoatings).map(([materialId, group]) => {
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
                            {summary.coatingCount} coating{summary.coatingCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            <Layers className="inline h-4 w-4 mr-1" />
                            {summary.totalSurfaceArea.toFixed(1)} m²
                          </span>
                          <span className="text-sm font-medium">
                            ${summary.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {group.items.map((coating) => (
                          <Card key={coating.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">
                                      {coating.operationDesignation || '-'}
                                    </span>
                                    <Separator orientation="vertical" className="h-4" />
                                    <h4 className="font-medium">{coating.coatingName}</h4>
                                    <Badge className={getCoatingTypeColor(coating.coatingType || 'paint')}>
                                      {(coating.coatingType || 'paint').replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="outline">{coating.category || 'protective'}</Badge>
                                    {coating.isInhouse ? (
                                      <Badge variant="secondary">
                                        <Building2 className="w-3 h-3 mr-1" />
                                        In-house
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        <Users className="w-3 h-3 mr-1" />
                                        {coating.supplier || 'Subcontracted'}
                                      </Badge>
                                    )}
                                  </div>
                                  {coating.notes && (
                                    <p className="text-sm text-gray-600">{coating.notes}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCoating(coating.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                                <div>
                                  <Label className="text-xs text-gray-500">Surface Area</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={coating.surfaceArea}
                                    onChange={(e) => handleUpdateCoating(coating.id, { surfaceArea: parseFloat(e.target.value) || 0 })}
                                    className="mt-1"
                                  />
                                  <span className="text-xs text-gray-500">m²</span>
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-gray-500">Coats</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={coating.coats}
                                    onChange={(e) => handleUpdateCoating(coating.id, { coats: parseInt(e.target.value) || 1 })}
                                    className="mt-1"
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-gray-500">Unit Cost</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={coating.unitCost}
                                    onChange={(e) => handleUpdateCoating(coating.id, { unitCost: parseFloat(e.target.value) || 0 })}
                                    className="mt-1"
                                  />
                                  <span className="text-xs text-gray-500">$/m²</span>
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-gray-500">Total Cost</Label>
                                  <div className="mt-1 p-2 bg-gray-50 rounded text-right font-medium">
                                    ${coating.totalCost.toFixed(2)}
                                  </div>
                                </div>
                                
                                <div className="flex items-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const updated = calculateTotal(coating);
                                      handleUpdateCoating(coating.id, { totalCost: updated });
                                    }}
                                  >
                                    <Calculator className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {coatings.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Coating Systems</p>
                <p className="text-lg font-semibold">{coatings.length} systems</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-green-600">${getTotalCost().toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}