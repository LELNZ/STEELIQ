import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building, Truck, Settings2, TrendingUp, Calculator, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Settings</h1>
          <p className="text-muted-foreground">Configure overhead costs and margin targets for accurate estimation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overheads" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overheads">Overhead Configuration</TabsTrigger>
          <TabsTrigger value="margins">Margin Targets</TabsTrigger>
          <TabsTrigger value="modifiers">Project Modifiers</TabsTrigger>
          <TabsTrigger value="summary">Summary & KPIs</TabsTrigger>
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
                    <Label>Workshop Rent/Lease</Label>
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
                    <Label>Utilities (Power, Gas, Water)</Label>
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
                    <Label>Insurance Premiums</Label>
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
                    <Label>Administration Costs</Label>
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
                    <Label>Non-billable Staff Costs</Label>
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
                    <Label>Maintenance & Repairs</Label>
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
                    <Label>Small Projects (&lt;$50k) Modifier (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.smallProject}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, smallProject: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Higher admin burden</p>
                  </div>
                  <div>
                    <Label>Large Projects (&gt;$200k) Modifier (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.largeProject}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, largeProject: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Economies of scale</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Site Work Modifier (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.siteWork}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, siteWork: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Travel, accommodation, site costs</p>
                  </div>
                  <div>
                    <Label>Workshop Only Modifier (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overheadSettings.projectModifiers.workshopOnly}
                      onChange={(e) => setOverheadSettings({
                        ...overheadSettings,
                        projectModifiers: { ...overheadSettings.projectModifiers, workshopOnly: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">No travel costs</p>
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
      </Tabs>
    </div>
  );
}