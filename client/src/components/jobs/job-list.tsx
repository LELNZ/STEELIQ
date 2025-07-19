import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import JobEditModal from "./job-edit-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  FileText, 
  ChevronRight, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  Zap,
  Eye,
  Edit,
  Trash2,
  Copy,
  MoreVertical
} from "lucide-react";
import { Job } from "@shared/schema";

interface JobListProps {
  searchQuery?: string;
  statusFilter?: string;
}

export default function JobList({ searchQuery, statusFilter }: JobListProps) {
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [editJobId, setEditJobId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job deleted",
        description: "The job has been archived successfully.",
      });
      setDeleteJobId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
      });
    },
  });

  const copyJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest(`/api/jobs/${jobId}/copy`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job copied",
        description: "A copy of the job has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to copy job",
        variant: "destructive",
      });
    },
  });

  const handleView = (jobId: number) => {
    window.location.href = `/jobs/${jobId}`;
  };

  const handleEdit = (jobId: number) => {
    setEditJobId(jobId);
  };

  const handleDelete = (jobId: number) => {
    setDeleteJobId(jobId);
  };

  const handleCopy = (jobId: number) => {
    copyJobMutation.mutate(jobId);
  };

  const getStatusBadge = (status: string, priority: string) => {
    if (priority === "rush") {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>RUSH ORDER</span>
        </Badge>
      );
    }

    switch (status) {
      case "pending":
        return <Badge className="status-pending">Pending</Badge>;
      case "in_progress":
        return <Badge className="status-in_progress">In Progress</Badge>;
      case "completed":
        return <Badge className="status-completed">Completed</Badge>;
      case "cancelled":
        return <Badge className="status-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgressColor = (status: string, priority: string) => {
    if (priority === "rush") return "bg-destructive";
    if (status === "completed") return "bg-accent";
    if (status === "in_progress") return "bg-secondary";
    return "bg-muted";
  };

  const calculateProgress = (job: Job): number => {
    if (job.status === "completed") return 100;
    if (job.status === "in_progress") return 65;
    if (job.status === "pending") return 0;
    return 0;
  };

  const getJobIcon = (priority: string) => {
    if (priority === "rush") {
      return <AlertTriangle className="text-destructive" />;
    }
    return <FileText className="text-secondary" />;
  };

  const filteredJobs = jobs?.filter(job => {
    const matchesSearch = !searchQuery || 
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.projectDescription && job.projectDescription.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = !statusFilter || 
      statusFilter === "all" || 
      job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 border border-border rounded-lg animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current Jobs</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              Sort
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredJobs && filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const progress = calculateProgress(job);
              return (
                <div
                  key={job.id}
                  className="p-6 border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                        {getJobIcon(job.priority)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{job.jobNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.projectDescription || job.clientName}
                        </p>
                        {job.isRushOrder && (
                          <Badge variant="destructive" className="mt-1 flex items-center space-x-1 w-fit">
                            <Zap className="w-3 h-3" />
                            <span>RUSH ORDER</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {job.estimatedValue ? `$${job.estimatedValue.toLocaleString()}` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">Estimated value</p>
                      </div>
                      {getStatusBadge(job.status, job.priority)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(job.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(job.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(job.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Job
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(job.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-6">
                    {job.estimatedTime && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {Math.round(job.estimatedTime / 60)} hrs
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {job.assignedTo ? `User ${job.assignedTo}` : 'Unassigned'}
                      </span>
                    </div>
                    {job.dueDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm ${
                          job.isRushOrder ? 'text-destructive font-medium' : 'text-muted-foreground'
                        }`}>
                          Due: {new Date(job.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(job.status, job.priority)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress}% complete
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No jobs found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No jobs match your current filters"
                : "Start by creating your first cutting job"
              }
            </p>
          </div>
        )}

        {filteredJobs && filteredJobs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <Button variant="ghost" className="w-full text-secondary hover:text-secondary/80">
              View All Jobs ({jobs?.length || 0})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!deleteJobId} onOpenChange={(open) => !open && setDeleteJobId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will archive the job. You can restore it from the archives if needed.
            This action cannot be undone immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteJobId && deleteJobMutation.mutate(deleteJobId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Job Edit Modal */}
    <JobEditModal 
      jobId={editJobId} 
      open={!!editJobId} 
      onOpenChange={(open) => !open && setEditJobId(null)} 
    />
    </>
  );
}
