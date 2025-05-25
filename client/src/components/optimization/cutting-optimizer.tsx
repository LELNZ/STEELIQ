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
import { SimulationHistoryWorking } from "./simulation-history-working";
import { ComplexCutsConfigurator } from "./complex-cuts-configurator";
import EnhancedCuttingPlan from "./enhanced-cutting-plan";
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
    startAngle: 90,
    endAngle: 90,
    description: "",
    complexCuts: []
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

  // Calculate material summaries for tracking
  const calculateMaterialSummary = () => {
    const summary = new Map<string, { required: number; available: number; name: string }>();
    
    // Add required materials from cut requests
    cutRequests.forEach(request => {
      const key = request.materialType;
      const materialName = materialsData.find(m => m.code === key)?.name || key;
      const current = summary.get(key) || { required: 0, available: 0, name: materialName };
      current.required += request.length * request.quantity;
      summary.set(key, current);
    });
    
    // Add available materials from stock
    stockItems.forEach(stock => {
      const key = stock.materialType;
      const materialName = materialsData.find(m => m.code === key)?.name || key;
      const current = summary.get(key) || { required: 0, available: 0, name: materialName };
      current.available += stock.length * stock.available;
      summary.set(key, current);
    });
    
    return Array.from(summary.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      required: data.required,
      available: data.available,
      shortage: Math.max(0, data.required - data.available)
    }));
  };
  
  const materialSummary = calculateMaterialSummary();

  const addCutRequest = () => {
    if (!newCut.length || !newCut.materialType) return;

    const request: CutRequest = {
      id: `cut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      length: parseFloat(newCut.length),
      quantity: parseInt(newCut.quantity),
      materialType: newCut.materialType,
      startAngle: newCut.startAngle,
      endAngle: newCut.endAngle,
      description: newCut.description || undefined
    };

    setCutRequests([...cutRequests, request]);
    setNewCut({ length: "", quantity: "1", materialType: "", startAngle: 90, endAngle: 90, description: "", complexCuts: [] });
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
      case "angleAware":
        result = CuttingOptimizer.progressiveAngleOptimization(cutRequests, stockItems);
        break;
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
              {/* Material, Length, and Quantity - Professional Layout */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Material Specification</h4>
                
                {/* Material Selection */}
                <div>
                  <Label htmlFor="cut-material" className="text-xs font-medium text-slate-600">Material</Label>
                  <InstantMaterialSearch
                    value={newCut.materialType}
                    onSelect={(materialCode) => setNewCut({ ...newCut, materialType: materialCode })}
                    placeholder="Type to search materials..."
                    className="mt-1"
                  />
                </div>
                
                {/* Length and Quantity */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="cut-length" className="text-xs font-medium text-slate-600">Length (mm)</Label>
                    <Input
                      id="cut-length"
                      type="number"
                      value={newCut.length}
                      onChange={(e) => setNewCut({ ...newCut, length: e.target.value })}
                      placeholder="1000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cut-quantity" className="text-xs font-medium text-slate-600">Qty</Label>
                    <Input
                      id="cut-quantity"
                      type="number"
                      value={newCut.quantity}
                      onChange={(e) => setNewCut({ ...newCut, quantity: e.target.value })}
                      min="1"
                      className="mt-1 w-20"
                    />
                  </div>
                </div>

                {/* Dual Angle Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-angle" className="text-xs font-medium text-slate-600">Start Angle (°)</Label>
                    <Input
                      id="start-angle"
                      type="number"
                      value={newCut.startAngle || 90}
                      onChange={(e) => setNewCut({ ...newCut, startAngle: parseInt(e.target.value) || 90 })}
                      placeholder="90"
                      min="1"
                      max="180"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Left side cut (cutting from left to right)</p>
                  </div>
                  <div>
                    <Label htmlFor="end-angle" className="text-xs font-medium text-slate-600">End Angle (°)</Label>
                    <Input
                      id="end-angle"
                      type="number"
                      value={newCut.endAngle || 90}
                      onChange={(e) => setNewCut({ ...newCut, endAngle: parseInt(e.target.value) || 90 })}
                      placeholder="90"
                      min="1"
                      max="180"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Right side cut</p>
                  </div>
                </div>
                
                {/* Add Button */}
                <div className="flex justify-end">
                  <Button onClick={addCutRequest} size="sm" className="px-4 py-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cut
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cut-description">Description (optional)</Label>
                  <Input
                    id="cut-description"
                    value={newCut.description}
                    onChange={(e) => setNewCut({ ...newCut, description: e.target.value })}
                    placeholder="Job reference or notes"
                  />
                </div>
                <div>
                  <Label>Complex Cuts</Label>
                  <ComplexCutsConfigurator
                    length={newCut.length}
                    complexCuts={newCut.complexCuts}
                    onComplexCutsChange={(cuts) => setNewCut({ ...newCut, complexCuts: cuts })}
                    onAddToRequest={(reqLength, reqQuantity, cuts, material) => {
                      const request: CutRequest = {
                        id: `cut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        length: reqLength,
                        quantity: reqQuantity,
                        materialType: material || newCut.materialType,
                        angle: 90,
                        complexCuts: cuts,
                        description: undefined
                      };
                      setCutRequests([...cutRequests, request]);
                      setNewCut({ length: "", quantity: "1", materialType: "", angle: "90", description: "", complexCuts: [] });
                    }}
                  />
                </div>
              </div>

              {/* Cut requests list */}
              {cutRequests.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Requested Cuts ({cutRequests.length})</h4>
                  </div>
                  
                  {/* Material Summary for Cut Requirements */}
                  {materialSummary.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground">Material Requirements:</h5>
                      {materialSummary.map((material) => (
                        <div key={`req-${material.code}`} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{material.name}</div>
                            <div className="text-xs text-muted-foreground">{material.code}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {material.required.toLocaleString()}mm
                            </div>
                            {material.shortage > 0 && (
                              <div className="text-xs text-red-600 font-medium">
                                Need: {material.shortage.toLocaleString()}mm more
                              </div>
                            )}
                            {material.shortage === 0 && material.available > 0 && (
                              <div className="text-xs text-green-600 font-medium">
                                ✓ Sufficient stock
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Interactive Cutting Preview */}
              {cutRequests.length > 0 && (
                <div className="mt-6 space-y-4">
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Interactive Cutting Preview
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop cuts to see how they'll fit on material bars
                    </p>
                    
                    {/* Material Type Tabs */}
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(cutRequests.map(cut => cut.materialType))).map(materialType => (
                        <Badge key={materialType} variant="outline" className="text-xs">
                          {materialType}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Preview for each material type */}
                    {Array.from(new Set(cutRequests.map(cut => cut.materialType))).map(materialType => {
                      const materialCuts = cutRequests.filter(cut => cut.materialType === materialType);
                      const totalRequiredLength = materialCuts.reduce((sum, cut) => sum + (cut.length * cut.quantity), 0);
                      const availableStock = stockItems.filter(stock => stock.materialType === materialType);
                      const totalAvailableLength = availableStock.reduce((sum, stock) => sum + (stock.length * stock.available), 0);
                      
                      return (
                        <div key={materialType} className="border border-slate-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-sm">{materialType}</h5>
                            <div className="text-xs text-muted-foreground">
                              Required: {totalRequiredLength.toLocaleString()}mm | Available: {totalAvailableLength.toLocaleString()}mm
                            </div>
                          </div>
                          
                          {/* Cut pieces visualization */}
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-slate-600">Cut Pieces:</div>
                            <div className="flex flex-wrap gap-2">
                              {materialCuts.map((cut, index) => {
                                const colors = [
                                  'bg-blue-500',
                                  'bg-green-500', 
                                  'bg-purple-500',
                                  'bg-yellow-500',
                                  'bg-pink-500',
                                  'bg-cyan-500'
                                ];
                                const cutColor = colors[index % colors.length];
                                
                                return Array.from({ length: cut.quantity }, (_, qtyIndex) => (
                                  <div
                                    key={`${cut.id}-${qtyIndex}`}
                                    className={`${cutColor} text-white text-xs px-2 py-1 rounded cursor-move flex items-center gap-1 min-w-0`}
                                    draggable
                                    title={`${cut.length}mm piece - ${cut.startAngle || 90}°/${cut.endAngle || 90}° angles`}
                                  >
                                    <span className="truncate">{cut.length}mm</span>
                                    {((cut.startAngle && cut.startAngle !== 90) || (cut.endAngle && cut.endAngle !== 90)) && (
                                      <span className="text-yellow-200">∠</span>
                                    )}
                                  </div>
                                ));
                              })}
                            </div>
                          </div>
                          
                          {/* Material bars visualization */}
                          <div className="mt-4 space-y-2">
                            <div className="text-xs font-medium text-slate-600">Available Material Bars:</div>
                            {availableStock.length > 0 ? (
                              availableStock.map((stock, stockIndex) => (
                                Array.from({ length: stock.available }, (_, barIndex) => (
                                  <div key={`${stock.id}-${barIndex}`} className="space-y-1">
                                    <div className="text-xs text-muted-foreground">
                                      Bar #{stockIndex + 1}-{barIndex + 1}: {stock.length}mm
                                      {stock.cost && ` • $${stock.cost}/m`}
                                    </div>
                                    <div 
                                      className="h-8 bg-gradient-to-r from-slate-300 to-slate-400 border-2 border-slate-500 rounded relative min-h-8"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        // Visual feedback for drop (will be enhanced with actual optimization later)
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const dropPosition = ((e.clientX - rect.left) / rect.width) * stock.length;
                                        console.log(`Dropped at position: ${dropPosition.toFixed(0)}mm on ${stock.length}mm bar`);
                                      }}
                                      title={`Drop cuts here - ${stock.length}mm available`}
                                    >
                                      <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-xs font-medium">
                                        Drop cuts here ({stock.length}mm available)
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ))
                            ) : (
                              <div className="text-xs text-muted-foreground italic bg-yellow-50 border border-yellow-200 rounded p-2">
                                No stock available for {materialType}. Add stock items below to see cutting preview.
                              </div>
                            )}
                          </div>
                          
                          {/* Quick efficiency indicator */}
                          {totalAvailableLength > 0 && (
                            <div className="mt-3 p-2 bg-slate-50 rounded border">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">Estimated Efficiency:</span>
                                <span className={`font-medium ${
                                  (totalRequiredLength / totalAvailableLength) > 0.95 ? 'text-green-600' :
                                  (totalRequiredLength / totalAvailableLength) > 0.85 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {((totalRequiredLength / totalAvailableLength) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="mt-1 h-2 bg-slate-200 rounded overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    (totalRequiredLength / totalAvailableLength) > 0.95 ? 'bg-green-500' :
                                    (totalRequiredLength / totalAvailableLength) > 0.85 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((totalRequiredLength / totalAvailableLength) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Stock Items ({stockItems.length})</h4>
                    <div className="text-sm text-muted-foreground">
                      Total: {stockItems.reduce((total, stock) => total + (stock.length * stock.available), 0).toLocaleString()}mm
                    </div>
                  </div>
                  
                  {/* Material Summary for Available Stock */}
                  {materialSummary.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground">Available Stock by Material:</h5>
                      {materialSummary.map((material) => (
                        <div key={`stock-${material.code}`} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{material.name}</div>
                            <div className="text-xs text-muted-foreground">{material.code}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              Available: {material.available.toLocaleString()}mm
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Required: {material.required.toLocaleString()}mm
                            </div>
                            {material.available >= material.required ? (
                              <div className="text-xs text-green-600 font-medium">
                                ✓ {(material.available - material.required).toLocaleString()}mm excess
                              </div>
                            ) : (
                              <div className="text-xs text-red-600 font-medium">
                                ⚠ {material.shortage.toLocaleString()}mm short
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {stockItems.map((stock, index) => (
                    <div key={`stock-${stock.id || index}-${stock.length}-${stock.materialType}-${stock.available}`} className="flex items-center justify-between p-2 bg-muted rounded">
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

              {/* Enhanced Cutting Plans */}
              <EnhancedCuttingPlan 
                plans={optimizationResult.plans.map(plan => ({
                  stockId: plan.stockId,
                  stockLength: plan.stockLength,
                  cuts: plan.cuts.map(cut => ({
                    id: cut.requestId || `cut-${Math.random()}`,
                    length: cut.length,
                    position: cut.position,
                    startAngle: cutRequests.find(req => req.id === cut.requestId)?.startAngle,
                    endAngle: cutRequests.find(req => req.id === cut.requestId)?.endAngle,
                    description: cutRequests.find(req => req.id === cut.requestId)?.description,
                  })),
                  efficiency: plan.efficiency,
                  wasteLength: plan.wasteLength,
                  material: plan.cuts[0]?.requestId?.split('_')[0] || 'Steel'
                }))}
                materialName={stockItems[0]?.materialType || "Steel Bar"}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run optimization to see cutting plans</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Steel Cutting Optimizer</h3>
            <p className="text-muted-foreground mb-6">
              Add your cut requirements and stock materials to get started with optimization
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complex Cuts Dialog */}
      <ComplexCutsConfigurator 
        open={showComplexCutsDialog}
        onOpenChange={setShowComplexCutsDialog}
        onSave={handleComplexCutsSave}
      />

      {/* Job Creation Dialog */}
      <Dialog open={showCreateJobDialog} onOpenChange={setShowCreateJobDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Job from Optimization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create a new job with the current optimization results.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateJob}
                className="flex-1"
              >
                Create Job
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateJobDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simulation History */}
      <SimulationHistoryWorking 
        currentSimulationId={currentSimulationId}
        onLoadSimulation={loadSimulation}
        cutRequests={cutRequests}
        stockItems={stockItems}
        optimizationResult={optimizationResult}
      />
                              const widthPercent = (cut.length / planGroup.plan.stockLength) * 100;
                              const colors = [
                                'bg-blue-500',
                                'bg-green-500', 
                                'bg-purple-500',
                                'bg-yellow-500',
                                'bg-pink-500',
                                'bg-cyan-500'
                              ];
                              const cutColor = colors[cutIndex % colors.length];
                              
                              return (
                                <div key={cutIndex} className="absolute top-0 h-full flex items-center">
                                  {/* Cut piece */}
                                  <div 
                                    className={`h-full ${cutColor} border border-slate-700 flex items-center justify-center text-white text-xs font-bold rounded-sm`}
                                    style={{ 
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      minWidth: '20px'
                                    }}
                                    title={`Cut ${cutIndex + 1}: ${cut.length}mm at ${cut.position}mm`}
                                  >
                                    {widthPercent > 5 && (
                                      <span className="truncate px-1">
                                        {cut.length}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Angle indicators */}
                                  {((cut.startAngle && cut.startAngle !== 90) || (cut.endAngle && cut.endAngle !== 90)) && (
                                    <div className="absolute -top-6 left-0 right-0 flex justify-between text-xs">
                                      {cut.startAngle && cut.startAngle !== 90 && (
                                        <span className="bg-red-100 text-red-800 px-1 rounded border">
                                          ↗ {cut.startAngle}°
                                        </span>
                                      )}
                                      {cut.endAngle && cut.endAngle !== 90 && (
                                        <span className="bg-red-100 text-red-800 px-1 rounded border">
                                          {cut.endAngle}° ↖
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Chain indicator */}
                                  {cut.usesExistingAngle && (
                                    <div className="absolute -bottom-6 left-0 bg-green-100 text-green-800 text-xs px-2 py-1 rounded border">
                                      ⚡ Uses existing angle
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Waste area */}
                            {planGroup.plan.wasteLength > 0 && (
                              <div 
                                className="absolute top-0 h-full bg-red-300 border border-red-500 flex items-center justify-center text-red-800 text-xs font-bold"
                                style={{ 
                                  right: '0',
                                  width: `${(planGroup.plan.wasteLength / planGroup.plan.stockLength) * 100}%`
                                }}
                                title={`Waste: ${planGroup.plan.wasteLength.toFixed(0)}mm`}
                              >
                                WASTE
                              </div>
                            )}
                          </div>
                          
                          {/* Scale markers */}
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0mm</span>
                            <span>{(planGroup.plan.stockLength / 2).toFixed(0)}mm</span>
                            <span>{planGroup.plan.stockLength}mm</span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed cut list */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Cut Sequence:</h4>
                        <div className="grid gap-2">
                          {planGroup.plan.cuts.map((cut, cutIndex) => {
                            const colors = [
                              'border-blue-500 bg-blue-50',
                              'border-green-500 bg-green-50', 
                              'border-purple-500 bg-purple-50',
                              'border-yellow-500 bg-yellow-50',
                              'border-pink-500 bg-pink-50',
                              'border-cyan-500 bg-cyan-50'
                            ];
                            const cutColor = colors[cutIndex % colors.length];
                            
                            return (
                              <div key={cutIndex} className={`flex justify-between items-center text-sm p-3 border-2 rounded ${cutColor}`}>
                                <div className="flex items-center gap-3">
                                  <div className="font-bold text-lg w-8">#{cutIndex + 1}</div>
                                  <div>
                                    <div className="font-medium">{cut.length}mm piece</div>
                                    <div className="text-xs text-muted-foreground">
                                      Position: {cut.position.toFixed(0)}mm
                                      {cut.startAngle && cut.startAngle !== 90 && ` • Start: ${cut.startAngle}°`}
                                      {cut.endAngle && cut.endAngle !== 90 && ` • End: ${cut.endAngle}°`}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex gap-1">
                                    {cut.usesExistingAngle && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                                        ⚡ Chained
                                      </Badge>
                                    )}
                                    {cut.createsOffcut && (
                                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                                        ↻ Creates offcut
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {cut.quantity} piece{cut.quantity > 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Material savings indicator */}
                      {planGroup.plan.cuts.some(cut => cut.usesExistingAngle) && (
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="flex items-center gap-2 text-green-800">
                            <Zap className="h-4 w-4" />
                            <span className="font-medium">Material Savings Achieved!</span>
                          </div>
                          <div className="text-sm text-green-700 mt-1">
                            This plan uses progressive angle optimization to minimize waste and reduce cutting time.
                          </div>
                        </div>
                      )}
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
        <SimulationHistoryWorking 
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