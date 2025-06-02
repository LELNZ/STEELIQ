import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Search, Package, CheckSquare, Square, AlertTriangle, Loader2, Grid3X3, List, Minus, Plus, Calculator, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingSpinner, LoadingOverlay, LoadingState } from "@/components/ui/loading-spinner";
import { MaterialTypeIndicator, MaterialIcon } from "./material-icons";
import SurfaceAreaManager from "./surface-area-manager";
import { Material } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateMaterialSurfaceArea } from "@/lib/surface-area-calculator";
import { calculateMaterialSurfaceArea as calculateUnifiedSurfaceArea } from "@/lib/unified-surface-area-calculator";

// Import dimensional reference images
import anglesImg from "@assets/Angles.png";
import unequalAnglesImg from "@assets/Unequal Angles.png";
import cattleRailImg from "@assets/Cattle Rail.png";
import channelImg from "@assets/Channel.png";
import flatImg from "@assets/Flstd.png";
import meshImg from "@assets/Mesh.png";
import pipeImg from "@assets/Pipe.png";
import rebarImg from "@assets/Reinforcing bar.png";
import rhsImg from "@assets/RHS.png";
import roundImg from "@assets/Round.png";
import sheetMetalImg from "@assets/Sheet metal.png";
import shsImg from "@assets/SHS.png";
import squareBarImg from "@assets/Square Bar.png";
// Updated UB/UC images - force refresh
import ubImg from "@assets/Universal Beam.png";
import ucImg from "@assets/Universal Column.png";

interface EnhancedMaterialLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onSubcategoryChange?: (subcategory: string) => void;
}

// Structured category system for Lateral Engineering (ordered as requested)
// Dimensional reference image mapping
const DIMENSION_IMAGES = {
  "Merchant Bar": {
    "Flats": flatImg,
    "Equal Angles": anglesImg,
    "Unequal Angles": unequalAnglesImg,
    "Rounds": roundImg,
    "Squares": squareBarImg
  },
  "SHS/RHS": {
    "SHS": shsImg,
    "RHS": rhsImg,
    "Cattle Rail Hollow Section": cattleRailImg
  },
  "Structural Sections": {
    "Mild Steel Channel": channelImg,
    "Cold Formed Channel": channelImg,
    "Universal Beam": ubImg,
    "Universal Column": ucImg
  },
  "Pregal": {
    "Pregal Angles": anglesImg,
    "Pregal Flats": flatImg,
    "Pregal Channels": channelImg
  },
  "Purlins": {
    "C Purlins": channelImg,
    "Z Purlins": channelImg,
    "Sigma Purlins": channelImg
  },
  "Pipe": {
    "Seamless Line Pipe": pipeImg,
    "ERW Line Pipe": pipeImg,
    "Black Pipe": pipeImg,
    "Primed Pipe": pipeImg,
    "Galvanised Pipe": pipeImg
  },
  "Sheet Metal": {
    "Mild Steel Plate": sheetMetalImg,
    "Mild Steel Chequer Plate": sheetMetalImg,
    "Weather Resistant Plate": sheetMetalImg,
    "Cold Rolled": sheetMetalImg,
    "Electrogalvanised Sheet": sheetMetalImg,
    "Galvanised Sheet": sheetMetalImg
  },
  "Reinforcing": {
    "Rebar": rebarImg,
    "Mesh": meshImg,
    "Deformed Bar": rebarImg
  }
} as const;

