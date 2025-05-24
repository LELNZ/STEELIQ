import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaterialUpload from "@/components/materials/material-upload";
import EnhancedMaterialLibrary from "@/components/materials/enhanced-material-library";
import { Plus, Upload, Download } from "lucide-react";

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

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
          <p className="text-muted-foreground">
            Manage your steel catalogue with organized categories and pricing
          </p>
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

      {/* CSV Import Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">
            CSV Import Format
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700">
          <p className="mb-1">
            <strong>Required Headers:</strong> Category,Code,Name,Width (mm),Thickness (mm),Diameter (mm),Depth (mm),Flange TF (mm),Web TW (mm),Weight (kg/m),Length Options (m),Grade,Standard
          </p>
          <p>
            <strong>Pricing:</strong> You can add $/kg and $/m values manually after import
          </p>
        </CardContent>
      </Card>

      {/* Enhanced Material Library */}
      <EnhancedMaterialLibrary 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />
    </div>
  );
}