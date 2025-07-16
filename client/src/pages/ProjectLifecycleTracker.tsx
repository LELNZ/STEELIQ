import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Workflow,
  Calendar,
  Users,
  FileText,
  Activity,
  Eye,
  Edit,
  UserCheck,
  Building2,
  HardHat,
  Package,
  Truck,
  Shield,
  DollarSign
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Phase {
  id: number;
  phaseCode: string;
  phaseName: string;
  phaseCategory: string;
  sequenceOrder: number;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'skipped';
  plannedStart?: string;
  actualStart?: string;
  plannedEnd?: string;
  actualEnd?: string;
  blockingReason?: string;
  progress: number;
  tasks: Task[];
}

interface Task {
  id: number;
  taskCode: string;
  taskName: string;
  taskDescription?: string;
  responsibleParty: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  dueDate?: string;
  completedDate?: string;
  approvalRequired: boolean;
  requiredDocuments: string[];
  attachedDocuments: any[];
  notes?: string;
}

interface ProjectLifecycle {
  phases: Phase[];
  overallProgress: number;
  currentPhase?: Phase;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-500', icon: Circle },
  active: { label: 'Active', color: 'bg-blue-500', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle2 },
  blocked: { label: 'Blocked', color: 'bg-red-500', icon: AlertCircle },
  skipped: { label: 'Skipped', color: 'bg-gray-400', icon: Circle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-400', icon: Circle },
};

const phaseIcons = {
  pre_fabrication: DollarSign,
  design_documentation: FileText,
  fabrication: HardHat,
  post_fabrication: Truck,
};

const responsiblePartyColors = {
  LEL: 'bg-blue-100 text-blue-800',
  Client: 'bg-purple-100 text-purple-800',
  Engineer: 'bg-green-100 text-green-800',
  Detailer: 'bg-orange-100 text-orange-800',
  Subcontractor: 'bg-pink-100 text-pink-800',
};

export default function ProjectLifecycleTracker() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/projects/:projectId/lifecycle");
  const projectId = params?.projectId ? parseInt(params.projectId) : null;
  
  const [selectedView, setSelectedView] = useState<'kanban' | 'timeline' | 'list'>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Fetch project lifecycle
  const { data: lifecycle, isLoading } = useQuery<ProjectLifecycle>({
    queryKey: [`/api/projects/${projectId}/lifecycle`],
    enabled: !!projectId,
  });

  // Fetch project events
  const { data: events } = useQuery({
    queryKey: [`/api/projects/${projectId}/events`],
    enabled: !!projectId,
  });

