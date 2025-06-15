import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Edit3, 
  Users, 
  Calculator,
  Construction,
  Clipboard,
  Camera,
  Wrench,
  Shield,
  FileText,
  ArrowRight,
  ArrowLeft,
  Eye,
  Download,
  Send
} from 'lucide-react';

interface ProjectData {
  id?: number;
  projectNumber: string;
  clientName: string;
  projectDescription: string;
  currentPhase: 'initial_simulation' | 'professional_estimate' | 'job_creation';
  phaseStatus: 'in_progress' | 'pending_review' | 'approved' | 'rejected';
  initialSimulationData?: any;
  professionalEstimateData?: any;
  jobCreationData?: any;
  engineerApprovalRequired?: boolean;
  riskAssessmentData?: any;
  qualityChecklistData?: any;
}

interface DrawingBatch {
  id?: number;
  batchName: string;
  drawingType: string;
  analysisStatus: string;
  totalDrawings: number;
  processedDrawings: number;
  overallConfidence?: number;
  files: File[];
}

export default function ProjectEstimation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentProject, setCurrentProject] = useState<ProjectData>({
    projectNumber: '',
    clientName: '',
    projectDescription: '',
    currentPhase: 'initial_simulation',
    phaseStatus: 'in_progress'
  });
  
  const [drawingBatches, setDrawingBatches] = useState<DrawingBatch[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  // Three-Phase Workflow Progress
  const getPhaseProgress = () => {
    switch (currentProject.currentPhase) {
      case 'initial_simulation': return 33;
      case 'professional_estimate': return 66;
      case 'job_creation': return 100;
      default: return 0;
    }
  };

  // Multi-Drawing Batch Upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type === 'application/pdf' || 
      file.name.toLowerCase().endsWith('.dwg') || 
      file.name.toLowerCase().endsWith('.dxf')
    );
    
    if (validFiles.length !== fileArray.length) {
      toast({
        title: "File Format Warning",
        description: "Only PDF, DWG, and DXF files are supported",
        variant: "destructive"
      });
    }
    
    setSelectedFiles(validFiles);
  };

  // Create Drawing Batch for Analysis
  const createDrawingBatch = useMutation({
    mutationFn: async (batchData: Partial<DrawingBatch>) => {
      const formData = new FormData();
      formData.append('batchName', batchData.batchName || '');
      formData.append('drawingType', batchData.drawingType || '');
      formData.append('projectId', currentProject.id?.toString() || '');
      
      selectedFiles.forEach((file, index) => {
        formData.append(`drawings`, file);
      });
      
      return apiRequest('/api/drawing-batches', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: () => {
      toast({
        title: "Drawings Uploaded",
        description: "AI analysis has started on your drawings",
      });
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/drawing-batches'] });
    }
  });

  // Phase Advancement
  const advancePhase = useMutation({
    mutationFn: async (phaseData: any) => {
      return apiRequest(`/api/projects/${currentProject.id}/advance-phase`, {
        method: 'POST',
        body: JSON.stringify(phaseData)
      });
    },
    onSuccess: (data) => {
      setCurrentProject(prev => ({ ...prev, ...data }));
      toast({
        title: "Phase Advanced",
        description: `Moved to ${data.currentPhase.replace('_', ' ')} phase`,
      });
    }
  });

  // Risk Assessment Matrix
  const riskCategories = [
    { name: 'Material Availability', weight: 0.3 },
    { name: 'Technical Complexity', weight: 0.25 },
    { name: 'Timeline Constraints', weight: 0.2 },
    { name: 'Resource Availability', weight: 0.15 },
    { name: 'Weather Dependencies', weight: 0.1 }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Steel Fabrication Project Estimation</CardTitle>
              <CardDescription>
                Three-Phase AI-Assisted Estimation Workflow
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2">
                Phase {getPhaseProgress() / 33}: {currentProject.currentPhase.replace('_', ' ').toUpperCase()}
              </Badge>
              <Progress value={getPhaseProgress()} className="w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="projectNumber">Project Number</Label>
              <Input
                id="projectNumber"
                value={currentProject.projectNumber}
                onChange={(e) => setCurrentProject(prev => ({ ...prev, projectNumber: e.target.value }))}
                placeholder="PROJ-2025-001"
              />
            </div>
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={currentProject.clientName}
                onChange={(e) => setCurrentProject(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="Client Company Ltd"
              />
            </div>
            <div>
              <Label htmlFor="projectDescription">Project Description</Label>
              <Textarea
                id="projectDescription"
                value={currentProject.projectDescription}
                onChange={(e) => setCurrentProject(prev => ({ ...prev, projectDescription: e.target.value }))}
                placeholder="Brief project description..."
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three-Phase Workflow Tabs */}
      <Tabs value={currentProject.currentPhase} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="initial_simulation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Initial Simulation
          </TabsTrigger>
          <TabsTrigger value="professional_estimate" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Professional Estimate
          </TabsTrigger>
          <TabsTrigger value="job_creation" className="flex items-center gap-2">
            <Construction className="h-4 w-4" />
            Job Creation
          </TabsTrigger>
        </TabsList>

        {/* Phase 1: Initial Simulation */}
        <TabsContent value="initial_simulation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Multi-Drawing Batch Processing
              </CardTitle>
              <CardDescription>
                Upload multiple PDF, DWG, or DXF drawings for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.dwg,.dxf"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="drawing-upload"
                />
                <label htmlFor="drawing-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Upload Construction Drawings</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports: Structural plans, elevations, sections, shop drawings, detailer drawings, workshop cutlists
                  </p>
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                  <div className="grid gap-2 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="batchName">Batch Name</Label>
                      <Input id="batchName" placeholder="e.g., Main Structure Drawings" />
                    </div>
                    <div>
                      <Label htmlFor="drawingType">Drawing Type</Label>
                      <select className="w-full p-2 border rounded">
                        <option value="structural_plan">Structural Plan</option>
                        <option value="elevation">Elevation</option>
                        <option value="section">Section</option>
                        <option value="shop_drawing">Shop Drawing</option>
                        <option value="detailer_drawing">Detailer Drawing</option>
                        <option value="workshop_cutlist">Workshop Cutlist</option>
                      </select>
                    </div>
                  </div>
                  <Button 
                    onClick={() => createDrawingBatch.mutate({ 
                      batchName: 'Drawing Batch', 
                      drawingType: 'structural_plan' 
                    })}
                    disabled={createDrawingBatch.isPending}
                    className="w-full"
                  >
                    {createDrawingBatch.isPending ? 'Processing...' : 'Start AI Analysis'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Drawing Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    AI analysis will identify steel elements, extract part marks, and calculate material quantities.
                    Results include interactive PDF highlighting and quality assessment.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Elements Detected</span>
                      <Badge variant="secondary">42 items</Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Universal beams (18), Columns (12), Purlins (8), Connections (4)
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">AI Confidence</span>
                      <Badge variant="default">87%</Badge>
                    </div>
                    <Progress value={87} className="w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive PDF Features Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Interactive PDF Highlighting
              </CardTitle>
              <CardDescription>
                Click on drawing elements to see cost breakdowns and add/remove items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 bg-gray-50 dark:bg-gray-800 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">PDF Viewer with AI Markup</p>
                <p className="text-sm text-gray-500 mb-4">
                  Interactive highlighting shows detected elements with cost data
                </p>
                <Button variant="outline" className="mr-2">
                  <Eye className="h-4 w-4 mr-2" />
                  View Drawing
                </Button>
                <Button variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Markup
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Phase 1 Actions */}
          <div className="flex justify-between">
            <Button variant="outline" disabled>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Phase
            </Button>
            <Button 
              onClick={() => advancePhase.mutate({ targetPhase: 'professional_estimate' })}
              disabled={!currentProject.projectNumber || advancePhase.isPending}
            >
              Advance to Professional Estimate
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* Phase 2: Professional Estimate */}
        <TabsContent value="professional_estimate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Professional Review & Refinement
              </CardTitle>
              <CardDescription>
                Detailed review and refinement of AI analysis with user adaptations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All AI analysis results are fully editable. Add missing items, remove incorrect detections, 
                  and adjust quantities as needed.
                </AlertDescription>
              </Alert>
              
              {/* Material Optimization Suggestions */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Material Optimization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">Cost Saving Opportunity</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Replace 310UB40.4 with 310UB32.0 for non-critical members
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Potential saving: $2,450 (Engineer approval required)
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">Standard Length Optimization</span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Adjust cut lengths to utilize standard 12m lengths efficiently
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Waste reduction: 15% improvement
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* AS/NZS Compliance Checker */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">AS/NZS Compliance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm">AS/NZS 3679.1-300</span>
                      <Badge variant="default">✓ Compliant</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm">AS/NZS 1163</span>
                      <Badge variant="default">✓ Compliant</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span className="text-sm">Connection Details</span>
                      <Badge variant="outline">Review Required</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Engineer Approval Section */}
              {currentProject.engineerApprovalRequired && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                      <Shield className="h-5 w-5" />
                      Engineer Approval Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                      Material optimization suggestions require structural engineer review and approval.
                    </p>
                    <Button variant="outline" className="border-orange-300">
                      <Send className="h-4 w-4 mr-2" />
                      Send for Engineer Review
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Drawing Comparison Intelligence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Drawing Revision Comparison
              </CardTitle>
              <CardDescription>
                Compare revisions and highlight changes between drawing versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Original Drawing v1.0</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    42 elements detected
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Revision Drawing v1.1</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    45 elements detected (+3 new)
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Added: </span>
                  <span className="text-sm text-green-700 dark:text-green-300">3 additional bracing members (B15, B16, B17)</span>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200">
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Modified: </span>
                  <span className="text-sm text-orange-700 dark:text-orange-300">Column C3 length changed from 4.2m to 4.5m</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase 2 Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => advancePhase.mutate({ targetPhase: 'initial_simulation' })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Simulation
            </Button>
            <Button 
              onClick={() => advancePhase.mutate({ targetPhase: 'job_creation' })}
              disabled={advancePhase.isPending}
            >
              Advance to Job Creation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* Phase 3: Job Creation */}
        <TabsContent value="job_creation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Final Job Creation & Approval
              </CardTitle>
              <CardDescription>
                Complete estimation with final approval and job setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Risk Assessment Matrix */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Assessment Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {riskCategories.map((risk, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{risk.name}</span>
                        <span className="font-medium">Weight: {(risk.weight * 100).toFixed(0)}%</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Button
                            key={level}
                            variant={level <= 2 ? "default" : "outline"}
                            size="sm"
                            className="h-8"
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Overall Risk Score:</span>
                      <Badge variant="secondary">Medium (2.3/5)</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Control Checklist */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clipboard className="h-5 w-5" />
                    Quality Control Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    'Material specifications verified against AS/NZS standards',
                    'Quantities cross-checked with drawing take-off',
                    'Connection details reviewed and WPS requirements identified',
                    'Surface area calculations completed for coating requirements',
                    'Crane lift planning and H&S requirements assessed',
                    'Client requirements and special conditions noted'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked={index < 4} />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Final Cost Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Final Cost Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Materials</span>
                      <span className="font-medium">$45,260</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor</span>
                      <span className="font-medium">$28,400</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Equipment</span>
                      <span className="font-medium">$8,750</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consumables</span>
                      <span className="font-medium">$3,420</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overhead (12%)</span>
                      <span className="font-medium">$10,220</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Project Value</span>
                      <span>$96,050</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Phase 3 Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => advancePhase.mutate({ targetPhase: 'professional_estimate' })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Professional Estimate
            </Button>
            <div className="space-x-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Generate Quote
              </Button>
              <Button>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile Site Inspection Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Mobile Site Inspection Integration
          </CardTitle>
          <CardDescription>
            Field verification with photo documentation and drawing markup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h4 className="font-medium">Photo Documentation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Capture site conditions with GPS tagging
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Edit3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h4 className="font-medium">Drawing Markup</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add measurements and notes directly on drawings
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h4 className="font-medium">Real-time Collaboration</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Sync updates with office team instantly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}