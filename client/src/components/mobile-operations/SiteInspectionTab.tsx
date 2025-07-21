import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  MapPin,
  Camera,
  Clipboard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Calendar,
  User,
  FileText,
  Tag,
  Clock,
  Navigation,
  Ruler,
  AlertCircle,
  Settings,
  Building,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface Inspection {
  id: string;
  projectName: string;
  siteName: string;
  inspector: string;
  date: string;
  status: "in-progress" | "completed" | "requires-action";
  type: "safety" | "quality" | "progress" | "compliance";
  completionRate: number;
  issuesFound: number;
  photosAttached: number;
  gpsLocation: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  items: {
    category: string;
    completed: number;
    total: number;
  }[];
}

export function SiteInspectionTab() {
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [selectedType, setSelectedType] = useState("all");

  const { data: inspections = [] } = useQuery<Inspection[]>({
    queryKey: ["/api/mobile-operations/inspections", selectedType],
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/inspection-templates"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "requires-action":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Action Required
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "safety":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "quality":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "progress":
        return <Clock className="h-4 w-4 text-purple-600" />;
      case "compliance":
        return <Clipboard className="h-4 w-4 text-green-600" />;
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inspections</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[200px]"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
          <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Start New Site Inspection</DialogTitle>
                <DialogDescription>
                  Select inspection type and project details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Inspection Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safety">Safety Inspection</SelectItem>
                        <SelectItem value="quality">Quality Check</SelectItem>
                        <SelectItem value="progress">Progress Report</SelectItem>
                        <SelectItem value="compliance">Compliance Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Template</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard-safety">Standard Safety Checklist</SelectItem>
                        <SelectItem value="welding-quality">Welding Quality Control</SelectItem>
                        <SelectItem value="site-progress">Site Progress Report</SelectItem>
                        <SelectItem value="as-nzs-compliance">AS/NZS Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label>Site Location</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Auto-detected" disabled />
                      <Button variant="outline" size="icon">
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Initial observations or special requirements..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewInspection(false)}>
                  Cancel
                </Button>
                <Button>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Start Inspection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Inspection Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Inspections</p>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground mt-1">3 completed</p>
            </div>
            <Clipboard className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Issues Found</p>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground mt-1">5 critical</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Photos Captured</p>
              <p className="text-2xl font-bold">156</p>
              <p className="text-xs text-muted-foreground mt-1">24.5 MB</p>
            </div>
            <Camera className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Compliance Rate</p>
              <p className="text-2xl font-bold">94%</p>
              <p className="text-xs text-muted-foreground mt-1">+2% this week</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Active Inspections */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Active Inspections</h3>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Project/Site</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon("safety")}
                    <span>Safety</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">Warehouse Project</p>
                    <p className="text-sm text-muted-foreground">Site A - North Wing</p>
                  </div>
                </TableCell>
                <TableCell>Adam Green</TableCell>
                <TableCell>9:15 AM</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground">75% (45/60 items)</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span>3</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    <span>12</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge("in-progress")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Continue
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon("quality")}
                    <span>Quality</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">Steel Platform Project</p>
                    <p className="text-sm text-muted-foreground">Welding Station 3</p>
                  </div>
                </TableCell>
                <TableCell>Manny Magallanes</TableCell>
                <TableCell>10:30 AM</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={100} className="h-2" />
                    <p className="text-xs text-muted-foreground">100% (25/25 items)</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>0</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    <span>18</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge("completed")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View Report
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon("progress")}
                    <span>Progress</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">Warehouse Project</p>
                    <p className="text-sm text-muted-foreground">Overall Site</p>
                  </div>
                </TableCell>
                <TableCell>Chipo Green</TableCell>
                <TableCell>8:00 AM</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={40} className="h-2" />
                    <p className="text-xs text-muted-foreground">40% (8/20 items)</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span>5</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    <span>24</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge("requires-action")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Resume
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Inspection Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Popular Templates</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Site Safety Checklist</p>
                  <p className="text-sm text-muted-foreground">120 items • AS/NZS 4801</p>
                </div>
              </div>
              <Badge variant="outline">Used 45 times</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Welding Quality Control</p>
                  <p className="text-sm text-muted-foreground">35 items • ISO 9606</p>
                </div>
              </div>
              <Badge variant="outline">Used 32 times</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Daily Progress Report</p>
                  <p className="text-sm text-muted-foreground">25 items • Custom</p>
                </div>
              </div>
              <Badge variant="outline">Used 28 times</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Recent Issues</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Missing Fall Protection</p>
                  <p className="text-sm text-muted-foreground">Warehouse Project - 30 mins ago</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">Critical</Badge>
                    <span className="text-xs text-muted-foreground">• Assigned to: Site Manager</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Incorrect Weld Specification</p>
                  <p className="text-sm text-muted-foreground">Platform Project - 2 hours ago</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">High</Badge>
                    <span className="text-xs text-muted-foreground">• Assigned to: QA Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}