import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, ShoppingCart, Package, Plus } from "lucide-react";
import { Inventory, Material } from "@shared/schema";

export default function InventoryAlerts() {
  const { data: lowStockItems, isLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  const { data: materials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const getMaterialInfo = (materialId: number) => {
    return materials?.find(m => m.id === materialId);
  };

  const getAlertIcon = (stock: number) => {
    if (stock === 0) return <XCircle className="text-destructive" />;
    return <AlertTriangle className="text-warning" />;
  };

  const getAlertBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning">Low Stock</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse p-3 bg-muted rounded-lg">
              <div className="h-16 bg-muted-foreground/20 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span>Inventory Alerts</span>
          </CardTitle>
          {lowStockItems && lowStockItems.length > 0 && (
            <Badge variant="destructive">
              {lowStockItems.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStockItems && lowStockItems.length > 0 ? (
          lowStockItems.map((item) => {
            const material = getMaterialInfo(item.materialId);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.quantityInStock === 0
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-warning/5 border-warning/20"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getAlertIcon(item.quantityInStock)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {material?.code || `Material ID ${item.materialId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {material?.name || 'Unknown Material'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getAlertBadge(item.quantityInStock)}
                      <span className="text-xs text-muted-foreground">
                        {item.quantityInStock} pieces remaining
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-secondary hover:text-secondary/80"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-accent hover:text-accent/80"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No inventory alerts</p>
            <p className="text-xs text-muted-foreground mt-1">
              All materials are adequately stocked
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {lowStockItems && lowStockItems.length > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Generate PO
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <Package className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
            </div>
          </div>
        )}

        {/* Stock Level Guide */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Stock Level Guide</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              <span>Out of Stock (0 pieces)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span>Low Stock (1-5 pieces)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Well Stocked (6+ pieces)</span>
            </div>
          </div>
        </div>

        {/* Material Procurement Tip */}
        <div className="mt-4 p-3 bg-secondary/5 rounded-lg border border-secondary/20">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-secondary">Procurement Tip</p>
              <p className="text-secondary/80 mt-1">
                Consider bulk ordering for frequently used materials to reduce unit costs and minimize stockouts.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
