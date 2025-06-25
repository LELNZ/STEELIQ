import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calculator, Trash2, Plus, Building2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CoatingCost {
  id: string;
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
  coatings: CoatingCost[];
  onCoatingsChange: (coatings: CoatingCost[]) => void;
  materials?: any[]; // Materials from materials tab for auto-calculation
}

export default function CoatingsTab({ coatings, onCoatingsChange, materials = [] }: CoatingsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCoating, setEditingCoating] = useState<CoatingCost | null>(null);
  const { toast } = useToast();

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
    const hasValidMeasurement = isGalvanizing ? newCoating.weightKg > 0 : newCoating.surfaceArea > 0;
    
    if (!newCoating.coatingName || !hasValidMeasurement || newCoating.unitCost <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields with valid values",
        variant: "destructive"
      });
      return;
    }

    const coating: CoatingCost = {
      ...newCoating,
      id: `coating-${Date.now()}`,
      totalCost: calculateTotal(newCoating)
    };

    // Add to material library coating systems if new
    try {
      await fetch('/api/coating-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: coating.coatingName,
          coating_type: coating.coatingType,
          pricing_method: isGalvanizing ? 'per_kg' : 'per_m2',
          price_per_unit: coating.unitCost,
          coverage_rate: isGalvanizing ? 1 : coating.surfaceArea,
          preparation_required: coating.category,
          is_active: true
        })
      });
    } catch (error) {
      console.log('Note: Coating system not added to library');
    }

    onCoatingsChange([...coatings, coating]);
    setNewCoating(defaultCoating);
    setShowAddDialog(false);
    
    toast({
      title: "Coating Added",
      description: `${coating.coatingName} has been added to the estimation`
    });
  };

  const handleUpdateCoating = (id: string, updates: Partial<CoatingCost>) => {
    const updatedCoatings = coatings.map(coating => {
      if (coating.id === id) {
        const updated = { ...coating, ...updates };
        if ('surfaceArea' in updates || 'weightKg' in updates || 'coats' in updates || 'unitCost' in updates || 'coatingType' in updates) {
          updated.totalCost = calculateTotal(updated);
        }
        return updated;
      }
      return coating;
    });
    onCoatingsChange(updatedCoatings);
  };

  const handleRemoveCoating = (id: string) => {
    const updatedCoatings = coatings.filter(coating => coating.id !== id);
    onCoatingsChange(updatedCoatings);
    
    toast({
      title: "Coating Removed",
      description: "Coating has been removed from the estimation"
    });
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

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Coating Systems</h3>
          <p className="text-sm text-gray-600">Manage paint systems, galvanizing, and powder coating</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Coating
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Coating System</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coatingName">Coating Name *</Label>
                <Input
                  id="coatingName"
                  value={newCoating.coatingName}
                  onChange={(e) => setNewCoating({...newCoating, coatingName: e.target.value})}
                  placeholder="e.g., Epoxy Primer, Hot Dip Galvanizing"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="coatingType">Coating Type *</Label>
                <Select value={newCoating.coatingType} onValueChange={(value: any) => setNewCoating({...newCoating, coatingType: value})}>
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
                <Select value={newCoating.category} onValueChange={(value: any) => setNewCoating({...newCoating, category: value})}>
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
              
              {newCoating.coatingType === "galvanizing" ? (
                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (kg) *</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    step="0.01"
                    value={newCoating.weightKg}
                    onChange={(e) => setNewCoating({...newCoating, weightKg: parseFloat(e.target.value) || 0})}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="surfaceArea">Surface Area (m²) *</Label>
                  <Input
                    id="surfaceArea"
                    type="number"
                    step="0.01"
                    value={newCoating.surfaceArea}
                    onChange={(e) => setNewCoating({...newCoating, surfaceArea: parseFloat(e.target.value) || 0})}
                  />
                </div>
              )}
              
              {newCoating.coatingType !== "galvanizing" && (
                <div className="space-y-2">
                  <Label htmlFor="coats">Number of Coats</Label>
                  <Input
                    id="coats"
                    type="number"
                    min="1"
                    value={newCoating.coats}
                    onChange={(e) => setNewCoating({...newCoating, coats: parseInt(e.target.value) || 1})}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="unitCost">
                  Unit Cost ({newCoating.coatingType === "galvanizing" ? "$/kg" : "$/m²"}) *
                </Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={newCoating.unitCost}
                  onChange={(e) => setNewCoating({...newCoating, unitCost: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newCoating.isInhouse}
                    onCheckedChange={(checked) => setNewCoating({...newCoating, isInhouse: checked})}
                  />
                  <Label>In-house work</Label>
                  {!newCoating.isInhouse && <Badge variant="outline">Subcontracted</Badge>}
                </div>
              </div>
              
              {!newCoating.isInhouse && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={newCoating.supplier}
                      onChange={(e) => setNewCoating({...newCoating, supplier: e.target.value})}
                      placeholder="Select from contacts or enter name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="leadTime">Lead Time (days)</Label>
                    <Input
                      id="leadTime"
                      type="number"
                      value={newCoating.leadTime}
                      onChange={(e) => setNewCoating({...newCoating, leadTime: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </>
              )}
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newCoating.notes}
                  onChange={(e) => setNewCoating({...newCoating, notes: e.target.value})}
                  placeholder="Special requirements, standards, or additional information"
                />
              </div>
              
              <div className="col-span-2 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddCoating}>Add Coating</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coatings List */}
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
        <div className="space-y-4">
          {coatings.map((coating) => (
            <Card key={coating.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{coating.coatingName}</h4>
                      <Badge className={getCoatingTypeColor(coating.coatingType)}>
                        {coating.coatingType.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{coating.category}</Badge>
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
                
                <div className="grid grid-cols-5 gap-4 text-sm">
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
                        const updated = calculateTotal(coating.surfaceArea, coating.coats, coating.unitCost);
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