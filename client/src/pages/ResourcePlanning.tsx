import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, Users, Wrench, TrendingUp, AlertCircle, 
  CheckCircle, Clock, BarChart3, Activity, Settings
} from "lucide-react";
import CapacityPlanningTab from "@/components/resource-planning/CapacityPlanningTab";
import LaborAllocationTab from "@/components/resource-planning/LaborAllocationTab";
import EquipmentSchedulingTab from "@/components/resource-planning/EquipmentSchedulingTab";
import ProjectTimelineTab from "@/components/resource-planning/ProjectTimelineTab";

export default function ResourcePlanning() {
  const [activeTab, setActiveTab] = useState("capacity");

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold">Resource Planning & Capacity Management</h1>
            <Badge variant="info" className="text-base px-3 py-1">
              PHASE 1
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Optimize workshop capacity, manage labor allocation, and schedule equipment for maximum efficiency
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Workshop Capacity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <Progress value={78} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">Optimal: 75-85%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Labor Utilization</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">82%</div>
              <Progress value={82} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">4 available workers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Equipment Usage</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">65%</div>
              <Progress value={65} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">2 machines idle</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Schedule Health</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Good
              </div>
              <p className="text-xs text-muted-foreground mt-1">3 conflicts resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="capacity" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Capacity Planning
            </TabsTrigger>
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Labor Allocation
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Equipment Scheduling
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Project Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity">
            <CapacityPlanningTab />
          </TabsContent>

          <TabsContent value="labor">
            <LaborAllocationTab />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentSchedulingTab />
          </TabsContent>

          <TabsContent value="timeline">
            <ProjectTimelineTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}