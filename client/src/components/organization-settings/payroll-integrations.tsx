import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow, differenceInMinutes, subDays } from "date-fns";
import { 
  Link2, 
  Link2Off, 
  RefreshCw, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Loader2,
  Shield,
  FileSpreadsheet,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Users,
  Zap
} from "lucide-react";
import { SiQuickbooks, SiXero } from "react-icons/si";

interface ProviderConfig {
  id: number;
  providerId: string;
  displayName: string;
  apiUrl: string;
  isActive: boolean;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  fieldMappings: FieldMapping[];
  createdAt: string;
  updatedAt: string;
}

interface ProviderStatus {
  configured: boolean;
  connected: boolean;
  lastSync?: string;
  lastSyncStatus?: string;
}

interface SyncLogEntry {
  id: number;
  periodId: number;
  providerId?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  recordCount?: number;
  successCount?: number;
  errorCount?: number;
  providerTransactionId?: string;
  errors?: string;
}

interface SyncKPIs {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  partialSyncs: number;
  totalRecordsProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  last24HoursSyncs: number;
  last7DaysSyncs: number;
  lastSuccessfulSync?: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform: string;
  required: boolean;
  defaultValue?: string;
}

const PROVIDERS = [
  { 
    id: 'quickbooks', 
    name: 'QuickBooks Online', 
    description: 'Sync payroll data with Intuit QuickBooks Online Payroll',
    icon: SiQuickbooks,
    color: 'text-green-600',
    authType: 'OAuth2'
  },
  { 
    id: 'xero', 
    name: 'Xero Payroll', 
    description: 'Sync payroll data with Xero Payroll (AU/NZ/UK)',
    icon: SiXero,
    color: 'text-blue-600',
    authType: 'OAuth2'
  },
  { 
    id: 'adp', 
    name: 'ADP Workforce Now', 
    description: 'Sync payroll data with ADP Workforce Now via API',
    icon: Shield,
    color: 'text-red-600',
    authType: 'OAuth2/SFTP'
  }
];

const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
  { sourceField: 'employeeId', targetField: 'employee_id', transform: 'none', required: true },
  { sourceField: 'firstName', targetField: 'first_name', transform: 'none', required: true },
  { sourceField: 'lastName', targetField: 'last_name', transform: 'none', required: true },
  { sourceField: 'email', targetField: 'email', transform: 'none', required: false },
  { sourceField: 'regularHours', targetField: 'regular_hours', transform: 'hours', required: true },
  { sourceField: 'overtimeHours', targetField: 'overtime_hours', transform: 'hours', required: false },
  { sourceField: 'totalPay', targetField: 'gross_pay', transform: 'currency', required: true },
  { sourceField: 'date', targetField: 'pay_date', transform: 'date_iso', required: true }
];

