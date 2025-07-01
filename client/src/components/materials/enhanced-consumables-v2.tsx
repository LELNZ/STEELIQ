import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Package, 
  Grid3X3, 
  List, 
  Filter, 
  Plus, 
  Bookmark, 
  BookmarkCheck,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  ShoppingCart,
  Edit,
  Trash2,
  Save
} from "lucide-react";
import { Material, Supplier, SavedFilter } from "@shared/schema";
import { formatCurrency } from "@/lib/price-calculator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EnhancedConsumablesV2Props {
  materials: Material[];
  suppliers: Supplier[];
  onAddToJob?: (material: Material, quantity: number) => void;
}

type ViewMode = "grid" | "table";
type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type ConsumableCategory = "all" | "welding" | "cutting" | "fasteners" | "gas" | "safety";

interface FilterConfig {
  category: ConsumableCategory;
  stockStatus: StockFilter;
  supplier: string;
  priceRange: { min: number; max: number };
  searchQuery: string;
}

const CONSUMABLE_CATEGORY_STRUCTURE = {
  "Welding": {
    subcategories: ["Electrodes", "Wire", "Flux", "Gas", "Equipment"],
    description: "Welding consumables and equipment",
    color: "bg-red-100 text-red-800"
  },
  "Cutting": {
    subcategories: ["Plasma", "Oxy-Fuel", "Abrasive", "Blades", "Discs"],
    description: "Cutting tools and consumables", 
    color: "bg-blue-100 text-blue-800"
  },
  "Fasteners": {
    subcategories: ["Bolts", "Nuts", "Washers", "Screws", "Anchors"],
    description: "Fastening hardware and components",
    color: "bg-green-100 text-green-800"
  },
  "Gas": {
    subcategories: ["Welding Gas", "Cutting Gas", "Shielding Gas", "Cylinders"],
    description: "Industrial gases and cylinder equipment",
    color: "bg-yellow-100 text-yellow-800"
  },
  "Safety": {
    subcategories: ["PPE", "First Aid", "Signs", "Barriers", "Monitoring"],
    description: "Safety equipment and protective gear",
    color: "bg-purple-100 text-purple-800"
  }
};

