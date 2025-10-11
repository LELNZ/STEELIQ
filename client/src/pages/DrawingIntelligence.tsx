import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  Download,
  ChevronRight,
  Search,
  Filter,
  Brain,
  Layers,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  RefreshCw
} from "lucide-react";
import { PdfViewerComponent } from "@/components/drawing-intelligence/PdfViewerComponent";

interface DrawingDocument {
  id: number;
  projectId: number;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  pageCount?: number;
  drawingNumber?: string;
  drawingTitle?: string;
  confidence?: number;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
}

interface EstimationProject {
  id: number;
  name: string;
  status: string;
  client?: string;
}

interface AIAnalysis {
  id: number;
  drawingId: number;
  status: string;
  confidence: number;
  extractedElements: any;
  hierarchicalStructure: any;
  createdAt: string;
  updatedAt: string;
}

export default function DrawingIntelligence() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DrawingDocument | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [showMtoPanel, setShowMtoPanel] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { toast } = useToast();

  // Fetch estimation projects
  const { data: projects = [] } = useQuery<EstimationProject[]>({
    queryKey: ["/api/estimations"],
    enabled: true
  });

  // Fetch drawings for selected project
  const { data: drawings = [], refetch: refetchDrawings } = useQuery<DrawingDocument[]>({
    queryKey: [`/api/drawings/project/${selectedProject}`],
    enabled: !!selectedProject
  });

  // Fetch annotations for selected document
  const { data: documentAnnotations = [] } = useQuery({
    queryKey: [`/api/drawings/${selectedDocument?.id}/annotations`],
    enabled: !!selectedDocument
  });

  useEffect(() => {
    if (documentAnnotations) {
      setAnnotations(documentAnnotations);
    }
  }, [documentAnnotations]);

  // Upload drawing mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/drawings/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Drawing uploaded successfully"
      });
      setUploadDialogOpen(false);
      setUploadFile(null);
      refetchDrawings();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete drawing mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/drawings/${documentId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to delete drawing");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Drawing deleted successfully"
      });
      setSelectedDocument(null);
      refetchDrawings();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete drawing",
        variant: "destructive"
      });
    }
  });

  // Create annotation mutation
  const createAnnotationMutation = useMutation({
    mutationFn: async (annotation: any) => {
      const response = await fetch(`/api/drawings/${selectedDocument?.id}/annotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(annotation),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to create annotation");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/drawings/${selectedDocument?.id}/annotations`]
      });
      toast({
        title: "Annotation Added",
        description: "Element marked successfully"
      });
    }
  });

  // AI Analysis mutation
  const analyzeDrawingMutation = useMutation({
    mutationFn: async (drawingId: number) => {
      const response = await fetch(`/api/ai-analysis/analyze/${drawingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "AI analysis failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
      toast({
        title: "AI Analysis Complete",
        description: `Extracted ${data.extractedElements?.length || 0} elements with ${Math.round(data.confidence * 100)}% confidence`
      });
      setIsAnalyzing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "AI Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  });

  // Fetch AI Analysis for selected document
  const { data: existingAnalysis } = useQuery({
    queryKey: [`/api/ai-analysis/drawing/${selectedDocument?.id}`],
    enabled: !!selectedDocument
  });

  useEffect(() => {
    if (existingAnalysis) {
      setAiAnalysis(existingAnalysis);
    }
  }, [existingAnalysis]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!uploadFile || !selectedProject) return;

    const formData = new FormData();
    formData.append("drawing", uploadFile);
    formData.append("projectId", selectedProject.toString());

    uploadMutation.mutate(formData);
  };

  const handleAnnotationCreate = (annotation: any) => {
    createAnnotationMutation.mutate(annotation);
  };

  const handleElementSelect = (element: any) => {
    console.log("Element selected:", element);
    // This will be used for MTO generation
  };

  const handleAIAnalysis = () => {
    if (selectedDocument) {
      setIsAnalyzing(true);
      analyzeDrawingMutation.mutate(selectedDocument.id);
    }
  };

  const renderHierarchicalElement = (element: any, level: number = 0) => {
    return (
      <div key={element.id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <Card className="p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {element.children && element.children.length > 0 && (
                <ChevronRight className="h-4 w-4" />
              )}
              <div>
                <p className="font-medium">
                  {element.designation} - {element.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {element.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {element.quantity} {element.unit}
                  </span>
                  {element.material && (
                    <span className="text-xs text-muted-foreground">
                      {element.material}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {element.confidence && (
              <Badge className="bg-green-100 text-green-800">
                {Math.round(element.confidence * 100)}%
              </Badge>
            )}
          </div>
        </Card>
        {element.children && element.children.map((child: any) => 
          renderHierarchicalElement(child, level + 1)
        )}
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: { color: "bg-blue-500", icon: Upload },
      processing: { color: "bg-yellow-500", icon: Clock },
      completed: { color: "bg-green-500", icon: CheckCircle },
      failed: { color: "bg-red-500", icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.uploaded;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Brain className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">AI Drawing Intelligence</h1>
            <Badge variant="outline" className="bg-blue-50">
              Fortune 50 AI Engine
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <Select
              value={selectedProject?.toString()}
              onValueChange={(value) => setSelectedProject(parseInt(value))}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select an estimation project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                    {project.client && (
                      <span className="text-muted-foreground ml-2">
                        - {project.client}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setUploadDialogOpen(true)}
              disabled={!selectedProject}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Drawing
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Drawing List */}
        <div className="w-80 border-r bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Project Drawings</h3>
              <Badge variant="secondary">{drawings.length} files</Badge>
            </div>

            {!selectedProject ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a project to view drawings</p>
              </div>
            ) : drawings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No drawings uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drawings.map((drawing) => (
                  <Card
                    key={drawing.id}
                    className={`cursor-pointer transition-colors ${
                      selectedDocument?.id === drawing.id
                        ? "ring-2 ring-blue-500"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setSelectedDocument(drawing)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">
                            {drawing.originalFileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {drawing.fileType.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(drawing.fileSize)}
                            </span>
                          </div>
                          {drawing.drawingNumber && (
                            <p className="text-xs mt-1 text-muted-foreground">
                              #{drawing.drawingNumber}
                            </p>
                          )}
                        </div>
                        <div className="ml-2">
                          {getStatusBadge(drawing.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center/Right Panel - PDF Viewer and MTO */}
        {selectedDocument ? (
          <div className="flex-1 flex">
            {/* PDF Viewer */}
            <div className={showMtoPanel ? "flex-1" : "w-full"}>
              <PdfViewerComponent
                documentId={selectedDocument.id}
                fileUrl={`/api/drawings/${selectedDocument.id}/file`}
                onAnnotationCreate={handleAnnotationCreate}
                onElementSelect={handleElementSelect}
                enableAnnotations={true}
                annotations={annotations}
              />
            </div>

            {/* MTO Panel */}
            {showMtoPanel && (
              <div className="w-96 border-l bg-white dark:bg-gray-900 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Material Take-Off</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowMtoPanel(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Tabs defaultValue="elements" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="elements">Elements</TabsTrigger>
                      <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                    </TabsList>

                    <TabsContent value="elements" className="mt-4">
                      {!aiAnalysis || !aiAnalysis.extractedElements ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No AI analysis yet</p>
                          <Button 
                            className="mt-4" 
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4 mr-2" />
                                Run AI Analysis
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-4">
                            <Badge className="bg-blue-100 text-blue-800">
                              {aiAnalysis.extractedElements.length} Elements
                            </Badge>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={handleAIAnalysis}
                              disabled={isAnalyzing}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-analyze
                            </Button>
                          </div>
                          {aiAnalysis.extractedElements.map((element: any, index: number) => (
                            <Card key={index} className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {element.designation || element.id}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {element.type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {element.quantity} {element.unit}
                                    </span>
                                  </div>
                                </div>
                                {element.confidence && (
                                  <Badge className="bg-green-100 text-green-800">
                                    {Math.round(element.confidence * 100)}%
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="hierarchy" className="mt-4">
                      {!aiAnalysis || !aiAnalysis.hierarchicalStructure ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Run AI analysis first</p>
                          <p className="text-xs mt-2">
                            To see parent-child relationships
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mb-4">
                            <Badge className="bg-purple-100 text-purple-800">
                              Hierarchical Structure
                            </Badge>
                          </div>
                          {aiAnalysis.hierarchicalStructure.map((element: any) => 
                            renderHierarchicalElement(element)
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="summary" className="mt-4">
                      {!aiAnalysis ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No analysis available</p>
                          <Button 
                            className="mt-4"
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing}
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            Generate AI MTO
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Card className="p-4">
                            <h4 className="font-semibold mb-2">Analysis Summary</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Confidence Level</span>
                                <Badge className="bg-green-100 text-green-800">
                                  {Math.round(aiAnalysis.confidence * 100)}%
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Elements</span>
                                <span className="font-medium">{aiAnalysis.extractedElements?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Analysis Status</span>
                                <Badge variant="outline">{aiAnalysis.status}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Last Updated</span>
                                <span className="text-sm">{new Date(aiAnalysis.updatedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </Card>
                          
                          <Button 
                            className="w-full"
                            onClick={() => {
                              toast({
                                title: "MTO Export",
                                description: "Exporting Material Take-Off to estimation..."
                              });
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export to Estimation
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Drawing Selected</h3>
              <p className="text-muted-foreground">
                Select a drawing from the list to view and analyze
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Drawing</DialogTitle>
            <DialogDescription>
              Upload construction drawings for AI analysis. Supported formats: PDF, DXF, DWG, IFC
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.dxf,.dwg,.ifc"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>

            {uploadFile && (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{uploadFile.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(uploadFile.size)}
                  </span>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!uploadFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}