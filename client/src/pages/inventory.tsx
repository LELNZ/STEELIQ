import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryAlerts from "@/components/inventory/inventory-alerts";
import { 
  Plus, 
  Search, 
  QrCode, 
  Package, 
  Barcode,
  Camera,
  MapPin,
  Calendar,
  Truck
} from "lucide-react";
import { Inventory } from "@shared/schema";

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: inventory, isLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: lowStockItems } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Track material stock levels and manage inventory</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-0 lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-secondary hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-1" />
            Add Stock
          </Button>
          <Button size="sm" variant="outline">
            <QrCode className="w-4 h-4 mr-1" />
            Scan QR
          </Button>
          <Button size="sm" variant="outline">
            <Barcode className="w-4 h-4 mr-1" />
            Labels
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search inventory..."
            className="pl-8 w-48 lg:w-64 h-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Stock</TabsTrigger>
          <TabsTrigger value="low-stock" className="relative">
            Low Stock
            {lowStockItems && lowStockItems.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {lowStockItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="remnants">Remnants</TabsTrigger>
          <TabsTrigger value="received">Recently Received</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-32 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory?.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-secondary" />
                        <CardTitle className="text-lg">Stock #{item.id}</CardTitle>
                      </div>
                      <Badge variant={item.quantityInStock > 5 ? "secondary" : "destructive"}>
                        {item.quantityInStock} units
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.batchNumber && (
                      <div>
                        <p className="text-sm text-muted-foreground">Batch Number</p>
                        <p className="font-medium">{item.batchNumber}</p>
                      </div>
                    )}

                    {item.heatNumber && (
                      <div>
                        <p className="text-sm text-muted-foreground">Heat Number</p>
                        <p className="font-medium">{item.heatNumber}</p>
                      </div>
                    )}

                    {item.lengthAvailable && (
                      <div>
                        <p className="text-sm text-muted-foreground">Available Length</p>
                        <p className="font-medium">{item.lengthAvailable}mm</p>
                      </div>
                    )}

                    {item.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.location}</span>
                      </div>
                    )}

                    {item.receivedDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(item.receivedDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant={item.isRemnant ? "outline" : "secondary"}>
                        {item.isRemnant ? "Remnant" : "Full Length"}
                      </Badge>
                      
                      {item.qrCode && (
                        <Button variant="ghost" size="sm">
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="low-stock">
          <InventoryAlerts />
        </TabsContent>

        <TabsContent value="remnants">
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Remnant tracking</h3>
              <p className="text-muted-foreground">
                Remnant tracking functionality will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Recent deliveries</h3>
              <p className="text-muted-foreground">
                Recently received materials will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
