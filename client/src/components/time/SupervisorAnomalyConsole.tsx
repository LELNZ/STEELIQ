import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  AlertTriangle, CheckCircle2, XCircle, Clock, Search, Filter,
  RefreshCw, ChevronLeft, ChevronRight, Shield, Brain, Zap,
  TrendingUp, Users, Eye, AlertCircle, Activity, BarChart2,
  ArrowUpRight, Info, Sparkles
} from "lucide-react";

interface AnomalyFlag {
  id: number;
  timeClockId: number;
  timesheetId: number | null;
  userId: number;
  anomalyType: string;
  anomalyScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  modelVersion: string;
  featureContributions: Record<string, number>;
  reviewStatus: 'pending' | 'investigating' | 'resolved' | 'escalated' | 'false_positive';
  reviewedBy: number | null;
  resolution: string | null;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  employeeName?: string;
  clockTime?: string;
  clockType?: string;
}

interface ModelMetrics {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  meanTimeToResolution: number;
  totalFlags: number;
  resolvedFlags: number;
  pendingFlags: number;
}

interface SupervisorAnomalyConsoleProps {
  supervisorId?: number;
}

export default function SupervisorAnomalyConsole({ supervisorId }: SupervisorAnomalyConsoleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlag, setSelectedFlag] = useState<AnomalyFlag | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [resolutionType, setResolutionType] = useState<string>('confirmed');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [escalateTo, setEscalateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: flagsResponse, isLoading: flagsLoading, refetch: refetchFlags } = useQuery({
    queryKey: ['/api/ai/anomalies/flags', filterSeverity],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      const response = await fetch(`/api/ai/anomalies/flags?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch anomaly flags');
      return response.json();
    }
  });

  const { data: metricsResponse, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/ai/anomalies/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/ai/anomalies/metrics', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch model metrics');
      return response.json();
    }
  });

  const { data: modelsResponse } = useQuery({
    queryKey: ['/api/ai/anomalies/models/deployed'],
    queryFn: async () => {
      const response = await fetch('/api/ai/anomalies/models/deployed', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch deployed model');
      return response.json();
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ flagId, resolution, notes }: { flagId: number; resolution: string; notes: string }) => {
      return apiRequest(`/api/ai/anomalies/${flagId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/anomalies/flags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/anomalies/metrics'] });
      toast({
        title: "Flag Resolved",
        description: "Anomaly flag has been resolved successfully"
      });
      setShowResolveDialog(false);
      setSelectedFlag(null);
      setResolutionNotes('');
      setResolutionType('confirmed');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve flag",
        variant: "destructive"
      });
    }
  });

  const escalateMutation = useMutation({
    mutationFn: async ({ flagId, escalatedTo, reason }: { flagId: number; escalatedTo: number; reason: string }) => {
      return apiRequest(`/api/ai/anomalies/${flagId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalatedTo, reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/anomalies/flags'] });
      toast({
        title: "Flag Escalated",
        description: "Anomaly flag has been escalated for review"
      });
      setShowEscalateDialog(false);
      setSelectedFlag(null);
      setEscalationReason('');
      setEscalateTo('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to escalate flag",
        variant: "destructive"
      });
    }
  });

  const flags: AnomalyFlag[] = flagsResponse?.data || [];
  const metrics: ModelMetrics = metricsResponse?.data || {
    version: 'v1.0.0',
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    falsePositiveRate: 0,
    meanTimeToResolution: 0,
    totalFlags: 0,
    resolvedFlags: 0,
    pendingFlags: 0
  };
  const deployedModel = modelsResponse?.data;

  const filteredFlags = useMemo(() => {
    let result = flags;
    
    if (activeTab === 'pending') {
      result = result.filter(f => f.reviewStatus === 'pending' || f.reviewStatus === 'investigating');
    } else if (activeTab === 'resolved') {
      result = result.filter(f => f.reviewStatus === 'resolved' || f.reviewStatus === 'false_positive');
    } else if (activeTab === 'escalated') {
      result = result.filter(f => f.reviewStatus === 'escalated');
    }
    
    if (filterType !== 'all') {
      result = result.filter(f => f.anomalyType === filterType);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(f => 
        f.employeeName?.toLowerCase().includes(term) ||
        f.explanation.toLowerCase().includes(term) ||
        f.anomalyType.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [flags, activeTab, filterType, searchTerm]);

  const paginatedFlags = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFlags.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFlags, currentPage]);

  const totalPages = Math.ceil(filteredFlags.length / itemsPerPage);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'time_pattern': 'Time Pattern',
      'location_mismatch': 'Location Mismatch',
      'duration_outlier': 'Duration Outlier',
      'velocity_fraud': 'Velocity Fraud',
      'ghost_employee': 'Ghost Employee'
    };
    return labels[type] || type;
  };

  const getAnomalyTypeIcon = (type: string) => {
    switch (type) {
      case 'time_pattern': return <Clock className="h-4 w-4" />;
      case 'location_mismatch': return <AlertTriangle className="h-4 w-4" />;
      case 'duration_outlier': return <Activity className="h-4 w-4" />;
      case 'velocity_fraud': return <Zap className="h-4 w-4" />;
      case 'ghost_employee': return <Users className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleResolve = (flag: AnomalyFlag) => {
    setSelectedFlag(flag);
    setShowResolveDialog(true);
  };

  const handleEscalate = (flag: AnomalyFlag) => {
    setSelectedFlag(flag);
    setShowEscalateDialog(true);
  };

  const submitResolution = () => {
    if (!selectedFlag) return;
    resolveMutation.mutate({
      flagId: selectedFlag.id,
      resolution: resolutionType,
      notes: resolutionNotes
    });
  };

  const submitEscalation = () => {
    if (!selectedFlag || !escalateTo) return;
    escalateMutation.mutate({
      flagId: selectedFlag.id,
      escalatedTo: parseInt(escalateTo),
      reason: escalationReason
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="title-anomaly-console">
            <Brain className="h-6 w-6 text-purple-600" />
            ML Anomaly Detection Console
          </h2>
          <p className="text-muted-foreground mt-1">
            Wave 5.1 - Fortune 50 AI/ML-powered fraud detection with SHAP explainability
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetchFlags()}
          data-testid="button-refresh-flags"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-model-accuracy">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Model Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.accuracy * 100).toFixed(1)}%</div>
            <Progress value={metrics.accuracy * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Target: ≥92% (Fortune 50 standard)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-flags">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.pendingFlags}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">of {metrics.totalFlags} total</span>
              {metrics.pendingFlags > 10 && (
                <Badge variant="destructive" className="text-xs">High Volume</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-false-positive-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              False Positive Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(metrics.falsePositiveRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: ≤5% (SOX compliance)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-mttr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Mean Time to Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.meanTimeToResolution < 60 
                ? `${metrics.meanTimeToResolution.toFixed(0)}m` 
                : `${(metrics.meanTimeToResolution / 60).toFixed(1)}h`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: ≤4h (SLA requirement)
            </p>
          </CardContent>
        </Card>
      </div>

      {deployedModel && (
        <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 dark:text-purple-200">
            <span className="font-medium">Active Model:</span> {deployedModel.version} | 
            <span className="ml-2">Deployed: {format(new Date(deployedModel.deployedAt), 'MMM d, yyyy HH:mm')}</span> | 
            <span className="ml-2">F1 Score: {(deployedModel.f1Score * 100).toFixed(1)}%</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee, type, or explanation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-flags"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40" data-testid="select-filter-type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="time_pattern">Time Pattern</SelectItem>
              <SelectItem value="location_mismatch">Location Mismatch</SelectItem>
              <SelectItem value="duration_outlier">Duration Outlier</SelectItem>
              <SelectItem value="velocity_fraud">Velocity Fraud</SelectItem>
              <SelectItem value="ghost_employee">Ghost Employee</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32" data-testid="select-filter-severity">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Pending Review
            {metrics.pendingFlags > 0 && (
              <Badge variant="secondary" className="ml-2">{metrics.pendingFlags}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Resolved
          </TabsTrigger>
          <TabsTrigger value="escalated" data-testid="tab-escalated">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Escalated
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {flagsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading anomaly flags...</span>
            </div>
          ) : paginatedFlags.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No Anomalies Found</h3>
                <p className="text-muted-foreground mt-1">
                  {activeTab === 'pending' 
                    ? 'All anomaly flags have been reviewed. Great job!'
                    : `No ${activeTab} flags match your current filters.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="max-w-md">Explanation</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFlags.map((flag) => (
                      <TableRow key={flag.id} data-testid={`row-flag-${flag.id}`}>
                        <TableCell className="font-mono text-sm">{flag.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{flag.employeeName || `User #${flag.userId}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {flag.clockType} at {flag.clockTime ? format(new Date(flag.clockTime), 'HH:mm') : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAnomalyTypeIcon(flag.anomalyType)}
                            <span className="text-sm">{getAnomalyTypeLabel(flag.anomalyType)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(flag.severity)}>
                            {flag.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={flag.anomalyScore * 100} className="w-16 h-2" />
                            <span className="text-sm font-mono">{(flag.anomalyScore * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm line-clamp-2">{flag.explanation}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(flag.createdAt), 'MMM d, HH:mm')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {flag.reviewStatus === 'pending' || flag.reviewStatus === 'investigating' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolve(flag)}
                                  data-testid={`button-resolve-${flag.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEscalate(flag)}
                                  data-testid={`button-escalate-${flag.id}`}
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedFlag(flag)}
                                data-testid={`button-view-${flag.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredFlags.length)} of{' '}
                    {filteredFlags.length} flags
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Anomaly Flag #{selectedFlag?.id}</DialogTitle>
            <DialogDescription>
              Review the anomaly details and provide a resolution
            </DialogDescription>
          </DialogHeader>
          
          {selectedFlag && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{getAnomalyTypeLabel(selectedFlag.anomalyType)}</strong> detected with 
                  <Badge className={`ml-2 ${getSeverityColor(selectedFlag.severity)}`}>
                    {selectedFlag.severity.toUpperCase()}
                  </Badge>
                  severity
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">SHAP Explanation</h4>
                <p className="text-sm text-muted-foreground">{selectedFlag.explanation}</p>
              </div>

              {selectedFlag.featureContributions && Object.keys(selectedFlag.featureContributions).length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Feature Contributions</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedFlag.featureContributions).map(([feature, value]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{feature.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.abs(value as number) * 100} 
                            className="w-24 h-2" 
                          />
                          <span className={`text-sm font-mono ${(value as number) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {(value as number) > 0 ? '+' : ''}{((value as number) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>Resolution Type</Label>
                <Select value={resolutionType} onValueChange={setResolutionType}>
                  <SelectTrigger data-testid="select-resolution-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed Fraud - Take Action</SelectItem>
                    <SelectItem value="false_positive">False Positive - Dismiss</SelectItem>
                    <SelectItem value="corrected">Employee Corrected Time Entry</SelectItem>
                    <SelectItem value="explained">Valid Explanation Provided</SelectItem>
                    <SelectItem value="policy_exception">Policy Exception Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Provide details about the resolution..."
                  rows={3}
                  data-testid="textarea-resolution-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitResolution}
              disabled={resolveMutation.isPending}
              data-testid="button-submit-resolution"
            >
              {resolveMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Submit Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Anomaly Flag #{selectedFlag?.id}</DialogTitle>
            <DialogDescription>
              Escalate this flag to a supervisor or HR for further review
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Escalate To (User ID)</Label>
              <Input
                type="number"
                value={escalateTo}
                onChange={(e) => setEscalateTo(e.target.value)}
                placeholder="Enter supervisor user ID"
                data-testid="input-escalate-to"
              />
            </div>

            <div className="space-y-3">
              <Label>Reason for Escalation</Label>
              <Textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why this needs higher-level review..."
                rows={3}
                data-testid="textarea-escalation-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitEscalation}
              disabled={!escalateTo || !escalationReason || escalateMutation.isPending}
              data-testid="button-submit-escalation"
            >
              {escalateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4 mr-2" />
              )}
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
