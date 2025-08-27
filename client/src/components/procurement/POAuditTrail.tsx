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
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [activeTab, setActiveTab] = useState('status');

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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status">
                <History className="h-4 w-4 mr-2" />
                Status History
              </TabsTrigger>
              <TabsTrigger value="system">
                <Shield className="h-4 w-4 mr-2" />
                System Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status">
              <ScrollArea className="h-[500px] pr-4">
                {data.statusHistory.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No status changes recorded yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {data.statusHistory.map((log: StatusLog, index: number) => (
                      <Card key={log.id}>
                        <CardContent className="pt-6">
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
              <ScrollArea className="h-[500px] pr-4">
                {data.systemLogs.length === 0 ? (
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
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}