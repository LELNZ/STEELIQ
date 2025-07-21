import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileUp, Eye, GitCompare, Package } from "lucide-react";
import { DrawingUploadTab } from "@/components/drawing-intelligence/DrawingUploadTab";
import { ActiveDrawingsTab } from "@/components/drawing-intelligence/ActiveDrawingsTab";
import { RevisionComparisonTab } from "@/components/drawing-intelligence/RevisionComparisonTab";
import { MaterialTakeoffTab } from "@/components/drawing-intelligence/MaterialTakeoffTab";

export default function DrawingIntelligence() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Drawing Intelligence</h1>
          <Badge variant="info" className="text-sm">PHASE 1</Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          AI-powered drawing analysis for automated material takeoff and quantity extraction
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>System Capabilities</CardTitle>
          <CardDescription>
            Extract quantities directly from CAD files matching STRUMIS/Fortune 500 standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Supported Formats</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• PDF (Searchable & Scanned)</p>
                <p>• DWG (AutoCAD)</p>
                <p>• DXF (Drawing Exchange)</p>
                <p>• PNG/JPG (With OCR)</p>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Drawing Types</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Structural Plans</p>
                <p>• Assembly Drawings</p>
                <p>• Detail Drawings</p>
                <p>• Workshop Drawings</p>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">AI Recognition</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Steel Sections (AS/NZS)</p>
                <p>• Weld Symbols</p>
                <p>• Connection Types</p>
                <p>• Hole Patterns</p>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Automation</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Material Lists</p>
                <p>• Wastage Factors</p>
                <p>• Cost Estimates</p>
                <p>• RFI Generation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Upload Drawings
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Active Drawings
          </TabsTrigger>
          <TabsTrigger value="revisions" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Revision Comparison
          </TabsTrigger>
          <TabsTrigger value="takeoff" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Material Takeoff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <DrawingUploadTab />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <ActiveDrawingsTab />
        </TabsContent>

        <TabsContent value="revisions" className="mt-6">
          <RevisionComparisonTab />
        </TabsContent>

        <TabsContent value="takeoff" className="mt-6">
          <MaterialTakeoffTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}