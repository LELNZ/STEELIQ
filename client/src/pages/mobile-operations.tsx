import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Smartphone, Clock, MapPin, Camera, CheckCircle2, AlertTriangle,
  Construction, Shield, ClipboardCheck, Package, Users, 
  WifiOff, Wifi, Upload, Download, BarChart3, Activity,
  Wrench, HardHat, FileText, Send, Navigation, Battery
} from "lucide-react";
import { format } from "date-fns";

interface FieldUpdate {
  id: number;
  jobId: number;
  jobNumber: string;
  userId: number;
  userName: string;
  updateType: 'progress' | 'material' | 'safety' | 'quality' | 'general';
  title: string;
  description: string;
  status: string;
  location: string;
  gpsLat?: number;
  gpsLng?: number;
  photos?: string[];
  createdAt: string;
}

interface QualityCheckpoint {
  id: number;
  jobId: number;
  checkpointName: string;
  status: 'pending' | 'passed' | 'failed' | 'na';
  inspectedBy?: number;
  inspectorName?: string;
  notes?: string;
  photos?: string[];
  signoffRequired: boolean;
  signedOff: boolean;
  signoffDate?: string;
}

interface SafetyReport {
  id: number;
  jobId: number;
  reportType: 'incident' | 'hazard' | 'nearmiss' | 'observation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  reportedBy: number;
  reporterName: string;
  status: 'open' | 'investigating' | 'resolved';
  correctiveActions?: string;
  photos?: string[];
  createdAt: string;
}

