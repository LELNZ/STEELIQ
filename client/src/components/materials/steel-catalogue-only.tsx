import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Material } from "@shared/schema";
import { EnhancedSteelCatalogueTable } from "./enhanced-steel-catalogue-table";
import { MaterialEditModal } from "./material-edit-modal";

export function SteelCatalogueOnly() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [displayedMaterials, setDisplayedMaterials] = useState(50);
  const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Load materials
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Filter materials for Steel Catalogue only (exclude consumables)
  const filteredMaterials = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    
    return materials.filter((material: Material) => {
      // Only show steel materials, exclude consumables
      const category = material.category?.toLowerCase() || '';
      const isSteel = !category.includes('consumable') && 
                     !category.includes('bolt') && 
                     !category.includes('cutting') && 
                     !category.includes('grinding') && 
                     !category.includes('fastener') &&
                     !category.includes('galvanizing') &&
                     !category.includes('hot dip');
      
      const matchesSearch = !searchQuery.trim() || 
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (material.code && material.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (material.category && material.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || 
        (material.category && material.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      
      return isSteel && matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  const categories = [
    { id: "all", name: "All Materials", count: 0 },
    { id: "SHS", name: "SHS", count: 0 },
    { id: "RHS", name: "RHS", count: 0 },
    { id: "Flats", name: "Flats", count: 0 },
    { id: "Angles", name: "Angles", count: 0 },
    { id: "Rounds", name: "Rounds", count: 0 },
    { id: "UB", name: "UB", count: 0 },
    { id: "UC", name: "UC", count: 0 },
    { id: "Channels", name: "Channels", count: 0 },
    { id: "Sheet", name: "Sheet", count: 0 },
    { id: "Plate", name: "Plate", count: 0 },
    { id: "Pipe", name: "Pipe", count: 0 },
    { id: "Square Bar", name: "Square Bar", count: 0 }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredMaterials.length} materials found
            </div>
            <Button 
              onClick={() => setAddMaterialModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </div>

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
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className="h-8 px-4 text-sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Materials Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading materials...</div>
            </div>
          ) : (
            <EnhancedSteelCatalogueTable 
              materials={filteredMaterials}
            />
          )}

          {/* Empty State */}
          {!isLoading && filteredMaterials.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No materials found</h3>
                    <p className="text-sm">
                      {searchQuery.trim() 
                        ? `No materials found matching "${searchQuery}" in ${selectedCategory}`
                        : `No materials found in category: ${selectedCategory}`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Add Material Modal */}
      <MaterialEditModal
        material={null}
        isOpen={addMaterialModalOpen}
        onClose={() => setAddMaterialModalOpen(false)}
        mode="add"
      />
    </div>
  );
}