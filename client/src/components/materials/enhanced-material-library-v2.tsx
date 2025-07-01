import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Package } from "lucide-react";
import { SteelCatalogueTable } from "./steel-catalogue-table";
import { EnhancedConsumablesV2 } from "./enhanced-consumables-v2";
import { EnhancedCoatingSystems } from "./enhanced-coating-systems";
import { Material } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface MaterialLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedMaterials: Set<number>;
  onMaterialSelect: (id: number) => void;
  onMaterialEdit: (material: Material) => void;
  onMaterialDelete: (id: number) => void;
}

export function EnhancedMaterialLibrary({
  searchQuery,
  setSearchQuery,
  selectedMaterials,
  onMaterialSelect,
  onMaterialEdit,
  onMaterialDelete
}: MaterialLibraryProps) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [displayedMaterials, setDisplayedMaterials] = useState(15);

  // Query for materials data
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/materials"],
    retry: false,
  });

  // Delete mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/materials/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    },
  });

  // Material categories for filtering
  const materialCategories = [
    { id: "all", name: "All Materials", count: 0 },
    { id: "SHS", name: "SHS", count: 0 },
    { id: "RHS", name: "RHS", count: 0 },
    { id: "Flats", name: "Flats", count: 0 },
    { id: "Angles", name: "Angles", count: 0 },
    { id: "Rounds", name: "Rounds", count: 0 },
    { id: "Universal Beam", name: "UB", count: 0 },
    { id: "Universal Column", name: "UC", count: 0 },
    { id: "Structural Channels", name: "Channels", count: 0 },
    { id: "Sheet", name: "Sheet", count: 0 },
    { id: "Plate", name: "Plate", count: 0 },
    { id: "Pipe", name: "Pipe", count: 0 },
    { id: "Square Bar", name: "Square Bar", count: 0 }
  ];

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    
    return materials.filter((material: Material) => {
      const matchesSearch = !searchQuery.trim() || 
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (material.code && material.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (material.category && material.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || 
        (material.category && material.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  // Get displayed materials with pagination
  const displayedMaterialsList = filteredMaterials.slice(0, displayedMaterials);
  const hasMoreToLoad = filteredMaterials.length > displayedMaterials;

  const handleLoadMore = () => {
    setDisplayedMaterials(prev => Math.min(prev + 15, filteredMaterials.length));
  };

  const handleDeleteMaterial = (id: number) => {
    deleteMaterialMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steel-catalogue" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="steel-catalogue">Steel Catalogue</TabsTrigger>
              <TabsTrigger value="consumables">Consumables</TabsTrigger>
              <TabsTrigger value="coating-systems">Coating Systems</TabsTrigger>
            </TabsList>

            <TabsContent value="steel-catalogue" className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search materials by name, code, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Material
                </Button>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {materialCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedSubcategory("all");
                      setDisplayedMaterials(15);
                    }}
                    className="text-xs"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* Materials Display */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Loading materials...</span>
                  </div>
                </div>
              ) : filteredMaterials.length > 0 ? (
                <>
                  <SteelCatalogueTable
                    materials={displayedMaterialsList}
                    selectedMaterials={selectedMaterials}
                    onMaterialSelect={onMaterialSelect}
                    onEditMaterial={onMaterialEdit}
                    onDeleteMaterial={handleDeleteMaterial}
                  />
                  
                  {/* Load More Button */}
                  {hasMoreToLoad && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Load More ({filteredMaterials.length - displayedMaterials} remaining)
                      </Button>
                    </div>
                  )}
                </>
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
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("SHS");
                            setSelectedSubcategory("all");
                          }}
                        >
                          Browse SHS Materials
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Materials Found</h3>
                        <p className="text-muted-foreground">
                          {searchQuery.trim() 
                            ? `No materials found matching "${searchQuery}" in ${selectedCategory}`
                            : `No materials found in category: ${selectedCategory}`
                          }
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="consumables">
              <EnhancedConsumablesV2 />
            </TabsContent>

            <TabsContent value="coating-systems">
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Coating Systems</h3>
                  <p className="text-muted-foreground">Coming soon - coating system management</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}