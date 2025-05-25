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
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Zap,
  Square
} from "lucide-react";

interface Cut {
  id: string;
  length: number;
  position: number;
  startAngle?: number;
  endAngle?: number;
  description?: string;
  quantity: number;
  cuttingInstructions?: string;
}

interface PlanInstructions {
  general?: string;
  cuttingMethod?: string;
  heatNumber?: string;
  millCertNumber?: string;
}

interface CutPlan {
  stockLength: number;
  cuts: Cut[];
  wasteLength: number;
  efficiency: number;
  totalCuts: number;
  materialType?: string;
  materialGrade?: string;
  instructions?: PlanInstructions;
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
    // Create print-friendly version without sidebar
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const contentElement = document.querySelector('[data-print-content]');
      const contentHTML = contentElement?.innerHTML || '';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Cutting Plan - ${jobNumber || 'Job'}</title>
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white;
                color: black;
              }
              
              /* Copy all the visual styles */
              .space-y-6 > * + * { margin-top: 1.5rem; }
              .bg-card { background: white; }
              .border { border: 1px solid #e5e7eb; }
              .rounded-lg { border-radius: 0.5rem; }
              .p-6 { padding: 1.5rem; }
              .pb-4 { padding-bottom: 1rem; }
              .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
              
              /* Table styles */
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
                vertical-align: middle;
              }
              th { background-color: #f8f9fa; font-weight: bold; }
              .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
              
              /* Visual bar styles */
              .relative { position: relative; }
              .absolute { position: absolute; }
              .w-20 { width: 5rem; }
              .h-6 { height: 1.5rem; }
              .bg-gradient-to-r { background: linear-gradient(to right, #cbd5e1, #94a3b8); }
              .border-slate-500 { border-color: #64748b; }
              .rounded-sm { border-radius: 0.125rem; }
              .bg-blue-500 { background-color: #3b82f6; }
              .border-x-2 { border-left-width: 2px; border-right-width: 2px; }
              .border-white { border-color: white; }
              .text-orange-600 { color: #ea580c; }
              .font-medium { font-weight: 500; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; }
              
              /* Badge styles */
              .inline-flex { display: inline-flex; }
              .items-center { align-items: center; }
              .rounded-full { border-radius: 9999px; }
              .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
              .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
              .bg-secondary { background-color: #f1f5f9; }
              
              /* Stats grid */
              .grid { display: grid; }
              .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .text-center { text-align: center; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .font-bold { font-weight: 700; }
              
              /* Colors */
              .text-green-600 { color: #16a34a; }
              .text-orange-600 { color: #ea580c; }
              .text-blue-600 { color: #2563eb; }
              .text-purple-600 { color: #9333ea; }
              .text-red-600 { color: #dc2626; }
              .bg-red-50 { background-color: #fef2f2; }
              .border-red-200 { border-color: #fecaca; }
              .border-t-2 { border-top-width: 2px; }
              
              /* Instructions */
              .bg-blue-50 { background-color: #eff6ff; }
              .border-blue-200 { border-color: #bfdbfe; }
              .text-blue-700 { color: #1d4ed8; }
              .font-mono { font-family: ui-monospace, monospace; }
              
              @media print { 
                body { margin: 0; padding: 10px; } 
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${contentHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExport = async () => {
    try {
      // Dynamic import of jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text(`Cutting Plan - ${jobNumber || 'Job'}`, 20, 20);
      
      // Add job details
      doc.setFontSize(12);
      doc.text(`Material: ${materialCode}`, 20, 35);
      doc.text(`Plans: ${plans.length}`, 20, 45);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
      
      let yPosition = 70;
      
      // Add summary stats
      const stats = calculateTotalStats();
      doc.text(`Summary:`, 20, yPosition);
      yPosition += 10;
      doc.text(`Total Cuts: ${stats.totalCuts} | Efficiency: ${stats.avgEfficiency.toFixed(1)}% | Waste: ${stats.totalWaste.toFixed(0)}mm | Est. Time: ${formatTime(stats.totalTime)}`, 20, yPosition);
      yPosition += 20;
      
      // Add each cutting plan
      plans.forEach((plan, planIndex) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Plan header
        doc.setFontSize(14);
        doc.text(`Stock Bar #${planIndex + 1} - ${plan.stockLength}mm`, 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.text(`Efficiency: ${plan.efficiency.toFixed(1)}% | Cuts: ${plan.totalCuts} | Waste: ${plan.wasteLength.toFixed(0)}mm`, 20, yPosition);
        yPosition += 15;
        
        // Instructions
        if (plan.instructions) {
          if (plan.instructions.general) {
            doc.text(`Instructions: ${plan.instructions.general}`, 20, yPosition);
            yPosition += 8;
          }
          if (plan.instructions.heatNumber) {
            doc.text(`Heat Number: ${plan.instructions.heatNumber}`, 20, yPosition);
            yPosition += 8;
          }
        }
        yPosition += 5;
        
        // Table header
        doc.text('Cut#', 20, yPosition);
        doc.text('Length', 40, yPosition);
        doc.text('First Cut', 70, yPosition);
        doc.text('Second Cut', 100, yPosition);
        doc.text('Qty', 130, yPosition);
        doc.text('Time', 150, yPosition);
        doc.text('Instructions', 170, yPosition);
        yPosition += 8;
        
        // Cuts
        plan.cuts.forEach((cut, cutIndex) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          const hasAngleCuts = (cut.startAngle && cut.startAngle !== 90) || (cut.endAngle && cut.endAngle !== 90);
          const timePerCut = hasAngleCuts ? 12 : 10;
          const totalCutTime = timePerCut * cut.quantity;
          
          doc.text(`#${cutIndex + 1}`, 20, yPosition);
          doc.text(`${cut.length}mm`, 40, yPosition);
          doc.text(`${cut.startAngle || 90}°`, 70, yPosition);
          doc.text(`${cut.endAngle || 90}°`, 100, yPosition);
          doc.text(`${cut.quantity}`, 130, yPosition);
          doc.text(formatTime(totalCutTime), 150, yPosition);
          doc.text(cut.cuttingInstructions || cut.description || '-', 170, yPosition);
          yPosition += 8;
        });
        
        // Waste
        doc.text('OFFCUT', 20, yPosition);
        doc.text(`${plan.wasteLength.toFixed(0)}mm`, 40, yPosition);
        doc.text(`Tag: ${plan.instructions?.heatNumber || 'Heat#'}`, 170, yPosition);
        yPosition += 15;
      });
      
      // Save the PDF
      doc.save(`cutting-plan-${jobNumber || 'job'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      // Fallback to print
      handlePrint();
    }
  };

  // Visual indicator components for review
  const BladeIndicator = () => (
    <div className="flex items-center justify-center">
      <div className="w-0.5 h-6 bg-gray-600"></div>
    </div>
  );

  const BandsawIndicator = () => (
    <div className="flex items-center justify-center">
      <Scissors className="h-4 w-4 text-gray-600 rotate-90" />
    </div>
  );



  const SimpleBarGuide = ({ cut }: { cut: Cut }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-6 bg-gradient-to-r from-slate-300 to-slate-400 border border-slate-500 rounded-sm">
        {/* Kept workpiece (center section) */}
        <div className="absolute left-3 top-0 w-14 h-full bg-blue-500 border-x-2 border-white"></div>
        
        {/* Angle indicators - matching bandsaw orientation */}
        <div className="absolute -top-4 right-1 text-xs text-orange-600 font-medium">
          {cut.startAngle || 90}°
        </div>
        <div className="absolute -top-4 left-1 text-xs text-orange-600 font-medium">
          {cut.endAngle || 90}°
        </div>
        
        {/* Cut labels - matching your bandsaw setup */}
        <div className="absolute -bottom-5 right-0 text-xs text-orange-600">
          Cut 1
        </div>
        <div className="absolute -bottom-5 left-0 text-xs text-orange-600">
          Cut 2
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-print-content>
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
            <div className="flex gap-2 no-print">
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
            {/* Plan Level Instructions */}
            {plan.instructions && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {plan.instructions.general && (
                    <div>
                      <span className="font-medium">General Instructions:</span>
                      <p className="text-blue-700">{plan.instructions.general}</p>
                    </div>
                  )}
                  {plan.instructions.cuttingMethod && (
                    <div>
                      <span className="font-medium">Cutting Method:</span>
                      <p className="text-blue-700">{plan.instructions.cuttingMethod}</p>
                    </div>
                  )}
                  {plan.instructions.heatNumber && (
                    <div>
                      <span className="font-medium">Heat Number:</span>
                      <p className="text-blue-700 font-mono">{plan.instructions.heatNumber}</p>
                    </div>
                  )}
                  {plan.instructions.millCertNumber && (
                    <div>
                      <span className="font-medium">Mill Cert:</span>
                      <p className="text-blue-700 font-mono">{plan.instructions.millCertNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cut #</TableHead>
                  <TableHead>Length (mm)</TableHead>
                  <TableHead>First Cut Angle</TableHead>
                  <TableHead>Second Cut Angle</TableHead>
                  <TableHead>Visual Guide</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Est. Time</TableHead>
                  <TableHead>Instructions</TableHead>
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
                      <TableCell className="font-mono text-lg font-bold">{cut.length}mm</TableCell>
                      
                      {/* First Cut Angle (Right side of piece) */}
                      <TableCell className="py-2">
                        <div className="flex flex-col items-center">
                          <span className={cut.startAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.startAngle || 90}°
                          </span>
                          <span className="text-xs text-muted-foreground">Right end</span>
                        </div>
                      </TableCell>
                      
                      {/* Second Cut Angle (Left side of piece) */}
                      <TableCell className="py-2">
                        <div className="flex flex-col items-center">
                          <span className={cut.endAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.endAngle || 90}°
                          </span>
                          <span className="text-xs text-muted-foreground">Left end</span>
                        </div>
                      </TableCell>
                      
                      {/* Visual Guide */}
                      <TableCell>
                        <SimpleBarGuide cut={cut} />
                      </TableCell>
                      
                      <TableCell className="py-2">
                        <Badge variant="secondary" className="px-2 py-1">{cut.quantity}</Badge>
                      </TableCell>
                      
                      <TableCell className="py-2">
                        <span className={hasAngleCuts ? "text-orange-600 font-medium" : "font-medium"}>
                          {formatTime(totalCutTime)}
                        </span>
                        {hasAngleCuts && (
                          <div className="text-xs text-orange-600">Angle cuts</div>
                        )}
                      </TableCell>
                      
                      <TableCell className="py-2">
                        <div className="space-y-1">
                          {cut.cuttingInstructions && (
                            <div className="text-sm font-medium text-blue-600">
                              {cut.cuttingInstructions}
                            </div>
                          )}
                          {cut.description && (
                            <div className="text-sm text-muted-foreground">
                              {cut.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Waste row */}
                <TableRow className="bg-red-50 border-t-2 border-red-200">
                  <TableCell className="font-bold text-red-600">OFFCUT</TableCell>
                  <TableCell className="font-mono text-red-600 text-lg font-bold">
                    {plan.wasteLength.toFixed(0)}mm
                  </TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">
                    <div className="text-red-600 font-medium">
                      Save if ≥300mm
                    </div>
                  </TableCell>
                  <TableCell className="text-center">1</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    <div>Tag with: {plan.instructions?.heatNumber || 'Heat#'}</div>
                    <div className="text-xs">
                      {((plan.wasteLength / plan.stockLength) * 100).toFixed(1)}% waste
                    </div>
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