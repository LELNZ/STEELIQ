import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Send,
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const rfqStatusColors = {
  draft: "secondary",
  sent: "warning",
  evaluating: "warning",
  closed: "default",
  cancelled: "destructive",
} as const;

export default function RFQManagementView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createRfqDialog, setCreateRfqDialog] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [sendRfqDialog, setSendRfqDialog] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  const { toast } = useToast();

  // Fetch RFQs
  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ["/api/procurement/rfqs"],
  });

  // Fetch approved requisitions
  const { data: requisitions = [] } = useQuery({
    queryKey: ["/api/procurement/requisitions", "approved"],
    queryFn: async () => {
      const response = await fetch("/api/procurement/requisitions?status=approved");
      if (!response.ok) throw new Error("Failed to fetch requisitions");
      return response.json();
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Create RFQ mutation
  const createRfqMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/procurement/rfqs", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      setCreateRfqDialog(false);
      setSelectedRequisition(null);
      toast({
        title: "Success",
        description: "RFQ created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFQ",
        variant: "destructive",
      });
    },
  });

  // Send RFQ mutation
  const sendRfqMutation = useMutation({
    mutationFn: ({ rfqId, supplierIds }: { rfqId: number; supplierIds: number[] }) =>
      apiRequest(`/api/procurement/rfqs/${rfqId}/send`, "POST", { supplierIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      setSendRfqDialog(false);
      setSelectedRfq(null);
      toast({
        title: "Success",
        description: "RFQ sent to suppliers",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send RFQ",
        variant: "destructive",
      });
    },
  });

  const filteredRfqs = rfqs.filter((rfq: any) =>
    rfq.rfqNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfq.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedRequisitions = requisitions.filter((r: any) => 
    r.status === 'approved' && !rfqs.some((rfq: any) => rfq.requisitionId === r.id)
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Request for Quotes Management</CardTitle>
              <CardDescription className="text-xs">
                Send approved requisitions to suppliers for competitive quotes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search RFQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Approved Requisitions Ready for RFQ */}
          {approvedRequisitions.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  Approved Requisitions Ready for RFQ
                </h4>
                <Badge variant="secondary">{approvedRequisitions.length}</Badge>
              </div>
              <div className="space-y-2">
                {approvedRequisitions.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded">
                    <div>
                      <span className="font-medium text-sm">{req.requisitionNumber}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {req.category} • ${req.estimatedTotal?.toLocaleString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequisition(req);
                        setCreateRfqDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create RFQ
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RFQs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>RFQ Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Deadline</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading RFQs...
                    </TableCell>
                  </TableRow>
                ) : filteredRfqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No RFQs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRfqs.map((rfq: any) => (
                    <TableRow key={rfq.id} className="text-xs">
                      <TableCell className="font-medium">{rfq.rfqNumber}</TableCell>
                      <TableCell>{rfq.title}</TableCell>
                      <TableCell>{rfq.jobNumber}</TableCell>
                      <TableCell>{rfq.category}</TableCell>
                      <TableCell>
                        <Badge variant={rfqStatusColors[rfq.status as keyof typeof rfqStatusColors]}>
                          {rfq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rfq.responseDeadline && format(new Date(rfq.responseDeadline), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rfq.responses?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rfq.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRfq(rfq);
                                setSendRfqDialog(true);
                              }}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {rfq.status === 'sent' && rfq.responses?.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: "View Quotes",
                                  description: "Navigate to Quotes tab to compare responses",
                                });
                              }}
                            >
                              Compare
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create RFQ Dialog */}
      <Dialog open={createRfqDialog} onOpenChange={setCreateRfqDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create RFQ from Requisition</DialogTitle>
            <DialogDescription>
              Create a Request for Quote from approved requisition: {selectedRequisition?.requisitionNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">RFQ Title</Label>
              <Input
                id="title"
                defaultValue={`RFQ for ${selectedRequisition?.requisitionNumber}`}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                defaultValue={selectedRequisition?.justification}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responseDeadline">Response Deadline</Label>
                <Input
                  id="responseDeadline"
                  type="date"
                  defaultValue={format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                <Select defaultValue="FOB">
                  <SelectTrigger id="deliveryTerms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOB">FOB</SelectItem>
                    <SelectItem value="CIF">CIF</SelectItem>
                    <SelectItem value="EXW">EXW</SelectItem>
                    <SelectItem value="DDP">DDP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRfqDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createRfqMutation.mutate({
                  requisitionId: selectedRequisition?.id,
                  title: `RFQ for ${selectedRequisition?.requisitionNumber}`,
                  description: selectedRequisition?.justification,
                });
              }}
            >
              Create RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send RFQ Dialog */}
      <Dialog open={sendRfqDialog} onOpenChange={setSendRfqDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send RFQ to Suppliers</DialogTitle>
            <DialogDescription>
              Select suppliers to send RFQ: {selectedRfq?.rfqNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {suppliers.length === 0 ? (
              <p className="text-muted-foreground">No suppliers available</p>
            ) : (
              suppliers.slice(0, 5).map((supplier: any) => (
                <div key={supplier.id} className="flex items-center space-x-2 p-2 border rounded">
                  <input type="checkbox" id={`supplier-${supplier.id}`} className="h-4 w-4" />
                  <Label htmlFor={`supplier-${supplier.id}`} className="flex-1 cursor-pointer">
                    <div>{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">{supplier.email}</div>
                  </Label>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendRfqDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                sendRfqMutation.mutate({
                  rfqId: selectedRfq?.id,
                  supplierIds: [1, 2, 3], // Demo: send to first 3 suppliers
                });
              }}
            >
              Send to Selected Suppliers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}