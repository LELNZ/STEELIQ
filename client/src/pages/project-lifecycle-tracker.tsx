import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Building
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
}

export default function ProjectLifecycleTracker() {
  const { projectId } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const projectIdNum = projectId ? parseInt(projectId) : undefined;

  // Fetch lifecycle data
  const { data: lifecycle, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectIdNum}/lifecycle`],
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Lifecycle Tracker</h1>
          <p className="text-muted-foreground mt-1">Track and manage your project from quote to completion</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/estimation`)}>
          Back to Estimation
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
              <span className="font-semibold">{lifecycle.overallProgress || 0}%</span>
            </div>
            <Progress value={lifecycle.overallProgress || 0} className="h-3" />
          </div>
        </CardContent>
      </Card>

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
                <div className="text-sm text-muted-foreground">
                  {phase.progress || 0}% Complete
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={phase.progress || 0} className="mb-4" />
              
              {/* Tasks */}
              <div className="space-y-2">
                {phase.tasks?.map((task: LifecycleTask) => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {task.responsibleParty === 'LEL' && <User className="h-4 w-4" />}
                      {task.responsibleParty === 'Client' && <Building className="h-4 w-4" />}
                      {task.responsibleParty === 'Engineer' && <FileText className="h-4 w-4" />}
                      {task.responsibleParty === 'Subcontractor' && <Package className="h-4 w-4" />}
                      <span>{task.responsibleParty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}