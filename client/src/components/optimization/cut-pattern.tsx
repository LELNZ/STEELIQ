import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CutPlan } from "@/types";
import { Ruler, Scissors, AlertTriangle, CheckCircle } from "lucide-react";

interface CutPatternProps {
  plans: CutPlan[];
}

export default function CutPattern({ plans }: CutPatternProps) {
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "text-accent";
    if (efficiency >= 90) return "text-secondary";
    if (efficiency >= 80) return "text-warning";
    return "text-destructive";
  };

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 95) return <CheckCircle className="w-4 h-4 text-accent" />;
    if (efficiency >= 80) return <Scissors className="w-4 h-4 text-secondary" />;
    return <AlertTriangle className="w-4 h-4 text-warning" />;
  };

  const generateCutColors = (numCuts: number) => {
    const colors = [
      "bg-secondary",
      "bg-accent", 
      "bg-warning",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500"
    ];
    
    return Array.from({ length: numCuts }, (_, i) => colors[i % colors.length]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Ruler className="h-5 w-5" />
          <span>Cut Pattern Visualization</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {plans.map((plan, planIndex) => {
          const colors = generateCutColors(plan.cuts.length);
          const totalUsedLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
          
          return (
            <div key={planIndex} className="space-y-3">
              {/* Plan Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getEfficiencyIcon(plan.efficiency)}
                  <div>
                    <h4 className="font-semibold">
                      Stock Length {planIndex + 1} ({plan.stockLength}mm)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {plan.cuts.length} cuts • {totalUsedLength}mm used • {plan.wasteLength.toFixed(0)}mm waste
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getEfficiencyColor(plan.efficiency)}`}>
                    {plan.efficiency.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Efficiency</p>
                </div>
              </div>

              {/* Visual Representation */}
              <div className="space-y-2">
                {/* Scale Indicator */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0mm</span>
                  <span>{(plan.stockLength / 2).toFixed(0)}mm</span>
                  <span>{plan.stockLength}mm</span>
                </div>

                {/* Cut Pattern Bar */}
                <div className="relative h-12 bg-muted rounded-lg overflow-hidden border">
                  {plan.cuts.map((cut, cutIndex) => {
                    const widthPercentage = (cut.length / plan.stockLength) * 100;
                    const leftPercentage = (cut.position / plan.stockLength) * 100;
                    
                    return (
                      <div
                        key={cutIndex}
                        className={`absolute top-0 h-full ${colors[cutIndex]} border-r-2 border-white flex items-center justify-center text-white text-xs font-medium`}
                        style={{
                          left: `${leftPercentage}%`,
                          width: `${widthPercentage}%`,
                        }}
                        title={`Cut ${cutIndex + 1}: ${cut.length}mm`}
                      >
                        {cut.length > 100 && cut.length} {/* Only show length if there's space */}
                      </div>
                    );
                  })}
                  
                  {/* Waste Area */}
                  {plan.wasteLength > 0 && (
                    <div
                      className="absolute top-0 h-full bg-gray-300 border-l-2 border-destructive border-dashed flex items-center justify-center text-gray-600 text-xs"
                      style={{
                        right: "0%",
                        width: `${(plan.wasteLength / plan.stockLength) * 100}%`,
                      }}
                      title={`Waste: ${plan.wasteLength.toFixed(0)}mm`}
                    >
                      {plan.wasteLength > 50 && `${plan.wasteLength.toFixed(0)}mm`}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <Progress value={plan.efficiency} className="h-2" />

                {/* Cut Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {plan.cuts.map((cut, cutIndex) => (
                    <div
                      key={cutIndex}
                      className="flex items-center space-x-2 p-2 bg-background rounded border text-sm"
                    >
                      <div className={`w-3 h-3 rounded ${colors[cutIndex]}`}></div>
                      <div>
                        <p className="font-medium">Cut {cutIndex + 1}</p>
                        <p className="text-xs text-muted-foreground">{cut.length}mm</p>
                      </div>
                    </div>
                  ))}
                  
                  {plan.wasteLength > 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-destructive/5 rounded border border-destructive/20 text-sm">
                      <div className="w-3 h-3 rounded bg-gray-300"></div>
                      <div>
                        <p className="font-medium text-destructive">Waste</p>
                        <p className="text-xs text-destructive/70">{plan.wasteLength.toFixed(0)}mm</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cut Sequence Information */}
                <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                  <h5 className="font-medium mb-2">Cutting Sequence:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {plan.cuts.map((cut, cutIndex) => (
                      <div key={cutIndex} className="flex justify-between">
                        <span>Step {cutIndex + 1}:</span>
                        <span>Cut {cut.length}mm piece at position {cut.position}mm</span>
                      </div>
                    ))}
                  </div>
                  
                  {plan.wasteLength > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Remaining:</span>
                        <span>{plan.wasteLength.toFixed(0)}mm waste material</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Efficiency Indicators */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant={plan.efficiency >= 95 ? "default" : plan.efficiency >= 80 ? "secondary" : "destructive"}
                    >
                      {plan.efficiency >= 95 ? "Excellent" : plan.efficiency >= 80 ? "Good" : "Poor"} Efficiency
                    </Badge>
                    
                    {plan.wasteLength < 100 && (
                      <Badge variant="outline" className="text-accent border-accent">
                        Minimal Waste
                      </Badge>
                    )}
                    
                    {plan.cuts.length <= 3 && (
                      <Badge variant="outline" className="text-secondary border-secondary">
                        Simple Cutting
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Estimated cut time: {plan.cuts.length * 10} minutes</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        {plans.length > 1 && (
          <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
            <h4 className="font-semibold text-accent mb-2">Optimization Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Stocks</p>
                <p className="font-semibold">{plans.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Cuts</p>
                <p className="font-semibold">{plans.reduce((sum, plan) => sum + plan.cuts.length, 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Efficiency</p>
                <p className="font-semibold">
                  {(plans.reduce((sum, plan) => sum + plan.efficiency, 0) / plans.length).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Waste</p>
                <p className="font-semibold">
                  {plans.reduce((sum, plan) => sum + plan.wasteLength, 0).toFixed(0)}mm
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
