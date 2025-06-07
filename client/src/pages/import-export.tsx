import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  FileSpreadsheet,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImportResult {
  success: boolean;
  processed: number;
  created: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
}

export default function ImportExportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const importSuppliersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/api/import-export/import/suppliers', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data) => {
      setImportResults(data);
      setSelectedFile(null);
      toast({
        title: "Import Completed",
        description: `Processed ${data.processed} suppliers. Created: ${data.created}, Updated: ${data.updated || 0}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import suppliers",
        variant: "destructive",
      });
    }
  });

  const importContactsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/api/import-export/import/contacts', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data) => {
      setImportResults(data);
      setSelectedFile(null);
      toast({
        title: "Import Completed",
        description: `Processed ${data.processed} contacts. Created: ${data.created}, Skipped: ${data.skipped || 0}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import contacts",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleDownloadTemplate = async (type: 'suppliers' | 'contacts') => {
    try {
      const response = await fetch(`/api/import-export/template/${type}`);
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_import_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: `${type} import template has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (type: 'suppliers' | 'contacts', entityType?: string) => {
    try {
      const url = entityType 
        ? `/api/import-export/export/${type}?entityType=${entityType}`
        : `/api/import-export/export/${type}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = entityType 
        ? `${entityType}_${type}_export_${timestamp}.csv`
        : `${type}_export_${timestamp}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Export Completed",
        description: `${type} data has been exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const isImporting = importSuppliersMutation.isPending || importContactsMutation.isPending;

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Import & Export</h1>
        <p className="text-muted-foreground mt-2">
          Manage your suppliers and contacts data with comprehensive import and export tools
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Suppliers Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Import Suppliers
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file to import supplier information
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-file">Select CSV File</Label>
                  <Input
                    id="supplier-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('suppliers')}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {selectedFile && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    
                    <Button
                      onClick={() => selectedFile && importSuppliersMutation.mutate(selectedFile)}
                      disabled={isImporting}
                      className="w-full"
                    >
                      {isImporting ? "Importing..." : "Import Suppliers"}
                    </Button>
                  </div>
                )}

                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importing suppliers...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Import Contacts
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file to import contact information
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-file">Select CSV File</Label>
                  <Input
                    id="contact-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('contacts')}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {selectedFile && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    
                    <Button
                      onClick={() => selectedFile && importContactsMutation.mutate(selectedFile)}
                      disabled={isImporting}
                      className="w-full"
                    >
                      {isImporting ? "Importing..." : "Import Contacts"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Import Results */}
          {importResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResults.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{importResults.processed}</div>
                    <div className="text-sm text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResults.created}</div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </div>
                  {importResults.updated !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                      <div className="text-sm text-muted-foreground">Updated</div>
                    </div>
                  )}
                  {importResults.skipped !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{importResults.skipped}</div>
                      <div className="text-sm text-muted-foreground">Skipped</div>
                    </div>
                  )}
                </div>

                {importResults.errors && importResults.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Errors occurred during import:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {importResults.errors.slice(0, 10).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {importResults.errors.length > 10 && (
                            <li>... and {importResults.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Export Suppliers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Export Suppliers
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Download all supplier data as CSV
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => handleExport('suppliers')}
                  className="w-full flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export All Suppliers
                </Button>
              </CardContent>
            </Card>

            {/* Export Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Export Contacts
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Download contact data as CSV
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button
                    onClick={() => handleExport('contacts')}
                    className="w-full flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export All Contacts
                  </Button>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Export by Type:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('contacts', 'supplier')}
                        className="flex items-center gap-2"
                      >
                        <Building2 className="h-3 w-3" />
                        Supplier Contacts
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('contacts', 'client')}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-3 w-3" />
                        Client Contacts
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Export Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Supplier Export Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Company details and registration info</li>
                    <li>• Contact information and addresses</li>
                    <li>• Financial terms and ratings</li>
                    <li>• Operational data and preferences</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Contact Export Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Personal and professional details</li>
                    <li>• Phone numbers and email addresses</li>
                    <li>• Role classifications and departments</li>
                    <li>• Contact preferences and notes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}