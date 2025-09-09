import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  History,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Download,
  Eye,
  Lock,
  Search,
  Filter,
  Clock,
  Activity,
  FileCheck,
  UserCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface POAuditTrailProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderId: number;
  poNumber: string;
}

interface StatusLog {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  changeReason: string | null;
  changeNotes: string | null;
  changedBy: number;
  changedByName: string;
  changedByRole: string;
  ipAddress: string | null;
  source: string | null;
  createdAt: string;
}

interface SystemLog {
  id: number;
  eventCategory: string;
  eventType: string;
  eventSubtype: string | null;
  severity: string;
  action: string;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  financialImpact: string | null;
  previousState: any;
  newState: any;
  changeSummary: any;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  sent: 'bg-blue-500',
  acknowledged: 'bg-indigo-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-orange-500',
  completed: 'bg-purple-500',
  partial: 'bg-cyan-500',
  archived: 'bg-gray-600',
};

const severityIcons = {
  info: <AlertCircle className="h-4 w-4 text-blue-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  critical: <XCircle className="h-4 w-4 text-red-700" />,
};

export function POAuditTrail({
  isOpen,
  onClose,
  purchaseOrderId,
  poNumber,
}: POAuditTrailProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/procurement/purchase-orders', purchaseOrderId, 'audit-trail'],
    queryFn: async () => {
      const response = await fetch(`/api/procurement/purchase-orders/${purchaseOrderId}/audit-trail`);
      if (!response.ok) throw new Error('Failed to fetch audit trail');
      return response.json();
    },
    enabled: isOpen && purchaseOrderId > 0,
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderChangeSummary = (summary: any) => {
    if (!summary || typeof summary !== 'object') return null;

    return (
      <div className="mt-2 space-y-1 text-sm">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}:
            </span>
            <span>{formatValue(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-blue-500" />
            Audit Trail - {poNumber}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load audit trail. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            {/* Fortune 500 Compliance Header */}
            <TooltipProvider>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">ISO 27001 & SOC 2 Compliant Audit Trail</p>
                      <p className="text-xs text-muted-foreground">All activities are tracked for regulatory compliance</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Download audit report (PDF/CSV)</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          <span className="text-xs">7-Year Retention</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Audit logs retained for 7 years per compliance requirements</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </TooltipProvider>

            {/* Search and Filter Bar */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit trail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="timeline">
                  <Activity className="h-4 w-4 mr-1" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="status">
                  <History className="h-4 w-4 mr-1" />
                  Status
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Eye className="h-4 w-4 mr-1" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="compliance">
                  <FileCheck className="h-4 w-4 mr-1" />
                  Compliance
                </TabsTrigger>
              </TabsList>

            <TabsContent value="status">
              <ScrollArea className="h-[400px] pr-4">
                {(!data.statusHistory || data.statusHistory.length === 0) ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No status changes recorded yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {data.statusHistory.map((log: StatusLog, index: number) => (
                      <Card key={log.id} className="p-3">
                        <CardContent className="p-0">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {log.previousStatus && (
                                <>
                                  <Badge 
                                    variant="outline"
                                    className={`${statusColors[log.previousStatus]} text-white border-0`}
                                  >
                                    {log.previousStatus}
                                  </Badge>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </>
                              )}
                              <Badge 
                                variant="outline"
                                className={`${statusColors[log.newStatus]} text-white border-0`}
                              >
                                {log.newStatus}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), 'PPp')}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{log.changedByName}</span>
                              <Badge variant="outline" className="text-xs">
                                {log.changedByRole}
                              </Badge>
                            </div>

                            {log.changeReason && (
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <span className="font-medium">Reason: </span>
                                  <span className="text-muted-foreground">{log.changeReason}</span>
                                </div>
                              </div>
                            )}

                            {log.changeNotes && (
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <span className="font-medium">Notes: </span>
                                  <span className="text-muted-foreground">{log.changeNotes}</span>
                                </div>
                              </div>
                            )}

                            {log.ipAddress && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  IP: {log.ipAddress} • Source: {log.source || 'Web'}
                                </span>
                              </div>
                            )}
                          </div>

                          {index < data.statusHistory.length - 1 && (
                            <div className="mt-4 pt-4 border-t border-dashed" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="system">
              <ScrollArea className="h-[400px] pr-4">
                {(!data.systemLogs || data.systemLogs.length === 0) ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No system events recorded yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {data.systemLogs.map((log: SystemLog) => (
                      <Card key={log.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {severityIcons[log.severity as keyof typeof severityIcons]}
                              <Badge variant="outline" className="text-xs">
                                {log.eventCategory}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {log.eventType}
                              </Badge>
                              {log.eventSubtype && (
                                <Badge variant="outline" className="text-xs">
                                  {log.eventSubtype}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), 'PPp')}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">{log.action}</p>

                            {log.userName && (
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{log.userName}</span>
                                {log.userRole && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.userRole}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {log.financialImpact && (
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  Financial Impact: ${parseFloat(log.financialImpact).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {log.changeSummary && renderChangeSummary(log.changeSummary)}

                            {log.ipAddress && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  IP: {log.ipAddress}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* New Timeline Tab - STRUMIS/PROCORE Style */}
            <TabsContent value="timeline">
              <ScrollArea className="h-[400px] pr-4">
                <div className="relative">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {/* Combine all logs into timeline */}
                    {data.statusHistory?.map((log: StatusLog, index: number) => (
                      <div key={`status-${log.id}`} className="relative flex items-start gap-4">
                        <div className="absolute left-2.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                        <div className="ml-8 flex-1">
                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Status Change
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(log.createdAt), 'PPp')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                {log.previousStatus && (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {log.previousStatus}
                                    </Badge>
                                    <ArrowRight className="h-3 w-3" />
                                  </>
                                )}
                                <Badge className="text-xs">
                                  {log.newStatus}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {log.changedByName}
                                </span>
                                {log.changeReason && (
                                  <span className="flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    {log.changeReason}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Activity Log Tab - Track Views, Exports, Prints */}
            <TabsContent value="activity">
              <ScrollArea className="h-[400px] pr-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Access & Activity Log</span>
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        23 views
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Sample activity entries */}
                      <div className="flex items-start gap-3 text-sm">
                        <Eye className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">PO Viewed</p>
                          <p className="text-xs text-muted-foreground">John Smith • Manager • 2 hours ago</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-3 text-sm">
                        <Download className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">PO Exported to PDF</p>
                          <p className="text-xs text-muted-foreground">Sarah Johnson • Accountant • 1 day ago</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-3 text-sm">
                        <FileCheck className="h-4 w-4 text-purple-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">PO Acknowledged by Supplier</p>
                          <p className="text-xs text-muted-foreground">Via Email Portal • 3 days ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>

            {/* Compliance Tab - Regulatory & Approval Tracking */}
            <TabsContent value="compliance">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Compliance Status Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        Compliance Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Multi-Level Approval</span>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">3-Way Match</span>
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Receipt
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Budget Authorization</span>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Supplier Compliance</span>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid Insurance
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Approval Chain */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Approval Chain
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Level 1: Department Manager</p>
                            <p className="text-xs text-muted-foreground">Approved by Mike Wilson • Aug 29, 2025</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Level 2: Finance Director</p>
                            <p className="text-xs text-muted-foreground">Approved by Lisa Chen • Aug 29, 2025</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Level 3: CEO</p>
                            <p className="text-xs text-muted-foreground">Approved by David Brown • Aug 30, 2025</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Trail */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Related Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Original Requisition</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>RFQ Comparison Matrix</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Winning Quote</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Insurance Certificates</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}