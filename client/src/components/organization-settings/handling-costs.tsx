import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calculator, Plus, Edit, Trash2, Check, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HandlingCostConfig {
  id?: number;
  configName: string;
  calculationMethod: "percentage" | "fixed" | "per_unit";
  percentageValue?: number;
  fixedAmount?: number;
  perUnitRate?: number;
  unitType?: string;
  showAsSeparateLine: boolean;
  lineItemLabel: string;
  includeInSubtotal: boolean;
  applyToMaterials: boolean;
  applyToConsumables: boolean;
  minimumThreshold?: number;
  isDefault: boolean;
  isActive: boolean;
}

export default function HandlingCosts() {
  const { toast } = useToast();
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<HandlingCostConfig | null>(null);
  
  const [configForm, setConfigForm] = useState<HandlingCostConfig>({
    configName: "",
    calculationMethod: "percentage",
    percentageValue: 5,
    fixedAmount: 0,
    perUnitRate: 0,
    unitType: "kg",
    showAsSeparateLine: true,
    lineItemLabel: "Handling & Processing",
    includeInSubtotal: true,
    applyToMaterials: true,
    applyToConsumables: false,
    minimumThreshold: 0,
    isDefault: false,
    isActive: true,
  });

  // Fetch handling cost configurations
  const { data: configs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ["/api/organization/handling-costs"],
  });

  // Save handling cost configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (config: HandlingCostConfig) => {
      if (config.id) {
        await apiRequest(`/api/organization/handling-costs/${config.id}`, {
          method: "PUT",
          body: JSON.stringify(config),
        });
      } else {
        await apiRequest("/api/organization/handling-costs", {
          method: "POST",
          body: JSON.stringify(config),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/handling-costs"] });
      toast({
        title: "Success",
        description: `Handling cost configuration ${configForm.id ? "updated" : "created"} successfully`,
      });
      setIsEditingConfig(false);
      resetConfigForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${configForm.id ? "update" : "create"} handling cost configuration`,
        variant: "destructive",
      });
    },
  });

  // Delete handling cost configuration
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/handling-costs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/handling-costs"] });
      toast({
        title: "Success",
        description: "Handling cost configuration deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete handling cost configuration",
        variant: "destructive",
      });
    },
  });

  const resetConfigForm = () => {
    setConfigForm({
      configName: "",
      calculationMethod: "percentage",
      percentageValue: 5,
      fixedAmount: 0,
      perUnitRate: 0,
      unitType: "kg",
      showAsSeparateLine: true,
      lineItemLabel: "Handling & Processing",
      includeInSubtotal: true,
      applyToMaterials: true,
      applyToConsumables: false,
      minimumThreshold: 0,
      isDefault: false,
      isActive: true,
    });
    setSelectedConfig(null);
  };

  const handleEditConfig = (config: HandlingCostConfig) => {
    setConfigForm(config);
    setSelectedConfig(config);
    setIsEditingConfig(true);
  };

  const handleSaveConfig = () => {
    // Basic validation
    if (!configForm.configName) {
      toast({
        title: "Validation Error",
        description: "Please provide a configuration name",
        variant: "destructive",
      });
      return;
    }

    // Ensure only one default configuration
    if (configForm.isDefault && !configForm.id) {
      const hasDefault = configs.some((config: HandlingCostConfig) => config.isDefault);
      if (hasDefault) {
        toast({
          title: "Validation Error",
          description: "There can only be one default configuration",
          variant: "destructive",
        });
        return;
      }
    }

    saveConfigMutation.mutate(configForm);
  };

  const formatCalculationMethod = (method: string) => {
    switch (method) {
      case "percentage":
        return "Percentage";
      case "fixed":
        return "Fixed Amount";
      case "per_unit":
        return "Per Unit";
      default:
        return method;
    }
  };

  const getCalculationDisplay = (config: HandlingCostConfig) => {
    switch (config.calculationMethod) {
      case "percentage":
        return `${config.percentageValue}%`;
      case "fixed":
        return `$${config.fixedAmount?.toFixed(2) || "0.00"}`;
      case "per_unit":
        return `$${config.perUnitRate?.toFixed(2) || "0.00"} per ${config.unitType}`;
      default:
        return "-";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Handling Costs</h2>
        <p className="text-muted-foreground mt-1">
          Configure how handling and processing costs are calculated on quotes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Handling Cost Configurations</CardTitle>
              <CardDescription>
                Set up different handling cost calculation methods
              </CardDescription>
            </div>
            <Dialog open={isEditingConfig} onOpenChange={setIsEditingConfig}>
              <DialogTrigger asChild>
                <Button onClick={() => resetConfigForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedConfig ? "Edit" : "Add"} Handling Cost Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="configName">Configuration Name</Label>
                    <Input
                      id="configName"
                      value={configForm.configName}
                      onChange={(e) => setConfigForm({ ...configForm, configName: e.target.value })}
                      placeholder="Standard Handling"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Calculation Method</Label>
                    <RadioGroup
                      value={configForm.calculationMethod}
                      onValueChange={(value: any) => setConfigForm({ ...configForm, calculationMethod: value })}
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="percentage" id="percentage" />
                        <div className="flex-1">
                          <Label htmlFor="percentage" className="font-normal cursor-pointer">
                            Percentage of costs
                          </Label>
                          {configForm.calculationMethod === "percentage" && (
                            <div className="mt-2">
                              <Label htmlFor="percentageValue">Percentage (%)</Label>
                              <Input
                                id="percentageValue"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={configForm.percentageValue}
                                onChange={(e) => setConfigForm({ ...configForm, percentageValue: parseFloat(e.target.value) || 0 })}
                                placeholder="5"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <div className="flex-1">
                          <Label htmlFor="fixed" className="font-normal cursor-pointer">
                            Fixed amount
                          </Label>
                          {configForm.calculationMethod === "fixed" && (
                            <div className="mt-2">
                              <Label htmlFor="fixedAmount">Amount ($)</Label>
                              <Input
                                id="fixedAmount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={configForm.fixedAmount}
                                onChange={(e) => setConfigForm({ ...configForm, fixedAmount: parseFloat(e.target.value) || 0 })}
                                placeholder="100.00"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="per_unit" id="per_unit" />
                        <div className="flex-1">
                          <Label htmlFor="per_unit" className="font-normal cursor-pointer">
                            Per unit rate
                          </Label>
                          {configForm.calculationMethod === "per_unit" && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="perUnitRate">Rate ($)</Label>
                                <Input
                                  id="perUnitRate"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={configForm.perUnitRate}
                                  onChange={(e) => setConfigForm({ ...configForm, perUnitRate: parseFloat(e.target.value) || 0 })}
                                  placeholder="0.50"
                                />
                              </div>
                              <div>
                                <Label htmlFor="unitType">Unit Type</Label>
                                <Input
                                  id="unitType"
                                  value={configForm.unitType}
                                  onChange={(e) => setConfigForm({ ...configForm, unitType: e.target.value })}
                                  placeholder="kg"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="lineItemLabel">Line Item Label</Label>
                    <Input
                      id="lineItemLabel"
                      value={configForm.lineItemLabel}
                      onChange={(e) => setConfigForm({ ...configForm, lineItemLabel: e.target.value })}
                      placeholder="Handling & Processing"
                    />
                  </div>

                  <div>
                    <Label htmlFor="minimumThreshold">Minimum Threshold ($)</Label>
                    <Input
                      id="minimumThreshold"
                      type="number"
                      min="0"
                      step="0.01"
                      value={configForm.minimumThreshold}
                      onChange={(e) => setConfigForm({ ...configForm, minimumThreshold: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only apply handling costs to orders above this amount
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show as separate line item</Label>
                        <p className="text-xs text-muted-foreground">
                          Display handling costs as a distinct line in quotes
                        </p>
                      </div>
                      <Switch
                        checked={configForm.showAsSeparateLine}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, showAsSeparateLine: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Include in subtotal</Label>
                        <p className="text-xs text-muted-foreground">
                          Add handling costs before calculating tax
                        </p>
                      </div>
                      <Switch
                        checked={configForm.includeInSubtotal}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, includeInSubtotal: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Apply to materials</Label>
                        <p className="text-xs text-muted-foreground">
                          Calculate handling costs on material items
                        </p>
                      </div>
                      <Switch
                        checked={configForm.applyToMaterials}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, applyToMaterials: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Apply to consumables</Label>
                        <p className="text-xs text-muted-foreground">
                          Calculate handling costs on consumable items
                        </p>
                      </div>
                      <Switch
                        checked={configForm.applyToConsumables}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, applyToConsumables: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Set as default</Label>
                      <Switch
                        checked={configForm.isDefault}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, isDefault: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch
                        checked={configForm.isActive}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, isActive: checked })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingConfig(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
                    {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingConfigs ? (
            <div className="text-center py-8 text-muted-foreground">Loading configurations...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No handling cost configurations added yet. Click "Add Configuration" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Line Item</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config: HandlingCostConfig) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{config.configName}</div>
                        {config.isDefault && (
                          <span className="text-xs text-primary">Default</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatCalculationMethod(config.calculationMethod)}</div>
                        <div className="text-muted-foreground">{getCalculationDisplay(config)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{config.lineItemLabel}</div>
                        {config.showAsSeparateLine ? (
                          <span className="text-xs text-muted-foreground">Separate line</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Included in price</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {config.applyToMaterials && config.applyToConsumables ? (
                          "All items"
                        ) : config.applyToMaterials ? (
                          "Materials only"
                        ) : config.applyToConsumables ? (
                          "Consumables only"
                        ) : (
                          "None"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {config.isActive ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-sm text-green-600">Active</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Inactive</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConfig(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{config.configName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => config.id && deleteConfigMutation.mutate(config.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Examples</CardTitle>
          <CardDescription>
            Common handling cost configurations for steel fabrication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/10">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">Standard Percentage (5%)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Most common approach - adds 5% to material costs for handling
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Covers loading, unloading, storage, and processing labor
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/10">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">Fixed Fee ($150)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Flat handling fee for small orders under $5,000
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Ensures minimum handling costs are covered on small jobs
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/10">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">Weight-Based ($0.15/kg)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Charge per kilogram for heavy structural steel
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Fair pricing based on actual material handling effort
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}