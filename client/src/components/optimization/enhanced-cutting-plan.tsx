import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Ruler, 
  Printer, 
  Eye, 
  Download,
  Triangle,
  Scissors,
  CheckCircle,
  AlertTriangle,
  BarChart3
} from "lucide-react";

interface Cut {
  id: string;
  length: number;
  position: number;
  startAngle?: number;
  endAngle?: number;
  description?: string;
}

interface CuttingPlan {
  stockId: string;
  stockLength: number;
  cuts: Cut[];
  efficiency: number;
  wasteLength: number;
  material?: string;
}

interface EnhancedCuttingPlanProps {
  plans: CuttingPlan[];
  materialName?: string;
}

export default function EnhancedCuttingPlan({ plans, materialName = "Steel Bar" }: EnhancedCuttingPlanProps) {
  const [viewMode, setViewMode] = useState<"visual" | "print">("visual");

  const generateColors = (count: number) => {
    const colors = [
      { bg: "bg-blue-500", border: "border-blue-600", text: "text-blue-700" },
      { bg: "bg-green-500", border: "border-green-600", text: "text-green-700" },
      { bg: "bg-purple-500", border: "border-purple-600", text: "text-purple-700" },
      { bg: "bg-orange-500", border: "border-orange-600", text: "text-orange-700" },
      { bg: "bg-pink-500", border: "border-pink-600", text: "text-pink-700" },
      { bg: "bg-cyan-500", border: "border-cyan-600", text: "text-cyan-700" },
      { bg: "bg-yellow-500", border: "border-yellow-600", text: "text-yellow-700" },
      { bg: "bg-red-500", border: "border-red-600", text: "text-red-700" },
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  const hasAngles = (cut: Cut) => {
    return (cut.startAngle && cut.startAngle !== 90) || (cut.endAngle && cut.endAngle !== 90);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-green-600";
    if (efficiency >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (efficiency >= 75) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const VisualCuttingPlan = ({ plan, planIndex }: { plan: CuttingPlan; planIndex: number }) => {
    const colors = generateColors(plan.cuts.length);
    const totalUsed = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);

    return (
      <div className="space-y-4 border rounded-lg p-4 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getEfficiencyIcon(plan.efficiency)}
            <div>
              <h3 className="font-bold text-lg">Stock Bar #{planIndex + 1}</h3>
              <p className="text-sm text-muted-foreground">
                {materialName} • {plan.stockLength}mm length
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getEfficiencyColor(plan.efficiency)}`}>
              {plan.efficiency.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Efficiency</p>
          </div>
        </div>

        {/* Visual Bar with Angles */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0mm</span>
            <span>{plan.stockLength}mm</span>
          </div>
          
          {/* Material Bar */}
          <div className="relative h-16 bg-gradient-to-r from-gray-300 to-gray-400 border-2 border-gray-500 rounded-lg overflow-hidden">
            {plan.cuts.map((cut, cutIndex) => {
              const leftPercent = (cut.position / plan.stockLength) * 100;
              const widthPercent = (cut.length / plan.stockLength) * 100;
              const color = colors[cutIndex];
              
              return (
                <div
                  key={cut.id}
                  className={`absolute top-0 h-full ${color.bg} border-r-2 border-white flex items-center justify-center text-white text-xs font-medium relative`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                >
                  {/* Angle indicators */}
                  {cut.startAngle && cut.startAngle !== 90 && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400 flex items-center justify-center">
                      <Triangle className="h-3 w-3 text-black" />
                    </div>
                  )}
                  
                  {cut.endAngle && cut.endAngle !== 90 && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-yellow-400 flex items-center justify-center">
                      <Triangle className="h-3 w-3 text-black rotate-180" />
                    </div>
                  )}
                  
                  {/* Length label */}
                  {cut.length > 80 && (
                    <span className="font-bold">{cut.length}mm</span>
                  )}
                </div>
              );
            })}
            
            {/* Waste area */}
            {plan.wasteLength > 0 && (
              <div
                className="absolute top-0 h-full bg-red-200 border-l-2 border-red-500 border-dashed flex items-center justify-center text-red-700 text-xs font-medium"
                style={{
                  right: "0%",
                  width: `${(plan.wasteLength / plan.stockLength) * 100}%`,
                }}
              >
                WASTE
              </div>
            )}
          </div>
        </div>

        {/* Cut Details with Angles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plan.cuts.map((cut, cutIndex) => {
            const color = colors[cutIndex];
            return (
              <div
                key={cut.id}
                className={`border-2 ${color.border} rounded-lg p-3 bg-gray-50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">Cut #{cutIndex + 1}</span>
                  {hasAngles(cut) && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Triangle className="h-3 w-3 mr-1" />
                      Angles
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Length:</span>
                    <span className="font-medium">{cut.length}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span className="font-medium">{cut.position}mm</span>
                  </div>
                  
                  {cut.startAngle && cut.startAngle !== 90 && (
                    <div className="flex justify-between">
                      <span>Start Angle:</span>
                      <span className="font-medium text-yellow-700">{cut.startAngle}°</span>
                    </div>
                  )}
                  
                  {cut.endAngle && cut.endAngle !== 90 && (
                    <div className="flex justify-between">
                      <span>End Angle:</span>
                      <span className="font-medium text-yellow-700">{cut.endAngle}°</span>
                    </div>
                  )}
                  
                  {cut.description && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      {cut.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{plan.cuts.length}</p>
            <p className="text-xs text-muted-foreground">Total Cuts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalUsed}mm</p>
            <p className="text-xs text-muted-foreground">Material Used</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{plan.wasteLength.toFixed(0)}mm</p>
            <p className="text-xs text-muted-foreground">Waste</p>
          </div>
        </div>
      </div>
    );
  };

  const PrintCuttingPlan = ({ plan, planIndex }: { plan: CuttingPlan; planIndex: number }) => {
    return (
      <div className="space-y-2 border-2 border-black p-4 bg-white print:break-inside-avoid">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
          <div>
            <h2 className="text-xl font-bold">STOCK BAR #{planIndex + 1}</h2>
            <p className="text-sm">{materialName} - {plan.stockLength}mm</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">EFFICIENCY: {plan.efficiency.toFixed(1)}%</p>
            <p className="text-sm">WASTE: {plan.wasteLength.toFixed(0)}mm</p>
          </div>
        </div>

        {/* Simple Bar Diagram */}
        <div className="my-4">
          <div className="relative h-8 border-2 border-black bg-white">
            {plan.cuts.map((cut, cutIndex) => {
              const leftPercent = (cut.position / plan.stockLength) * 100;
              const widthPercent = (cut.length / plan.stockLength) * 100;
              
              return (
                <div
                  key={cut.id}
                  className="absolute top-0 h-full bg-gray-300 border-r border-black flex items-center justify-center text-xs font-bold"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                >
                  #{cutIndex + 1}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>0mm</span>
            <span>{plan.stockLength}mm</span>
          </div>
        </div>

        {/* Cut List Table */}
        <table className="w-full border-2 border-black text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 text-left">Cut #</th>
              <th className="border border-black p-2 text-left">Length (mm)</th>
              <th className="border border-black p-2 text-left">Position (mm)</th>
              <th className="border border-black p-2 text-left">Start Angle</th>
              <th className="border border-black p-2 text-left">End Angle</th>
              <th className="border border-black p-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {plan.cuts.map((cut, cutIndex) => (
              <tr key={cut.id}>
                <td className="border border-black p-2 font-bold">#{cutIndex + 1}</td>
                <td className="border border-black p-2 font-bold">{cut.length}</td>
                <td className="border border-black p-2">{cut.position}</td>
                <td className="border border-black p-2">
                  {cut.startAngle && cut.startAngle !== 90 ? `${cut.startAngle}°` : "90°"}
                </td>
                <td className="border border-black p-2">
                  {cut.endAngle && cut.endAngle !== 90 ? `${cut.endAngle}°` : "90°"}
                </td>
                <td className="border border-black p-2 text-xs">
                  {cut.description || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Instructions */}
        <div className="border-2 border-black p-2 bg-gray-100">
          <h4 className="font-bold mb-1">CUTTING INSTRUCTIONS:</h4>
          <div className="text-xs space-y-1">
            <p>• Measure and mark all cut positions before starting</p>
            <p>• Check angles with protractor for non-90° cuts</p>
            <p>• Allow for kerf width (2.4mm) between cuts</p>
            <p>• Mark waste area - do not use for critical cuts</p>
          </div>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create CSV export for workshop use
    const csvData = plans.flatMap((plan, planIndex) => 
      plan.cuts.map((cut, cutIndex) => [
        `Bar ${planIndex + 1}`,
        `Cut ${cutIndex + 1}`,
        cut.length,
        cut.position,
        cut.startAngle || 90,
        cut.endAngle || 90,
        cut.description || ""
      ])
    );
    
    const csvContent = [
      ["Stock Bar", "Cut Number", "Length (mm)", "Position (mm)", "Start Angle", "End Angle", "Description"],
      ...csvData
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cutting-plan-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!plans || plans.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No cutting plans available. Run optimization to generate plans.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Enhanced Cutting Plans ({plans.length} bars)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Plans
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "visual" | "print")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visual" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visual Mode
              </TabsTrigger>
              <TabsTrigger value="print" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Workshop Mode
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual" className="space-y-6 mt-6">
              {plans.map((plan, planIndex) => (
                <VisualCuttingPlan 
                  key={plan.stockId} 
                  plan={plan} 
                  planIndex={planIndex} 
                />
              ))}
            </TabsContent>
            
            <TabsContent value="print" className="space-y-6 mt-6">
              <div className="print:space-y-4">
                {plans.map((plan, planIndex) => (
                  <PrintCuttingPlan 
                    key={plan.stockId} 
                    plan={plan} 
                    planIndex={planIndex} 
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}