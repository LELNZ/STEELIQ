import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileText, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  Bot,
  Clock,
  FileCheck,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PdfAnalysisTabProps {
  projectId: number;
  onElementsExtracted: (elements: any[]) => void;
}

interface DrawingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'structural_plan' | 'elevation' | 'section' | 'shop_drawing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  confidence?: number;
  elements?: any[];
  pageCount?: number;
}

export default function PdfAnalysisTab({ projectId, onElementsExtracted }: PdfAnalysisTabProps) {
  const [uploadedFiles, setUploadedFiles] = useState<DrawingFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DrawingFile | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: DrawingFile[] = acceptedFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      file,
      name: file.name,
      size: file.size,
      type: detectDrawingType(file.name),
      status: 'pending',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast({
      title: "Files uploaded",
      description: `${acceptedFiles.length} drawing(s) ready for analysis`,
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/dwg': ['.dwg'],
      'application/dxf': ['.dxf'],
    },
    multiple: true,
  });

  const detectDrawingType = (filename: string): DrawingFile['type'] => {
    const name = filename.toLowerCase();
    if (name.includes('plan') || name.includes('layout')) return 'structural_plan';
    if (name.includes('elevation') || name.includes('elev')) return 'elevation';
    if (name.includes('section') || name.includes('sect')) return 'section';
    if (name.includes('shop') || name.includes('detail')) return 'shop_drawing';
    return 'structural_plan';
  };

  const analyzeDrawings = async () => {
    setIsAnalyzing(true);
    
    for (const file of uploadedFiles.filter(f => f.status === 'pending')) {
      try {
        // Update status to processing
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, status: 'processing', progress: 10 } : f)
        );

        // Simulate AI analysis phases
        const analysisPhases = [
          { phase: 'OCR Text Extraction', progress: 25 },
          { phase: 'Steel Element Detection', progress: 50 },
          { phase: 'Connection Analysis', progress: 75 },
          { phase: 'Dimension Extraction', progress: 90 },
          { phase: 'Quality Validation', progress: 100 },
        ];

        for (const { phase, progress } of analysisPhases) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setUploadedFiles(prev => 
            prev.map(f => f.id === file.id ? { ...f, progress } : f)
          );
        }

        // Mock analysis results
        const mockElements = generateMockElements(file.type);
        
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id ? { 
            ...f, 
            status: 'completed',
            confidence: 0.92,
            elements: mockElements,
            pageCount: Math.floor(Math.random() * 20) + 1
          } : f)
        );

        toast({
          title: "Analysis complete",
          description: `${mockElements.length} steel elements detected in ${file.name}`,
        });

      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, status: 'failed' } : f)
        );
        
        toast({
          title: "Analysis failed",
          description: `Error analyzing ${file.name}`,
          variant: "destructive",
        });
      }
    }

    // Combine all elements and pass to parent
    const allElements = uploadedFiles
      .filter(f => f.status === 'completed')
      .flatMap(f => f.elements || []);
    
    onElementsExtracted(allElements);
    setIsAnalyzing(false);
  };

  const generateMockElements = (drawingType: DrawingFile['type']) => {
    const baseElements = [
      { partMark: 'B1', type: 'beam', material: '310UB40.4', length: 6000, quantity: 2 },
      { partMark: 'B2', type: 'beam', material: '250UB25.7', length: 4500, quantity: 4 },
      { partMark: 'C1', type: 'column', material: '200UC52.2', length: 3000, quantity: 6 },
      { partMark: 'P1', type: 'purlin', material: '150PFC', length: 6000, quantity: 12 },
      { partMark: 'BR1', type: 'brace', material: '90x90x8EA', length: 2500, quantity: 8 },
    ];

    if (drawingType === 'shop_drawing') {
      return baseElements.concat([
        { partMark: 'BP1', type: 'base_plate', material: '350x350x20PLT', length: 350, quantity: 4 },
        { partMark: 'ST1', type: 'stiffener', material: '100x8PLT', length: 200, quantity: 8 },
      ]);
    }

    return baseElements;
  };

  const getStatusIcon = (status: DrawingFile['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'processing': return <Bot className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadgeVariant = (status: DrawingFile['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Drawing Upload & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop drawings here' : 'Upload Construction Drawings'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports PDF, DWG, DXF • Multi-page capability up to 100 pages
            </p>
            <Button variant="outline">
              Browse Files
            </Button>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Uploaded Drawings ({uploadedFiles.length})</h3>
                <Button 
                  onClick={analyzeDrawings}
                  disabled={isAnalyzing || uploadedFiles.every(f => f.status !== 'pending')}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Start AI Analysis'}
                </Button>
              </div>

              <div className="grid gap-3">
                {uploadedFiles.map((file) => (
                  <Card 
                    key={file.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedFile?.id === file.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(1)} MB • {file.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          <Badge variant={getStatusBadgeVariant(file.status) as any}>
                            {file.status}
                          </Badge>
                          {file.confidence && (
                            <Badge variant="outline">
                              {Math.round(file.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                      </div>

                      {file.status === 'processing' && (
                        <Progress value={file.progress} className="mt-2" />
                      )}

                      {file.status === 'completed' && file.elements && (
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{file.elements.length} elements detected</span>
                          <span>{file.pageCount} pages</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-6 px-2"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {selectedFile && selectedFile.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Analysis Results: {selectedFile.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="elements">
              <TabsList>
                <TabsTrigger value="elements">Detected Elements</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="quality">Quality Control</TabsTrigger>
              </TabsList>

              <TabsContent value="elements" className="mt-4">
                <div className="grid gap-3">
                  {selectedFile.elements?.map((element, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{element.partMark}</Badge>
                          <span className="font-medium">{element.material}</span>
                          <span className="text-sm text-gray-500">
                            {element.type} • {element.length}mm • Qty: {element.quantity}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="connections" className="mt-4">
                <div className="text-center text-gray-500 py-8">
                  Connection analysis will be displayed here
                </div>
              </TabsContent>

              <TabsContent value="quality" className="mt-4">
                <div className="text-center text-gray-500 py-8">
                  Quality control issues will be displayed here
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}