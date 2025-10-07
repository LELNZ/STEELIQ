import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Package2, QrCode, BarChart3, Search, Plus, History, Printer, Settings, Eye, CheckCircle2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { ActionMenu } from "@/components/ui/action-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ZebraPrinterService, defaultPrinterConfig, type LabelData } from "@/lib/labelPrinter";
import { offlineSync } from "@/lib/offlineSync";

interface Remnant {
  id: number;
  qrCode: string;
  barcode: string;
  materialCode: string;
  materialName: string;
  length: number;
  width?: number;
  thickness?: number;
  weight?: number;
  status: "available" | "reserved" | "consumed";
  location?: string;
  rackNumber?: string;
  binNumber?: string;
  originalJobNumber?: string;
  parentJobNumber?: string;
  millCertificate?: string;
  heatNumber?: string;
  purchaseOrderNumber?: string;
  originalLength?: number;
  currentValue?: number;
  originalCost?: number;
  costPerKg?: number;
  reservedForJobId?: number;
  consumedDate?: Date;
  reuseCount: number;
  isLabeled: boolean;
  photoUrl?: string;
  notes?: string;
  createdDate: Date;
  lastUpdated: Date;
  createdBy: string;
  updatedBy: string;
}

interface RemnantStats {
  totalRemnants: number;
  totalValue: number;
  averageLength: number;
  utilizationRate: number;
  topMaterials: Array<{ materialCode: string; count: number }>;
  ageDistribution: {
    "0-30 days": number;
    "31-90 days": number;
    "91-180 days": number;
    ">180 days": number;
  };
}

