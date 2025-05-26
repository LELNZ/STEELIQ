import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Download, Info } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Cut {
  id: string;
  length: number;
  startPosition: number;
  endPosition: number;
  firstCutAngle: number;
  secondCutAngle: number;
  description?: string;
  quantity: number;
  materialCode: string;
  cuttingTime: number;
  isNested?: boolean;
  nestedWith?: string;
  materialSavings?: number;
  nestingType?: string;
  kerfWidth?: number;
}

interface CutPlan {
  id: string;
  stockLength: number;
  materialCode: string;
  cuts: Cut[];
  wasteLength: number;
  efficiency: number;
  totalCuts: number;
  materialSavings?: number;
  nestedCuts?: number;
  nestingEfficiency?: number;
  totalCuttingTime: number;
  heatNumber?: string;
  millCert?: string;
  materialType?: string;
  materialGrade?: string;
}

interface StandardCuttingPlanProps {
  plans: CutPlan[];
  materialCode?: string;
  jobNumber?: string;
  generalInstructions?: string[];
  cuttingMethod?: string;
}

export default function StandardCuttingPlan({
  plans,
  materialCode,
  jobNumber = "JOB-2024-001",
  generalInstructions = [],
  cuttingMethod = "Band Saw"
}: StandardCuttingPlanProps) {
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [showInstructions, setShowInstructions] = useState(false);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes.toFixed(1)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toFixed(0)}m`;
  };

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 95) return "bg-green-500 text-white";
    if (efficiency >= 90) return "bg-green-400 text-white";
    if (efficiency >= 85) return "bg-yellow-500 text-white";
    if (efficiency >= 80) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const togglePlan = (planIndex: number) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planIndex)) {
      newExpanded.delete(planIndex);
    } else {
      newExpanded.add(planIndex);
    }
    setExpandedPlans(newExpanded);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('cutting-plan-container');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`cutting-plan-${jobNumber}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // SEQUENCE GROUPING FEATURE - Groups identical cutting sequences to reduce page usage
  const groupedPlans = (() => {
    const processedPlans: Array<{
      plan: CutPlan;
      planIndex: number;
      isGrouped: boolean;
      groupCount?: number;
      groupIds?: number[];
    }> = [];
    const seenSignatures = new Set<string>();

    plans.forEach((plan, planIndex) => {
      const signature = plan.cuts.map(cut => 
        `${cut.length}-${cut.startPosition}-${cut.endPosition}-${cut.firstCutAngle}-${cut.secondCutAngle}`
      ).join('|') + `|remnant:${plan.wasteLength}|material:${plan.materialCode}`;

      if (seenSignatures.has(signature)) return; // Skip duplicates

      // Find all identical plans
      const identicalPlans = plans.map((p, idx) => ({ p, idx })).filter(({ p }) => {
        const sig = p.cuts.map(cut => 
          `${cut.length}-${cut.startPosition}-${cut.endPosition}-${cut.firstCutAngle}-${cut.secondCutAngle}`
        ).join('|') + `|remnant:${p.wasteLength}|material:${p.materialCode}`;
        return sig === signature;
      });

      seenSignatures.add(signature);

      if (identicalPlans.length > 1) {
        processedPlans.push({
          plan,
          planIndex,
          isGrouped: true,
          groupCount: identicalPlans.length,
          groupIds: identicalPlans.map(({ idx }) => idx + 1)
        });
      } else {
        processedPlans.push({ plan, planIndex, isGrouped: false });
      }
    });

    return processedPlans;
  })();

  const totalStats = plans.reduce((acc, plan) => {
    acc.totalLength += plan.cuts.reduce((sum, cut) => sum + (cut.length * cut.quantity), 0);
    acc.totalWaste += plan.wasteLength;
    acc.totalCuttingTime += plan.totalCuttingTime;
    acc.totalCuts += plan.totalCuts;
    return acc;
  }, { totalLength: 0, totalWaste: 0, totalCuttingTime: 0, totalCuts: 0 });

  const overallEfficiency = totalStats.totalLength / (totalStats.totalLength + totalStats.totalWaste) * 100;

  return (
    <div id="cutting-plan-container" className="space-y-6 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cutting Plan</h1>
          <p className="text-gray-600">Job: {jobNumber} | Method: {cuttingMethod}</p>
        </div>
        <Button onClick={handleDownloadPDF} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{groupedPlans.length}</div>
              <div className="text-sm text-muted-foreground">Unique Sequences</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallEfficiency.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Overall Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalStats.totalCuts}</div>
              <div className="text-sm text-muted-foreground">Total Cuts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatTime(totalStats.totalCuttingTime)}</div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Instructions */}
      {generalInstructions.length > 0 && (
        <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    General Instructions
                  </CardTitle>
                  {showInstructions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ul className="space-y-2">
                  {generalInstructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Cutting Plans with Sequence Grouping */}
      {groupedPlans.map(({ plan, planIndex, isGrouped, groupCount, groupIds }) => (
        <Card key={planIndex} className={isGrouped ? 'border-2 border-blue-200 bg-blue-50/20' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {isGrouped ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{plan.materialCode} Bar#{groupIds?.join(', #')} - {plan.stockLength}mm</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold">
                        {groupCount}x identical repeats
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground font-normal">
                      Repeat this cutting sequence {groupCount} times
                    </div>
                  </div>
                ) : (
                  `${plan.materialCode} Bar #${planIndex + 1} - ${plan.stockLength}mm`
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getEfficiencyColor(plan.efficiency)}>
                  {plan.efficiency.toFixed(1)}% Efficient
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlan(planIndex)}
                  className="flex items-center gap-1"
                >
                  {expandedPlans.has(planIndex) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Details
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 pt-2">
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">
                  {plan.cuts.reduce((sum, cut) => sum + (cut.length * cut.quantity), 0).toFixed(0)}mm
                </div>
                <div className="text-xs text-muted-foreground">Used</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-red-600">
                  {plan.wasteLength.toFixed(0)}mm
                </div>
                <div className="text-xs text-muted-foreground">Waste</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-blue-600">
                  {formatTime(plan.totalCuttingTime || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-purple-600">
                  {plan.totalCuts}
                </div>
                <div className="text-xs text-muted-foreground">Cuts</div>
              </div>
            </div>
          </CardHeader>

          <Collapsible open={expandedPlans.has(planIndex)} onOpenChange={() => togglePlan(planIndex)}>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Seq</TableHead>
                      <TableHead>Length</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>First Angle</TableHead>
                      <TableHead>Second Angle</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.cuts.map((cut, cutIndex) => (
                      <TableRow key={cut.id}>
                        <TableCell className="font-mono font-bold">
                          {cutIndex + 1}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {cut.length.toFixed(0)}mm
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {cut.startPosition.toFixed(0)} - {cut.endPosition.toFixed(0)}mm
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={cut.firstCutAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.firstCutAngle || 90}°
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={cut.secondCutAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.secondCutAngle || 90}°
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {cut.quantity}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTime(cut.cuttingTime)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {cut.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {plan.wasteLength > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-red-800">
                        Remnant: {plan.wasteLength.toFixed(0)}mm
                      </span>
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        {plan.wasteLength >= 500 ? 'Reusable' : 'Scrap'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}