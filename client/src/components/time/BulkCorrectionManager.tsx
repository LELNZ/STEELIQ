import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2, Users, History, Camera, Eye, ShieldCheck, ShieldAlert } from 'lucide-react';

interface TimeEntry {
  id: number;
  userId: number;
  userName: string;
  clockType: string;
  timestamp: string;
  location: string;
  jobId?: number;
  jobName?: string;
  photoUrl?: string;
  captureMethod?: string;
  selected?: boolean;
  newTimestamp?: string;
  adjustmentMinutes?: number;
  notes?: string;
}

interface CorrectionPreview {
  timeClockId: number;
  originalTimestamp: string;
  newTimestamp: string;
  adjustmentMinutes: number;
  userId: number;
  jobId?: number;
  notes?: string;
}

export function BulkCorrectionManager() {
  const { toast } = useToast();
  const [selectedEntries, setSelectedEntries] = useState<Map<number, TimeEntry>>(new Map());
  const [correctionReason, setCorrectionReason] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [dualApprovalDialogOpen, setDualApprovalDialogOpen] = useState(false);
  const [pendingCorrectionId, setPendingCorrectionId] = useState<string | null>(null);
  const [correctionPreview, setCorrectionPreview] = useState<CorrectionPreview[]>([]);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [photoMetadata, setPhotoMetadata] = useState<any>(null);

  // Fetch recent time entries
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['/api/time/entries/recent'],
  });

  // Fetch correction history
  const { data: correctionHistory = [] } = useQuery({
    queryKey: ['/api/time/entries/correction-history'],
  });

  // Preview corrections mutation
  const previewMutation = useMutation({
    mutationFn: async (data: { entries: any[]; reason: string }) => {
      return apiRequest('/api/time/entries/bulk-preview', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setCorrectionPreview(data.corrections);
      setPreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Preview failed',
        description: error.message || 'Failed to preview corrections',
        variant: 'destructive',
      });
    },
  });

  // Apply corrections mutation
  const applyMutation = useMutation({
    mutationFn: async (data: { corrections: any[]; reason: string }) => {
      return apiRequest('/api/time/entries/bulk-apply', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      if (data.dualApprovalRequired) {
        setPendingCorrectionId(data.correctionId);
        setDualApprovalDialogOpen(true);
        toast({
          title: 'Dual approval required',
          description: `This correction requires second approval (${Math.abs(data.totalAdjustmentMinutes)} minutes adjustment)`,
        });
      } else {
        toast({
          title: 'Corrections applied',
          description: 'Time entries have been successfully corrected',
        });
        setSelectedEntries(new Map());
        setCorrectionReason('');
        queryClient.invalidateQueries({ queryKey: ['/api/time/entries/recent'] });
        queryClient.invalidateQueries({ queryKey: ['/api/time/entries/correction-history'] });
      }
      setPreviewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Correction failed',
        description: error.message || 'Failed to apply corrections',
        variant: 'destructive',
      });
    },
  });

  const handleSelectEntry = (entry: TimeEntry) => {
    const newSelection = new Map(selectedEntries);
    if (newSelection.has(entry.id)) {
      newSelection.delete(entry.id);
    } else {
      newSelection.set(entry.id, { ...entry, selected: true });
    }
    setSelectedEntries(newSelection);
  };

  const handleViewPhoto = async (clockId: number) => {
    try {
      // Fetch photo metadata first
      const response = await fetch(`/api/time/clock-photo/${clockId}/metadata`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch photo metadata');
      }
      
      const metadata = await response.json();
      setPhotoMetadata(metadata);
      setSelectedPhotoUrl(`/api/time/clock-photo/${clockId}`);
      setPhotoDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load photo',
        variant: 'destructive',
      });
    }
  };

  const handleTimeChange = (entryId: number, newTimestamp: string) => {
    const entry = selectedEntries.get(entryId);
    if (entry) {
      const originalTime = new Date(entry.timestamp).getTime();
      const newTime = new Date(newTimestamp).getTime();
      const adjustmentMinutes = Math.round((newTime - originalTime) / 60000);
      
      const updatedEntry = {
        ...entry,
        newTimestamp,
        adjustmentMinutes,
      };
      
      const newSelection = new Map(selectedEntries);
      newSelection.set(entryId, updatedEntry);
      setSelectedEntries(newSelection);
    }
  };

  const handlePreviewCorrections = () => {
    if (selectedEntries.size === 0) {
      toast({
        title: 'No entries selected',
        description: 'Please select at least one entry to correct',
        variant: 'destructive',
      });
      return;
    }

    if (!correctionReason || correctionReason.trim().length < 10) {
      toast({
        title: 'Reason required',
        description: 'Please provide a detailed reason (at least 10 characters)',
        variant: 'destructive',
      });
      return;
    }

    const entries = Array.from(selectedEntries.values()).map(entry => ({
      timeClockId: entry.id,
      newTimestamp: entry.newTimestamp || entry.timestamp,
      notes: entry.notes || '',
    }));

    previewMutation.mutate({ entries, reason: correctionReason });
  };

  const handleApplyCorrections = () => {
    applyMutation.mutate({
      corrections: correctionPreview,
      reason: correctionReason,
    });
  };

  const totalAdjustmentMinutes = Array.from(selectedEntries.values()).reduce(
    (sum, entry) => sum + (entry.adjustmentMinutes || 0),
    0
  );

  const needsDualApproval = Math.abs(totalAdjustmentMinutes) > 120;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Bulk Time Corrections</h2>
          <p className="text-muted-foreground">
            Select multiple time entries to correct at once
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/time/entries/recent'] })}
          >
            <History className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedEntries.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Correction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Selected Entries</Label>
                <p className="text-2xl font-bold">{selectedEntries.size}</p>
              </div>
              <div>
                <Label>Total Adjustment</Label>
                <p className={`text-2xl font-bold ${totalAdjustmentMinutes < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalAdjustmentMinutes > 0 ? '+' : ''}{totalAdjustmentMinutes} min
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  {needsDualApproval ? (
                    <>
                      <Users className="h-5 w-5 text-orange-500" />
                      <span className="text-orange-600 font-medium">Dual Approval Required</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-medium">Single Approval OK</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="reason">Correction Reason *</Label>
                <Textarea
                  id="reason"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Provide a detailed reason for these corrections (minimum 10 characters)"
                  className="mt-1"
                  rows={3}
                  data-testid="input-correction-reason"
                />
              </div>
              <Button
                onClick={handlePreviewCorrections}
                disabled={selectedEntries.size === 0 || !correctionReason}
                className="w-full"
                data-testid="button-preview-corrections"
              >
                <Clock className="h-4 w-4 mr-2" />
                Preview Corrections
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedEntries.size === timeEntries.length && timeEntries.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newSelection = new Map();
                        timeEntries.forEach((entry: TimeEntry) => {
                          newSelection.set(entry.id, entry);
                        });
                        setSelectedEntries(newSelection);
                      } else {
                        setSelectedEntries(new Map());
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Original Time</TableHead>
                <TableHead>New Time</TableHead>
                <TableHead>Adjustment</TableHead>
                <TableHead>Location/Job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading time entries...
                  </TableCell>
                </TableRow>
              ) : timeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No time entries found
                  </TableCell>
                </TableRow>
              ) : (
                timeEntries.map((entry: TimeEntry) => {
                  const selected = selectedEntries.has(entry.id);
                  const selectedEntry = selectedEntries.get(entry.id);
                  
                  return (
                    <TableRow key={entry.id} className={selected ? 'bg-accent' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => handleSelectEntry(entry)}
                          data-testid={`checkbox-entry-${entry.id}`}
                        />
                      </TableCell>
                      <TableCell>{entry.userName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.clockType === 'clock_in' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.clockType.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry.photoUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPhoto(entry.id)}
                            data-testid={`button-view-photo-${entry.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No photo</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(entry.timestamp), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>
                        {selected ? (
                          <Input
                            type="datetime-local"
                            value={selectedEntry?.newTimestamp || entry.timestamp}
                            onChange={(e) => handleTimeChange(entry.id, e.target.value)}
                            className="w-40"
                            data-testid={`input-new-time-${entry.id}`}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {selectedEntry?.adjustmentMinutes ? (
                          <span className={selectedEntry.adjustmentMinutes < 0 ? 'text-red-600' : 'text-green-600'}>
                            {selectedEntry.adjustmentMinutes > 0 ? '+' : ''}{selectedEntry.adjustmentMinutes} min
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.location}</p>
                          {entry.jobName && (
                            <p className="text-sm text-muted-foreground">{entry.jobName}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Correction History */}
      <Card>
        <CardHeader>
          <CardTitle>Correction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead>Adjustment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {correctionHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No correction history
                  </TableCell>
                </TableRow>
              ) : (
                correctionHistory.map((correction: any) => (
                  <TableRow key={correction.id}>
                    <TableCell>{format(new Date(correction.createdAt), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{correction.managerName}</TableCell>
                    <TableCell>{correction.totalEntries}</TableCell>
                    <TableCell>
                      <span className={correction.totalAdjustmentMinutes < 0 ? 'text-red-600' : 'text-green-600'}>
                        {correction.totalAdjustmentMinutes > 0 ? '+' : ''}{correction.totalAdjustmentMinutes} min
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        correction.status === 'applied'
                          ? 'bg-green-100 text-green-700'
                          : correction.status === 'pending'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {correction.status}
                        {correction.dualApprovalRequired && correction.secondApproverId && (
                          <span className="ml-1">(Dual)</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{correction.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Corrections</DialogTitle>
            <DialogDescription>
              Review the corrections before applying them
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {needsDualApproval && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900">Dual Approval Required</h4>
                    <p className="text-sm text-orange-800 mt-1">
                      This correction exceeds 120 minutes and requires approval from a second manager.
                      The corrections will be staged until second approval is received.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Original Time</TableHead>
                  <TableHead>New Time</TableHead>
                  <TableHead>Adjustment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correctionPreview.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>User #{item.userId}</TableCell>
                    <TableCell>{format(new Date(item.originalTimestamp), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{format(new Date(item.newTimestamp), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>
                      <span className={item.adjustmentMinutes < 0 ? 'text-red-600' : 'text-green-600'}>
                        {item.adjustmentMinutes > 0 ? '+' : ''}{item.adjustmentMinutes} min
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="bg-gray-50 rounded-lg p-4">
              <Label>Reason for Corrections</Label>
              <p className="mt-1 text-sm">{correctionReason}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyCorrections} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? 'Applying...' : needsDualApproval ? 'Stage for Approval' : 'Apply Corrections'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dual Approval Required Dialog */}
      <Dialog open={dualApprovalDialogOpen} onOpenChange={setDualApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dual Approval Required</DialogTitle>
            <DialogDescription>
              Your corrections have been staged for dual approval
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Correction ID:</strong> {pendingCorrectionId}
              </p>
              <p className="text-sm mt-2">
                The corrections have been saved and are pending approval from a second manager.
                Please notify another manager with the correction ID above to complete the approval process.
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Next steps:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Share the correction ID with another manager</li>
                <li>They will review and approve the corrections</li>
                <li>Time entries will be updated after second approval</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setDualApprovalDialogOpen(false);
              setPendingCorrectionId(null);
              setSelectedEntries(new Map());
              setCorrectionReason('');
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewing Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Time Clock Photo Evidence</DialogTitle>
            <DialogDescription>
              Photo captured during clock-in/clock-out for compliance verification
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Photo Display */}
            {selectedPhotoUrl && (
              <div className="relative">
                <img
                  src={selectedPhotoUrl}
                  alt="Time Clock Photo"
                  className="w-full max-h-96 object-contain rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    toast({
                      title: 'Failed to load photo',
                      description: 'The photo could not be retrieved',
                      variant: 'destructive'
                    });
                  }}
                />
              </div>
            )}
            
            {/* Photo Metadata */}
            {photoMetadata && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">Employee</Label>
                  <p className="font-medium">{photoMetadata.userName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Clock Type</Label>
                  <p className="font-medium">{photoMetadata.clockType?.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{photoMetadata.timestamp && format(new Date(photoMetadata.timestamp), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Capture Method</Label>
                  <p className="font-medium">{photoMetadata.captureMethod || 'Camera'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Verification Status</Label>
                  <div className="flex items-center gap-2">
                    {photoMetadata.verificationStatus === 'verified' ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">Verified</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-600 font-medium">Pending Verification</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Uploaded At</Label>
                  <p className="font-medium">{photoMetadata.uploadedAt && format(new Date(photoMetadata.uploadedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}