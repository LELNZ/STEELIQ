import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, Users, Wrench, TrendingUp, AlertCircle, 
  CheckCircle, Clock, BarChart3, Activity, Settings, Factory,
  Package, ClipboardList
} from "lucide-react";
import CapacityPlanningTab from "@/components/resource-planning/CapacityPlanningTab";
import LaborAllocationTab from "@/components/resource-planning/LaborAllocationTab";
import EquipmentSchedulingTab from "@/components/resource-planning/EquipmentSchedulingTab";
import ProjectTimelineTab from "@/components/resource-planning/ProjectTimelineTab";

export default function ResourcePlanning() {
  const [activeTab, setActiveTab] = useState("capacity");
  const [showProductionSyncDialog, setShowProductionSyncDialog] = useState(false);
  const [productionData, setProductionData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for production floor sync on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sync') === 'production') {
      const prodData = sessionStorage.getItem('productionFloorData');
      if (prodData) {
        setProductionData(JSON.parse(prodData));
        setShowProductionSyncDialog(true);
        sessionStorage.removeItem('productionFloorData');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold">Resource Planning & Capacity Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Optimize workshop capacity, manage labor allocation, and schedule equipment for maximum efficiency
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Workshop Capacity</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">78%</p>
                  <Progress value={78} className="mt-2 h-1.5" />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Optimal: 75-85%</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Labor Utilization</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">82%</p>
                  <Progress value={82} className="mt-2 h-1.5" />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">4 available workers</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Equipment Usage</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">65%</p>
                  <Progress value={65} className="mt-2 h-1.5" />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">2 machines idle</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Schedule Health</p>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    Good
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">3 conflicts resolved</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
                </div>
              </div>
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

        {/* Production Floor Sync Dialog */}
        <Dialog open={showProductionSyncDialog} onOpenChange={setShowProductionSyncDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Production Floor Work Orders Import
              </DialogTitle>
            </DialogHeader>
            
            {productionData && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Import Summary</p>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-blue-700">Active Orders</p>
                      <p className="font-medium">{productionData.totalActiveOrders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Urgent Priority</p>
                      <p className="font-medium">{productionData.resourceRequirements.urgentOrders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Total Weight</p>
                      <p className="font-medium">{productionData.resourceRequirements.totalWeight.toFixed(1)}t</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Active Work Orders ({productionData.workOrders.length})</h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {productionData.workOrders.map((order: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{order.workOrderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.projectName}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              order.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {order.priority}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(order.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{order.assignedTeam}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{order.totalWeight}t</span>
                          </div>
                          <Progress value={order.completionProgress} className="w-20 h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-amber-900 mb-2">Resource Impact Analysis</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• {productionData.resourceRequirements.teams.length} teams require coordination</li>
                    <li>• {productionData.resourceRequirements.urgentOrders} urgent orders need immediate allocation</li>
                    <li>• Capacity impact: Additional {productionData.resourceRequirements.totalWeight.toFixed(1)} tonnes</li>
                  </ul>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Import these work orders for resource planning?
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowProductionSyncDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        toast({
                          title: "Work Orders Imported",
                          description: `Successfully imported ${productionData.workOrders.length} work orders from Production Floor`,
                        });
                        setShowProductionSyncDialog(false);
                        // Switch to labor allocation tab to show resource assignments
                        setActiveTab("labor");
                        // Refresh resource planning data
                        queryClient.invalidateQueries({ queryKey: ["/api/resource-planning"] });
                      }}
                    >
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Import for Planning
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}