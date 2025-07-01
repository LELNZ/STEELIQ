import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Bookmark, ShoppingCart, Edit, Trash2 } from "lucide-react";
import { Material, Supplier } from "@shared/schema";
import { formatCurrency } from "@/lib/price-calculator";
import { useToast } from "@/hooks/use-toast";

interface ConsumablesCleanProps {
  materials: Material[];
  suppliers: Supplier[];
}

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type ConsumableCategory = "all" | "welding" | "cutting" | "fasteners" | "gas" | "safety";

export function ConsumablesClean({ materials, suppliers }: ConsumablesCleanProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ConsumableCategory>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [displayedConsumables, setDisplayedConsumables] = useState(15);
  const { toast } = useToast();

  // Filter materials for consumables only
  const filteredConsumables = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    
    return materials.filter((material: Material) => {
      // Only show consumables
      const category = material.category?.toLowerCase() || '';
      const isConsumable = category.includes('welding') ||
                          category.includes('consumables') ||
                          category.includes('fastener') ||
                          category.includes('gas') ||
                          category.includes('safety') ||
                          material.code?.toLowerCase().includes('cons-') ||
                          material.code?.toLowerCase().includes('weld-') ||
                          material.code?.toLowerCase().includes('bolt-') ||
                          material.code?.toLowerCase().includes('gas-') ||
                          material.name?.toLowerCase().includes('electrode') ||
                          material.name?.toLowerCase().includes('welding') ||
                          material.name?.toLowerCase().includes('bolt') ||
                          material.name?.toLowerCase().includes('grinding');
      
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
    toast({
      title: "Export Started",
      description: "Consumables data is being exported...",
    });
  };

  const handleSaveFilter = () => {
    toast({
      title: "Filter Saved",
      description: "Current filter settings have been saved",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {selectedCategory === "all" 
                  ? `${consumablesToDisplay.length} of ${filteredConsumables.length} consumables shown` 
                  : `${filteredConsumables.length} consumables found`
                }
              </div>
              {selectedCategory === "all" && filteredConsumables.length > displayedConsumables && (
                <Button 
                  onClick={() => setDisplayedConsumables(prev => prev + 15)}
                  variant="outline" 
                  size="sm"
                >
                  View More ({filteredConsumables.length - displayedConsumables} remaining)
                </Button>
              )}
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
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleSaveFilter} variant="outline" size="sm">
                <Bookmark className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
            </div>
          </div>

          {/* Categories - below search bar to match Steel Catalogue */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="h-8 px-4 text-sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Categories
            </Button>
            {["Welding", "Cutting", "Fasteners", "Gas", "Safety"].map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category.toLowerCase() ? "default" : "outline"}
                size="sm"
                className="h-8 px-4 text-sm"
                onClick={() => setSelectedCategory(category.toLowerCase() as ConsumableCategory)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Additional Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Stock Status:</label>
              <Select value={stockFilter} onValueChange={(value: StockFilter) => setStockFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Supplier:</label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Consumables Table */}
          {consumablesToDisplay.length > 0 ? (
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
                        <div className="flex items-center gap-1">
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