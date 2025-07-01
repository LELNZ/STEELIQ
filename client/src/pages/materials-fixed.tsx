import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialUpload from "@/components/materials/material-upload";
import { EnhancedMaterialLibrary } from "@/components/materials/enhanced-material-library-v2";
import { EnhancedCoatingSystems } from "@/components/materials/enhanced-coating-systems";
import { Plus, Upload, Download, Package, Wrench, Paintbrush } from "lucide-react";

// Import dimensional reference images
import anglesImg from "@assets/Angles.png";
import unequalAnglesImg from "@assets/Unequal Angles.png";
import cattleRailImg from "@assets/Cattle Rail.png";
import channelImg from "@assets/Channel.png";
import flatImg from "@assets/Flstd.png";
import meshImg from "@assets/Mesh.png";
import pipeImg from "@assets/Pipe.png";
import rebarImg from "@assets/Reinforcing bar.png";
import rhsImg from "@assets/RHS.png";
import roundImg from "@assets/Round.png";
import sheetMetalImg from "@assets/Sheet metal.png";
import shsImg from "@assets/SHS.png";
import squareBarImg from "@assets/Square Bar.png";
import ubImg from "@assets/Universal Beam.png";
import ucImg from "@assets/Universal Column.png";

const DIMENSION_IMAGES = {
  "Merchant Bar": {
    "Flats": flatImg,
    "Equal Angles": anglesImg,
    "Unequal Angles": unequalAnglesImg,
    "Rounds": roundImg,
    "Squares": squareBarImg
  },
  "SHS/RHS": {
    "SHS": shsImg,
    "RHS": rhsImg,
    "Cattle Rail Hollow Section": cattleRailImg
  },
  "Structural Sections": {
    "Mild Steel Channel": channelImg,
    "Cold Formed Channel": channelImg,
    "Universal Beam": ubImg,
    "Universal Column": ucImg
  },
  "Pregal": {
    "Pregal Angles": anglesImg,
    "Pregal Flats": flatImg,
    "Pregal Channels": channelImg
  },
  "Purlins": {
    "C Purlins": channelImg,
    "Z Purlins": channelImg,
    "Sigma Purlins": channelImg
  },
  "Pipe": {
    "Seamless Line Pipe": pipeImg,
    "ERW Line Pipe": pipeImg,
    "Black Pipe": pipeImg,
    "Primed Pipe": pipeImg,
    "Galvanised Pipe": pipeImg
  },
  "Sheet Metal": {
    "Mild Steel Plate": sheetMetalImg,
    "Mild Steel Chequer Plate": sheetMetalImg,
    "Weather Resistant Plate": sheetMetalImg,
    "Cold Rolled": sheetMetalImg,
    "Electrogalvanised Sheet": sheetMetalImg,
    "Galvanised Sheet": sheetMetalImg
  },
  "Reinforcing": {
    "Rebar": rebarImg,
    "Mesh": meshImg,
    "Deformed Bar": rebarImg
  }
} as const;

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("steel");

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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Material Library</h1>
          <p className="text-gray-600 mt-1">Manage your steel catalogue with organized categories and pricing</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </Button>
        </div>
      </div>

      {/* CSV Import Help */}
      <Card className="border-blue-200 bg-blue-50">
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

      {/* Three Main Tabs: Steel Catalogue | Consumables | Coating Systems */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger 
            value="steel" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Package className="w-4 h-4" />
            Steel Catalogue
          </TabsTrigger>
          <TabsTrigger 
            value="consumables" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Wrench className="w-4 h-4" />
            Consumables
          </TabsTrigger>
          <TabsTrigger 
            value="coatings" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Paintbrush className="w-4 h-4" />
            Coating Systems
          </TabsTrigger>
        </TabsList>

        <TabsContent value="steel" className="mt-6">
          <EnhancedMaterialLibrary 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onSubcategoryChange={setSelectedSubcategory}
            materialFilter="steel"
          />
        </TabsContent>

        <TabsContent value="consumables" className="mt-6">
          <EnhancedMaterialLibrary 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onSubcategoryChange={setSelectedSubcategory}
            materialFilter="consumables"
          />
        </TabsContent>

        <TabsContent value="coatings" className="mt-6">
          <EnhancedMaterialLibrary 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onSubcategoryChange={setSelectedSubcategory}
            materialFilter="coatings"
          />
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />
    </div>
  );
}