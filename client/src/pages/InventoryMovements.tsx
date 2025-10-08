import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, ArrowUp, ArrowDown, TruckIcon, AlertTriangle, BarChart3, Activity, Clock, Search } from "lucide-react";
import { format } from "date-fns";

interface InventoryMovement {
  id: number;
  movementType: string;
  movementNumber: string;
  materialId: number;
  materialName?: string;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  unitOfMeasure: string;
  jobId?: number;
  jobNumber?: string;
  purchaseOrderId?: number;
  poNumber?: string;
  performedBy: number;
  performedByName?: string;
  movementDate: Date;
  reason?: string;
  notes?: string;
  costPerUnit?: number;
  totalCost?: number;
  batchNumber?: string;
  serialNumbers?: string[];
  status: string;
}

export function InventoryMovements() {
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Movements</h1>
          <p className="text-muted-foreground">Track all inventory transactions and material movements</p>
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
                unitOfMeasure: formData.get('unitOfMeasure') as string,
                fromLocation: formData.get('fromLocation') as string,
                toLocation: formData.get('toLocation') as string,
                jobId: formData.get('jobId') ? parseInt(formData.get('jobId') as string) : undefined,
                reason: formData.get('reason') as string,
                batchNumber: formData.get('batchNumber') as string,
                notes: formData.get('notes') as string,
                movementDate: new Date()
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
                      <SelectItem value="1">Steel Plate 20mm</SelectItem>
                      <SelectItem value="2">Steel Beam H200</SelectItem>
                      <SelectItem value="3">Steel Pipe 100mm</SelectItem>
                      <SelectItem value="4">Welding Wire 1.2mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input name="quantity" type="number" step="0.01" required />
                </div>
                
                <div>
                  <Label htmlFor="unitOfMeasure">Unit</Label>
                  <Select name="unitOfMeasure" required>
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
                  <Label htmlFor="fromLocation">From Location</Label>
                  <Input name="fromLocation" placeholder="e.g., Warehouse A" />
                </div>
                
                <div>
                  <Label htmlFor="toLocation">To Location</Label>
                  <Input name="toLocation" placeholder="e.g., Production Floor" />
                </div>
                
                <div>
                  <Label htmlFor="jobId">Job Number (optional)</Label>
                  <Input name="jobId" placeholder="Link to job" />
                </div>
                
                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input name="batchNumber" placeholder="e.g., BATCH-2025-001" />
                </div>
                
                <div className="col-span-2">
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
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayReceipts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.todayReceiptsValue || 0} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayIssues || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.todayIssuesValue || 0} kg</p>
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
            <div className="text-2xl font-bold">{stats?.accuracy || 98.5}%</div>
            <p className="text-xs text-muted-foreground mt-1">Stock accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="movements">All Movements</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* All Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Movement History</CardTitle>
                  <CardDescription>Complete audit trail of inventory transactions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search movements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMovements.map((movement: InventoryMovement) => (
                  <div key={movement.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movementType)}
                          <h4 className="font-medium">{movement.movementNumber}</h4>
                          <Badge variant="outline" className={getMovementColor(movement.movementType)}>
                            {movement.movementType}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Material:</span> {movement.materialName}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>{' '}
                            <span className={movement.movementType === 'issue' ? 'text-red-600' : 'text-green-600'}>
                              {movement.movementType === 'issue' ? '-' : '+'}
                              {movement.quantity} {movement.unitOfMeasure}
                            </span>
                          </div>
                          {movement.fromLocation && (
                            <div>
                              <span className="text-muted-foreground">From:</span> {movement.fromLocation}
                            </div>
                          )}
                          {movement.toLocation && (
                            <div>
                              <span className="text-muted-foreground">To:</span> {movement.toLocation}
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
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(movement.movementDate), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {movement.performedByName}
                        </p>
                        {movement.totalCost && (
                          <p className="text-sm font-medium mt-2">
                            ${movement.totalCost.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredMovements.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No movements found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Receipts</CardTitle>
              <CardDescription>Inbound inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movements
                  .filter((m: InventoryMovement) => m.movementType === 'receipt')
                  .map((movement: InventoryMovement) => (
                    <div key={movement.id} className="border rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{movement.movementNumber}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {movement.materialName} - {movement.quantity} {movement.unitOfMeasure}
                          </p>
                          {movement.poNumber && (
                            <Badge variant="secondary" className="mt-2">PO: {movement.poNumber}</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{format(new Date(movement.movementDate), 'MMM dd, yyyy')}</p>
                          {movement.totalCost && (
                            <p className="text-sm font-medium">${movement.totalCost.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Issues</CardTitle>
              <CardDescription>Outbound inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movements
                  .filter((m: InventoryMovement) => m.movementType === 'issue')
                  .map((movement: InventoryMovement) => (
                    <div key={movement.id} className="border rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{movement.movementNumber}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {movement.materialName} - {movement.quantity} {movement.unitOfMeasure}
                          </p>
                          {movement.jobNumber && (
                            <Badge variant="secondary" className="mt-2">Job: {movement.jobNumber}</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{format(new Date(movement.movementDate), 'MMM dd, yyyy')}</p>
                          {movement.totalCost && (
                            <p className="text-sm font-medium text-red-600">-${movement.totalCost.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Movement Trends</CardTitle>
                <CardDescription>Daily movement volume (last 7 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...Array(7)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const receipts = Math.floor(Math.random() * 15) + 5;
                    const issues = Math.floor(Math.random() * 20) + 8;
                    
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{format(date, 'EEE')}</span>
                          <span className="text-muted-foreground">
                            +{receipts} / -{issues}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-2 bg-green-500 rounded-full" style={{ width: `${receipts * 3}%` }}></div>
                          <div className="h-2 bg-red-500 rounded-full" style={{ width: `${issues * 3}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Moving Materials</CardTitle>
                <CardDescription>Most active materials this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Steel Plate 20mm', movements: 145, volume: '12,450 kg' },
                    { name: 'Steel Beam H200', movements: 98, volume: '8,200 m' },
                    { name: 'Welding Wire 1.2mm', movements: 87, volume: '450 kg' },
                    { name: 'Steel Pipe 100mm', movements: 76, volume: '3,200 m' },
                    { name: 'Paint - Primer Grey', movements: 65, volume: '320 L' }
                  ].map((material) => (
                    <div key={material.name} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{material.name}</p>
                        <p className="text-xs text-muted-foreground">{material.volume}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{material.movements}</p>
                        <p className="text-xs text-muted-foreground">movements</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movement Summary by Type</CardTitle>
              <CardDescription>Distribution of movement types this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { type: 'Receipts', count: 234, percentage: 35, color: 'bg-green-500' },
                  { type: 'Issues', count: 312, percentage: 47, color: 'bg-blue-500' },
                  { type: 'Transfers', count: 56, percentage: 8, color: 'bg-orange-500' },
                  { type: 'Adjustments', count: 42, percentage: 6, color: 'bg-purple-500' },
                  { type: 'Returns', count: 28, percentage: 4, color: 'bg-yellow-500' }
                ].map((item) => (
                  <div key={item.type} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-secondary"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${item.percentage * 1.76} 176`}
                          className={item.color.replace('bg-', 'text-')}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold">{item.percentage}%</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.count} total</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}