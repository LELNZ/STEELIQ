import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Play, Pause, Square, Calendar, MapPin, Users, CheckCircle, AlertCircle, Timer, Smartphone } from "lucide-react";
import { format, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";

interface TimeClock {
  id: number;
  userId: number;
  clockType: string;
  timestamp: string;
  location?: string;
  geolocation?: { lat: number; lng: number; accuracy: number };
  notes?: string;
  jobId?: number;
  taskId?: number;
}

interface Timesheet {
  id: number;
  userId: number;
  jobId?: number;
  taskId?: number;
  date: string;
  startTime: string;
  endTime?: string;
  breakDuration: number;
  totalHours?: number;
  overtimeHours?: number;
  hourlyRate?: number;
  totalPay?: number;
  workLocation: string;
  notes?: string;
  status: string;
  user?: { id: number; name: string; };
  job?: { id: number; title: string; };
  task?: { id: number; taskName: string; };
}

interface JobTask {
  id: number;
  jobId: number;
  taskName: string;
  description?: string;
  category?: string;
  priority: string;
  status: string;
  assignedTo?: number;
  estimatedHours?: number;
  actualHours?: number;
  skillLevel?: string;
  dueDate?: string;
  job?: { id: number; title: string; };
  assignee?: { id: number; name: string; };
}

const TASK_CATEGORIES = [
  "Cutting",
  "Welding", 
  "Assembly",
  "Grinding",
  "Painting",
  "Transport",
  "Quality Check",
  "Setup",
  "Cleanup",
  "Other"
];

const WORK_LOCATIONS = [
  "Workshop",
  "Site", 
  "Office",
  "Transport",
  "Client Site"
];

export default function TimeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("timeclock");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWorking, setIsWorking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        },
        (error) => console.log("Location access denied:", error)
      );
    }
  }, []);

  // Fetch today's time clocks
  const { data: todayClocks = [] } = useQuery({
    queryKey: ["/api/time/clocks/today"],
  });

  // Fetch week's timesheets
  const { data: weekTimesheets = [] } = useQuery({
    queryKey: ["/api/time/timesheets/week", format(selectedWeek, 'yyyy-MM-dd')],
  });

  // Fetch user's tasks
  const { data: userTasks = [] } = useQuery({
    queryKey: ["/api/time/tasks/assigned"],
  });

  // Fetch jobs for task assignment
  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Clock in/out mutation
  const clockMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/time/clock", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/timesheets/week"] });
      toast({
        title: "Success",
        description: "Time clock updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update time clock",
        variant: "destructive",
      });
    },
  });

  // Task update mutation
  const taskMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest(`/api/time/tasks/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/time/tasks", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/tasks/assigned"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const handleClockAction = (clockType: string, jobId?: number, taskId?: number) => {
    const clockData = {
      clockType,
      timestamp: new Date().toISOString(),
      location: currentLocation || "Unknown",
      geolocation: currentLocation ? {
        lat: parseFloat(currentLocation.split(',')[0]),
        lng: parseFloat(currentLocation.split(',')[1]),
        accuracy: 10
      } : null,
      jobId,
      taskId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    clockMutation.mutate(clockData);
    setIsWorking(clockType === "clock_in");
  };

  const getLastClock = () => {
    return todayClocks[0] || null;
  };

  const isCurrentlyClockedIn = () => {
    const lastClock = getLastClock();
    return lastClock && lastClock.clockType === "clock_in";
  };

  const getTotalHoursToday = () => {
    let totalMinutes = 0;
    let clockInTime: Date | null = null;

    todayClocks.forEach((clock: TimeClock) => {
      if (clock.clockType === "clock_in") {
        clockInTime = new Date(clock.timestamp);
      } else if (clock.clockType === "clock_out" && clockInTime) {
        const clockOutTime = new Date(clock.timestamp);
        const duration = clockOutTime.getTime() - clockInTime.getTime();
        totalMinutes += duration / (1000 * 60);
        clockInTime = null;
      }
    });

    // If currently clocked in, add time until now
    if (isCurrentlyClockedIn() && clockInTime) {
      const duration = currentTime.getTime() - clockInTime.getTime();
      totalMinutes += duration / (1000 * 60);
    }

    return (totalMinutes / 60).toFixed(2);
  };

  const TimeClockCard = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Time Clock
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-6">
          <div className="text-4xl font-bold mb-2">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-muted-foreground">
            {format(currentTime, 'EEEE, MMMM do, yyyy')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-600">
              {getTotalHoursToday()}h
            </div>
            <div className="text-sm text-muted-foreground">Hours Today</div>
          </div>
          <div className="text-center">
            <Badge variant={isCurrentlyClockedIn() ? "default" : "secondary"}>
              {isCurrentlyClockedIn() ? "Clocked In" : "Clocked Out"}
            </Badge>
          </div>
        </div>

        {currentLocation && (
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 mr-1" />
            <span>Location: {currentLocation}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {!isCurrentlyClockedIn() ? (
            <Button 
              onClick={() => handleClockAction("clock_in")}
              className="flex items-center"
              disabled={clockMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Clock In
            </Button>
          ) : (
            <Button 
              onClick={() => handleClockAction("clock_out")}
              variant="destructive"
              className="flex items-center"
              disabled={clockMutation.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              Clock Out
            </Button>
          )}
          
          <Button 
            onClick={() => handleClockAction(isCurrentlyClockedIn() ? "break_start" : "break_end")}
            variant="outline"
            className="flex items-center"
            disabled={clockMutation.isPending}
          >
            <Pause className="w-4 h-4 mr-2" />
            {isCurrentlyClockedIn() ? "Start Break" : "End Break"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TaskCard = ({ task }: { task: JobTask }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium mb-1">{task.taskName}</h3>
            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
            
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline">{task.category}</Badge>
              <Badge variant={
                task.priority === "urgent" ? "destructive" :
                task.priority === "high" ? "default" :
                task.priority === "medium" ? "secondary" : "outline"
              }>
                {task.priority}
              </Badge>
              <Badge variant={
                task.status === "completed" ? "default" :
                task.status === "in_progress" ? "secondary" : "outline"
              }>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Job:</span>
                <span className="ml-1">{task.job?.title || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Est. Hours:</span>
                <span className="ml-1">{task.estimatedHours || 'N/A'}</span>
              </div>
              {task.dueDate && (
                <div>
                  <span className="text-muted-foreground">Due:</span>
                  <span className="ml-1">{format(parseISO(task.dueDate), 'MMM dd')}</span>
                </div>
              )}
              {task.actualHours && (
                <div>
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="ml-1">{task.actualHours}h</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={task.status === "in_progress" ? "default" : "outline"}
              onClick={() => taskMutation.mutate({
                id: task.id,
                status: task.status === "in_progress" ? "completed" : "in_progress",
                startedAt: task.status !== "in_progress" ? new Date().toISOString() : undefined,
                completedAt: task.status === "in_progress" ? new Date().toISOString() : undefined
              })}
            >
              {task.status === "in_progress" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleClockAction("clock_in", task.jobId, task.id)}
              disabled={!isCurrentlyClockedIn()}
            >
              <Timer className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TimesheetRow = ({ timesheet }: { timesheet: Timesheet }) => (
    <tr className="border-b">
      <td className="py-2 px-3">
        {format(parseISO(timesheet.date), 'MMM dd')}
      </td>
      <td className="py-2 px-3">
        {timesheet.job?.title || 'General'}
      </td>
      <td className="py-2 px-3">
        {timesheet.task?.taskName || 'N/A'}
      </td>
      <td className="py-2 px-3">
        {format(parseISO(timesheet.startTime), 'HH:mm')}
      </td>
      <td className="py-2 px-3">
        {timesheet.endTime ? format(parseISO(timesheet.endTime), 'HH:mm') : '-'}
      </td>
      <td className="py-2 px-3">
        {timesheet.totalHours || '0.00'}h
      </td>
      <td className="py-2 px-3">
        <Badge variant={
          timesheet.status === "approved" ? "default" :
          timesheet.status === "submitted" ? "secondary" :
          timesheet.status === "rejected" ? "destructive" : "outline"
        }>
          {timesheet.status}
        </Badge>
      </td>
      <td className="py-2 px-3">
        {timesheet.workLocation}
      </td>
    </tr>
  );

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Time Management</h1>
          <p className="text-muted-foreground">Mobile-first time tracking for workshop and site</p>
        </div>
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-muted-foreground" />
          <Badge variant="outline">Mobile Ready</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeclock">Time Clock</TabsTrigger>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
        </TabsList>

        <TabsContent value="timeclock" className="space-y-4">
          <TimeClockCard />
          
          <Card>
            <CardHeader>
              <CardTitle>Today's Clock Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {todayClocks.length > 0 ? (
                <div className="space-y-2">
                  {todayClocks.map((clock: TimeClock) => (
                    <div key={clock.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <div>
                          <div className="font-medium capitalize">
                            {clock.clockType.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(clock.timestamp), 'HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                      {clock.location && (
                        <div className="text-sm text-muted-foreground">
                          {clock.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No clock activity today
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Assigned Tasks</h2>
            <Badge variant="outline">{userTasks.length} tasks</Badge>
          </div>
          
          {userTasks.length > 0 ? (
            <div>
              {userTasks.map((task: JobTask) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tasks Assigned</h3>
                <p className="text-muted-foreground">
                  Contact your supervisor for task assignments
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timesheets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weekly Timesheets</h2>
            <div className="flex items-center space-x-2">
              <Input
                type="week"
                value={format(selectedWeek, 'yyyy-\\WW')}
                onChange={(e) => setSelectedWeek(new Date(e.target.value))}
                className="w-40"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-3 font-medium">Date</th>
                      <th className="text-left py-3 px-3 font-medium">Job</th>
                      <th className="text-left py-3 px-3 font-medium">Task</th>
                      <th className="text-left py-3 px-3 font-medium">Start</th>
                      <th className="text-left py-3 px-3 font-medium">End</th>
                      <th className="text-left py-3 px-3 font-medium">Hours</th>
                      <th className="text-left py-3 px-3 font-medium">Status</th>
                      <th className="text-left py-3 px-3 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekTimesheets.length > 0 ? (
                      weekTimesheets.map((timesheet: Timesheet) => (
                        <TimesheetRow key={timesheet.id} timesheet={timesheet} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-muted-foreground">
                          No timesheets for this week
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {weekTimesheets.reduce((sum: number, ts: Timesheet) => sum + (parseFloat(ts.totalHours || '0')), 0).toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {weekTimesheets.reduce((sum: number, ts: Timesheet) => sum + (parseFloat(ts.overtimeHours || '0')), 0).toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Overtime</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${weekTimesheets.reduce((sum: number, ts: Timesheet) => sum + (parseFloat(ts.totalPay || '0')), 0).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Estimated Pay</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}