import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { 
  Search, Package, Grid3X3, List, Filter, 
  Wrench, Zap, Settings, Shield, Fuel,
  Clock, Truck, AlertCircle, TrendingUp,
  Plus, ShoppingCart, Eye, Package2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Material, Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/price-calculator";

interface EnhancedConsumablesTabProps {
  materials: Material[];
  suppliers: Supplier[];
  onAddToJob?: (material: Material, quantity: number) => void;
}

type ViewMode = "grid" | "table";
type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type ConsumableCategory = "all" | "welding" | "cutting" | "fasteners" | "gas" | "safety";

// Consumable category configuration with colors and icons
const CONSUMABLE_CATEGORIES = {
  all: { label: "All Consumables", icon: Package, color: "bg-blue-500" },
  welding: { label: "Welding", icon: Zap, color: "bg-yellow-500" },
  cutting: { label: "Cutting", icon: Settings, color: "bg-red-500" },
  fasteners: { label: "Fasteners", icon: Wrench, color: "bg-blue-600" },
  gas: { label: "Gas", icon: Fuel, color: "bg-green-500" },
  safety: { label: "Safety", icon: Shield, color: "bg-purple-500" }
};

// Quick filter suggestions
const QUICK_FILTERS = [
  { label: "M12 Bolts", filter: "m12" },
  { label: "3.2mm Electrodes", filter: "3.2mm" },
  { label: "125mm Discs", filter: "125mm" },
  { label: "Grade 8.8", filter: "grade 8.8" },
  { label: "Galvanized", filter: "galvanized" },
  { label: "Stainless", filter: "stainless" }
];

export function EnhancedConsumablesTab({ materials, suppliers, onAddToJob }: EnhancedConsumablesTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ConsumableCategory>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [visibleItems, setVisibleItems] = useState(20);
  const { toast } = useToast();
  
  // Fetch real inventory data
  const { data: inventoryData } = useQuery({
    queryKey: ['/api/inventory/stock-levels'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Categorize consumable materials
  const categorizeConsumable = (material: Material): ConsumableCategory[] => {
    const name = material.name.toLowerCase();
    const category = material.category?.toLowerCase() || '';
    const categories: ConsumableCategory[] = [];

    if (name.includes('welding') || name.includes('electrode') || category.includes('welding')) {
      categories.push('welding');
    }
    if (name.includes('cutting') || name.includes('disc') || name.includes('grind') || category.includes('cutting')) {
      categories.push('cutting');
    }
    if (name.includes('bolt') || name.includes('nut') || name.includes('screw') || 
        category.includes('fastener') || category === 'fasteners') {
      categories.push('fasteners');
    }
    if (name.includes('gas') || name.includes('oxygen') || name.includes('acetylene') || 
        name.includes('argon') || category.includes('gas')) {
      categories.push('gas');
    }
    if (name.includes('safety') || name.includes('ppe') || name.includes('protective') || 
        category.includes('safety')) {
      categories.push('safety');
    }

    return categories.length > 0 ? categories : ['all'];
  };

  // Filter consumables
  const filteredConsumables = useMemo(() => {
    return materials.filter((material: Material) => {
      const materialCategories = categorizeConsumable(material);
      
      // Only show consumables
      const isConsumable = materialCategories.some(cat => 
        ['welding', 'cutting', 'fasteners', 'gas', 'safety'].includes(cat)
      );
      if (!isConsumable) return false;

      // Category filter
      if (selectedCategory !== "all" && !materialCategories.includes(selectedCategory)) {
        return false;
      }

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        material.name.toLowerCase().includes(searchLower) ||
        material.code.toLowerCase().includes(searchLower) ||
        (material.grade && material.grade.toLowerCase().includes(searchLower)) ||
        (material.category && material.category.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Quick filters
      if (quickFilters.length > 0) {
        const materialText = `${material.name} ${material.code} ${material.grade || ''}`.toLowerCase();
        const hasQuickFilter = quickFilters.some(filter => 
          materialText.includes(filter.toLowerCase())
        );
        if (!hasQuickFilter) return false;
      }

      // Stock filter using real inventory data
      const stockLevel = inventoryData?.stockLevels?.[material.id] || 0;
      if (stockFilter === "in-stock" && stockLevel <= 0) return false;
      if (stockFilter === "low-stock" && (stockLevel <= 0 || stockLevel > 10)) return false;
      if (stockFilter === "out-of-stock" && stockLevel > 0) return false;

      // Price filter
      const price = parseFloat(material.pricePerKg?.toString() || "0");
      if (price < priceRange[0] || price > priceRange[1]) return false;

      return true;
    });
  }, [materials, selectedCategory, searchQuery, quickFilters, stockFilter, priceRange]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ConsumableCategory, number> = {
      all: 0, welding: 0, cutting: 0, fasteners: 0, gas: 0, safety: 0
    };

    materials.forEach(material => {
      const categories = categorizeConsumable(material);
      const isConsumable = categories.some(cat => 
        ['welding', 'cutting', 'fasteners', 'gas', 'safety'].includes(cat)
      );
      
      if (isConsumable) {
        counts.all++;
        categories.forEach(cat => {
          if (cat in counts) counts[cat]++;
        });
      }
    });

    return counts;
  }, [materials]);

  // Get real stock status from inventory data
  const getStockStatus = (material: Material) => {
    const stock = inventoryData?.stockLevels?.[material.id] || 0;
    if (stock === 0) return { status: "out-of-stock", color: "bg-red-500", text: "Out of Stock" };
    if (stock < 10) return { status: "low-stock", color: "bg-yellow-500", text: "Low Stock" };
    return { status: "in-stock", color: "bg-green-500", text: "In Stock" };
  };

  // Get consumption data from inventory movements
  const getConsumptionData = (material: Material) => {
    const movements = inventoryData?.movements?.[material.id] || {};
    return {
      thisMonth: movements.thisMonth || 0,
      thisYear: movements.thisYear || 0,
      trend: movements.trend || "stable"
    };
  };

  // Handle quick filter toggle
  const toggleQuickFilter = (filter: string) => {
    setQuickFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Load more items
  const loadMore = () => {
    setVisibleItems(prev => prev + 20);
  };

  // Get supplier name
  const getSupplierName = (material: Material): string => {
    // Use the supplier field from material (which contains supplier name)
    return material.supplier || "No Supplier";
  };

  // Get category icon and color
  const getCategoryInfo = (material: Material) => {
    const categories = categorizeConsumable(material);
    const primaryCategory = categories[0] || 'all';
    const categoryInfo = CONSUMABLE_CATEGORIES[primaryCategory];
    return {
      icon: categoryInfo.icon,
      color: categoryInfo.color,
      label: categoryInfo.label
    };
  };

  const visibleConsumables = filteredConsumables.slice(0, visibleItems);

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search consumables like Google..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(({ label, filter }) => (
            <Button
              key={filter}
              variant={quickFilters.includes(filter) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleQuickFilter(filter)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Stock Status</label>
                  <Select value={stockFilter} onValueChange={(value: StockFilter) => setStockFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Levels</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ConsumableCategory)}>
        <TabsList className="grid w-full grid-cols-6">
          {Object.entries(CONSUMABLE_CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-2 text-xs">
              <Icon className="h-3 w-3" />
              {label} ({categoryCounts[key as ConsumableCategory]})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleConsumables.map((material) => {
                const categoryInfo = getCategoryInfo(material);
                const stockInfo = getStockStatus(material);
                const consumption = getConsumptionData(material);
                const supplier = getSupplierName(material);

                return (
                  <Card key={material.id} className="relative hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${categoryInfo.color} text-white`}>
                            <categoryInfo.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium">{material.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{material.code}</p>
                          </div>
                        </div>
                        <Badge variant={stockInfo.status === "in-stock" ? "default" : 
                                      stockInfo.status === "low-stock" ? "secondary" : "destructive"}>
                          {stockInfo.text}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium">{formatCurrency(parseFloat(material.pricePerKg?.toString() || "0"))}/kg</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stock:</span>
                          <p className="font-medium">{inventoryData?.stockLevels?.[material.id] || 0} units</p>
                        </div>
                      </div>

                      <div className="text-xs">
                        <span className="text-muted-foreground">Supplier:</span>
                        <p className="font-medium">{supplier}</p>
                      </div>

                      <div className="text-xs">
                        <span className="text-muted-foreground">Lead Time:</span>
                        <p className="font-medium">5-7 working days</p>
                      </div>

                      <div className="text-xs">
                        <span className="text-muted-foreground">Min Order:</span>
                        <p className="font-medium">1 box</p>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground">Used this month:</span>
                          <p className="font-medium flex items-center gap-1">
                            {consumption.thisMonth}
                            <TrendingUp className={`h-3 w-3 ${consumption.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {onAddToJob && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" className="flex-1">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add to Job
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Quick Add to Current Job</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr className="text-xs">
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Price/kg</th>
                    <th className="text-left p-3 font-medium">Stock</th>
                    <th className="text-left p-3 font-medium">Supplier</th>
                    <th className="text-left p-3 font-medium">Used/Month</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleConsumables.map((material) => {
                    const categoryInfo = getCategoryInfo(material);
                    const stockInfo = getStockStatus(material);
                    const consumption = getConsumptionData(material);
                    const supplier = getSupplierName(material);

                    return (
                      <tr key={material.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${categoryInfo.color} text-white`}>
                              <categoryInfo.icon className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{material.name}</p>
                              <p className="text-xs text-muted-foreground">{material.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {categoryInfo.label}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">
                          {formatCurrency(parseFloat(material.pricePerKg?.toString() || "0"))}
                        </td>
                        <td className="p-3">
                          <Badge variant={stockInfo.status === "in-stock" ? "default" : 
                                        stockInfo.status === "low-stock" ? "secondary" : "destructive"}>
                            {inventoryData?.stockLevels?.[material.id] || 0}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{supplier}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{consumption.thisMonth}</span>
                            <TrendingUp className={`h-3 w-3 ${consumption.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {onAddToJob && (
                              <Button size="sm">
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More Button */}
          {visibleItems < filteredConsumables.length && (
            <div className="flex justify-center pt-6">
              <Button onClick={loadMore} variant="outline">
                Load More ({filteredConsumables.length - visibleItems} remaining)
              </Button>
            </div>
          )}

          {/* Empty State */}
          {filteredConsumables.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No consumables found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}