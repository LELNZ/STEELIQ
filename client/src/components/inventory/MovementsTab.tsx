import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, ArrowUp, ArrowDown, TruckIcon, AlertTriangle, Activity, Clock, Search } from "lucide-react";
import { format } from "date-fns";

interface InventoryMovement {
  id: number;
  movementType: string;
  movementNumber: string;
  materialId: number;
  materialName?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  quantity: number;
  unit: string;
  sourceJobId?: number;
  destinationJobId?: number;
  jobNumber?: string;
  purchaseOrderId?: number;
  performedBy: number;
  performedByName?: string;
  movementDate: Date;
  reason?: string;
  notes?: string;
  unitCost?: string;
  totalValue?: string;
  batchNumber?: string;
  serialNumber?: string;
  status: string;
}

export default function MovementsTab() {
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch movements
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['/api/inventory/movements']
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/inventory/movement-stats']
  });

  // Fetch low stock alerts
  const { data: lowStockAlerts = [] } = useQuery({
    queryKey: ['/api/inventory/low-stock-alerts'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch materials for dropdown
  const { data: materials = [] } = useQuery({
    queryKey: ['/api/materials']
  });

  // Fetch jobs for dropdown
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs']
  });

  // Create new movement
  const createMovementMutation = useMutation({
    mutationFn: (data: Partial<InventoryMovement>) => 
      apiRequest('/api/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movement-stats'] });
      setIsNewMovementOpen(false);
      toast({
        title: "Success",
        description: "Inventory movement recorded successfully"
      });
    }
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'issue': return <ArrowUp className="h-4 w-4 text-blue-500" />;
      case 'transfer': return <TruckIcon className="h-4 w-4 text-orange-500" />;
      case 'adjustment': return <Activity className="h-4 w-4 text-purple-500" />;
      case 'return': return <ArrowDown className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'receipt': return 'text-green-600';
      case 'issue': return 'text-blue-600';
      case 'transfer': return 'text-orange-600';
      case 'adjustment': return 'text-purple-600';
      case 'return': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const filteredMovements = movements.filter((movement: InventoryMovement) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return movement.movementNumber?.toLowerCase().includes(search) ||
           movement.materialName?.toLowerCase().includes(search) ||
           movement.jobNumber?.toLowerCase().includes(search) ||
           movement.batchNumber?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search movements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Dialog open={isNewMovementOpen} onOpenChange={setIsNewMovementOpen}>
          <DialogTrigger asChild>
            <Button>Record Movement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Inventory Movement</DialogTitle>
              <DialogDescription>Log material receipt, issue, transfer, or adjustment</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              createMovementMutation.mutate({
                movementType: formData.get('movementType') as string,
                materialId: parseInt(formData.get('materialId') as string),
                quantity: parseFloat(formData.get('quantity') as string),
                unit: formData.get('unit') as string,
                sourceLocation: formData.get('sourceLocation') as string || undefined,
                destinationLocation: formData.get('destinationLocation') as string || undefined,
                sourceJobId: formData.get('sourceJobId') ? parseInt(formData.get('sourceJobId') as string) : undefined,
                destinationJobId: formData.get('destinationJobId') ? parseInt(formData.get('destinationJobId') as string) : undefined,
                reason: formData.get('reason') as string || undefined,
                batchNumber: formData.get('batchNumber') as string || undefined,
                notes: formData.get('notes') as string || undefined,
                status: 'completed'
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="movementType">Movement Type</Label>
                  <Select name="movementType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt (Inbound)</SelectItem>
                      <SelectItem value="issue">Issue (Outbound)</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="materialId">Material</Label>
                  <Select name="materialId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material: any) => (
                        <SelectItem key={material.id} value={material.id.toString()}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input name="quantity" type="number" step="0.01" required />
                </div>
                
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select name="unit" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="m">Meters</SelectItem>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="sqm">Square Meters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sourceLocation">From Location</Label>
                  <Input name="sourceLocation" placeholder="e.g., Warehouse A" />
                </div>
                
                <div>
                  <Label htmlFor="destinationLocation">To Location</Label>
                  <Input name="destinationLocation" placeholder="e.g., Production Floor" />
                </div>
                
                <div>
                  <Label htmlFor="sourceJobId">From Job (optional)</Label>
                  <Select name="sourceJobId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {jobs.map((job: any) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobNumber} - {job.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="destinationJobId">To Job (optional)</Label>
                  <Select name="destinationJobId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {jobs.map((job: any) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobNumber} - {job.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input name="batchNumber" placeholder="e.g., BATCH-2025-001" />
                </div>
                
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select name="reason">
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production Use</SelectItem>
                      <SelectItem value="purchase_receipt">Purchase Receipt</SelectItem>
                      <SelectItem value="customer_return">Customer Return</SelectItem>
                      <SelectItem value="stock_count">Stock Count Adjustment</SelectItem>
                      <SelectItem value="damage">Damaged Goods</SelectItem>
                      <SelectItem value="scrap">Scrap/Waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input name="notes" placeholder="Additional information" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsNewMovementOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMovementMutation.isPending}>
                  Record Movement
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Low Stock Alerts</div>
            <div className="space-y-1">
              {lowStockAlerts.slice(0, 3).map((alert: any, idx: number) => (
                <div key={idx} className="text-sm">
                  {alert.materialName}: {alert.currentStock} {alert.unit} remaining (Reorder at {alert.reorderLevel})
                </div>
              ))}
              {lowStockAlerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{lowStockAlerts.length - 3} more items with low stock
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayReceipts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.todayReceiptsValue || 0} units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayIssues || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.todayIssuesValue || 0} units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.transfers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.adjustments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Turnover Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.turnoverRate || 0}x</div>
            <p className="text-xs text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.accuracy || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Stock accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>Complete audit trail of inventory transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading movements...
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No movements found
              </div>
            ) : (
              filteredMovements.map((movement: InventoryMovement) => (
                <div key={movement.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getMovementIcon(movement.movementType)}
                        <h4 className="font-medium">{movement.movementNumber}</h4>
                        <Badge variant="outline" className={getMovementColor(movement.movementType)}>
                          {movement.movementType}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Material:</span> {movement.materialName}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>{' '}
                          <span className={movement.movementType === 'issue' ? 'text-red-600' : 'text-green-600'}>
                            {movement.movementType === 'issue' ? '-' : '+'}
                            {movement.quantity} {movement.unit}
                          </span>
                        </div>
                        {movement.sourceLocation && (
                          <div>
                            <span className="text-muted-foreground">From:</span> {movement.sourceLocation}
                          </div>
                        )}
                        {movement.destinationLocation && (
                          <div>
                            <span className="text-muted-foreground">To:</span> {movement.destinationLocation}
                          </div>
                        )}
                        {movement.jobNumber && (
                          <div>
                            <span className="text-muted-foreground">Job:</span> {movement.jobNumber}
                          </div>
                        )}
                        {movement.batchNumber && (
                          <div>
                            <span className="text-muted-foreground">Batch:</span> {movement.batchNumber}
                          </div>
                        )}
                      </div>
                      
                      {movement.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{movement.notes}</p>
                      )}
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(movement.movementDate), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {movement.performedByName}
                      </p>
                      {movement.totalValue && (
                        <p className="text-sm font-medium mt-2">
                          ${parseFloat(movement.totalValue).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}