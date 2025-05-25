import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Clipboard, 
  Download, 
  Scissors, 
  Clock, 
  Ruler,
  Calculator,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface Cut {
  id: string;
  length: number;
  position: number;
  startAngle?: number;
  endAngle?: number;
  description?: string;
  quantity: number;
}

interface CutPlan {
  stockLength: number;
  cuts: Cut[];
  wasteLength: number;
  efficiency: number;
  totalCuts: number;
  materialType?: string;
}

interface StandardCuttingPlanProps {
  plans: CutPlan[];
  materialCode?: string;
  jobNumber?: string;
}

export default function StandardCuttingPlan({ 
  plans, 
  materialCode = "Material", 
  jobNumber 
}: StandardCuttingPlanProps) {
  
  const calculateTotalStats = () => {
    const totalWaste = plans.reduce((sum, plan) => sum + plan.wasteLength, 0);
    const totalStock = plans.reduce((sum, plan) => sum + plan.stockLength, 0);
    const totalCuts = plans.reduce((sum, plan) => sum + plan.totalCuts, 0);
    const avgEfficiency = plans.length > 0 ? 
      plans.reduce((sum, plan) => sum + plan.efficiency, 0) / plans.length : 0;
    
    // Calculate total cutting time (10 min standard, 12 min for angle cuts)
    const totalTime = plans.reduce((totalMinutes, plan) => {
      const planTime = plan.cuts.reduce((cutTime, cut) => {
        const hasAngleCuts = (cut.startAngle && cut.startAngle !== 90) || 
                           (cut.endAngle && cut.endAngle !== 90);
        const timePerCut = hasAngleCuts ? 12 : 10;
        return cutTime + (timePerCut * cut.quantity);
      }, 0);
      return totalMinutes + planTime;
    }, 0);
    
    return {
      totalWaste,
      totalStock,
      totalCuts,
      avgEfficiency,
      totalTime,
      wastePercentage: totalStock > 0 ? (totalWaste / totalStock) * 100 : 0
    };
  };

  const stats = calculateTotalStats();

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "text-green-600 bg-green-50 border-green-200";
    if (efficiency >= 90) return "text-blue-600 bg-blue-50 border-blue-200";
    if (efficiency >= 80) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log("Export cutting plan");
  };

  return (
    <div className="space-y-6">
      {/* Header with Job Info */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Cutting Plan
              </CardTitle>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                {jobNumber && <span>Job: {jobNumber}</span>}
                <span>Material: {materialCode}</span>
                <span>Plans: {plans.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Clipboard className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Summary Stats */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.totalCuts}</div>
              <div className="text-xs text-muted-foreground">Total Cuts</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.avgEfficiency.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Efficiency</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalWaste.toFixed(0)}mm</div>
              <div className="text-xs text-muted-foreground">Total Waste</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{formatTime(stats.totalTime)}</div>
              <div className="text-xs text-muted-foreground">Est. Time</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Ruler className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalStock.toFixed(0)}mm</div>
              <div className="text-xs text-muted-foreground">Total Stock</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cutting Plans */}
      {plans.map((plan, planIndex) => (
        <Card key={planIndex}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Stock Bar #{planIndex + 1} - {plan.stockLength}mm
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getEfficiencyColor(plan.efficiency)}>
                  {plan.efficiency.toFixed(1)}% Efficient
                </Badge>
                <Badge variant="outline">
                  {plan.totalCuts} cuts
                </Badge>
                <Badge variant="destructive">
                  {plan.wasteLength.toFixed(0)}mm waste
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cut #</TableHead>
                  <TableHead>Length (mm)</TableHead>
                  <TableHead>Position (mm)</TableHead>
                  <TableHead>End Position (mm)</TableHead>
                  <TableHead>Start Angle</TableHead>
                  <TableHead>End Angle</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Est. Time</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.cuts.map((cut, cutIndex) => {
                  const hasAngleCuts = (cut.startAngle && cut.startAngle !== 90) || 
                                     (cut.endAngle && cut.endAngle !== 90);
                  const timePerCut = hasAngleCuts ? 12 : 10;
                  const totalCutTime = timePerCut * cut.quantity;
                  
                  return (
                    <TableRow key={cutIndex}>
                      <TableCell className="font-medium">#{cutIndex + 1}</TableCell>
                      <TableCell className="font-mono">{cut.length}</TableCell>
                      <TableCell className="font-mono">{cut.position}</TableCell>
                      <TableCell className="font-mono">{cut.position + cut.length}</TableCell>
                      <TableCell>
                        <span className={cut.startAngle !== 90 ? "text-orange-600 font-medium" : ""}>
                          {cut.startAngle || 90}°
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cut.endAngle !== 90 ? "text-orange-600 font-medium" : ""}>
                          {cut.endAngle || 90}°
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cut.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={hasAngleCuts ? "text-orange-600" : ""}>
                          {formatTime(totalCutTime)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cut.description || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Waste row */}
                <TableRow className="bg-red-50">
                  <TableCell className="font-medium text-red-600">WASTE</TableCell>
                  <TableCell className="font-mono text-red-600">
                    {plan.wasteLength.toFixed(0)}
                  </TableCell>
                  <TableCell className="font-mono text-red-600">
                    {(plan.stockLength - plan.wasteLength).toFixed(0)}
                  </TableCell>
                  <TableCell className="font-mono text-red-600">
                    {plan.stockLength}
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    Offcut - {((plan.wasteLength / plan.stockLength) * 100).toFixed(1)}% waste
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}