export default function PayrollIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const { data: providers = [], isLoading } = useQuery<ProviderConfig[]>({
    queryKey: ['/api/payroll-integrations/providers']
  });

  const { data: syncHistory = [] } = useQuery<SyncLogEntry[]>({
    queryKey: ['/api/payroll-integrations/sync-history', selectedProvider],
    enabled: !!selectedProvider
  });

  const { data: allSyncHistory = [] } = useQuery<SyncLogEntry[]>({
    queryKey: ['/api/payroll-integrations/sync-history']
  });

  const syncKPIs = useMemo((): SyncKPIs => {
    const now = new Date();
    const oneDayAgo = subDays(now, 1);
    const sevenDaysAgo = subDays(now, 7);
    
    const successfulSyncs = allSyncHistory.filter(s => s.status === 'completed');
    const failedSyncs = allSyncHistory.filter(s => s.status === 'failed');
    const partialSyncs = allSyncHistory.filter(s => s.status === 'partial');
    
    const totalRecords = allSyncHistory.reduce((sum, s) => sum + (s.recordCount || 0), 0);
    
    const syncTimesMs = allSyncHistory
      .filter(s => s.startedAt && s.completedAt)
      .map(s => new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime());
    const avgTime = syncTimesMs.length > 0 
      ? syncTimesMs.reduce((a, b) => a + b, 0) / syncTimesMs.length / 60000 
      : 0;
    
    const last24Hours = allSyncHistory.filter(s => new Date(s.startedAt) >= oneDayAgo).length;
    const last7Days = allSyncHistory.filter(s => new Date(s.startedAt) >= sevenDaysAgo).length;
    
    const successRate = allSyncHistory.length > 0 
      ? (successfulSyncs.length / allSyncHistory.length) * 100 
      : 0;
    
    const lastSuccess = successfulSyncs.sort((a, b) => 
      new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
    )[0];
    
    return {
      totalSyncs: allSyncHistory.length,
      successfulSyncs: successfulSyncs.length,
      failedSyncs: failedSyncs.length,
      partialSyncs: partialSyncs.length,
      totalRecordsProcessed: totalRecords,
      averageProcessingTime: Math.round(avgTime * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      last24HoursSyncs: last24Hours,
      last7DaysSyncs: last7Days,
      lastSuccessfulSync: lastSuccess?.completedAt || lastSuccess?.startedAt
    };
  }, [allSyncHistory]);

  const getProviderStatus = (providerId: string) => {
    const provider = providers.find(p => p.providerId === providerId);
    if (!provider) return { configured: false, connected: false };
    
    return {
      configured: true,
      connected: provider.isActive && provider.tokenExpiresAt && new Date(provider.tokenExpiresAt) > new Date(),
      lastSync: provider.lastSyncAt,
      lastSyncStatus: 'completed'
    };
  };

  const connectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const response = await apiRequest(`/api/payroll-integrations/${providerId}/auth-url`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data: { authUrl: string }) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate OAuth connection",
        variant: "destructive"
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      return apiRequest(`/api/payroll-integrations/${providerId}/disconnect`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-integrations/providers'] });
      toast({
        title: "Disconnected",
        description: "Provider has been disconnected successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect provider",
        variant: "destructive"
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (providerId: string) => {
      setTestingConnection(providerId);
      return apiRequest(`/api/payroll-integrations/${providerId}/test`, {
        method: 'POST'
      });
    },
    onSuccess: (data: { connected: boolean; message?: string }) => {
      toast({
        title: data.connected ? "Connection Successful" : "Connection Failed",
        description: data.message || (data.connected ? "Provider is connected and ready" : "Connection test failed"),
        variant: data.connected ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setTestingConnection(null);
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: { providerId: string; config: Partial<ProviderConfig> }) => {
      return apiRequest(`/api/payroll-integrations/${data.providerId}/config`, {
        method: 'PUT',
        body: JSON.stringify(data.config)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-integrations/providers'] });
      setConfigDialogOpen(false);
      toast({
        title: "Configuration Saved",
        description: "Provider configuration has been updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (providerId: string) => {
    const status = getProviderStatus(providerId);
    if (!status.configured) {
      return <Badge variant="outline" className="gap-1" data-testid={`status-badge-${providerId}`}><Link2Off className="h-3 w-3" /> Not Configured</Badge>;
    }
    if (status.connected) {
      return <Badge className="gap-1 bg-green-600" data-testid={`status-badge-${providerId}`}><CheckCircle2 className="h-3 w-3" /> Connected</Badge>;
    }
    return <Badge variant="destructive" className="gap-1" data-testid={`status-badge-${providerId}`}><XCircle className="h-3 w-3" /> Disconnected</Badge>;
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">External Payroll Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect STEELIQ to external payroll providers for automated time data export
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map((provider) => {
          const config = providers.find(p => p.providerId === provider.id);
          const status = getProviderStatus(provider.id);
          const Icon = provider.icon;

          return (
            <Card key={provider.id} className="relative" data-testid={`provider-card-${provider.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${provider.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">{provider.authType}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(provider.id)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{provider.description}</p>
                
                {status.lastSync && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Last sync: {formatDistanceToNow(new Date(status.lastSync), { addSuffix: true })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!status.configured || !status.connected ? (
                    <Button 
                      size="sm" 
                      onClick={() => connectMutation.mutate(provider.id)}
                      disabled={connectMutation.isPending}
                      data-testid={`connect-btn-${provider.id}`}
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-2" />
                      )}
                      Connect
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnectionMutation.mutate(provider.id)}
                        disabled={testingConnection === provider.id}
                        data-testid={`test-btn-${provider.id}`}
                      >
                        {testingConnection === provider.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Test
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedProvider(provider.id);
                          setConfigDialogOpen(true);
                        }}
                        data-testid={`settings-btn-${provider.id}`}
                      >
                        <Settings2 className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => disconnectMutation.mutate(provider.id)}
                        disabled={disconnectMutation.isPending}
                        data-testid={`disconnect-btn-${provider.id}`}
                      >
                        <Link2Off className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Status Dashboard with KPIs */}
      <Card data-testid="sync-kpi-dashboard">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sync Status Dashboard
          </CardTitle>
          <CardDescription>
            Real-time metrics and KPIs for payroll synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Syncs */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid="kpi-total-syncs">
              <div className="flex items-center justify-between">
                <Activity className="h-5 w-5 text-primary" />
                <Badge variant="outline">{syncKPIs.last24HoursSyncs} today</Badge>
              </div>
              <div className="text-2xl font-bold">{syncKPIs.totalSyncs}</div>
              <p className="text-xs text-muted-foreground">Total Syncs</p>
            </div>
            
            {/* Success Rate */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid="kpi-success-rate">
              <div className="flex items-center justify-between">
                {syncKPIs.successRate >= 90 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : syncKPIs.successRate >= 70 ? (
                  <Activity className="h-5 w-5 text-yellow-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <Badge 
                  variant={syncKPIs.successRate >= 90 ? "default" : syncKPIs.successRate >= 70 ? "outline" : "destructive"}
                  className={syncKPIs.successRate >= 90 ? "bg-green-600" : ""}
                >
                  {syncKPIs.successRate >= 90 ? "Healthy" : syncKPIs.successRate >= 70 ? "Moderate" : "Needs Attention"}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{syncKPIs.successRate}%</div>
              <Progress value={syncKPIs.successRate} className="h-2" />
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            
            {/* Records Processed */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid="kpi-records">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-blue-600" />
                <Badge variant="outline">{syncKPIs.last7DaysSyncs} 7d</Badge>
              </div>
              <div className="text-2xl font-bold">{syncKPIs.totalRecordsProcessed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Records Processed</p>
            </div>
            
            {/* Average Processing Time */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid="kpi-avg-time">
              <div className="flex items-center justify-between">
                <Zap className="h-5 w-5 text-amber-600" />
                {syncKPIs.averageProcessingTime < 5 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">Fast</Badge>
                )}
              </div>
              <div className="text-2xl font-bold">{syncKPIs.averageProcessingTime} min</div>
              <p className="text-xs text-muted-foreground">Avg Processing Time</p>
            </div>
            
            {/* Status Breakdown */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid="kpi-breakdown">
              <div className="flex items-center gap-1 mb-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Status Breakdown</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Success
                  </span>
                  <span className="font-medium">{syncKPIs.successfulSyncs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    Failed
                  </span>
                  <span className="font-medium">{syncKPIs.failedSyncs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    Partial
                  </span>
                  <span className="font-medium">{syncKPIs.partialSyncs}</span>
                </div>
              </div>
            </div>
          </div>
          
          {syncKPIs.lastSuccessfulSync && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Last successful sync: {formatDistanceToNow(new Date(syncKPIs.lastSuccessfulSync), { addSuffix: true })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Field Mappings
          </CardTitle>
          <CardDescription>
            Configure how STEELIQ fields map to your payroll provider fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quickbooks">
            <TabsList>
              {PROVIDERS.map(p => (
                <TabsTrigger key={p.id} value={p.id} className="flex items-center gap-2">
                  <p.icon className={`h-4 w-4 ${p.color}`} />
                  {p.name.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {PROVIDERS.map(provider => {
              const config = providers.find(p => p.providerId === provider.id);
              const mappings = config?.fieldMappings || DEFAULT_FIELD_MAPPINGS;
              
              return (
                <TabsContent key={provider.id} value={provider.id} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {mappings.length} field mappings configured
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setMappingDialogOpen(true);
                      }}
                      data-testid={`edit-mappings-${provider.id}`}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Edit Mappings
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>STEELIQ Field</TableHead>
                        <TableHead>Provider Field</TableHead>
                        <TableHead>Transform</TableHead>
                        <TableHead>Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{mapping.sourceField}</TableCell>
                          <TableCell className="font-mono text-sm">{mapping.targetField}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{mapping.transform}</Badge>
                          </TableCell>
                          <TableCell>
                            {mapping.required ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <span className="text-muted-foreground text-sm">Optional</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Sync History
          </CardTitle>
          <CardDescription>
            View the status of recent payroll synchronization attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quickbooks" onValueChange={setSelectedProvider}>
            <TabsList>
              {PROVIDERS.map(p => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.name.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {PROVIDERS.map(provider => (
              <TabsContent key={provider.id} value={provider.id}>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No sync history for this provider</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Period ID</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="flex items-center gap-2">
                            {getSyncStatusIcon(entry.status)}
                            <span className="capitalize">{entry.status}</span>
                          </TableCell>
                          <TableCell>{entry.periodId}</TableCell>
                          <TableCell>{format(new Date(entry.startedAt), 'MMM d, HH:mm')}</TableCell>
                          <TableCell>
                            {entry.completedAt ? format(new Date(entry.completedAt), 'MMM d, HH:mm') : '-'}
                          </TableCell>
                          <TableCell>{entry.recordCount || 0}</TableCell>
                          <TableCell className="text-green-600">{entry.successCount || 0}</TableCell>
                          <TableCell className="text-red-600">{entry.errorCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <ProviderConfigDialog 
        providerId={selectedProvider}
        config={providers.find(p => p.providerId === selectedProvider)}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={(config) => {
          if (selectedProvider) {
            saveConfigMutation.mutate({ providerId: selectedProvider, config });
          }
        }}
        isSaving={saveConfigMutation.isPending}
      />

      <FieldMappingDialog
        providerId={selectedProvider}
        mappings={providers.find(p => p.providerId === selectedProvider)?.fieldMappings || DEFAULT_FIELD_MAPPINGS}
        open={mappingDialogOpen}
        onOpenChange={setMappingDialogOpen}
        onSave={(mappings) => {
          if (selectedProvider) {
            saveConfigMutation.mutate({ 
              providerId: selectedProvider, 
              config: { fieldMappings: mappings } 
            });
            setMappingDialogOpen(false);
          }
        }}
        isSaving={saveConfigMutation.isPending}
      />
    </div>
  );
}

function ProviderConfigDialog({
  providerId,
  config,
  open,
  onOpenChange,
  onSave,
  isSaving
}: {
  providerId: string | null;
  config?: ProviderConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: Partial<ProviderConfig>) => void;
  isSaving: boolean;
}) {
  const [isActive, setIsActive] = useState(config?.isActive ?? true);

  const provider = PROVIDERS.find(p => p.id === providerId);
  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <provider.icon className={`h-5 w-5 ${provider.color}`} />
            {provider.name} Settings
          </DialogTitle>
          <DialogDescription>
            Configure your {provider.name} integration settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active">Integration Active</Label>
              <p className="text-xs text-muted-foreground">
                Enable or disable this integration
              </p>
            </div>
            <Switch 
              id="active" 
              checked={isActive} 
              onCheckedChange={setIsActive}
              data-testid="toggle-active"
            />
          </div>

          {config?.tokenExpiresAt && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm">Token Status</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(config.tokenExpiresAt) > new Date() 
                  ? `Expires ${formatDistanceToNow(new Date(config.tokenExpiresAt), { addSuffix: true })}`
                  : 'Token expired - reconnect required'}
              </p>
            </div>
          )}

          {providerId === 'xero' && (
            <div>
              <Label htmlFor="region">Region</Label>
              <Select defaultValue="NZ">
                <SelectTrigger id="region" data-testid="select-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="NZ">New Zealand</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Determines which Xero Payroll API version to use
              </p>
            </div>
          )}

          {providerId === 'adp' && (
            <div>
              <Label htmlFor="mode">Connection Mode</Label>
              <Select defaultValue="api">
                <SelectTrigger id="mode" data-testid="select-mode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API (OAuth2)</SelectItem>
                  <SelectItem value="sftp" disabled>SFTP (Not Available)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                ADP API mode uses OAuth2 for secure authentication
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave({ isActive })}
            disabled={isSaving}
            data-testid="save-config-btn"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldMappingDialog({
  providerId,
  mappings,
  open,
  onOpenChange,
  onSave,
  isSaving
}: {
  providerId: string | null;
  mappings: FieldMapping[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mappings: FieldMapping[]) => void;
  isSaving: boolean;
}) {
  const [localMappings, setLocalMappings] = useState(mappings);

  const updateMapping = (index: number, field: keyof FieldMapping, value: any) => {
    const updated = [...localMappings];
    updated[index] = { ...updated[index], [field]: value };
    setLocalMappings(updated);
  };

  const provider = PROVIDERS.find(p => p.id === providerId);
  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Field Mappings - {provider.name}
          </DialogTitle>
          <DialogDescription>
            Configure how STEELIQ fields map to {provider.name} fields
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>STEELIQ Field</TableHead>
                <TableHead>Provider Field</TableHead>
                <TableHead>Transform</TableHead>
                <TableHead>Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localMappings.map((mapping, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Input 
                      value={mapping.sourceField}
                      onChange={(e) => updateMapping(idx, 'sourceField', e.target.value)}
                      className="w-full"
                      data-testid={`source-field-${idx}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(idx, 'targetField', e.target.value)}
                      className="w-full"
                      data-testid={`target-field-${idx}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={mapping.transform}
                      onValueChange={(value) => updateMapping(idx, 'transform', value)}
                    >
                      <SelectTrigger className="w-32" data-testid={`transform-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="date_iso">ISO Date</SelectItem>
                        <SelectItem value="currency">Currency</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={mapping.required}
                      onCheckedChange={(checked) => updateMapping(idx, 'required', checked)}
                      data-testid={`required-${idx}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(localMappings)}
            disabled={isSaving}
            data-testid="save-mappings-btn"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