  // Initialize lifecycle if not exists
  const initializeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/projects/${projectId}/lifecycle/initialize`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lifecycle`] });
      toast({ title: "Success", description: "Project lifecycle initialized" });
    },
  });

  // Update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: number; status: string; notes?: string }) => {
      return await apiRequest(`/api/lifecycle/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lifecycle`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/events`] });
      toast({ title: "Success", description: "Task status updated" });
      setIsTaskModalOpen(false);
    },
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    setIsTaskModalOpen(true);
  };

  const handleTaskUpdate = () => {
    if (selectedTask) {
      updateTaskMutation.mutate({
        taskId: selectedTask.id,
        status: taskStatus,
        notes: taskNotes,
      });
    }
  };

  if (!projectId) {
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

  if (!lifecycle || lifecycle.phases.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Lifecycle Tracking</h3>
            <p className="text-muted-foreground mb-4">This project doesn't have lifecycle tracking initialized yet.</p>
            <Button onClick={() => initializeMutation.mutate()}>
              Initialize Lifecycle Tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Lifecycle Tracker</h1>
          <p className="text-muted-foreground mt-1">Track and manage your project from quote to completion</p>
        </div>
        <Button onClick={() => navigate(`/estimation/project/${projectId}`)}>
          Back to Project
        </Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Project Completion</span>
              <span className="font-semibold">{lifecycle.overallProgress}%</span>
            </div>
            <Progress value={lifecycle.overallProgress} className="h-3" />
            {lifecycle.currentPhase && (
              <p className="text-sm text-muted-foreground mt-2">
                Current Phase: <span className="font-semibold">{lifecycle.currentPhase.phaseName}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Selector */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {lifecycle.phases.map((phase) => {
              const PhaseIcon = phaseIcons[phase.phaseCategory as keyof typeof phaseIcons] || Workflow;
              const StatusIcon = statusConfig[phase.status].icon;
              
              return (
                <Card key={phase.id} className={cn(
                  "relative overflow-hidden",
                  phase.status === 'active' && "ring-2 ring-primary"
                )}>
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    statusConfig[phase.status].color
                  )} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <PhaseIcon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{phase.phaseName}</CardTitle>
                      </div>
                      <StatusIcon className={cn(
                        "h-5 w-5",
                        phase.status === 'completed' && "text-green-500",
                        phase.status === 'active' && "text-blue-500",
                        phase.status === 'blocked' && "text-red-500",
                        phase.status === 'pending' && "text-gray-400"
                      )} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{phase.progress}%</span>
                        </div>
                        <Progress value={phase.progress} className="h-2" />
                      </div>
                      
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {phase.tasks.map((task) => {
                            const TaskStatusIcon = statusConfig[task.status].icon;
                            return (
                              <div
                                key={task.id}
                                onClick={() => handleTaskClick(task)}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer transition-colors",
                                  "hover:bg-accent",
                                  task.status === 'completed' && "bg-green-50 border-green-200"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <TaskStatusIcon className={cn(
                                    "h-4 w-4 mt-0.5",
                                    task.status === 'completed' && "text-green-500",
                                    task.status === 'in_progress' && "text-blue-500",
                                    task.status === 'blocked' && "text-red-500",
                                    task.status === 'pending' && "text-gray-400"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{task.taskName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className={cn(
                                        "text-xs",
                                        responsiblePartyColors[task.responsibleParty as keyof typeof responsiblePartyColors]
                                      )}>
                                        {task.responsibleParty}
                                      </Badge>
                                      {task.approvalRequired && (
                                        <Badge variant="outline" className="text-xs">
                                          <Shield className="h-3 w-3 mr-1" />
                                          Approval
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {lifecycle.phases.map((phase, index) => {
                  const PhaseIcon = phaseIcons[phase.phaseCategory as keyof typeof phaseIcons] || Workflow;
                  
                  return (
                    <div key={phase.id} className="relative">
                      {index < lifecycle.phases.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full",
                          phase.status === 'completed' && "bg-green-100",
                          phase.status === 'active' && "bg-blue-100",
                          phase.status === 'blocked' && "bg-red-100",
                          phase.status === 'pending' && "bg-gray-100"
                        )}>
                          <PhaseIcon className={cn(
                            "h-5 w-5",
                            phase.status === 'completed' && "text-green-600",
                            phase.status === 'active' && "text-blue-600",
                            phase.status === 'blocked' && "text-red-600",
                            phase.status === 'pending' && "text-gray-400"
                          )} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{phase.phaseName}</h3>
                            <Badge variant={phase.status === 'completed' ? 'success' : 'secondary'}>
                              {statusConfig[phase.status].label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {phase.progress}% Complete
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {phase.tasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleTaskClick(task)}
                                className={cn(
                                  "p-2 rounded border text-sm cursor-pointer transition-colors",
                                  "hover:bg-accent",
                                  task.status === 'completed' && "bg-green-50 border-green-200"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  {task.status === 'completed' ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-gray-400" />
                                  )}
                                  <span className="truncate">{task.taskName}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {phase.actualStart && (
                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Started: {format(new Date(phase.actualStart), 'MMM d, yyyy')}</span>
                              {phase.actualEnd && (
                                <span>Completed: {format(new Date(phase.actualEnd), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {lifecycle.phases.map((phase) => (
                  <div key={phase.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{phase.phaseName}</h3>
                      <div className="flex items-center gap-3">
                        <Progress value={phase.progress} className="w-24 h-2" />
                        <Badge variant={phase.status === 'completed' ? 'success' : 'secondary'}>
                          {statusConfig[phase.status].label}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {phase.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : task.status === 'in_progress' ? (
                              <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm">{task.taskName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              responsiblePartyColors[task.responsibleParty as keyof typeof responsiblePartyColors]
                            )}>
                              {task.responsibleParty}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                Due: {format(new Date(task.dueDate), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Events */}
      {events && events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {events.slice(0, 10).map((event: any, index: number) => (
                  <div key={event.event.id} className="flex items-start gap-3 text-sm">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mt-2" />
                    <div className="flex-1">
                      <p>{event.event.eventDescription}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.phaseName && <span className="font-medium">{event.phaseName}</span>}
                        {event.taskName && <span> • {event.taskName}</span>}
                        <span> • {format(new Date(event.event.createdAt), 'MMM d, h:mm a')}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Task Update Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
            <DialogDescription>
              {selectedTask?.taskName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={taskStatus} onValueChange={setTaskStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Add any notes or comments..."
                rows={3}
              />
            </div>
            
            {selectedTask && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Responsible Party:</span>{' '}
                  <Badge variant="outline" className={cn(
                    responsiblePartyColors[selectedTask.responsibleParty as keyof typeof responsiblePartyColors]
                  )}>
                    {selectedTask.responsibleParty}
                  </Badge>
                </div>
                
                {selectedTask.requiredDocuments.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Required Documents:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.requiredDocuments.map((doc, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedTask.approvalRequired && (
                  <div className="text-sm">
                    <Badge variant="outline">
                      <Shield className="h-3 w-3 mr-1" />
                      Approval Required
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTaskUpdate} disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}