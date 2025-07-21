import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Camera, 
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  Clock,
  MapPin,
  User,
  Eye,
  Download,
  Play,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  MoreVertical,
  FileSpreadsheet,
  PlusCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface Inspection {
  id: string;
  projectName: string;
  siteName: string;
  inspector: string;
  date: string;
  status: "in-progress" | "completed" | "draft";
  type: "safety" | "quality" | "progress" | "compliance";
  completionRate: number;
  issuesFound: number;
  photosAttached: number;
  gpsLocation: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  items: Array<{
    category: string;
    completed: number;
    total: number;
  }>;
}

interface InspectionTemplate {
  id: number;
  name: string;
  items: number;
  standard: string;
}

export default function SiteInspectionTab() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const { data: inspections = [], isLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/mobile-operations/inspections", selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.append("type", selectedType);
      
      const response = await fetch(`/api/mobile-operations/inspections?${params}`);
      if (!response.ok) throw new Error("Failed to fetch inspections");
      return response.json();
    },
  });

  const { data: templates = [] } = useQuery<InspectionTemplate[]>({
    queryKey: ["/api/inspection-templates"],
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/mobile-operations/inspections", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-operations/inspections"] });
      setShowNewInspection(false);
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "safety":
        return "bg-red-100 text-red-800";
      case "quality":
        return "bg-blue-100 text-blue-800";
      case "progress":
        return "bg-green-100 text-green-800";
      case "compliance":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string, completionRate: number) => {
    if (status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (status === "draft") {
      return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress ({completionRate}%)</Badge>;
    }
  };

  const filteredInspections = inspections.filter(inspection =>
    inspection.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspection.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspection.inspector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalInspections = inspections.length;
  const completedInspections = inspections.filter(i => i.status === "completed").length;
  const totalIssues = inspections.reduce((sum, i) => sum + i.issuesFound, 0);
  const avgCompletionRate = inspections.length > 0 
    ? Math.round(inspections.reduce((sum, i) => sum + i.completionRate, 0) / inspections.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Start New Inspection</DialogTitle>
              <DialogDescription>
                Select a template to begin your site inspection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose inspection template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.items} items • {template.standard}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                className="w-full" 
                disabled={!selectedTemplate}
                onClick={() => {
                  // In production, this would navigate to mobile inspection form
                  console.log("Starting inspection with template:", selectedTemplate);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Inspection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Inspections</p>
              <p className="text-2xl font-bold">{totalInspections}</p>
            </div>
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedInspections}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Issues Found</p>
              <p className="text-2xl font-bold">{totalIssues}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Completion</p>
              <p className="text-2xl font-bold">{avgCompletionRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Inspections List */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading inspections...</div>
          ) : (
            filteredInspections
              .filter(i => i.status === "in-progress" || i.status === "draft")
              .map((inspection) => (
                <InspectionCard key={inspection.id} inspection={inspection} />
              ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredInspections
            .filter(i => i.status === "completed")
            .map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredInspections.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InspectionCard({ inspection }: { inspection: Inspection }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "safety":
        return "bg-red-100 text-red-800";
      case "quality":
        return "bg-blue-100 text-blue-800";
      case "progress":
        return "bg-green-100 text-green-800";
      case "compliance":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string, completionRate: number) => {
    if (status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (status === "draft") {
      return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress ({completionRate}%)</Badge>;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <h4 className="font-medium">{inspection.projectName}</h4>
              <p className="text-sm text-muted-foreground">{inspection.siteName}</p>
            </div>
            <Badge className={getTypeColor(inspection.type)}>
              {inspection.type.charAt(0).toUpperCase() + inspection.type.slice(1)}
            </Badge>
            {getStatusBadge(inspection.status, inspection.completionRate)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{inspection.inspector}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(inspection.date), "MMM d, h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span>{inspection.photosAttached} photos</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>GPS ±{inspection.gpsLocation.accuracy}m</span>
            </div>
          </div>

          {inspection.status !== "completed" && (
            <div className="space-y-2">
              <Progress value={inspection.completionRate} className="h-2" />
              <div className="flex gap-4 text-sm">
                {inspection.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{item.category}:</span>
                    <span className="font-medium">{item.completed}/{item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspection.issuesFound > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{inspection.issuesFound} issue(s) found</span>
            </div>
          )}
        </div>

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
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Report
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Download Photos
            </DropdownMenuItem>
            {inspection.status !== "completed" && (
              <DropdownMenuItem>
                <Play className="h-4 w-4 mr-2" />
                Continue Inspection
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}