import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Search, Package, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { Material } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnhancedMaterialLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

// Structured category system for Lateral Engineering
const CATEGORY_STRUCTURE = {
  "Merchant Bar": {
    subcategories: ["Flats", "Equal Angles", "Unequal Angles", "Rounds", "Squares"],
    description: "Standard merchant bar sections"
  },
  "Pregal Sections": {
    subcategories: ["Pregal Angles", "Pregal Flats", "Pregal Channels"],
    description: "Pre-galvanized steel sections"
  },
  "Reinforcing": {
    subcategories: ["Rebar", "Mesh", "Deformed Bar"],
    description: "Reinforcing steel products"
  },
  "Structural Sections": {
    subcategories: ["Mild Steel Channel", "Cold Formed Channel", "Universal Beam", "Universal Column"],
    description: "Structural steel sections"
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
  "SHS/RHS": {
    subcategories: ["SHS", "RHS", "Cattle Rail Hollow Section"],
    description: "Square and rectangular hollow sections"
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
  }
};

export default function EnhancedMaterialLibrary({ searchQuery, setSearchQuery }: EnhancedMaterialLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/materials"],
  });

  // Enhanced material categorization logic
  const categorizeeMaterial = (material: Material): string[] => {
    const name = material.name.toLowerCase();
    const code = material.code.toLowerCase();
    const categories: string[] = [];

    // Merchant Bar
    if (name.includes('flat') || code.includes('flat')) categories.push('Flats');
    if (name.includes('equal angle') || name.includes('ea ') || code.includes('ea')) categories.push('Equal Angles');
    if (name.includes('unequal angle') || name.includes('ua ') || code.includes('ua')) categories.push('Unequal Angles');
    if (name.includes('round') || name.includes('rod') || code.includes('rd')) categories.push('Rounds');
    if (name.includes('square bar') || name.includes('sq ') || code.includes('sq')) categories.push('Squares');

    // Pregal Sections
    if (name.includes('duragal') || name.includes('pregal') || code.includes('dga')) {
      if (name.includes('angle')) categories.push('Pregal Angles');
      if (name.includes('flat')) categories.push('Pregal Flats');
      if (name.includes('channel')) categories.push('Pregal Channels');
    }

    // Structural Sections
    if (name.includes('channel') && !name.includes('duragal')) {
      if (name.includes('cold formed') || name.includes('cf')) categories.push('Cold Formed Channel');
      else categories.push('Mild Steel Channel');
    }
    if (name.includes('universal beam') || name.includes('ub') || code.includes('ub')) categories.push('Universal Beam');
    if (name.includes('universal column') || name.includes('uc') || code.includes('uc')) categories.push('Universal Column');

    // Sheet Metal
    if (name.includes('plate')) {
      if (name.includes('chequer') || name.includes('checker')) categories.push('Mild Steel Chequer Plate');
      else if (name.includes('weather resistant')) categories.push('Weather Resistant Plate');
      else categories.push('Mild Steel Plate');
    }
    if (name.includes('sheet')) {
      if (name.includes('cold rolled')) categories.push('Cold Rolled');
      else if (name.includes('electrogalvanised') || name.includes('electro galvanised')) categories.push('Electrogalvanised Sheet');
      else if (name.includes('galvanised')) categories.push('Galvanised Sheet');
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
      else if (name.includes('galvanised')) categories.push('Galvanised Pipe');
    }

    // Reinforcing
    if (name.includes('rebar') || name.includes('reinforcing') || name.includes('deformed bar')) categories.push('Rebar');
    if (name.includes('mesh')) categories.push('Mesh');

    return categories;
  };

  // Filter materials based on category, subcategory, and search
  const filteredMaterials = (materials as Material[]).filter((material: Material) => {
    const matchesSearch = !searchQuery || 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (material.grade && material.grade.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedCategory === "all") return matchesSearch;

    const materialCategories = categorizeeMaterial(material);
    const categorySubcategories = CATEGORY_STRUCTURE[selectedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories || [];
    
    if (selectedSubcategory === "all") {
      return matchesSearch && materialCategories.some(cat => categorySubcategories.includes(cat));
    }

    return matchesSearch && materialCategories.includes(selectedSubcategory);
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

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials(new Set());
      setSelectAll(false);
    } else {
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
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedMaterials(new Set());
    setSelectAll(false);
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
          {/* All Categories Button */}
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
          </div>

          {/* Main Category Quick-Click Buttons - Horizontal Layout */}
          <div className="flex flex-wrap gap-2">
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

          {/* Category Description */}
          {selectedCategory !== "all" && (
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md mt-4">
              <strong>{selectedCategory}:</strong> {CATEGORY_STRUCTURE[selectedCategory as keyof typeof CATEGORY_STRUCTURE]?.description}
              {selectedSubcategory !== "all" && (
                <span className="block mt-1 text-blue-700 font-medium">
                  Filtered by: {selectedSubcategory}
                </span>
              )}
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

            {/* Selection Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
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
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedMaterials.size})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {isLoading ? (
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
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material: Material) => (
            <Card 
              key={material.id} 
              className={`hover:shadow-md transition-all ${
                selectedMaterials.has(material.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Checkbox
                      checked={selectedMaterials.has(material.id)}
                      onCheckedChange={() => handleMaterialSelect(material.id)}
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {material.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {material.code}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-sm text-muted-foreground">Width</p>
                    <p className="font-medium">{material.width || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thickness</p>
                    <p className="font-medium">{material.thickness || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="font-medium">{material.grade || 'Standard'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{material.weightPerMeter || 0} kg/m</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">
                      {material.pricePerMeter 
                        ? `$${material.pricePerMeter}/m`
                        : material.pricePerKg
                        ? `$${material.pricePerKg}/kg`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="text-xs font-medium">General</p>
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No materials found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all"
                ? "No materials match your current filters"
                : "Start by importing your steel catalogue"
              }
            </p>
            <Button variant="outline" onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedSubcategory("all");
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedMaterials.size > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {selectedMaterials.size} materials selected
                </span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedMaterials(new Set());
                    setSelectAll(false);
                  }}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteSelectedMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}