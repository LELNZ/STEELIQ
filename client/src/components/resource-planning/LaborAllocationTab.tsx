import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Clock, AlertCircle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";

export default function LaborAllocationTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const teamAllocation = [
    {
      id: 1,
      name: "Adam Green",
      role: "Senior Welder",
      avatar: null,
      currentJob: "JOB-2025-001",
      allocation: 100,
      hoursToday: 8,
      hoursWeek: 40,
      skills: ["MIG", "TIG", "6G"],
      status: "allocated",
      availability: []
    },
    {
      id: 2,
      name: "Manny Magallanes",
      role: "Fabricator",
      avatar: null,
      currentJob: "JOB-2025-002",
      allocation: 75,
      hoursToday: 6,
      hoursWeek: 35,
      skills: ["Cutting", "Assembly", "QC"],
      status: "allocated",
      availability: ["Fri PM"]
    },
    {
      id: 3,
      name: "Chipo Green",
      role: "Finisher",
      avatar: null,
      currentJob: "JOB-2025-001",
      allocation: 50,
      hoursToday: 4,
      hoursWeek: 28,
      skills: ["Grinding", "Painting", "QC"],
      status: "partial",
      availability: ["Thu", "Fri"]
    },
    {
      id: 4,
      name: "Vili Pelenato",
      role: "Apprentice Welder",
      avatar: null,
      currentJob: null,
      allocation: 0,
      hoursToday: 0,
      hoursWeek: 12,
      skills: ["MIG", "Cutting"],
      status: "available",
      availability: ["All week"]
    }
  ];

  const upcomingRequirements = [
    { date: "Feb 5", job: "JOB-2025-005", skill: "6G Welding", hours: 16, assigned: null },
    { date: "Feb 7", job: "JOB-2025-006", skill: "Plasma Cutting", hours: 8, assigned: null },
    { date: "Feb 10", job: "JOB-2025-007", skill: "TIG Welding", hours: 24, assigned: null },
  ];

  const skillGaps = [
    { skill: "Crane Operation", demand: 32, available: 8, gap: 24 },
    { skill: "Aluminum Welding", demand: 20, available: 12, gap: 8 },
    { skill: "CNC Programming", demand: 16, available: 0, gap: 16 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "allocated": return "bg-blue-100 text-blue-700";
      case "partial": return "bg-yellow-100 text-yellow-700";
      case "available": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Allocation Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Labor Allocation</CardTitle>
              <CardDescription>Current workforce assignment and availability</CardDescription>
            </div>
            <Button>Optimize Allocation</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Current Job</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Hours (Today/Week)</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamAllocation.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={worker.avatar || undefined} />
                        <AvatarFallback>{worker.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {worker.currentJob ? (
                      <Badge variant="outline">{worker.currentJob}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={worker.allocation} className="h-2 w-20" />
                      <span className="text-xs">{worker.allocation}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{worker.hoursToday}h / {worker.hoursWeek}h</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {worker.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(worker.status)}>
                      {worker.status === "available" ? "Available" : 
                       worker.availability.length > 0 ? worker.availability.join(", ") : "Fully allocated"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">Reassign</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Calendar and Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Labor Calendar</CardTitle>
            <CardDescription>View team availability by date</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Available on {selectedDate.toLocaleDateString()}</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Vili Pelenato - 8 hours</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Chipo Green - 4 hours</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Labor Requirements</CardTitle>
            <CardDescription>Unassigned work requiring allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingRequirements.map((req, index) => (
                <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{req.date}</span>
                      <Badge variant="outline">{req.job}</Badge>
                    </div>
                    <p className="text-sm">{req.skill} - {req.hours} hours</p>
                    {!req.assigned && (
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Unassigned
                      </p>
                    )}
                  </div>
                  <Button size="sm">Assign</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Gap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Gap Analysis</CardTitle>
          <CardDescription>Projected skill requirements vs available capacity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillGaps.map((gap) => (
              <div key={gap.skill} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{gap.skill}</span>
                  <div className="text-sm text-right">
                    <span className="text-muted-foreground">Gap: </span>
                    <span className="font-medium text-red-600">{gap.gap} hours</span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <div className="relative h-6 bg-muted rounded overflow-hidden">
                      <div 
                        className="absolute h-full bg-green-500" 
                        style={{ width: `${(gap.available / gap.demand) * 100}%` }}
                      />
                      <div 
                        className="absolute h-full bg-red-500/30" 
                        style={{ 
                          width: `${(gap.gap / gap.demand) * 100}%`,
                          left: `${(gap.available / gap.demand) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {gap.available}/{gap.demand}h
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm">Training Plan</Button>
            <Button size="sm" variant="outline">Hire Contractors</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}