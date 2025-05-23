import { useState } from "react";
import CuttingPanel from "@/components/optimization/cutting-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Settings, BarChart3, Download, Lightbulb } from "lucide-react";

export default function Optimization() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'minimize_waste' | 'minimize_cuts' | 'balanced'>('minimize_waste');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cutting Optimization</h1>
          <p className="text-muted-foreground">Optimize material usage and cutting sequences</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            <Zap className="w-3 h-3 mr-1" />
            AI Optimized
          </Badge>
        </div>
      </div>

      {/* Algorithm Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Optimization Settings</span>
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View History
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className={`cursor-pointer transition-colors ${
                selectedAlgorithm === 'minimize_waste' 
                  ? 'border-accent bg-accent/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedAlgorithm('minimize_waste')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Minimize Waste</h3>
                    <p className="text-sm text-muted-foreground">Reduce material waste</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-colors ${
                selectedAlgorithm === 'minimize_cuts' 
                  ? 'border-secondary bg-secondary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedAlgorithm('minimize_cuts')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Minimize Cuts</h3>
                    <p className="text-sm text-muted-foreground">Reduce cutting time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-colors ${
                selectedAlgorithm === 'balanced' 
                  ? 'border-warning bg-warning/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedAlgorithm('balanced')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Balanced</h3>
                    <p className="text-sm text-muted-foreground">Optimize both factors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Main Cutting Panel */}
      <CuttingPanel algorithm={selectedAlgorithm} />

      {/* Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Optimization Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-semibold text-accent mb-2">Kerf Allowance</h4>
              <p className="text-sm text-muted-foreground">
                System automatically accounts for 2.4mm kerf width plus 0.5mm user error tolerance
              </p>
            </div>
            <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
              <h4 className="font-semibold text-secondary mb-2">Cut Timing</h4>
              <p className="text-sm text-muted-foreground">
                Standard 90° cuts: 10 min, Angle cuts: 12 min. Times include setup and material handling
              </p>
            </div>
            <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
              <h4 className="font-semibold text-warning mb-2">Waste Target</h4>
              <p className="text-sm text-muted-foreground">
                Aim for 5% or less material waste. Remnants under 300mm are typically not reusable
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Batch Processing</h4>
              <p className="text-sm text-muted-foreground">
                Group similar cuts together to minimize machine setup time and improve efficiency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
