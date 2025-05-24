import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MaterialUpload from "@/components/materials/material-upload";
import BulkCatalogueImport from "@/components/materials/bulk-catalogue-import";
import { Plus, Upload, Download, Search, Package, Edit, Trash2, Database } from "lucide-react";
import { Material } from "@shared/schema";

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const { data: materials, isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials", searchQuery],
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
          <p className="text-muted-foreground">Manage your steel catalog and material specifications</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button className="bg-secondary hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowBulkImport(true)}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            <Database className="w-4 h-4 mr-2" />
            Import Steel Catalogue
          </Button>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search materials..."
            className="pl-10 w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials?.map((material) => (
            <Card key={material.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-secondary" />
                    <CardTitle className="text-lg">{material.code}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">{material.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {material.width && material.thickness 
                      ? `${material.width}×${material.thickness}mm`
                      : 'Custom dimensions'
                    }
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="font-medium">{material.grade || 'Standard'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{material.weightPerMeter || 0} kg/m</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">
                      {material.pricePerMeter 
                        ? `$${material.pricePerMeter}/m`
                        : material.pricePerKg
                        ? `$${material.pricePerKg}/kg`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {material.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {material.supplier && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="text-sm font-medium">{material.supplier}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {materials && materials.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No materials found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No materials match "${searchQuery}"`
                : "Start by adding materials to your library"
              }
            </p>
            <div className="flex justify-center space-x-2">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
              <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />

      {/* Bulk Catalogue Import Modal */}
      <BulkCatalogueImport 
        open={showBulkImport} 
        onOpenChange={setShowBulkImport} 
      />
    </div>
  );
}
