import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { 
  MapPin, 
  Clock, 
  User, 
  Smartphone, 
  Battery, 
  Wifi, 
  WifiOff,
  Navigation,
  CalendarIcon,
  MoreVertical,
  LogIn,
  LogOut,
  Coffee,
  AlertCircle,
  CheckCircle2,
  MapPinned
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
    signal: "strong" | "weak" | "none";
  };
  status: "active" | "completed" | "flagged";
  totalHours?: number;
  breaks: Array<{
    start: string;
    end?: string;
    type: "break" | "lunch";
  }>;
}

export default function TimeTrackingTab() {
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mapView, setMapView] = useState<boolean>(false);

  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/mobile-operations/time-entries", selectedSite, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSite !== "all") params.append("site", selectedSite);
      params.append("date", format(selectedDate, "yyyy-MM-dd"));
      
      const response = await fetch(`/api/mobile-operations/time-entries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch time entries");
      return response.json();
    },
  });

  const activeWorkers = timeEntries.filter(entry => entry.status === "active").length;
  const totalWorkers = timeEntries.length;
  const totalHoursToday = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

  const getSignalIcon = (signal: string) => {
    return signal === "strong" ? <Wifi className="h-4 w-4 text-green-600" /> : 
           signal === "weak" ? <Wifi className="h-4 w-4 text-yellow-600" /> : 
           <WifiOff className="h-4 w-4 text-red-600" />;
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return "text-green-600";
    if (level > 30) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "flagged":
        return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select job site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="warehouse">Warehouse Project Site</SelectItem>
              <SelectItem value="tower">Tower Construction Site</SelectItem>
              <SelectItem value="bridge">Bridge Renovation Site</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={mapView ? "default" : "outline"}
            size="sm"
            onClick={() => setMapView(!mapView)}
          >
            <MapPinned className="h-4 w-4 mr-1" />
            Map View
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              // Store time entries for payroll sync
              const dataForPayroll = {
                date: format(selectedDate, "yyyy-MM-dd"),
                site: selectedSite,
                entries: timeEntries.filter(entry => entry.status === "completed"),
                totalHours: totalHoursToday,
                activeWorkers: activeWorkers
              };
              sessionStorage.setItem('mobileTimeEntries', JSON.stringify(dataForPayroll));
              
              // Navigate to Time & Payroll
              window.location.href = '/time-payroll?sync=mobile';
            }}
          >
            <Clock className="h-4 w-4 mr-1" />
            Sync to Payroll
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Workers</p>
              <p className="text-2xl font-bold">{activeWorkers}/{totalWorkers}</p>
            </div>
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Hours Today</p>
              <p className="text-2xl font-bold">{totalHoursToday.toFixed(1)}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">GPS Accuracy</p>
              <p className="text-2xl font-bold">±5m</p>
            </div>
            <Navigation className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Compliance Rate</p>
              <p className="text-2xl font-bold">98%</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Time Entries List/Map View */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading time entries...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No time entries for selected date</div>
          ) : (
            timeEntries.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <h4 className="font-medium">{entry.employeeName}</h4>
                        <p className="text-sm text-muted-foreground">{entry.employeeNumber}</p>
                      </div>
                      {getStatusBadge(entry.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-muted-foreground" />
                        <span>Clock In: {format(new Date(entry.clockIn), "h:mm a")}</span>
                      </div>
                      
                      {entry.clockOut && (
                        <div className="flex items-center gap-2">
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                          <span>Clock Out: {format(new Date(entry.clockOut), "h:mm a")}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Total: {entry.totalHours?.toFixed(1) || "0.0"} hours</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.jobSite}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.deviceInfo.model}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Battery className={cn("h-4 w-4", getBatteryColor(entry.deviceInfo.battery))} />
                        <span>{entry.deviceInfo.battery}%</span>
                        {getSignalIcon(entry.deviceInfo.signal)}
                      </div>
                    </div>

                    {entry.breaks.length > 0 && (
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <Coffee className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.breaks.length} break(s) taken</span>
                      </div>
                    )}

                    {entry.location.accuracy > 10 && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>GPS accuracy warning: ±{entry.location.accuracy}m</span>
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
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>View on Map</DropdownMenuItem>
                      <DropdownMenuItem>Export Timesheet</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Flag Entry</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="p-4">
            <div className="text-center text-muted-foreground py-8">
              Timeline view showing worker movements throughout the day
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}