export default function RemnantManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);
  const [printerConfig, setPrinterConfig] = useState(defaultPrinterConfig);
  const [printerStatus, setPrinterStatus] = useState<{ online: boolean; status: string } | null>(null);
  const [selectedRemnant, setSelectedRemnant] = useState<Remnant | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [showQRDialog, setShowQRDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    materialCode: "",
    materialName: "",
    length: "",
    width: "",
    thickness: "",
    weight: "",
    location: "",
    rackNumber: "",
    binNumber: "",
    millCertificate: "",
    heatNumber: "",
    originalJobNumber: "",
    originalCost: "",
    notes: ""
  });

  const [labelSettings, setLabelSettings] = useState({
    labelType: "both",
    labelSize: "medium",
    includePhoto: false
  });

  // Initialize offline sync on component mount
  useEffect(() => {
    offlineSync.initialize();
    offlineSync.setupNetworkListeners();
  }, []);

  // Fetch remnants
  const { data: remnants = [], isLoading } = useQuery<Remnant[]>({
    queryKey: ["/api/remnants"]
  });

  // Fetch stats
  const { data: stats } = useQuery<RemnantStats>({
    queryKey: ["/api/remnants/stats"]
  });

  // Create remnant mutation
  const createRemnantMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check if offline
      if (!offlineSync.isOnline()) {
        // Store operation for later sync
        await offlineSync.addPendingOperation({
          type: 'CREATE',
          endpoint: '/api/remnants',
          data: data
        });
        
        // Optimistically update UI
        return { ...data, id: Date.now(), status: 'pending_sync' };
      }
      
      return await apiRequest("/api/remnants", "POST", data);
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: offlineSync.isOnline() 
          ? "Remnant created successfully" 
          : "Remnant saved locally - will sync when online"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants/stats"] });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update remnant mutation
  const updateRemnantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/remnants/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Remnant updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants/stats"] });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete (consume) remnant mutation
  const deleteRemnantMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/remnants/${id}`, "DELETE", { reason: deleteReason });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Remnant marked as consumed" });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants/stats"] });
      setShowDeleteDialog(false);
      setSelectedRemnant(null);
      setDeleteReason("");
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Generate label mutation
  const generateLabelMutation = useMutation({
    mutationFn: async (remnantId: number) => {
      const response = await apiRequest(`/api/remnants/${remnantId}/label`, "POST", labelSettings);
      
      // Now send to printer
      if (response && response.remnant) {
        const printer = new ZebraPrinterService(printerConfig);
        const labelData: LabelData = {
          qrCode: response.remnant.qrCode,
          materialCode: response.remnant.materialCode,
          dimensions: `${response.remnant.length}mm`,
          location: response.remnant.location || "N/A",
          millCertificate: response.remnant.millCertificate,
          date: new Date().toLocaleDateString(),
          remnantId: response.remnant.id.toString()
        };
        
        // Add width and thickness if available
        if (response.remnant.width) {
          labelData.dimensions += ` × ${response.remnant.width}mm`;
        }
        if (response.remnant.thickness) {
          labelData.dimensions += ` × ${response.remnant.thickness}mm`;
        }
        
        await printer.printLabel(labelData);
      }
      
      return response;
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Label printed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/remnants"] });
      setShowLabelDialog(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      materialCode: "",
      materialName: "",
      length: "",
      width: "",
      thickness: "",
      weight: "",
      location: "",
      rackNumber: "",
      binNumber: "",
      millCertificate: "",
      heatNumber: "",
      originalJobNumber: "",
      originalCost: "",
      notes: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRemnantMutation.mutate({
      ...formData,
      length: parseFloat(formData.length),
      width: formData.width ? parseFloat(formData.width) : undefined,
      thickness: formData.thickness ? parseFloat(formData.thickness) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      originalCost: formData.originalCost ? parseFloat(formData.originalCost) : undefined
    });
  };

  const getAgeInDays = (date: Date) => {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getAgeColor = (date: Date) => {
    const age = getAgeInDays(date);
    if (age > 180) return "text-red-600";
    if (age > 90) return "text-orange-600";
    if (age > 30) return "text-yellow-600";
    return "text-green-600";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading remnant data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Remnant Management System</h1>
          <p className="text-sm text-muted-foreground">Track and optimize steel remnants for maximum utilization</p>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Remnant
        </Button>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Remnants"
            value={stats.totalRemnants.toString()}
            subtitle="Available for reuse"
            icon={<Package2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <MetricCard
            title="Total Value"
            value={`$${stats.totalValue.toFixed(2)}`}
            subtitle="Current inventory value"
            icon={<BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <MetricCard
            title="Average Length"
            value={`${stats.averageLength.toFixed(0)}mm`}
            subtitle="Per remnant piece"
            icon={<Package2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <MetricCard
            title="Utilization Rate"
            value={`${stats.utilizationRate}%`}
            subtitle="Remnant reuse efficiency"
            icon={<BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Age Distribution */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Remnant inventory aging analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">{stats.ageDistribution["0-30 days"]}</div>
                    <div className="text-sm text-muted-foreground">0-30 days</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-yellow-600">{stats.ageDistribution["31-90 days"]}</div>
                    <div className="text-sm text-muted-foreground">31-90 days</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-orange-600">{stats.ageDistribution["91-180 days"]}</div>
                    <div className="text-sm text-muted-foreground">91-180 days</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-red-600">{stats.ageDistribution[">180 days"]}</div>
                    <div className="text-sm text-muted-foreground">&gt;180 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common remnant management tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="justify-start">
                <QrCode className="mr-2 h-4 w-4" />
                Scan QR Code
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setShowPrinterSetup(true)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Labels
              </Button>
              <Button variant="outline" className="justify-start">
                <Search className="mr-2 h-4 w-4" />
                Find Remnants for Job
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Remnant Inventory</CardTitle>
              <CardDescription>All available remnant pieces</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remnants.map((remnant) => (
                    <TableRow key={remnant.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{remnant.materialCode}</div>
                          <div className="text-sm text-muted-foreground">{remnant.materialName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          L: {remnant.length}mm
                          {remnant.width && ` × W: ${remnant.width}mm`}
                          {remnant.thickness && ` × T: ${remnant.thickness}mm`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {remnant.location || "N/A"}
                          {remnant.rackNumber && ` - Rack ${remnant.rackNumber}`}
                          {remnant.binNumber && ` - Bin ${remnant.binNumber}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${getAgeColor(remnant.createdDate)}`}>
                          {getAgeInDays(remnant.createdDate)} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={remnant.status} />
                      </TableCell>
                      <TableCell>${remnant.currentValue?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label: "View QR Code",
                              onClick: () => {
                                setSelectedRemnant(remnant);
                                setShowQRDialog(true);
                              }
                            },
                            {
                              label: "View",
                              onClick: () => {
                                setSelectedRemnant(remnant);
                                // In production, this would open a detail view
                              }
                            },
                            {
                              label: "Edit",
                              onClick: () => {
                                setSelectedRemnant(remnant);
                                // In production, this would open edit dialog
                              }
                            },
                            {
                              label: "Print Label",
                              icon: <Printer className="h-4 w-4" />,
                              onClick: () => {
                                setSelectedRemnant(remnant);
                                setShowLabelDialog(true);
                              }
                            },
                            {
                              label: "View History",
                              icon: <History className="h-4 w-4" />,
                              onClick: () => {
                                // In production, show remnant history
                                console.log("View history for", remnant.id);
                              }
                            },
                            {
                              label: "Delete",
                              onClick: () => {
                                setSelectedRemnant(remnant);
                                setShowDeleteDialog(true);
                              },
                              variant: "destructive",
                              separator: true
                            }
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Remnant History</CardTitle>
              <CardDescription>Track all remnant activities and modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">History tracking coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Remnant Settings</CardTitle>
              <CardDescription>Configure remnant management preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Minimum Remnant Length</Label>
                <Input type="number" placeholder="500" defaultValue="500" />
                <p className="text-sm text-muted-foreground">
                  Pieces shorter than this will not be tracked as remnants
                </p>
              </div>
              <div className="space-y-2">
                <Label>Auto-consume Age</Label>
                <Input type="number" placeholder="365" defaultValue="365" />
                <p className="text-sm text-muted-foreground">
                  Automatically mark remnants as consumed after this many days
                </p>
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Remnant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Remnant</DialogTitle>
            <DialogDescription>
              Create a new remnant entry for tracking and reuse
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="materialCode">Material Code *</Label>
                <Input
                  id="materialCode"
                  value={formData.materialCode}
                  onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialName">Material Name *</Label>
                <Input
                  id="materialName"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="length">Length (mm) *</Label>
                <Input
                  id="length"
                  type="number"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thickness">Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  value={formData.thickness}
                  onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Warehouse A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rackNumber">Rack Number</Label>
                <Input
                  id="rackNumber"
                  value={formData.rackNumber}
                  onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                  placeholder="e.g., R12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="binNumber">Bin Number</Label>
                <Input
                  id="binNumber"
                  value={formData.binNumber}
                  onChange={(e) => setFormData({ ...formData, binNumber: e.target.value })}
                  placeholder="e.g., B3"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="millCertificate">Mill Certificate</Label>
                <Input
                  id="millCertificate"
                  value={formData.millCertificate}
                  onChange={(e) => setFormData({ ...formData, millCertificate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heatNumber">Heat Number</Label>
                <Input
                  id="heatNumber"
                  value={formData.heatNumber}
                  onChange={(e) => setFormData({ ...formData, heatNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originalJobNumber">Original Job Number</Label>
                <Input
                  id="originalJobNumber"
                  value={formData.originalJobNumber}
                  onChange={(e) => setFormData({ ...formData, originalJobNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalCost">Original Cost ($)</Label>
                <Input
                  id="originalCost"
                  type="number"
                  step="0.01"
                  value={formData.originalCost}
                  onChange={(e) => setFormData({ ...formData, originalCost: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRemnantMutation.isPending}>
                {createRemnantMutation.isPending ? "Creating..." : "Create Remnant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Label Generation Dialog */}
      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Label</DialogTitle>
            <DialogDescription>
              Configure label settings for remnant {selectedRemnant?.materialCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label Type</Label>
              <Select
                value={labelSettings.labelType}
                onValueChange={(value) => setLabelSettings({ ...labelSettings, labelType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qr">QR Code Only</SelectItem>
                  <SelectItem value="barcode">Barcode Only</SelectItem>
                  <SelectItem value="both">Both QR & Barcode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Label Size</Label>
              <Select
                value={labelSettings.labelSize}
                onValueChange={(value) => setLabelSettings({ ...labelSettings, labelSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (50x25mm)</SelectItem>
                  <SelectItem value="medium">Medium (100x50mm)</SelectItem>
                  <SelectItem value="large">Large (150x75mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includePhoto"
                checked={labelSettings.includePhoto}
                onChange={(e) => setLabelSettings({ ...labelSettings, includePhoto: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="includePhoto">Include photo on label</Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLabelDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedRemnant && generateLabelMutation.mutate(selectedRemnant.id)}
                disabled={generateLabelMutation.isPending}
              >
                <Printer className="mr-2 h-4 w-4" />
                {generateLabelMutation.isPending ? "Generating..." : "Generate Label"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Remnant as Consumed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the remnant {selectedRemnant?.materialCode} as consumed and remove it from available inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            <Label htmlFor="deleteReason">Reason for consumption</Label>
            <Textarea
              id="deleteReason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g., Used for Job #12345, Damaged, Too small for reuse"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRemnant && deleteRemnantMutation.mutate(selectedRemnant.id)}
              disabled={!deleteReason || deleteRemnantMutation.isPending}
            >
              {deleteRemnantMutation.isPending ? "Processing..." : "Mark as Consumed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Display Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remnant QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to quickly identify this remnant
            </DialogDescription>
          </DialogHeader>
          {selectedRemnant && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                {/* QR Code Display */}
                <div className="mx-auto mb-4 p-4 bg-white rounded border-2 border-gray-200">
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-24 h-24 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">{selectedRemnant.qrCode}</p>
                    </div>
                  </div>
                </div>
                
                {/* Remnant Details */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Material:</span>
                    <span className="font-medium">{selectedRemnant.materialCode}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Length:</span>
                    <span className="font-medium">{selectedRemnant.length}mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {selectedRemnant.location || "N/A"}
                      {selectedRemnant.rackNumber && ` - Rack ${selectedRemnant.rackNumber}`}
                      {selectedRemnant.binNumber && ` - Bin ${selectedRemnant.binNumber}`}
                    </span>
                  </div>
                  {selectedRemnant.millCertificate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mill Cert:</span>
                      <span className="font-medium">{selectedRemnant.millCertificate}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowQRDialog(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setShowQRDialog(false);
                    setShowLabelDialog(true);
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Label
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Printer Setup Dialog */}
      <Dialog open={showPrinterSetup} onOpenChange={setShowPrinterSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Printer Configuration</DialogTitle>
            <DialogDescription>
              Configure your Zebra label printer for remnant labeling
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Printer Status */}
            {printerStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                printerStatus.online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {printerStatus.online ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {printerStatus.online ? 'Printer Online' : 'Printer Offline'}
                </span>
                <span className="text-sm">- {printerStatus.status}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="printerIp">Printer IP Address</Label>
              <Input
                id="printerIp"
                value={printerConfig.ip}
                onChange={(e) => setPrinterConfig({ ...printerConfig, ip: e.target.value })}
                placeholder="192.168.1.100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="printerPort">Port</Label>
              <Input
                id="printerPort"
                type="number"
                value={printerConfig.port}
                onChange={(e) => setPrinterConfig({ ...printerConfig, port: parseInt(e.target.value) })}
                placeholder="9100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dpi">Print Resolution (DPI)</Label>
              <Select
                value={printerConfig.dpi.toString()}
                onValueChange={(value) => setPrinterConfig({ ...printerConfig, dpi: parseInt(value) as 203 | 300 | 600 })}
              >
                <SelectTrigger id="dpi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="203">203 DPI</SelectItem>
                  <SelectItem value="300">300 DPI (Recommended)</SelectItem>
                  <SelectItem value="600">600 DPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labelWidth">Label Width (mm)</Label>
                <Input
                  id="labelWidth"
                  type="number"
                  value={printerConfig.labelWidth}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, labelWidth: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelHeight">Label Height (mm)</Label>
                <Input
                  id="labelHeight"
                  type="number"
                  value={printerConfig.labelHeight}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, labelHeight: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  const printer = new ZebraPrinterService(printerConfig);
                  const status = await printer.getStatus();
                  setPrinterStatus(status);
                }}
              >
                Test Connection
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowPrinterSetup(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    const printer = new ZebraPrinterService(printerConfig);
                    const success = await printer.testConnection();
                    if (success) {
                      toast({ title: "Success", description: "Test print sent successfully" });
                    } else {
                      toast({ 
                        title: "Error", 
                        description: "Failed to connect to printer",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Test Print
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}