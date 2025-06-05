import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, Filter, Download, Upload, Eye, EyeOff, Grid3x3, List, 
  ChevronDown, ChevronRight, Plus, Minus, Building2, Calculator,
  FileText, Edit, Trash2, Copy, Settings, Loader2, 
  Package, Ruler, Weight, DollarSign, AlertTriangle,
  BarChart3, TrendingUp, Activity, MapPin, Phone, Mail,
  CheckCircle, XCircle, Star, StarOff, Archive, ArchiveRestore,
  Paintbrush, Layers, Maximize, Minimize, RotateCcw, Save,
  Info, HelpCircle, ExternalLink, Calendar, Clock,
  Filter as FilterIcon, SortAsc, SortDesc, Zap
} from "lucide-react";
import { Material, Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SurfaceAreaManager from "./surface-area-manager";
import { SupplierForm, SupplierFormData } from "@/components/forms/supplier-form";

interface EnhancedMaterialLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onSubcategoryChange?: (subcategory: string) => void;
}

export default function EnhancedMaterialLibrary({ searchQuery, setSearchQuery, onCategoryChange, onSubcategoryChange }: EnhancedMaterialLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [viewFormat, setViewFormat] = useState<"card" | "list">("list");
  const [cardSize, setCardSize] = useState<"normal" | "small" | "tiny">("normal");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [surfaceAreaMaterial, setSurfaceAreaMaterial] = useState<Material | null>(null);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [isSupplierLoading, setIsSupplierLoading] = useState(false);

  // Handle supplier creation
  const handleCreateSupplier = async (data: SupplierFormData) => {
    setIsSupplierLoading(true);
    try {
      const response = await apiRequest("POST", "/api/suppliers", data);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowAddSupplierDialog(false);
      if (editingMaterial) {
        setEditingMaterial({...editingMaterial, supplier: response.name});
      }
      toast({ title: "Supplier added successfully" });
    } finally {
      setIsSupplierLoading(false);
    }
  };
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CSV Export and Template Download Functions
  const handleExportCSV = () => {
    const csvHeaders = [
      'Category', 'Code', 'Name', 'Width (mm)', 'Width1 (mm)', 'Width2 (mm)', 
      'Thickness (mm)', 'Diameter (mm)', 'Depth (mm)', 'Flange Thickness (mm)', 
      'Web Thickness (mm)', 'Length (mm)', 'Weight (kg/m)', 'Length Options (m)', 
      'Grade', 'Standard', 'Coating', 'Price per kg ($)', 'Price per m ($)', 
      'Surface Area (m²/m)', 'Supplier', 'Active'
    ];
    
    // Use all materials when "All Categories" is selected, otherwise use filtered materials
    const materialsToExport = selectedCategory === "all" ? materials : filteredMaterials;
    
    const csvData = (materialsToExport as Material[]).map((material: Material) => [
      material.category || '',
      material.code || '',
      material.name || '',
      material.width || '',
      material.width1 || '',
      material.width2 || '',
      material.thickness || '',
      material.diameter || '',
      material.depth || '',
      material.flangeTf || '',
      material.webTw || '',
      material.length || '',
      material.weightPerMeter || '',
      material.lengthOptions || '',
      material.grade || '',
      material.standard || '',
      material.coating || '',
      material.pricePerKg || '',
      material.pricePerMeter || '',
      material.surfaceAreaPerMeter || '',
      material.supplier || '',
      material.isActive ? 'true' : 'false'
    ]);
    
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
    
    // Generate filename based on selected category
    const categoryName = selectedCategory === "all" 
      ? "All_Categories" 
      : selectedCategory.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const date = new Date().toISOString().split('T')[0];
    const filename = `Materials_${categoryName}_${date}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${materialsToExport.length} materials to ${filename}`
    });
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Category*', 'Code', 'Name*', 'Width (mm)', 'Width1 (mm)', 'Width2 (mm)', 
      'Thickness (mm)', 'Diameter (mm)', 'Depth (mm)', 'Flange Thickness (mm)', 
      'Web Thickness (mm)', 'Length (mm)', 'Weight (kg/m)*', 'Length Options (m)', 
      'Grade', 'Standard', 'Coating', 'Price per kg ($)', 'Price per m ($)', 
      'Surface Area (m²/m)', 'Supplier', 'Active (true/false)'
    ];
    
    const templateRow = [
      'Structural Steel', 'UB254X146X31', 'Universal Beam 254x146x31', '146', '', '', 
      '8.6', '', '254', '13.2', '8.6', '12000', '30.7', '6,9,12', 
      '300E', 'AS/NZS 3679.1', 'Uncoated', '1.85', '56.80', 
      '1.245', 'ASMUSS Steel Distributors', 'true'
    ];
    
    const csvContent = [templateHeaders, templateRow]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'material_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Material import template downloaded successfully"
    });
  };

  // Data fetching
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Categorize materials for enhanced filtering
  const categorizeeMaterial = (material: Material): string[] => {
    const categories = [];
    
    // Primary category based on material type
    if (material.category) {
      categories.push(material.category);
    }
    
    // Secondary categorization based on properties
    if (material.grade) {
      categories.push(`Grade ${material.grade}`);
    }
    
    if (material.coating && material.coating !== 'Uncoated') {
      categories.push(`${material.coating} Coated`);
    }
    
    // Size-based categories
    if (material.weightPerMeter) {
      if (material.weightPerMeter > 50) {
        categories.push('Heavy Section');
      } else if (material.weightPerMeter < 10) {
        categories.push('Light Section');
      } else {
        categories.push('Medium Section');
      }
    }
    
    return categories;
  };

  // Enhanced filtering logic
  const filteredMaterials = (materials as Material[]).filter((material: Material) => {
    const matchesSearch = searchQuery === "" || 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.grade?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
      material.category === selectedCategory ||
      categorizeeMaterial(material).includes(selectedCategory);
    
    const matchesSubcategory = selectedSubcategory === "all" ||
      material.grade === selectedSubcategory ||
      material.coating === selectedSubcategory ||
      material.supplier === selectedSubcategory;
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Get unique categories for filtering
  const categories = [...new Set((materials as Material[]).map(m => m.category).filter(Boolean))];
  const subcategories = [...new Set(filteredMaterials.map(m => m.grade || m.coating || m.supplier).filter(Boolean))];

  // Material management mutations
  const updateMaterialMutation = useMutation({
    mutationFn: async (updatedMaterial: Partial<Material> & { id: number }) => {
      return apiRequest("PATCH", `/api/materials/${updatedMaterial.id}`, updatedMaterial);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setEditingMaterial(null);
      toast({ title: "Material updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating material", variant: "destructive" });
    }
  });

  const updateSurfaceAreaMutation = useMutation({
    mutationFn: async ({ id, surfaceAreaPerMeter }: { id: number; surfaceAreaPerMeter: number }) => {
      return apiRequest("PATCH", `/api/materials/${id}`, { surfaceAreaPerMeter });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSurfaceAreaMaterial(null);
      toast({ title: "Surface area updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating surface area", variant: "destructive" });
    }
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSelectedMaterials(new Set());
      toast({ title: "Material deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting material", variant: "destructive" });
    }
  });

  // Selection management
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials(new Set());
    } else {
      const allIds = new Set(filteredMaterials.map((m: Material) => m.id));
      setSelectedMaterials(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectMaterial = (id: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMaterials(newSelected);
  };

  useEffect(() => {
    if (onCategoryChange) {
      onCategoryChange(selectedCategory);
    }
  }, [selectedCategory, onCategoryChange]);

  useEffect(() => {
    if (onSubcategoryChange) {
      onSubcategoryChange(selectedSubcategory);
    }
  }, [selectedSubcategory, onSubcategoryChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading materials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Library
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="hidden sm:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="hidden sm:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewFormat === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewFormat("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewFormat === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewFormat("card")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search Materials</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, code, category, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
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
            <div className="min-w-[150px]">
              <Label htmlFor="subcategory">Filter By</Label>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {filteredMaterials.length} of {materials.length} materials
              </span>
              {selectedMaterials.size > 0 && (
                <Badge variant="secondary">
                  {selectedMaterials.size} selected
                </Badge>
              )}
            </div>
            {viewFormat === "card" && (
              <Select value={cardSize} onValueChange={(value: "normal" | "small" | "tiny") => setCardSize(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="tiny">Tiny</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedMaterials.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Bulk Actions:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk delete logic would go here
                  toast({ title: "Bulk delete functionality coming soon" });
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk export logic would go here
                  toast({ title: "Bulk export functionality coming soon" });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials Display */}
      {viewFormat === "list" ? (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material: Material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMaterials.has(material.id)}
                          onCheckedChange={() => handleSelectMaterial(material.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{material.name}</div>
                          {material.code && (
                            <div className="text-sm text-muted-foreground">{material.code}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {material.width && <div>W: {material.width}mm</div>}
                          {material.depth && <div>D: {material.depth}mm</div>}
                          {material.thickness && <div>T: {material.thickness}mm</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {material.weightPerMeter && (
                          <span>{material.weightPerMeter} kg/m</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {material.pricePerKg && <div>${material.pricePerKg}/kg</div>}
                          {material.pricePerMeter && <div>${material.pricePerMeter}/m</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {material.supplier && (
                          <Badge variant="secondary">{material.supplier}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMaterial(material)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSurfaceAreaMaterial(material)}
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMaterialMutation.mutate(material.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 ${
          cardSize === "tiny" ? "grid-cols-6" : 
          cardSize === "small" ? "grid-cols-4" : 
          "grid-cols-3"
        }`}>
          {filteredMaterials.map((material: Material) => (
            <Card key={material.id} className={`${
              selectedMaterials.has(material.id) ? "ring-2 ring-primary" : ""
            } ${cardSize === "tiny" ? "p-2" : ""}`}>
              <CardHeader className={cardSize === "tiny" ? "p-2" : "pb-2"}>
                <div className="flex items-start justify-between">
                  <CardTitle className={`${
                    cardSize === "tiny" ? "text-xs" : cardSize === "small" ? "text-sm" : "text-base"
                  } line-clamp-2`}>
                    {material.name}
                  </CardTitle>
                  <Checkbox
                    checked={selectedMaterials.has(material.id)}
                    onCheckedChange={() => handleSelectMaterial(material.id)}
                    className={cardSize === "tiny" ? "h-3 w-3" : ""}
                  />
                </div>
                {material.code && (
                  <div className={`text-muted-foreground ${
                    cardSize === "tiny" ? "text-xs" : "text-sm"
                  }`}>
                    {material.code}
                  </div>
                )}
              </CardHeader>
              <CardContent className={`space-y-2 ${cardSize === "tiny" ? "p-2 pt-0" : "pt-0"}`}>
                <Badge variant="outline" className={cardSize === "tiny" ? "text-xs px-1" : ""}>
                  {material.category}
                </Badge>
                
                {cardSize !== "tiny" && (
                  <>
                    <div className="space-y-1">
                      {material.width && (
                        <div className="text-sm text-muted-foreground">
                          Width: {material.width}mm
                        </div>
                      )}
                      {material.depth && (
                        <div className="text-sm text-muted-foreground">
                          Depth: {material.depth}mm
                        </div>
                      )}
                      {material.weightPerMeter && (
                        <div className="text-sm text-muted-foreground">
                          Weight: {material.weightPerMeter} kg/m
                        </div>
                      )}
                    </div>

                    {(material.pricePerKg || material.pricePerMeter) && (
                      <div className="space-y-1">
                        {material.pricePerKg && (
                          <div className="text-sm font-medium">
                            ${material.pricePerKg}/kg
                          </div>
                        )}
                        {material.pricePerMeter && (
                          <div className="text-sm font-medium">
                            ${material.pricePerMeter}/m
                          </div>
                        )}
                      </div>
                    )}

                    {material.supplier && (
                      <Badge variant="secondary" className="text-xs">
                        {material.supplier}
                      </Badge>
                    )}
                  </>
                )}

                <div className={`flex justify-between ${cardSize === "tiny" ? "mt-1" : "mt-4"}`}>
                  <Button
                    variant="ghost"
                    size={cardSize === "tiny" ? "sm" : "sm"}
                    onClick={() => setEditingMaterial(material)}
                    className={cardSize === "tiny" ? "h-6 w-6 p-0" : ""}
                  >
                    <Edit className={cardSize === "tiny" ? "h-3 w-3" : "h-4 w-4"} />
                  </Button>
                  <Button
                    variant="ghost"
                    size={cardSize === "tiny" ? "sm" : "sm"}
                    onClick={() => setSurfaceAreaMaterial(material)}
                    className={cardSize === "tiny" ? "h-6 w-6 p-0" : ""}
                  >
                    <Calculator className={cardSize === "tiny" ? "h-3 w-3" : "h-4 w-4"} />
                  </Button>
                  <Button
                    variant="ghost"
                    size={cardSize === "tiny" ? "sm" : "sm"}
                    onClick={() => deleteMaterialMutation.mutate(material.id)}
                    className={cardSize === "tiny" ? "h-6 w-6 p-0" : ""}
                  >
                    <Trash2 className={cardSize === "tiny" ? "h-3 w-3" : "h-4 w-4"} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Material Dialog */}
      {editingMaterial && (
        <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Material - {editingMaterial.name}</DialogTitle>
              <DialogDescription>
                Update material properties and pricing information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Material Name</Label>
                  <Input
                    id="edit-name"
                    value={editingMaterial.name}
                    onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Code</Label>
                  <Input
                    id="edit-code"
                    value={editingMaterial.code || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, code: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-width">Width (mm)</Label>
                  <Input
                    id="edit-width"
                    type="number"
                    value={editingMaterial.width || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, width: parseFloat(e.target.value) || undefined})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-depth">Depth (mm)</Label>
                  <Input
                    id="edit-depth"
                    type="number"
                    value={editingMaterial.depth || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, depth: parseFloat(e.target.value) || undefined})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-thickness">Thickness (mm)</Label>
                  <Input
                    id="edit-thickness"
                    type="number"
                    step="0.1"
                    value={editingMaterial.thickness || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, thickness: parseFloat(e.target.value) || undefined})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price-kg">Price per kg ($)</Label>
                  <Input
                    id="edit-price-kg"
                    type="number"
                    step="0.01"
                    value={editingMaterial.pricePerKg || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, pricePerKg: parseFloat(e.target.value) || undefined})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price-m">Price per meter ($)</Label>
                  <Input
                    id="edit-price-m"
                    type="number"
                    step="0.01"
                    value={editingMaterial.pricePerMeter || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, pricePerMeter: parseFloat(e.target.value) || undefined})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier</Label>
                <div className="flex gap-2">
                  <Select
                    value={editingMaterial.supplier || ""}
                    onValueChange={(value) => {
                      if (value === "add-new") {
                        setShowAddSupplierDialog(true);
                      } else {
                        setEditingMaterial({...editingMaterial, supplier: value});
                        
                        // Auto-update pricing from primary supplier if available
                        const selectedSupplier = suppliers.find(s => s.name === value);
                        if (selectedSupplier) {
                          // Find supplier's pricing for this material
                          // This would be implemented when we have material-supplier relationships
                          console.log("Selected supplier:", selectedSupplier);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or add supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {supplier.name}
                          </div>
                        </SelectItem>
                      ))}
                      <Separator />
                      <SelectItem value="add-new">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Plus className="w-4 h-4" />
                          Add New Supplier
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Weight per Meter (kg/m)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.01"
                  value={editingMaterial.weightPerMeter || ""}
                  onChange={(e) => setEditingMaterial({...editingMaterial, weightPerMeter: parseFloat(e.target.value) || undefined})}
                  placeholder="Weight per meter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-grade">Grade</Label>
                  <Input
                    id="edit-grade"
                    value={editingMaterial.grade || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, grade: e.target.value})}
                    placeholder="e.g., 300E, 250"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-standard">Standard</Label>
                  <Input
                    id="edit-standard"
                    value={editingMaterial.standard || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, standard: e.target.value})}
                    placeholder="e.g., AS/NZS 3679.1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-coating">Coating</Label>
                <Select
                  value={editingMaterial.coating || ""}
                  onValueChange={(value) => setEditingMaterial({...editingMaterial, coating: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select coating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uncoated">Uncoated</SelectItem>
                    <SelectItem value="Galvanized">Galvanized</SelectItem>
                    <SelectItem value="Painted">Painted</SelectItem>
                    <SelectItem value="Powder Coated">Powder Coated</SelectItem>
                    <SelectItem value="Zinc Plated">Zinc Plated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingMaterial(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => updateMaterialMutation.mutate(editingMaterial)}
                disabled={updateMaterialMutation.isPending}
              >
                {updateMaterialMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Surface Area Manager Dialog */}
      {surfaceAreaMaterial && (
        <Dialog open={!!surfaceAreaMaterial} onOpenChange={() => setSurfaceAreaMaterial(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Surface Area Calculator - {surfaceAreaMaterial.name}</DialogTitle>
              <DialogDescription>
                Calculate surface area for coating and paint estimates
              </DialogDescription>
            </DialogHeader>
            <SurfaceAreaManager
              material={surfaceAreaMaterial}
              onSave={(surfaceArea) => {
                updateSurfaceAreaMutation.mutate({
                  id: surfaceAreaMaterial.id,
                  surfaceAreaPerMeter: surfaceArea
                });
              }}
              onClose={() => setSurfaceAreaMaterial(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add New Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Add New Supplier</span>
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            mode="create"
            onSubmit={handleCreateSupplier}
            onCancel={() => setShowAddSupplierDialog(false)}
            isLoading={isSupplierLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}