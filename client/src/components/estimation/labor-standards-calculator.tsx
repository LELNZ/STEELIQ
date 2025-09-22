import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, Wrench, Clock, Users, TrendingUp, AlertCircle, Settings } from "lucide-react";

interface MaterialChildItem {
  id: string;
  type: 'stiffener' | 'endplate' | 'baseplate' | 'cleat' | 'bolt' | 'weld' | 'other';
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  thickness?: number;
  size?: string;
  length?: number;
  notes?: string;
  weldTime?: number; // Weld time from library component (in minutes)
}

interface MaterialCost {
  id: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  designation?: string;
  totalWeight?: number;
  childItems?: MaterialChildItem[]; // Connection details from library
}

interface LaborCost {
  id: string;
  category: 'workshop' | 'onsite' | 'subcontractor';
  subcategory: string;
  description: string;
  hours: number;
  rate: number;
  totalCost: number;
  location: 'workshop' | 'site';
  skillLevel: 'apprentice' | 'standard' | 'senior' | 'specialist';
  notes?: string;
}

interface LaborStandard {
  operation: 'cutting' | 'drilling' | 'welding';
  timeValue: number;
  unit: string;
  description: string;
}

interface CalculationConfig {
  defaultPosition: string;
  defaultSkillLevel: string;
  includeSetupTime: boolean;
  workshopEfficiency: number;
  siteEfficiency: number;
}

interface LaborCalculatorProps {
  materials: MaterialCost[];
  onLaborUpdate: (laborItems: LaborCost[]) => void;
}

