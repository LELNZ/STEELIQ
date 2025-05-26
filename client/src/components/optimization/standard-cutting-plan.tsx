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

interface PlanInstructions {
  general?: string;
  cuttingMethod?: string;
  heatNumber?: string;
  millCertNumber?: string;
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
  instructions?: PlanInstructions;
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
  materialCode = "Material", 
  jobNumber,
  generalInstructions = [],
  cuttingMethod = "Bandsaw - standard setup"
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
        const hasAngleCuts = (cut.firstCutAngle && cut.firstCutAngle !== 90) || 
                           (cut.secondCutAngle && cut.secondCutAngle !== 90);
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
              .left-3 { left: 0.75rem; }
              .w-14 { width: 3.5rem; }
              .-top-4 { top: -1rem; }
              .right-1 { right: 0.25rem; }
              .left-1 { left: 0.25rem; }
              .-bottom-5 { bottom: -1.25rem; }
              .right-0 { right: 0; }
              .left-0 { left: 0; }
              .top-0 { top: 0; }
              .h-full { height: 100%; }
              .flex-col { flex-direction: column; }
              .items-center { align-items: center; }
              .justify-center { justify-content: center; }
              .gap-1 { gap: 0.25rem; }
              
              /* Badge styles */
              .inline-flex { display: inline-flex; }
              .items-center { align-items: center; }
              .rounded-full { border-radius: 9999px; }
              .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
              .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
              .bg-secondary { background-color: #f1f5f9; border: 1px solid #e2e8f0; }
              
              /* Width utilities */
              .w-14 { width: 3.5rem; }
              .w-20 { width: 5rem; }
              .w-24 { width: 6rem; }
              .w-28 { width: 7rem; }
              .w-12 { width: 3rem; }
              .w-16 { width: 4rem; }
              .min-w-48 { min-width: 12rem; }
              
              /* Flexbox utilities */
              .flex { display: flex; }
              .space-y-1 > * + * { margin-top: 0.25rem; }
              .relative { position: relative; }
              .absolute { position: absolute; }
              .top-0 { top: 0; }
              .left-0 { left: 0; }
              .h-8 { height: 2rem; }
              .h-full { height: 100%; }
              .w-full { width: 100%; }
              .rounded { border-radius: 0.25rem; }
              .overflow-hidden { overflow: hidden; }
              
              /* Stock bar visualization */
              .bg-blue-500 { background-color: #3b82f6; }
              .bg-red-200 { background-color: #fecaca; }
              .bg-green-100 { background-color: #dcfce7; }
              .border { border: 1px solid #e5e7eb; }
              .border-r { border-right: 1px solid #e5e7eb; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; }
              .text-white { color: white; }
              .font-medium { font-weight: 500; }
              
              /* Stats grid */
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
              .md\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .text-center { text-align: center; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .font-bold { font-weight: 700; }
              .mb-1 { margin-bottom: 0.25rem; }
              .mt-2 { margin-top: 0.5rem; }
              .pb-4 { padding-bottom: 1rem; }
              .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
              
              /* Card styles */
              .bg-card { background-color: white; }
              .text-foreground { color: #0f172a; }
              .text-muted-foreground { color: #64748b; }
              
              /* Header styling */
              .flex { display: flex; }
              .items-center { align-items: center; }
              .justify-between { justify-content: space-between; }
              .gap-2 { gap: 0.5rem; }
              .gap-4 { gap: 1rem; }
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              
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
      // Use html2canvas to capture the visual layout exactly as displayed
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const contentElement = document.querySelector('[data-print-content]');
      if (!contentElement) return;
      
      // Ensure element is properly positioned and visible
      const htmlElement = contentElement as HTMLElement;
      
      // Force a layout reflow to ensure accurate measurements
      htmlElement.style.position = 'relative';
      htmlElement.style.transform = 'translateZ(0)';
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Capture with precise pixel alignment
      const canvas = await html2canvas(htmlElement, {
        scale: 1.5, // Reduced scale for better text rendering and smaller file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false, // Use DOM rendering for better text quality
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure fonts are properly loaded in the clone
          const clonedElement = clonedDoc.querySelector('[data-print-content]') as HTMLElement;
          if (clonedElement) {
            (clonedElement.style as any).fontSmoothing = 'antialiased';
            (clonedElement.style as any).webkitFontSmoothing = 'antialiased';
            clonedElement.style.textRendering = 'optimizeLegibility';
          }
        }
      });
      
      // Use PNG for better text quality, but compress appropriately
      const imgData = canvas.toDataURL('image/png', 0.9);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // Professional margin
      const printWidth = pageWidth - (margin * 2);
      const printHeight = pageHeight - (margin * 2);

      // Add header with professional title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CUTTING OPTIMIZATION REPORT', pageWidth / 2, 20, { align: 'center' });
      
      // Add job details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      pdf.text(`Generated: ${currentDate} ${currentTime}`, margin, 30);
      if (jobNumber) {
        pdf.text(`Job: ${jobNumber}`, margin, 35);
      }
      pdf.text(`Material: ${materialCode}`, margin, 40);
      
      // Calculate scaling to ensure text remains crisp
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = printWidth;
      let imgHeight = printWidth / imgAspectRatio;
      
      // If height exceeds page, scale proportionally
      if (imgHeight > printHeight) {
        imgHeight = printHeight;
        imgWidth = printHeight * imgAspectRatio;
      }
      
      // Align to pixel boundaries for crisp rendering
      const xOffset = Math.round(margin + (printWidth - imgWidth) / 2);
      const yOffset = Math.round(margin);
      const finalWidth = Math.round(imgWidth);
      const finalHeight = Math.round(imgHeight);
      
      // Add image with precise positioning
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, '', 'MEDIUM');
      
      // Handle multi-page content if needed
      if (canvas.height > canvas.width * 1.3) {
        const remainingHeight = finalHeight - (pageHeight - margin * 2);
        if (remainingHeight > 0) {
          pdf.addPage();
          const secondPageOffset = -remainingHeight + margin;
          pdf.addImage(imgData, 'PNG', xOffset, secondPageOffset, finalWidth, finalHeight, '', 'MEDIUM');
        }
      }
      
      // Save the PDF
      pdf.save(`cutting-plan-${jobNumber || 'job'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      // Fallback to simple text PDF
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(`Cutting Plan - ${jobNumber || 'Job'}`, 20, 20);
        doc.setFontSize(12);
        doc.text(`Material: ${materialCode} | Plans: ${plans.length}`, 20, 35);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
        
        let yPos = 60;
        plans.forEach((plan, index) => {
          if (yPos > 250) { doc.addPage(); yPos = 20; }
          doc.text(`Stock Bar #${index + 1} - ${plan.stockLength}mm`, 20, yPos);
          yPos += 10;
          plan.cuts.forEach((cut, cutIndex) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`#${cutIndex + 1}: ${cut.length}mm - ${cut.startAngle || 90}°/${cut.endAngle || 90}° - Qty: ${cut.quantity}`, 20, yPos);
            yPos += 8;
          });
          yPos += 5;
        });
        
        doc.save(`cutting-plan-${jobNumber || 'job'}-${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (fallbackError) {
        console.error('Fallback PDF also failed:', fallbackError);
        handlePrint();
      }
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
          {cut.firstCutAngle || 90}°
        </div>
        <div className="absolute -top-4 left-1 text-xs text-orange-600 font-medium">
          {cut.secondCutAngle || 90}°
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
                Export PDF
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

      {/* Plan Instructions - Compact */}
      {(generalInstructions.length > 0 || cuttingMethod) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              Plan Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-4 items-start">
              {/* Cutting Method */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700">Method:</span>
                <span className="text-sm bg-blue-100 px-2 py-1 rounded">{cuttingMethod}</span>
              </div>
              
              {/* General Instructions */}
              {generalInstructions.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-blue-700">Instructions:</span>
                  <div className="flex flex-wrap gap-1">
                    {generalInstructions.map((instruction, index) => (
                      <span key={index} className="text-xs bg-blue-100 px-2 py-1 rounded">
                        {instruction}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Cutting Plans */}
      {plans.map((plan, planIndex) => (
        <Card key={planIndex}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {plan.materialCode} Bar #{planIndex + 1} - {plan.stockLength}mm
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
            
            {/* Per-bar totals summary */}
            <div className="grid grid-cols-4 gap-3 mt-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">
                  {(plan.stockLength - plan.wasteLength).toFixed(0)}mm
                </div>
                <div className="text-xs text-muted-foreground">Material Used</div>
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
                <div className="text-xs text-muted-foreground">Cut Time</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-purple-600">
                  {formatTime(plan.totalHandlingTime || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Handling Time</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>


            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Cut #</TableHead>
                  <TableHead className="w-20">Length (mm)</TableHead>
                  <TableHead className="w-20">Weight (kg)</TableHead>
                  <TableHead className="w-24">First Cut Angle</TableHead>
                  <TableHead className="w-24">Second Cut Angle</TableHead>
                  <TableHead className="w-28">Visual Guide</TableHead>
                  <TableHead className="w-12">Qty</TableHead>
                  <TableHead className="w-16">Est. Time</TableHead>
                  <TableHead className="min-w-48">Instructions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.cuts.map((cut, cutIndex) => {
                  const hasAngleCuts = (cut.firstCutAngle && cut.firstCutAngle !== 90) || 
                                     (cut.secondCutAngle && cut.secondCutAngle !== 90);
                  const timePerCut = hasAngleCuts ? 12 : 10;
                  const totalCutTime = timePerCut * cut.quantity;
                  
                  return (
                    <TableRow key={cutIndex}>
                      <TableCell className="font-medium">#{cutIndex + 1}</TableCell>
                      <TableCell className="font-mono text-lg font-bold">{cut.length}mm</TableCell>
                      
                      {/* Weight per piece */}
                      <TableCell className="font-mono font-medium">
                        {cut.weight ? `${cut.weight.toFixed(2)}kg` : 'N/A'}
                      </TableCell>
                      
                      {/* First Cut Angle (Right side of piece) */}
                      <TableCell className="py-2">
                        <div className="flex flex-col items-center">
                          <span className={cut.firstCutAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.firstCutAngle || 90}°
                          </span>
                          <span className="text-xs text-muted-foreground">Right end</span>
                        </div>
                      </TableCell>
                      
                      {/* Second Cut Angle (Left side of piece) */}
                      <TableCell className="py-2">
                        <div className="flex flex-col items-center">
                          <span className={cut.secondCutAngle !== 90 ? "text-orange-600 font-bold" : "font-medium"}>
                            {cut.secondCutAngle || 90}°
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
                          {cut.description && cut.description.trim() !== '' && (
                            <div className="text-sm text-muted-foreground">
                              {cut.description}
                            </div>
                          )}
                          {!cut.description || cut.description.trim() === '' ? (
                            <div className="text-xs text-muted-foreground italic">
                              No specific instructions
                            </div>
                          ) : null}
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
                  <TableCell className="text-red-600 font-medium text-center">
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