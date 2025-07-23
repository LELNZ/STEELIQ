import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText,
  Users,
  DollarSign,
  Briefcase,
  TrendingUp,
  Calendar,
  Settings,
  Activity,
  Zap,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  Copy
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  sent: { label: 'Sent to Client', color: 'bg-yellow-100 text-yellow-800', icon: ArrowRight },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const pipelineStages = [
  { key: 'draft', label: 'Draft', target: 5 },
  { key: 'in_progress', label: 'In Progress', target: 10 },
  { key: 'completed', label: 'Review', target: 3 },
  { key: 'sent', label: 'Sent', target: 8 },
  { key: 'accepted', label: 'Won', target: 0 }
];

export default function EstimationPipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch estimations
  const { data: estimations = [], isLoading } = useQuery({
    queryKey: ['/api/estimations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/estimations');
      return response as EstimationProject[];
    }
  });

  // Convert to Job mutation
  const convertToJob = useMutation({
    mutationFn: async (estimationId: number) => {
      return apiRequest('POST', '/api/estimations/convert-to-job', { estimationId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Job Created Successfully!",
        description: `Job ${data.jobNumber} has been created from this estimation. The job is now active and ready for production.`
      });
    },
    onError: (error: any) => {
      console.error('Convert to job error:', error);
      // Check if it's a duplicate job error
      if (error.message?.includes('already exists')) {
        const errorData = JSON.parse(error.message.split('400: ')[1] || '{}');
        toast({
          title: "Job Already Exists",
          description: `This estimation has already been converted to job ${errorData.jobNumber}. Each estimation can only create one job.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to convert estimation to job",
          variant: "destructive"
        });
      }
    }
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/estimations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimations'] });
      toast({
        title: "Status Updated",
        description: "Estimation status has been updated"
      });
    },
    onError: (error: any) => {
      console.error('Update status error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update estimation status",
        variant: "destructive"
      });
    }
  });

  const getEstimationsByStatus = (status: string) => {
    return estimations.filter(est => est.status === status);
  };

  const calculateMetrics = () => {
    const totalValue = estimations.reduce((sum, est) => sum + parseFloat(est.totalCost || '0'), 0);
    const acceptedValue = estimations
      .filter(est => est.status === 'accepted')
      .reduce((sum, est) => sum + parseFloat(est.totalCost || '0'), 0);
    const conversionRate = estimations.length > 0 
      ? (estimations.filter(est => est.status === 'accepted').length / estimations.length * 100).toFixed(1)
      : 0;
    const avgDaysToClose = 14; // Calculate from actual data

    return { totalValue, acceptedValue, conversionRate, avgDaysToClose };
  };

  const metrics = calculateMetrics();

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const estimationId = parseInt(e.dataTransfer.getData('estimationId'));
    const estimation = estimations.find(est => est.id === estimationId);
    
    if (estimation && estimation.status !== newStatus) {
      // Special handling for accepted status - only convert to job, don't update status separately
      if (newStatus === 'accepted' && estimation.status !== 'accepted') {
        if (confirm('Convert this estimation to an active job?')) {
          convertToJob.mutate(estimationId);
          // Don't update status here - job creation will handle it
          return;
        } else {
          // User cancelled, don't change status
          return;
        }
      }
      // For all other status changes, just update the status
      updateStatus.mutate({ id: estimationId, status: newStatus });
    }
  };

  const KanbanView = () => (
    <div className="grid grid-cols-5 gap-4 h-[calc(100vh-20rem)]">
      {pipelineStages.map(stage => {
        const isWonColumn = stage.key === 'accepted';
        const columnBgClass = isWonColumn ? 'bg-green-50' : 'bg-gray-50';
        const headerClass = isWonColumn ? 'text-green-700' : '';
        
        return (
          <div key={stage.key} className="flex flex-col h-full">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className={cn("font-semibold", headerClass)}>{stage.label}</h3>
              <Badge variant={isWonColumn ? "default" : "secondary"} className={isWonColumn ? "bg-green-600" : ""}>
                {getEstimationsByStatus(stage.key).length}
                {stage.target > 0 && `/${stage.target}`}
              </Badge>
            </div>
            <div 
              className={cn("flex-1 rounded-lg p-3 overflow-y-auto", columnBgClass)}
              onDrop={(e) => handleDrop(e, stage.key)}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="space-y-3 min-h-full">
              {getEstimationsByStatus(stage.key).map(estimation => (
                <Card 
                  key={estimation.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white w-full min-h-[140px] flex flex-col"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('estimationId', estimation.id.toString())}
                  onClick={(e) => {
                    // Prevent navigation when clicking buttons
                    if ((e.target as HTMLElement).closest('button')) return;
                    window.location.href = `/estimation/${estimation.id}`;
                  }}
                >
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-sm truncate" title={estimation.name}>
                          {estimation.name}
                        </p>
                        {estimation.projectNumber && (
                          <p className="text-xs text-muted-foreground">
                            {estimation.projectNumber}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/estimation/${estimation.id}`;
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/estimation/${estimation.id}`;
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Estimation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({ id: estimation.id, status: 'sent' });
                            }}
                            disabled={estimation.status === 'sent' || estimation.status === 'accepted'}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Send to Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 truncate" title={estimation.clientName || 'No client'}>
                      {estimation.clientName || 'No client'}
                    </p>
                    <div className="mt-auto space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">
                          ${parseFloat(estimation.totalCost || '0').toLocaleString()}
                        </span>
                        {estimation.lifecycleProgress !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {estimation.lifecycleProgress}%
                          </span>
                        )}
                      </div>
                      {estimation.lifecycleProgress !== undefined && (
                        <Progress value={estimation.lifecycleProgress || 0} className="h-1" />
                      )}
                    </div>
                    {stage.key === 'accepted' && (
                      <Button 
                        size="sm" 
                        className="w-full mt-2 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          convertToJob.mutate(estimation.id);
                        }}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Create Job
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const ListView = () => (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left p-4">Project</th>
              <th className="text-left p-4">Client</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Progress</th>
              <th className="text-left p-4">Value</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {estimations.map(estimation => {
              const config = statusConfig[estimation.status] || statusConfig.draft;
              const Icon = config.icon;
              
              return (
                <tr key={estimation.id} className="border-b hover:bg-gray-50 transition-colors cursor-pointer" onClick={(e) => {
                    // Prevent navigation when clicking buttons
                    if ((e.target as HTMLElement).closest('button')) return;
                    window.location.href = `/estimation/${estimation.id}`;
                  }}>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{estimation.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {estimation.projectNumber || `EST-${estimation.id}`}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">{estimation.clientName || '-'}</td>
                  <td className="p-4">
                    <Badge className={cn(config.color, "gap-1")}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={estimation.lifecycleProgress || 0} 
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {estimation.lifecycleProgress || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-semibold">
                    ${parseFloat(estimation.totalCost || '0').toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.location.href = `/estimation/${estimation.id}`}
                      >
                        View
                      </Button>
                      {estimation.status === 'accepted' && (
                        <Button 
                          size="sm"
                          onClick={() => convertToJob.mutate(estimation.id)}
                        >
                          Create Job
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimation Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage all quotes through the sales process
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Pipeline Value</p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  ${metrics.totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Won Value</p>
                <p className="text-xl font-bold text-green-600 mt-0.5">
                  ${metrics.acceptedValue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{metrics.conversionRate}%</p>
              </div>
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Avg Days to Close</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{metrics.avgDaysToClose}</p>
              </div>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban View */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <KanbanView />
      )}
    </div>
  );
}