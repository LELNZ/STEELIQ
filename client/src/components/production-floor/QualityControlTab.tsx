import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardCheck,
  Camera,
  FileText,
  Search,
  Plus,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  Award,
  AlertTriangle,
  Eye,
  CheckCircle,
  Clock,
  Users,
  Upload,
  Smartphone,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  Ruler,
  Edit3,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface QualityInspection {
  id: number;
  inspectionNumber: string;
  inspectionType: string;
  jobId?: number;
  materialId?: number;
  productionEventId?: number;
  machineId?: number;
  partNumber?: string;
  quantity?: number;
  batchNumber?: string;
  inspectorId: number;
  inspectionDate: Date | string;
  status: string;
  specification?: string;
  toleranceMin?: number;
  toleranceMax?: number;
  actualMeasurement?: number;
  measurementUnit?: string;
  defectsFound?: any[];
  correctiveAction?: string;
  certificateNumber?: string;
  notes?: string;
  photos?: string[];
  attachments?: string[];
  approvedBy?: number;
  approvedAt?: Date | string;
  gpsLocation?: { lat: number; lng: number };
  capturedPhotos?: { url: string; timestamp: Date; gps?: { lat: number; lng: number } }[];
}

export default function QualityControlTab() {
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [isNewInspectionOpen, setIsNewInspectionOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get GPS location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  }, []);

  // Handle photo capture from mobile
  const handlePhotoCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    getCurrentLocation();
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const photoData = {
        url: e.target?.result as string,
        timestamp: new Date(),
        gps: currentLocation
      };
      
      // Add photo to current inspection
      toast({
        title: "Photo Captured",
        description: "Photo has been added to the inspection"
      });
    };
    reader.readAsDataURL(file);
  }, [currentLocation, toast, getCurrentLocation]);

  // Fetch inspections from quality endpoint
  const { data: inspections = [], isLoading } = useQuery<QualityInspection[]>({
    queryKey: ["/api/quality/inspections"],
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/quality/stats']
  });

  const createInspectionMutation = useMutation({
    mutationFn: (data: Partial<QualityInspection>) => 
      apiRequest('/api/quality/inspections', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quality/inspections'] });
      setIsNewInspectionOpen(false);
      toast({
        title: "Success",
        description: "Quality inspection created successfully"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/quality/inspections/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quality/inspections'] });
      toast({
        title: "Success",
        description: "Inspection status updated"
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'conditional': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'passed': return 'default';
      case 'failed': return 'destructive';
      case 'conditional': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with new inspection button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quality Control</h2>
          <p className="text-muted-foreground">Comprehensive inspection tracking and compliance management</p>
        </div>
        
        <Dialog open={isNewInspectionOpen} onOpenChange={setIsNewInspectionOpen}>
          <DialogTrigger asChild>
            <Button>New Inspection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Quality Inspection</DialogTitle>
              <DialogDescription>Record a new quality inspection</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              createInspectionMutation.mutate({
                inspectionType: formData.get('type') as string,
                partNumber: formData.get('partNumber') as string,
                quantity: parseInt(formData.get('quantity') as string),
                batchNumber: formData.get('batchNumber') as string,
                specification: formData.get('specification') as string,
                toleranceMin: parseFloat(formData.get('toleranceMin') as string),
                toleranceMax: parseFloat(formData.get('toleranceMax') as string),
                actualMeasurement: parseFloat(formData.get('actualMeasurement') as string),
                measurementUnit: formData.get('unit') as string,
                notes: formData.get('notes') as string,
                inspectionDate: new Date()
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Inspection Type</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material_receipt">Material Receipt</SelectItem>
                      <SelectItem value="in_process">In-Process</SelectItem>
                      <SelectItem value="final">Final Inspection</SelectItem>
                      <SelectItem value="pre_delivery">Pre-Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="partNumber">Part Number</Label>
                  <Input name="partNumber" required />
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input name="quantity" type="number" required />
                </div>
                
                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input name="batchNumber" />
                </div>
                
                <div>
                  <Label htmlFor="specification">Specification</Label>
                  <Input name="specification" placeholder="e.g., AS/NZS 5131" />
                </div>
                
                <div>
                  <Label htmlFor="unit">Measurement Unit</Label>
                  <Input name="unit" placeholder="mm, kg, etc." />
                </div>
                
                <div>
                  <Label htmlFor="toleranceMin">Min Tolerance</Label>
                  <Input name="toleranceMin" type="number" step="0.01" />
                </div>
                
                <div>
                  <Label htmlFor="toleranceMax">Max Tolerance</Label>
                  <Input name="toleranceMax" type="number" step="0.01" />
                </div>
                
                <div>
                  <Label htmlFor="actualMeasurement">Actual Measurement</Label>
                  <Input name="actualMeasurement" type="number" step="0.01" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea name="notes" rows={3} />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsNewInspectionOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInspectionMutation.isPending}>
                  Create Inspection
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.passRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInspections || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Defect Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.defectRate || 0}%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">-2.3%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingInspections || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">NCRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.nonConformances || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Open NCRs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="ncr">NCR Management</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inspections</CardTitle>
              <CardDescription>Track and manage quality inspections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspections.map((inspection: QualityInspection) => (
                  <div key={inspection.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(inspection.status)}
                          <h4 className="font-medium">{inspection.inspectionNumber}</h4>
                          <Badge variant={getStatusBadgeVariant(inspection.status)}>
                            {inspection.status}
                          </Badge>
                          <Badge variant="outline">{inspection.inspectionType}</Badge>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Part:</span> {inspection.partNumber}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Batch:</span> {inspection.batchNumber}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantity:</span> {inspection.quantity}
                          </div>
                        </div>
                        
                        {inspection.actualMeasurement && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Measurement:</span>{' '}
                            {inspection.actualMeasurement} {inspection.measurementUnit}
                            {inspection.toleranceMin && inspection.toleranceMax && (
                              <span className="text-muted-foreground">
                                {' '}(Tolerance: {inspection.toleranceMin}-{inspection.toleranceMax})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(inspection.inspectionDate), 'MMM dd, yyyy')}
                        </p>
                        {inspection.status === 'pending' && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateStatusMutation.mutate({ 
                                id: inspection.id, 
                                status: 'passed' 
                              })}
                            >
                              Pass
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatusMutation.mutate({ 
                                id: inspection.id, 
                                status: 'failed' 
                              })}
                            >
                              Fail
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {inspection.defectsFound && inspection.defectsFound.length > 0 && (
                      <Alert className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {inspection.defectsFound.length} defect(s) found
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {inspection.correctiveAction && (
                      <div className="mt-3 p-3 bg-secondary rounded-md">
                        <p className="text-sm font-medium">Corrective Action:</p>
                        <p className="text-sm text-muted-foreground">{inspection.correctiveAction}</p>
                      </div>
                    )}
                    
                    <div className="mt-3 flex gap-3">
                      {inspection.certificateNumber && (
                        <Button size="sm" variant="outline">
                          <FileText className="h-3 w-3 mr-1" />
                          Certificate
                        </Button>
                      )}
                      {inspection.photos && inspection.photos.length > 0 && (
                        <Button size="sm" variant="outline">
                          <Camera className="h-3 w-3 mr-1" />
                          Photos ({inspection.photos.length})
                        </Button>
                      )}
                      {inspection.attachments && inspection.attachments.length > 0 && (
                        <Button size="sm" variant="outline">
                          <Upload className="h-3 w-3 mr-1" />
                          Attachments ({inspection.attachments.length})
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {inspections.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No inspections found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NCR Management Tab */}
        <TabsContent value="ncr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Non-Conformance Reports</CardTitle>
              <CardDescription>Track and resolve quality issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">NCR-2025-001: Dimensional variance in beam assembly</div>
                    <div className="text-xs mt-1">Opened 2 days ago • Assigned to John Smith</div>
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">NCR-2025-002: Weld quality issue on Job #JOB-2025-003</div>
                    <div className="text-xs mt-1">Opened 5 days ago • Under investigation</div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mill Certificates & Test Reports</CardTitle>
              <CardDescription>Material and testing documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <FileText className="h-8 w-8 mb-2 text-blue-500" />
                  <h4 className="font-medium">MTC-2025-001</h4>
                  <p className="text-sm text-muted-foreground">Steel Plate 20mm - Heat #B2341</p>
                  <Button size="sm" variant="outline" className="mt-2">View PDF</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <FileText className="h-8 w-8 mb-2 text-blue-500" />
                  <h4 className="font-medium">WPS-2025-014</h4>
                  <p className="text-sm text-muted-foreground">Weld Procedure Specification</p>
                  <Button size="sm" variant="outline" className="mt-2">View PDF</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <FileText className="h-8 w-8 mb-2 text-blue-500" />
                  <h4 className="font-medium">NDT-2025-003</h4>
                  <p className="text-sm text-muted-foreground">Ultrasonic Test Report</p>
                  <Button size="sm" variant="outline" className="mt-2">View PDF</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
                <CardDescription>30-day quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>First Pass Yield</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '94.2%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Rework Rate</span>
                      <span className="font-medium">3.1%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: '3.1%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Scrap Rate</span>
                      <span className="font-medium">1.8%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '1.8%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>On-Time Inspection</span>
                      <span className="font-medium">88.5%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '88.5%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inspector Performance</CardTitle>
                <CardDescription>Inspection metrics by inspector</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emma Davis'].map((inspector, index) => (
                    <div key={inspector} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{inspector}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{20 + (index * 7)} inspections</p>
                        <p className="text-xs text-muted-foreground">{95 + index}% accuracy</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Defect Categories</CardTitle>
              <CardDescription>Distribution of defect types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { category: 'Dimensional', count: 12, percentage: 35 },
                  { category: 'Weld Quality', count: 8, percentage: 23 },
                  { category: 'Surface Finish', count: 7, percentage: 20 },
                  { category: 'Material', count: 5, percentage: 14 },
                  { category: 'Assembly', count: 3, percentage: 9 },
                  { category: 'Documentation', count: 2, percentage: 6 },
                  { category: 'Packaging', count: 1, percentage: 3 },
                  { category: 'Other', count: 1, percentage: 3 }
                ].map((item) => (
                  <div key={item.category} className="text-center">
                    <div className="text-2xl font-bold">{item.count}</div>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                    <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Matrix</CardTitle>
              <CardDescription>Standards and regulatory compliance status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { standard: 'AS/NZS 5131', description: 'Structural steelwork - Fabrication and erection', status: 'compliant' },
                  { standard: 'ISO 9001:2015', description: 'Quality management systems', status: 'compliant' },
                  { standard: 'ISO 3834', description: 'Quality requirements for fusion welding', status: 'compliant' },
                  { standard: 'AS/NZS 1554', description: 'Structural steel welding', status: 'review' },
                  { standard: 'ISO 14001', description: 'Environmental management', status: 'pending' }
                ].map((item) => (
                  <div key={item.standard} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-medium">{item.standard}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Badge variant={
                      item.status === 'compliant' ? 'default' :
                      item.status === 'review' ? 'secondary' : 'outline'
                    }>
                      {item.status}
                    </Badge>
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