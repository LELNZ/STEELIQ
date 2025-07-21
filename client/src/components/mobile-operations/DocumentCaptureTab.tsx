import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  FileText, 
  Upload,
  Download,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Image,
  FileBarChart,
  Scan,
  Tag,
  MoreVertical,
  Eye,
  Share2,
  Trash2,
  FolderOpen,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2
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

interface Document {
  id: string;
  fileName: string;
  type: "photo" | "scan" | "report" | "drawing";
  category: "safety" | "quality" | "progress" | "materials" | "timesheet";
  projectName: string;
  siteName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  status: "pending" | "synced" | "failed";
  tags: string[];
  gpsLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  thumbnail?: string;
  ocrText?: string;
  linkedTo?: {
    type: "job" | "inspection" | "material";
    id: string;
    name: string;
  };
}

export default function DocumentCaptureTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedView, setSelectedView] = useState<"grid" | "list">("grid");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/mobile-operations/documents", selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      
      const response = await fetch(`/api/mobile-operations/documents?${params}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  // Mock data for demonstration
  const mockDocuments: Document[] = [
    {
      id: "1",
      fileName: "beam_installation_01.jpg",
      type: "photo",
      category: "progress",
      projectName: "Warehouse Project",
      siteName: "Site A - North Wing",
      uploadedBy: "Adam Green",
      uploadedAt: new Date().toISOString(),
      fileSize: "2.4 MB",
      status: "synced",
      tags: ["beam", "installation", "structural"],
      gpsLocation: {
        lat: -37.8136,
        lng: 144.9631,
        address: "123 Industrial Dr"
      },
      thumbnail: "/api/placeholder/200/200",
      linkedTo: {
        type: "job",
        id: "JOB-2025-001",
        name: "Steel Frame Assembly"
      }
    },
    {
      id: "2",
      fileName: "safety_inspection_report.pdf",
      type: "report",
      category: "safety",
      projectName: "Tower Construction",
      siteName: "Level 5",
      uploadedBy: "Manny Magallanes",
      uploadedAt: new Date(Date.now() - 3600000).toISOString(),
      fileSize: "456 KB",
      status: "pending",
      tags: ["safety", "inspection", "compliance"],
      ocrText: "Site Safety Inspection Report..."
    },
    {
      id: "3",
      fileName: "material_receipt_scan.pdf",
      type: "scan",
      category: "materials",
      projectName: "Bridge Renovation",
      siteName: "Storage Area",
      uploadedBy: "Vili Pelenato",
      uploadedAt: new Date(Date.now() - 7200000).toISOString(),
      fileSize: "1.1 MB",
      status: "synced",
      tags: ["receipt", "delivery", "SHS200x200"],
      ocrText: "Delivery Note #DN-2025-456...",
      linkedTo: {
        type: "material",
        id: "MAT-001",
        name: "SHS 200x200x6"
      }
    }
  ];

  const displayDocuments = mockDocuments.length > 0 ? mockDocuments : documents;

  const filteredDocuments = displayDocuments.filter(doc =>
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <Image className="h-4 w-4" />;
      case "scan":
        return <Scan className="h-4 w-4" />;
      case "report":
        return <FileBarChart className="h-4 w-4" />;
      case "drawing":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "safety":
        return "bg-red-100 text-red-800";
      case "quality":
        return "bg-blue-100 text-blue-800";
      case "progress":
        return "bg-green-100 text-green-800";
      case "materials":
        return "bg-purple-100 text-purple-800";
      case "timesheet":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  // Calculate stats
  const totalDocuments = displayDocuments.length;
  const pendingSync = displayDocuments.filter(d => d.status === "pending").length;
  const totalSize = displayDocuments.reduce((sum, d) => {
    const size = parseFloat(d.fileSize);
    return sum + (d.fileSize.includes("MB") ? size : size / 1024);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
              <SelectItem value="timesheet">Timesheets</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={selectedView === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("grid")}
              className="h-8 px-3"
            >
              Grid
            </Button>
            <Button
              variant={selectedView === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("list")}
              className="h-8 px-3"
            >
              List
            </Button>
          </div>
        </div>

        <Button>
          <Camera className="h-4 w-4 mr-2" />
          Capture
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold">{totalDocuments}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Sync</p>
              <p className="text-2xl font-bold">{pendingSync}</p>
            </div>
            <Upload className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Size</p>
              <p className="text-2xl font-bold">{totalSize.toFixed(1)} MB</p>
            </div>
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Captures</p>
              <p className="text-2xl font-bold">45</p>
            </div>
            <Camera className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Documents View */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
      ) : selectedView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              {doc.type === "photo" && doc.thumbnail ? (
                <div className="aspect-square bg-gray-100 relative">
                  <img 
                    src={doc.thumbnail} 
                    alt={doc.fileName}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2">
                    {getStatusIcon(doc.status)}
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                  <div className="text-center">
                    {getTypeIcon(doc.type)}
                    <p className="text-xs text-muted-foreground mt-2">{doc.fileSize}</p>
                  </div>
                  <div className="absolute top-2 right-2">
                    {getStatusIcon(doc.status)}
                  </div>
                </div>
              )}
              
              <div className="p-3 space-y-2">
                <h4 className="font-medium text-sm truncate">{doc.fileName}</h4>
                <Badge className={cn("text-xs", getCategoryColor(doc.category))}>
                  {doc.category}
                </Badge>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doc.uploadedBy}</span>
                  <span>{format(new Date(doc.uploadedAt), "MMM d")}</span>
                </div>

                {doc.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {doc.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {doc.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{doc.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(doc.type)}
                    <div>
                      <h4 className="font-medium">{doc.fileName}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{doc.projectName}</span>
                        <span>{doc.fileSize}</span>
                        <span>{format(new Date(doc.uploadedAt), "MMM d, h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getCategoryColor(doc.category))}>
                      {doc.category}
                    </Badge>
                    {getStatusIcon(doc.status)}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}