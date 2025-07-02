import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Edit2, Trash2, FileText, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const coatingFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  layers_dft: z.string().min(1, "Layers & DFT is required"),
  durability_years: z.string().min(1, "Durability is required"),
  as_nzs_reference: z.string().min(1, "AS/NZS Reference is required"),
  application_method: z.string().min(1, "Application method is required"),
  in_house_subcontracted: z.string().min(1, "In-house/Subcontracted is required"),
  fire_rating: z.string().optional(),
  unit_cost: z.string().optional(),
  price_per_kg: z.string().optional(),
  coverage_rate: z.string().optional(),
  coverage_unit: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type CoatingFormData = z.infer<typeof coatingFormSchema>;

export default function CoatingSystemsConsumableStyle() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [showStandards, setShowStandards] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load materials and filter for coating systems only
  const { data: materials = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/materials"],
  });

  const coatingMaterials = useMemo(() => {
    return materials.filter((material) => {
      const category = material.category?.toLowerCase() || '';
      return category.includes('alkyd') || 
             category.includes('epoxy') || 
             category.includes('polyurethane') || 
             category.includes('zinc') || 
             category.includes('coating') || 
             category.includes('galvanizing') ||
             category.includes('intumescent') ||
             category.includes('primer');
    });
  }, [materials]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(coatingMaterials.map((m) => m.category))).filter(Boolean);
    return cats.sort();
  }, [coatingMaterials]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    return coatingMaterials.filter((material: any) => {
      const matchesSearch = !searchTerm || 
        material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || material.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [coatingMaterials, searchTerm, selectedCategory]);

  // Helper functions to get field values
  const getPricePerSqm = (material: any) => {
    const unitCost = typeof material.unitCost === 'string' ? parseFloat(material.unitCost) : material.unitCost;
    if (unitCost && unitCost > 0) return `$${unitCost.toFixed(2)}/m²`;
    return "N/A";
  };

  const form = useForm<CoatingFormData>({
    resolver: zodResolver(coatingFormSchema),
    defaultValues: {
      code: "",
      name: "",
      category: "",
      layers_dft: "",
      durability_years: "",
      as_nzs_reference: "",
      application_method: "",
      in_house_subcontracted: "",
      fire_rating: "N/A",
      unit_cost: "",
      price_per_kg: "",
      coverage_rate: "",
      coverage_unit: "kg_per_m2",
      supplier: "",
      notes: "",
    },
  });

  // Mutation for create/update
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return await fetch(`/api/materials/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).then(res => res.json());
      } else {
        return await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).then(res => res.json());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Success",
        description: editingMaterial ? "Coating system updated" : "Coating system added",
      });
      setDialogOpen(false);
      setEditingMaterial(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save coating system",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await fetch(`/api/materials/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Success",
        description: "Coating system deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete coating system",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    setEditingMaterial(null);
    form.reset();
    setDialogOpen(true);
  };

  const handleEdit = (material: any) => {
    setEditingMaterial(material);
    form.reset({
      code: material.code || "",
      name: material.name || "",
      category: material.category || "",
      layers_dft: material.layersDft || material.layers_dft || "",
      durability_years: material.durabilityYears || material.durability_years || "",
      as_nzs_reference: material.asNzsReference || material.as_nzs_reference || "",
      application_method: material.applicationMethod || material.application_method || "",
      in_house_subcontracted: material.inHouseSubcontracted || material.in_house_subcontracted || "",
      fire_rating: material.fireRating || material.fire_rating || "N/A",
      unit_cost: material.unitCost?.toString() || "",
      price_per_kg: material.pricePerKg?.toString() || "",
      coverage_rate: (material as any).coverageRate?.toString() || "",
      coverage_unit: (material as any).coverageUnit || "kg_per_m2",
      supplier: material.supplier || "",
      notes: material.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this coating system?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: CoatingFormData) => {
    const processedData = {
      ...data,
      unitCost: data.unit_cost ? parseFloat(data.unit_cost) : undefined,
      pricePerKg: data.price_per_kg ? parseFloat(data.price_per_kg) : undefined,
      coverageRate: data.coverage_rate ? parseFloat(data.coverage_rate) : undefined,
      coverageUnit: data.coverage_unit || undefined,
      unit_cost: undefined,
      price_per_kg: undefined,
      coverage_rate: undefined,
      ...(editingMaterial && { id: editingMaterial.id }),
    };
    
    mutation.mutate(processedData);
  };

  const standards = `AS/NZS 2312 - Guide to the protection of structural steel against atmospheric corrosion by the use of protective coatings

Referenced Standards:
C1, C2, C3, C4, C5 - Corrosivity categories for different environments
AS/NZS 1580 - Paints and related materials
AS/NZS 2312.1 - Hot dip galvanized coatings  
AS/NZS 2312.2 - Organic coatings
AS 3750 - Painting of buildings
AS 1397 - Continuous hot-dip metallic coated steel sheet and strip
AS 4312 - Atmospheric corrosivity zones in Australia
AS 1580.481 - Intumescent coatings for fire protection`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Standards Reference */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Coating Systems</h2>
          <p className="text-sm text-muted-foreground">
            AS/NZS 2312 compliant coating systems for steel fabrication
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowStandards(!showStandards)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Standards
          </Button>
        </div>
      </div>

      {/* Standards Information Panel */}
      {showStandards && (
        <Card>
          <CardHeader>
            <CardTitle>NZ/AUS Standards Referenced</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">{standards}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            {filteredMaterials.length} of {coatingMaterials.length} coating systems shown
          </div>

          {/* Search Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search coating systems by name, code, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Material
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category.replace(' Systems', '')}
              </Button>
            ))}
          </div>

          {/* Table */}
          <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material: any) => (
                  <TableRow key={material.id}>
                    <TableCell>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{material.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{material.code || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        {material.category?.replace(' Systems', '') || 'Coating'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {getPricePerSqm(material)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        —
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {material.supplier || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(material)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(material.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Edit Coating System" : "Add Coating System"}
            </DialogTitle>
            <DialogDescription>
              Create or modify coating system specifications following AS/NZS standards.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ALK1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Single coat alkyd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alkyd Systems">Alkyd Systems</SelectItem>
                            <SelectItem value="Epoxy Systems">Epoxy Systems</SelectItem>
                            <SelectItem value="Polyurethane Systems">Polyurethane Systems</SelectItem>
                            <SelectItem value="Zinc Rich Primer Systems">Zinc Rich Primer Systems</SelectItem>
                            <SelectItem value="Hot Dip Galvanizing">Hot Dip Galvanizing</SelectItem>
                            <SelectItem value="Intumescent Systems">Intumescent Systems</SelectItem>
                            <SelectItem value="Zinc Metal Spray Systems">Zinc Metal Spray Systems</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="layers_dft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layers & DFT (µm)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1 x Alkyd enamel (~50µm)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per m²</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 35.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_per_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per kg</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 8.50" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="coverage_rate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormLabel>Coverage Rate</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                <strong>Coverage Rate</strong> tells you how much coating material you need for each square meter of steel surface.
                                <br /><br />
                                <strong>Examples:</strong>
                                <br />• Galvanizing: 2.5 kg per m² (thick zinc coating)
                                <br />• Paint: 0.15 L per m² (liquid coverage)
                                <br />• Powder coating: 120 g per m² (dry powder)
                                <br /><br />
                                This helps calculate the total quantity of coating needed for your project.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input placeholder="e.g., 2.5" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coverage_unit"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormLabel>Coverage Unit</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                <strong>Coverage Unit</strong> defines how the coverage rate is measured:
                                <br /><br />
                                <strong>• kg per m²:</strong> Weight of coating per area (e.g., galvanizing)
                                <br />
                                <strong>• L per m²:</strong> Volume of liquid coating per area (e.g., paint)
                                <br />
                                <strong>• g per m²:</strong> Light coatings like powder coating
                                <br />
                                <strong>• m² per kg/L:</strong> Area covered by each unit of coating
                                <br /><br />
                                Choose the unit that matches how your supplier sells the coating.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg_per_m2">kg per m²</SelectItem>
                            <SelectItem value="m2_per_kg">m² per kg</SelectItem>
                            <SelectItem value="L_per_m2">L per m²</SelectItem>
                            <SelectItem value="m2_per_L">m² per L</SelectItem>
                            <SelectItem value="g_per_m2">g per m²</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dulux Protective Coatings" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : editingMaterial ? "Update" : "Add"} Coating System
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}