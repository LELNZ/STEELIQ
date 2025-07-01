import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Edit2, Trash2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type CoatingFormData = z.infer<typeof coatingFormSchema>;

interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  layersDft?: string;
  layers_dft?: string;
  durabilityYears?: string;
  durability_years?: string;
  asNzsReference?: string;
  as_nzs_reference?: string;
  applicationMethod?: string;
  application_method?: string;
  inHouseSubcontracted?: string;
  in_house_subcontracted?: string;
  fireRating?: string;
  fire_rating?: string;
  pricePerKg?: number | string;
  unitCost?: number | string;
  supplier?: string;
  notes?: string;
}

export default function CoatingSystemsFixed() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showStandards, setShowStandards] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading, refetch } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Filter for coating systems only
  const coatingMaterials = useMemo(() => {
    return materials.filter((material) => {
      const category = material.category?.toLowerCase() || '';
      
      // Include only coating systems categories
      const isCoatingSystem = category.includes('systems') ||
                             category.includes('alkyd') ||
                             category.includes('epoxy') ||
                             category.includes('etch') ||
                             category.includes('polyurethane') ||
                             category.includes('zinc') ||
                             category.includes('galvanizing') ||
                             category.includes('intumescent') ||
                             category.includes('powder coating');
      
      return isCoatingSystem;
    });
  }, [materials]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(coatingMaterials.map((m) => m.category))).filter(Boolean);
    return cats.sort();
  }, [coatingMaterials]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    return coatingMaterials.filter((material: Material) => {
      const matchesSearch = !searchTerm || 
        material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || material.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [coatingMaterials, searchTerm, selectedCategory]);

  // Helper functions to get field values (handles both camelCase and snake_case)
  const getLayersDft = (material: Material) => material.layersDft || material.layers_dft || "—";
  const getDurabilityYears = (material: Material) => material.durabilityYears || material.durability_years || "—";
  const getAsNzsReference = (material: Material) => material.asNzsReference || material.as_nzs_reference || "—";
  const getApplicationMethod = (material: Material) => material.applicationMethod || material.application_method || "—";
  const getInHouseSubcontracted = (material: Material) => material.inHouseSubcontracted || material.in_house_subcontracted || "—";
  const getFireRating = (material: Material) => material.fireRating || material.fire_rating || "N/A";
  const getPricePerSqm = (material: Material) => {
    // Convert string to number if needed for decimal fields from database
    const unitCost = typeof material.unitCost === 'string' ? parseFloat(material.unitCost) : material.unitCost;
    const pricePerKg = typeof material.pricePerKg === 'string' ? parseFloat(material.pricePerKg) : material.pricePerKg;
    
    if (unitCost && unitCost > 0) return `$${unitCost.toFixed(2)}/m²`;
    if (pricePerKg && pricePerKg > 0) return `$${pricePerKg.toFixed(2)}/kg`;
    return "Contact for pricing";
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
      supplier: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CoatingFormData & { id?: number }) => {
      if (data.id) {
        return apiRequest("PUT", `/api/materials/${data.id}`, data);
      } else {
        return apiRequest("POST", "/api/materials", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setDialogOpen(false);
      setEditingMaterial(null);
      form.reset();
      toast({
        title: "Success",
        description: editingMaterial ? "Coating system updated successfully" : "Coating system added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Success",
        description: "Coating system deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    form.reset({
      code: material.code,
      name: material.name,
      category: material.category,
      layers_dft: getLayersDft(material) === "—" ? "" : getLayersDft(material),
      durability_years: getDurabilityYears(material) === "—" ? "" : getDurabilityYears(material),
      as_nzs_reference: getAsNzsReference(material) === "—" ? "" : getAsNzsReference(material),
      application_method: getApplicationMethod(material) === "—" ? "" : getApplicationMethod(material),
      in_house_subcontracted: getInHouseSubcontracted(material) === "—" ? "" : getInHouseSubcontracted(material),
      fire_rating: getFireRating(material),
      unit_cost: material.unitCost?.toString() || "",
      supplier: material.supplier || "",
      notes: material.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    form.reset();
    setDialogOpen(true);
  };

  const onSubmit = (data: CoatingFormData) => {
    // Convert unit_cost string to number if provided
    const processedData = {
      ...data,
      unitCost: data.unit_cost ? parseFloat(data.unit_cost) : undefined,
      unit_cost: undefined, // Remove the string version
      ...(editingMaterial && { id: editingMaterial.id }),
    };
    
    mutation.mutate(processedData);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this coating system?")) {
      deleteMutation.mutate(id);
    }
  };

  const standards = `AS/NZS 2312.1:2014 Guide to protection of structural steel against atmospheric corrosion by the use of protective coatings—Paint coatings

AS/NZS 2312.2:2014 Guide to protection of structural steel against atmospheric corrosion—Hot-dip galvanizing

AS/NZS 5131:2016 Structural steel fabrication and erection

AS/NZS 4680:2006 Hot-dip galvanized (zinc) coatings on fabricated ferrous articles

NZS 3910:2013 Conditions of Contract for Building and Civil Engineering Construction

Notes on Application and Subcontracting:
• In-house application is typically used for small fabrications, minor repairs, and alkyd/epoxy touch-ups.
• Subcontracted application is strongly recommended or mandatory for galvanizing, thermal metal spray, high-build epoxies, polyurethanes, and intumescent coatings.
• Intumescent coatings require certified applicators and compliance documentation to meet fire resistance ratings.
• All coating systems require appropriate surface preparation, inspection of blast profiles, and verification of dry film thickness.`;

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
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Coating System
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

      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search coating systems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary">
          {filteredMaterials.length} coating systems
        </Badge>
        {selectedCategory !== "all" && (
          <Badge variant="outline">{selectedCategory}</Badge>
        )}
      </div>

      {/* Coating Systems Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Layers & DFT (µm)</TableHead>
              <TableHead>Durability (Years)</TableHead>
              <TableHead>AS/NZS Reference</TableHead>
              <TableHead>Application Method</TableHead>
              <TableHead>In-house/Subcontracted</TableHead>
              <TableHead>Price per m²</TableHead>
              <TableHead>Fire Rating</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.map((material: Material) => (
              <TableRow key={material.id}>
                <TableCell className="font-mono font-medium">
                  {material.code}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{material.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {material.category}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {getLayersDft(material)}
                </TableCell>
                <TableCell>{getDurabilityYears(material)}</TableCell>
                <TableCell>{getAsNzsReference(material)}</TableCell>
                <TableCell>{getApplicationMethod(material)}</TableCell>
                <TableCell>{getInHouseSubcontracted(material)}</TableCell>
                <TableCell className="font-medium">
                  {getPricePerSqm(material)}
                </TableCell>
                <TableCell>
                  {getFireRating(material) !== "N/A" ? (
                    <Badge variant="destructive">{getFireRating(material)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(material)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(material.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                        <Input placeholder="e.g., ALK1, EP2, HDG-only" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            <SelectItem value="Etch Primer Systems">Etch Primer Systems</SelectItem>
                            <SelectItem value="Epoxy Systems">Epoxy Systems</SelectItem>
                            <SelectItem value="Zinc Silicate Systems">Zinc Silicate Systems</SelectItem>
                            <SelectItem value="Polyurethane Systems">Polyurethane Systems</SelectItem>
                            <SelectItem value="Intumescent Systems">Intumescent Systems</SelectItem>
                            <SelectItem value="Galvanizing Systems">Galvanizing Systems</SelectItem>
                            <SelectItem value="Zinc Metal Spray Systems">Zinc Metal Spray Systems</SelectItem>
                            <SelectItem value="Powder Coating Systems">Powder Coating Systems</SelectItem>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Single coat alkyd" {...field} />
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
                      <Textarea 
                        placeholder="e.g., 1 x Alkyd enamel (~50µm)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="durability_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durability (Years to 1st Major Maintenance)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 2–5, 10–15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="as_nzs_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AS/NZS Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., C1, A2, G3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="application_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Method</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Brush/Roller/Spray">Brush/Roller/Spray</SelectItem>
                            <SelectItem value="Spray">Spray</SelectItem>
                            <SelectItem value="Dip Galvanizing">Dip Galvanizing</SelectItem>
                            <SelectItem value="Double dip galvanizing">Double dip galvanizing</SelectItem>
                            <SelectItem value="Galv + Spray">Galv + Spray</SelectItem>
                            <SelectItem value="Thermal spray">Thermal spray</SelectItem>
                            <SelectItem value="Electrostatic spray & oven cure">Electrostatic spray & oven cure</SelectItem>
                            <SelectItem value="Galvanizing + powder coating">Galvanizing + powder coating</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="in_house_subcontracted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>In-house/Subcontracted</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="In-house">In-house</SelectItem>
                            <SelectItem value="In-house (light steel)">In-house (light steel)</SelectItem>
                            <SelectItem value="In-house/Subcontracted">In-house/Subcontracted</SelectItem>
                            <SelectItem value="Subcontracted">Subcontracted</SelectItem>
                            <SelectItem value="Subcontracted specialist">Subcontracted specialist</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fire_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fire Rating (if Intumescent)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 30–90 min, N/A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per m²</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 45.20" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional specifications or requirements" 
                        {...field} 
                      />
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
    </div>
  );
}