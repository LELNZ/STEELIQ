import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Wrench, Shield, Package, AlertCircle, Save, Plus, Trash2 } from "lucide-react";

export default function OperationsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch operations settings
  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings/operations"],
  });

  const [fabricationSettings, setFabricationSettings] = useState({
    defaultKerf: 2.4,
    defaultTolerance: 0.5,
    standardLengths: [6000, 9000, 12000],
    minimumOffcutLength: 500,
    materialWasteAllowance: 5,
    defaultSteelGrade: "300PLUS",
    requireMillCertificates: true,
    qualityControlEnabled: true,
    welderCertificationTracking: true
  });

  const [workflowSettings, setWorkflowSettings] = useState({
    requireEstimationApproval: true,
    estimationApprovalThreshold: 50000,
    autoAssignJobNumbers: true,
    jobNumberFormat: "JOB-{YYYY}-{0000}",
    enableMaterialTracking: true,
    enableTimeTracking: true,
    enableQualityChecks: true,
    requirePhotoDocumentation: true
  });

  const [qualitySettings, setQualitySettings] = useState({
    weldingInspectionRequired: true,
    inspectionFrequency: "per_job",
    requireWPS: true,
    requireWelder: true,
    requireNDT: false,
    ndtFrequency: "critical_only",
    documentRetentionYears: 7,
    requireSafetyInduction: true
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return apiRequest("/api/settings/operations", {
        method: "PUT",
        body: JSON.stringify(updatedSettings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/operations"] });
      toast({
        title: "Settings Saved",
        description: "Operations settings have been updated successfully.",
      });
      setHasChanges(false);
    },
  });

  const updateFabricationSetting = (key: string, value: any) => {
    setFabricationSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateWorkflowSetting = (key: string, value: any) => {
    setWorkflowSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateQualitySetting = (key: string, value: any) => {
    setQualitySettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addStandardLength = () => {
    const newLength = prompt("Enter new standard length (mm):");
    if (newLength) {
      updateFabricationSetting(
        "standardLengths", 
        [...fabricationSettings.standardLengths, Number(newLength)]
      );
    }
  };

  const removeStandardLength = (length: number) => {
    updateFabricationSetting(
      "standardLengths",
      fabricationSettings.standardLengths.filter(l => l !== length)
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Settings</h1>
          <p className="text-muted-foreground">Configure fabrication standards, quality controls, and workflow rules</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button 
            onClick={() => saveSettingsMutation.mutate({ 
              fabricationSettings, 
              workflowSettings, 
              qualitySettings 
            })}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fabrication" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fabrication">Fabrication Standards</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Rules</TabsTrigger>
          <TabsTrigger value="quality">Quality & Safety</TabsTrigger>
        </TabsList>

        <TabsContent value="fabrication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Cutting & Material Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-kerf">Default Kerf Width (mm)</Label>
                  <Input
                    id="default-kerf"
                    type="number"
                    step="0.1"
                    value={fabricationSettings.defaultKerf}
                    onChange={(e) => updateFabricationSetting("defaultKerf", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard cutting blade width
                  </p>
                </div>
                <div>
                  <Label htmlFor="default-tolerance">Default Tolerance (mm)</Label>
                  <Input
                    id="default-tolerance"
                    type="number"
                    step="0.1"
                    value={fabricationSettings.defaultTolerance}
                    onChange={(e) => updateFabricationSetting("defaultTolerance", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Measurement error allowance
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Standard Stock Lengths (mm)</Label>
                  <Button size="sm" variant="outline" onClick={addStandardLength}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fabricationSettings.standardLengths.map(length => (
                    <Badge key={length} variant="secondary" className="gap-1">
                      {length.toLocaleString()}mm
                      <button
                        onClick={() => removeStandardLength(length)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-offcut">Minimum Offcut Length (mm)</Label>
                  <Input
                    id="min-offcut"
                    type="number"
                    value={fabricationSettings.minimumOffcutLength}
                    onChange={(e) => updateFabricationSetting("minimumOffcutLength", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pieces shorter than this are scrap
                  </p>
                </div>
                <div>
                  <Label htmlFor="waste-allowance">Material Waste Allowance (%)</Label>
                  <Input
                    id="waste-allowance"
                    type="number"
                    value={fabricationSettings.materialWasteAllowance}
                    onChange={(e) => updateFabricationSetting("materialWasteAllowance", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected waste percentage
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="default-grade">Default Steel Grade</Label>
                <Select
                  value={fabricationSettings.defaultSteelGrade}
                  onValueChange={(value) => updateFabricationSetting("defaultSteelGrade", value)}
                >
                  <SelectTrigger id="default-grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">Grade 250</SelectItem>
                    <SelectItem value="300PLUS">300PLUS®</SelectItem>
                    <SelectItem value="350">Grade 350</SelectItem>
                    <SelectItem value="450">Grade 450</SelectItem>
                    <SelectItem value="S355">S355</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mill-certs">Require Mill Certificates</Label>
                    <p className="text-xs text-muted-foreground">
                      Material test certificates required
                    </p>
                  </div>
                  <Switch
                    id="mill-certs"
                    checked={fabricationSettings.requireMillCertificates}
                    onCheckedChange={(checked) => updateFabricationSetting("requireMillCertificates", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="welder-tracking">Welder Certification Tracking</Label>
                    <p className="text-xs text-muted-foreground">
                      Track welder qualifications
                    </p>
                  </div>
                  <Switch
                    id="welder-tracking"
                    checked={fabricationSettings.welderCertificationTracking}
                    onCheckedChange={(checked) => updateFabricationSetting("welderCertificationTracking", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Workflow Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-job-numbers">Auto-assign Job Numbers</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically generate job numbers
                    </p>
                  </div>
                  <Switch
                    id="auto-job-numbers"
                    checked={workflowSettings.autoAssignJobNumbers}
                    onCheckedChange={(checked) => updateWorkflowSetting("autoAssignJobNumbers", checked)}
                  />
                </div>

                {workflowSettings.autoAssignJobNumbers && (
                  <div>
                    <Label htmlFor="job-format">Job Number Format</Label>
                    <Input
                      id="job-format"
                      value={workflowSettings.jobNumberFormat}
                      onChange={(e) => updateWorkflowSetting("jobNumberFormat", e.target.value)}
                      placeholder="JOB-{YYYY}-{0000}"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {"{YYYY}"} = Year, {"{0000}"} = Sequential number
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="estimation-approval">Require Estimation Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Large estimates need approval
                    </p>
                  </div>
                  <Switch
                    id="estimation-approval"
                    checked={workflowSettings.requireEstimationApproval}
                    onCheckedChange={(checked) => updateWorkflowSetting("requireEstimationApproval", checked)}
                  />
                </div>

                {workflowSettings.requireEstimationApproval && (
                  <div>
                    <Label htmlFor="approval-threshold">Approval Threshold ($)</Label>
                    <Input
                      id="approval-threshold"
                      type="number"
                      value={workflowSettings.estimationApprovalThreshold}
                      onChange={(e) => updateWorkflowSetting("estimationApprovalThreshold", Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="material-tracking">Enable Material Tracking</Label>
                    <p className="text-xs text-muted-foreground">
                      Track material usage per job
                    </p>
                  </div>
                  <Switch
                    id="material-tracking"
                    checked={workflowSettings.enableMaterialTracking}
                    onCheckedChange={(checked) => updateWorkflowSetting("enableMaterialTracking", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="time-tracking">Enable Time Tracking</Label>
                    <p className="text-xs text-muted-foreground">
                      Track labor hours per job
                    </p>
                  </div>
                  <Switch
                    id="time-tracking"
                    checked={workflowSettings.enableTimeTracking}
                    onCheckedChange={(checked) => updateWorkflowSetting("enableTimeTracking", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="photo-docs">Require Photo Documentation</Label>
                    <p className="text-xs text-muted-foreground">
                      Photo evidence for milestones
                    </p>
                  </div>
                  <Switch
                    id="photo-docs"
                    checked={workflowSettings.requirePhotoDocumentation}
                    onCheckedChange={(checked) => updateWorkflowSetting("requirePhotoDocumentation", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Quality Control & Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weld-inspection">Welding Inspection Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Mandatory weld quality checks
                    </p>
                  </div>
                  <Switch
                    id="weld-inspection"
                    checked={qualitySettings.weldingInspectionRequired}
                    onCheckedChange={(checked) => updateQualitySetting("weldingInspectionRequired", checked)}
                  />
                </div>

                {qualitySettings.weldingInspectionRequired && (
                  <div>
                    <Label htmlFor="inspection-freq">Inspection Frequency</Label>
                    <Select
                      value={qualitySettings.inspectionFrequency}
                      onValueChange={(value) => updateQualitySetting("inspectionFrequency", value)}
                    >
                      <SelectTrigger id="inspection-freq">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_weld">Every Weld</SelectItem>
                        <SelectItem value="per_job">Per Job</SelectItem>
                        <SelectItem value="random">Random Sampling</SelectItem>
                        <SelectItem value="critical_only">Critical Welds Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-wps">Require WPS (Welding Procedure Specification)</Label>
                    <p className="text-xs text-muted-foreground">
                      Documented welding procedures
                    </p>
                  </div>
                  <Switch
                    id="require-wps"
                    checked={qualitySettings.requireWPS}
                    onCheckedChange={(checked) => updateQualitySetting("requireWPS", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-ndt">Require NDT (Non-Destructive Testing)</Label>
                    <p className="text-xs text-muted-foreground">
                      X-ray, ultrasonic testing
                    </p>
                  </div>
                  <Switch
                    id="require-ndt"
                    checked={qualitySettings.requireNDT}
                    onCheckedChange={(checked) => updateQualitySetting("requireNDT", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="safety-induction">Require Safety Induction</Label>
                    <p className="text-xs text-muted-foreground">
                      Site safety training mandatory
                    </p>
                  </div>
                  <Switch
                    id="safety-induction"
                    checked={qualitySettings.requireSafetyInduction}
                    onCheckedChange={(checked) => updateQualitySetting("requireSafetyInduction", checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="doc-retention">Document Retention Period (years)</Label>
                  <Input
                    id="doc-retention"
                    type="number"
                    value={qualitySettings.documentRetentionYears}
                    onChange={(e) => updateQualitySetting("documentRetentionYears", Number(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How long to keep quality records
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}