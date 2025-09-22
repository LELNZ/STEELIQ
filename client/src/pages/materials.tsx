import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialUpload from "@/components/materials/material-upload";
import { SteelCatalogueOnly } from "@/components/materials/steel-catalogue-only";
import { ConsumablesCleanFixed } from "@/components/materials/consumables-clean-fixed";
import CoatingSystemsConsumableStyle from "@/components/materials/coating-systems-consumable-style";
import { useQuery } from "@tanstack/react-query";
import { Material, Supplier, ConnectionComponent } from "@shared/schema";
import { Plus, Upload, Download, Search, Package, Wrench } from "lucide-react";

export default function Materials() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load materials and suppliers for components
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: connectionComponents = [] } = useQuery<ConnectionComponent[]>({
    queryKey: ["/api/connection-components"],
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Library</h1>
          <p className="text-sm text-muted-foreground">Manage your steel catalogue with organized categories and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            variant="outline"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
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
            <TabsList className="grid w-full grid-cols-4 mb-6 h-12 bg-muted/50 rounded-lg p-1">
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
              <TabsTrigger 
                value="connections" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Connections ({connectionComponents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steel-catalogue" className="space-y-6">
              <SteelCatalogueOnly />
            </TabsContent>

            <TabsContent value="consumables">
              <ConsumablesCleanFixed 
                materials={materials}
                suppliers={suppliers}
              />
            </TabsContent>

            <TabsContent value="coating-systems">
              <CoatingSystemsConsumableStyle />
            </TabsContent>

            <TabsContent value="connections" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Connection Components Library</h3>
                    <p className="text-sm text-muted-foreground">
                      Standard connection components with exact dimensions and weld times ({connectionComponents.length} components)
                    </p>
                  </div>
                </div>
                
                {connectionComponents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connectionComponents.map((component) => (
                      <Card key={component.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Wrench className="h-5 w-5 text-blue-500" />
                              <CardTitle className="text-sm font-medium leading-tight">
                                {component.name}
                              </CardTitle>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs px-2 py-1 bg-secondary rounded">
                                {component.component_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Compatible: {component.section_compatibility}
                          </p>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          {/* Dimensions */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Height</p>
                              <p className="font-medium">{component.height}mm</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Width</p>
                              <p className="font-medium">{component.width}mm</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Thickness</p>
                              <p className="font-medium">{component.thickness}mm</p>
                            </div>
                          </div>

                          {/* Weld Time and Grade */}
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Weld Time</p>
                              <p className="font-medium">{component.weld_time_per_hour} h/h</p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground text-xs">Grade</p>
                              <p className="font-medium">{component.material_grade || '250'}</p>
                            </div>
                          </div>

                          {/* Standard */}
                          {component.standard && (
                            <div className="border-t pt-2">
                              <p className="text-xs text-muted-foreground">Standard: {component.standard}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No connection components found</p>
                    <p className="text-sm text-muted-foreground">Connection components will appear here when available</p>
                  </div>
                )}
              </div>
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
