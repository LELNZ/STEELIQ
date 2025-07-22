import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { 
  Play,
  Pause,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Search,
  Filter,
  FileText,
  Package,
  Wrench,
  Users,
  ArrowUpDown,
  Printer,
  QrCode,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  jobNumber: string;
  projectName: string;
  clientName: string;
  status: "pending" | "in-progress" | "completed" | "on-hold" | "quality-check";
  priority: "low" | "normal" | "high" | "urgent";
  startDate: string;
  dueDate: string;
  completionProgress: number;
  assignedTeam: string;
  currentStation: string;
  totalWeight: number;
  completedWeight: number;
  operations: {
    cutting: { progress: number; status: string };
    drilling: { progress: number; status: string };
    welding: { progress: number; status: string };
    painting: { progress: number; status: string };
  };
  qualityChecks: number;
  issues: number;
}

export default function WorkOrderTrackingTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/production-floor/work-orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest(`/api/production-floor/work-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-floor/work-orders"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      case "quality-check":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "normal":
        return "text-blue-600 bg-blue-50";
      case "low":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600";
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case "cutting":
        return <Package className="h-4 w-4" />;
      case "drilling":
        return <Wrench className="h-4 w-4" />;
      case "welding":
        return <Wrench className="h-4 w-4" />;
      case "painting":
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const filteredWorkOrders = workOrders.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="quality-check">Quality Check</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>

        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>

        <Button 
          variant="default"
          onClick={() => {
            // Store active work orders for resource planning sync
            const activeOrders = filteredWorkOrders.filter(order => 
              order.status === 'in-progress' || order.status === 'pending'
            );
            
            const dataForResourcePlanning = {
              date: new Date().toISOString(),
              workOrders: activeOrders.map(order => ({
                id: order.id,
                workOrderNumber: order.workOrderNumber,
                projectName: order.projectName,
                priority: order.priority,
                dueDate: order.dueDate,
                assignedTeam: order.assignedTeam,
                totalWeight: order.totalWeight,
                operations: order.operations,
                completionProgress: order.completionProgress
              })),
              totalActiveOrders: activeOrders.length,
              resourceRequirements: {
                teams: activeOrders.map(o => o.assignedTeam).filter((v, i, a) => a.indexOf(v) === i),
                urgentOrders: activeOrders.filter(o => o.priority === 'urgent').length,
                totalWeight: activeOrders.reduce((sum, o) => sum + o.totalWeight, 0)
              }
            };
            
            sessionStorage.setItem('productionFloorData', JSON.stringify(dataForResourcePlanning));
            
            // Navigate to Resource Planning
            window.location.href = '/resource-planning?sync=production';
          }}
        >
          <Users className="h-4 w-4 mr-2" />
          Sync to Resources
        </Button>
      </div>

      {/* Work Orders Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading work orders...</div>
      ) : filteredWorkOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No work orders found</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Project / Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Operations</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.workOrderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.jobNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.projectName}</p>
                      <p className="text-sm text-muted-foreground">{order.clientName}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={cn("text-xs", getStatusColor(order.status))}>
                      {order.status.replace("-", " ")}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(order.priority))}>
                      {order.priority}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{order.completionProgress}%</span>
                        <span className="text-muted-foreground">Overall</span>
                      </div>
                      <Progress value={order.completionProgress} className="h-2" />
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-3">
                      {Object.entries(order.operations).map(([op, data]) => (
                        <div key={op} className="text-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                            data.progress === 100 ? "bg-green-100" :
                            data.progress > 0 ? "bg-blue-100" : "bg-gray-100"
                          )}>
                            {getOperationIcon(op)}
                          </div>
                          <p className="text-xs">{data.progress}%</p>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{order.assignedTeam}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="text-sm">{format(new Date(order.dueDate), "MMM d")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.dueDate) < new Date() ? (
                          <span className="text-red-600">Overdue</span>
                        ) : (
                          `${Math.ceil((new Date(order.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`
                        )}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{order.completedWeight}/{order.totalWeight}t</p>
                      <Progress 
                        value={(order.completedWeight / order.totalWeight) * 100} 
                        className="h-1 w-16 mt-1" 
                      />
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
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
                        <DropdownMenuItem>
                          <Printer className="h-4 w-4 mr-2" />
                          Print Work Order
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <QrCode className="h-4 w-4 mr-2" />
                          Generate QR Code
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => updateStatusMutation.mutate({ 
                            id: order.id, 
                            status: "in-progress" 
                          })}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Production
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateStatusMutation.mutate({ 
                            id: order.id, 
                            status: "on-hold" 
                          })}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Put On Hold
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateStatusMutation.mutate({ 
                            id: order.id, 
                            status: "completed" 
                          })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground">Today's Output</h4>
          <p className="text-2xl font-bold">24.5t</p>
          <p className="text-xs text-green-600">+12% from yesterday</p>
        </Card>
        
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground">Active Orders</h4>
          <p className="text-2xl font-bold">
            {workOrders.filter(o => o.status === "in-progress").length}
          </p>
          <p className="text-xs text-muted-foreground">In production now</p>
        </Card>
        
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground">Quality Issues</h4>
          <p className="text-2xl font-bold">{workOrders.reduce((sum, o) => sum + o.issues, 0)}</p>
          <p className="text-xs text-red-600">3 critical</p>
        </Card>
        
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground">On-Time Rate</h4>
          <p className="text-2xl font-bold">92%</p>
          <p className="text-xs text-muted-foreground">This month</p>
        </Card>
      </div>
    </div>
  );
}