import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  X,
  Package
} from "lucide-react";

interface MaterialUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedMaterial {
  category?: string;
  code: string;
  name: string;
  width?: number;
  thickness?: number;
  diameter?: number;
  depth?: number;
  flangeTF?: number;
  webTW?: number;
  weightPerMeter?: number;
  lengthOptions?: string;
  grade?: string;
  standard?: string;
  pricePerKg?: number;
  pricePerMeter?: number;
  errors: string[];
}

export default function MaterialUpload({ open, onOpenChange }: MaterialUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedMaterials, setParsedMaterials] = useState<ParsedMaterial[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (materials: ParsedMaterial[]) => {
      const validMaterials = materials.filter(m => m.errors.length === 0);
      
      const materialData = validMaterials.map(material => ({
        code: material.code,
        name: material.name,
        category: material.category,
        width: material.width,
        thickness: material.thickness,
        diameter: material.diameter,
        depth: material.depth,
        flangeTf: material.flangeTF,
        webTw: material.webTW,
        weightPerMeter: material.weightPerMeter,
        lengthOptions: material.lengthOptions,
        grade: material.grade,
        standard: material.standard,
        pricePerKg: material.pricePerKg,
        pricePerMeter: material.pricePerMeter,
        isActive: true,
      }));

      // Process in chunks of 100 materials at a time to avoid payload size issues
      const chunkSize = 100;
      const totalResults = {
        updated: 0,
        created: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < materialData.length; i += chunkSize) {
        const chunk = materialData.slice(i, i + chunkSize);
        
        const response = await apiRequest("POST", "/api/materials/bulk-import", {
          materials: chunk
        });
        
        const chunkResult = await response.json();
        totalResults.updated += chunkResult.updated;
        totalResults.created += chunkResult.created;
        totalResults.errors.push(...chunkResult.errors);
      }

      return totalResults;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Import Complete",
        description: `Updated: ${data.updated} materials, Created: ${data.created} new materials${data.errors.length > 0 ? `, Errors: ${data.errors.length}` : ''}`,
      });
      onOpenChange(false);
      resetState();
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload materials",
        variant: "destructive",
      });
    },
  });

  const resetState = () => {
    setSelectedFile(null);
    setParsedMaterials([]);
    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === "text/csv" || file.name.endsWith(".csv"));
    
    if (csvFile) {
      setSelectedFile(csvFile);
      parseCSVFile(csvFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header and one data row");
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ''));
      const expectedHeaders = ['category', 'code', 'name', 'width', 'thickness', 'diameter', 'depth', 'flangetf', 'webtw', 'weight', 'lengthoptions', 'grade', 'standard'];
      
      const materials: ParsedMaterial[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const material: ParsedMaterial = {
          code: '',
          name: '',
          errors: []
        };

        // Map CSV columns to material properties
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'code':
              material.code = value;
              if (!value) material.errors.push('Code is required');
              break;
            case 'name':
              material.name = value;
              if (!value) material.errors.push('Name is required');
              break;
            case 'width':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.width = num;
                else material.errors.push('Invalid width value');
              }
              break;
            case 'thickness':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.thickness = num;
                else material.errors.push('Invalid thickness value');
              }
              break;

            case 'category':
              material.category = value;
              break;
            case 'diameter':
            case 'diameter mm':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.diameter = num;
                else material.errors.push('Invalid diameter value');
              }
              break;
            case 'depth':
            case 'depth mm':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.depth = num;
                else material.errors.push('Invalid depth value');
              }
              break;
            case 'flangetf':
            case 'flangetfmm':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.flangeTF = num;
                else material.errors.push('Invalid flange TF value');
              }
              break;
            case 'webtw':
            case 'webtwmm':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.webTW = num;
                else material.errors.push('Invalid web TW value');
              }
              break;
            case 'weight':
            case 'weightkgm':
            case 'weightpermeter':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.weightPerMeter = num;
                else material.errors.push('Invalid weight per meter value');
              }
              break;
            case 'lengthoptions':
            case 'lengthoptionsm':
            case 'standardlengths':
              material.lengthOptions = value;
              break;
            case 'grade':
              material.grade = value;
              break;
            case 'standard':
              material.standard = value;
              break;
            case 'priceperm':
            case 'price_per_m':
            case 'pricepermeter':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.pricePerMeter = num;
                else material.errors.push('Invalid price per meter value');
              }
              break;
            case 'priceperkg':
            case 'price_per_kg':
              if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) material.pricePerKg = num;
                else material.errors.push('Invalid price per kg value');
              }
              break;

          }
        });

        materials.push(material);
      }

      setParsedMaterials(materials);
      
      toast({
        title: "File Parsed",
        description: `Found ${materials.length} materials (${materials.filter(m => m.errors.length === 0).length} valid)`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      "Category,Code,Name,Width (mm),Thickness (mm),Diameter (mm),Depth (mm),Flange TF (mm),Web TW (mm),Weight (kg/m),Length Options (m),Grade,Standard",
      "SHS,SHS050050030,Square Hollow Section 50x50x3mm,50,3,,,50,,,4.30,6.1,C350LO,AS/NZS 1163",
      "RHS,RHS100050040,Rectangular Hollow Section 100x50x4mm,100,4,,50,,,6.82,6.1,C350LO,AS/NZS 1163",
      "Merchant Bar,FL05010,Flat Bar 50x10mm,50,10,,,,,,3.93,6.0,AS/NZS 3679.1-300,"
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'material-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const validMaterials = parsedMaterials.filter(m => m.errors.length === 0);
  const invalidMaterials = parsedMaterials.filter(m => m.errors.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Materials</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload CSV</TabsTrigger>
            <TabsTrigger value="preview">Preview & Import</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Template Download */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">CSV Template</h3>
                    <p className="text-sm text-muted-foreground">
                      Download the template to see the required format
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {selectedFile ? "File Selected" : "Upload CSV File"}
              </h3>
              
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedMaterials([]);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <FileText className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {isProcessing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Processing CSV file...</p>
              </div>
            )}

            {/* Format Instructions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">CSV Format Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Required Columns:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• code (Material code)</li>
                      <li>• name (Material name)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Optional Columns:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• width, thickness, length (mm)</li>
                      <li>• weightPerMeter (kg/m)</li>
                      <li>• grade, coating, supplier</li>
                      <li>• pricePerM, pricePerKg (NZD)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {parsedMaterials.length > 0 ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Package className="h-8 w-8 text-secondary mx-auto mb-2" />
                      <p className="text-2xl font-bold">{parsedMaterials.length}</p>
                      <p className="text-sm text-muted-foreground">Total Materials</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-accent mx-auto mb-2" />
                      <p className="text-2xl font-bold text-accent">{validMaterials.length}</p>
                      <p className="text-sm text-muted-foreground">Valid</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-2xl font-bold text-destructive">{invalidMaterials.length}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Material Preview */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {parsedMaterials.map((material, index) => (
                    <Card key={index} className={material.errors.length > 0 ? "border-destructive" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">{material.code || 'Missing Code'}</h4>
                              <Badge variant={material.errors.length === 0 ? "default" : "destructive"}>
                                {material.errors.length === 0 ? "Valid" : "Error"}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {material.name || 'Missing Name'}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {material.width && material.thickness && (
                                <span className="bg-muted px-2 py-1 rounded">
                                  {material.width}×{material.thickness}mm
                                </span>
                              )}
                              {material.weightPerMeter && (
                                <span className="bg-muted px-2 py-1 rounded">
                                  {material.weightPerMeter} kg/m
                                </span>
                              )}
                              {material.grade && (
                                <span className="bg-muted px-2 py-1 rounded">
                                  {material.grade}
                                </span>
                              )}
                              {material.standard && (
                                <span className="bg-muted px-2 py-1 rounded">
                                  {material.standard}
                                </span>
                              )}
                            </div>

                            {material.errors.length > 0 && (
                              <div className="mt-2 p-2 bg-destructive/5 rounded border border-destructive/20">
                                <p className="text-sm font-medium text-destructive mb-1">Errors:</p>
                                <ul className="text-xs text-destructive/80 space-y-1">
                                  {material.errors.map((error, errorIndex) => (
                                    <li key={errorIndex}>• {error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Import Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {validMaterials.length > 0 
                      ? `Ready to import ${validMaterials.length} valid materials`
                      : "No valid materials to import"
                    }
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={resetState}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => uploadMutation.mutate(parsedMaterials)}
                      disabled={validMaterials.length === 0 || uploadMutation.isPending}
                      className="bg-accent hover:bg-accent/90"
                    >
                      {uploadMutation.isPending ? "Importing..." : `Import ${validMaterials.length} Materials`}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No File Selected</h3>
                <p className="text-muted-foreground">
                  Upload a CSV file first to preview materials
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
