/**
 * Drawing Analysis Page - Fortune 50 Level Drawing Processing Interface
 * Upload and analyze construction drawings for steel fabrication MTO
 */

import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileUp, FileText, CheckCircle, XCircle, AlertTriangle,
  Download, RefreshCw, Brain, Layers, Grid3x3, Package,
  Activity, TrendingUp, Clock, Eye, MessageSquare, Star,
  ChevronRight, Upload, FileSearch, Settings
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';

// Interfaces
interface DrawingMetadata {
  format: string;
  fileName: string;
  fileSize: number;
  pageCount?: number;
  scale?: string;
  units: string;
}

interface ParsedElement {
  id: string;
  designation: string;
  type: string;
  material: string;
  dimensions: any;
  quantity: number;
  location?: string;
  confidence: number;
  children: ParsedElement[];
}

interface ParseResult {
  success: boolean;
  telemetryId: number;
  metadata: DrawingMetadata;
  elements: ParsedElement[];
  totalWeight?: number;
  totalCost?: number;
  processingTimeMs: number;
  confidence: number;
}

export default function DrawingAnalysis() {
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedElement, setSelectedElement] = useState<ParsedElement | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('1'); // TODO: Get from project selector

  // Get supported formats
  const { data: supportedFormats } = useQuery({
    queryKey: ['/api/drawings/supported-formats']
  });

  // Parse drawing mutation
  const parseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/drawings/parse', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      setParseResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/ai/metrics'] });
    }
  });

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ telemetryId, feedback }: any) => {
      const response = await fetch(`/api/drawings/run/${telemetryId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      setFeedbackRating(0);
      setFeedbackComments('');
    }
  });

  // File drop zone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/vnd.dxf': ['.dxf'],
      'application/acad': ['.dwg'],
      'application/ifc': ['.ifc']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  // Handle file upload and parsing
  const handleParse = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('drawing', selectedFile);
    formData.append('projectId', '1'); // TODO: Get actual project ID
    formData.append('organizationKey', 'default');

    parseMutation.mutate(formData);
  };

  // Render element hierarchy
  const renderElementTree = (element: ParsedElement, level: number = 0) => (
    <div key={element.id} style={{ marginLeft: `${level * 20}px` }}>
      <div
        className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
          selectedElement?.id === element.id ? 'bg-muted border-primary' : ''
        }`}
        onClick={() => setSelectedElement(element)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{element.designation}</Badge>
              <span className="font-medium">{element.material}</span>
              <Badge 
                variant={element.confidence > 0.8 ? 'default' : 'secondary'}
                className="text-xs"
              >
                {(element.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Qty: {element.quantity} | 
              {element.dimensions?.length && ` L: ${element.dimensions.length}mm`}
              {element.location && ` | Grid: ${element.location}`}
            </div>
          </div>
          {element.children.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {element.children.length} items
            </Badge>
          )}
        </div>
      </div>
      {element.children.map(child => renderElementTree(child, level + 1))}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSearch className="h-8 w-8 text-blue-500" />
            Drawing Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered construction drawing parser with 15-20% accuracy improvement
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => setLocation('/ai-control-center')}
        >
          <Brain className="h-4 w-4 mr-2" />
          AI Control Center
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Drawing</CardTitle>
              <CardDescription>
                Support for PDF, DXF, DWG, IFC formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p>Drop the drawing here...</p>
                ) : selectedFile ? (
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p>Drag & drop a drawing here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to select
                    </p>
                  </div>
                )}
              </div>

              <Button 
                className="w-full" 
                disabled={!selectedFile || parseMutation.isPending}
                onClick={handleParse}
              >
                {parseMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Drawing
                  </>
                )}
              </Button>

              {/* Supported Formats */}
              {supportedFormats && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Supported Formats:</p>
                  {supportedFormats.formats.map((format: any) => (
                    <div key={format.extension} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {format.extension.toUpperCase()}
                      </span>
                      {format.supported ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata Display */}
          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle>Drawing Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{parseResult.metadata.format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Units:</span>
                  <span className="font-medium">{parseResult.metadata.units}</span>
                </div>
                {parseResult.metadata.pageCount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pages:</span>
                    <span className="font-medium">{parseResult.metadata.pageCount}</span>
                  </div>
                )}
                {parseResult.metadata.scale && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scale:</span>
                    <span className="font-medium">{parseResult.metadata.scale}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing:</span>
                  <span className="font-medium">{parseResult.processingTimeMs}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="font-medium">{(parseResult.confidence * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2">
          {parseResult ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Analysis Results</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {parseResult.elements.length} Elements
                    </Badge>
                    {parseResult.totalWeight && (
                      <Badge variant="secondary">
                        {parseResult.totalWeight.toFixed(2)} kg
                      </Badge>
                    )}
                    {parseResult.totalCost && (
                      <Badge>
                        ${parseResult.totalCost.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="hierarchy" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="hierarchy">
                      <Layers className="h-4 w-4 mr-2" />
                      Hierarchy
                    </TabsTrigger>
                    <TabsTrigger value="details">
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="feedback">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Feedback
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="hierarchy" className="space-y-4">
                    <ScrollArea className="h-[600px] pr-4">
                      {parseResult.elements.map(element => renderElementTree(element))}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    {selectedElement ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>{selectedElement.designation}</CardTitle>
                          <CardDescription>{selectedElement.type}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Material</p>
                              <p className="font-medium">{selectedElement.material}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Quantity</p>
                              <p className="font-medium">{selectedElement.quantity}</p>
                            </div>
                            {selectedElement.location && (
                              <div>
                                <p className="text-sm text-muted-foreground">Location</p>
                                <p className="font-medium">{selectedElement.location}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-muted-foreground">Confidence</p>
                              <div className="flex items-center gap-2">
                                <Progress value={selectedElement.confidence * 100} className="flex-1" />
                                <span className="text-sm font-medium">
                                  {(selectedElement.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedElement.dimensions && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Dimensions</p>
                              <div className="grid grid-cols-3 gap-2">
                                {Object.entries(selectedElement.dimensions).map(([key, value]) => (
                                  <div key={key} className="bg-muted rounded p-2">
                                    <p className="text-xs text-muted-foreground">{key}</p>
                                    <p className="font-medium">{value as any}mm</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          Select an element from the hierarchy to view details
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="feedback" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Provide Feedback</CardTitle>
                        <CardDescription>
                          Help improve accuracy by rating this analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Rating</p>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Button
                                key={star}
                                variant={feedbackRating >= star ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFeedbackRating(star)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Comments</p>
                          <textarea
                            className="w-full p-2 border rounded-lg"
                            rows={4}
                            placeholder="Any specific corrections or suggestions?"
                            value={feedbackComments}
                            onChange={(e) => setFeedbackComments(e.target.value)}
                          />
                        </div>

                        <Button
                          className="w-full"
                          disabled={feedbackRating === 0 || feedbackMutation.isPending}
                          onClick={() => {
                            feedbackMutation.mutate({
                              telemetryId: parseResult.telemetryId,
                              feedback: {
                                rating: feedbackRating,
                                comments: feedbackComments,
                                corrections: []
                              }
                            });
                          }}
                        >
                          {feedbackMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Submit Feedback
                            </>
                          )}
                        </Button>

                        {feedbackMutation.isSuccess && (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Thank you! Your feedback helps improve accuracy.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[700px] flex items-center justify-center">
              <CardContent className="text-center">
                <FileUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Drawing Analyzed Yet</h3>
                <p className="text-muted-foreground">
                  Upload a construction drawing to begin AI-powered analysis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}