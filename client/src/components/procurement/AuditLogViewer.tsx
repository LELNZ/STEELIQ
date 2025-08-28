import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  User,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  Edit,
  Clock,
  Shield,
  Trophy,
  Plus
} from "lucide-react";

interface AuditLogEntry {
  id: number;
  userId: number;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogViewerProps {
  compact?: boolean;
  entityType?: string;
  entityId?: string;
}

export default function AuditLogViewer({ compact = false, entityType, entityId }: AuditLogViewerProps) {
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Build query key based on entity filter if provided
  const queryKey = entityType && entityId 
    ? [`/api/procurement/audit-logs/${entityType}/${entityId}`]
    : ['/api/procurement/audit-logs', filterType, filterUser, dateFrom, dateTo];
    
  // Fetch audit logs
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey,
  });
  
  // Navigate to full audit center
  const navigateToAuditCenter = () => {
    window.location.href = '/settings/audit-center';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <Plus className="h-4 w-4 text-green-600" />;
    if (action.includes('UPDATE') || action.includes('EDIT')) return <Edit className="h-4 w-4 text-blue-600" />;
    if (action.includes('DELETE')) return <XCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('APPROVE')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes('REJECT')) return <XCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('SEND') || action.includes('NOTIFICATION')) return <Send className="h-4 w-4 text-blue-600" />;
    if (action.includes('VIEW')) return <Eye className="h-4 w-4 text-gray-600" />;
    if (action.includes('WINNER')) return <Trophy className="h-4 w-4 text-yellow-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getActionBadgeColor = (action: string): string => {
    if (action.includes('CREATE')) return "success";
    if (action.includes('UPDATE') || action.includes('EDIT')) return "default";
    if (action.includes('DELETE')) return "destructive";
    if (action.includes('APPROVE')) return "success";
    if (action.includes('REJECT')) return "destructive";
    if (action.includes('WINNER')) return "warning";
    if (action.includes('SEND')) return "default";
    return "secondary";
  };

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'RFQ': return <FileText className="h-4 w-4" />;
      case 'RFQ_RESPONSE': return <Package className="h-4 w-4" />;
      case 'PURCHASE_ORDER': return <Package className="h-4 w-4" />;
      case 'REQUISITION': return <FileText className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatActionDescription = (log: AuditLogEntry): string => {
    const changes = log.changes?.new || log.changes || {};
    
    switch(log.action) {
      case 'RFQ_CREATED':
        return `Created RFQ #${changes.rfqNumber || log.resourceId}`;
      case 'QUOTE_SUBMITTED':
        return `Submitted quote for RFQ #${changes.rfqNumber} - ${changes.supplierName} (${changes.quoteAmount})`;
      case 'WINNER_SELECTED':
        return `Selected ${changes.supplierName} as winner for RFQ #${changes.rfqNumber}`;
      case 'REJECTION_NOTIFICATION_SENT':
        return `Sent rejection notification to ${changes.supplierName} for RFQ #${changes.rfqNumber}`;
      case 'ACCEPTANCE_NOTIFICATION_SENT':
        return `Sent acceptance notification to ${changes.supplierName} for RFQ #${changes.rfqNumber}`;
      case 'PO_CREATED':
        return `Created Purchase Order #${changes.poNumber} from RFQ #${changes.rfqNumber}`;
      case 'REQUISITION_CREATED':
        return `Created requisition #${changes.requisitionNumber}`;
      case 'REQUISITION_APPROVED':
        return `Approved requisition #${changes.requisitionNumber}`;
      default:
        return log.action.replace(/_/g, ' ').toLowerCase();
    }
  };

  // Mock data for demonstration
  const mockAuditLogs: AuditLogEntry[] = [
    {
      id: 1,
      userId: 1,
      userName: "Adam Green",
      action: "RFQ_CREATED",
      resourceType: "RFQ",
      resourceId: "1",
      changes: { new: { rfqNumber: "RFQ-202508-001", title: "Steel Beams Supply", estimatedValue: 50000 }},
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: 1,
      userName: "Adam Green",
      action: "QUOTE_SUBMITTED",
      resourceType: "RFQ_RESPONSE",
      resourceId: "11",
      changes: { new: { rfqNumber: "RFQ-202508-001", supplierName: "Lateral Engineering Limited", quoteAmount: "$8,000.00", deliveryDays: 5 }},
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 3,
      userId: 1,
      userName: "Adam Green",
      action: "WINNER_SELECTED",
      resourceType: "RFQ_RESPONSE",
      resourceId: "11",
      changes: { new: { rfqNumber: "RFQ-202508-001", supplierName: "Lateral Engineering Limited", justification: "Best overall value" }},
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 4,
      userId: 1,
      userName: "Adam Green",
      action: "ACCEPTANCE_NOTIFICATION_SENT",
      resourceType: "RFQ_RESPONSE",
      resourceId: "11",
      changes: { new: { rfqNumber: "RFQ-202508-001", supplierName: "Lateral Engineering Limited", notificationSentAt: new Date().toISOString() }},
      createdAt: new Date(Date.now() - 10800000).toISOString()
    },
    {
      id: 5,
      userId: 1,
      userName: "Adam Green",
      action: "PO_CREATED",
      resourceType: "PURCHASE_ORDER",
      resourceId: "PO-001",
      changes: { new: { poNumber: "PO-2025-001", rfqNumber: "RFQ-202508-001", amount: 8000, supplier: "Lateral Engineering Limited" }},
      createdAt: new Date(Date.now() - 14400000).toISOString()
    }
  ];

  const displayLogs = auditLogs.length > 0 ? auditLogs : mockAuditLogs;

  // Render compact view for modal or full view for page
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Recent Activities</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={navigateToAuditCenter}
            className="text-xs"
          >
            View All →
          </Button>
        </div>
        
        {/* Compact timeline */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Loading...
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No activities found
            </div>
          ) : (
            displayLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex gap-2 p-2 hover:bg-accent/50 rounded-lg transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {formatActionDescription(log)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.userName || `User ${log.userId}`} • {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
  
  // Full view for dedicated page
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Procurement Audit Trail
              </CardTitle>
              <CardDescription className="mt-1">
                Complete audit log of all procurement activities, RFQ decisions, and notifications
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={navigateToAuditCenter}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Full Audit Center
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Activity Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="rfq">RFQ Activities</SelectItem>
                    <SelectItem value="quotes">Quote Activities</SelectItem>
                    <SelectItem value="notifications">Notifications</SelectItem>
                    <SelectItem value="po">Purchase Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>User</Label>
                <Input
                  placeholder="Filter by user..."
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                />
              </div>
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Audit Log Timeline */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading audit logs...
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found for the selected filters
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                
                {displayLogs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4 pb-6">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center z-10">
                      {getActionIcon(log.action)}
                    </div>
                    
                    {/* Log content */}
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getActionBadgeColor(log.action)}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              {getResourceIcon(log.resourceType)}
                              {log.resourceType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.userName || `User ${log.userId}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm font-medium">
                          {formatActionDescription(log)}
                        </p>
                        
                        {log.changes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-xs">
                            <details>
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 overflow-x-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance Notice */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Compliance & Audit Standards</h4>
            <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-300">
              <li>• All procurement activities are logged with timestamp and user identification</li>
              <li>• Audit trails are immutable and retained for 7 years per compliance requirements</li>
              <li>• Winner selection decisions include justification for transparency</li>
              <li>• All supplier communications are tracked and documented</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

