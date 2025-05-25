import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Eye, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimulationData {
  id: string;
  description: string;
  efficiency: number;
  wastePercentage: number;
  stockCount: number;
  totalCuttingTime: number;
  createdAt: string;
  expiresAt: string;
  cutRequests: string;
  stockItems: string;
  optimizationData: string;
}

interface SimulationHistoryProps {
  onRecallSimulation: (simulation: SimulationData) => void;
}

export function SimulationHistoryWorking({ onRecallSimulation }: SimulationHistoryProps) {
  const [simulations, setSimulations] = useState<SimulationData[]>([]);
  const { toast } = useToast();

  const loadSimulations = () => {
    try {
      const stored = localStorage.getItem('cutting_simulations');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired simulations (older than 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const validSimulations = parsed.filter((sim: SimulationData) => 
          new Date(sim.createdAt) > sevenDaysAgo
        );
        setSimulations(validSimulations);
        // Update localStorage with filtered data
        localStorage.setItem('cutting_simulations', JSON.stringify(validSimulations));
      }
    } catch (error) {
      console.error('Error loading simulations:', error);
    }
  };

  useEffect(() => {
    loadSimulations();
    
    // Listen for custom events when simulations are saved
    const handleSimulationSaved = () => {
      setTimeout(loadSimulations, 100);
    };
    
    window.addEventListener('simulation-saved', handleSimulationSaved);
    
    // Also periodically check for updates
    const interval = setInterval(loadSimulations, 3000);
    
    return () => {
      window.removeEventListener('simulation-saved', handleSimulationSaved);
      clearInterval(interval);
    };
  }, []);

  const deleteSimulation = (id: string) => {
    const updated = simulations.filter(sim => sim.id !== id);
    setSimulations(updated);
    localStorage.setItem('cutting_simulations', JSON.stringify(updated));
    toast({
      title: "Simulation deleted",
      description: "The simulation has been permanently removed.",
    });
  };

  const recallSimulation = (simulation: SimulationData) => {
    onRecallSimulation(simulation);
    toast({
      title: "Simulation recalled",
      description: "The simulation has been loaded into the optimizer.",
    });
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Simulation History
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {simulations.length} saved
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {simulations.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No saved simulations</h3>
            <p className="text-muted-foreground">
              Run an optimization to save your first simulation
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {simulations.map((sim) => (
                <div key={sim.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {sim.id}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sim.createdAt).toLocaleDateString()} {new Date(sim.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Expires in {formatTimeRemaining(sim.expiresAt)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{sim.description}</p>

                  <div className="grid grid-cols-3 gap-4 text-center mb-3">
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        {sim.efficiency.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Efficiency</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-600">
                        {sim.wastePercentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Waste</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-blue-600">
                        {Math.floor(sim.totalCuttingTime / 60)}h {sim.totalCuttingTime % 60}m
                      </div>
                      <div className="text-xs text-muted-foreground">Time</div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => recallSimulation(sim)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Recall & Load
                    </Button>

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