const CATEGORY_STRUCTURE = {
  "Merchant Bar": {
    subcategories: ["Flats", "Equal Angles", "Unequal Angles", "Rounds", "Squares"],
    description: "Standard merchant bar sections"
  },
  "SHS/RHS": {
    subcategories: ["SHS", "RHS", "Cattle Rail Hollow Section"],
    description: "Square and rectangular hollow sections"
  },
  "Structural Sections": {
    subcategories: ["Mild Steel Channel", "Cold Formed Channel", "Universal Beam", "Universal Column"],
    description: "Structural steel sections"
  },
  "Pregal": {
    subcategories: ["Pregal Angles", "Pregal Flats", "Pregal Channels"],
    description: "Pre-galvanized steel sections"
  },
  "Purlins": {
    subcategories: ["C Purlins", "Z Purlins", "Sigma Purlins"],
    description: "Structural purlins for roofing and cladding"
  },
  "Pipe": {
    subcategories: [
      "Seamless Line Pipe", 
      "ERW Line Pipe", 
      "Black Pipe", 
      "Primed Pipe", 
      "Galvanised Pipe"
    ],
    description: "Pipe products"
  },
  "Sheet Metal": {
    subcategories: [
      "Mild Steel Plate", 
      "Mild Steel Chequer Plate", 
      "Weather Resistant Plate", 
      "Cold Rolled", 
      "Electrogalvanised Sheet", 
      "Galvanised Sheet"
    ],
    description: "Sheet metal products"
  },
  "Reinforcing": {
    subcategories: ["Rebar", "Mesh", "Deformed Bar"],
    description: "Reinforcing steel products"
  }
};

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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Bulk surface area calculation mutation
  const bulkCalculateSurfaceAreaMutation = useMutation({
    mutationFn: async () => {
      const materialsResponse = await fetch('/api/materials');
      const materials = await materialsResponse.json();
      const updates = [];
      
      for (const material of materials) {
        // Only calculate if surface area is missing or zero
        if (!material.surfaceAreaPerMeter || parseFloat(material.surfaceAreaPerMeter) === 0) {
          const calculatedArea = calculateMaterialSurfaceArea(material);
          if (calculatedArea && calculatedArea > 0) {
            updates.push({
              id: material.id,
              surfaceAreaPerMeter: calculatedArea.toFixed(4)
            });
          }
        }
      }
      
      // Update materials with calculated surface areas
      const promises = updates.map(update => 
        fetch(`/api/materials/${update.id}/update`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surfaceAreaPerMeter: update.surfaceAreaPerMeter })
        })
      );
      
      await Promise.all(promises);
      return updates.length;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Surface Area Calculation Complete",
        description: `Updated surface area for ${updatedCount} materials`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: "Failed to calculate surface areas. Please try again.",
      });
      console.error("Bulk surface area calculation error:", error);
    }
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/materials"],
  });

  // Streamlined material categorization logic
  const categorizeeMaterial = (material: Material): string[] => {
    const name = material.name.toLowerCase();
    const code = material.code.toLowerCase();
    const category = (material.category || "").toLowerCase();
    const categories: string[] = [];
    
    // Helper to check if material is Duragal/Pregal
    const isDuragal = name.includes('duragal') || name.includes('pregal') || code.includes('dga') || code.includes('dgfl') || category.includes('duragal');

    // Pregal Sections (Priority - handle first to avoid duplicates)
    if (isDuragal) {
      if (name.includes('angle')) categories.push('Pregal Angles');
      else if (name.includes('flat') || code.includes('dgfl') || category.includes('duragal flats')) categories.push('Pregal Flats');
      else if (name.includes('channel')) categories.push('Pregal Channels');
      return categories; // Return early to prevent other categorizations
    }

    // Merchant Bar (only non-Duragal materials)
    if (name.includes('flat') || code.includes('flat')) categories.push('Flats');
    if (name.includes('equal angle') || name.includes('ea ') || code.includes('ea')) categories.push('Equal Angles');
    if (name.includes('unequal angle') || name.includes('ua ') || code.includes('ua')) categories.push('Unequal Angles');
    if (name.includes('round') || name.includes('rod') || code.includes('rd')) categories.push('Rounds');
    if (name.includes('square bar') || name.includes('sq ') || code.includes('sq')) categories.push('Squares');

    // Structural Sections
    if (name.includes('channel')) {
      if (name.includes('cold formed') || name.includes('cf')) categories.push('Cold Formed Channel');
      else categories.push('Mild Steel Channel');
    }
    if (name.includes('universal beam') || name.includes('ub') || code.includes('ub')) categories.push('Universal Beam');
    if (name.includes('universal column') || name.includes('uc') || code.includes('uc')) categories.push('Universal Column');

    // Sheet Metal (consolidated logic)
    if (name.includes('plate') || category.includes('plate')) {
      if (name.includes('chequer') || name.includes('checker') || code.includes('plcq')) categories.push('Mild Steel Chequer Plate');
      else if (name.includes('weather resistant') || code.includes('plwr')) categories.push('Weather Resistant Plate');
      else categories.push('Mild Steel Plate');
    }
    if (name.includes('sheet') || category.includes('sheet')) {
      if (name.includes('cold rolled')) categories.push('Cold Rolled');
      else if (name.includes('electrogalvanised') || name.includes('electrogalvanized') || category.includes('electrogalvanized')) categories.push('Electrogalvanised Sheet');
      else categories.push('Galvanised Sheet');
    }

    // SHS/RHS
    if (name.includes('shs') || name.includes('square hollow')) categories.push('SHS');
    if (name.includes('rhs') || name.includes('rectangular hollow')) categories.push('RHS');
    if (name.includes('cattle rail') || name.includes('oval rail')) categories.push('Cattle Rail Hollow Section');

    // Pipe
    if (name.includes('pipe')) {
      if (name.includes('seamless')) categories.push('Seamless Line Pipe');
      else if (name.includes('erw')) categories.push('ERW Line Pipe');
      else if (name.includes('black')) categories.push('Black Pipe');
      else if (name.includes('primed')) categories.push('Primed Pipe');
      else categories.push('Galvanised Pipe');
    }

    // Reinforcing (check early to prevent duplicates)
    if (name.includes('mesh')) {
      categories.push('Mesh');
      return categories; // Exit early to prevent mesh appearing in other categories
    }
    if (name.includes('rebar') || name.includes('reinforcing') || name.includes('deformed bar')) categories.push('Rebar');

    return categories;
  };

  // Optimized material filtering - only show materials when category selected or search entered
  const filteredMaterials = (materials as Material[]).filter((material: Material) => {
    // Don't show any materials by default - require category selection or search
    if (selectedCategory === "all" && !searchQuery.trim()) {
      return false;
    }

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      material.name.toLowerCase().includes(searchLower) ||
      material.code.toLowerCase().includes(searchLower) ||
      (material.grade && material.grade.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;
    if (selectedCategory === "all") return true;

    const materialCategories = categorizeeMaterial(material);
    const categorySubcategories = CATEGORY_STRUCTURE[selectedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories || [];
    
    if (selectedSubcategory === "all") {
      return materialCategories.some(cat => categorySubcategories.includes(cat));
    }

    return materialCategories.includes(selectedSubcategory);
  });

  // Delete selected materials mutation
  const deleteSelectedMutation = useMutation({
    mutationFn: async (materialIds: number[]) => {
      const promises = materialIds.map(id => 
        fetch(`/api/materials/${id}`, { method: "DELETE" })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSelectedMaterials(new Set());
      setSelectAll(false);
      toast({
        title: "Success",
        description: `Deleted ${selectedMaterials.size} materials successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete selected materials",
        variant: "destructive",
      });
    },
  });

  // Edit material mutation
  const editMaterialMutation = useMutation({
    mutationFn: async (data: { id: number; material: Partial<Material> }) => {
      console.log('Updating material:', data.id, data.material);
      const response = await fetch(`/api/materials/${data.id}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.material),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Update failed:', errorData);
        throw new Error(`Failed to update material: ${response.status}`);
      }
      
      const responseText = await response.text();
      try {
        const result = JSON.parse(responseText);
        return result;
      } catch (parseError) {
        throw new Error('Server returned invalid JSON response');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setEditingMaterial(null);
      toast({
        title: "Success",
        description: "Material updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update material",
        variant: "destructive",
      });
    },
  });

  // Surface area update mutation
  const updateSurfaceAreaMutation = useMutation({
    mutationFn: async (data: { id: number; surfaceAreaPerMeter: number }) => {
      const response = await fetch(`/api/materials/${data.id}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ surfaceAreaPerMeter: data.surfaceAreaPerMeter.toString() }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update surface area: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      try {
        const result = JSON.parse(responseText);
        console.log('Update successful:', result);
        return result;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Server returned invalid JSON response');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSurfaceAreaMaterial(null);
      toast({
        title: "Success",
        description: "Surface area updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update surface area",
        variant: "destructive",
      });
    },
  });

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials(new Set());
      setSelectAll(false);
    } else {
      // Select all materials from the current view (filtered or all)
      const allIds = new Set(filteredMaterials.map((m: Material) => m.id));
      setSelectedMaterials(allIds);
      setSelectAll(true);
    }
  };

  // Handle individual material selection
  const handleMaterialSelect = (materialId: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterials(newSelected);
    setSelectAll(newSelected.size === filteredMaterials.length);
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory) {
      // Toggle expansion
      setExpandedCategory(expandedCategory === category ? null : category);
    } else {
      // Select new category
      setSelectedCategory(category);
      setExpandedCategory(category);
      setSelectedSubcategory("all");
      setSelectedMaterials(new Set());
      setSelectAll(false);
      onCategoryChange?.(category);
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedMaterials(new Set());
    setSelectAll(false);
    onSubcategoryChange?.(subcategory);
  };

  // Handle delete selected
  const handleDeleteSelected = () => {
    if (selectedMaterials.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedMaterials.size} selected materials? This action cannot be undone.`)) {
      deleteSelectedMutation.mutate(Array.from(selectedMaterials));
    }
  };

  const currentSubcategories = selectedCategory !== "all" 
    ? CATEGORY_STRUCTURE[selectedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories || []
    : [];

  return (
    <div className="space-y-6">
      {/* Quick-Click Category Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Steel Catalogue Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* All Category and Main Category Quick-Click Buttons - Horizontal Layout */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs px-3 py-1 h-auto"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSubcategory("all");
                setExpandedCategory(null);
                setSelectedMaterials(new Set());
                setSelectAll(false);
              }}
            >
              All Categories
            </Button>
            {Object.entries(CATEGORY_STRUCTURE).map(([category, info]) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs px-4 py-1 h-auto font-medium"
                onClick={() => handleCategoryChange(category)}
              >
                {category}
                {selectedCategory === category && expandedCategory === category && " ▼"}
                {selectedCategory === category && expandedCategory !== category && " ▶"}
              </Button>
            ))}
          </div>

          {/* Subcategory Buttons (Expandable Row) */}
          {expandedCategory && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200 bg-gray-50 p-3 rounded-lg border">
              <Button
                variant={selectedSubcategory === "all" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-xs px-3 py-1 h-auto"
                onClick={() => handleSubcategoryChange("all")}
              >
                All {expandedCategory}
              </Button>
              {CATEGORY_STRUCTURE[expandedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories.map((subcategory) => (
                <Button
                  key={subcategory}
                  variant={selectedSubcategory === subcategory ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full text-xs px-3 py-1 h-auto"
                  onClick={() => handleSubcategoryChange(subcategory)}
                >
                  {subcategory}
                </Button>
              ))}
            </div>
          )}


        </CardContent>
      </Card>

      {/* Search and Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search materials, codes, grades..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View Controls and Selection */}
            <div className="flex items-center gap-4">
              {/* Calculate All Surface Areas Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => bulkCalculateSurfaceAreaMutation.mutate()}
                disabled={bulkCalculateSurfaceAreaMutation.isPending}
                className="whitespace-nowrap"
              >
                {bulkCalculateSurfaceAreaMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate All
                  </>
                )}
              </Button>
              {/* View Format Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewFormat === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFormat("card")}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewFormat === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFormat("list")}
                  className="h-8 px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Card Size Controls (only show in card view) */}
              {viewFormat === "card" && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <Button
                    variant={cardSize === "tiny" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardSize("tiny")}
                    className="h-8 px-2 text-xs"
                  >
                    25%
                  </Button>
                  <Button
                    variant={cardSize === "small" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardSize("small")}
                    className="h-8 px-2 text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    variant={cardSize === "normal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardSize("normal")}
                    className="h-8 px-2 text-xs"
                  >
                    100%
                  </Button>
                </div>
              )}

              <div className="border-l pl-4 flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredMaterials.length})
                </label>
              </div>

              {selectedMaterials.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteSelectedMutation.isPending}
                >
                  {deleteSelectedMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedMaterials.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Loading materials...</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : filteredMaterials.length > 0 ? (
        viewFormat === "card" ? (
          // Card View with Size Options
          <div className={`grid gap-4 ${
            cardSize === "tiny" 
              ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" 
              : cardSize === "small" 
              ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" 
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}>
            {filteredMaterials.map((material: Material) => (
              <Card 
                key={material.id} 
                className={`hover:shadow-md transition-all ${
                  selectedMaterials.has(material.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                } ${cardSize === "tiny" ? "text-xs" : cardSize === "small" ? "text-sm" : ""}`}
              >
                <CardHeader className={cardSize === "tiny" ? "pb-2 px-3 pt-3" : cardSize === "small" ? "pb-2" : "pb-3"}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      <Checkbox
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => handleMaterialSelect(material.id)}
                        className={cardSize === "tiny" ? "h-3 w-3" : ""}
                      />
                      {/* Material Type Icon */}
                      <MaterialTypeIndicator 
                        category={material.category || ""} 
                        name={material.name}
                        size={cardSize === "tiny" ? "sm" : "md"}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className={`font-semibold text-foreground leading-tight ${
                          cardSize === "tiny" ? "text-xs" : cardSize === "small" ? "text-sm" : "text-lg"
                        }`}>
                          <span className="line-clamp-2">{material.name}</span>
                        </CardTitle>
                        <Badge variant="outline" className={`mt-1 ${
                          cardSize === "tiny" ? "text-xs px-1 py-0" : cardSize === "small" ? "text-xs" : ""
                        }`}>
                          {material.code}
                        </Badge>
                      </div>
                    </div>
                    {cardSize !== "tiny" && (
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSurfaceAreaMaterial(material)}
                          title="Calculate Surface Area"
                        >
                          <Calculator className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingMaterial(material)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${material.name}?`)) {
                              deleteSelectedMutation.mutate([material.id]);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className={`space-y-2 ${
                  cardSize === "tiny" ? "px-3 pb-3" : cardSize === "small" ? "space-y-3" : "space-y-4"
                }`}>
                  {cardSize !== "tiny" && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Show diameter for rounds, pipes, and reinforcing bars, otherwise show width/thickness */}
                      {(material.category?.toLowerCase().includes('round') || 
                        material.category?.toLowerCase().includes('pipe') || 
                        material.category?.toLowerCase().includes('chs') ||
                        material.category?.toLowerCase().includes('reinforc')) ? (
                        <>
                          <div>
                            <p className="text-muted-foreground">Diameter (mm)</p>
                            <p className="font-medium">⌀ {material.diameter || 'N/A'}</p>
                          </div>
                          {material.thickness && (
                            <div>
                              <p className="text-muted-foreground">Wall Thickness</p>
                              <p className="font-medium">{material.thickness}mm</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-muted-foreground">Width</p>
                            <p className="font-medium">{material.width || 'N/A'}</p>
                          </div>
                          {/* Show separate web and flange thickness for structural sections */}
                          {(material.category?.toLowerCase().includes('channel') || 
                            material.category?.toLowerCase().includes('structural channels') ||
                            material.category?.toLowerCase().includes('universal beam') ||
                            material.category?.toLowerCase().includes('universal column')) ? (
                            <>
                              <div>
                                <p className="text-muted-foreground">Web Thickness</p>
                                <p className="font-medium">{material.webTw || 'N/A'}mm</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Flange Thickness</p>
                                <p className="font-medium">{material.flangeTf || 'N/A'}mm</p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-muted-foreground">Thickness</p>
                              <p className="font-medium">{material.thickness || 'N/A'}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className={`${cardSize === "tiny" ? "space-y-1" : "grid grid-cols-2 gap-2"}`}>
                    {cardSize !== "tiny" && (
                      <div>
                        <p className="text-muted-foreground">Grade</p>
                        <p className="font-medium">{material.grade || 'Standard'}</p>
                      </div>
                    )}
                    <div className={cardSize === "tiny" ? "text-center" : "text-right"}>
                      <p className="text-muted-foreground">Weight</p>
                      <p className="font-medium">{material.weightPerMeter || 0} kg/m</p>
                    </div>
                    {cardSize !== "tiny" && (
                      <div>
                        <p className="text-muted-foreground">Surface Area</p>
                        <p className="font-medium">
                          {(() => {
                            // Use unified calculation system for display consistency
                            if (material.width && material.depth && material.category) {
                              const dimensions = {
                                width: parseFloat(material.width),
                                depth: parseFloat(material.depth),
                                webThickness: material.webTw ? parseFloat(material.webTw.toString()) : 0,
                                flangeThickness: material.flangeTf ? parseFloat(material.flangeTf.toString()) : 0
                              };
                              
                              const result = calculateUnifiedSurfaceArea(
                                material.category,
                                dimensions,
                                'external-internal'
                              );
                              
                              return `${result.total.toFixed(3)} m²/m`;
                            } else if (material.surfaceAreaPerMeter) {
                              return `${Number(material.surfaceAreaPerMeter).toFixed(3)} m²/m`;
                            } else {
                              return 'Not calculated';
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>

                  {cardSize !== "tiny" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground">Price</p>
                          <p className="font-medium">
                            {material.pricePerMeter 
                              ? `$${material.pricePerMeter}/m`
                              : material.pricePerKg
                              ? `$${material.pricePerKg}/kg`
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Available Lengths */}
                      {material.lengthOptions && (
                        <div>
                          <p className="text-muted-foreground text-xs">Available Lengths</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {material.lengthOptions.split(';').map((length, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs px-1 py-0"
                              >
                                {length.trim()}m
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {filteredMaterials.map((material: Material) => (
              <Card 
                key={material.id} 
                className={`hover:shadow-sm transition-all ${
                  selectedMaterials.has(material.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Checkbox
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => handleMaterialSelect(material.id)}
                      />
                      {/* Material Type Icon for List View */}
                      <MaterialTypeIndicator 
                        category={material.category || ""} 
                        name={material.name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                        <div className="col-span-2">
                          <p className="font-semibold">{material.name}</p>
                          <p className="text-sm text-muted-foreground">{material.code}</p>
                          {/* Available Lengths for List View */}
                          {material.lengthOptions && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {material.lengthOptions.split(';').map((length, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className="text-xs px-1 py-0"
                                >
                                  {length.trim()}m
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          {/* Show diameter for rounds, pipes, and reinforcing bars, otherwise show width/thickness */}
                          {(material.category?.toLowerCase().includes('round') || 
                            material.category?.toLowerCase().includes('pipe') || 
                            material.category?.toLowerCase().includes('chs') ||
                            material.category?.toLowerCase().includes('reinforc')) ? (
                            <>
                              <p className="text-sm">⌀: {material.diameter || 'N/A'}mm</p>
                              {material.thickness && <p className="text-sm">T: {material.thickness}mm</p>}
                            </>
                          ) : (
                            <>
                              <p className="text-sm">W: {material.width || 'N/A'}</p>
                              {material.depth && (
                                <div className="flex items-center gap-1">
                                  <p className="text-sm">D: {material.depth}mm</p>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="w-3 h-3 text-muted-foreground hover:text-blue-600" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Depth/height dimension of the steel profile (mm)</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                              {/* Show separate web and flange thickness for structural sections */}
                              {(material.category?.toLowerCase().includes('channel') || 
                                material.category?.toLowerCase().includes('structural channels') ||
                                material.category?.toLowerCase().includes('universal beam') ||
                                material.category?.toLowerCase().includes('universal column')) ? (
                                <>
                                  <p className="text-sm">Web: {material.webTw || 'N/A'}mm</p>
                                  <p className="text-sm">Flange: {material.flangeTf || 'N/A'}mm</p>
                                </>
                              ) : (
                                <p className="text-sm">T: {material.thickness || 'N/A'}</p>
                              )}
                            </>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{material.weightPerMeter || 0} kg/m</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-blue-600">
                              {(() => {
                                // Always use stored database value for consistency
                                if (material.surfaceAreaPerMeter) {
                                  return `${Number(material.surfaceAreaPerMeter).toFixed(3)} m²/m`;
                                } else {
                                  return 'Not calculated';
                                }
                              })()}
                            </p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-3 h-3 text-muted-foreground hover:text-blue-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p className="font-medium">Surface area per linear meter for coating calculations (m²/m)</p>
                                    <p className="text-xs text-muted-foreground">Includes configurable face selections:</p>
                                    <ul className="text-xs space-y-1 ml-2">
                                      <li>• External faces (top, bottom, sides)</li>
                                      <li>• Internal faces (where applicable)</li>
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm">{material.grade || 'Standard'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {material.pricePerMeter 
                              ? `$${material.pricePerMeter}/m`
                              : material.pricePerKg
                              ? `$${material.pricePerKg}/kg`
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSurfaceAreaMaterial(material)}
                        title="Calculate Surface Area"
                      >
                        <Calculator className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingMaterial(material)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${material.name}?`)) {
                            deleteSelectedMutation.mutate([material.id]);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {selectedCategory === "all" && !searchQuery.trim() ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-2">Select a Material Category</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a category above or use the search bar to browse your steel catalogue
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>💡 <strong>Tip:</strong> Click on category buttons like "Merchant Bar" or "SHS/RHS" to start browsing</p>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-2">No materials found</h3>
                <p className="text-muted-foreground mb-4">
                  No materials match your current filters
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedSubcategory("all");
                }}>
                  Clear Filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedMaterials.size > 0 && (
        <Card className={`${deleteSelectedMutation.isPending ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {deleteSelectedMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                    <span className="font-medium text-red-800">
                      Deleting {selectedMaterials.size} materials...
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {selectedMaterials.size} materials selected
                    </span>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedMaterials(new Set());
                    setSelectAll(false);
                  }}
                  disabled={deleteSelectedMutation.isPending}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteSelectedMutation.isPending}
                >
                  {deleteSelectedMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Progress indicator during bulk operations */}
            {deleteSelectedMutation.isPending && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <div className="flex items-center space-x-2 text-sm text-red-700">
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <span className="whitespace-nowrap">Processing...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay for Bulk Operations */}
      {deleteSelectedMutation.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Card className="p-6 min-w-[300px]">
            <CardContent className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Processing Request</h3>
                <p className="text-sm text-gray-600">
                  Deleting {selectedMaterials.size} materials from your catalogue...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Professional Edit Material Modal */}
      {editingMaterial && (
        <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Material Details
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Update material specifications and pricing for your steel catalogue
              </p>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Material Name</Label>
                    <Input
                      id="edit-name"
                      value={editingMaterial.name}
                      onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                      placeholder="Enter material name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Material Code</Label>
                    <Input
                      id="edit-code"
                      value={editingMaterial.code}
                      onChange={(e) => setEditingMaterial({...editingMaterial, code: e.target.value})}
                      placeholder="Enter material code"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Dimensions</h3>
                {/* Show different fields based on material type */}
                {(editingMaterial.category?.toLowerCase().includes('round') || 
                  editingMaterial.category?.toLowerCase().includes('pipe') || 
                  editingMaterial.category?.toLowerCase().includes('chs') ||
                  editingMaterial.category?.toLowerCase().includes('reinforc')) ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-diameter">Diameter (mm)</Label>
                      <Input
                        id="edit-diameter"
                        type="number"
                        value={editingMaterial.diameter?.toString() || ""}
                        onChange={(e) => setEditingMaterial({...editingMaterial, diameter: e.target.value ? parseFloat(e.target.value) : undefined})}
                        placeholder="Diameter"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-thickness">
                        {editingMaterial.category?.toLowerCase().includes('pipe') ? 'Wall Thickness (mm)' : 'Thickness (mm)'}
                      </Label>
                      <Input
                        id="edit-thickness"
                        type="number"
                        value={editingMaterial.thickness?.toString() || ""}
                        onChange={(e) => setEditingMaterial({...editingMaterial, thickness: e.target.value ? parseFloat(e.target.value) : undefined})}
                        placeholder={editingMaterial.category?.toLowerCase().includes('pipe') ? 'Wall Thickness' : 'Thickness'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-length">Length (mm)</Label>
                      <Input
                        id="edit-length"
                        type="number"
                        value={editingMaterial.length?.toString() || ""}
                        onChange={(e) => setEditingMaterial({...editingMaterial, length: parseFloat(e.target.value) || undefined})}
                        placeholder="Length"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show different layouts for structural sections vs other materials */}
                    {(editingMaterial.category?.toLowerCase().includes('channel') || 
                      editingMaterial.category?.toLowerCase().includes('structural channels') ||
                      editingMaterial.category?.toLowerCase().includes('cold formed channel') ||
                      editingMaterial.category?.toLowerCase().includes('mild steel channel') ||
                      editingMaterial.category?.toLowerCase().includes('pfc') ||
                      editingMaterial.category?.toLowerCase().includes('universal beam') ||
                      editingMaterial.category?.toLowerCase().includes('universal column')) ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-width">Width (mm)</Label>
                          <Input
                            id="edit-width"
                            type="number"
                            value={editingMaterial.width?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, width: parseFloat(e.target.value) || undefined})}
                            placeholder="Width"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-depth">Depth (mm)</Label>
                          <Input
                            id="edit-depth"
                            type="number"
                            value={editingMaterial.depth?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, depth: parseFloat(e.target.value) || undefined})}
                            placeholder="Depth"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-web-thickness">Web Thickness (mm)</Label>
                          <Input
                            id="edit-web-thickness"
                            type="number"
                            value={editingMaterial.webTw?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, webTw: parseFloat(e.target.value) || undefined})}
                            placeholder="Web Thickness"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-flange-thickness">Flange Thickness (mm)</Label>
                          <Input
                            id="edit-flange-thickness"
                            type="number"
                            value={editingMaterial.flangeTf?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, flangeTf: parseFloat(e.target.value) || undefined})}
                            placeholder="Flange Thickness"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-width">Width (mm)</Label>
                          <Input
                            id="edit-width"
                            type="number"
                            value={editingMaterial.width?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, width: parseFloat(e.target.value) || undefined})}
                            placeholder="Width"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-thickness">Thickness (mm)</Label>
                          <Input
                            id="edit-thickness"
                            type="number"
                            value={editingMaterial.thickness?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, thickness: parseFloat(e.target.value) || undefined})}
                            placeholder="Thickness"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-length">Length (mm)</Label>
                          <Input
                            id="edit-length"
                            type="number"
                            value={editingMaterial.length?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, length: parseFloat(e.target.value) || undefined})}
                            placeholder="Length"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-grade">Steel Grade</Label>
                    <Input
                      id="edit-grade"
                      value={editingMaterial.grade || ""}
                      onChange={(e) => setEditingMaterial({...editingMaterial, grade: e.target.value})}
                      placeholder="e.g., 300, 350, 450"
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
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price-meter">Price per Meter (NZD)</Label>
                    <Input
                      id="edit-price-meter"
                      type="number"
                      step="0.01"
                      value={editingMaterial.pricePerMeter || ""}
                      onChange={(e) => setEditingMaterial({...editingMaterial, pricePerMeter: parseFloat(e.target.value) || undefined})}
                      placeholder="Price per meter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-price-kg">Price per Kg (NZD)</Label>
                    <Input
                      id="edit-price-kg"
                      type="number"
                      step="0.01"
                      value={editingMaterial.pricePerKg || ""}
                      onChange={(e) => setEditingMaterial({...editingMaterial, pricePerKg: parseFloat(e.target.value) || undefined})}
                      placeholder="Price per kg"
                    />
                  </div>
                </div>
              </div>

              {/* Surface Area Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Surface Area for Coating</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-surface-area" className="flex items-center gap-2">
                      Surface Area per Meter (m²/m)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground hover:text-blue-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">Surface area per linear meter for coating calculations</p>
                              <p className="text-xs text-muted-foreground">Edit to override calculated value</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="edit-surface-area"
                      type="number"
                      step="0.0001"
                      value={(() => {
                        // Display calculated value if dimensions are available, otherwise stored value
                        if (editingMaterial.width && editingMaterial.depth && editingMaterial.category) {
                          const dimensions = {
                            width: parseFloat(editingMaterial.width),
                            depth: parseFloat(editingMaterial.depth),
                            webThickness: editingMaterial.webTw ? parseFloat(editingMaterial.webTw.toString()) : 0,
                            flangeThickness: editingMaterial.flangeTf ? parseFloat(editingMaterial.flangeTf.toString()) : 0
                          };
                          
                          const result = calculateUnifiedSurfaceArea(
                            editingMaterial.category,
                            dimensions,
                            editingMaterial.coatingConfig?.type as 'external-only' | 'internal-only' | 'external-internal' || 'external-internal'
                          );
                          
                          return result.total.toFixed(3);
                        }
                        return editingMaterial.surfaceAreaPerMeter || "";
                      })()}
                      onChange={(e) => setEditingMaterial({...editingMaterial, surfaceAreaPerMeter: e.target.value})}
                      placeholder="0.0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-coating-config">Coating Configuration</Label>
                    <Select 
                      value={editingMaterial.coatingConfig?.type || "external-internal"}
                      onValueChange={(value) => {
                        // Calculate surface area based on configuration type using unified system
                        let calculatedSurfaceArea = editingMaterial.surfaceAreaPerMeter;
                        
                        if (value !== 'custom' && editingMaterial.width && editingMaterial.depth && editingMaterial.category) {
                          const width = parseFloat(editingMaterial.width);
                          const depth = parseFloat(editingMaterial.depth);
                          const webTw = editingMaterial.webTw ? parseFloat(editingMaterial.webTw.toString()) : 0;
                          const flangeTf = editingMaterial.flangeTf ? parseFloat(editingMaterial.flangeTf.toString()) : 0;
                          
                          const dimensions = {
                            width,
                            depth,
                            webThickness: webTw,
                            flangeThickness: flangeTf
                          };
                          
                          const result = calculateUnifiedSurfaceArea(
                            editingMaterial.category,
                            dimensions,
                            value as 'external-only' | 'internal-only' | 'external-internal'
                          );
                          
                          calculatedSurfaceArea = result.total.toFixed(3);
                        }
                        
                        setEditingMaterial({
                          ...editingMaterial, 
                          coatingConfig: { type: value, faces: [] },
                          surfaceAreaPerMeter: value !== 'custom' ? calculatedSurfaceArea : editingMaterial.surfaceAreaPerMeter
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coating type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external-only">External Only</SelectItem>
                        <SelectItem value="internal-only">Internal Only</SelectItem>
                        <SelectItem value="external-internal">External + Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Available Lengths */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Available Lengths</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-lengths">Length Options (semicolon separated)</Label>
                  <Input
                    id="edit-lengths"
                    value={editingMaterial.lengthOptions || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, lengthOptions: e.target.value})}
                    placeholder="e.g., 6.0;9.0;12.0 or 3.0x1.5;6.0x2.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    For linear materials use "6.0;9.0;12.0", for sheets use "3.0x1.5;6.0x2.0"
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingMaterial(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  editMaterialMutation.mutate({
                    id: editingMaterial.id,
                    material: {
                      name: editingMaterial.name,
                      code: editingMaterial.code,
                      width: editingMaterial.width !== undefined && editingMaterial.width !== null && editingMaterial.width !== '' ? String(editingMaterial.width) : null,
                      thickness: editingMaterial.thickness !== undefined && editingMaterial.thickness !== null && editingMaterial.thickness !== '' ? String(editingMaterial.thickness) : null,
                      diameter: editingMaterial.diameter !== undefined && editingMaterial.diameter !== null && editingMaterial.diameter !== '' ? String(editingMaterial.diameter) : null,
                      length: editingMaterial.length !== undefined && editingMaterial.length !== null && editingMaterial.length !== '' ? String(editingMaterial.length) : null,
                      grade: editingMaterial.grade && editingMaterial.grade !== '' ? editingMaterial.grade : null,
                      standard: editingMaterial.standard && editingMaterial.standard !== '' ? editingMaterial.standard : null,
                      weightPerMeter: editingMaterial.weightPerMeter !== undefined && editingMaterial.weightPerMeter !== null && editingMaterial.weightPerMeter !== '' ? String(editingMaterial.weightPerMeter) : null,
                      pricePerMeter: editingMaterial.pricePerMeter !== undefined && editingMaterial.pricePerMeter !== null && editingMaterial.pricePerMeter !== '' ? String(editingMaterial.pricePerMeter) : null,
                      pricePerKg: editingMaterial.pricePerKg !== undefined && editingMaterial.pricePerKg !== null && editingMaterial.pricePerKg !== '' ? String(editingMaterial.pricePerKg) : null,
                      lengthOptions: editingMaterial.lengthOptions,
                      webTw: editingMaterial.webTw !== undefined && editingMaterial.webTw !== null && editingMaterial.webTw !== '' ? String(editingMaterial.webTw) : null,
                      flangeTf: editingMaterial.flangeTf !== undefined && editingMaterial.flangeTf !== null && editingMaterial.flangeTf !== '' ? String(editingMaterial.flangeTf) : null,
                      surfaceAreaPerMeter: editingMaterial.surfaceAreaPerMeter,
                      coatingConfig: editingMaterial.coatingConfig
                    }
                  });
                }}
                disabled={editMaterialMutation.isPending}
              >
                {editMaterialMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
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
    </div>
  );
}