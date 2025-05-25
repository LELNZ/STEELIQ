import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Download, Trash2, Eye, Calendar, Target, Zap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimulationSummary {
  id: string;
  description: string;
  efficiency: number;
  waste: number;
  totalTime: number;
  stockCount: number;
  createdAt: string;
  expiresAt: string;
}

interface SimulationHistoryProps {
  onRecallSimulation: (simulationData: any) => void;
}

export function SimulationHistory({ onRecallSimulation }: SimulationHistoryProps) {
  const [selectedSimulation, setSelectedSimulation] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for now until backend is implemented
  const simulations: SimulationSummary[] = [];
  const isLoading = false;

  const deleteSimulation = (id: string) => {
    toast({
      title: "Feature coming soon",
      description: "Simulation history will be available in the next update.",
    });
  };

  const recallSimulation = (id: string) => {
    toast({
      title: "Feature coming soon", 
      description: "Simulation recall will be available in the next update.",
    });
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
  };

  const getExpiryColor = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const hoursRemaining = diff / (1000 * 60 * 60);
    
    if (hoursRemaining < 24) return "destructive";
    if (hoursRemaining < 48) return "secondary";
    return "default";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Simulation History
          <Badge variant="outline" className="ml-auto">
            {simulations.length} saved
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading simulation history...
          </div>
        ) : simulations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No saved simulations</p>
            <p className="text-sm">Run an optimization to save your first simulation</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {simulations.map((sim: SimulationSummary) => (
                <div key={sim.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {sim.description || `Simulation ${sim.id.slice(-8)}`}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(sim.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires in {formatTimeRemaining(sim.expiresAt)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={getExpiryColor(sim.expiresAt)} className="text-xs">
                      {formatTimeRemaining(sim.expiresAt)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-green-500" />
                      <span className="font-medium">{sim.efficiency}%</span>
                      <span className="text-muted-foreground">efficiency</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{sim.stockCount}</span>
                      <span className="text-muted-foreground">stocks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-500" />
                      <span className="font-medium">{Math.round(sim.totalTime / 60)}h</span>
                      <span className="text-muted-foreground">time</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => recallSimulation(sim.id)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Recall & Load
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Simulation PDF</DialogTitle>
                        </DialogHeader>
                        <div className="text-sm text-muted-foreground">
                          PDF export functionality will be available here
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSimulation(sim.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}