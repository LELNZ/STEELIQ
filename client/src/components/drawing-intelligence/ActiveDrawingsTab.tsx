import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Search,
  Download,
  Eye,
  Trash2,
  Package,
  Calendar,
  User,
  BarChart3,
  MoreVertical,
  PenTool,
} from "lucide-react";
import { format } from "date-fns";

interface Drawing {
  id: string;
  fileName: string;
  projectName: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
  status: "processing" | "analyzed" | "error";
  steelMembers: number;
  connections: number;
  totalWeight: number;
  revisionNumber: string;
}

export function ActiveDrawingsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: drawings = [] } = useQuery<Drawing[]>({
    queryKey: ["/api/drawing-intelligence/drawings"],
  });

  const filteredDrawings = drawings.filter(
    (drawing) =>
      drawing.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drawing.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = (drawing: Drawing) => {
    // View drawing details
    console.log("View drawing:", drawing);
  };

  const handleDownload = (drawing: Drawing) => {
    // Download analysis results
    console.log("Download results:", drawing);
  };

  const handleDelete = (drawing: Drawing) => {
    // Delete drawing
    console.log("Delete drawing:", drawing);
  };

  const handlePDFMarkup = (drawing: Drawing) => {
    // Open drawing in PDF markup tool
    setLocation(`/pdf-markup?id=${drawing.id}`);
  };

  const handleGenerateTakeoff = (drawing: Drawing) => {
    // Generate material takeoff
    console.log("Generate takeoff:", drawing);
  };

  const getStatusBadge = (status: Drawing["status"]) => {
    switch (status) {
      case "analyzed":
        return <Badge variant="success">Analyzed</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Drawing Analysis</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drawings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Drawings</p>
                  <p className="text-2xl font-bold">{drawings.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Analyzed</p>
                  <p className="text-2xl font-bold">
                    {drawings.filter((d) => d.status === "analyzed").length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">
                    {drawings.filter((d) => d.status === "processing").length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="text-2xl font-bold">
                    {(drawings.reduce((sum, d) => sum + d.totalWeight, 0) / 1000).toFixed(1)}t
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drawing File</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Connections</TableHead>
                <TableHead className="text-right">Weight (kg)</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrawings.map((drawing) => (
                <TableRow key={drawing.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{drawing.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          Rev {drawing.revisionNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{drawing.projectName}</TableCell>
                  <TableCell className="capitalize">{drawing.type}</TableCell>
                  <TableCell>{getStatusBadge(drawing.status)}</TableCell>
                  <TableCell className="text-center">
                    {drawing.status === "analyzed" ? drawing.steelMembers : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {drawing.status === "analyzed" ? drawing.connections : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {drawing.status === "analyzed"
                      ? drawing.totalWeight.toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-3 w-3" />
                      <span>{drawing.uploadedBy}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(drawing.uploadedAt), "dd/MM/yyyy")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(drawing)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePDFMarkup(drawing)}>
                          <PenTool className="h-4 w-4 mr-2" />
                          PDF Markup
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateTakeoff(drawing)}>
                          <Package className="h-4 w-4 mr-2" />
                          Generate Takeoff
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(drawing)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Results
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(drawing)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredDrawings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No drawings found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}