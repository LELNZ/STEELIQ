import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Copy, 
  ArrowRight,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  FileCheck,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { tableStyles } from "@/lib/design-system";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EstimationProject {
  id: number;
  name: string;
  description?: string;
  clientId?: number;
  clientName?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'sent' | 'accepted' | 'declined';
  totalCost: string;
  margin: string;
  deliveryDate?: string;
  estimatedHours?: string;
  createdAt: string;
  updatedAt: string;
  lifecycleProgress?: number;
  currentPhase?: string;
  projectNumber?: string;
}

interface EstimationTableProps {
  estimations: EstimationProject[];
  onStatusChange: (id: number, status: string) => void;
}

export default function EstimationTable({ estimations, onStatusChange }: EstimationTableProps) {
  const [, navigate] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimationToDelete, setEstimationToDelete] = useState<EstimationProject | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteEstimationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/estimations/${id}`, {
        reason: 'Deleted by user'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimations'] });
      toast({
        title: "Estimation deleted",
        description: "The estimation has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setEstimationToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete estimation",
        variant: "destructive",
      });
    }
  });

  const handleView = (id: number) => {
    navigate(`/estimation/${id}`);
  };

  const duplicateEstimation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/estimations/${id}/duplicate`);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimations'] });
      toast({
        title: "Estimation duplicated",
        description: `Created new estimation: ${data.name}`,
      });
      // Navigate to the new estimation
      navigate(`/estimation/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate estimation",
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '-' : `$${num.toLocaleString()}`;
  };

  return (
    <>
      <div className={tableStyles.wrapper}>
        <Table>
          <TableHeader className={tableStyles.header}>
            <TableRow className={tableStyles.headerRow}>
              <TableHead className={cn(tableStyles.headerCell, "w-[150px]")}>Project #</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "min-w-[250px]")}>Name</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[180px]")}>Client</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[120px] text-center")}>Status</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[120px] text-center")}>Progress</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[120px] text-center")}>Value</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[80px] text-center")}>Margin</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[100px] text-center")}>Est. Hours</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[120px] text-center")}>Delivery</TableHead>
              <TableHead className={cn(tableStyles.headerCell, "w-[120px] text-center")}>Updated</TableHead>
              <TableHead className={cn(tableStyles.headerCell, tableStyles.actionsCell, "w-[80px]")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableStyles.body}>
          {estimations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                No estimations found
              </TableCell>
            </TableRow>
          ) : (
            estimations.map((estimation) => (
                <TableRow 
                  key={estimation.id}
                  className={cn(tableStyles.row, "cursor-pointer")}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    handleView(estimation.id);
                  }}
                >
                  <TableCell className="font-medium">
                    {estimation.projectNumber || `EST-${estimation.id.toString().padStart(4, '0')}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{estimation.name}</p>
                      {estimation.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{estimation.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{estimation.clientName || '-'}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={estimation.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    {estimation.lifecycleProgress !== undefined ? (
                      <div className="space-y-1 flex flex-col items-center">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${estimation.lifecycleProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{estimation.lifecycleProgress}%</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(estimation.totalCost)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "font-medium",
                      estimation.margin && parseFloat(estimation.margin) > 20 ? "text-green-600" : 
                      estimation.margin && parseFloat(estimation.margin) > 15 ? "text-blue-600" :
                      estimation.margin && parseFloat(estimation.margin) > 10 ? "text-orange-600" :
                      "text-red-600"
                    )}>
                      {estimation.margin ? `${estimation.margin}%` : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {estimation.estimatedHours ? (
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{estimation.estimatedHours}h</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {estimation.deliveryDate ? (
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(estimation.deliveryDate)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{formatDate(estimation.updatedAt)}</TableCell>
                  <TableCell className={tableStyles.actionsCell}>
                    <ActionMenu
                      items={[
                        {
                          label: 'View Details',
                          icon: <Eye className="h-4 w-4" />,
                          onClick: () => navigate(`/estimation/${estimation.id}?view=readonly`)
                        },
                        {
                          label: 'Edit Estimation',
                          icon: <Edit className="h-4 w-4" />,
                          onClick: () => navigate(`/estimation/${estimation.id}`)
                        },
                        {
                          label: 'Duplicate',
                          icon: <Copy className="h-4 w-4" />,
                          onClick: () => duplicateEstimation.mutate(estimation.id)
                        },
                        {
                          label: 'Delete',
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => {
                            setEstimationToDelete(estimation);
                            setDeleteDialogOpen(true);
                          },
                          variant: 'destructive'
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{estimationToDelete?.name}"? 
              This action cannot be undone and will permanently remove the estimation 
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => estimationToDelete && deleteEstimationMutation.mutate(estimationToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}