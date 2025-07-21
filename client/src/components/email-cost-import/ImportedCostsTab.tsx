import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileSearch, CheckCircle, XCircle, AlertCircle, Eye, Check, X } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";

interface ImportedCost {
  id: number;
  emailSubject: string;
  emailDate: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseOrderNumber: string;
  jobNumber: string;
  status: string;
  matchConfidence: number;
  totalAmount: number;
  currency: string;
  invoiceDate: string;
  createdAt: string;
}

export default function ImportedCostsTab() {
  const [selectedCost, setSelectedCost] = useState<ImportedCost | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewNotes, setReviewNotes] = useState("");
  const { toast } = useToast();

  // Fetch imported costs
  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["/api/imported-costs", statusFilter],
    queryFn: () => apiRequest(`/api/imported-costs${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`, "GET"),
  });

  // Fetch jobs for assignment
  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Update cost mutation
  const updateCostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/imported-costs/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imported-costs"] });
      toast({
        title: "Cost updated",
        description: "The imported cost has been updated successfully.",
      });
      setSelectedCost(null);
      setReviewNotes("");
    },
  });

  const handleStatusUpdate = (cost: ImportedCost, status: string) => {
    updateCostMutation.mutate({
      id: cost.id,
      data: { status, reviewNotes },
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge className="bg-green-500">High Match</Badge>;
    if (confidence >= 70) return <Badge className="bg-yellow-500">Medium Match</Badge>;
    return <Badge className="bg-red-500">Low Match</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "reviewed":
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Imported Costs</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve supplier invoices imported from emails
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Costs</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading imported costs...</div>
      ) : costs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No imported costs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Connect an email account and sync to start importing supplier costs
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost: ImportedCost) => (
                <TableRow key={cost.id}>
                  <TableCell>
                    {format(new Date(cost.invoiceDate || cost.emailDate), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{cost.supplierName}</TableCell>
                  <TableCell>{cost.invoiceNumber || "-"}</TableCell>
                  <TableCell>{cost.purchaseOrderNumber || "-"}</TableCell>
                  <TableCell>{cost.jobNumber || "Unassigned"}</TableCell>
                  <TableCell>
                    {cost.currency} ${cost.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>{getConfidenceBadge(cost.matchConfidence)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(cost.status)}
                      <StatusBadge status={cost.status} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCost(cost)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedCost} onOpenChange={() => setSelectedCost(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Imported Cost</DialogTitle>
            <DialogDescription>
              Review the details and approve or reject this imported cost
            </DialogDescription>
          </DialogHeader>

          {selectedCost && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Supplier</Label>
                  <p className="font-medium">{selectedCost.supplierName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Invoice Date</Label>
                  <p>{format(new Date(selectedCost.invoiceDate), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Invoice Number</Label>
                  <p>{selectedCost.invoiceNumber || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">PO Number</Label>
                  <p>{selectedCost.purchaseOrderNumber || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <p className="font-medium text-lg">
                    {selectedCost.currency} ${selectedCost.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Match Confidence</Label>
                  <div className="mt-1">{getConfidenceBadge(selectedCost.matchConfidence)}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Email Subject</Label>
                <p className="text-sm mt-1">{selectedCost.emailSubject}</p>
              </div>

              <div>
                <Label htmlFor="job-assignment">Assign to Job</Label>
                <Select
                  defaultValue={selectedCost.jobNumber}
                  onValueChange={(value) => {
                    const jobId = jobs.find((j: any) => j.jobNumber === value)?.id;
                    if (jobId) {
                      updateCostMutation.mutate({
                        id: selectedCost.id,
                        data: { jobId },
                      });
                    }
                  }}
                >
                  <SelectTrigger id="job-assignment">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobs as any[]).map((job: any) => (
                      <SelectItem key={job.id} value={job.jobNumber}>
                        {job.jobNumber} - {job.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="review-notes">Review Notes</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add any notes about this cost..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCost(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusUpdate(selectedCost, "rejected")}
                  disabled={updateCostMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedCost, "approved")}
                  disabled={updateCostMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}