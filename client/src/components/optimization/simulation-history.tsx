import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Download, Trash2, RotateCcw } from "lucide-react";
import { OptimizationResult } from "@/lib/cutting-optimization";

interface SimulationRecord {
  id: string;
  timestamp: Date;
  algorithm: string;
  result: OptimizationResult;
  parameters: {
    cutRequests: number;
    stockItems: number;
  };
}

interface SimulationHistoryProps {
  onLoadSimulation?: (result: OptimizationResult) => void;
}

export default function SimulationHistory({ onLoadSimulation }: SimulationHistoryProps) {
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);

  useEffect(() => {
    // Load simulations from localStorage
    const stored = localStorage.getItem('cutting-simulations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSimulations(parsed.map((sim: any) => ({
          ...sim,
          timestamp: new Date(sim.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load simulation history:', error);
      }
    }
  }, []);

  const saveSimulation = (result: OptimizationResult, algorithm: string, cutRequests: number, stockItems: number) => {
    const newSimulation: SimulationRecord = {
      id: `SIM-${Date.now()}`,
      timestamp: new Date(),
      algorithm,
      result,
      parameters: { cutRequests, stockItems }
    };

    const updatedSimulations = [newSimulation, ...simulations].slice(0, 10); // Keep last 10
    setSimulations(updatedSimulations);
    localStorage.setItem('cutting-simulations', JSON.stringify(updatedSimulations));
  };

  const deleteSimulation = (id: string) => {
    const updated = simulations.filter(sim => sim.id !== id);
    setSimulations(updated);
    localStorage.setItem('cutting-simulations', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setSimulations([]);
    localStorage.removeItem('cutting-simulations');
  };

  if (simulations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Simulation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No simulation history available. Run an optimization to see results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Simulation History
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {simulations.map((simulation) => (
          <div
            key={simulation.id}
            className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{simulation.id}</Badge>
                <Badge variant="outline">{simulation.algorithm}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {simulation.timestamp.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Efficiency:</span>
                <div className="font-medium">
                  {simulation.result.summary.avgEfficiency.toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Waste:</span>
                <div className="font-medium">
                  {simulation.result.summary.totalWastePercentage.toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Plans:</span>
                <div className="font-medium">{simulation.result.plans.length}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Cuts:</span>
                <div className="font-medium">{simulation.result.summary.totalCuts}</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {simulation.parameters.cutRequests} cuts, {simulation.parameters.stockItems} stock items
              </div>
              <div className="flex gap-2">
                {onLoadSimulation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadSimulation(simulation.result)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Load
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSimulation(simulation.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Export the save function for use in the main optimizer
export { SimulationHistory };