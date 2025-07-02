import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Material } from "@shared/schema";
import { EnhancedSteelCatalogueTable } from "./enhanced-steel-catalogue-table";
import MaterialEditModal from "./material-edit-modal";

export function SteelCatalogueOnly() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [displayedMaterials, setDisplayedMaterials] = useState(15);
  const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load materials
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Filter materials for Steel Catalogue only (exclude consumables)
  const filteredMaterials = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    
    return materials.filter((material: Material) => {
      // Only show steel materials, exclude consumables and coating systems
      const category = material.category?.toLowerCase() || '';
      const isSteel = !category.includes('consumable') && 
                     !category.includes('bolt') && 
                     !category.includes('cutting') && 
                     !category.includes('grinding') && 
                     !category.includes('fastener') &&
                     !category.includes('galvanizing') &&
                     !category.includes('hot dip') &&
                     !category.includes('alkyd') &&
                     !category.includes('epoxy') &&
                     !category.includes('polyurethane') &&
                     !category.includes('zinc') &&
                     !category.includes('coating') &&
                     !category.includes('system') &&
                     !category.includes('intumescent') &&
                     !category.includes('primer');
      
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
    { id: "Universal Beams", name: "UB", count: 0 },
    { id: "Universal Columns", name: "UC", count: 0 },
    { id: "Channels", name: "Channels", count: 0 },
    { id: "Sheet", name: "Sheet", count: 0 },
    { id: "Plate", name: "Plate", count: 0 },
    { id: "Pipe", name: "Pipe", count: 0 },
    { id: "Squares", name: "Square Bar", count: 0 }
  ];

  // Reset displayedMaterials when category changes
  useEffect(() => {
    setDisplayedMaterials(15);
  }, [selectedCategory]);

  // Apply 15-item limit for "all" categories with View More functionality
  const materialsToDisplay = selectedCategory === "all" 
    ? filteredMaterials.slice(0, displayedMaterials) 
    : filteredMaterials;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            {selectedCategory === "all" 
              ? `${materialsToDisplay.length} of ${filteredMaterials.length} materials shown` 
              : `${filteredMaterials.length} materials found`
            }
          </div>

          {/* Search and Action Buttons */}
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
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setAddMaterialModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
              <Button 
                onClick={() => toast({ title: "Export Started", description: "Steel catalogue data is being exported..." })} 
                variant="outline" 
                size="sm"
              >
                <Package className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

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
            <>
              <EnhancedSteelCatalogueTable 
                materials={materialsToDisplay}
              />
              {/* View More Button */}
              {selectedCategory === "all" && filteredMaterials.length > displayedMaterials && (
                <div className="flex justify-center mt-6">
                  <Button 
                    onClick={() => setDisplayedMaterials(prev => prev + 15)}
                    variant="outline" 
                    size="sm"
                  >
                    View More ({filteredMaterials.length - displayedMaterials} remaining)
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!isLoading && materialsToDisplay.length === 0 && (
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