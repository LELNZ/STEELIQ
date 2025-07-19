import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ChevronRight
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
  const [selectedView, setSelectedView] = useState('kanban');

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
    <div className="grid grid-cols-5 gap-4 h-[calc(100vh-24rem)]">
      {pipelineStages.map(stage => {
        const isWonColumn = stage.key === 'accepted';
        const columnBgClass = isWonColumn ? 'bg-green-50' : 'bg-gray-50';
        const headerClass = isWonColumn ? 'text-green-700' : '';
        
        return (
          <div key={stage.key} className="flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className={cn("font-semibold", headerClass)}>{stage.label}</h3>
              <Badge variant={isWonColumn ? "default" : "secondary"} className={isWonColumn ? "bg-green-600" : ""}>
                {getEstimationsByStatus(stage.key).length}
                {stage.target > 0 && `/${stage.target}`}
              </Badge>
            </div>
            <ScrollArea 
              className={cn("flex-1 rounded-lg p-2", columnBgClass)}
              onDrop={(e) => handleDrop(e, stage.key)}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
              {getEstimationsByStatus(stage.key).map(estimation => (
                <Card 
                  key={estimation.id}
                  className="cursor-move hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('estimationId', estimation.id.toString())}
                  onClick={() => window.location.href = `/estimation?id=${estimation.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block truncate">{estimation.name}</span>
                        {estimation.currentPhase && (
                          <span className="text-xs text-muted-foreground">{estimation.currentPhase}</span>
                        )}
                      </div>
                      {estimation.lifecycleProgress !== undefined && (
                        <div className="w-12 h-12 relative flex-shrink-0 ml-2">
                          <svg className="transform -rotate-90 w-12 h-12">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              className="text-gray-200"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 20}`}
                              strokeDashoffset={`${2 * Math.PI * 20 * (1 - (estimation.lifecycleProgress || 0) / 100)}`}
                              className="text-blue-600 transition-all duration-300"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                            {estimation.lifecycleProgress || 0}%
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {estimation.clientName || 'No client'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        ${parseFloat(estimation.totalCost || '0').toLocaleString()}
                      </span>
                      {estimation.currentPhase && (
                        <Badge variant="outline" className="text-xs">
                          {estimation.currentPhase}
                        </Badge>
                      )}
                    </div>
                    {stage.key === 'accepted' && (
                      <Button 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => convertToJob.mutate(estimation.id)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Create Job
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            </ScrollArea>
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
              const config = statusConfig[estimation.status];
              const Icon = config.icon;
              
              return (
                <tr key={estimation.id} className="border-b hover:bg-gray-50">
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
                      <Button size="sm" variant="outline">View</Button>
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estimation Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage all quotes through the sales process
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button>
            <Activity className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  ${metrics.totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won Value</p>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics.acceptedValue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Days to Close</p>
                <p className="text-2xl font-bold">{metrics.avgDaysToClose}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <KanbanView />
          )}
        </TabsContent>
        
        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ListView />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}