export default function MobileOperations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [progressValue, setProgressValue] = useState([50]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<QualityCheckpoint | null>(null);
  
  // Mock data for demonstration
  const mockFieldUpdates: FieldUpdate[] = [
    {
      id: 1,
      jobId: 6,
      jobNumber: 'JOB2025-001',
      userId: 15,
      userName: 'Field Operator',
      updateType: 'progress',
      title: 'Steel Frame Installation 50% Complete',
      description: 'Main structure beams installed, proceeding with secondary supports',
      status: 'in_progress',
      location: 'Workshop Floor A',
      gpsLat: -37.8136,
      gpsLng: 144.9631,
      createdAt: new Date().toISOString()
    }
  ];

  const mockQualityCheckpoints: QualityCheckpoint[] = [
    {
      id: 1,
      jobId: 6,
      checkpointName: 'Weld Inspection - Main Frame',
      status: 'pending',
      signoffRequired: true,
      signedOff: false
    },
    {
      id: 2,
      jobId: 6,
      checkpointName: 'Material Certification Check',
      status: 'passed',
      inspectedBy: 15,
      inspectorName: 'QC Inspector',
      signoffRequired: true,
      signedOff: true,
      signoffDate: new Date().toISOString(),
      notes: 'All certificates verified'
    }
  ];

  // Fetch active jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs?status=in_progress'],
  });

  // Fetch field updates
  const { data: fieldUpdates = mockFieldUpdates } = useQuery({
    queryKey: ['/api/field-updates', selectedJob],
    enabled: !!selectedJob,
  });

  // Fetch quality checkpoints
  const { data: qualityCheckpoints = mockQualityCheckpoints } = useQuery({
    queryKey: ['/api/quality-checkpoints', selectedJob],
    enabled: !!selectedJob,
  });

  // Fetch safety reports
  const { data: safetyReports = [] } = useQuery({
    queryKey: ['/api/safety-reports', selectedJob],
    enabled: !!selectedJob,
  });

  // Submit field update mutation
  const submitFieldUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/field-updates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-updates'] });
      toast({
        title: "Update Submitted",
        description: "Field update has been recorded.",
      });
    },
  });

  // Submit quality checkpoint
  const submitQualityCheckpointMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/quality-checkpoints/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quality-checkpoints'] });
      toast({
        title: "Checkpoint Updated",
        description: "Quality checkpoint has been recorded.",
      });
      setShowQualityDialog(false);
    },
  });

  // Submit safety report
  const submitSafetyReportMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/safety-reports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/safety-reports'] });
      toast({
        title: "Safety Report Submitted",
        description: "Safety report has been logged.",
      });
      setShowSafetyDialog(false);
    },
  });

  // Monitor online status
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mobile Operations Hub</h1>
            <p className="text-sm text-muted-foreground">Field operations, quality control, and safety management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <><Wifi className="w-4 h-4 text-green-600" /><span className="text-sm">Online</span></>
            ) : (
              <><WifiOff className="w-4 h-4 text-red-600" /><span className="text-sm">Offline Mode</span></>
            )}
          </div>
          <Badge variant="outline">
            <Battery className="w-3 h-3 mr-1" />
            Device Ready
          </Badge>
        </div>
      </div>

      {/* Job Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Active Job</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedJob?.toString()} onValueChange={(v) => setSelectedJob(parseInt(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a job to work on" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job: any) => (
                <SelectItem key={job.id} value={job.id.toString()}>
                  {job.jobNumber} - {job.clientName} ({job.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedJob && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Job Progress</TabsTrigger>
            <TabsTrigger value="quality">Quality Control</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="time">Time Clock</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Today's Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Field Updates</span>
                      <span className="font-medium">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">QC Checkpoints</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Safety Reports</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hours Logged</span>
                      <span className="font-medium">6.5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Construction className="w-4 h-4" />
                    Job Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Overall Progress</span>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Phase</span>
                      <Badge variant="secondary">Fabrication</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Due Date</span>
                      <span className="text-sm font-medium">Dec 15, 2025</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Safety Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Days Without Incident</span>
                      <span className="text-2xl font-bold text-green-600">42</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Open Hazards</span>
                      <Badge variant="outline">0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">PPE Compliance</span>
                      <Badge className="bg-green-600">100%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    className="h-auto flex-col gap-2 py-4"
                    variant="outline"
                    onClick={() => setShowProgressDialog(true)}
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-xs">Update Progress</span>
                  </Button>
                  <Button 
                    className="h-auto flex-col gap-2 py-4"
                    variant="outline"
                    onClick={() => setShowQualityDialog(true)}
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    <span className="text-xs">QC Checkpoint</span>
                  </Button>
                  <Button 
                    className="h-auto flex-col gap-2 py-4"
                    variant="outline"
                    onClick={() => setShowSafetyDialog(true)}
                  >
                    <HardHat className="w-5 h-5" />
                    <span className="text-xs">Report Safety</span>
                  </Button>
                  <Button className="h-auto flex-col gap-2 py-4" variant="outline">
                    <Camera className="w-5 h-5" />
                    <span className="text-xs">Take Photo</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Field Updates</CardTitle>
                  <Button onClick={() => setShowProgressDialog(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    New Update
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fieldUpdates.map((update: FieldUpdate) => (
                    <div key={update.id} className="border-l-4 border-primary pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={update.updateType === 'progress' ? 'default' : 'secondary'}>
                              {update.updateType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(update.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="font-medium">{update.title}</p>
                          <p className="text-sm text-muted-foreground">{update.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {update.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {update.userName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Control Checkpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qualityCheckpoints.map((checkpoint: QualityCheckpoint) => (
                    <div key={checkpoint.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{checkpoint.checkpointName}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            checkpoint.status === 'passed' ? 'default' :
                            checkpoint.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {checkpoint.status}
                          </Badge>
                          {checkpoint.signedOff && (
                            <Badge variant="outline">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Signed Off
                            </Badge>
                          )}
                        </div>
                        {checkpoint.inspectorName && (
                          <p className="text-xs text-muted-foreground">
                            Inspected by {checkpoint.inspectorName}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCheckpoint(checkpoint);
                          setShowQualityDialog(true);
                        }}
                        disabled={checkpoint.signedOff}
                      >
                        {checkpoint.signedOff ? 'Completed' : 'Inspect'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Safety Management</CardTitle>
                  <Button variant="destructive" onClick={() => setShowSafetyDialog(true)}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    All personnel must complete daily safety briefing and wear required PPE.
                    Report any hazards immediately.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Today's Safety Focus</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Working at heights - Ensure all harnesses are inspected and properly secured.
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch id="safety-briefing" />
                      <Label htmlFor="safety-briefing">I have attended the safety briefing</Label>
                    </div>
                  </div>
                  
                  {safetyReports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No safety reports for this job</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Safety reports would be displayed here */}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Time Clock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Current Status</p>
                        <p className="text-sm text-muted-foreground">Not clocked in</p>
                      </div>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700">
                      Clock In
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location Services</p>
                        <p className="text-sm text-muted-foreground">GPS tracking enabled</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      <Navigation className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Progress Update Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Progress Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Progress Percentage</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={progressValue}
                  onValueChange={setProgressValue}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium">{progressValue[0]}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress-title">Update Title</Label>
              <Input id="progress-title" placeholder="Brief description of progress" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress-details">Details</Label>
              <Textarea id="progress-details" placeholder="Detailed progress notes..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Attach Photos</Label>
              <Button variant="outline" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Take/Upload Photos
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgressDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "Progress Updated",
                description: "Job progress has been recorded.",
              });
              setShowProgressDialog(false);
            }}>Submit Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quality Checkpoint Dialog */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quality Control Inspection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{selectedCheckpoint?.checkpointName}</p>
            </div>
            <div className="space-y-2">
              <Label>Inspection Result</Label>
              <Select defaultValue="pending">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="na">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-notes">Inspection Notes</Label>
              <Textarea id="qc-notes" placeholder="Enter inspection findings..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Documentation</Label>
              <Button variant="outline" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Add Inspection Photos
              </Button>
            </div>
            {selectedCheckpoint?.signoffRequired && (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Switch id="qc-signoff" />
                <Label htmlFor="qc-signoff">I certify this inspection is complete and accurate</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQualityDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "Inspection Completed",
                description: "Quality checkpoint has been recorded.",
              });
              setShowQualityDialog(false);
            }}>Submit Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safety Report Dialog */}
      <Dialog open={showSafetyDialog} onOpenChange={setShowSafetyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Safety Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="hazard">Hazard</SelectItem>
                  <SelectItem value="nearmiss">Near Miss</SelectItem>
                  <SelectItem value="observation">Safety Observation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity Level</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="safety-title">Issue Title</Label>
              <Input id="safety-title" placeholder="Brief description of safety issue" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safety-details">Detailed Description</Label>
              <Textarea id="safety-details" placeholder="Describe the safety issue in detail..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safety-actions">Immediate Actions Taken</Label>
              <Textarea id="safety-actions" placeholder="What actions were taken to address this?" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Evidence</Label>
              <Button variant="outline" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Add Photos/Evidence
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSafetyDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              toast({
                title: "Safety Report Submitted",
                description: "Report has been sent to safety management.",
              });
              setShowSafetyDialog(false);
            }}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}