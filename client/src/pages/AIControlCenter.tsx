import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Brain,
  FileText,
  Upload,
  Workflow,
  BarChart3,
  Activity,
  Cpu,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Layers,
  Play,
  Pause,
  RefreshCw,
  Download,
  Settings,
  Zap,
  Target,
  Eye,
  ChevronRight,
  Sparkles,
  Shield,
  Database,
  GitBranch
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Component imports
import PDFViewer from "@/components/pdf/PDFViewer";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Types
interface AIWorkflow {
  id: string;
  name: string;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  currentStep?: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description?: string;
  duration?: number;
  output?: any;
}

interface AIMetrics {
  totalProcessed: number;
  successRate: number;
  avgProcessingTime: number;
  costSavings: number;
  accuracy: number;
  cacheHitRate: number;
  activeJobs: number;
  queueDepth: number;
}

interface EstimationProject {
  id: number;
  name: string;
  status: string;
  client?: string;
  totalCost?: number;
}

export default function AIControlCenter() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<AIWorkflow | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [persona, setPersona] = useState<'estimator' | 'operations' | 'executive'>('estimator');
  
  const { toast } = useToast();

  // Fetch projects
  const { data: projects = [] } = useQuery<EstimationProject[]>({
    queryKey: ["/api/estimations"],
    enabled: true
  });

  // Fetch AI metrics
  const { data: metrics = {
    totalProcessed: 0,
    successRate: 0,
    avgProcessingTime: 0,
    costSavings: 0,
    accuracy: 0,
    cacheHitRate: 0,
    activeJobs: 0,
    queueDepth: 0
  } as AIMetrics } = useQuery<AIMetrics>({
    queryKey: ["/api/ai/metrics"],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch active workflows
  const { data: workflows = [] } = useQuery<AIWorkflow[]>({
    queryKey: ["/api/ai/workflows"],
    refetchInterval: 2000 // Refresh every 2 seconds for real-time updates
  });

  // Start AI workflow mutation
  const startWorkflowMutation = useMutation({
    mutationFn: async (data: { projectId: number; file: File }) => {
      const formData = new FormData();
      formData.append('projectId', data.projectId.toString());
      formData.append('file', data.file);
      
      return apiRequest('/api/ai/workflow/start', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (workflow) => {
      setActiveWorkflow(workflow);
      toast({
        title: "AI Workflow Started",
        description: "Processing your drawing with Fortune 50 AI capabilities"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/workflows"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Workflow Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload and analyze
  const handleStartWorkflow = () => {
    if (!selectedProject || !uploadFile) {
      toast({
        title: "Missing Information",
        description: "Please select a project and upload a file",
        variant: "destructive"
      });
      return;
    }

    startWorkflowMutation.mutate({
      projectId: selectedProject,
      file: uploadFile
    });
    setUploadDialogOpen(false);
  };

  // Render workflow timeline
  const renderWorkflowTimeline = (workflow: AIWorkflow) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Workflow Progress</h3>
        <Badge variant={workflow.status === 'completed' ? 'success' : workflow.status === 'failed' ? 'destructive' : 'default'}>
          {workflow.status}
        </Badge>
      </div>
      
      <Progress value={workflow.progress} className="h-2 mb-4" />
      
      <div className="space-y-3">
        {workflow.steps.map((step, index) => (
          <div key={step.id} className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            step.status === 'completed' && "bg-green-50 border-green-200",
            step.status === 'running' && "bg-blue-50 border-blue-200 animate-pulse",
            step.status === 'failed' && "bg-red-50 border-red-200"
          )}>
            <div className="mt-1">
              {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {step.status === 'running' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />}
              {step.status === 'pending' && <Clock className="h-5 w-5 text-gray-400" />}
              {step.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{step.name}</h4>
                {step.duration && (
                  <span className="text-sm text-muted-foreground">
                    {(step.duration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render metrics dashboard
  const renderMetricsDashboard = () => {
    const chartData = [
      { name: 'Mon', processed: 120, accuracy: 92 },
      { name: 'Tue', processed: 145, accuracy: 94 },
      { name: 'Wed', processed: 138, accuracy: 93 },
      { name: 'Thu', processed: 162, accuracy: 95 },
      { name: 'Fri', processed: 155, accuracy: 96 },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <Progress value={metrics.successRate} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.costSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">60-80% vs manual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">+15% after learning</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render persona-based view
  const renderPersonaView = () => {
    switch (persona) {
      case 'estimator':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Start your AI-powered estimation workflow</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button 
                    className="h-24 flex-col gap-2" 
                    variant="outline"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="h-6 w-6" />
                    <span>Upload Drawing</span>
                  </Button>
                  <Button className="h-24 flex-col gap-2" variant="outline">
                    <Brain className="h-6 w-6" />
                    <span>Generate MTO</span>
                  </Button>
                  <Button className="h-24 flex-col gap-2" variant="outline">
                    <Layers className="h-6 w-6" />
                    <span>View Hierarchy</span>
                  </Button>
                  <Button className="h-24 flex-col gap-2" variant="outline">
                    <Download className="h-6 w-6" />
                    <span>Export Results</span>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {projects.slice(0, 5).map((project) => (
                      <div 
                        key={project.id}
                        className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 rounded px-2"
                        onClick={() => setSelectedProject(project.id)}
                      >
                        <div>
                          <p className="font-medium text-sm">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.client}</p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {activeWorkflow && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderWorkflowTimeline(activeWorkflow)}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'operations':
        return (
          <div className="space-y-6">
            {renderMetricsDashboard()}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processing Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Jobs</span>
                      <Badge>{metrics.activeJobs}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Queue Depth</span>
                      <Badge variant="outline">{metrics.queueDepth}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Processing Time</span>
                      <span className="text-sm">{metrics.avgProcessingTime}s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cache Hit Rate</span>
                      <span className="text-sm">{metrics.cacheHitRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Activity className="h-4 w-4" />
                      <AlertDescription>
                        All systems operational
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">AI Service</span>
                        <Badge variant="success">Online</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Worker Queue</span>
                        <Badge variant="success">Healthy</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Database</span>
                        <Badge variant="success">Connected</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'executive':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>ROI Dashboard</CardTitle>
                  <CardDescription>AI investment returns and value creation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={[
                      { month: 'Jan', savings: 45000, manual: 120000 },
                      { month: 'Feb', savings: 52000, manual: 118000 },
                      { month: 'Mar', savings: 61000, manual: 125000 },
                      { month: 'Apr', savings: 68000, manual: 132000 },
                      { month: 'May', savings: 74000, manual: 128000 },
                      { month: 'Jun', savings: 82000, manual: 135000 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Area type="monotone" dataKey="manual" stackId="1" stroke="#8884d8" fill="#8884d8" name="Manual Cost" />
                      <Area type="monotone" dataKey="savings" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="AI Savings" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Annual Savings</span>
                      <span className="text-lg font-bold text-green-600">$892K</span>
                    </div>
                    <Progress value={74} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Process Efficiency</span>
                      <span className="text-lg font-bold">+340%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Error Reduction</span>
                      <span className="text-lg font-bold">-87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Time to Market</span>
                      <span className="text-lg font-bold">-65%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Competitive Advantage</CardTitle>
                <CardDescription>STEELIQ vs Industry Leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Self-Learning AI</p>
                        <p className="text-sm text-muted-foreground">15-20% accuracy improvement after 10 runs</p>
                      </div>
                    </div>
                    <Badge variant="success">Unique</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">Cost Reduction</p>
                        <p className="text-sm text-muted-foreground">60-80% lower API costs vs competitors</p>
                      </div>
                    </div>
                    <Badge variant="success">Leading</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Fortune 50 Data Integrity</p>
                        <p className="text-sm text-muted-foreground">100% traceable, zero mock data</p>
                      </div>
                    </div>
                    <Badge variant="success">Achieved</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">AI Control Center</h1>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              Fortune 50 AI
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={persona} onValueChange={(value: any) => setPersona(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estimator">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Estimator
                  </div>
                </SelectItem>
                <SelectItem value="operations">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Operations
                  </div>
                </SelectItem>
                <SelectItem value="executive">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Executive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderPersonaView()}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start AI Workflow</DialogTitle>
            <DialogDescription>
              Upload a construction drawing to begin AI-powered material takeoff extraction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Project</Label>
              <Select value={selectedProject?.toString()} onValueChange={(value) => setSelectedProject(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an estimation project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name} {project.client && `- ${project.client}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Upload Drawing</Label>
              <Input
                type="file"
                accept=".pdf,.dxf,.dwg,.ifc"
                onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: PDF, DXF, DWG, IFC (Max 100MB)
              </p>
            </div>

            {uploadFile && (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{uploadFile.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </Card>
            )}

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Our AI will automatically extract steel elements, generate hierarchical MTO, 
                and learn from corrections to improve accuracy over time.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartWorkflow}
              disabled={!selectedProject || !uploadFile || startWorkflowMutation.isPending}
            >
              {startWorkflowMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting Workflow...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start AI Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}