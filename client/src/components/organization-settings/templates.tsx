import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, Mail } from "lucide-react";
import QuoteTemplates from "./quote-templates";
import POTemplateSettings from "@/components/settings/POTemplateSettings";
import EmailTemplates from "./email-templates";

export default function Templates() {
  const [activeTab, setActiveTab] = useState("quotes");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Document Templates</h2>
        <p className="text-muted-foreground mt-1">
          Manage templates for quotes, purchase orders, and other business documents
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quote Templates
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            PO Templates
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="mt-4">
          <QuoteTemplates />
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-4">
          <POTemplateSettings />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <EmailTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}