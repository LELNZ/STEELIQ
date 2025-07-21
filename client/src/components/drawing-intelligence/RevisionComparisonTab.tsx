import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitCompare,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
  Download,
  Eye,
  Package,
  DollarSign,
} from "lucide-react";

interface Revision {
  id: string;
  drawingId: string;
  fileName: string;
  revisionNumber: string;
  uploadedAt: string;
  changes: {
    added: number;
    modified: number;
    removed: number;
  };
}

interface ComparisonResult {
  baseRevision: string;
  compareRevision: string;
  changes: {
    steelMembers: {
      added: Array<{ mark: string; section: string; length: number }>;
      modified: Array<{ mark: string; field: string; oldValue: any; newValue: any }>;
      removed: Array<{ mark: string; section: string }>;
    };
    connections: {
      added: Array<{ type: string; location: string }>;
      modified: Array<{ type: string; change: string }>;
      removed: Array<{ type: string; location: string }>;
    };
    dimensions: {
      changed: Array<{ element: string; oldDim: string; newDim: string }>;
    };
  };
  summary: {
    weightChange: number;
    costImpact: number;
  };
}

export function RevisionComparisonTab() {
  const [selectedDrawing, setSelectedDrawing] = useState<string>("");
  const [baseRevision, setBaseRevision] = useState<string>("");
  const [compareRevision, setCompareRevision] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Mock data for demonstration
  const drawings = [
    { id: "1", name: "Warehouse Structure - Main Frame.pdf" },
    { id: "2", name: "Office Building - Level 2 Floor Plan.pdf" },
  ];

  const revisions = [
    { id: "r1", drawingId: "1", revisionNumber: "A", uploadedAt: "2025-01-15" },
    { id: "r2", drawingId: "1", revisionNumber: "B", uploadedAt: "2025-01-20" },
    { id: "r3", drawingId: "1", revisionNumber: "C", uploadedAt: "2025-01-25" },
  ];

  const handleCompare = async () => {
    if (!baseRevision || !compareRevision) return;

    setIsComparing(true);
    // Simulate API call
    setTimeout(() => {
      setComparisonResult({
        baseRevision: "Rev A",
        compareRevision: "Rev C",
        changes: {
          steelMembers: {
            added: [
              { mark: "B12", section: "200UB25.4", length: 6500 },
              { mark: "C8", section: "150PFC", length: 3200 },
            ],
            modified: [
              { mark: "A5", field: "length", oldValue: 4500, newValue: 5200 },
              { mark: "B3", field: "section", oldValue: "250UB31.4", newValue: "310UB40.4" },
            ],
            removed: [
              { mark: "D2", section: "100x100x6 SHS" },
            ],
          },
          connections: {
            added: [
              { type: "Bolted End Plate", location: "Grid 3-B" },
            ],
            modified: [
              { type: "Base Plate", change: "Increased from 20mm to 25mm thick" },
            ],
            removed: [],
          },
          dimensions: {
            changed: [
              { element: "Bay Spacing", oldDim: "7500mm", newDim: "8000mm" },
              { element: "Eave Height", oldDim: "6000mm", newDim: "6500mm" },
            ],
          },
        },
        summary: {
          weightChange: 1250,
          costImpact: 3750,
        },
      });
      setIsComparing(false);
    }, 2000);
  };

  const getChangeIcon = (type: "added" | "modified" | "removed") => {
    switch (type) {
      case "added":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "modified":
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case "removed":
        return <Minus className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Drawing Revision Comparison</CardTitle>
          <CardDescription>
            Compare different revisions to identify changes in steel members, connections, and dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Select Drawing</Label>
              <Select value={selectedDrawing} onValueChange={setSelectedDrawing}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a drawing" />
                </SelectTrigger>
                <SelectContent>
                  {drawings.map((drawing) => (
                    <SelectItem key={drawing.id} value={drawing.id}>
                      {drawing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Base Revision</Label>
              <Select
                value={baseRevision}
                onValueChange={setBaseRevision}
                disabled={!selectedDrawing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select base revision" />
                </SelectTrigger>
                <SelectContent>
                  {revisions
                    .filter((r) => r.drawingId === selectedDrawing)
                    .map((revision) => (
                      <SelectItem key={revision.id} value={revision.id}>
                        Rev {revision.revisionNumber} - {revision.uploadedAt}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Compare With</Label>
              <Select
                value={compareRevision}
                onValueChange={setCompareRevision}
                disabled={!selectedDrawing || !baseRevision}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select revision to compare" />
                </SelectTrigger>
                <SelectContent>
                  {revisions
                    .filter((r) => r.drawingId === selectedDrawing && r.id !== baseRevision)
                    .map((revision) => (
                      <SelectItem key={revision.id} value={revision.id}>
                        Rev {revision.revisionNumber} - {revision.uploadedAt}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleCompare}
              disabled={!baseRevision || !compareRevision || isComparing}
              className="w-full md:w-auto"
            >
              {isComparing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare Revisions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comparisonResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Members Added</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{comparisonResult.changes.steelMembers.added.length}
                  </p>
                </div>
                <Plus className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Members Modified</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {comparisonResult.changes.steelMembers.modified.length}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Weight Change</p>
                  <p className="text-2xl font-bold">
                    {comparisonResult.summary.weightChange > 0 ? "+" : ""}
                    {comparisonResult.summary.weightChange} kg
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cost Impact</p>
                  <p className="text-2xl font-bold">
                    ${comparisonResult.summary.costImpact.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Comparison Results</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Overlay
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="members" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="members">Steel Members</TabsTrigger>
                  <TabsTrigger value="connections">Connections</TabsTrigger>
                  <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-4">
                  {comparisonResult.changes.steelMembers.added.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        {getChangeIcon("added")} Added Members
                      </h4>
                      <div className="space-y-2">
                        {comparisonResult.changes.steelMembers.added.map((item, idx) => (
                          <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="font-medium">Mark {item.mark}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.section} - {item.length}mm
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparisonResult.changes.steelMembers.modified.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        {getChangeIcon("modified")} Modified Members
                      </h4>
                      <div className="space-y-2">
                        {comparisonResult.changes.steelMembers.modified.map((item, idx) => (
                          <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="font-medium">Mark {item.mark}</p>
                            <p className="text-sm">
                              {item.field}: {item.oldValue} → {item.newValue}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparisonResult.changes.steelMembers.removed.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        {getChangeIcon("removed")} Removed Members
                      </h4>
                      <div className="space-y-2">
                        {comparisonResult.changes.steelMembers.removed.map((item, idx) => (
                          <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="font-medium">Mark {item.mark}</p>
                            <p className="text-sm text-muted-foreground">{item.section}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="connections" className="space-y-4">
                  {/* Similar structure for connections */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connection changes detected. Review structural implications with engineer.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="dimensions" className="space-y-4">
                  {/* Similar structure for dimensions */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Dimensional changes may affect material quantities and fabrication.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}