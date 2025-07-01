import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaterialUpload from "@/components/materials/material-upload";
import { EnhancedMaterialLibrary } from "@/components/materials/enhanced-material-library-v2";
import { Plus, Upload, Download, Search } from "lucide-react";

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());

  const handleMaterialSelect = (id: number) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleMaterialEdit = (material: any) => {
    // TODO: Implement material edit functionality
    console.log("Edit material:", material);
  };

  const handleMaterialDelete = (id: number) => {
    // TODO: Implement material delete functionality
    console.log("Delete material:", id);
  };

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

      {/* Enhanced Material Library */}
      <EnhancedMaterialLibrary />

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />
    </div>
  );
}
