import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Calendar, Clock, AlertTriangle, CheckCircle, 
  ArrowRight, Users, Wrench, TrendingUp 
} from "lucide-react";

export default function ProjectTimelineTab() {
  const projects = [
    {
      id: 1,
      jobNumber: "JOB-2025-001",
      name: "Steel Frame Warehouse",
      client: "BuildCorp Ltd",
      startDate: "Jan 15",
      dueDate: "Mar 1",
      progress: 65,
      status: "on-track",
      phase: "Fabrication",
      resourceConflicts: 0,
      criticalPath: ["Cutting", "Welding", "Assembly"],
      laborHours: { used: 156, total: 240 },
      equipmentHours: { used: 89, total: 140 }
    },
    {
      id: 2,
      jobNumber: "JOB-2025-002",
      name: "Bridge Support Structure",
      client: "Metro Development",
      startDate: "Jan 20",
      dueDate: "Feb 28",
      progress: 35,
      status: "at-risk",
      phase: "Cutting",
      resourceConflicts: 2,
      criticalPath: ["Material Delivery", "Cutting", "Welding"],
      laborHours: { used: 78, total: 320 },
      equipmentHours: { used: 45, total: 180 }
    },
    {
      id: 3,
      jobNumber: "JOB-2025-003",
      name: "Industrial Platform",
      client: "SteelWorks Inc",
      startDate: "Feb 1",
      dueDate: "Mar 15",
      progress: 15,
      status: "on-track",
      phase: "Planning",
      resourceConflicts: 1,
      criticalPath: ["Design Review", "Material Order", "Cutting"],
      laborHours: { used: 12, total: 180 },
      equipmentHours: { used: 0, total: 90 }
    }
  ];

  const resourceConflicts = [
    {
      date: "Feb 5",
      type: "Labor",
      resource: "Senior Welders",
      projects: ["JOB-2025-001", "JOB-2025-002"],
      impact: "2-day delay risk",
      resolution: "Overtime approved"
    },
    {
      date: "Feb 12",
      type: "Equipment",
      resource: "Plasma Cutter #1",
      projects: ["JOB-2025-002", "JOB-2025-003"],
      impact: "1-day delay risk",
      resolution: "Schedule adjustment needed"
    }
  ];

  const milestones = [
    { project: "JOB-2025-001", milestone: "Material Delivery", date: "Jan 20", status: "completed" },
    { project: "JOB-2025-001", milestone: "Cutting Complete", date: "Feb 5", status: "in-progress" },
    { project: "JOB-2025-002", milestone: "Design Approval", date: "Jan 25", status: "completed" },
    { project: "JOB-2025-002", milestone: "First Assembly", date: "Feb 15", status: "upcoming" },
    { project: "JOB-2025-003", milestone: "Material Order", date: "Feb 8", status: "upcoming" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track": return "bg-green-100 text-green-700";
      case "at-risk": return "bg-orange-100 text-orange-700";
      case "delayed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "upcoming": return <Calendar className="h-4 w-4 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Timeline Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Project Timelines</CardTitle>
              <CardDescription>Resource allocation and progress tracking across all projects</CardDescription>
            </div>
            <Button>Gantt View</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.jobNumber}</p>
                      <p className="text-sm text-muted-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{project.startDate}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{project.dueDate}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Phase: {project.phase}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={project.progress} className="h-2 w-24" />
                      <span className="text-xs">{project.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{project.laborHours.used}/{project.laborHours.total}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        <span>{project.equipmentHours.used}/{project.equipmentHours.total}h</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      {project.resourceConflicts > 0 && (
                        <p className="text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {project.resourceConflicts} conflicts
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">View Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resource Conflicts and Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Conflicts</CardTitle>
            <CardDescription>Upcoming resource allocation conflicts requiring resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resourceConflicts.map((conflict, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{conflict.date}</Badge>
                        <Badge variant={conflict.type === "Labor" ? "secondary" : "default"}>
                          {conflict.type}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{conflict.resource}</p>
                      <p className="text-xs text-muted-foreground">
                        Projects: {conflict.projects.join(", ")}
                      </p>
                      <p className="text-xs mt-1">
                        <span className="text-orange-600">Impact: {conflict.impact}</span>
                        {conflict.resolution && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="text-green-600">Resolution: {conflict.resolution}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">Resolve</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>Key project milestones in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-start gap-3">
                  {getMilestoneIcon(milestone.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {milestone.project}
                      </Badge>
                      <span className="text-sm font-medium">{milestone.milestone}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{milestone.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Optimization Suggestions</CardTitle>
          <CardDescription>AI-powered recommendations to improve project delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Fast-track JOB-2025-003 cutting phase</p>
              <p className="text-xs text-muted-foreground">
                Starting cutting 3 days early would avoid resource conflict on Feb 12 and improve delivery by 5 days
              </p>
            </div>
            <Button size="sm">Apply</Button>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Users className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Reallocate team from JOB-2025-001</p>
              <p className="text-xs text-muted-foreground">
                Project is ahead of schedule - move 2 welders to JOB-2025-002 to prevent delay
              </p>
            </div>
            <Button size="sm">Apply</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}