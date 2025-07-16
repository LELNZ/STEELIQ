import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { 
  Workflow, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Package,
  FileText,
  User,
  Building,
  Upload,
  Paperclip,
  MessageSquare,
  Edit,
  Calendar,
  Settings,
  Eye,
  Download,
  Plus,
  Trash2,
  Shield,
  Users,
  FileCheck,
  Milestone,
  Lock,
  Zap
} from "lucide-react";

interface LifecyclePhase {
  id: number;
  phaseName: string;
  phaseCode: string;
  status: string;
  progress: number;
  tasks: LifecycleTask[];
}

interface LifecycleTask {
  id: number;
  taskName: string;
  taskCode: string;
  status: string;
  responsibleParty: string;
  approvalRequired?: boolean;
  requiredDocuments?: string[];
  automationTrigger?: string;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  documents?: TaskDocument[];
}

interface TaskDocument {
  id: number;
  filename: string;
  uploadedAt: Date;
  uploadedBy: string;
  fileSize: number;
  fileType: string;
}

interface LifecycleEvent {
  id: number;
  eventType: string;
  description: string;
  createdAt: Date;
  userId: number;
  userName: string;
  metadata?: any;
}

export default function ProjectLifecycleTracker() {
  const { projectId } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const projectIdNum = projectId ? parseInt(projectId) : undefined;
  
  // State management
  const [selectedTask, setSelectedTask] = useState<LifecycleTask | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [activeView, setActiveView] = useState<'kanban' | 'timeline' | 'list'>('kanban');
  const [stakeholderView, setStakeholderView] = useState<'all' | 'client' | 'engineer' | 'subcontractor'>('all');
  const [taskNotes, setTaskNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch lifecycle data
  const { data: lifecycle, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectIdNum}/lifecycle`],
    enabled: !!projectIdNum,
  });
  
  // Fetch project events
  const { data: events = [] } = useQuery<LifecycleEvent[]>({
    queryKey: [`/api/projects/${projectIdNum}/lifecycle/events`],
    enabled: !!projectIdNum,
  });

  // Initialize lifecycle mutation
  const initializeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectIdNum}/lifecycle/initialize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdNum}/lifecycle`] });
      toast({ 
        title: "Success", 
        description: "Project lifecycle initialized successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to initialize lifecycle",
        variant: "destructive"
      });
    }
  });
  
  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: number; status: string; notes?: string }) => {
      return await apiRequest("PATCH", `/api/projects/${projectIdNum}/lifecycle/tasks/${taskId}`, { 
        status, 
        notes,
        completedAt: status === 'completed' ? new Date() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdNum}/lifecycle`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdNum}/lifecycle/events`] });
      toast({ title: "Task updated successfully" });
      setShowTaskDialog(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update task",
        variant: "destructive"
      });
    }
  });
  
  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: number; file: File }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('taskId', taskId.toString());
      
      const response = await fetch(`/api/projects/${projectIdNum}/lifecycle/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdNum}/lifecycle`] });
      toast({ title: "Document uploaded successfully" });
      setShowDocumentDialog(false);
      setUploadFile(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    }
  });

  if (!projectIdNum) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Invalid project ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading project lifecycle...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lifecycle || lifecycle.phases?.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Lifecycle Tracking</h3>
            <p className="text-muted-foreground mb-4">This project doesn't have lifecycle tracking initialized yet.</p>
            <Button 
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
            >
              {initializeMutation.isPending ? "Initializing..." : "Initialize Lifecycle Tracking"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Project Lifecycle Tracker</h1>
            <p className="text-muted-foreground mt-1">Fortune 500 standard process tracking with STRUMIS integration</p>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => navigate('/settings/lifecycle-templates')}>
                  <Settings className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage lifecycle templates</p>
              </TooltipContent>
            </Tooltip>
            <Button variant="outline" onClick={() => navigate(`/estimation`)}>
              Back to Estimation
            </Button>
          </div>
        </div>
        
        {/* Stakeholder View Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Stakeholder View</CardTitle>
              <Select value={stakeholderView} onValueChange={(value: any) => setStakeholderView(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      All (Internal)
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Client View
                    </div>
                  </SelectItem>
                  <SelectItem value="engineer">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Engineer/Detailer
                    </div>
                  </SelectItem>
                  <SelectItem value="subcontractor">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Subcontractor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Project Completion</span>
                <span className="font-semibold">{lifecycle.overallProgress || 0}%</span>
              </div>
              <Progress value={lifecycle.overallProgress || 0} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* View Tabs */}
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-4">
            {/* Phase Cards */}
            <div className="grid gap-4">
              {lifecycle.phases?.map((phase: LifecyclePhase) => (
                <Card key={phase.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {phase.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : phase.status === 'active' ? (
                          <Clock className="h-5 w-5 text-blue-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <CardTitle className="text-lg">{phase.phaseName}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={phase.status === 'completed' ? 'success' : phase.status === 'active' ? 'default' : 'secondary'}>
                          {phase.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{phase.progress || 0}% Complete</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={phase.progress || 0} className="mb-4" />
                    
                    {/* Tasks */}
                    <div className="space-y-2">
                      {phase.tasks?.filter(task => {
                        // Filter tasks based on stakeholder view
                        if (stakeholderView === 'all') return true;
                        if (stakeholderView === 'client' && ['Client', 'LEL'].includes(task.responsibleParty)) return true;
                        if (stakeholderView === 'engineer' && task.responsibleParty === 'Engineer') return true;
                        if (stakeholderView === 'subcontractor' && task.responsibleParty === 'Subcontractor') return true;
                        return false;
                      }).map((task: LifecycleTask) => (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer bg-white"
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskNotes(task.notes || '');
                            setShowTaskDialog(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                                updateTaskMutation.mutate({ taskId: task.id, status: newStatus });
                              }}
                              className="hover:scale-110 transition-transform"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-blue-500" />
                              )}
                            </button>
                            <div>
                              <span className={task.status === 'completed' ? 'line-through text-gray-500' : 'font-medium'}>
                                {task.taskName}
                              </span>
                              {task.approvalRequired && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Approval Required
                                </Badge>
                              )}
                              {task.notes && (
                                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  Notes available
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {task.documents && task.documents.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {task.documents.length}
                              </Badge>
                            )}
                            {task.automationTrigger && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs">
                                    <Zap className="h-3 w-3" />
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Automated: {task.automationTrigger}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {task.responsibleParty === 'LEL' && <User className="h-4 w-4" />}
                              {task.responsibleParty === 'Client' && <Building className="h-4 w-4" />}
                              {task.responsibleParty === 'Engineer' && <FileText className="h-4 w-4" />}
                              {task.responsibleParty === 'Subcontractor' && <Package className="h-4 w-4" />}
                              <span>{task.responsibleParty}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {events.slice(0, 10).map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        {index < events.length - 1 && (
                          <div className="w-0.5 h-16 bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                        <p className="font-medium mt-1">{event.description}</p>
                        <p className="text-sm text-muted-foreground">by {event.userName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4">Task</th>
                      <th className="text-left p-4">Phase</th>
                      <th className="text-left p-4">Responsible</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Documents</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycle.phases?.flatMap((phase: LifecyclePhase) =>
                      phase.tasks?.map((task: LifecycleTask) => (
                        <tr key={task.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {task.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                              )}
                              <span className={task.status === 'completed' ? 'line-through text-gray-500' : ''}>
                                {task.taskName}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">{phase.phaseName}</td>
                          <td className="p-4">{task.responsibleParty}</td>
                          <td className="p-4">
                            <Badge variant={task.status === 'completed' ? 'success' : 'secondary'}>
                              {task.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {task.documents?.length || 0} files
                          </td>
                          <td className="p-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTask(task);
                                setTaskNotes(task.notes || '');
                                setShowTaskDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task Edit Dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTask?.taskName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={selectedTask?.status || 'pending'} 
                  onValueChange={(value) => {
                    if (selectedTask) {
                      updateTaskMutation.mutate({ 
                        taskId: selectedTask.id, 
                        status: value,
                        notes: taskNotes 
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Add notes about this task..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Documents</Label>
                <div className="space-y-2">
                  {selectedTask?.documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{doc.filename}</span>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDocumentDialog(true)}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </div>

              {selectedTask?.requiredDocuments && selectedTask.requiredDocuments.length > 0 && (
                <div>
                  <Label>Required Documents</Label>
                  <div className="space-y-1">
                    {selectedTask.requiredDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileCheck className="h-4 w-4" />
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (selectedTask) {
                    updateTaskMutation.mutate({ 
                      taskId: selectedTask.id, 
                      status: selectedTask.status,
                      notes: taskNotes 
                    });
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Upload Dialog */}
        <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select File</Label>
                <Input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (uploadFile && selectedTask) {
                    uploadDocumentMutation.mutate({ 
                      taskId: selectedTask.id, 
                      file: uploadFile 
                    });
                  }
                }}
                disabled={!uploadFile}
              >
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}