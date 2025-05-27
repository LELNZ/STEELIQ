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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

    setIsGeneratingPDF(true);
    
    // Expand all plans for PDF
    const allPlanIndexes = new Set(Array.from({ length: groupedPlans.length }, (_, i) => i));
    setExpandedPlans(allPlanIndexes);
    
    // Show instructions for PDF
    setShowInstructions(true);

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const canvas = await html2canvas(element, {
        scale: 0.8,
        useCORS: true,
        allowTaint: true,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        backgroundColor: '#ffffff'
      });

      // Compress image quality to reduce file size
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`cutting-plan-${jobNumber}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    
    setIsGeneratingPDF(false);
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
    <div id="cutting-plan-container" className={`space-y-6 p-6 bg-white ${isGeneratingPDF ? 'print-optimized' : ''}`}>
      {/* Professional Workshop Header */}
      <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WORKSHOP CUTTING PLAN</h1>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div><strong>Job Number:</strong> {jobNumber}</div>
            <div><strong>Cutting Method:</strong> {cuttingMethod}</div>
            <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
            <div><strong>Total Plans:</strong> {groupedPlans.length} sequences</div>
          </div>
        </div>
        <Button 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPDF}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {isGeneratingPDF ? "Generating Workshop PDF..." : "Download Workshop PDF"}
        </Button>
      </div>

      {/* Compact Summary Statistics */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{groupedPlans.length}</div>
            <div className="text-xs text-muted-foreground">Unique Sequences</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{overallEfficiency.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Overall Efficiency</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">{totalStats.totalCuts}</div>
            <div className="text-xs text-muted-foreground">Total Cuts</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">{formatTime(totalStats.totalCuttingTime)}</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
        </div>
      </Card>

      {/* General Instructions */}
      {generalInstructions.length > 0 && (
        <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
          <Card className="p-3">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="w-4 h-4" />
                    General Instructions
                  </div>
                  {showInstructions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                  {generalInstructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span className="leading-tight">{instruction}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Cutting Plans with Sequence Grouping */}
      {groupedPlans.map(({ plan, planIndex, isGrouped, groupCount, groupIds }, index) => {
        // Add page break before new material types (for PDF)
        const previousPlan = index > 0 ? groupedPlans[index - 1].plan : null;
        const isNewMaterial = previousPlan && previousPlan.materialCode !== plan.materialCode;
        
        return (
        <Card key={planIndex} className={`p-3 ${isGrouped ? 'border-2 border-blue-200 bg-blue-50/20' : ''} ${isNewMaterial && isGeneratingPDF ? 'mt-12 border-t-4 border-t-gray-800' : ''}`}>
          {/* Workshop Information Section */}
          {isNewMaterial && isGeneratingPDF && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-bold text-base mb-2">WORKSHOP SETUP - {plan.materialCode}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Material Handling:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Check material grade and heat number</li>
                    <li>• Use appropriate lifting equipment</li>
                    <li>• Position material securely in saw</li>
                  </ul>
                </div>
                <div>
                  <strong>Quality Control:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Verify dimensions before cutting</li>
                    <li>• Check cut angles with protractor</li>
                    <li>• Mark part numbers after cutting</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {isGrouped ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{plan.materialCode} Bar#{groupIds?.join(', #')} - {plan.stockLength}mm</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
                        {groupCount}x identical
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Repeat this cutting sequence {groupCount} times
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-medium">{plan.materialCode} Bar #{planIndex + 1} - {plan.stockLength}mm</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs px-2 py-0.5 ${getEfficiencyColor(plan.efficiency)}`}>
                  {plan.efficiency.toFixed(1)}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlan(planIndex)}
                  className="h-6 px-2 text-xs"
                >
                  {expandedPlans.has(planIndex) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Compact Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xs font-medium text-green-600">
                  {plan.cuts.reduce((sum, cut) => sum + (cut.length * cut.quantity), 0).toFixed(0)}mm
                </div>
                <div className="text-xs text-muted-foreground">Used</div>
              </div>
              <div>
                <div className="text-xs font-medium text-red-600">
                  {plan.wasteLength.toFixed(0)}mm
                </div>
                <div className="text-xs text-muted-foreground">Waste</div>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-600">
                  {formatTime(plan.totalCuttingTime || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
              <div>
                <div className="text-xs font-medium text-purple-600">
                  {plan.totalCuts}
                </div>
                <div className="text-xs text-muted-foreground">Cuts</div>
              </div>
            </div>
          </div>

          <Collapsible open={isGeneratingPDF || expandedPlans.has(planIndex)} onOpenChange={() => togglePlan(planIndex)}>
            <CollapsibleContent>
              <div className="pt-2">
                <Table className={isGeneratingPDF ? "text-base" : "text-xs"}>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="w-8 px-2 py-1">Seq</TableHead>
                      <TableHead className="px-2 py-1">Length</TableHead>
                      <TableHead className="px-2 py-1">Position</TableHead>
                      <TableHead className="px-2 py-1">First°</TableHead>
                      <TableHead className="px-2 py-1">Second°</TableHead>
                      <TableHead className="w-8 px-2 py-1">Qty</TableHead>
                      <TableHead className="px-2 py-1">Weight</TableHead>
                      <TableHead className="px-2 py-1">Time</TableHead>
                      <TableHead className="px-2 py-1">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.cuts.map((cut, cutIndex) => (
                      <TableRow key={cut.id} className="h-8">
                        <TableCell className="font-mono font-bold px-2 py-1">
                          {cutIndex + 1}
                        </TableCell>
                        <TableCell className="font-mono font-medium px-2 py-1">
                          {cut.length.toFixed(0)}mm
                        </TableCell>
                        <TableCell className="font-mono px-2 py-1">
                          {cut.startPosition.toFixed(0)}-{cut.endPosition.toFixed(0)}mm
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <span className={cut.firstCutAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.firstCutAngle || 90}°
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <span className={cut.secondCutAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.secondCutAngle || 90}°
                          </span>
                        </TableCell>
                        <TableCell className="font-medium px-2 py-1">
                          {cut.quantity}
                        </TableCell>
                        <TableCell className="font-mono px-2 py-1 text-blue-600">
                          {((cut.length / 1000) * (cut.weightPerMeter || 23.5)).toFixed(1)}kg
                        </TableCell>
                        <TableCell className="font-mono px-2 py-1">
                          {formatTime(cut.cuttingTime)}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          {cut.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {plan.wasteLength > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-red-800">
                        Remnant: {plan.wasteLength.toFixed(0)}mm
                      </span>
                      <Badge variant="outline" className="text-red-600 border-red-300 text-xs px-1 py-0">
                        {plan.wasteLength >= 500 ? 'Reusable' : 'Scrap'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        )
      })}
    </div>
  );
}