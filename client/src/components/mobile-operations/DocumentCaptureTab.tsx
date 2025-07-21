import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Camera,
  Upload,
  FileText,
  Image,
  Tag,
  Calendar,
  User,
  MapPin,
  FileType,
  Maximize2,
  Download,
  Share2,
  Trash2,
  Edit3,
  Plus,
  Search,
  Grid,
  List,
  Check,
  X,
  Eye,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Document {
  id: string;
  fileName: string;
  type: "photo" | "document" | "drawing";
  category: string;
  project: string;
  location: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  tags: string[];
  gpsLocation?: {
    lat: number;
    lng: number;
  };
  metadata: {
    deviceModel?: string;
    dimensions?: string;
    processedText?: string;
  };
  status: "uploading" | "processing" | "completed" | "failed";
}

export function DocumentCaptureTab() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCapture, setShowCapture] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/mobile-operations/documents", selectedCategory],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Processed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Upload className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case "uploading":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Upload className="h-3 w-3 mr-1" />
            Uploading
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800">
            <X className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <Image className="h-4 w-4 text-blue-600" />;
      case "document":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "drawing":
        return <FileType className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Dialog open={showCapture} onOpenChange={setShowCapture}>
            <DialogTrigger asChild>
              <Button>
                <Camera className="h-4 w-4 mr-2" />
                Capture Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Document Capture</DialogTitle>
                <DialogDescription>
                  Take a photo or upload a document from your device
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="camera">Camera</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="scan">QR/Barcode</TabsTrigger>
                </TabsList>
                <TabsContent value="camera" className="space-y-4">
                  <div className="aspect-[4/3] bg-black rounded-lg flex items-center justify-center">
                    <p className="text-white">Camera preview would appear here</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="safety">Safety Documentation</SelectItem>
                          <SelectItem value="quality">Quality Control</SelectItem>
                          <SelectItem value="progress">Progress Photos</SelectItem>
                          <SelectItem value="materials">Material Receipts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Project</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warehouse">Warehouse Project</SelectItem>
                          <SelectItem value="platform">Steel Platform Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Location: 123 Industrial Dr (±5m accuracy)
                    </span>
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop files here, or click to browse
                    </p>
                    <Button variant="outline">Choose Files</Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Supported formats: JPG, PNG, PDF, DWG, DXF (Max 50MB)
                  </p>
                </TabsContent>
                <TabsContent value="scan" className="space-y-4">
                  <div className="aspect-[4/3] bg-black rounded-lg flex items-center justify-center">
                    <p className="text-white">QR/Barcode scanner would appear here</p>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Point camera at QR code or barcode to scan
                  </p>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCapture(false)}>
                  Cancel
                </Button>
                <Button>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Document Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Captures</p>
              <p className="text-2xl font-bold">124</p>
              <p className="text-xs text-muted-foreground mt-1">82 photos, 42 docs</p>
            </div>
            <Camera className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold">2.4 GB</p>
              <Progress value={24} className="h-1 mt-2" />
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Processing Queue</p>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground mt-1">~2 min remaining</p>
            </div>
            <Upload className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">OCR Processed</p>
              <p className="text-2xl font-bold">94%</p>
              <p className="text-xs text-muted-foreground mt-1">Text extracted</p>
            </div>
            <Eye className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Document Grid/List View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="aspect-[4/3] bg-muted relative">
              <img
                src="/api/placeholder/400/300"
                alt="Document"
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-2 right-2 bg-white/90">
                <Image className="h-3 w-3 mr-1" />
                Photo
              </Badge>
            </div>
            <div className="p-4">
              <h4 className="font-medium truncate">Welding_Station_3_Quality.jpg</h4>
              <p className="text-sm text-muted-foreground mt-1">Steel Platform Project</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Manny M.</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>10:30 AM</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Welding Bay 3</span>
              </div>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">Quality</Badge>
                <Badge variant="outline" className="text-xs">Welding</Badge>
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="aspect-[4/3] bg-muted relative flex items-center justify-center">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <Badge className="absolute top-2 right-2 bg-white/90">
                <FileText className="h-3 w-3 mr-1" />
                Document
              </Badge>
            </div>
            <div className="p-4">
              <h4 className="font-medium truncate">Safety_Inspection_Report.pdf</h4>
              <p className="text-sm text-muted-foreground mt-1">Warehouse Project</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Adam G.</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>9:15 AM</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Site Office</span>
              </div>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">Safety</Badge>
                <Badge variant="outline" className="text-xs">Inspection</Badge>
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="aspect-[4/3] bg-muted relative">
              <img
                src="/api/placeholder/400/300"
                alt="Progress"
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-2 right-2 bg-white/90">
                <Image className="h-3 w-3 mr-1" />
                Photo
              </Badge>
              {getStatusBadge("processing")}
            </div>
            <div className="p-4">
              <h4 className="font-medium truncate">North_Wing_Progress_01.jpg</h4>
              <p className="text-sm text-muted-foreground mt-1">Warehouse Project</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Chipo G.</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>8:45 AM</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">North Wing</span>
              </div>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">Progress</Badge>
                <Badge variant="outline" className="text-xs">Structure</Badge>
              </div>
            </div>
            <div className="px-4 pb-4">
              <Progress value={65} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Processing... 65%</p>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Recent Documents</h3>
          </div>
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Project/Location</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{getTypeIcon("photo")}</TableCell>
                  <TableCell>
                    <p className="font-medium">Welding_Station_3_Quality.jpg</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">Steel Platform Project</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Welding Bay 3
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>Manny M.</TableCell>
                  <TableCell>10:30 AM</TableCell>
                  <TableCell>4.2 MB</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">Quality</Badge>
                      <Badge variant="outline" className="text-xs">Welding</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge("completed")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{getTypeIcon("document")}</TableCell>
                  <TableCell>
                    <p className="font-medium">Safety_Inspection_Report.pdf</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">Warehouse Project</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Site Office
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>Adam G.</TableCell>
                  <TableCell>9:15 AM</TableCell>
                  <TableCell>1.8 MB</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">Safety</Badge>
                      <Badge variant="outline" className="text-xs">Inspection</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge("completed")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Smart Tagging */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Smart Document Processing</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          <div>
            <h4 className="font-medium mb-3">Auto-detected Categories</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Safety Documentation</span>
                <Badge>32 docs</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Quality Control Photos</span>
                <Badge>28 docs</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Progress Reports</span>
                <Badge>45 docs</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Material Receipts</span>
                <Badge>19 docs</Badge>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">OCR Text Extraction</h4>
            <div className="bg-muted rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Latest Extraction</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From: Safety_Inspection_Report.pdf
                  </p>
                </div>
                <div className="text-sm bg-background p-3 rounded">
                  "Site Safety Inspection - Warehouse Project
                  Date: 21/07/2025
                  Inspector: Adam Green
                  All PPE requirements met..."
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  View Full Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}