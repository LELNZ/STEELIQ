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
  Clock,
  MapPin,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  Navigation,
  Smartphone,
  Battery,
  Signal,
  Download,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface TimeEntry {
  id: string;
  employeeName: string;
  employeeNumber: string;
  clockIn: string;
  clockOut?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    accuracy: number;
  };
  jobSite: string;
  deviceInfo: {
    model: string;
    battery: number;
    signal: string;
  };
  status: "active" | "completed" | "break";
  totalHours?: number;
  breaks: { start: string; end?: string }[];
}

export function TimeTrackingTab() {
  const [selectedSite, setSelectedSite] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/mobile-operations/time-entries", selectedSite, selectedDate],
  });

  const { data: sites } = useQuery({
    queryKey: ["/api/job-sites"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "break":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Coffee className="h-3 w-3 mr-1" />
            On Break
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSignalIcon = (signal: string) => {
    const signalLevel = signal === "strong" ? "text-green-600" : signal === "medium" ? "text-yellow-600" : "text-red-600";
    return <Signal className={`h-4 w-4 ${signalLevel}`} />;
  };

  const getBatteryIcon = (battery: number) => {
    const batteryColor = battery > 50 ? "text-green-600" : battery > 20 ? "text-yellow-600" : "text-red-600";
    return <Battery className={`h-4 w-4 ${batteryColor}`} />;
  };

  const activeWorkers = timeEntries.filter(entry => entry.status === "active").length;
  const totalHoursToday = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Job Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites?.map((site: any) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Timesheet
              </Button>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All
            </Button>
          </div>
        </div>
      </Card>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Workers</p>
              <p className="text-2xl font-bold">{activeWorkers}</p>
            </div>
            <User className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Hours Today</p>
              <p className="text-2xl font-bold">{totalHoursToday.toFixed(1)}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">GPS Accuracy</p>
              <p className="text-2xl font-bold">98%</p>
            </div>
            <Navigation className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Device Health</p>
              <p className="text-2xl font-bold">Good</p>
            </div>
            <Smartphone className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Live Time Tracking</h3>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Job Site</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div>
                    <p className="font-medium">Adam Green</p>
                    <p className="text-sm text-muted-foreground">EMP2025061</p>
                  </div>
                </TableCell>
                <TableCell>Warehouse Project Site</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <LogIn className="h-3 w-3 text-green-600" />
                    <span>7:32 AM</span>
                  </div>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>{getStatusBadge("active")}</TableCell>
                <TableCell>4.5</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">123 Industrial Dr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">±5m accuracy</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getBatteryIcon(85)}
                    <span className="text-xs">85%</span>
                    {getSignalIcon("strong")}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div>
                    <p className="font-medium">Manny Magallanes</p>
                    <p className="text-sm text-muted-foreground">EMP2025003</p>
                  </div>
                </TableCell>
                <TableCell>Steel Platform Project</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <LogIn className="h-3 w-3 text-green-600" />
                    <span>6:45 AM</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <LogOut className="h-3 w-3 text-red-600" />
                    <span>3:30 PM</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge("completed")}</TableCell>
                <TableCell>8.75</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">456 Factory Rd</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">±3m accuracy</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getBatteryIcon(42)}
                    <span className="text-xs">42%</span>
                    {getSignalIcon("medium")}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div>
                    <p className="font-medium">Vili Pelenato</p>
                    <p className="text-sm text-muted-foreground">EMP2025004</p>
                  </div>
                </TableCell>
                <TableCell>Warehouse Project Site</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <LogIn className="h-3 w-3 text-green-600" />
                    <span>7:15 AM</span>
                  </div>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>{getStatusBadge("break")}</TableCell>
                <TableCell>4.8</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">123 Industrial Dr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-yellow-600" />
                      <span className="text-xs text-muted-foreground">±12m accuracy</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getBatteryIcon(23)}
                    <span className="text-xs">23%</span>
                    {getSignalIcon("weak")}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* GPS Geofencing Status */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Site Geofencing</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Warehouse Project Site</p>
                  <p className="text-sm text-muted-foreground">123 Industrial Dr</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">2 workers</p>
                <p className="text-xs text-muted-foreground">In zone</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Steel Platform Project</p>
                  <p className="text-sm text-muted-foreground">456 Factory Rd</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-600">0 workers</p>
                <p className="text-xs text-muted-foreground">Site empty</p>
              </div>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium mb-2">Geofence Compliance</h4>
            <Progress value={98} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              98% of clock-ins within designated site boundaries
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}