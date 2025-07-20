import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  Eye, 
  Edit, 
  Copy, 
  Trash2,
  FileText,
  Calendar,
  DollarSign
} from "lucide-react";
import JobEditModal from "./job-edit-modal";
import type { Job } from "@shared/schema";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { tableStyles } from "@/lib/design-system";

interface JobTableProps {
  jobs: Job[];
  searchQuery?: string;
  statusFilter?: string;
}



export default function JobTable({ jobs, searchQuery = "", statusFilter = "all" }: JobTableProps) {
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [editJobId, setEditJobId] = useState<number | null>(null);
  const { toast } = useToast();

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest('DELETE', `/api/jobs/${jobId}`, {
        reason: 'Deleted by user'
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

  // Copy job mutation
  const copyJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest('POST', `/api/jobs/${jobId}/copy`);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Job Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[120px]">Est. Value</TableHead>
              <TableHead className="w-[100px]">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow 
                  key={job.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    handleView(job.id);
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {job.jobNumber}
                    </div>
                  </TableCell>
                  <TableCell>{job.clientName}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{job.projectName}</p>
                      {job.projectAddress && (
                        <p className="text-xs text-muted-foreground">{job.projectAddress}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge priority={job.priority} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {job.estimatedValue ? `${job.estimatedValue.toLocaleString()}` : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(job.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className={tableStyles.actionsCell}>
                    <ActionMenu
                      items={[
                        {
                          label: 'View Details',
                          icon: <Eye className="h-4 w-4" />,
                          onClick: () => handleView(job.id)
                        },
                        {
                          label: 'Edit Job',
                          icon: <Edit className="h-4 w-4" />,
                          onClick: () => setEditJobId(job.id)
                        },
                        {
                          label: 'Copy Job',
                          icon: <Copy className="h-4 w-4" />,
                          onClick: () => copyJobMutation.mutate(job.id)
                        },
                        {
                          label: 'Delete Job',
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => setDeleteJobId(job.id),
                          variant: 'destructive',
                          separator: true
                        }
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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