import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialUpload from "@/components/materials/material-upload";
import { SteelCatalogueOnly } from "@/components/materials/steel-catalogue-only";
import { EnhancedConsumablesV2 } from "@/components/materials/enhanced-consumables-v2";
import { useQuery } from "@tanstack/react-query";
import { Material, Supplier } from "@shared/schema";
import { Plus, Upload, Download, Search, Package } from "lucide-react";

export default function Materials() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load materials and suppliers for components
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/materials/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "materials.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Material Library</h1>
          <p className="text-muted-foreground">Manage your steel catalogue with organized categories and pricing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Material Library with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steel-catalogue" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-muted/50 rounded-lg p-1">
              <TabsTrigger 
                value="steel-catalogue" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Steel Catalogue
              </TabsTrigger>
              <TabsTrigger 
                value="consumables" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Consumables
              </TabsTrigger>
              <TabsTrigger 
                value="coating-systems" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Coating Systems
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steel-catalogue" className="space-y-6">
              <SteelCatalogueOnly />
            </TabsContent>

            <TabsContent value="consumables">
              <EnhancedConsumablesV2 
                materials={materials}
                suppliers={suppliers}
              />
            </TabsContent>

            <TabsContent value="coating-systems">
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Coating Systems</h3>
                  <p className="text-muted-foreground">Coming soon - coating system management</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />
    </div>
  );
}
