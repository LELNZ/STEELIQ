import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InstantMaterialSearch from "@/components/materials/instant-material-search";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scissors, Plus, Trash2, Play, BarChart3, Package, Clock, Zap, Star, Download, FileText, Table, QrCode, Briefcase, ToggleLeft, ToggleRight, History, Settings } from "lucide-react";
import jsPDF from "jspdf";
import { SimulationHistory } from "./simulation-history";
import { 
  CuttingOptimizer, 
  CutRequest, 
  StockItem, 
  OptimizationResult,
  CuttingPlan 
} from "@/lib/cutting-optimization";
import { Material } from "@shared/schema";

export default function CuttingOptimizerComponent() {
  const [cutRequests, setCutRequests] = useState<CutRequest[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("multi");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isJobMode, setIsJobMode] = useState(false);
  const [groupIdenticalPlans, setGroupIdenticalPlans] = useState(true);
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false);
  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(null);

  // Fetch materials
  const { data: materialsData = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // New cut request form
  const [newCut, setNewCut] = useState({
    length: "",
    quantity: "1",
    materialType: "",
    angle: "90",
    description: ""
  });

  // New stock item form
  const [newStock, setNewStock] = useState({
    length: "",
    available: "1",
    materialType: "",
    cost: ""
  });

  // Helper function to get material name from code
  const getMaterialName = (materialCode: string): string => {
    const material = materialsData.find((m: Material) => m.code === materialCode);
    return material ? `${material.name} (${material.code})` : materialCode;
  };

  const materialTypes = materialsData.reduce((types: string[], material: Material) => {
    const category = material.category || "Other";
    if (!types.includes(category)) {
      types.push(category);
    }
    return types;
  }, []);



  const addCutRequest = () => {
    if (!newCut.length || !newCut.materialType) return;

    const request: CutRequest = {
      id: `cut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      length: parseFloat(newCut.length),
      quantity: parseInt(newCut.quantity),
      materialType: newCut.materialType,
      angle: parseFloat(newCut.angle),
      description: newCut.description || undefined
    };

    setCutRequests([...cutRequests, request]);
    setNewCut({ length: "", quantity: "1", materialType: "", angle: "90", description: "" });
  };

  const addStockItem = () => {
    if (!newStock.length || !newStock.materialType) return;

    const stock: StockItem = {
      id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      length: parseFloat(newStock.length),
      available: parseInt(newStock.available),
      materialType: newStock.materialType,
      cost: newStock.cost ? parseFloat(newStock.cost) : undefined
    };

    setStockItems([...stockItems, stock]);
    setNewStock({ length: "", available: "1", materialType: "", cost: "" });
  };

  const removeCutRequest = (id: string) => {
    setCutRequests(cutRequests.filter(req => req.id !== id));
  };

  const removeStockItem = (id: string) => {
    setStockItems(stockItems.filter(stock => stock.id !== id));
  };

  // Helper functions
  const generateJobNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LAT-${year}${month}${day}-${sequence}`;
  };

  const processPlansForDisplay = (plans: CuttingPlan[]) => {
    if (!groupIdenticalPlans) {
      return plans.map(plan => ({ plan, repeatCount: 1 }));
    }

    const grouped: { plan: CuttingPlan, repeatCount: number }[] = [];
    const processed = new Set<number>();

    plans.forEach((plan, index) => {
      if (processed.has(index)) return;

      // Find all identical plans (same stock length and same cut pattern)
      const identicalIndexes = plans
        .map((otherPlan, otherIndex) => {
          if (otherIndex === index) return otherIndex; // Include self
          
          // Check if stock lengths match
          if (otherPlan.stockLength !== plan.stockLength) return -1;
          
          // Check if cut patterns match (same cuts in same order)
          if (otherPlan.cuts.length !== plan.cuts.length) return -1;
          
          const cutsMatch = otherPlan.cuts.every((cut, cutIndex) => {
            const planCut = plan.cuts[cutIndex];
            return cut.length === planCut.length && 
                   cut.quantity === planCut.quantity && 
                   cut.position === planCut.position &&
                   (cut.angle || 90) === (planCut.angle || 90);
          });
          
          return cutsMatch ? otherIndex : -1;
        })
        .filter(idx => idx !== -1 && !processed.has(idx));

      // Mark all identical plans as processed
      identicalIndexes.forEach(idx => processed.add(idx));

      grouped.push({
        plan,
        repeatCount: identicalIndexes.length
      });
    });

    return grouped;
  };

  // Export functions
  const exportToPDF = () => {
    if (!optimizationResult) return;
    
    const identifier = isJobMode ? generateJobNumber() : `SIM-${Date.now()}`;
    const timestamp = new Date().toLocaleString('en-NZ');
    
    // Create PDF using jsPDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15;
    let yPosition = margin;

    // Helper function to add text with better formatting
    const addText = (text: string, fontSize = 11, isBold = false, indent = 0) => {
      pdf.setFontSize(fontSize);
      if (isBold) pdf.setFont('helvetica', 'bold');
      else pdf.setFont('helvetica', 'normal');
      
      const maxWidth = pageWidth - 2 * margin - indent;
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 25) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin + indent, yPosition);
        yPosition += fontSize * 0.65;
      });
      yPosition += 3;
    };

    // Add colored background for headers with repeat highlighting
    const addHeaderBox = (text: string, isRepeat = false, repeatCount = 0) => {
      const boxHeight = 10;
      if (isRepeat) {
        pdf.setFillColor(255, 193, 7); // Bright yellow for repeats
        pdf.rect(margin, yPosition - 6, pageWidth - 2 * margin, boxHeight, 'F');
        pdf.setTextColor(0, 0, 0); // Black text on yellow
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`REPEAT ${repeatCount}x - ${text}`, margin + 5, yPosition);
      } else {
        pdf.setFillColor(52, 144, 220); // Blue for headers
        pdf.rect(margin, yPosition - 6, pageWidth - 2 * margin, boxHeight, 'F');
        pdf.setTextColor(255, 255, 255); // White text on blue
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(text, margin + 5, yPosition);
      }
      pdf.setTextColor(0, 0, 0); // Reset to black
      yPosition += boxHeight + 5;
    };

    // Add checkbox for workshop tracking (compact version on right side)
    const addRightCheckbox = (text: string, checkboxNumber: number) => {
      const checkboxSize = 3;
      const rightMargin = pageWidth - margin - 40;
      const checkboxY = yPosition - 3;
      
      // Draw checkbox on right side
      pdf.setDrawColor(0);
      pdf.rect(rightMargin, checkboxY, checkboxSize, checkboxSize);
      
      // Add compact text next to checkbox
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${checkboxNumber}`, rightMargin + checkboxSize + 2, yPosition);
      
      return rightMargin; // Return position for alignment
    };

    // Professional Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LATERAL ENGINEERING LIMITED', margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(14);
    pdf.text('WORKSHOP CUTTING INSTRUCTIONS', margin, yPosition);
    yPosition += 15;

    // Job Info Box with key metrics
    pdf.setDrawColor(200);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 30);
    yPosition += 6;
    addText(`${isJobMode ? 'JOB' : 'SIMULATION'} ID: ${identifier}`, 12, true);
    addText(`Generated: ${timestamp}`, 10);
    addText(`EFFICIENCY: ${optimizationResult.summary.avgEfficiency.toFixed(1)}% | WASTE: ${optimizationResult.summary.totalWastePercentage.toFixed(1)}% | TIME: ${Math.floor(optimizationResult.summary.totalCuttingTime / 60)}h ${optimizationResult.summary.totalCuttingTime % 60}m`, 11, true);
    yPosition += 12;

    // Organize cutting plans by stock length for better readability
    const processedPlans = processPlansForDisplay(optimizationResult.plans);
    const stockGroups = new Map<number, typeof processedPlans>();
    
    // Group by stock length
    processedPlans.forEach(planGroup => {
      const stockLength = planGroup.plan.stockLength;
      if (!stockGroups.has(stockLength)) {
        stockGroups.set(stockLength, []);
      }
      stockGroups.get(stockLength)!.push(planGroup);
    });

    // Display each stock length group in organized columns
    Array.from(stockGroups.entries()).forEach(([stockLength, plans]) => {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      addHeaderBox(`STOCK LENGTH: ${stockLength}mm`);
      
      plans.forEach((planGroup, planIndex) => {
        // Get detailed material specification
        const request = cutRequests.find(req => req.id === (planGroup.plan.cuts[0]?.requestId || ''));
        const material = materialsData.find(m => m.code === request?.materialType);
        
        // Create proper material specification format: "SHS 100x100x9 x 8000mm"
        let materialSpec = 'Unknown Material';
        if (material) {
          const dimensions = [material.width, material.thickness]
            .filter(d => d && Number(d) > 0)
            .join('x');
          materialSpec = dimensions 
            ? `${material.name} ${dimensions} x ${stockLength}mm`
            : `${material.name} x ${stockLength}mm`;
        } else if (request?.materialType) {
          materialSpec = `${request.materialType} x ${stockLength}mm`;
        }
        
        if (planGroup.repeatCount > 1) {
          // Compact repeat section with right-side checkboxes
          addHeaderBox(materialSpec, true, planGroup.repeatCount);
          
          // Compact info line
          addText(`Eff: ${planGroup.plan.efficiency.toFixed(1)}% | Waste: ${planGroup.plan.wasteLength.toFixed(0)}mm/stock | Cuts:`, 9, false, 2);
          
          // Add numbered checkboxes on right side for each repeat
          const startY = yPosition;
          for (let i = 1; i <= planGroup.repeatCount; i++) {
            addRightCheckbox(`Stock ${i}`, i);
            if (i < planGroup.repeatCount) yPosition += 6; // Compact spacing
          }
          yPosition = Math.max(yPosition, startY + (planGroup.repeatCount * 6)) + 3;
        } else {
          // Single stock with compact format
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${materialSpec}`, margin, yPosition);
          addRightCheckbox('Complete', 1);
          yPosition += 3;
          
          addText(`Eff: ${planGroup.plan.efficiency.toFixed(1)}% | Waste: ${planGroup.plan.wasteLength.toFixed(0)}mm | Cuts:`, 9, false, 2);
        }
        
        // Compact cutting sequence with reduced spacing
        planGroup.plan.cuts.forEach((cut, cutIndex) => {
          const angleText = cut.angle && cut.angle !== 90 ? ` [${cut.angle}°]` : '';
          addText(`${cutIndex + 1}. ${cut.length}mm -> ${cut.position.toFixed(0)}mm${angleText}`, 9, false, 8);
        });
        yPosition += 4; // Reduced spacing between sections
      });
      yPosition += 5;
    });

    // Remnants section
    if (optimizationResult.remnants.length > 0) {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      addHeaderBox('REMNANTS TO SAVE (>500mm)');
      optimizationResult.remnants.forEach(remnant => {
        addText(`• ${remnant.length.toFixed(0)}mm ${remnant.materialType} - Label and store`, 10, false, 5);
      });
    }

    // Footer with safety reminder
    yPosition = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('⚠️ VERIFY ALL MEASUREMENTS BEFORE CUTTING | Generated by LEL Steel Management System', margin, yPosition);

    // Download PDF
    pdf.save(`${isJobMode ? 'Job' : 'Simulation'}_${identifier}_CuttingPlan.pdf`);
  };

  const exportToExcel = () => {
    if (!optimizationResult) return;
    
    const identifier = isJobMode ? generateJobNumber() : `SIM-${Date.now()}`;
    const timestamp = new Date().toLocaleString('en-NZ');
    
    // Create professional Excel-friendly CSV content
    let csvContent = "LATERAL ENGINEERING - CUTTING OPTIMIZATION REPORT\n";
    csvContent += `${isJobMode ? 'JOB' : 'SIMULATION'} ID:,${identifier}\n`;
    csvContent += `Generated:,${timestamp}\n`;
    csvContent += `Algorithm:,${optimizationResult.summary.algorithm}\n\n`;
    
    csvContent += "OPTIMIZATION SUMMARY\n";
    csvContent += "Metric,Value,Unit\n";
    csvContent += `Total Efficiency,${optimizationResult.summary.avgEfficiency.toFixed(1)},percent\n`;
    csvContent += `Total Waste,${optimizationResult.summary.totalWaste.toFixed(0)},mm\n`;
    csvContent += `Waste Percentage,${optimizationResult.summary.totalWastePercentage.toFixed(1)},percent\n`;
    csvContent += `Total Cuts,${optimizationResult.summary.totalCuts},count\n`;
    csvContent += `Cutting Time,${Math.floor(optimizationResult.summary.totalCuttingTime / 60)},hours\n`;
    csvContent += `Cutting Time,${optimizationResult.summary.totalCuttingTime % 60},minutes\n\n`;
    
    csvContent += "DETAILED CUTTING PLANS\n";
    csvContent += "Stock #,Length (mm),Material,Efficiency (%),Waste (mm),Cut #,Cut Length (mm),Quantity,Position (mm),Angle (deg)\n";
    
    const processedPlans = processPlansForDisplay(optimizationResult.plans);
    let stockCounter = 1;
    
    processedPlans.forEach((planGroup) => {
      const plan = planGroup.plan;
      if (planGroup.repeatCount > 1) {
        csvContent += `Stock Group ${stockCounter}-${stockCounter + planGroup.repeatCount - 1} (${planGroup.repeatCount}x identical),${plan.stockLength},${plan.cuts[0]?.requestId || 'Mixed'},${plan.efficiency.toFixed(1)},${plan.wasteLength.toFixed(0)},,,,,\n`;
      }
      
      for (let repeat = 0; repeat < planGroup.repeatCount; repeat++) {
        plan.cuts.forEach((cut, cutIndex) => {
          csvContent += `${stockCounter},${plan.stockLength},${cut.requestId || 'Mixed'},${plan.efficiency.toFixed(1)},${plan.wasteLength.toFixed(0)},${cutIndex + 1},${cut.length},${cut.quantity},${cut.position.toFixed(0)},${cut.angle || 90}\n`;
        });
        stockCounter++;
      }
    });
    
    if (optimizationResult.remnants.length > 0) {
      csvContent += "\nREMNANTS TO SAVE\n";
      csvContent += "Length (mm),Material,Reusable,Notes\n";
      optimizationResult.remnants.forEach(remnant => {
        csvContent += `${remnant.length.toFixed(0)},${remnant.materialType},${remnant.isReusable ? 'Yes' : 'No'},Label with mill cert/heat number\n`;
      });
    }

    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isJobMode ? 'job' : 'simulation'}-cutting-data-${identifier}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveSimulation = (result: any, cuts: CutRequest[], stock: StockItem[]) => {
    try {
      const simulation = {
        id: `SIM-${Date.now()}`,
        description: `${cuts.length} cuts, ${stock.length} stock items`,
        efficiency: result.summary.avgEfficiency,
        wastePercentage: result.summary.totalWastePercentage,
        stockCount: stock.length,
        totalCuttingTime: result.summary.totalCuttingTime,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        cutRequests: JSON.stringify(cuts),
        stockItems: JSON.stringify(stock),
        optimizationData: JSON.stringify(result)
      };

      const existing = localStorage.getItem('cutting_simulations');
      const simulations = existing ? JSON.parse(existing) : [];
      simulations.unshift(simulation); // Add to beginning
      
      // Keep only last 20 simulations
      if (simulations.length > 20) {
        simulations.splice(20);
      }
      
      localStorage.setItem('cutting_simulations', JSON.stringify(simulations));
    } catch (error) {
      console.error('Error saving simulation:', error);
    }
  };

  const generateQRCode = () => {
    if (!optimizationResult) return;
    
    const jobId = `JOB-${Date.now()}`;
    const qrData = {
      jobId,
      timestamp: new Date().toISOString(),
      summary: {
        totalWaste: optimizationResult.summary.totalWaste,
        wastePercentage: optimizationResult.summary.totalWastePercentage,
        efficiency: optimizationResult.summary.avgEfficiency,
        totalCuts: optimizationResult.summary.totalCuts,
        cuttingTime: optimizationResult.summary.totalCuttingTime
      },
      plans: optimizationResult.plans.length
    };
    
    // For now, generate a simple QR code URL (will be integrated with JMS later)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    
    // Open QR code in new window
    window.open(qrCodeUrl, '_blank');
  };

  const runOptimization = async () => {
    if (cutRequests.length === 0 || stockItems.length === 0) return;

    setIsOptimizing(true);
    
    // Add small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    let result: OptimizationResult;

    switch (selectedAlgorithm) {
      case "firstFit":
        result = CuttingOptimizer.firstFitDecreasing(cutRequests, stockItems);
        break;
      case "bestFit":
        result = CuttingOptimizer.bestFit(cutRequests, stockItems);
        break;
      case "binPacking":
        result = CuttingOptimizer.binPackingDP(cutRequests, stockItems);
        break;
      case "multi":
      default:
        result = CuttingOptimizer.multiAlgorithmOptimize(cutRequests, stockItems);
        break;
    }

    setOptimizationResult(result);
    setIsOptimizing(false);

    // Save simulation to localStorage for history
    if (!isJobMode) {
      saveSimulation(result, cutRequests, stockItems);
      // Force refresh of simulation history
      window.dispatchEvent(new Event('simulation-saved'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cutting Optimization</h1>
          <p className="text-muted-foreground">
            Minimize waste and maximize efficiency with advanced algorithms
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Mode:</Label>
            <div className="flex border rounded-md">
              <Button
                variant={!isJobMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsJobMode(false)}
                className={`h-8 px-3 text-xs rounded-r-none ${!isJobMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <Zap className="h-3 w-3 mr-1" />
                Simulation
              </Button>
              <Button
                variant={isJobMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsJobMode(true)}
                className={`h-8 px-3 text-xs rounded-l-none ${isJobMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <Briefcase className="h-3 w-3 mr-1" />
                Job
              </Button>
            </div>
          </div>
          
          {/* Plan Grouping Toggle */}
          {optimizationResult && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Group Plans:</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGroupIdenticalPlans(!groupIdenticalPlans)}
                className="h-8 px-3 text-xs"
              >
                {groupIdenticalPlans ? (
                  <>
                    <ToggleRight className="h-3 w-3 mr-1" />
                    ON
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-3 w-3 mr-1" />
                    OFF
                  </>
                )}
              </Button>
            </div>
          )}
          
          <Badge variant="secondary" className="text-sm">
            Target: &lt;5% Waste
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="space-y-6">
          {/* Cut Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Cut Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new cut request */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="cut-length">Length (mm)</Label>
                  <Input
                    id="cut-length"
                    type="number"
                    value={newCut.length}
                    onChange={(e) => setNewCut({ ...newCut, length: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cut-quantity">Qty</Label>
                  <Input
                    id="cut-quantity"
                    type="number"
                    value={newCut.quantity}
                    onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cut-angle">Angle (°)</Label>
                  <Input
                    id="cut-angle"
                    type="number"
                    value={newCut.angle}
                    onChange={(e) => setNewCut({ ...newCut, angle: e.target.value })}
                    placeholder="90"
                    min="1"
                    max="180"
                  />
                </div>
                <div className="col-span-4">
                  <Label htmlFor="cut-material">Material</Label>
                  <InstantMaterialSearch
                    value={newCut.materialType}
                    onSelect={(materialCode) => setNewCut({ ...newCut, materialType: materialCode })}
                    placeholder="Type to search materials..."
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <Button onClick={addCutRequest} size="sm" className="px-3 py-2 h-10 w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="cut-description">Description (optional)</Label>
                <Input
                  id="cut-description"
                  value={newCut.description}
                  onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                  placeholder="Job reference or notes"
                />
              </div>

              {/* Cut requests list */}
              {cutRequests.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Requested Cuts ({cutRequests.length})</h4>
                    <div className="text-sm text-muted-foreground">
                      Total: {cutRequests.reduce((total, req) => total + (req.length * req.quantity), 0).toLocaleString()}mm
                    </div>
                  </div>
                  {cutRequests.map((request, index) => (
                    <div key={`cut-${index}-${request.id}`} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <span className="font-medium">{request.length}mm</span>
                        <span className="text-muted-foreground"> × {request.quantity}</span>
                        {request.angle && request.angle !== 90 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {request.angle}° angle
                          </Badge>
                        )}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {request.materialType}
                        </Badge>
                        {request.description && (
                          <p className="text-xs text-muted-foreground">{request.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Est. time: {request.angle && request.angle !== 90 ? '12' : '10'} min per cut
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCutRequest(request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new stock item */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="stock-length">Length (mm)</Label>
                  <Input
                    id="stock-length"
                    type="number"
                    value={newStock.length}
                    onChange={(e) => setNewStock({ ...newStock, length: e.target.value })}
                    placeholder="6000"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="stock-available">Qty</Label>
                  <Input
                    id="stock-available"
                    type="number"
                    value={newStock.available}
                    onChange={(e) => setNewStock({ ...newStock, available: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="stock-cost">Cost ($/m)</Label>
                  <Input
                    id="stock-cost"
                    type="number"
                    step="0.01"
                    value={newStock.cost}
                    onChange={(e) => setNewStock({ ...newStock, cost: e.target.value })}
                    placeholder="25.50"
                  />
                </div>
                <div className="col-span-4">
                  <Label htmlFor="stock-material">Material</Label>
                  <InstantMaterialSearch
                    value={newStock.materialType}
                    onSelect={(materialCode) => setNewStock({ ...newStock, materialType: materialCode })}
                    placeholder="Type to search materials..."
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <Button onClick={addStockItem} size="sm" className="px-3 py-2 h-10 w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>



              {/* Stock items list */}
              {stockItems.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Separator />
                  <h4 className="font-medium">Stock Items ({stockItems.length})</h4>
                  {stockItems.map((stock, index) => (
                    <div key={`stock-item-${index}-${stock.length}-${stock.materialType}`} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <span className="font-medium">{stock.length}mm</span>
                        <span className="text-muted-foreground"> × {stock.available}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {stock.materialType}
                        </Badge>
                        {stock.cost && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ${stock.cost}/m
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStockItem(stock.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimization Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Optimization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="algorithm">Algorithm</Label>
                <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multi">Multi-Algorithm (Best Result)</SelectItem>
                    <SelectItem value="firstFit">First Fit Decreasing</SelectItem>
                    <SelectItem value="bestFit">Best Fit</SelectItem>
                    <SelectItem value="binPacking">Bin Packing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={runOptimization}
                disabled={cutRequests.length === 0 || stockItems.length === 0 || isOptimizing}
                className="w-full"
                size="lg"
              >
                {isOptimizing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Optimization
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {optimizationResult ? (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Optimization Results
                    </CardTitle>
                    <div className="flex gap-1">
                      {isJobMode && (
                        <Button variant="default" size="sm" onClick={() => setShowCreateJobDialog(true)} className="h-7 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Create Job
                        </Button>
                      )}

                      <Button variant="outline" size="sm" onClick={exportToPDF} className="h-7 px-2 text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportToExcel} className="h-7 px-2 text-xs">
                        <Table className="h-3 w-3 mr-1" />
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={generateQRCode} className="h-7 px-2 text-xs">
                        <QrCode className="h-3 w-3 mr-1" />
                        QR
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {optimizationResult.summary.avgEfficiency.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Efficiency</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold text-orange-600">
                        {optimizationResult.summary.totalWastePercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Waste</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Material Length:</span>
                      <span className="font-medium">{optimizationResult.plans.reduce((total, plan) => total + plan.stockLength, 0).toLocaleString()}mm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Cuts:</span>
                      <span className="font-medium">{optimizationResult.summary.totalCuts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Cutting Time:</span>
                      <span className="font-medium">
                        {Math.floor(optimizationResult.summary.totalCuttingTime / 60)}h {optimizationResult.summary.totalCuttingTime % 60}m
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Waste:</span>
                      <span className="font-medium">{optimizationResult.summary.totalWaste.toFixed(0)}mm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Algorithm:</span>
                      <span className="font-medium">{optimizationResult.summary.algorithm}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Execution Time:</span>
                      <span className="font-medium">{optimizationResult.summary.executionTime.toFixed(1)}ms</span>
                    </div>
                  </div>

                  <Progress 
                    value={optimizationResult.summary.avgEfficiency} 
                    className="h-2"
                  />
                </CardContent>
              </Card>

              {/* Cutting Plans */}
              <Card>
                <CardHeader>
                  <CardTitle>Cutting Plans ({optimizationResult.plans.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {optimizationResult.plans.map((plan, index) => (
                    <div key={plan.stockId} className="border rounded p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Stock #{index + 1}</span>
                        <Badge variant={plan.efficiency > 90 ? "default" : plan.efficiency > 75 ? "secondary" : "destructive"}>
                          {plan.efficiency.toFixed(1)}% efficiency
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Length: {plan.stockLength}mm | Cuts: {plan.cuts.length} | Waste: {plan.wasteLength.toFixed(0)}mm
                      </div>

                      <div className="space-y-1">
                        {plan.cuts.map((cut, cutIndex) => (
                          <div key={cutIndex} className="flex justify-between text-xs p-1 bg-muted rounded">
                            <div>
                              <span>Cut {cutIndex + 1}: {cut.length}mm</span>
                              {cut.angle && cut.angle !== 90 && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {cut.angle}°
                                </Badge>
                              )}
                            </div>
                            <span>@ {cut.position.toFixed(0)}mm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Remnants */}
              {optimizationResult.remnants.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reusable Remnants ({optimizationResult.remnants.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {optimizationResult.remnants.map((remnant) => (
                      <div key={remnant.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-medium">{remnant.length.toFixed(0)}mm</span>
                        <Badge variant="outline">{remnant.materialType}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Unallocated Cuts */}
              {optimizationResult.unallocated.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      Unallocated Cuts ({optimizationResult.unallocated.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {optimizationResult.unallocated.map((cut) => (
                      <div key={cut.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm">{cut.length}mm × {cut.quantity}</span>
                        <Badge variant="destructive">{cut.materialType}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Optimize</h3>
                <p className="text-muted-foreground">
                  Add your cut requirements and available stock, then run the optimization to get the best cutting plan.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Simulation History Section */}
      <div className="mt-8">
        <SimulationHistory 
          key={`sim-history-${Date.now()}`}
          onRecallSimulation={(simulationData) => {
            // Load the recalled simulation data back into the optimizer
            if (simulationData.cutRequests) {
              setCutRequests(JSON.parse(simulationData.cutRequests));
            }
            if (simulationData.stockItems) {
              setStockItems(JSON.parse(simulationData.stockItems));
            }
            if (simulationData.optimizationData) {
              setOptimizationResult(JSON.parse(simulationData.optimizationData));
            }
          }}
        />
      </div>
    </div>
  );
}