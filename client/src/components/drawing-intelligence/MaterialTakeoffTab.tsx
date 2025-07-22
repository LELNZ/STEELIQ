import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package,
  Download,
  FileSpreadsheet,
  Calculator,
  AlertCircle,
  TrendingUp,
  Layers,
  FileText,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaterialItem {
  id: string;
  mark: string;
  section: string;
  grade: string;
  length: number;
  quantity: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  drawingRef: string;
  phase: string;
  wastage: number;
}

export function MaterialTakeoffTab() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [wastageFactors, setWastageFactors] = useState({
    beams: 5,
    columns: 3,
    plates: 10,
    angles: 7,
  });
  const { toast } = useToast();

  // Mock data for demonstration
  const projects = [
    { id: "1", name: "Warehouse Extension - ABC Corp" },
    { id: "2", name: "Office Building - Level 2" },
  ];

  const handleGenerateTakeoff = () => {
    // Simulate generating takeoff
    const mockMaterials: MaterialItem[] = [
      {
        id: "1",
        mark: "B1-B8",
        section: "310UB40.4",
        grade: "300",
        length: 9000,
        quantity: 8,
        weight: 2908.8,
        unitPrice: 1.85,
        totalPrice: 5381.28,
        drawingRef: "S-101",
        phase: "Main Frame",
        wastage: 5,
      },
      {
        id: "2",
        mark: "C1-C6",
        section: "250UC89.5",
        grade: "300",
        length: 6000,
        quantity: 6,
        weight: 3222,
        unitPrice: 1.85,
        totalPrice: 5960.70,
        drawingRef: "S-101",
        phase: "Main Frame",
        wastage: 3,
      },
      {
        id: "3",
        mark: "P1-P4",
        section: "16mm Plate",
        grade: "250",
        length: 600,
        quantity: 4,
        weight: 301.44,
        unitPrice: 1.95,
        totalPrice: 587.81,
        drawingRef: "S-102",
        phase: "Connections",
        wastage: 10,
      },
    ];
    setMaterials(mockMaterials);
    toast({
      title: "Takeoff Generated",
      description: "Material takeoff has been generated from drawing analysis",
    });
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    toast({
      title: "Export Started",
      description: `Exporting material takeoff as ${format.toUpperCase()}...`,
    });
    setShowExportDialog(false);
  };

  const handleImportToNewEstimation = () => {
    // Prepare materials for estimation
    const selectedMaterials = materials.filter(m => selectedItems.has(m.id));
    const estimationData = {
      projectName: projects.find(p => p.id === selectedProject)?.name || "New Project",
      materials: selectedMaterials.map(material => ({
        materialCode: material.section,
        materialName: `${material.section} Grade ${material.grade}`,
        quantity: material.quantity * material.length / 1000, // Convert to meters
        unit: "m",
        unitCost: material.unitPrice,
        wasteFactor: material.wastage,
        supplier: "Drawing Import",
        notes: `Mark: ${material.mark}, Drawing: ${material.drawingRef}, Phase: ${material.phase}`,
        handlingTime: 0,
        handlingCost: 0,
        totalCost: material.totalPrice
      }))
    };

    // Store data in sessionStorage for the estimation page to retrieve
    sessionStorage.setItem('drawingImportData', JSON.stringify(estimationData));
    
    // Navigate to AI Estimation Engine
    window.location.href = '/estimation';
    
    toast({
      title: "Import Started",
      description: "Navigating to AI Estimation Engine with material data...",
    });
  };

  const handleImportToExistingEstimation = () => {
    toast({
      title: "Coming Soon",
      description: "Select existing estimation feature will be available soon",
      variant: "default",
    });
    setShowImportDialog(false);
  };

  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedItems.size === materials.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(materials.map((m) => m.id)));
    }
  };

  const calculateTotals = () => {
    const items = selectedItems.size > 0
      ? materials.filter((m) => selectedItems.has(m.id))
      : materials;

    return {
      totalWeight: items.reduce((sum, m) => sum + m.weight, 0),
      totalCost: items.reduce((sum, m) => sum + m.totalPrice, 0),
      itemCount: items.length,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Material Takeoff Generation</CardTitle>
          <CardDescription>
            Generate comprehensive material lists from analyzed drawings with wastage calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateTakeoff}
                disabled={!selectedProject}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Generate Material Takeoff
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Wastage Factors
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Beams & Columns</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={wastageFactors.beams}
                      onChange={(e) =>
                        setWastageFactors({
                          ...wastageFactors,
                          beams: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Plates</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={wastageFactors.plates}
                      onChange={(e) =>
                        setWastageFactors({
                          ...wastageFactors,
                          plates: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {materials.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{totals.itemCount}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="text-2xl font-bold">
                    {(totals.totalWeight / 1000).toFixed(2)}t
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Material Cost</p>
                  <p className="text-2xl font-bold">
                    ${totals.totalCost.toLocaleString()}
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Wastage</p>
                  <p className="text-2xl font-bold">
                    {(
                      materials.reduce((sum, m) => sum + m.wastage, 0) /
                      materials.length
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Material List</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowImportDialog(true)}
                    disabled={selectedItems.size === 0}
                    variant="default"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Import to Estimation
                  </Button>
                  <Button onClick={() => setShowExportDialog(true)} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Takeoff
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === materials.length}
                        onCheckedChange={toggleAllSelection}
                      />
                    </TableHead>
                    <TableHead>Mark</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Length (mm)</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Wastage</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead>Drawing</TableHead>
                    <TableHead>Phase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(material.id)}
                          onCheckedChange={() => toggleItemSelection(material.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{material.mark}</TableCell>
                      <TableCell>{material.section}</TableCell>
                      <TableCell>{material.grade}</TableCell>
                      <TableCell className="text-right">
                        {material.length.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">{material.quantity}</TableCell>
                      <TableCell className="text-right">
                        {material.weight.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{material.wastage}%</TableCell>
                      <TableCell className="text-right">
                        ${material.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${material.totalPrice.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.drawingRef}</Badge>
                      </TableCell>
                      <TableCell>{material.phase}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Material Takeoff</DialogTitle>
            <DialogDescription>
              Choose export format and options for the material list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => handleExport("csv")}
              >
                <FileSpreadsheet className="h-8 w-8 mb-2" />
                <span>CSV</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => handleExport("excel")}
              >
                <FileSpreadsheet className="h-8 w-8 mb-2 text-green-600" />
                <span>Excel</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => handleExport("pdf")}
              >
                <FileText className="h-8 w-8 mb-2 text-red-600" />
                <span>PDF</span>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedItems.size > 0 && (
                <p>
                  Exporting {selectedItems.size} selected items out of{" "}
                  {materials.length} total
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import to Estimation Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import to AI Estimation Engine</DialogTitle>
            <DialogDescription>
              Transfer selected materials to create or update an estimation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Selected Materials Summary</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Items:</span>{" "}
                  <span className="font-medium">{selectedItems.size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Weight:</span>{" "}
                  <span className="font-medium">
                    {(materials
                      .filter(m => selectedItems.has(m.id))
                      .reduce((sum, m) => sum + m.weight, 0) / 1000
                    ).toFixed(2)}t
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Material Cost:</span>{" "}
                  <span className="font-medium">
                    ${materials
                      .filter(m => selectedItems.has(m.id))
                      .reduce((sum, m) => sum + m.totalPrice, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Project:</span>{" "}
                  <span className="font-medium">
                    {projects.find(p => p.id === selectedProject)?.name}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => handleImportToNewEstimation()}
                className="w-full"
                variant="default"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create New Estimation
              </Button>
              <Button
                onClick={() => handleImportToExistingEstimation()}
                className="w-full"
                variant="outline"
              >
                <Send className="h-4 w-4 mr-2" />
                Add to Existing Estimation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}