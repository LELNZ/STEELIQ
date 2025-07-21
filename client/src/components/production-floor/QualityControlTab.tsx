import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface QualityInspection {
  id: string;
  workOrderNumber: string;
  projectName: string;
  inspectionType: "dimensional" | "visual" | "weld" | "coating" | "final";
  inspector: string;
  date: string;
  status: "pending" | "in-progress" | "passed" | "failed" | "conditional";
  overallScore: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  checkpoints: {
    category: string;
    items: {
      name: string;
      passed: boolean | null;
      notes: string;
      severity?: "critical" | "major" | "minor";
    }[];
  }[];
  photos: string[];
  certificate?: {
    number: string;
    issuedDate: string;
    standard: string;
  };
}

interface QualityMetrics {
  passRate: number;
  firstPassYield: number;
  defectDensity: number;
  customerComplaints: number;
  reworkRate: number;
  inspectionBacklog: number;
}

export default function QualityControlTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);

  const { data: inspections = [], isLoading } = useQuery<QualityInspection[]>({
    queryKey: ["/api/production-floor/quality-inspections"],
  });

  const { data: metrics } = useQuery<QualityMetrics>({
    queryKey: ["/api/production-floor/quality-metrics"],
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/production-floor/quality-inspections", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-floor/quality-inspections"] });
      setShowNewInspection(false);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "conditional":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "conditional":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <ClipboardCheck className="h-4 w-4" />;
    }
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = searchTerm === "" || 
      inspection.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || inspection.inspectionType === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Quality Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pass Rate</p>
              <p className="text-2xl font-bold">{metrics?.passRate || 0}%</p>
              <p className="text-xs text-green-600 mt-1">↑ 2% week</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">First Pass Yield</p>
              <p className="text-2xl font-bold">{metrics?.firstPassYield || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Target: 95%</p>
            </div>
            <Award className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Defect Density</p>
              <p className="text-2xl font-bold">{metrics?.defectDensity || 0}</p>
              <p className="text-xs text-red-600 mt-1">Per 1000 units</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Complaints</p>
              <p className="text-2xl font-bold">{metrics?.customerComplaints || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rework Rate</p>
              <p className="text-2xl font-bold">{metrics?.reworkRate || 0}%</p>
              <p className="text-xs text-yellow-600 mt-1">↓ 1% month</p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Backlog</p>
              <p className="text-2xl font-bold">{metrics?.inspectionBacklog || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending</p>
            </div>
            <ClipboardCheck className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Quality Alerts */}
      {metrics && metrics.defectDensity > 5 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Quality Alert</AlertTitle>
          <AlertDescription>
            Defect density has exceeded threshold. Review recent inspections and implement corrective actions.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dimensional">Dimensional</SelectItem>
            <SelectItem value="visual">Visual</SelectItem>
            <SelectItem value="weld">Weld Quality</SelectItem>
            <SelectItem value="coating">Coating</SelectItem>
            <SelectItem value="final">Final Inspection</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Quality Report
        </Button>

        <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Quality Inspection</DialogTitle>
              <DialogDescription>
                Record a new quality inspection for a work order
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Work Order</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WO-2025-001">WO-2025-001</SelectItem>
                      <SelectItem value="WO-2025-002">WO-2025-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Inspection Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dimensional">Dimensional</SelectItem>
                      <SelectItem value="visual">Visual</SelectItem>
                      <SelectItem value="weld">Weld Quality</SelectItem>
                      <SelectItem value="coating">Coating</SelectItem>
                      <SelectItem value="final">Final Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Inspector</Label>
                <Input placeholder="Inspector name" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Initial observations..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewInspection(false)}>
                Cancel
              </Button>
              <Button onClick={() => createInspectionMutation.mutate({})}>
                Start Inspection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inspections Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading inspections...</div>
      ) : filteredInspections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No inspections found</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Defects</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.map((inspection) => (
                <TableRow key={inspection.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{inspection.workOrderNumber}</p>
                      <p className="text-sm text-muted-foreground">{inspection.projectName}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {inspection.inspectionType}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>{inspection.inspector}</TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="text-sm">{format(new Date(inspection.date), "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(inspection.date), "h:mm a")}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={cn("text-xs", getStatusColor(inspection.status))}>
                      {getStatusIcon(inspection.status)}
                      <span className="ml-1">{inspection.status}</span>
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        inspection.overallScore >= 95 ? "text-green-600" :
                        inspection.overallScore >= 85 ? "text-yellow-600" :
                        "text-red-600"
                      )}>
                        {inspection.overallScore}%
                      </span>
                      {inspection.overallScore >= 95 && <Shield className="h-4 w-4 text-green-600" />}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-3 text-xs">
                      {inspection.criticalDefects > 0 && (
                        <span className="text-red-600 font-medium">
                          {inspection.criticalDefects} Critical
                        </span>
                      )}
                      {inspection.majorDefects > 0 && (
                        <span className="text-orange-600">
                          {inspection.majorDefects} Major
                        </span>
                      )}
                      {inspection.minorDefects > 0 && (
                        <span className="text-yellow-600">
                          {inspection.minorDefects} Minor
                        </span>
                      )}
                      {inspection.criticalDefects === 0 && 
                       inspection.majorDefects === 0 && 
                       inspection.minorDefects === 0 && (
                        <span className="text-green-600">None</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {inspection.certificate ? (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-xs">{inspection.certificate.number}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedInspection(inspection)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {inspection.photos.length > 0 && (
                        <Button variant="ghost" size="icon">
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                      {inspection.certificate && (
                        <Button variant="ghost" size="icon">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Quality Standards Reference */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Quality Standards & Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-medium text-sm mb-1">AS/NZS 3679.1</h4>
            <p className="text-xs text-muted-foreground">Structural steel - Hot-rolled bars and sections</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-medium text-sm mb-1">AS/NZS 1554</h4>
            <p className="text-xs text-muted-foreground">Structural steel welding standards</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-medium text-sm mb-1">AS/NZS 2312</h4>
            <p className="text-xs text-muted-foreground">Protection of steel against corrosion</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-medium text-sm mb-1">ISO 9001:2015</h4>
            <p className="text-xs text-muted-foreground">Quality management systems</p>
          </div>
        </div>
      </Card>
    </div>
  );
}