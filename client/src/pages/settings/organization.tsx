import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, Users, Map, Save, Plus, Edit2, Trash2, Shield } from "lucide-react";
import type { BusinessUnit, CostCenter } from "@shared/schema";

export default function OrganizationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch organization settings
  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings/organization"],
  });

  // Fetch business units
  const { data: businessUnits = [] } = useQuery({
    queryKey: ["/api/business-units"],
  });

  // Fetch cost centers
  const { data: costCenters = [] } = useQuery({
    queryKey: ["/api/cost-centers"],
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return apiRequest("/api/settings/organization", {
        method: "PUT",
        body: JSON.stringify(updatedSettings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/organization"] });
      toast({
        title: "Settings Saved",
        description: "Organization settings have been updated successfully.",
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Create business unit mutation
  const createBusinessUnitMutation = useMutation({
    mutationFn: async (unit: Partial<BusinessUnit>) => {
      return apiRequest("/api/business-units", {
        method: "POST",
        body: JSON.stringify(unit),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({
        title: "Success",
        description: "Business unit created successfully.",
      });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    // Update local state
    setHasChanges(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">Configure company profile, business units, and organizational structure</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              <Shield className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button 
            onClick={() => saveSettingsMutation.mutate(settings)}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">Company Profile</TabsTrigger>
          <TabsTrigger value="units">Business Units</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={settings.companyName || "Lateral Engineering Limited"}
                    onChange={(e) => handleSettingChange("companyName", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company-abn">ABN / Company Number</Label>
                  <Input
                    id="company-abn"
                    value={settings.companyAbn || ""}
                    onChange={(e) => handleSettingChange("companyAbn", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company-address">Head Office Address</Label>
                <Input
                  id="company-address"
                  value={settings.companyAddress || ""}
                  onChange={(e) => handleSettingChange("companyAddress", e.target.value)}
                  placeholder="123 Industrial Ave, Auckland, New Zealand"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="company-phone">Phone</Label>
                  <Input
                    id="company-phone"
                    value={settings.companyPhone || ""}
                    onChange={(e) => handleSettingChange("companyPhone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={settings.companyEmail || ""}
                    onChange={(e) => handleSettingChange("companyEmail", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    value={settings.companyWebsite || ""}
                    onChange={(e) => handleSettingChange("companyWebsite", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-timezone">Default Timezone</Label>
                  <Select
                    value={settings.defaultTimezone || "Pacific/Auckland"}
                    onValueChange={(value) => handleSettingChange("defaultTimezone", value)}
                  >
                    <SelectTrigger id="default-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pacific/Auckland">Auckland (GMT+12)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (GMT+10)</SelectItem>
                      <SelectItem value="Australia/Perth">Perth (GMT+8)</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore (GMT+8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fiscal-year">Fiscal Year Start</Label>
                  <Select
                    value={settings.fiscalYearStart || "april"}
                    onValueChange={(value) => handleSettingChange("fiscalYearStart", value)}
                  >
                    <SelectTrigger id="fiscal-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="july">July</SelectItem>
                      <SelectItem value="october">October</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  Business Units
                </span>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Unit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businessUnits.map((unit: BusinessUnit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{unit.name}</h4>
                      <p className="text-sm text-muted-foreground">{unit.code}</p>
                      {unit.address && (
                        <p className="text-sm text-muted-foreground mt-1">{unit.address}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Cost Centers
                </span>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cost Center
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costCenters.map((center: CostCenter) => (
                  <div
                    key={center.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{center.name}</h4>
                      <p className="text-sm text-muted-foreground">{center.code}</p>
                      {center.description && (
                        <p className="text-sm text-muted-foreground mt-1">{center.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {center.budgetMonthly && (
                        <Badge variant="outline">
                          Monthly: ${Number(center.budgetMonthly).toLocaleString()}
                        </Badge>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                System Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Single Sign-On (SSO)</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure SSO for secure enterprise authentication
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sso-provider">SSO Provider</Label>
                    <Select
                      value={settings.ssoProvider || "none"}
                      onValueChange={(value) => handleSettingChange("ssoProvider", value)}
                    >
                      <SelectTrigger id="sso-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="azure-ad">Azure AD</SelectItem>
                        <SelectItem value="google">Google Workspace</SelectItem>
                        <SelectItem value="okta">Okta</SelectItem>
                        <SelectItem value="saml">SAML 2.0</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">ERP Integration</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect with enterprise resource planning systems
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="erp-system">ERP System</Label>
                    <Select
                      value={settings.erpSystem || "none"}
                      onValueChange={(value) => handleSettingChange("erpSystem", value)}
                    >
                      <SelectTrigger id="erp-system">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="sap">SAP</SelectItem>
                        <SelectItem value="oracle">Oracle ERP</SelectItem>
                        <SelectItem value="microsoft-dynamics">Microsoft Dynamics</SelectItem>
                        <SelectItem value="netsuite">NetSuite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}