export function EnhancedConsumablesV2({ materials, suppliers, onAddToJob }: EnhancedConsumablesV2Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedCategory, setSelectedCategory] = useState<ConsumableCategory>("all");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [displayLimit, setDisplayLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<number | null>(null);

  // Filter management state
  const [filterToSave, setFilterToSave] = useState({
    name: "",
    description: "",
    isGlobal: false
  });

  // Load saved filters
  const { data: savedFilters = [] } = useQuery<SavedFilter[]>({
    queryKey: ["/api/saved-filters", "consumables"],
  });

  // Save filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: async (filter: any) => {
      return apiRequest("/api/saved-filters", "POST", filter);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters"] });
      setShowSaveFilter(false);
      setFilterToSave({ name: "", description: "", isGlobal: false });
      toast({
        title: "Filter Saved",
        description: "Your filter has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save filter",
        variant: "destructive",
      });
    },
  });

  // Apply saved filter mutation
  const applyFilterMutation = useMutation({
    mutationFn: async (filterId: number) => {
      return apiRequest(`/api/saved-filters/${filterId}/apply`, "POST");
    },
    onSuccess: (data) => {
      const config = data.filterConfig as FilterConfig;
      setSelectedCategory(config.category);
      setStockFilter(config.stockStatus);
      setSupplierFilter(config.supplier);
      setSearchQuery(config.searchQuery);
      setActiveFilterId(data.id);
      toast({
        title: "Filter Applied",
        description: "Saved filter has been applied",
      });
    },
  });

  // Material categorization
  const categorizeConsumable = (material: Material): ConsumableCategory[] => {
    const categories: ConsumableCategory[] = [];
    const name = material.name.toLowerCase();
    const category = material.category?.toLowerCase() || "";

    if (category.includes("welding") || name.includes("electrode") || name.includes("wire") || name.includes("flux")) {
      categories.push("welding");
    }
    if (category.includes("cutting") || name.includes("blade") || name.includes("disc") || name.includes("plasma")) {
      categories.push("cutting");
    }
    if (category.includes("fastener") || name.includes("bolt") || name.includes("nut") || name.includes("screw")) {
      categories.push("fasteners");
    }
    if (category.includes("gas") || name.includes("cylinder") || name.includes("argon") || name.includes("oxygen")) {
      categories.push("gas");
    }
    if (category.includes("safety") || name.includes("ppe") || name.includes("helmet") || name.includes("glove")) {
      categories.push("safety");
    }

    return categories.length > 0 ? categories : ["welding"]; // Default fallback
  };

  // Filter materials with strict consumables-only filtering
  const filteredConsumables = useMemo(() => {
    return materials.filter((material: Material) => {
      // Strict filtering: only show materials explicitly marked as consumables
      const isExplicitConsumable = (
        material.category?.toLowerCase().includes('welding') ||
        material.category?.toLowerCase().includes('consumables') ||
        material.category?.toLowerCase().includes('fastener') ||
        material.category?.toLowerCase().includes('gas') ||
        material.category?.toLowerCase().includes('safety') ||
        material.code?.toLowerCase().includes('cons-') ||
        material.code?.toLowerCase().includes('weld-') ||
        material.code?.toLowerCase().includes('bolt-') ||
        material.code?.toLowerCase().includes('gas-') ||
        // Additional specific consumable patterns
        (material.name?.toLowerCase().includes('electrode') && !material.name?.toLowerCase().includes('steel')) ||
        (material.name?.toLowerCase().includes('welding') && !material.name?.toLowerCase().includes('steel')) ||
        (material.name?.toLowerCase().includes('bolt') && material.category?.toLowerCase() !== 'fasteners steel') ||
        (material.name?.toLowerCase().includes('grinding') && material.name?.toLowerCase().includes('disc'))
      );
      
      if (!isExplicitConsumable) return false;

      // Category filter using categorizeConsumable function
      const materialCategories = categorizeConsumable(material);
      if (selectedCategory !== "all" && !materialCategories.includes(selectedCategory)) {
        return false;
      }

      // Search filter
      if (searchQuery && !material.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Stock filter (simulated)
      const stockLevel = Math.floor(Math.random() * 100);
      if (stockFilter === "in-stock" && stockLevel < 10) return false;
      if (stockFilter === "low-stock" && (stockLevel < 5 || stockLevel > 15)) return false;
      if (stockFilter === "out-of-stock" && stockLevel > 0) return false;

      // Supplier filter
      if (supplierFilter !== "all" && material.supplier !== supplierFilter) {
        return false;
      }

      return true;
    });
  }, [materials, selectedCategory, searchQuery, stockFilter, supplierFilter]);

  // Most used scoring (same as steel catalogue)
  const getMostUsedScore = (material: Material): number => {
    let score = 0;
    // Having pricing data = more established/used
    if (material.pricePerKg || material.pricePerMeter) score += 100;
    // Recent creation = more active
    if (material.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(material.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) score += 50;
    }
    // Supplier assigned = more established
    if (material.supplier) score += 25;
    // Has weight data = more complete
    if (material.weightPerMeter) score += 20;
    
    return score;
  };

  // Sort and limit materials for performance
  const sortedConsumables = useMemo(() => {
    return [...filteredConsumables].sort((a, b) => getMostUsedScore(b) - getMostUsedScore(a));
  }, [filteredConsumables]);

  const displayedConsumables = useMemo(() => {
    if (searchQuery || selectedCategory !== "all") {
      return sortedConsumables; // Show all when filtering/searching
    }
    return sortedConsumables.slice(0, displayLimit);
  }, [sortedConsumables, displayLimit, searchQuery, selectedCategory]);

  // Statistics
  const statistics = useMemo(() => {
    const total = filteredConsumables.length;
    const categories = {
      welding: filteredConsumables.filter(m => categorizeConsumable(m).includes("welding")).length,
      cutting: filteredConsumables.filter(m => categorizeConsumable(m).includes("cutting")).length,
      fasteners: filteredConsumables.filter(m => categorizeConsumable(m).includes("fasteners")).length,
      gas: filteredConsumables.filter(m => categorizeConsumable(m).includes("gas")).length,
      safety: filteredConsumables.filter(m => categorizeConsumable(m).includes("safety")).length,
    };

    return { total, categories };
  }, [filteredConsumables]);

  // Helper functions
  const getStockStatus = (material: Material) => {
    const stockLevel = Math.floor(Math.random() * 100);
    if (stockLevel === 0) return { status: "out-of-stock", color: "destructive", level: 0 };
    if (stockLevel < 10) return { status: "low-stock", color: "secondary", level: stockLevel };
    return { status: "in-stock", color: "default", level: stockLevel };
  };

  const getSupplierName = (material: Material): string => {
    const supplier = suppliers.find(s => s.name === material.supplier);
    return supplier?.name || material.supplier || "Unknown Supplier";
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as ConsumableCategory);
    setSelectedSubcategory("all");
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleSaveCurrentFilter = () => {
    const config: FilterConfig = {
      category: selectedCategory,
      stockStatus: stockFilter,
      supplier: supplierFilter,
      priceRange: { min: 0, max: 1000 },
      searchQuery
    };

    setFilterToSave({
      name: "",
      description: "",
      isGlobal: false
    });
    setShowSaveFilter(true);
  };

  const handleExportCSV = () => {
    const csvData = filteredConsumables.map((material: Material) => [
      material.code,
      material.name,
      material.category || "",
      getSupplierName(material),
      material.pricePerKg?.toString() || "",
      getStockStatus(material).level.toString(),
    ]);

    const csvContent = [
      ["Code", "Name", "Category", "Supplier", "Price per kg", "Stock Level"],
      ...csvData
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "consumables-export.csv";
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Consumables data exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* Category Navigation Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Consumables Categories</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleSaveCurrentFilter} variant="outline" size="sm">
                <Bookmark className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Categories */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs px-3 py-1 h-auto"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSubcategory("all");
                setExpandedCategory(null);
              }}
            >
              All Categories ({statistics.total})
            </Button>
            {Object.entries(CONSUMABLE_CATEGORY_STRUCTURE).map(([category, info]) => {
              const count = statistics.categories[category.toLowerCase() as keyof typeof statistics.categories];
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category.toLowerCase() ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs px-4 py-1 h-auto font-medium"
                  onClick={() => handleCategoryChange(category.toLowerCase())}
                >
                  {category} ({count})
                  {selectedCategory === category.toLowerCase() && expandedCategory === category.toLowerCase() && " ▼"}
                  {selectedCategory === category.toLowerCase() && expandedCategory !== category.toLowerCase() && " ▶"}
                </Button>
              );
            })}
          </div>

          {/* Subcategory Buttons (Expandable) */}
          {expandedCategory && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200 bg-gray-50 p-3 rounded-lg border">
              <Button
                variant={selectedSubcategory === "all" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-xs px-3 py-1 h-auto"
                onClick={() => setSelectedSubcategory("all")}
              >
                All {expandedCategory}
              </Button>
              {CONSUMABLE_CATEGORY_STRUCTURE[expandedCategory as keyof typeof CONSUMABLE_CATEGORY_STRUCTURE]?.subcategories.map((subcategory) => (
                <Button
                  key={subcategory}
                  variant={selectedSubcategory === subcategory ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full text-xs px-3 py-1 h-auto"
                  onClick={() => setSelectedSubcategory(subcategory)}
                >
                  {subcategory}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search consumables..."
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
                {(stockFilter !== "all" || supplierFilter !== "all") && (
                  <Badge variant="secondary" className="ml-1">
                    Active
                  </Badge>
                )}
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

            {/* Advanced Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Stock Status:</Label>
                  <Select value={stockFilter} onValueChange={(value: StockFilter) => setStockFilter(value)}>
                    <SelectTrigger className="w-40">
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
                  <Label className="text-sm font-medium">Supplier:</Label>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Saved Filters */}
                {savedFilters.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Saved Filters:</Label>
                    <div className="flex gap-1">
                      {savedFilters.map((filter) => (
                        <Button
                          key={filter.id}
                          variant={activeFilterId === filter.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => applyFilterMutation.mutate(filter.id)}
                          className="text-xs"
                        >
                          {activeFilterId === filter.id && <BookmarkCheck className="w-3 h-3 mr-1" />}
                          {filter.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.categories.welding}</div>
              <div className="text-sm text-muted-foreground">Welding</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.categories.cutting}</div>
              <div className="text-sm text-muted-foreground">Cutting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.categories.fasteners}</div>
              <div className="text-sm text-muted-foreground">Fasteners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statistics.categories.gas}</div>
              <div className="text-sm text-muted-foreground">Gas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.categories.safety}</div>
              <div className="text-sm text-muted-foreground">Safety</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Display */}
      {viewMode === "grid" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedConsumables.map((material) => {
              const stockInfo = getStockStatus(material);
              const categories = categorizeConsumable(material);
              const categoryInfo = categories[0] ? CONSUMABLE_CATEGORY_STRUCTURE[categories[0].charAt(0).toUpperCase() + categories[0].slice(1) as keyof typeof CONSUMABLE_CATEGORY_STRUCTURE] : null;

              return (
              <Card key={material.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm leading-tight">{material.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{material.code}</p>
                    </div>
                    <Badge 
                      variant={stockInfo.color as any}
                      className="text-xs"
                    >
                      {stockInfo.level} units
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
                      <span className="text-muted-foreground">Supplier:</span>
                      <p className="font-medium truncate">{getSupplierName(material)}</p>
                    </div>
                  </div>
                  
                  {categoryInfo && (
                    <Badge className={`${categoryInfo.color} text-xs`}>
                      {categories[0].charAt(0).toUpperCase() + categories[0].slice(1)}
                    </Badge>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => onAddToJob?.(material, 1)}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Add to Job
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          
          {/* Load More Button */}
          {!searchQuery && selectedCategory === "all" && displayedConsumables.length < sortedConsumables.length && (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setDisplayLimit(prev => prev + 10)}
                className="w-full max-w-xs"
              >
                Load More ({sortedConsumables.length - displayedConsumables.length} remaining)
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Price</th>
                    <th className="text-left p-3 font-medium">Stock</th>
                    <th className="text-left p-3 font-medium">Supplier</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedConsumables.map((material) => {
                    const stockInfo = getStockStatus(material);
                    const categories = categorizeConsumable(material);
                    const categoryInfo = categories[0] ? CONSUMABLE_CATEGORY_STRUCTURE[categories[0].charAt(0).toUpperCase() + categories[0].slice(1) as keyof typeof CONSUMABLE_CATEGORY_STRUCTURE] : null;

                    return (
                      <tr key={material.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{material.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{material.code}</td>
                        <td className="p-3">
                          {categoryInfo && (
                            <Badge className={`${categoryInfo.color} text-xs`}>
                              {categories[0].charAt(0).toUpperCase() + categories[0].slice(1)}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          {formatCurrency(parseFloat(material.pricePerKg?.toString() || "0"))}/kg
                        </td>
                        <td className="p-3">
                          <Badge variant={stockInfo.color as any}>
                            {stockInfo.level} units
                          </Badge>
                        </td>
                        <td className="p-3">{getSupplierName(material)}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => onAddToJob?.(material, 1)}>
                              <ShoppingCart className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={showSaveFilter} onOpenChange={setShowSaveFilter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Filter</DialogTitle>
            <DialogDescription>
              Save your current filter settings for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                value={filterToSave.name}
                onChange={(e) => setFilterToSave({...filterToSave, name: e.target.value})}
                placeholder="e.g., My Welding Supplies"
              />
            </div>
            <div>
              <Label htmlFor="filter-description">Description (Optional)</Label>
              <Textarea
                id="filter-description"
                value={filterToSave.description}
                onChange={(e) => setFilterToSave({...filterToSave, description: e.target.value})}
                placeholder="Describe what this filter shows..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="global-filter"
                checked={filterToSave.isGlobal}
                onCheckedChange={(checked) => setFilterToSave({...filterToSave, isGlobal: checked as boolean})}
              />
              <Label htmlFor="global-filter">Make this filter available to all users</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveFilter(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const config: FilterConfig = {
                    category: selectedCategory,
                    stockStatus: stockFilter,
                    supplier: supplierFilter,
                    priceRange: { min: 0, max: 1000 },
                    searchQuery
                  };

                  saveFilterMutation.mutate({
                    ...filterToSave,
                    filterType: "consumables",
                    filterConfig: config
                  });
                }}
                disabled={!filterToSave.name || saveFilterMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}