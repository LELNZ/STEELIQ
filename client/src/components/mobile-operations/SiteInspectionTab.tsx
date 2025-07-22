import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  MapPin, 
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building,
  FileText,
  Upload,
  Download,
  MoreVertical,
  Ruler,
  Navigation,
  AlertCircle,
  Wrench
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { offlineStorage } from "@/lib/offline-storage";

interface InspectionChecklist {
  id: string;
  category: string;
  item: string;
  status: "pass" | "fail" | "na" | "pending";
  notes?: string;
  severity?: "critical" | "major" | "minor";
  photo?: string;
}

interface SiteInspection {
  id: string;
  projectId: string;
  projectName: string;
  siteName: string;
  inspectorName: string;
  inspectionDate: string;
  inspectionType: "safety" | "quality" | "progress" | "compliance";
  status: "in_progress" | "completed" | "requires_action";
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  weather: string;
  checklists: InspectionChecklist[];
  issues: Array<{
    id: string;
    description: string;
    severity: "critical" | "major" | "minor";
    category: string;
    assignedTo?: string;
    dueDate?: string;
    status: "open" | "resolved";
    photos: string[];
  }>;
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    timestamp: string;
    gpsLocation?: { lat: number; lng: number };
  }>;
  signature?: string;
  syncStatus: "synced" | "pending" | "failed";
}

export default function SiteInspectionTab() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeInspection, setActiveInspection] = useState<SiteInspection | null>(null);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: inspections = [], isLoading } = useQuery<SiteInspection[]>({
    queryKey: ["/api/mobile-operations/inspections", selectedProject],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedProject !== "all") params.append("projectId", selectedProject);
        
        const response = await fetch(`/api/mobile-operations/inspections?${params}`);
        if (!response.ok) throw new Error("Failed to fetch inspections");
        return response.json();
      } catch (error) {
        // Return offline data if available
        const offlineData = await offlineStorage.getCachedData("inspections");
        return offlineData || [];
      }
    },
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: Partial<SiteInspection>) => {
      if (!navigator.onLine) {
        // Save to offline storage
        await offlineStorage.saveTimeEntry({
          ...data,
          synced: false,
          timestamp: Date.now()
        });
        return data;
      }
      
      return apiRequest("POST", "/api/mobile-operations/inspections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-operations/inspections"] });
      setShowNewInspection(false);
      toast({
        title: "Inspection Created",
        description: "Site inspection has been started",
      });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ inspectionId, checklistId, status, notes }: any) => {
      const endpoint = `/api/mobile-operations/inspections/${inspectionId}/checklist/${checklistId}`;
      
      if (!navigator.onLine) {
        await offlineStorage.queueRequest({
          url: endpoint,
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes }),
          timestamp: Date.now(),
          retryCount: 0
        });
        return { status, notes };
      }
      
      return apiRequest("PATCH", endpoint, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-operations/inspections"] });
    },
  });

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // Handle photo upload
      toast({
        title: "Photo Captured",
        description: "Photo has been added to the inspection",
      });
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pass: { variant: "default", icon: CheckCircle2, className: "bg-green-100 text-green-800" },
      fail: { variant: "destructive", icon: XCircle },
      na: { variant: "secondary", icon: AlertCircle },
      pending: { variant: "outline", icon: Clock },
      in_progress: { variant: "outline", icon: Clock },
      completed: { variant: "default", icon: CheckCircle2 },
      requires_action: { variant: "destructive", icon: AlertTriangle },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={cn("gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: "bg-red-100 text-red-800",
      major: "bg-orange-100 text-orange-800",
      minor: "bg-yellow-100 text-yellow-800",
    };
    
    return (
      <Badge className={cn("gap-1", variants[severity])}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  // Mock checklist template
  const checklistTemplate: InspectionChecklist[] = [
    { id: "1", category: "Safety", item: "Site fencing secure", status: "pending" },
    { id: "2", category: "Safety", item: "Safety signage displayed", status: "pending" },
    { id: "3", category: "Safety", item: "PPE compliance", status: "pending" },
    { id: "4", category: "Safety", item: "Emergency exits clear", status: "pending" },
    { id: "5", category: "Quality", item: "Material storage proper", status: "pending" },
    { id: "6", category: "Quality", item: "Work area organized", status: "pending" },
    { id: "7", category: "Quality", item: "Documentation current", status: "pending" },
    { id: "8", category: "Progress", item: "Schedule adherence", status: "pending" },
    { id: "9", category: "Progress", item: "Resource availability", status: "pending" },
    { id: "10", category: "Compliance", item: "Permits displayed", status: "pending" },
  ];

  const handleNewInspection = () => {
    const newInspection: Partial<SiteInspection> = {
      projectName: "Warehouse Project",
      siteName: "Site A - North Wing",
      inspectorName: "Current User",
      inspectionDate: new Date().toISOString(),
      inspectionType: "safety",
      status: "in_progress",
      location: {
        lat: -36.8485,
        lng: 174.7633,
        address: "Auckland, New Zealand"
      },
      weather: "Clear",
      checklists: checklistTemplate,
      issues: [],
      photos: [],
      syncStatus: navigator.onLine ? "synced" : "pending"
    };
    
    createInspectionMutation.mutate(newInspection);
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="warehouse">Warehouse Project</SelectItem>
            <SelectItem value="office">Office Complex</SelectItem>
            <SelectItem value="bridge">Bridge Construction</SelectItem>
          </SelectContent>
        </Select>
        
        <Button onClick={handleNewInspection}>
          <ClipboardCheck className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </div>

      {/* Active Inspections */}
      <div className="grid gap-4">
        {inspections.length === 0 ? (
          <Card className="p-8 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Inspections</h3>
            <p className="text-muted-foreground mb-4">Start a new site inspection to begin</p>
            <Button onClick={handleNewInspection}>Start Inspection</Button>
          </Card>
        ) : (
          inspections.map((inspection) => (
            <Card key={inspection.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{inspection.projectName}</h3>
                  <p className="text-sm text-muted-foreground">{inspection.siteName}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {inspection.inspectorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(inspection.inspectionDate), "MMM d, yyyy h:mm a")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {inspection.location.address}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(inspection.status)}
                  {getStatusBadge(inspection.syncStatus)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        View Report
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Upload className="h-4 w-4 mr-2" />
                        Sync Now
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {inspection.checklists.filter(c => c.status === "pass").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {inspection.checklists.filter(c => c.status === "fail").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {inspection.checklists.filter(c => c.status === "na").length}
                  </div>
                  <div className="text-xs text-muted-foreground">N/A</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {inspection.checklists.filter(c => c.status === "pending").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>

              {/* Issues Summary */}
              {inspection.issues.length > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {inspection.issues.length} issue{inspection.issues.length > 1 ? "s" : ""} found requiring attention
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setActiveInspection(inspection)}
              >
                Continue Inspection
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Photo Capture Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />
    </div>
  );
}