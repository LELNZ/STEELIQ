import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, MapPin, DollarSign, Clock, Package, Shield, FileText, Users, Grid3X3, List, Table, AlertTriangle } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";
import { ContactManagementTab } from "./contact-management-tab";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
export const clientFormSchema = z.object({
  name: z.string().min(1, "Company/Client name is required"),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().default("New Zealand"),
  nzbn: z.string().optional(),
  gstNumber: z.string().optional(),
  companyNumber: z.string().optional(),
  website: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    // Allow URLs with or without protocol
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlPattern.test(val);
  }, "Please enter a valid website URL"),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  paymentTerms: z.string().default("30 days"),
  projectManager: z.string().optional(),
  creditLimit: z.number().min(0, "Credit limit must be 0 or greater").default(0),
  discountRate: z.string().default("0"),
  industry: z.string().optional(),
  type: z.enum(["client", "prospect"]).default("client"),
  preferredCurrency: z.string().default("NZD"),
  billingSchedule: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  specialRequirements: z.string().optional(),
  notes: z.string().optional(),
  internalReference: z.string().optional(),
  isActive: z.boolean().default(true),
  isPreferredClient: z.boolean().default(false)
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: "create" | "edit";
  clientId?: number;
  onClientCreated?: (clientId: number) => void;
}

export function ClientForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  mode,
  clientId,
  onClientCreated
}: ClientFormProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [autoSavedClientId, setAutoSavedClientId] = useState<number | undefined>(clientId);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      company: "",
      address: "",
      city: "",
      postcode: "",
      country: "New Zealand",
      nzbn: "",
      gstNumber: "",
      companyNumber: "",
      website: "",
      phone: "",
      email: "",
      paymentTerms: "30 days",
      projectManager: "",
      creditLimit: 0,
      discountRate: "0",
      industry: "",
      type: "client",
      preferredCurrency: "NZD",
      billingSchedule: "",
      deliveryInstructions: "",
      specialRequirements: "",
      notes: "",
      internalReference: "",
      isActive: true,
      isPreferredClient: false,
      ...initialData,
    },
  });

  // Auto-save mutation for creating clients
  const autoSaveMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      // Prepare minimal data for auto-save - name and company are both required
      const autoSaveData = {
        name: data.name,
        company: data.company || data.name, // Use name as company if company is empty
        type: data.type || "client",
        paymentTerms: data.paymentTerms || "30 days",
        preferredCurrency: data.preferredCurrency || "NZD",
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.postcode && { postcode: data.postcode }),
        ...(data.country && { country: data.country }),
        ...(data.nzbn && { nzbn: data.nzbn }),
        ...(data.gstNumber && { gstNumber: data.gstNumber }),
        ...(data.projectManager && { projectManager: data.projectManager }),
        ...(data.industry && { industry: data.industry }),
        ...(data.creditLimit && { creditLimit: data.creditLimit }),
        ...(data.discountRate && { discountRate: data.discountRate }),
        ...(data.notes && { notes: data.notes }),
        ...(data.internalReference && { internalReference: data.internalReference }),
        isActive: true
      };
      
      return await apiRequest("POST", "/api/clients", autoSaveData);
    },
    onSuccess: (data) => {
      setAutoSavedClientId(data.id);
      setHasAutoSaved(true);
      onClientCreated?.(data.id);
      toast({
        title: "Client Auto-Saved",
        description: "Basic client information has been saved. You can now add contacts.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to save client. Please check required fields.";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Auto-Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Watch for client name changes to enable contacts tab
  const clientName = form.watch("name");
  const hasClientName = clientName && clientName.trim().length > 0;

  // Check if basic required fields are filled for auto-save
  const validateBasicFields = () => {
    return hasClientName;
  };

  // Handle tab change with auto-save logic
  const handleTabChange = async (tabValue: string) => {
    if (tabValue === "contacts" && mode === "create" && !autoSavedClientId && !hasAutoSaved) {
      if (!hasClientName) {
        toast({
          title: "Client Name Required",
          description: "Please enter a client name before accessing contacts.",
          variant: "destructive",
        });
        return;
      }

      if (!validateBasicFields()) {
        setShowValidationWarning(true);
        return;
      }

      // Prevent multiple auto-saves
      if (autoSaveMutation.isPending) {
        return;
      }

      try {
        const formData = form.getValues();
        await autoSaveMutation.mutateAsync(formData);
        setActiveTab(tabValue);
      } catch (error) {
        // Error is already handled in onError
        console.error("Auto-save failed:", error);
      }
    } else {
      setActiveTab(tabValue);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Client Details
        </TabsTrigger>
        <TabsTrigger value="contacts" className="flex items-center gap-2" disabled={!hasClientName}>
          <Users className="h-4 w-4" />
          Contacts
          {!hasClientName && <span className="text-xs">(Enter name first)</span>}
          {autoSaveMutation.isPending && <span className="text-xs">(Saving...)</span>}
        </TabsTrigger>
      </TabsList>

      {showValidationWarning && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please enter a client name before accessing the contacts tab.
          </AlertDescription>
        </Alert>
      )}

      <TabsContent value="details" className="mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Company Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company/Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company or client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Legal company name (if different)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input placeholder="Construction, Manufacturing, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Building2 className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Address & Contact</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Region</FormLabel>
                      <FormControl>
                        <Input placeholder="State or region" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Postcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.example.co.nz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Business Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Business & Financial Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nzbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NZBN</FormLabel>
                      <FormControl>
                        <Input placeholder="New Zealand Business Number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input placeholder="GST registration number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="7 days">7 days</SelectItem>
                          <SelectItem value="14 days">14 days</SelectItem>
                          <SelectItem value="30 days">30 days</SelectItem>
                          <SelectItem value="45 days">45 days</SelectItem>
                          <SelectItem value="60 days">60 days</SelectItem>
                          <SelectItem value="90 days">90 days</SelectItem>
                          <SelectItem value="COD">Cash on Delivery</SelectItem>
                          <SelectItem value="Prepaid">Prepaid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Calendar className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Additional Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="internalReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Internal client reference code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerSince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Since</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this client..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {isLoading ? (
                  mode === "create" ? "Creating..." : "Updating..."
                ) : (
                  mode === "create" ? "Create Client" : "Update Client"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="contacts" className="mt-6">
        {(autoSavedClientId || clientId) ? (
          <ContactManagementTab
            entityId={autoSavedClientId || clientId!}
            entityType="client"
            entityName={clientName}
            mode={mode}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Please enter a client name first to manage contacts</p>
            <p className="text-sm">The client will be auto-saved when you switch to this tab</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}