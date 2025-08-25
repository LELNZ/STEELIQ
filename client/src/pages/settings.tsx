import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building, Truck, Settings2, TrendingUp, Calculator, Save, RotateCcw, Info, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import POTemplateSettings from "@/components/settings/POTemplateSettings";

interface OverheadSettings {
  opexMonthly: {
    workshopRent: number;
    utilities: number;
    insurance: number;
    administration: number;
    nonBillableStaff: number;
    maintenance: number;
  };
  capexAnnual: {
    equipmentDepreciation: number;
    vehicleDepreciation: number;
    toolsDepreciation: number;
    softwareLicenses: number;
  };
  projectModifiers: {
    smallProject: number; // <$50k
    largeProject: number; // >$200k
    siteWork: number;
    workshopOnly: number;
  };
  annualRevenueTarget: number;
}

interface MarginTargets {
  small: { min: number; max: number; threshold: number }; // <$50k
  medium: { min: number; max: number; threshold: number }; // $50k-$500k  
  large: { min: number; max: number; threshold: number }; // >$500k
}

export default function Settings() {
  const { toast } = useToast();
  const [overheadSettings, setOverheadSettings] = useState<OverheadSettings>({
    opexMonthly: {
      workshopRent: 8000,
      utilities: 2500,
      insurance: 1250,
      administration: 3000,
      nonBillableStaff: 10000,
      maintenance: 1500
    },
    capexAnnual: {
      equipmentDepreciation: 50000,
      vehicleDepreciation: 30000,
      toolsDepreciation: 14286,
      softwareLicenses: 12000
    },
    projectModifiers: {
      smallProject: 5,
      largeProject: -3,
      siteWork: 8,
      workshopOnly: -2
    },
    annualRevenueTarget: 1500000
  });

  const [marginTargets, setMarginTargets] = useState<MarginTargets>({
    small: { min: 20, max: 30, threshold: 50000 },
    medium: { min: 15, max: 25, threshold: 500000 },
    large: { min: 10, max: 20, threshold: 999999999 }
  });

  // Calculate dynamic overhead rate
  const calculateOverheadRate = () => {
    const annualOpex = Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0) * 12;
    const annualCapex = Object.values(overheadSettings.capexAnnual).reduce((sum, value) => sum + value, 0);
    const totalOverheads = annualOpex + annualCapex;
    return (totalOverheads / overheadSettings.annualRevenueTarget) * 100;
  };

  const saveSettings = () => {
    // Save to localStorage for now - could be moved to API later
    localStorage.setItem('lateralEngineering_overheadSettings', JSON.stringify(overheadSettings));
    localStorage.setItem('lateralEngineering_marginTargets', JSON.stringify(marginTargets));
    
    toast({
      title: "Settings Saved",
      description: "Overhead and margin settings have been updated successfully.",
    });
  };

  const resetToDefaults = () => {
    setOverheadSettings({
      opexMonthly: {
        workshopRent: 8000,
        utilities: 2500,
        insurance: 1250,
        administration: 3000,
        nonBillableStaff: 10000,
        maintenance: 1500
      },
      capexAnnual: {
        equipmentDepreciation: 50000,
        vehicleDepreciation: 30000,
        toolsDepreciation: 14286,
        softwareLicenses: 12000
      },
      projectModifiers: {
        smallProject: 5,
        largeProject: -3,
        siteWork: 8,
        workshopOnly: -2
      },
      annualRevenueTarget: 1500000
    });

    setMarginTargets({
      small: { min: 20, max: 30, threshold: 50000 },
      medium: { min: 15, max: 25, threshold: 500000 },
      large: { min: 10, max: 20, threshold: 999999999 }
    });
  };

  // Load saved settings on component mount
  useEffect(() => {
    const savedOverhead = localStorage.getItem('lateralEngineering_overheadSettings');
    const savedMargins = localStorage.getItem('lateralEngineering_marginTargets');
    
    if (savedOverhead) {
      setOverheadSettings(JSON.parse(savedOverhead));
    }
    if (savedMargins) {
      setMarginTargets(JSON.parse(savedMargins));
    }
  }, []);

  const annualOpex = Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0) * 12;
  const annualCapex = Object.values(overheadSettings.capexAnnual).reduce((sum, value) => sum + value, 0);
  const dynamicRate = calculateOverheadRate();

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Settings</h1>
          <p className="text-sm text-muted-foreground">Configure company-wide overhead costs, margin targets, and project modifiers for accurate estimation</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={saveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overheads" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overheads">Overhead Configuration</TabsTrigger>
          <TabsTrigger value="margins">Margin Targets</TabsTrigger>
          <TabsTrigger value="modifiers">Project Modifiers</TabsTrigger>
          <TabsTrigger value="summary">Summary & KPIs</TabsTrigger>
          <TabsTrigger value="po-templates">PO Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overheads" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* OPEX Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Monthly OPEX (Operational Expenses)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Workshop Rent/Lease</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Monthly cost of workshop rent/lease (excluding GST)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              • Commercial property rent<br/>
                              • Body corporate fees<br/>
                              • Property management fees<br/>
                              • Land lease payments
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      value={overheadSettings.opexMonthly.workshopRent}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        opexMonthly: { ...overheadSettings.opexMonthly, workshopRent: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Utilities (Power, Gas, Water)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Monthly utility costs for workshop operations</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              • Electricity for welding, cutting, lighting<br/>
                              • Gas for heating and cutting<br/>
                              • Water and wastewater<br/>
                              • Internet and phone services
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      value={overheadSettings.opexMonthly.utilities}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        opexMonthly: { ...overheadSettings.opexMonthly, utilities: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Insurance Premiums</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Monthly insurance costs for business operations</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              • Public liability insurance<br/>
                              • Professional indemnity<br/>
                              • Workers compensation<br/>
                              • Property and equipment insurance<br/>
                              • Motor vehicle insurance
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      value={overheadSettings.opexMonthly.insurance}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        opexMonthly: { ...overheadSettings.opexMonthly, insurance: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Administration Costs</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Monthly administrative and office overhead costs</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              • Office supplies and stationery<br/>
                              • Banking and finance fees<br/>
                              • Legal and accounting services<br/>
                              • Business registrations and licenses<br/>
                              • Marketing and advertising expenses
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      value={overheadSettings.opexMonthly.administration}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        opexMonthly: { ...overheadSettings.opexMonthly, administration: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Non-billable Staff Costs</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Monthly costs for staff time not directly charged to projects</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              • Management and supervision time<br/>
                              • Administrative and office staff<br/>
                              • Training and development time<br/>
                              • Sick leave and annual leave coverage<br/>
                              • Workshop maintenance and cleanup<br/>
                              • Estimating and quoting time
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      value={overheadSettings.opexMonthly.nonBillableStaff}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        opexMonthly: { ...overheadSettings.opexMonthly, nonBillableStaff: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Maintenance & Repairs</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Monthly maintenance and repair costs for equipment and facilities</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              • Equipment servicing and repairs<br/>
                              • Building maintenance and repairs<br/>
                              • Vehicle servicing and repairs<br/>
                              • Tool replacement and calibration<br/>
                              • Preventive maintenance programs
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      value={overheadSettings.opexMonthly.maintenance}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        opexMonthly: { ...overheadSettings.opexMonthly, maintenance: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Monthly OPEX</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${(Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0) * 12).toLocaleString()} annually
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CAPEX Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Annual CAPEX (Capital Depreciation)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Equipment Depreciation</Label>
                    <Input
                      type="number"
                      value={overheadSettings.capexAnnual.equipmentDepreciation}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        capexAnnual: { ...overheadSettings.capexAnnual, equipmentDepreciation: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Workshop equipment over 10 years</p>
                  </div>
                  <div>
                    <Label>Vehicle Depreciation</Label>
                    <Input
                      type="number"
                      value={overheadSettings.capexAnnual.vehicleDepreciation}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        capexAnnual: { ...overheadSettings.capexAnnual, vehicleDepreciation: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Trucks, utes, trailers over 5 years</p>
                  </div>
                  <div>
                    <Label>Tools & Machinery Depreciation</Label>
                    <Input
                      type="number"
                      value={overheadSettings.capexAnnual.toolsDepreciation}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        capexAnnual: { ...overheadSettings.capexAnnual, toolsDepreciation: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Hand tools, welders over 7 years</p>
                  </div>
                  <div>
                    <Label>Software Licenses</Label>
                    <Input
                      type="number"
                      value={overheadSettings.capexAnnual.softwareLicenses}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        capexAnnual: { ...overheadSettings.capexAnnual, softwareLicenses: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">CAD, estimating, accounting software</p>
                  </div>
                </div>
                <Separator />
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Annual CAPEX</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${Object.values(overheadSettings.capexAnnual).reduce((sum, value) => sum + value, 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Annual Revenue Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Target Annual Revenue</Label>
                  <Input
                    type="number"
                    value={overheadSettings.annualRevenueTarget}
                    onChange={(e) => setOverheadSettings({
                      ...overheadSettings,
                      annualRevenueTarget: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Calculated Base Overhead Rate</p>
                  <p className="text-3xl font-bold text-primary">{dynamicRate.toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Annual Overheads</p>
                  <p className="text-xl font-bold">${(annualOpex + annualCapex).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Project Size Margin Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Small Projects */}
                <Card className="border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">Small Projects</CardTitle>
                    <p className="text-sm text-muted-foreground">Value &lt; ${marginTargets.small.threshold.toLocaleString()}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Minimum Margin %</Label>
                      <Input
                        type="number"
                        value={marginTargets.small.min}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          small: { ...marginTargets.small, min: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Target Margin %</Label>
                      <Input
                        type="number"
                        value={marginTargets.small.max}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          small: { ...marginTargets.small, max: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Project Value Threshold</Label>
                      <Input
                        type="number"
                        value={marginTargets.small.threshold}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          small: { ...marginTargets.small, threshold: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Medium Projects */}
                <Card className="border-2 border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-orange-600">Medium Projects</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      ${marginTargets.small.threshold.toLocaleString()} - ${marginTargets.medium.threshold.toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Minimum Margin %</Label>
                      <Input
                        type="number"
                        value={marginTargets.medium.min}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          medium: { ...marginTargets.medium, min: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Target Margin %</Label>
                      <Input
                        type="number"
                        value={marginTargets.medium.max}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          medium: { ...marginTargets.medium, max: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Upper Threshold</Label>
                      <Input
                        type="number"
                        value={marginTargets.medium.threshold}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          medium: { ...marginTargets.medium, threshold: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Large Projects */}
                <Card className="border-2 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600">Large Projects</CardTitle>
                    <p className="text-sm text-muted-foreground">&gt; ${marginTargets.medium.threshold.toLocaleString()}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Minimum Margin %</Label>
                      <Input
                        type="number"
                        value={marginTargets.large.min}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          large: { ...marginTargets.large, min: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Target Margin %</Label>
                      <Input
                        type="number"
                        value={marginTargets.large.max}
                        onChange={(e) => setMarginTargets({
                          ...marginTargets,
                          large: { ...marginTargets.large, max: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="pt-6">
                      <Badge variant="secondary" className="w-full justify-center">
                        No Upper Limit
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Australian/NZ Steel Fabrication Standards</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Small (&lt;$50k):</span>
                    <span className="text-yellow-700"> 20-30% margin</span>
                  </div>
                  <div>
                    <span className="font-medium">Medium ($50k-$500k):</span>
                    <span className="text-yellow-700"> 15-25% margin</span>
                  </div>
                  <div>
                    <span className="font-medium">Large (&gt;$500k):</span>
                    <span className="text-yellow-700"> 10-20% margin</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modifiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings2 className="w-5 h-5 mr-2" />
                Project Type Overhead Modifiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Small Projects (&lt;$50k) Modifier (%)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Additional overhead percentage for small projects</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Small projects typically require:<br/>
                              • Higher administrative burden per dollar<br/>
                              • More frequent client communication<br/>
                              • Setup costs that don't scale<br/>
                              • More estimating time relative to value<br/>
                              Typical range: +3% to +8%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.smallProject}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, smallProject: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Higher admin burden and setup costs</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Large Projects (&gt;$200k) Modifier (%)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Overhead reduction percentage for large projects</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Large projects benefit from:<br/>
                              • Economies of scale in purchasing<br/>
                              • Lower admin cost per dollar<br/>
                              • Bulk material discounts<br/>
                              • More efficient resource utilization<br/>
                              Typical range: -2% to -5%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.largeProject}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, largeProject: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Economies of scale and bulk efficiencies</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Site Work Modifier (%)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Additional overhead percentage for projects involving site work</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Site work incurs additional costs:<br/>
                              • Travel time and vehicle costs<br/>
                              • Accommodation and meal allowances<br/>
                              • Site setup and security<br/>
                              • Weather delays and variations<br/>
                              • Additional H&S requirements<br/>
                              Typical range: +5% to +12%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.siteWork}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, siteWork: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Travel, accommodation, and site-specific costs</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Workshop Only Modifier (%)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Overhead reduction for projects completed entirely in workshop</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Workshop-only projects save costs:<br/>
                              • No travel time or vehicle costs<br/>
                              • No accommodation expenses<br/>
                              • Better equipment access and efficiency<br/>
                              • Controlled environment conditions<br/>
                              • Lower H&S overhead requirements<br/>
                              Typical range: -1% to -3%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.workshopOnly}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, workshopOnly: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Controlled environment, no travel costs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual OPEX:</span>
                  <span className="font-semibold">${annualOpex.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual CAPEX:</span>
                  <span className="font-semibold">${annualCapex.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Overheads:</span>
                  <span className="font-bold">${(annualOpex + annualCapex).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overhead Rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{dynamicRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Base overhead rate</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Revenue Target</p>
                  <p className="font-semibold">${overheadSettings.annualRevenueTarget.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Margin Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Small Projects:</span>
                    <span>{marginTargets.small.min}-{marginTargets.small.max}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">Medium Projects:</span>
                    <span>{marginTargets.medium.min}-{marginTargets.medium.max}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Large Projects:</span>
                    <span>{marginTargets.large.min}-{marginTargets.large.max}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="po-templates" className="space-y-6">
          <POTemplateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}