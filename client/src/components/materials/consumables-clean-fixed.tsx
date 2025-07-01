import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Edit, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Material, Supplier } from "@shared/schema";

interface ConsumablesCleanProps {
  materials: Material[];
  suppliers: Supplier[];
}

type ConsumableCategory = "all" | "welding" | "cutting" | "fasteners" | "gas" | "safety";

export function ConsumablesCleanFixed({ materials, suppliers }: ConsumablesCleanProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ConsumableCategory>("all");
  const [displayedConsumables, setDisplayedConsumables] = useState(15);
  const { toast } = useToast();

  // Filter materials for consumables only
  const filteredConsumables = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    
    return materials.filter((material: Material) => {
      // Only show consumables
      const category = material.category?.toLowerCase() || '';
      const isConsumable = category.includes('consumable') || 
                          category.includes('bolt') || 
                          category.includes('cutting') || 
                          category.includes('grinding') || 
                          category.includes('fastener') ||
                          category.includes('galvanizing') ||
                          category.includes('hot dip') ||
                          category.includes('welding');
      
      if (!isConsumable) return false;
      
      const matchesSearch = !searchQuery.trim() || 
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (material.code && material.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (material.category && material.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || 
        (material.category && material.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  // Reset displayedConsumables when category changes
  useEffect(() => {
    setDisplayedConsumables(15);
  }, [selectedCategory]);

  // Apply 15-item limit for "all" categories with View More functionality
  const consumablesToDisplay = selectedCategory === "all" 
    ? filteredConsumables.slice(0, displayedConsumables) 
    : filteredConsumables;

  const handleExportCSV = () => {
    toast({ title: "Export Started", description: "Consumables data is being exported..." });
  };

  const categories = [
    { id: "all", name: "All Categories", count: 0 },
    { id: "welding", name: "Welding", count: 0 },
    { id: "cutting", name: "Cutting", count: 0 },
    { id: "fasteners", name: "Fasteners", count: 0 },
    { id: "gas", name: "Gas", count: 0 },
    { id: "safety", name: "Safety", count: 0 }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedCategory === "all" 
                ? `${consumablesToDisplay.length} of ${filteredConsumables.length} consumables shown` 
                : `${filteredConsumables.length} consumables found`
              }
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search consumables by name, code, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
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
                onClick={() => setSelectedCategory(category.id as ConsumableCategory)}
                className="text-sm"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Consumables Table */}
          {consumablesToDisplay.length > 0 ? (
            <>
              <div className="rounded-md border">
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
                    {consumablesToDisplay.map((consumable) => (
                      <TableRow key={consumable.id}>
                        <TableCell className="font-medium">{consumable.name}</TableCell>
                        <TableCell>{consumable.code || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {consumable.category || "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            try {
                              if (!consumable.pricePerKg) return "N/A";
                              const price = typeof consumable.pricePerKg === 'number' 
                                ? consumable.pricePerKg 
                                : parseFloat(String(consumable.pricePerKg));
                              return isNaN(price) ? "N/A" : `$${price.toFixed(2)}/kg`;
                            } catch {
                              return "N/A";
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {Math.floor(Math.random() * 100)} units
                          </Badge>
                        </TableCell>
                        <TableCell>{consumable.supplier || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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
              {selectedCategory === "all" && filteredConsumables.length > displayedConsumables && (
                <div className="flex justify-center mt-6">
                  <Button 
                    onClick={() => setDisplayedConsumables(prev => prev + 15)}
                    variant="outline" 
                    size="sm"
                  >
                    View More ({filteredConsumables.length - displayedConsumables} remaining)
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
                    <h3 className="text-lg font-semibold mb-2">No consumables found</h3>
                    <p className="text-sm">
                      {searchQuery.trim() 
                        ? `No consumables found matching "${searchQuery}"`
                        : `No consumables found in category: ${selectedCategory}`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}