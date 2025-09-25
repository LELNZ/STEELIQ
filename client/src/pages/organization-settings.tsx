import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Mail, 
  FileText, 
  Palette, 
  DollarSign, 
  Shield,
  Globe,
  PenTool,
  Brush,
  Database
} from "lucide-react";
import CompanyBranding from "@/components/organization-settings/company-branding";
import OfficeLocations from "@/components/organization-settings/office-locations";
import Templates from "@/components/organization-settings/templates";
import EmailConfiguration from "@/components/organization-settings/email-configuration";
import TermsConditions from "@/components/organization-settings/terms-conditions";
import HandlingCosts from "@/components/organization-settings/handling-costs";
import ClientPortal from "@/components/organization-settings/client-portal";
import ESignatures from "@/components/organization-settings/e-signatures";
import BrandingSettings from "@/components/organization-settings/branding-settings";
import DataManagement from "@/components/organization-settings/data-management";

export default function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState("branding");

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your company profile, quote templates, and business settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap w-full gap-2">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Locations</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Terms</span>
          </TabsTrigger>
          <TabsTrigger value="handling" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Handling</span>
          </TabsTrigger>
          <TabsTrigger value="portal" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Portal</span>
          </TabsTrigger>
          <TabsTrigger value="signatures" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">E-Sign</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        <Card className="p-6">
          <TabsContent value="branding" className="mt-0">
            <CompanyBranding />
          </TabsContent>

          <TabsContent value="theme" className="mt-0">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="locations" className="mt-0">
            <OfficeLocations />
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <Templates />
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            <EmailConfiguration />
          </TabsContent>

          <TabsContent value="terms" className="mt-0">
            <TermsConditions />
          </TabsContent>

          <TabsContent value="handling" className="mt-0">
            <HandlingCosts />
          </TabsContent>

          <TabsContent value="portal" className="mt-0">
            <ClientPortal />
          </TabsContent>

          <TabsContent value="signatures" className="mt-0">
            <ESignatures />
          </TabsContent>

          <TabsContent value="data" className="mt-0">
            <DataManagement />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}