export function LaborStandardsCalculator({ materials, onLaborUpdate }: LaborCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [config, setConfig] = useState<CalculationConfig>({
    defaultPosition: 'flat',
    defaultSkillLevel: 'tradesman',
    includeSetupTime: true,
    workshopEfficiency: 0.85, // 85% efficiency in workshop
    siteEfficiency: 0.70, // 70% efficiency on site
  });
  const [calculationResults, setCalculationResults] = useState<any[]>([]);
  const { toast } = useToast();

  // Fetch labor standards
  const { data: weldingStandards = [] } = useQuery({
    queryKey: ["/api/labor-standards/welding"],
    enabled: isOpen
  });

  const { data: drillingStandards = [] } = useQuery({
    queryKey: ["/api/labor-standards/drilling"],
    enabled: isOpen
  });

  const { data: cuttingStandards = [] } = useQuery({
    queryKey: ["/api/labor-standards/cutting"],
    enabled: isOpen
  });

  const { data: positionFactors = [] } = useQuery({
    queryKey: ["/api/labor-standards/position-factors"],
    enabled: isOpen
  });

  const { data: skillLevels = [] } = useQuery({
    queryKey: ["/api/labor-standards/skill-levels"],
    enabled: isOpen
  });

  const { data: laborRates = [] } = useQuery({
    queryKey: ["/api/labor-rates"],
    enabled: isOpen
  });

  // Calculate labor requirements from materials
  const calculateLaborHours = async () => {
    setIsCalculating(true);
    
    try {
      const results: any[] = [];
      let totalWorkshopHours = 0;
      let totalSiteHours = 0;

      // Get multiplier factors
      const positionFactor = positionFactors.find(p => p.position === config.defaultPosition)?.factor || 1.0;
      const skillMultiplier = skillLevels.find(s => s.code.toLowerCase() === config.defaultSkillLevel)?.multiplier || 1.0;
      
      // Base labor rate (per hour)
      const baseRate = laborRates.find(r => r.category === 'standard')?.hourly_rate || 85;

      for (const material of materials) {
        const materialResults = {
          materialId: material.id,
          materialName: `${material.materialCode} - ${material.materialName}`,
          operations: [] as any[]
        };

        // 1. CUTTING - Assume all materials need cutting
        if (material.quantity > 0 && cuttingStandards.length > 0) {
          // Use first available cutting standard (could be enhanced to match material type)
          const cuttingStd = cuttingStandards[0];
          const cuttingTime = material.quantity * (cuttingStd.time_per_meter || 10); // minutes
          const cuttingHours = (cuttingTime / 60) * positionFactor * skillMultiplier;
          
          materialResults.operations.push({
            operation: 'cutting',
            baseTime: cuttingTime,
            adjustedHours: cuttingHours,
            location: 'workshop',
            standard: cuttingStd.name
          });
          
          totalWorkshopHours += cuttingHours * config.workshopEfficiency;
        }

        // 2. DRILLING - Estimate holes based on material type and designation
        if (material.designation && drillingStandards.length > 0) {
          // Estimate holes: columns might need 8 holes, beams 4 holes, etc.
          let estimatedHoles = 4; // default
          if (material.materialCode.includes('C') || material.designation?.includes('C')) estimatedHoles = 8; // columns
          if (material.materialCode.includes('B') || material.designation?.includes('B')) estimatedHoles = 6; // bolts/connections
          
          const drillingStd = drillingStandards.find(d => d.method === 'mag_drill') || drillingStandards[0];
          const drillingTime = estimatedHoles * (drillingStd.time_per_hole || 5); // minutes
          const drillingHours = (drillingTime / 60) * positionFactor * skillMultiplier;
          
          materialResults.operations.push({
            operation: 'drilling',
            baseTime: drillingTime,
            adjustedHours: drillingHours,
            estimatedHoles,
            location: 'workshop',
            standard: drillingStd.name
          });
          
          totalWorkshopHours += drillingHours * config.workshopEfficiency;
        }

        // 3. WELDING - Check for connection components with actual weld times first
        let weldingTime = 0;
        let weldSource = 'estimated';
        
        // Check if material has connection child items with weld time from library
        if (material.childItems && material.childItems.length > 0) {
          const connectionWeldTime = material.childItems.reduce((sum, child) => {
            // If child has weldTime from library component
            if ((child as any).weldTime) {
              return sum + ((child as any).weldTime * child.quantity);
            }
            // If it's a weld type, use its length
            if (child.type === 'weld' && child.length) {
              const weldStd = weldingStandards.find(w => w.weld_type === 'fillet') || weldingStandards[0];
              return sum + (child.length * (weldStd.time_per_meter || 25) / 1000); // Convert mm to meters
            }
            return sum;
          }, 0);
          
          if (connectionWeldTime > 0) {
            weldingTime = connectionWeldTime;
            weldSource = 'library';
          }
        }
        
        // Fall back to estimation if no library data
        if (weldingTime === 0 && material.quantity > 0 && weldingStandards.length > 0) {
          const estimatedWeldLength = material.quantity * 0.3; // 30% of material length
          const weldingStd = weldingStandards.find(w => w.weld_type === 'fillet') || weldingStandards[0];
          weldingTime = estimatedWeldLength * (weldingStd.time_per_meter || 25); // minutes
        }
        
        if (weldingTime > 0) {
          const weldingHours = (weldingTime / 60) * positionFactor * skillMultiplier;
          
          // Split welding: 60% workshop, 40% site
          const workshopWeldHours = weldingHours * 0.6;
          const siteWeldHours = weldingHours * 0.4;
          
          materialResults.operations.push({
            operation: 'welding',
            baseTime: weldingTime,
            workshopHours: workshopWeldHours,
            siteHours: siteWeldHours,
            source: weldSource,
            standard: weldSource === 'library' ? 'Connection Components Library' : 'Estimated'
          });
          
          totalWorkshopHours += workshopWeldHours * config.workshopEfficiency;
          totalSiteHours += siteWeldHours * config.siteEfficiency;
        }

        results.push(materialResults);
      }

      // Add setup and miscellaneous time if enabled
      if (config.includeSetupTime) {
        totalWorkshopHours += materials.length * 0.25; // 15 min setup per material type
        totalSiteHours += materials.length * 0.5; // 30 min setup per material on site
      }

      setCalculationResults(results);

      // Create labor cost items
      const laborItems: LaborCost[] = [];

      if (totalWorkshopHours > 0) {
        laborItems.push({
          id: `workshop_${Date.now()}`,
          category: 'workshop',
          subcategory: 'fabrication',
          description: 'Workshop fabrication (cutting, drilling, welding)',
          hours: Math.round(totalWorkshopHours * 100) / 100,
          rate: baseRate * skillMultiplier,
          totalCost: Math.round(totalWorkshopHours * baseRate * skillMultiplier * 100) / 100,
          location: 'workshop',
          skillLevel: config.defaultSkillLevel as any,
          notes: `Applied ${config.defaultPosition} position (${positionFactor}x) and ${config.defaultSkillLevel} skill (${skillMultiplier}x)`
        });
      }

      if (totalSiteHours > 0) {
        laborItems.push({
          id: `site_${Date.now()}`,
          category: 'onsite',
          subcategory: 'installation',
          description: 'Site installation and assembly',
          hours: Math.round(totalSiteHours * 100) / 100,
          rate: baseRate * skillMultiplier * 1.2, // 20% premium for site work
          totalCost: Math.round(totalSiteHours * baseRate * skillMultiplier * 1.2 * 100) / 100,
          location: 'site',
          skillLevel: config.defaultSkillLevel as any,
          notes: `Site work premium applied. Position: ${config.defaultPosition}, Skill: ${config.defaultSkillLevel}`
        });
      }

      // Apply calculated labor to estimation
      onLaborUpdate(laborItems);

      toast({
        title: "Labor Calculated Successfully",
        description: `Generated ${laborItems.length} labor items from ${materials.length} materials`,
      });

    } catch (error) {
      console.error("Labor calculation error:", error);
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate labor requirements",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const totalEstimatedHours = calculationResults.reduce((sum, result) => {
    return sum + result.operations.reduce((opSum: number, op: any) => {
      return opSum + (op.adjustedHours || 0) + (op.workshopHours || 0) + (op.siteHours || 0);
    }, 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calculator className="h-4 w-4 mr-2" />
          Calculate Labor Standards
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Labor Standards Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-4 w-4" />
                Calculation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Work Position</Label>
                  <Select value={config.defaultPosition} onValueChange={(value) => 
                    setConfig(prev => ({ ...prev, defaultPosition: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {positionFactors.map((position: any) => (
                        <SelectItem key={position.position} value={position.position}>
                          {position.position} ({position.factor}x) - {position.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Default Skill Level</Label>
                  <Select value={config.defaultSkillLevel} onValueChange={(value) => 
                    setConfig(prev => ({ ...prev, defaultSkillLevel: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillLevels.map((skill: any) => (
                        <SelectItem key={skill.code.toLowerCase()} value={skill.code.toLowerCase()}>
                          {skill.name} ({skill.multiplier}x) - {skill.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="setup-time"
                  checked={config.includeSetupTime}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, includeSetupTime: checked }))
                  }
                />
                <Label htmlFor="setup-time">Include setup and miscellaneous time</Label>
              </div>
            </CardContent>
          </Card>

          {/* Materials Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-4 w-4" />
                Materials to Process ({materials.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {materials.slice(0, 5).map(material => (
                  <div key={material.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{material.materialCode}</span>
                    <span className="text-muted-foreground">
                      {material.quantity} {material.unit} - {material.materialName}
                    </span>
                  </div>
                ))}
                {materials.length > 5 && (
                  <div className="text-sm text-muted-foreground">
                    ... and {materials.length - 5} more materials
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calculation Results */}
          {calculationResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-4 w-4" />
                  Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 font-medium">
                    <Clock className="h-4 w-4" />
                    Total Estimated Hours: {totalEstimatedHours.toFixed(2)}
                  </div>
                </div>
                
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {calculationResults.map((result, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="font-medium text-sm mb-2">{result.materialName}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {result.operations.map((op: any, opIndex: number) => (
                          <div key={opIndex} className="bg-gray-50 p-2 rounded">
                            <div className="font-medium capitalize">{op.operation}</div>
                            <div className="text-muted-foreground">
                              {op.adjustedHours?.toFixed(2) || 
                               ((op.workshopHours || 0) + (op.siteHours || 0)).toFixed(2)} hrs
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Estimation Notice</p>
              <p className="text-yellow-700">
                This calculator provides estimates based on industry standards. Actual labor requirements 
                may vary based on project complexity, site conditions, and specific requirements.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button 
            onClick={calculateLaborHours}
            disabled={isCalculating || materials.length === 0}
          >
            {isCalculating ? (
              <>
                <Calculator className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Labor Hours
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Fix missing import
import { Package } from "lucide-react";