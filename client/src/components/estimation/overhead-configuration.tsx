import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, Building, Truck, Settings, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface OverheadConfig {
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

interface OverheadConfigurationProps {
  overheadPercentage: number;
  projectValue: number;
  projectType: 'workshop' | 'site' | 'mixed';
  onOverheadUpdate: (percentage: number) => void;
}

export default function OverheadConfiguration({ 
  overheadPercentage, 
  projectValue, 
  projectType,
  onOverheadUpdate 
}: OverheadConfigurationProps) {
  const [showConfig, setShowConfig] = useState(false);
  const { overheadSettings, calculateOverheadRate } = useBusinessSettings();

  const dynamicRate = calculateOverheadRate(projectValue, projectType);
  const annualOpex = Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0) * 12;
  const annualCapex = Object.values(overheadSettings.capexAnnual).reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Overhead Percentage</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              value={overheadPercentage}
              onChange={(e) => onOverheadUpdate(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calculator className="w-4 h-4 mr-1" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Overhead Rate Configuration</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="opex" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="opex">OPEX (Monthly)</TabsTrigger>
                    <TabsTrigger value="capex">CAPEX (Annual)</TabsTrigger>
                    <TabsTrigger value="modifiers">Project Modifiers</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="opex" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Building className="w-5 h-5 mr-2" />
                          Monthly Operational Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Workshop Rent/Lease</Label>
                          <Input
                            type="number"
                            value={config.opexMonthly.workshopRent}
                            onChange={(e) => setConfig({
                              ...config,
                              opexMonthly: { ...config.opexMonthly, workshopRent: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Utilities (Power, Gas, Water)</Label>
                          <Input
                            type="number"
                            value={config.opexMonthly.utilities}
                            onChange={(e) => setConfig({
                              ...config,
                              opexMonthly: { ...config.opexMonthly, utilities: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Insurance Premiums</Label>
                          <Input
                            type="number"
                            value={config.opexMonthly.insurance}
                            onChange={(e) => setConfig({
                              ...config,
                              opexMonthly: { ...config.opexMonthly, insurance: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Administration Costs</Label>
                          <Input
                            type="number"
                            value={config.opexMonthly.administration}
                            onChange={(e) => setConfig({
                              ...config,
                              opexMonthly: { ...config.opexMonthly, administration: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Non-billable Staff Costs</Label>
                          <Input
                            type="number"
                            value={config.opexMonthly.nonBillableStaff}
                            onChange={(e) => setConfig({
                              ...config,
                              opexMonthly: { ...config.opexMonthly, nonBillableStaff: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Maintenance & Repairs</Label>
                          <Input
                            type="number"
                            value={config.opexMonthly.maintenance}
                            onChange={(e) => setConfig({
                              ...config,
                              opexMonthly: { ...config.opexMonthly, maintenance: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="capex" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Truck className="w-5 h-5 mr-2" />
                          Annual Capital Expense Depreciation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Equipment Depreciation</Label>
                          <Input
                            type="number"
                            value={config.capexAnnual.equipmentDepreciation}
                            onChange={(e) => setConfig({
                              ...config,
                              capexAnnual: { ...config.capexAnnual, equipmentDepreciation: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Vehicle Depreciation</Label>
                          <Input
                            type="number"
                            value={config.capexAnnual.vehicleDepreciation}
                            onChange={(e) => setConfig({
                              ...config,
                              capexAnnual: { ...config.capexAnnual, vehicleDepreciation: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Tools & Machinery Depreciation</Label>
                          <Input
                            type="number"
                            value={config.capexAnnual.toolsDepreciation}
                            onChange={(e) => setConfig({
                              ...config,
                              capexAnnual: { ...config.capexAnnual, toolsDepreciation: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Software Licenses</Label>
                          <Input
                            type="number"
                            value={config.capexAnnual.softwareLicenses}
                            onChange={(e) => setConfig({
                              ...config,
                              capexAnnual: { ...config.capexAnnual, softwareLicenses: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="modifiers" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Settings className="w-5 h-5 mr-2" />
                          Project Type Modifiers (%)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Small Projects (&lt;$50k)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={config.projectModifiers.smallProject}
                            onChange={(e) => setConfig({
                              ...config,
                              projectModifiers: { ...config.projectModifiers, smallProject: parseFloat(e.target.value) || 0 }
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Higher admin burden</p>
                        </div>
                        <div>
                          <Label>Large Projects (&gt;$200k)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={config.projectModifiers.largeProject}
                            onChange={(e) => setConfig({
                              ...config,
                              projectModifiers: { ...config.projectModifiers, largeProject: parseFloat(e.target.value) || 0 }
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Economies of scale</p>
                        </div>
                        <div>
                          <Label>Site Work</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={config.projectModifiers.siteWork}
                            onChange={(e) => setConfig({
                              ...config,
                              projectModifiers: { ...config.projectModifiers, siteWork: parseFloat(e.target.value) || 0 }
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Travel, accommodation</p>
                        </div>
                        <div>
                          <Label>Workshop Only</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={config.projectModifiers.workshopOnly}
                            onChange={(e) => setConfig({
                              ...config,
                              projectModifiers: { ...config.projectModifiers, workshopOnly: parseFloat(e.target.value) || 0 }
                            })}
                          />
                          <p className="text-xs text-muted-foreground">No travel costs</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="summary" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2" />
                          Calculated Overhead Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Annual OPEX</p>
                            <p className="text-2xl font-bold">${annualOpex.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Annual CAPEX</p>
                            <p className="text-2xl font-bold">${annualCapex.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Revenue Target</p>
                            <p className="text-2xl font-bold">${config.annualRevenueTarget.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Recommended Overhead Rate</p>
                          <p className="text-3xl font-bold text-blue-600">{dynamicRate}%</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline"
                            onClick={() => setShowConfig(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => {
                              onOverheadUpdate(dynamicRate);
                              setShowConfig(false);
                            }}
                          >
                            Apply Rate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {dynamicRate !== overheadPercentage && (
          <Badge variant="outline" className="text-blue-600">
            Suggested: {dynamicRate}%
          </Badge>
        )}
      </div>
    </div>
  );
}