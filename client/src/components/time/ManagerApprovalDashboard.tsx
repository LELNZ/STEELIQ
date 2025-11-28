import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  CheckCircle2, XCircle, AlertCircle, Clock, Lock, PlayCircle, 
  RefreshCw, Filter, Search, Users, Calendar, TrendingUp,
  ChevronLeft, ChevronRight, FileText, AlertTriangle, Check, X
} from "lucide-react";

interface ManagerApprovalDashboardProps {
  managerId?: number;
}

export default function ManagerApprovalDashboard({ managerId }: ManagerApprovalDashboardProps) {
  const { toast } = useToast();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('submitted');
  const [filterDateRange, setFilterDateRange] = useState<string>('week');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch pending approvals with filtering
  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/time/timesheets/pending-approval', filterStatus, filterDateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: filterStatus,
        dateRange: filterDateRange
      });
      const response = await fetch(`/api/time/timesheets/pending-approval?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch pending approvals');
      return response.json();
    }
  });

  // Fetch approval statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/time/approval-stats'],
    queryFn: async () => {
      const response = await fetch('/api/time/approval-stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch approval statistics');
      return response.json();
    }
  });

  // Single timesheet approve mutation (with toast)
  const approveMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      return apiRequest('/api/time/timesheets/' + timesheetId + '/approve', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      // Fortune 50 Compliance: Invalidate correct queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets/pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets'] });
      toast({
        title: "Success",
        description: "Timesheet approved successfully"
      });
      setSelectedTimesheets([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve timesheet",
        variant: "destructive"
      });
    }
  });

  // Bulk approve mutation (no individual toasts)
  const bulkApproveMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      return apiRequest('/api/time/timesheets/' + timesheetId + '/approve', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      // Only invalidate queries, no toast here
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets/pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets'] });
    }
  });

  // Single timesheet reject mutation (with toast)
  const rejectMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }: { timesheetId: number; reason: string }) => {
      return apiRequest('/api/time/timesheets/' + timesheetId + '/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      // Fortune 50 Compliance: Invalidate correct queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets/pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets'] });
      toast({
        title: "Success",
        description: "Timesheet rejected successfully"
      });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedTimesheets([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject timesheet",
        variant: "destructive"
      });
    }
  });

  // Bulk reject mutation (no individual toasts)
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }: { timesheetId: number; reason: string }) => {
      return apiRequest('/api/time/timesheets/' + timesheetId + '/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      // Only invalidate queries, no toast here
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets/pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets'] });
    }
  });

  // Recall timesheet mutation (with proper error handling)
  const recallMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }: { timesheetId: number; reason: string }) => {
      return apiRequest('/api/time/timesheets/' + timesheetId + '/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      // Fortune 50 Compliance: Invalidate correct queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets/pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time/timesheets'] });
      toast({
        title: "Success",
        description: "Timesheet recalled for corrections"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to recall timesheet",
        variant: "destructive"
      });
    }
  });

  // Filter timesheets based on search
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts: any) => 
      !searchEmployee || 
      ts.employeeName?.toLowerCase().includes(searchEmployee.toLowerCase())
    );
  }, [timesheets, searchEmployee]);

  // Pagination
  const paginatedTimesheets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTimesheets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTimesheets, currentPage]);

  const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);

  // Handle bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTimesheets(paginatedTimesheets.map((ts: any) => ts.id));
    } else {
      setSelectedTimesheets([]);
    }
  };

  // Handle individual selection
  const handleSelectTimesheet = (timesheetId: number, checked: boolean) => {
    if (checked) {
      setSelectedTimesheets([...selectedTimesheets, timesheetId]);
    } else {
      setSelectedTimesheets(selectedTimesheets.filter(id => id !== timesheetId));
    }
  };

  // Fortune 50 Compliance: Enhanced bulk operations with safeguards
  const [bulkOperationStatus, setBulkOperationStatus] = useState<{
    inProgress: boolean;
    processed: number;
    total: number;
    errors: string[];
  }>({ inProgress: false, processed: 0, total: 0, errors: [] });

  // Handle bulk approve with comprehensive error handling
  const handleBulkApprove = async () => {
    setBulkOperationStatus({ inProgress: true, processed: 0, total: selectedTimesheets.length, errors: [] });
    const errors: string[] = [];
    let successCount = 0;

    for (const id of selectedTimesheets) {
      try {
        // Use bulk mutation to avoid individual toasts
        await bulkApproveMutation.mutateAsync(id);
        successCount++;
      } catch (error: any) {
        const errorMsg = `Timesheet ${id}: ${error.message || 'Failed to approve'}`;
        errors.push(errorMsg);
        setBulkOperationStatus(prev => ({ ...prev, errors: [...prev.errors, errorMsg] }));
      }
      // Fortune 50 Compliance: Always increment processed counter for accurate progress
      setBulkOperationStatus(prev => ({ ...prev, processed: prev.processed + 1 }));
    }
    
    // Fortune 50 Compliance: Show results in dialog, don't reset immediately
    setBulkOperationStatus(prev => ({ ...prev, inProgress: false }));
    
    // Only close dialog and reset if all successful
    if (errors.length === 0) {
      setShowBulkApproveDialog(false);
      setSelectedTimesheets([]);
      setBulkOperationStatus({ inProgress: false, processed: 0, total: 0, errors: [] });
      toast({
        title: "Bulk Approval Complete",
        description: `Successfully approved ${successCount} timesheet(s)`,
      });
    } else {
      // Keep dialog open to show errors
      toast({
        title: "Bulk Approval Partially Complete",
        description: `Approved ${successCount} of ${selectedTimesheets.length} timesheets. See details below.`,
        variant: "destructive"
      });
    }
  };

  // Handle bulk reject with comprehensive error handling
  const handleBulkReject = async () => {
    setBulkOperationStatus({ inProgress: true, processed: 0, total: selectedTimesheets.length, errors: [] });
    const errors: string[] = [];
    let successCount = 0;

    for (const id of selectedTimesheets) {
      try {
        // Use bulk mutation to avoid individual toasts
        await bulkRejectMutation.mutateAsync({ timesheetId: id, reason: rejectReason });
        successCount++;
      } catch (error: any) {
        const errorMsg = `Timesheet ${id}: ${error.message || 'Failed to reject'}`;
        errors.push(errorMsg);
        setBulkOperationStatus(prev => ({ ...prev, errors: [...prev.errors, errorMsg] }));
      }
      // Fortune 50 Compliance: Always increment processed counter for accurate progress
      setBulkOperationStatus(prev => ({ ...prev, processed: prev.processed + 1 }));
    }
    
    // Fortune 50 Compliance: Show results in dialog, don't reset immediately
    setBulkOperationStatus(prev => ({ ...prev, inProgress: false }));
    
    // Only close dialog and reset if all successful
    if (errors.length === 0) {
      setShowRejectDialog(false);
      setSelectedTimesheets([]);
      setRejectReason('');
      setBulkOperationStatus({ inProgress: false, processed: 0, total: 0, errors: [] });
      toast({
        title: "Bulk Rejection Complete",
        description: `Successfully rejected ${successCount} timesheet(s)`,
      });
    } else {
      // Keep dialog open to show errors
      toast({
        title: "Bulk Rejection Partially Complete",
        description: `Rejected ${successCount} of ${selectedTimesheets.length} timesheets. See details below.`,
        variant: "destructive"
      });
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'submitted': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'locked': return 'outline';
      case 'processing': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingCount || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Approved This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground">Processed timesheets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Corrections Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.correctionsNeeded || 0}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvalRate || 0}%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Timesheet Approvals</CardTitle>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="sr-only">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedTimesheets.length > 0 && (
            <Alert className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>{selectedTimesheets.length} timesheet(s) selected</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowBulkApproveDialog(true)}
                    data-testid="button-bulk-approve"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    data-testid="button-bulk-reject"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject All
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Timesheets Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedTimesheets.length === paginatedTimesheets.length && paginatedTimesheets.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading timesheets...
                    </TableCell>
                  </TableRow>
                ) : paginatedTimesheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No timesheets found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTimesheets.map((timesheet: any) => (
                    <TableRow key={timesheet.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTimesheets.includes(timesheet.id)}
                          onCheckedChange={(checked) => handleSelectTimesheet(timesheet.id, !!checked)}
                          disabled={timesheet.status !== 'submitted'}
                          data-testid={`checkbox-timesheet-${timesheet.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{timesheet.employeeName}</TableCell>
                      <TableCell>{format(new Date(timesheet.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{timesheet.hoursWorked || 0}h</TableCell>
                      <TableCell>{timesheet.jobNumber || 'General'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(timesheet.status)}>
                          {timesheet.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {timesheet.submittedAt ? format(new Date(timesheet.submittedAt), 'MMM d') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {timesheet.status === 'submitted' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => approveMutation.mutate(timesheet.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${timesheet.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTimesheets([timesheet.id]);
                                  setShowRejectDialog(true);
                                }}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${timesheet.id}`}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {(timesheet.status === 'approved' || timesheet.status === 'submitted') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => recallMutation.mutate({ 
                                timesheetId: timesheet.id, 
                                reason: 'Corrections required' 
                              })}
                              disabled={recallMutation.isPending}
                              title="Recall for corrections"
                              data-testid={`button-recall-${timesheet.id}`}
                            >
                              <RefreshCw className="w-4 h-4 text-orange-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-view-${timesheet.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTimesheets.length)} of {filteredTimesheets.length} timesheets
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Approve Dialog */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedTimesheets.length} timesheet(s)?
            </DialogDescription>
          </DialogHeader>
          
          {/* Fortune 50 Compliance: Show operation progress */}
          {bulkOperationStatus.inProgress && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Processing {bulkOperationStatus.processed} of {bulkOperationStatus.total} timesheets...
              </div>
              <Progress 
                value={(bulkOperationStatus.processed / bulkOperationStatus.total) * 100} 
                className="w-full"
              />
            </div>
          )}
          
          {/* Show errors if any */}
          {bulkOperationStatus.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm font-medium mb-1">The following errors occurred:</div>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {bulkOperationStatus.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            {/* Show different buttons based on operation state */}
            {bulkOperationStatus.errors.length > 0 && !bulkOperationStatus.inProgress ? (
              <Button 
                onClick={() => {
                  setShowBulkApproveDialog(false);
                  setBulkOperationStatus({ inProgress: false, processed: 0, total: 0, errors: [] });
                  setSelectedTimesheets([]);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowBulkApproveDialog(false)}
                  disabled={bulkOperationStatus.inProgress}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkApprove} 
                  disabled={bulkOperationStatus.inProgress}
                >
                  {bulkOperationStatus.inProgress ? 'Processing...' : 'Approve All'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet(s)</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedTimesheets.length} timesheet(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="mt-2"
                rows={4}
              />
            </div>
            
            {/* Fortune 50 Compliance: Show operation progress */}
            {bulkOperationStatus.inProgress && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Processing {bulkOperationStatus.processed} of {bulkOperationStatus.total} timesheets...
                </div>
                <Progress 
                  value={(bulkOperationStatus.processed / bulkOperationStatus.total) * 100} 
                  className="w-full"
                />
              </div>
            )}
            
            {/* Show errors if any */}
            {bulkOperationStatus.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm font-medium mb-1">The following errors occurred:</div>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {bulkOperationStatus.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            {/* Show different buttons based on operation state */}
            {bulkOperationStatus.errors.length > 0 && !bulkOperationStatus.inProgress ? (
              <Button 
                onClick={() => {
                  setShowRejectDialog(false);
                  setBulkOperationStatus({ inProgress: false, processed: 0, total: 0, errors: [] });
                  setSelectedTimesheets([]);
                  setRejectReason('');
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRejectDialog(false)}
                  disabled={bulkOperationStatus.inProgress}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleBulkReject}
                  disabled={!rejectReason || bulkOperationStatus.inProgress}
                >
                  {bulkOperationStatus.inProgress ? 'Processing...' : 'Reject'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}