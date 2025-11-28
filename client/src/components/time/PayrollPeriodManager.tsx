import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { 
  Calendar, Lock, Unlock, PlayCircle, CheckCircle2, 
  AlertCircle, Clock, DollarSign, Users, TrendingUp,
  ChevronLeft, ChevronRight, Plus, Shield, AlertTriangle
} from "lucide-react";

interface PayrollPeriod {
  id: number;
  businessUnitId: number;
  periodType: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: 'open' | 'locked' | 'processing' | 'completed' | 'archived';
  lockedAt?: string;
  lockedBy?: number;
  processedAt?: string;
  processedBy?: number;
  completedAt?: string;
  completedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export default function PayrollPeriodManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // New period form state
  const [newPeriod, setNewPeriod] = useState({
    businessUnitId: 1,
    periodType: 'biweekly' as const,
    payPeriodStart: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    payPeriodEnd: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
    payDate: format(addDays(endOfWeek(new Date()), 5), 'yyyy-MM-dd')
  });

  // Fetch payroll periods
  const { data: periods = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/payroll-periods'],
    queryFn: async () => {
      const response = await fetch('/api/payroll-periods?includeExpired=true', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to view payroll periods');
        }
        throw new Error('Failed to fetch payroll periods');
      }
      return response.json();
    }
  });

  // Fetch user permissions
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Create payroll period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: typeof newPeriod) => {
      const response = await fetch('/api/payroll-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payroll period');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Payroll period created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Lock period mutation
  const lockPeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const response = await fetch(`/api/payroll-periods/${periodId}/lock`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lock period');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      toast({
        title: "Period Locked",
        description: "Timesheets in this period are now locked for processing"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lock Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Unlock period mutation
  const unlockPeriodMutation = useMutation({
    mutationFn: async ({ periodId, reason }: { periodId: number; reason: string }) => {
      const response = await fetch(`/api/payroll-periods/${periodId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock period');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setShowUnlockDialog(false);
      setSelectedPeriod(null);
      setUnlockReason("");
      toast({
        title: "Period Unlocked",
        description: "Timesheets can now be edited again"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unlock Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process period mutation
  const processPeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const response = await fetch(`/api/payroll-periods/${periodId}/process`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process period');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      toast({
        title: "Processing Started",
        description: "Payroll period is being processed for payment"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Process Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Auto-calculate period dates based on type
  const updatePeriodDates = (type: string, startDate: Date) => {
    let endDate: Date;
    let payDate: Date;

    switch (type) {
      case 'weekly':
        endDate = addDays(startDate, 6);
        payDate = addDays(endDate, 5); // Pay the following Friday
        break;
      case 'biweekly':
        endDate = addDays(startDate, 13);
        payDate = addDays(endDate, 5);
        break;
      case 'semimonthly':
        // 1st-15th or 16th-end of month
        if (startDate.getDate() === 1) {
          endDate = new Date(startDate.getFullYear(), startDate.getMonth(), 15);
          payDate = new Date(startDate.getFullYear(), startDate.getMonth(), 20);
        } else {
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of month
          payDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 5);
        }
        break;
      case 'monthly':
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        payDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 5);
        break;
      default:
        endDate = addDays(startDate, 13);
        payDate = addDays(endDate, 5);
    }

    setNewPeriod(prev => ({
      ...prev,
      periodType: type as any,
      payPeriodStart: format(startDate, 'yyyy-MM-dd'),
      payPeriodEnd: format(endDate, 'yyyy-MM-dd'),
      payDate: format(payDate, 'yyyy-MM-dd')
    }));
  };

  // Get status color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'locked':
        return <Badge className="bg-yellow-500"><Lock className="h-3 w-3 mr-1" />Locked</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><PlayCircle className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-purple-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate period statistics
  const periodStats = {
    total: periods.length,
    open: periods.filter(p => p.status === 'open').length,
    locked: periods.filter(p => p.status === 'locked').length,
    processing: periods.filter(p => p.status === 'processing').length,
    completed: periods.filter(p => p.status === 'completed').length
  };

  // Check if user has payroll permissions - properly check roles
  const hasPayrollPermission = (currentUser?.roles?.some(
    (role: any) => ['payroll_admin', 'manage_payroll', 'hr_manager'].includes(role.name)
  )) ?? false;
  
  const canViewPayroll = hasPayrollPermission || ((currentUser?.roles?.some(
    (role: any) => ['view_payroll', 'process_payroll', 'accountant', 'manager'].includes(role.name)
  )) ?? false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Periods</p>
              <p className="text-2xl font-bold">{periodStats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="text-2xl font-bold text-green-600">{periodStats.open}</p>
            </div>
            <Clock className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Locked</p>
              <p className="text-2xl font-bold text-yellow-600">{periodStats.locked}</p>
            </div>
            <Lock className="h-8 w-8 text-yellow-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{periodStats.processing}</p>
            </div>
            <PlayCircle className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-purple-600">{periodStats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payroll Periods</CardTitle>
          <div className="flex gap-2">
            {hasPayrollPermission && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Period
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payroll periods found. Create your first period to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locked By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      {format(new Date(period.payPeriodStart), 'MMM d')} - {format(new Date(period.payPeriodEnd), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="capitalize">{period.periodType}</TableCell>
                    <TableCell>{format(new Date(period.payDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(period.status)}</TableCell>
                    <TableCell>
                      {period.lockedAt ? format(new Date(period.lockedAt), 'MMM d h:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {period.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => hasPayrollPermission && lockPeriodMutation.mutate(period.id)}
                            disabled={lockPeriodMutation.isPending || !hasPayrollPermission}
                            title={!hasPayrollPermission ? "You don't have permission to lock periods" : "Lock this payroll period"}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        {period.status === 'locked' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (hasPayrollPermission) {
                                  setSelectedPeriod(period);
                                  setShowUnlockDialog(true);
                                }
                              }}
                              disabled={!hasPayrollPermission}
                              title={!hasPayrollPermission ? "You don't have permission to unlock periods" : "Unlock this payroll period"}
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => hasPayrollPermission && processPeriodMutation.mutate(period.id)}
                              disabled={processPeriodMutation.isPending || !hasPayrollPermission}
                              title={!hasPayrollPermission ? "You don't have permission to process periods" : "Process payroll for this period"}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Period Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="businessUnit">Business Unit</Label>
              <Select
                value={newPeriod.businessUnitId.toString()}
                onValueChange={(value) => setNewPeriod(prev => ({ ...prev, businessUnitId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Main Office</SelectItem>
                  <SelectItem value="2">Workshop</SelectItem>
                  <SelectItem value="3">Field Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="periodType">Period Type</Label>
              <Select
                value={newPeriod.periodType}
                onValueChange={(value) => updatePeriodDates(value, new Date(newPeriod.payPeriodStart))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Period Start</Label>
              <Input
                type="date"
                value={newPeriod.payPeriodStart}
                onChange={(e) => updatePeriodDates(newPeriod.periodType, new Date(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Period End</Label>
              <Input
                type="date"
                value={newPeriod.payPeriodEnd}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, payPeriodEnd: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="payDate">Pay Date</Label>
              <Input
                type="date"
                value={newPeriod.payDate}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, payDate: e.target.value }))}
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Creating a payroll period will allow timesheet collection for this date range. 
                Overlapping periods are not allowed.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createPeriodMutation.mutate(newPeriod)}
              disabled={createPeriodMutation.isPending}
            >
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Period Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Payroll Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Unlocking a payroll period will allow timesheets to be edited again. 
                This action is audited and requires a reason.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="reason">Reason for Unlock</Label>
              <Textarea
                id="reason"
                placeholder="Enter a detailed reason for unlocking this period..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUnlockDialog(false);
              setSelectedPeriod(null);
              setUnlockReason("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedPeriod && unlockReason) {
                  unlockPeriodMutation.mutate({ 
                    periodId: selectedPeriod.id, 
                    reason: unlockReason 
                  });
                }
              }}
              disabled={!unlockReason || unlockPeriodMutation.isPending}
            >
              Unlock Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}