import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Trash2, Package, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Material, Supplier } from "@shared/schema";
import MaterialEditModal from "@/components/materials/material-edit-modal";

interface CoatingSystemsProps {
  materials: Material[];
  suppliers: Supplier[];
}

type CoatingCategory = "all" | "galvanizing" | "painting" | "powder-coating" | "anodizing" | "plating";

export function CoatingSystems({ materials, suppliers }: CoatingSystemsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CoatingCategory>("all");
  const [displayedCoatings, setDisplayedCoatings] = useState(15);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  // Filter materials for coating systems only
  const filteredCoatings = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    
    return materials.filter((material: Material) => {
      // Only show coating materials
      const category = material.category?.toLowerCase() || '';
      const name = material.name?.toLowerCase() || '';
      
      const isCoating = category.includes('galvanizing') || 
                       category.includes('galvanising') ||
                       category.includes('hot dip') ||
                       category.includes('painting') ||
                       category.includes('coating') ||
                       category.includes('powder') ||
                       category.includes('anodizing') ||
                       category.includes('plating') ||
                       name.includes('galvaniz') ||
                       name.includes('paint') ||
                       name.includes('coating') ||
                       name.includes('powder') ||
                       name.includes('anodiz') ||
                       name.includes('plat');
      
      if (!isCoating) return false;
      
      const matchesSearch = !searchQuery.trim() || 
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (material.code && material.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (material.category && material.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || 
        (material.category && material.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (material.name && material.name.toLowerCase().includes(selectedCategory.toLowerCase()));
      
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  // Reset displayedCoatings when category changes
  useEffect(() => {
    setDisplayedCoatings(15);
  }, [selectedCategory]);

  // Apply 15-item limit for "all" categories with View More functionality
  const coatingsToDisplay = selectedCategory === "all" 
    ? filteredCoatings.slice(0, displayedCoatings) 
    : filteredCoatings;

  const handleExportCSV = () => {
    toast({ title: "Export Started", description: "Coating systems data is being exported..." });
  };

  const categories = [
    { id: "all", name: "All Coatings" },
    { id: "galvanizing", name: "Galvanizing" },
    { id: "painting", name: "Painting" },
    { id: "powder-coating", name: "Powder Coating" },
    { id: "anodizing", name: "Anodizing" },
    { id: "plating", name: "Plating" }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedCategory === "all" 
                ? `${coatingsToDisplay.length} of ${filteredCoatings.length} coating systems shown` 
                : `${filteredCoatings.length} coating systems found`
              }
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search coating systems by name, code, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowAddModal(true)}
                variant="default" 
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Coating
              </Button>
              <Button 
                onClick={handleExportCSV}
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
                onClick={() => setSelectedCategory(category.id as CoatingCategory)}
                className="text-sm"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Coating Systems Table */}
          {coatingsToDisplay.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coatingsToDisplay.map((coating) => (
                      <TableRow key={coating.id}>
                        <TableCell className="font-medium">{coating.name}</TableCell>
                        <TableCell>{coating.code || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {coating.category || "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            try {
                              if (!coating.pricePerKg) return "N/A";
                              const price = typeof coating.pricePerKg === 'number' 
                                ? coating.pricePerKg 
                                : parseFloat(String(coating.pricePerKg));
                              return isNaN(price) ? "N/A" : `$${price.toFixed(2)}/m²`;
                            } catch {
                              return "N/A";
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {coating.surfaceAreaPerMeter ? `${coating.surfaceAreaPerMeter} m²/m` : "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{coating.supplier || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingMaterial(coating)}
                              title="Edit coating system"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                toast({
                                  title: "Delete Coating",
                                  description: "Delete functionality will be implemented in the next update.",
                                  variant: "destructive"
                                });
                              }}
                              title="Delete coating system"
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
              
              {/* View More Button */}
              {selectedCategory === "all" && filteredCoatings.length > displayedCoatings && (
                <div className="flex justify-center mt-6">
                  <Button 
                    onClick={() => setDisplayedCoatings(prev => prev + 15)}
                    variant="outline" 
                    size="sm"
                  >
                    View More ({filteredCoatings.length - displayedCoatings} remaining)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No coating systems found</h3>
                    <p className="text-sm">
                      {searchQuery.trim() 
                        ? `No coating systems found matching "${searchQuery}"`
                        : `No coating systems found in category: ${selectedCategory}`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingMaterial && (
        <MaterialEditModal
          material={editingMaterial}
          isOpen={!!editingMaterial}
          onClose={() => setEditingMaterial(null)}
          mode="edit"
        />
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <MaterialEditModal
          material={null}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          mode="add"
        />
      )}
    </div>
  );
}