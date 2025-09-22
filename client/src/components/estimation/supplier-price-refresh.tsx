import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, DollarSign, Clock, TrendingUp, Building2 } from "lucide-react";

interface MaterialCost {
  id: string;
  materialId?: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  leadTime?: number;
}

interface SupplierPrice {
  supplierId: number;
  supplierName: string;
  pricePerMeter?: number;
  pricePerKg?: number;
  tonRate?: number;
  leadTimeDays?: number;
  lastUpdated?: string;
  isPrimary: boolean;
}

interface SupplierPriceRefreshProps {
  materials: MaterialCost[];
  onPricesUpdate: (updatedMaterials: MaterialCost[]) => void;
}

export function SupplierPriceRefresh({ materials, onPricesUpdate }: SupplierPriceRefreshProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [supplierPrices, setSupplierPrices] = useState<Record<string, SupplierPrice[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch supplier prices for selected material
  const fetchSupplierPrices = async (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    if (!material?.materialId) return;

    try {
      setIsLoading(true);
      // Query material_suppliers table for this material
      const prices = await apiRequest(`/api/supplier-prices/material/${material.materialId}`, 'GET');
      setSupplierPrices(prev => ({
        ...prev,
        [materialId]: prices || []
      }));
    } catch (error) {
      console.error("Error fetching supplier prices:", error);
      // Set empty array if no prices found
      setSupplierPrices(prev => ({
        ...prev,
        [materialId]: []
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all prices from suppliers
  const refreshAllPrices = async () => {
    setIsLoading(true);
    const priceMap: Record<string, SupplierPrice[]> = {};
    
    try {
      // Fetch prices for all materials with materialId
      for (const material of materials) {
        if (material.materialId) {
          try {
            const prices = await apiRequest(`/api/supplier-prices/material/${material.materialId}`, 'GET');
            priceMap[material.id] = prices || [];
          } catch (error) {
            priceMap[material.id] = [];
          }
        }
      }
      
      setSupplierPrices(priceMap);
      
      // Count how many materials have supplier prices
      const materialsWithPrices = Object.values(priceMap).filter(prices => prices.length > 0).length;
      
      if (materialsWithPrices > 0) {
        toast({
          title: "Prices Refreshed",
          description: `Found supplier prices for ${materialsWithPrices} of ${materials.length} materials`,
        });
      } else {
        toast({
          title: "No Supplier Prices",
          description: "No supplier prices found in the system. Prices will be available once suppliers provide quotes.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh supplier prices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply selected supplier price to material
  const applySupplierPrice = (materialId: string, supplierPrice: SupplierPrice) => {
    const updatedMaterials = materials.map(material => {
      if (material.id === materialId) {
        const unitCost = material.unit === 'kg' 
          ? (supplierPrice.pricePerKg || 0)
          : (supplierPrice.pricePerMeter || 0);
        
        const totalCost = material.quantity * unitCost;
        
        return {
          ...material,
          unitCost,
          totalCost,
          supplier: supplierPrice.supplierName,
          leadTime: supplierPrice.leadTimeDays,
        };
      }
      return material;
    });

    onPricesUpdate(updatedMaterials);
    toast({
      title: "Price Updated",
      description: `Applied ${supplierPrice.supplierName} pricing to material`,
    });
  };

  // Apply best prices automatically (lowest price or primary supplier)
  const applyBestPrices = () => {
    const updatedMaterials = materials.map(material => {
      const prices = supplierPrices[material.id] || [];
      
      if (prices.length === 0) return material;
      
      // Find primary supplier or lowest price
      let bestPrice = prices.find(p => p.isPrimary);
      if (!bestPrice) {
        // Find lowest price based on unit
        bestPrice = prices.reduce((best, current) => {
          const currentPrice = material.unit === 'kg' 
            ? (current.pricePerKg || Infinity)
            : (current.pricePerMeter || Infinity);
          const bestPrice = material.unit === 'kg'
            ? (best.pricePerKg || Infinity)  
            : (best.pricePerMeter || Infinity);
          
          return currentPrice < bestPrice ? current : best;
        });
      }
      
      const unitCost = material.unit === 'kg'
        ? (bestPrice.pricePerKg || material.unitCost)
        : (bestPrice.pricePerMeter || material.unitCost);
      
      const totalCost = material.quantity * unitCost;
      
      return {
        ...material,
        unitCost,
        totalCost,
        supplier: bestPrice.supplierName,
        leadTime: bestPrice.leadTimeDays,
      };
    });

    onPricesUpdate(updatedMaterials);
    
    const updatedCount = materials.filter((m, i) => 
      updatedMaterials[i].unitCost !== m.unitCost
    ).length;
    
    toast({
      title: "Best Prices Applied",
      description: `Updated ${updatedCount} material prices with best available options`,
    });
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const selectedPrices = supplierPrices[selectedMaterialId] || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Supplier Prices
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Refresh Supplier Prices</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button 
              onClick={refreshAllPrices} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Prices...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh All Prices
                </>
              )}
            </Button>
            <Button
              onClick={applyBestPrices}
              disabled={Object.keys(supplierPrices).length === 0}
              variant="default"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Apply Best Prices
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Select Material to View Prices</Label>
            <Select 
              value={selectedMaterialId} 
              onValueChange={(value) => {
                setSelectedMaterialId(value);
                fetchSupplierPrices(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a material..." />
              </SelectTrigger>
              <SelectContent>
                {materials.map(material => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.materialCode} - {material.materialName}
                    {supplierPrices[material.id]?.length > 0 && (
                      <span className="ml-2 text-green-600">
                        ({supplierPrices[material.id].length} prices)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMaterial && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Current: ${selectedMaterial.unitCost.toFixed(2)}/{selectedMaterial.unit}
                {selectedMaterial.supplier && ` from ${selectedMaterial.supplier}`}
              </div>

              {isLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading supplier prices...</p>
                </div>
              ) : selectedPrices.length > 0 ? (
                <div className="space-y-2">
                  {selectedPrices.map((price, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">{price.supplierName}</span>
                            {price.isPrimary && (
                              <Badge variant="secondary">Primary</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>
                                ${selectedMaterial.unit === 'kg' 
                                  ? (price.pricePerKg || 0).toFixed(2)
                                  : (price.pricePerMeter || 0).toFixed(2)
                                }/{selectedMaterial.unit}
                              </span>
                            </div>
                            {price.leadTimeDays && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{price.leadTimeDays} days</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => applySupplierPrice(selectedMaterial.id, price)}
                        >
                          Apply
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No supplier prices available for this material</p>
                  <p className="text-sm">Prices will appear once suppliers provide quotes</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}