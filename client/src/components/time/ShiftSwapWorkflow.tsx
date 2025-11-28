import { useState } from "react";
import { ArrowLeftRight, Check, X, Clock, AlertTriangle, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface SwapRequest {
  id: number;
  requestId: string;
  requesterId: number;
  requesterName?: string;
  targetUserId: number | null;
  targetUserName?: string;
  swapType: string;
  reason: string;
  urgency: string;
  status: string;
  originalAssignment: {
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  };
  targetAssignment?: {
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  };
  slaDeadline: string;
  createdAt: string;
  peerApprovedAt: string | null;
  supervisorApprovedAt: string | null;
}

export function ShiftSwapWorkflow() {
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();

  const { data: swapRequests = [], isLoading } = useQuery<SwapRequest[]>({
    queryKey: ['/api/time/scheduling/swap-requests'],
    queryFn: async () => {
      const res = await fetch('/api/time/scheduling/swap-requests?all=true', { credentials: 'include' });
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const processApprovalMutation = useMutation({
    mutationFn: async ({ requestId, decision, isPeerApproval, rejectionReason }: {
      requestId: number;
      decision: 'approved' | 'rejected';
      isPeerApproval: boolean;
      rejectionReason?: string;
    }) => {
      return apiRequest(`/api/time/scheduling/swap-requests/${requestId}/approve`, 'POST', {
        decision,
        isPeerApproval,
        rejectionReason,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.decision === 'approved' ? 'Request Approved' : 'Request Rejected',
        description: `Shift swap request has been ${variables.decision}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/scheduling/swap-requests'] });
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalNotes("");
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      peer_approved: { variant: "secondary", label: "Peer Approved" },
      supervisor_pending: { variant: "default", label: "Awaiting Supervisor" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      cancelled: { variant: "outline", label: "Cancelled" },
      expired: { variant: "destructive", label: "Expired" },
    };
    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: Record<string, { className: string; label: string }> = {
      low: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Low" },
      normal: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", label: "Normal" },
      high: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "High" },
      emergency: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Emergency" },
    };
    const config = urgencyConfig[urgency] || urgencyConfig.normal;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  const getSwapTypeBadge = (swapType: string) => {
    const typeConfig: Record<string, { icon: any; label: string }> = {
      swap: { icon: ArrowLeftRight, label: "Shift Swap" },
      giveaway: { icon: User, label: "Giveaway" },
      coverage_request: { icon: Calendar, label: "Coverage Needed" },
    };
    const config = typeConfig[swapType] || { icon: ArrowLeftRight, label: swapType };
    const Icon = config.icon;
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const isSLABreached = (slaDeadline: string) => {
    return new Date(slaDeadline) < new Date();
  };

  const pendingRequests = swapRequests.filter(r => ['pending', 'peer_approved', 'supervisor_pending'].includes(r.status));
  const completedRequests = swapRequests.filter(r => ['approved', 'rejected', 'cancelled', 'expired'].includes(r.status));

  const handleApprove = (request: SwapRequest, isPeer: boolean) => {
    setSelectedRequest(request);
    setShowApprovalDialog(true);
  };

  return (
    <Card data-testid="card-shift-swap-workflow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Shift Swap Requests
        </CardTitle>
        <CardDescription>
          Manage shift swap, giveaway, and coverage requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" data-testid="tab-pending-swaps">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-swaps">
              Completed ({completedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending swap requests
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 border rounded-lg space-y-3 ${
                    isSLABreached(request.slaDeadline) ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                  data-testid={`swap-request-${request.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getSwapTypeBadge(request.swapType)}
                        {getStatusBadge(request.status)}
                        {getUrgencyBadge(request.urgency)}
                      </div>
                      <p className="text-sm font-medium">
                        {request.requesterName || `User ${request.requesterId}`}
                        {request.swapType === 'swap' && request.targetUserName && (
                          <> ↔ {request.targetUserName}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </div>
                      {isSLABreached(request.slaDeadline) && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          SLA Breached
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="font-medium">Original Shift</p>
                      <p>{request.originalAssignment?.date}</p>
                      <p>{request.originalAssignment?.startTime} - {request.originalAssignment?.endTime}</p>
                      <p className="text-muted-foreground">{request.originalAssignment?.location}</p>
                    </div>
                    {request.targetAssignment && (
                      <div className="p-2 bg-muted rounded">
                        <p className="font-medium">Target Shift</p>
                        <p>{request.targetAssignment.date}</p>
                        <p>{request.targetAssignment.startTime} - {request.targetAssignment.endTime}</p>
                        <p className="text-muted-foreground">{request.targetAssignment.location}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    <strong>Reason:</strong> {request.reason}
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request, request.status === 'pending')}
                      data-testid={`button-approve-swap-${request.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {request.status === 'pending' ? 'Peer Approve' : 'Supervisor Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request);
                        processApprovalMutation.mutate({
                          requestId: request.id,
                          decision: 'rejected',
                          isPeerApproval: request.status === 'pending',
                          rejectionReason: 'Rejected by reviewer',
                        });
                      }}
                      data-testid={`button-reject-swap-${request.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed requests
              </div>
            ) : (
              completedRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border rounded-lg space-y-2"
                  data-testid={`swap-request-completed-${request.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSwapTypeBadge(request.swapType)}
                      {getStatusBadge(request.status)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(request.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm">
                    {request.requesterName || `User ${request.requesterId}`}
                    {request.swapType === 'swap' && request.targetUserName && (
                      <> ↔ {request.targetUserName}</>
                    )}
                  </p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent data-testid="dialog-swap-approval">
            <DialogHeader>
              <DialogTitle>Approve Shift Swap Request</DialogTitle>
              <DialogDescription>
                Review and approve this shift swap request.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedRequest.requesterName || `User ${selectedRequest.requesterId}`}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
                </div>

                <div>
                  <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                  <Textarea
                    id="approval-notes"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Add any notes for this approval..."
                    data-testid="textarea-approval-notes"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
                data-testid="button-cancel-approval"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedRequest) {
                    processApprovalMutation.mutate({
                      requestId: selectedRequest.id,
                      decision: 'approved',
                      isPeerApproval: selectedRequest.status === 'pending',
                    });
                  }
                }}
                disabled={processApprovalMutation.isPending}
                data-testid="button-confirm-approval"
              >
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
