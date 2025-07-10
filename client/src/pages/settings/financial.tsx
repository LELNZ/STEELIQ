import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Calculator, Building, Percent, AlertCircle, Save } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    smallProject: number;
    largeProject: number;
    siteWork: number;
    workshopOnly: number;
  };
  annualRevenueTarget: number;
}

interface MarginTargets {
  small: { min: number; max: number; threshold: number };
  medium: { min: number; max: number; threshold: number };
  large: { min: number; max: number; threshold: number };
}

export default function FinancialSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch financial settings
  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings/financial"],
  });

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

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return apiRequest("/api/settings/financial", {
        method: "PUT",
        body: JSON.stringify(updatedSettings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/financial"] });
      toast({
        title: "Settings Saved",
        description: "Financial settings have been updated successfully.",
      });
      setHasChanges(false);
    },
  });

  const updateOverheadValue = (category: string, field: string, value: number) => {
    setOverheadSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof OverheadSettings],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const updateMarginTarget = (size: string, field: string, value: number) => {
    setMarginTargets(prev => ({
      ...prev,
      [size]: {
        ...prev[size as keyof MarginTargets],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const totalMonthlyOpex = Object.values(overheadSettings.opexMonthly).reduce((sum, val) => sum + val, 0);
  const totalAnnualCapex = Object.values(overheadSettings.capexAnnual).reduce((sum, val) => sum + val, 0);
  const totalAnnualOverheads = (totalMonthlyOpex * 12) + totalAnnualCapex;
  const overheadPercentage = ((totalAnnualOverheads / overheadSettings.annualRevenueTarget) * 100).toFixed(1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Settings</h1>
          <p className="text-muted-foreground">Configure cost centers, overhead rates, margin targets, and financial rules</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button 
            onClick={() => saveSettingsMutation.mutate({ overheadSettings, marginTargets })}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overheads" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overheads">Overhead Costs</TabsTrigger>
          <TabsTrigger value="margins">Margin Targets</TabsTrigger>
          <TabsTrigger value="labor">Labor Rates</TabsTrigger>
          <TabsTrigger value="rules">Financial Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overheads" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Monthly Operating Expenses (OPEX)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(overheadSettings.opexMonthly).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {key === 'workshopRent' && 'Monthly rent for workshop facility including rates'}
                              {key === 'utilities' && 'Power, water, gas, internet, phone bills'}
                              {key === 'insurance' && 'Business insurance, public liability, equipment cover'}
                              {key === 'administration' && 'Office supplies, accounting, legal fees'}
                              {key === 'nonBillableStaff' && 'Admin staff, management salaries not charged to jobs'}
                              {key === 'maintenance' && 'Equipment servicing, repairs, consumables'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id={key}
                        type="number"
                        value={value}
                        onChange={(e) => updateOverheadValue('opexMonthly', key, Number(e.target.value))}
                        className="text-right"
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Monthly OPEX</span>
                    <span className="font-semibold text-lg">${totalMonthlyOpex.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Overhead Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly OPEX</span>
                    <span className="font-medium">${totalMonthlyOpex.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Annual OPEX</span>
                    <span className="font-medium">${(totalMonthlyOpex * 12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Annual CAPEX</span>
                    <span className="font-medium">${totalAnnualCapex.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Annual Overheads</span>
                      <span className="font-bold text-lg">${totalAnnualOverheads.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overhead Rate</span>
                    <Badge variant={Number(overheadPercentage) > 25 ? "destructive" : "default"}>
                      {overheadPercentage}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on ${overheadSettings.annualRevenueTarget.toLocaleString()} annual revenue target
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Annual Capital Expenses (CAPEX)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(overheadSettings.capexAnnual).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`capex-${key}`} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {key === 'equipmentDepreciation' && 'Annual depreciation on welders, plasma cutters, tools'}
                              {key === 'vehicleDepreciation' && 'Trucks, forklifts, company vehicles depreciation'}
                              {key === 'toolsDepreciation' && 'Hand tools, power tools, measuring equipment'}
                              {key === 'softwareLicenses' && 'CAD software, estimation tools, annual licenses'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id={`capex-${key}`}
                        type="number"
                        value={value}
                        onChange={(e) => updateOverheadValue('capexAnnual', key, Number(e.target.value))}
                        className="text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Project Size-Based Margin Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(marginTargets).map(([size, targets]) => (
                <div key={size} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold capitalize">{size} Projects</h4>
                    <Badge variant="outline">
                      {size === 'small' && `< $${(targets.threshold / 1000).toFixed(0)}k`}
                      {size === 'medium' && `$${(marginTargets.small.threshold / 1000).toFixed(0)}k - $${(targets.threshold / 1000).toFixed(0)}k`}
                      {size === 'large' && `> $${(marginTargets.medium.threshold / 1000).toFixed(0)}k`}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Minimum Margin</Label>
                        <span className="text-sm font-medium">{targets.min}%</span>
                      </div>
                      <Slider
                        value={[targets.min]}
                        onValueChange={([value]) => updateMarginTarget(size, 'min', value)}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Maximum Margin</Label>
                        <span className="text-sm font-medium">{targets.max}%</span>
                      </div>
                      <Slider
                        value={[targets.max]}
                        onValueChange={([value]) => updateMarginTarget(size, 'max', value)}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {size !== 'large' && (
                      <div>
                        <Label htmlFor={`threshold-${size}`} className="text-sm">
                          Upper Threshold ($)
                        </Label>
                        <Input
                          id={`threshold-${size}`}
                          type="number"
                          value={targets.threshold}
                          onChange={(e) => updateMarginTarget(size, 'threshold', Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labor Rate Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure labor rates with payroll integration
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Labor rates are now managed through the enhanced Time & Payroll system
                with full integration capabilities.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = '/time-payroll'}
              >
                Go to Time & Payroll
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Rules & Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
                  <Input
                    id="payment-terms"
                    type="number"
                    defaultValue={30}
                    className="w-32"
                  />
                </div>
                <div>
                  <Label htmlFor="quote-validity">Quote Validity Period (days)</Label>
                  <Input
                    id="quote-validity"
                    type="number"
                    defaultValue={30}
                    className="w-32"
                  />
                </div>
                <div>
                  <Label htmlFor="gst-rate">GST Rate (%)</Label>
                  <Input
                    id="gst-rate"
                    type="number"
                    defaultValue={15}
                    step={0.1}
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}