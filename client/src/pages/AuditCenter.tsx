import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Shield,
  Search,
  Filter,
  Download,
  AlertCircle,
  User,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SystemLog {
  id: number;
  eventCategory: string;
  eventType: string;
  eventSubtype: string | null;
  severity: string;
  entityType: string | null;
  entityId: string | null;
  entityDescription: string | null;
  userId: number | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  previousState: any;
  newState: any;
  changeSummary: any;
  financialImpact: string | null;
  ipAddress: string | null;
  source: string | null;
  requestPath: string | null;
  responseStatus: number | null;
  errorMessage: string | null;
  requiresReview: boolean;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

const severityColors = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  critical: 'bg-red-700',
};

const categoryColors = {
  procurement: 'bg-indigo-500',
  financial: 'bg-green-500',
  user: 'bg-purple-500',
  system: 'bg-gray-500',
  security: 'bg-red-500',
};

// Procurement-specific audit actions for better filtering
const procurementActions = [
  'RFQ_CREATED',
  'RFQ_SENT',
  'QUOTE_SUBMITTED',
  'QUOTE_EVALUATED',
  'WINNER_SELECTED',
  'REJECTION_NOTIFICATION_SENT',
  'ACCEPTANCE_NOTIFICATION_SENT',
  'PO_CREATED',
  'PO_APPROVED',
  'PO_SENT',
  'REQUISITION_CREATED',
  'REQUISITION_APPROVED',
  'REQUISITION_REJECTED',
  'GOODS_RECEIVED',
  'INVOICE_PROCESSED'
];

export default function AuditCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showUnreviewed, setShowUnreviewed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [quickFilter, setQuickFilter] = useState<string>('all'); // Quick filter for common audit scenarios
  
  const pageSize = 50;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      '/api/audit/system-logs',
      {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        entityType: selectedEntityType !== 'all' ? selectedEntityType : undefined,
        dateFrom: dateRange.from?.toISOString(),
        dateTo: dateRange.to?.toISOString(),
        requiresReview: showUnreviewed ? 'true' : undefined,
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      },
    ],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, Record<string, string | undefined>];
      const queryString = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined) as [string, string][]
      ).toString();
      const response = await fetch(`${url}?${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleExport = async () => {
    // Implementation for exporting audit logs to CSV
    console.log('Export audit logs');
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderLogDetails = (log: SystemLog) => (
    <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Audit Log Details
          </DialogTitle>
        </DialogHeader>
        
        {selectedLog && (
          <div className="space-y-6">
            {/* Event Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Event ID</p>
                    <p className="font-medium">#{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.createdAt), 'PPp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge className={categoryColors[selectedLog.eventCategory as keyof typeof categoryColors]}>
                      {selectedLog.eventCategory}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Severity</p>
                    <Badge className={severityColors[selectedLog.severity as keyof typeof severityColors]}>
                      {selectedLog.severity}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Event Type</p>
                    <p className="font-medium">{selectedLog.eventType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Event Subtype</p>
                    <p className="font-medium">{selectedLog.eventSubtype || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Action Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Action Description</p>
                  <p className="p-3 bg-muted rounded-lg">{selectedLog.action}</p>
                </div>
                
                {selectedLog.entityType && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Entity Type</p>
                      <p className="font-medium">{selectedLog.entityType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entity ID</p>
                      <p className="font-medium">{selectedLog.entityId || '-'}</p>
                    </div>
                  </div>
                )}
                
                {selectedLog.entityDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground">Entity Description</p>
                    <p className="font-medium">{selectedLog.entityDescription}</p>
                  </div>
                )}
                
                {selectedLog.financialImpact && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      Financial Impact: ${parseFloat(selectedLog.financialImpact).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedLog.userName || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{selectedLog.userRole || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="font-medium">{selectedLog.source || 'Web'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Request Path</p>
                    <p className="font-mono text-xs">{selectedLog.requestPath || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Response Status</p>
                    <p className="font-medium">{selectedLog.responseStatus || '-'}</p>
                  </div>
                </div>
                
                {selectedLog.errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{selectedLog.errorMessage}</AlertDescription>
                  </Alert>
                )}
                
                {selectedLog.changeSummary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Change Summary</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.changeSummary, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review Status */}
            {selectedLog.requiresReview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-yellow-600">Requires Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLog.reviewedBy ? (
                    <div className="space-y-3">
                      <Badge className="bg-green-500">Reviewed</Badge>
                      <div>
                        <p className="text-sm text-muted-foreground">Reviewed At</p>
                        <p className="font-medium">
                          {selectedLog.reviewedAt && format(new Date(selectedLog.reviewedAt), 'PPp')}
                        </p>
                      </div>
                      {selectedLog.reviewNotes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Review Notes</p>
                          <p className="p-3 bg-muted rounded-lg">{selectedLog.reviewNotes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This event requires manual review by an administrator.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-500" />
          Audit Center
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive audit trail for compliance and security monitoring
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="procurement">Procurement</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                <SelectItem value="requisition">Requisitions</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="job">Jobs</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showUnreviewed ? 'default' : 'outline'}
              onClick={() => setShowUnreviewed(!showUnreviewed)}
              className="w-full"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Needs Review
            </Button>

            <Button variant="outline" onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Audit Logs {data && `(${data.total} total)`}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load audit logs. Please check your permissions.
              </AlertDescription>
            </Alert>
          )}

          {data && (
            <>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map((log: SystemLog) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="text-xs">
                          {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`${categoryColors[log.eventCategory as keyof typeof categoryColors]} text-white border-0`}
                          >
                            {log.eventCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`${severityColors[log.severity as keyof typeof severityColors]} text-white border-0`}
                          >
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.userName || 'System'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      {renderLogDetails(selectedLog as SystemLog)}
    </div>
  );
}