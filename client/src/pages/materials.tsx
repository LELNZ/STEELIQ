import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialUpload from "@/components/materials/material-upload";
import { SteelCatalogueOnly } from "@/components/materials/steel-catalogue-only";
import { ConsumablesCleanFixed } from "@/components/materials/consumables-clean-fixed";
import CoatingSystemsConsumableStyle from "@/components/materials/coating-systems-consumable-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Material, Supplier, ConnectionComponent, insertConnectionComponentSchema } from "@shared/schema";
import { Plus, Upload, Download, Search, Package, Wrench, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function Materials() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load materials and suppliers for components
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: connectionComponents = [] } = useQuery<ConnectionComponent[]>({
    queryKey: ["/api/connection-components"],
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/materials/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "materials.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Library</h1>
          <p className="text-sm text-muted-foreground">Manage your steel catalogue with organized categories and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            variant="outline"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Material Library with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steel-catalogue" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 h-auto sm:h-12 bg-muted/50 rounded-lg p-1">
              <TabsTrigger 
                value="steel-catalogue" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Steel Catalogue
              </TabsTrigger>
              <TabsTrigger 
                value="consumables" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Consumables
              </TabsTrigger>
              <TabsTrigger 
                value="coating-systems" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Coating Systems
              </TabsTrigger>
              <TabsTrigger 
                value="connections" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Connections ({connectionComponents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steel-catalogue" className="space-y-6">
              <SteelCatalogueOnly />
            </TabsContent>

            <TabsContent value="consumables">
              <ConsumablesCleanFixed 
                materials={materials}
                suppliers={suppliers}
              />
            </TabsContent>

            <TabsContent value="coating-systems">
              <CoatingSystemsConsumableStyle />
            </TabsContent>

            <TabsContent value="connections" className="space-y-4">
              <ConnectionComponentsTab connectionComponents={connectionComponents} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />
    </div>
  );
}

// Connection Components Tab Component - Table view matching other tabs
function ConnectionComponentsTab({ connectionComponents }: { connectionComponents: ConnectionComponent[] }) {
  const [selectedSectionType, setSelectedSectionType] = useState("All Sections");
  const [selectedComponentType, setSelectedComponentType] = useState("All Components");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ConnectionComponent | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/connection-components", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-components"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Connection Added",
        description: "Connection component has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add connection component: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/connection-components/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-components"] });
      setIsEditDialogOpen(false);
      setEditingComponent(null);
      toast({
        title: "Connection Updated",
        description: "Connection component has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update connection component: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/connection-components/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-components"] });
      toast({
        title: "Connection Deleted",
        description: "Connection component has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete connection component: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Extract section types from compatibility data
  const getSectionType = (sectionCompatibility: string): string => {
    if (sectionCompatibility.includes('PFC')) return 'PFC';
    if (sectionCompatibility.includes('UB')) return 'UB';
    if (sectionCompatibility.includes('UC')) return 'UC';
    if (sectionCompatibility.includes('WB')) return 'WB';
    if (sectionCompatibility.includes('WC')) return 'WC';
    return 'Other';
  };

  // Get unique section types for filtering
  const sectionTypes = ['All Sections', ...Array.from(new Set(connectionComponents.map(c => getSectionType(c.section_compatibility))))];
  
  // Get unique component types for filtering - including cleats
  const componentTypes = ['All Components', 'End Plate', 'Stiffener Plate', 'Base Plate', 'Cleat'];

  // Filter components based on selections and search
  const filteredComponents = connectionComponents.filter(component => {
    const matchesSection = selectedSectionType === 'All Sections' || getSectionType(component.section_compatibility) === selectedSectionType;
    
    const componentTypeName = component.component_type.replace('_', ' ').toLowerCase();
    const matchesComponent = selectedComponentType === 'All Components' || 
      (selectedComponentType === 'End Plate' && componentTypeName.includes('end plate')) ||
      (selectedComponentType === 'Stiffener Plate' && componentTypeName.includes('stiffener')) ||
      (selectedComponentType === 'Base Plate' && componentTypeName.includes('base plate')) ||
      (selectedComponentType === 'Cleat' && componentTypeName.includes('cleat'));
    
    const matchesSearch = !searchQuery || 
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.section_compatibility.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.component_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSection && matchesComponent && matchesSearch;
  });

  const handleEdit = (component: ConnectionComponent) => {
    setEditingComponent(component);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (component: ConnectionComponent) => {
    if (window.confirm(`Are you sure you want to delete "${component.name}"?`)) {
      deleteMutation.mutate(component.id);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredComponents.length} of {connectionComponents.length} connection components shown
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                size="sm"
                data-testid="button-add-connection"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search connections by name, section, or type..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-connections"
            />
          </div>

          {/* Section Type Filters */}
          <div className="flex flex-wrap gap-2">
            {sectionTypes.map((sectionType) => (
              <Button
                key={sectionType}
                variant={selectedSectionType === sectionType ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSectionType(sectionType)}
                className="whitespace-nowrap"
                data-testid={`filter-section-${sectionType.toLowerCase().replace(' ', '-')}`}
              >
                {sectionType}
                {sectionType !== 'All Sections' && (
                  <span className="ml-1 text-xs">
                    ({connectionComponents.filter(c => getSectionType(c.section_compatibility) === sectionType).length})
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Component Type Filters */}
          <div className="flex flex-wrap gap-2">
            {componentTypes.map((componentType) => (
              <Button
                key={componentType}
                variant={selectedComponentType === componentType ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedComponentType(componentType)}
                className="whitespace-nowrap"
                data-testid={`filter-component-${componentType.toLowerCase().replace(' ', '-')}`}
              >
                {componentType}
                {componentType !== 'All Components' && (
                  <span className="ml-1 text-xs">
                    ({filteredComponents.filter(c => {
                      const componentTypeName = c.component_type.replace('_', ' ').toLowerCase();
                      return (componentType === 'End Plate' && componentTypeName.includes('end plate')) ||
                             (componentType === 'Stiffener Plate' && componentTypeName.includes('stiffener')) ||
                             (componentType === 'Base Plate' && componentTypeName.includes('base plate')) ||
                             (componentType === 'Cleat' && componentTypeName.includes('cleat'));
                    }).length})
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Connection Components Table */}
          {filteredComponents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Section Compatibility</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Weld Time</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {component.component_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {component.section_compatibility}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {component.height}×{component.width}×{component.thickness}mm
                      </TableCell>
                      <TableCell>{component.weight || '-'} kg</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {component.weld_time_per_hour} h/h
                      </TableCell>
                      <TableCell>{component.material_grade || '250'}</TableCell>
                      <TableCell className="text-sm">{component.standard || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(component)}
                            data-testid={`button-edit-${component.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(component)}
                            className="text-red-500 hover:text-red-700"
                            data-testid={`button-delete-${component.id}`}
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
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No connection components found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedSectionType !== 'All Sections' || selectedComponentType !== 'All Components'
                  ? 'Try adjusting your filters or search terms'
                  : 'Add your first connection component to get started'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Component Dialog */}
      <ConnectionComponentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(data) => addMutation.mutate(data)}
        isLoading={addMutation.isPending}
      />

      {/* Edit Component Dialog */}
      <ConnectionComponentDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={(data) => editMutation.mutate({ id: editingComponent!.id, data })}
        isLoading={editMutation.isPending}
        initialData={editingComponent}
      />
    </div>
  );
}

// Connection Component Dialog for Add/Edit
interface ConnectionComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  initialData?: ConnectionComponent | null;
}

const connectionComponentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  component_type: z.enum(['end_plate', 'stiffener_plate', 'base_plate', 'cleat']),
  section_compatibility: z.string().min(1, "Section compatibility is required"),
  height: z.coerce.number().min(0).default(0),
  width: z.coerce.number().min(0).default(0),
  thickness: z.coerce.number().min(0).default(0),
  weight: z.coerce.number().min(0).default(0),
  surface_area: z.coerce.number().min(0).default(0),
  weld_time_per_hour: z.coerce.number().min(0).default(0),
  material_grade: z.string().default('250'),
  standard: z.string().optional().default(''),
  holes: z.coerce.number().min(0).default(0),
  labor_time: z.coerce.number().optional(),
  material_cost: z.coerce.number().optional(),
  unit: z.string().default('each'),
  category: z.string().default('connections'),
  subcategory: z.string().optional(),
  specification: z.string().optional(),
  is_standard: z.boolean().default(true),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

function ConnectionComponentDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading, 
  initialData 
}: ConnectionComponentDialogProps) {
  const form = useForm<z.infer<typeof connectionComponentFormSchema>>({
    resolver: zodResolver(connectionComponentFormSchema),
    defaultValues: {
      name: '',
      component_type: 'end_plate',
      section_compatibility: '',
      height: 0,
      width: 0,
      thickness: 0,
      weight: 0,
      surface_area: 0,
      weld_time_per_hour: 0,
      material_grade: '250',
      standard: '',
      holes: 0,
      is_active: true,
    },
  });

  // Reset form with initialData when dialog opens
  React.useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          name: initialData.name || '',
          component_type: initialData.component_type || 'end_plate',
          section_compatibility: initialData.section_compatibility || '',
          height: parseFloat(initialData.height as any) || 0,
          width: parseFloat(initialData.width as any) || 0,
          thickness: parseFloat(initialData.thickness as any) || 0,
          weight: parseFloat(initialData.weight as any) || 0,
          surface_area: parseFloat(initialData.surface_area as any) || 0,
          weld_time_per_hour: parseFloat(initialData.weld_time_per_hour as any) || 0,
          material_grade: initialData.material_grade || '250',
          standard: initialData.standard || '',
          holes: initialData.holes || 0,
          labor_time: parseFloat(initialData.labor_time as any) || undefined,
          material_cost: parseFloat(initialData.material_cost as any) || undefined,
          unit: initialData.unit || 'each',
          category: initialData.category || 'connections',
          subcategory: initialData.subcategory || undefined,
          specification: initialData.specification || undefined,
          is_standard: initialData.is_standard ?? true,
          is_active: initialData.is_active ?? true,
          notes: initialData.notes || undefined,
        });
      } else {
        form.reset({
          name: '',
          component_type: 'end_plate',
          section_compatibility: '',
          height: 0,
          width: 0,
          thickness: 0,
          weight: 0,
          surface_area: 0,
          weld_time_per_hour: 0,
          material_grade: '250',
          standard: '',
          holes: 0,
          labor_time: undefined,
          material_cost: undefined,
          unit: 'each',
          category: 'connections',
          subcategory: undefined,
          specification: undefined,
          is_standard: true,
          is_active: true,
          notes: undefined,
        });
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: z.infer<typeof connectionComponentFormSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Connection Component' : 'Add Connection Component'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Component Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100PFC End Plate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="component_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Component Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select component type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="end_plate">End Plate</SelectItem>
                        <SelectItem value="stiffener_plate">Stiffener Plate</SelectItem>
                        <SelectItem value="base_plate">Base Plate</SelectItem>
                        <SelectItem value="cleat">Cleat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section_compatibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Compatibility</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100PFC, 150UB, All Sections" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="material_grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 250, 300" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (mm)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (mm)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thickness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thickness (mm)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Properties */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surface_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface Area (m²)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weld_time_per_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weld Time (h/h)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Holes field - only for end plates, base plates, and cleats */}
            {(form.watch('component_type') === 'end_plate' || 
              form.watch('component_type') === 'base_plate' || 
              form.watch('component_type') === 'cleat') && (
              <FormField
                control={form.control}
                name="holes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Holes</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="standard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AS/NZS 3678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (initialData ? 'Update Component' : 'Add Component')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
