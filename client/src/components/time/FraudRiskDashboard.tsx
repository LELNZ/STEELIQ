/**
 * Wave 5.2: Fraud Risk Dashboard
 * Fortune 50 Compliance: Real-time risk heatmap and monitoring
 * Features: Risk distribution, top risk users, recent high-risk events, override requests
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  MapPin,
  Smartphone,
  Timer,
  Activity,
  Eye,
  FileCheck,
  AlertCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface RiskDashboardData {
  totalEvents: number;
  highRiskEvents: number;
  criticalRiskEvents: number;
  pendingReviews: number;
  overrideRequests: number;
  avgRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRiskUsers: Array<{
    userId: number;
    username: string;
    riskScore: number;
    eventCount: number;
  }>;
  recentHighRiskEvents: Array<{
    id: number;
    userId: number;
    compositeRiskScore: string;
    riskLevel: string;
    eventType: string;
    eventTimestamp: string;
    gpsRiskFactors: Record<string, any>;
    velocityRiskFactors: Record<string, any>;
    reviewStatus: string;
  }>;
  slaBreaches: number;
}

interface EventRisk {
  id: number;
  riskEventId: string;
  userId: number;
  compositeRiskScore: string;
  riskLevel: string;
  eventType: string;
  eventTimestamp: string;
  gpsRiskScore: string;
  velocityRiskScore: string;
  patternRiskScore: string;
  deviceRiskScore: string;
  timeRiskScore: string;
  gpsRiskFactors: Record<string, any>;
  velocityRiskFactors: Record<string, any>;
  patternRiskFactors: Record<string, any>;
  deviceRiskFactors: Record<string, any>;
  timeRiskFactors: Record<string, any>;
  reviewStatus: string;
  processingLatencyMs: number;
}

interface OverrideRequest {
  id: number;
  requestId: string;
  clockEventRiskId: number;
  userId: number;
  overrideType: string;
  originalRiskScore: string;
  requestedAction: string;
  justification: string;
  status: string;
  priority: string;
  slaDeadline: string;
  requiresSecondaryApproval: boolean;
  primaryDecision: string | null;
  createdAt: string;
}

export function FraudRiskDashboard() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('30');
  const [selectedEvent, setSelectedEvent] = useState<EventRisk | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<OverrideRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  const { data: dashboardData, isLoading, refetch } = useQuery<{ success: boolean; data: RiskDashboardData }>({
    queryKey: ['/api/fraud/risk-dashboard', dateRange],
    queryFn: () => fetch(`/api/fraud/risk-dashboard?startDate=${startDate.toISOString()}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: overrideRequests } = useQuery<{ success: boolean; data: OverrideRequest[] }>({
    queryKey: ['/api/fraud/override-requests'],
    refetchInterval: 30000,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ eventId, decision, notes }: { eventId: number; decision: string; notes: string }) => {
      return apiRequest('POST', `/api/fraud/events/${eventId}/review`, { decision, notes });
    },
    onSuccess: () => {
      toast({ title: 'Review submitted', description: 'Risk event has been reviewed' });
      queryClient.invalidateQueries({ queryKey: ['/api/fraud/risk-dashboard'] });
      setReviewDialogOpen(false);
      setSelectedEvent(null);
      setReviewNotes('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const processOverrideMutation = useMutation({
    mutationFn: async ({ requestId, decision, notes, isSecondary }: { requestId: number; decision: string; notes: string; isSecondary?: boolean }) => {
      const timestamp = new Date().toISOString();
      const nonce = crypto.randomUUID();
      return apiRequest('POST', `/api/fraud/override-requests/${requestId}/approve`, { 
        decision, 
        notes, 
        isSecondary: isSecondary || false,
        timestamp,
        nonce,
      });
    },
    onSuccess: () => {
      toast({ title: 'Override processed', description: 'Override request has been processed' });
      queryClient.invalidateQueries({ queryKey: ['/api/fraud/override-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fraud/risk-dashboard'] });
      setOverrideDialogOpen(false);
      setSelectedOverride(null);
      setApprovalNotes('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const dashboard = dashboardData?.data;
  const overrides = overrideRequests?.data || [];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive" data-testid="badge-priority-urgent">URGENT</Badge>;
      case 'high': return <Badge variant="destructive" data-testid="badge-priority-high">HIGH</Badge>;
      case 'normal': return <Badge variant="secondary" data-testid="badge-priority-normal">NORMAL</Badge>;
      default: return <Badge variant="outline" data-testid="badge-priority-low">LOW</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-dashboard">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRiskEvents = dashboard ? 
    dashboard.riskDistribution.low + 
    dashboard.riskDistribution.medium + 
    dashboard.riskDistribution.high + 
    dashboard.riskDistribution.critical : 0;

  return (
    <div className="space-y-6" data-testid="fraud-risk-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-dashboard-title">Fraud Risk Dashboard</h2>
          <p className="text-muted-foreground">Wave 5.2: Real-time fraud prevention monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" data-testid="select-item-7-days">Last 7 days</SelectItem>
              <SelectItem value="30" data-testid="select-item-30-days">Last 30 days</SelectItem>
              <SelectItem value="90" data-testid="select-item-90-days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {dashboard?.slaBreaches > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950" data-testid="card-sla-alert">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-700 dark:text-red-300">
                {dashboard.slaBreaches} override request(s) have breached their SLA deadline
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risk Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-events">{dashboard?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-high-risk">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500" data-testid="text-high-risk-events">
              {dashboard?.highRiskEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-risk">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risk Events</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="text-critical-risk-events">
              {dashboard?.criticalRiskEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires dual authorization</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-reviews">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-pending-reviews">
              {dashboard?.pendingReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting decision</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" data-testid="card-risk-heatmap">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Risk Distribution
            </CardTitle>
            <CardDescription>Event distribution by risk level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard && totalRiskEvents > 0 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Low Risk
                    </span>
                    <span data-testid="text-low-risk-count">{dashboard.riskDistribution.low}</span>
                  </div>
                  <Progress 
                    value={(dashboard.riskDistribution.low / totalRiskEvents) * 100} 
                    className="h-2 bg-green-100"
                    data-testid="progress-low-risk"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Medium Risk
                    </span>
                    <span data-testid="text-medium-risk-count">{dashboard.riskDistribution.medium}</span>
                  </div>
                  <Progress 
                    value={(dashboard.riskDistribution.medium / totalRiskEvents) * 100} 
                    className="h-2 bg-yellow-100"
                    data-testid="progress-medium-risk"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      High Risk
                    </span>
                    <span data-testid="text-high-risk-count">{dashboard.riskDistribution.high}</span>
                  </div>
                  <Progress 
                    value={(dashboard.riskDistribution.high / totalRiskEvents) * 100} 
                    className="h-2 bg-orange-100"
                    data-testid="progress-high-risk"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Critical Risk
                    </span>
                    <span data-testid="text-critical-risk-count">{dashboard.riskDistribution.critical}</span>
                  </div>
                  <Progress 
                    value={(dashboard.riskDistribution.critical / totalRiskEvents) * 100} 
                    className="h-2 bg-red-100"
                    data-testid="progress-critical-risk"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Risk Score</span>
                    <span className="text-lg font-bold" data-testid="text-avg-risk-score">
                      {(dashboard.avgRiskScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-top-risk-users">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Risk Users
            </CardTitle>
            <CardDescription>Users with highest average risk scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.topRiskUsers?.slice(0, 5).map((user, index) => (
                <div 
                  key={user.userId} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`row-risk-user-${user.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      user.riskScore >= 0.75 ? 'bg-red-500' :
                      user.riskScore >= 0.5 ? 'bg-orange-500' :
                      user.riskScore >= 0.25 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-username-${user.userId}`}>{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.eventCount} events</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid={`text-risk-score-${user.userId}`}>
                      {(user.riskScore * 100).toFixed(1)}%
                    </p>
                    <Badge variant={getRiskBadgeVariant(
                      user.riskScore >= 0.75 ? 'critical' :
                      user.riskScore >= 0.5 ? 'high' :
                      user.riskScore >= 0.25 ? 'medium' : 'low'
                    )}>
                      {user.riskScore >= 0.75 ? 'Critical' :
                       user.riskScore >= 0.5 ? 'High' :
                       user.riskScore >= 0.25 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!dashboard?.topRiskUsers || dashboard.topRiskUsers.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No risk data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="events" data-testid="tab-recent-events">
            Recent High-Risk Events
          </TabsTrigger>
          <TabsTrigger value="overrides" data-testid="tab-override-requests">
            Override Requests ({overrides.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card data-testid="card-recent-events">
            <CardHeader>
              <CardTitle>Recent High-Risk Events</CardTitle>
              <CardDescription>Clock events flagged for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentHighRiskEvents?.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedEvent(event as any);
                      setReviewDialogOpen(true);
                    }}
                    data-testid={`row-risk-event-${event.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${getRiskColor(event.riskLevel)}`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{event.eventType.replace('_', ' ')}</span>
                          <Badge variant={getRiskBadgeVariant(event.riskLevel)}>
                            {event.riskLevel}
                          </Badge>
                          <Badge variant="outline">{event.reviewStatus}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          User ID: {event.userId} • {format(new Date(event.eventTimestamp), 'PPpp')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{(parseFloat(event.compositeRiskScore) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                      </div>
                      <Button variant="ghost" size="icon" data-testid={`button-view-event-${event.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!dashboard?.recentHighRiskEvents || dashboard.recentHighRiskEvents.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No high-risk events found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides">
          <Card data-testid="card-override-requests">
            <CardHeader>
              <CardTitle>Pending Override Requests</CardTitle>
              <CardDescription>Requests requiring approval (2-hour SLA for high-risk)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overrides.map((request) => (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedOverride(request);
                      setOverrideDialogOpen(true);
                    }}
                    data-testid={`row-override-${request.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <FileCheck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{request.overrideType.replace('_', ' ')}</span>
                          {getPriorityBadge(request.priority)}
                          {request.requiresSecondaryApproval && (
                            <Badge variant="outline">Dual Auth Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.requestedAction} • Original Risk: {(parseFloat(request.originalRiskScore) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          SLA: {format(new Date(request.slaDeadline), 'PPp')} ({formatDistanceToNow(new Date(request.slaDeadline), { addSuffix: true })})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" data-testid={`button-approve-override-${request.id}`}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-reject-override-${request.id}`}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {overrides.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No pending override requests</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-review-event">
          <DialogHeader>
            <DialogTitle>Review Risk Event</DialogTitle>
            <DialogDescription>
              Review the risk factors and submit your decision
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <Badge variant={getRiskBadgeVariant(selectedEvent.riskLevel)} className="mt-1">
                    {selectedEvent.riskLevel}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Composite Score</p>
                  <p className="font-bold mt-1">
                    {(parseFloat(selectedEvent.compositeRiskScore) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Risk Factor Breakdown</h4>
                <div className="grid grid-cols-5 gap-2">
                  <div className="p-2 rounded bg-muted text-center">
                    <MapPin className="h-4 w-4 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">GPS</p>
                    <p className="font-medium">{(parseFloat(selectedEvent.gpsRiskScore || '0') * 100).toFixed(0)}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted text-center">
                    <TrendingUp className="h-4 w-4 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Velocity</p>
                    <p className="font-medium">{(parseFloat(selectedEvent.velocityRiskScore || '0') * 100).toFixed(0)}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted text-center">
                    <Activity className="h-4 w-4 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Pattern</p>
                    <p className="font-medium">{(parseFloat(selectedEvent.patternRiskScore || '0') * 100).toFixed(0)}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted text-center">
                    <Smartphone className="h-4 w-4 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Device</p>
                    <p className="font-medium">{(parseFloat(selectedEvent.deviceRiskScore || '0') * 100).toFixed(0)}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted text-center">
                    <Timer className="h-4 w-4 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium">{(parseFloat(selectedEvent.timeRiskScore || '0') * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes</Label>
                <Textarea 
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter your review notes..."
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReviewDialogOpen(false)}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedEvent && submitReviewMutation.mutate({
                eventId: selectedEvent.id,
                decision: 'rejected',
                notes: reviewNotes
              })}
              disabled={submitReviewMutation.isPending}
              data-testid="button-reject-event"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              onClick={() => selectedEvent && submitReviewMutation.mutate({
                eventId: selectedEvent.id,
                decision: 'approved',
                notes: reviewNotes
              })}
              disabled={submitReviewMutation.isPending}
              data-testid="button-approve-event"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-process-override">
          <DialogHeader>
            <DialogTitle>Process Override Request</DialogTitle>
            <DialogDescription>
              Review and approve or reject this override request
            </DialogDescription>
          </DialogHeader>
          
          {selectedOverride && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Override Type</span>
                  <span className="font-medium capitalize">{selectedOverride.overrideType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Requested Action</span>
                  <span className="font-medium">{selectedOverride.requestedAction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Original Risk Score</span>
                  <span className="font-medium">{(parseFloat(selectedOverride.originalRiskScore) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  {getPriorityBadge(selectedOverride.priority)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Justification</Label>
                <p className="text-sm p-3 rounded bg-muted">{selectedOverride.justification}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-notes">Approval Notes</Label>
                <Textarea 
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Enter your notes..."
                  data-testid="textarea-approval-notes"
                />
              </div>

              {selectedOverride.requiresSecondaryApproval && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This request requires dual authorization
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOverrideDialogOpen(false)}
              data-testid="button-cancel-override"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedOverride && processOverrideMutation.mutate({
                requestId: selectedOverride.id,
                decision: 'rejected',
                notes: approvalNotes,
                isSecondary: selectedOverride.requiresSecondaryApproval && selectedOverride.primaryDecision === 'approved'
              })}
              disabled={processOverrideMutation.isPending}
              data-testid="button-reject-override-modal"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              onClick={() => selectedOverride && processOverrideMutation.mutate({
                requestId: selectedOverride.id,
                decision: 'approved',
                notes: approvalNotes,
                isSecondary: selectedOverride.requiresSecondaryApproval && selectedOverride.primaryDecision === 'approved'
              })}
              disabled={processOverrideMutation.isPending}
              data-testid="button-approve-override-modal"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
