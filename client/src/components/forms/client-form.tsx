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
import { Building2, MapPin, DollarSign, Clock, Package, Shield, FileText, Users, Grid3X3, List, Table, AlertTriangle, Settings, Award, Scale, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";
import { ContactManagementTab } from "./contact-management-tab";
import { MultiLocationManager } from "@/components/ui/multi-location-manager";
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
  type: z.string().default("client"),
  preferredCurrency: z.string().default("NZD"),
  billingSchedule: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  specialRequirements: z.string().optional(),
  // Adding supplier form fields for comprehensive data collection
  leadTimeStandard: z.number().min(0, "Lead time must be 0 or greater").default(7),
  leadTimeExpress: z.number().min(0, "Express lead time must be 0 or greater").default(3),
  minimumOrderQuantity: z.number().min(0, "Minimum order quantity must be 0 or greater").default(0),
  minimumOrderValue: z.number().min(0, "Minimum order value must be 0 or greater").default(0),
  deliveryAreas: z.string().optional(),
  certifications: z.string().optional(),
  standardsCompliance: z.string().optional(),
  accountManager: z.string().optional(),
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
  
  // Collapsible sections state - Address Information and Company Information start expanded
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    address: false,
    registration: true,
    contact: true,
    financial: true,
    operational: true,
    leadtimes: true,
    quality: true,
    additional: true,
    status: true
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
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
      leadTimeStandard: 7,
      leadTimeExpress: 3,
      minimumOrderQuantity: 0,
      minimumOrderValue: 0,
      deliveryAreas: "",
      certifications: "",
      standardsCompliance: "",
      accountManager: "",
      notes: "",
      internalReference: "",
      isActive: true,
      isPreferredClient: false,
      ...initialData
    }
  });

  // Auto-save mutation for creating clients
  const autoSaveMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      // Prepare minimal data for auto-save - just name is required
      const autoSaveData = {
        name: data.name,
        company: data.company || data.name, // Use name as company if company is empty
        type: data.type || "client",
        paymentTerms: data.paymentTerms || "30 days",
        preferredCurrency: data.preferredCurrency || "NZD",
        // Only include other fields if they have actual values
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.postcode && { postcode: data.postcode }),
        country: data.country || "New Zealand",
        ...(data.nzbn && { nzbn: data.nzbn }),
        ...(data.gstNumber && { gstNumber: data.gstNumber }),
        ...(data.companyNumber && { companyNumber: data.companyNumber }),
        ...(data.website && { website: data.website }),
        ...(data.phone && { phone: data.phone }),
        ...(data.email && { email: data.email }),
        ...(data.projectManager && { projectManager: data.projectManager }),
        creditLimit: data.creditLimit || 0,
        discountRate: data.discountRate || "0",
        ...(data.industry && { industry: data.industry }),
        ...(data.billingSchedule && { billingSchedule: data.billingSchedule }),
        ...(data.deliveryInstructions && { deliveryInstructions: data.deliveryInstructions }),
        ...(data.specialRequirements && { specialRequirements: data.specialRequirements }),
        ...(data.notes && { notes: data.notes }),
        ...(data.internalReference && { internalReference: data.internalReference }),
        isActive: data.isActive ?? true,
        isPreferredClient: data.isPreferredClient ?? false
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

  // Watch for company name changes to enable contacts tab
  const companyName = form.watch("name");
  const hasCompanyName = companyName && companyName.trim().length > 0;

  // Check if basic required fields are filled for auto-save
  const validateBasicFields = () => {
    return hasCompanyName;
  };

  // Handle tab change with auto-save logic
  const handleTabChange = async (tabValue: string) => {
    if (tabValue === "contacts" && mode === "create" && !autoSavedClientId && !hasAutoSaved) {
      if (!hasCompanyName) {
        toast({
          title: "Company Name Required",
          description: "Please enter a company name before accessing contacts.",
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

      // Auto-save the client before switching to contacts
      try {
        const formData = form.getValues();
        await autoSaveMutation.mutateAsync(formData);
        setActiveTab(tabValue);
        setShowValidationWarning(false);
      } catch (error) {
        // Error handling is done in mutation onError
        return;
      }
    } else {
      setActiveTab(tabValue);
      setShowValidationWarning(false);
    }
  };

  const handleAddressSelect = (addressData: any) => {
    form.setValue("address", addressData.formatted_address || "");
    form.setValue("city", addressData.locality || "");
    form.setValue("postcode", addressData.postal_code || "");
  };

  // Collapsible Section Component
  const CollapsibleSection = ({ 
    sectionKey, 
    icon: Icon, 
    title, 
    children, 
    className = "form-section",
    alwaysOpen = false 
  }: {
    sectionKey: string;
    icon: any;
    title: string;
    children: React.ReactNode;
    className?: string;
    alwaysOpen?: boolean;
  }) => {
    const isCollapsed = !alwaysOpen && collapsedSections[sectionKey];
    
    return (
      <div className={`${className} section-${sectionKey}`}>
        <div 
          className={`form-section-header ${!alwaysOpen ? 'cursor-pointer hover:bg-muted/50 rounded-md transition-colors' : ''}`}
          onClick={!alwaysOpen ? () => toggleSection(sectionKey) : undefined}
        >
          <Icon className="form-section-icon" />
          <h3 className="form-section-title flex-1">{title}</h3>
          {!alwaysOpen && (
            isCollapsed ? 
              <ChevronDown className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}>
          <div className="pt-2">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full enhanced-tabs">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="details" className="flex items-center gap-2 transition-all duration-200">
          <Building2 className="h-4 w-4" />
          Client Details
        </TabsTrigger>
        <TabsTrigger value="locations" className="flex items-center gap-2 transition-all duration-200" disabled={!hasCompanyName}>
          <MapPin className="h-4 w-4" />
          Locations
          {!hasCompanyName && <span className="text-xs text-muted-foreground">(Enter name first)</span>}
        </TabsTrigger>
        <TabsTrigger value="contacts" className="flex items-center gap-2 transition-all duration-200" disabled={!hasCompanyName}>
          <Users className="h-4 w-4" />
          Contacts
          {!hasCompanyName && <span className="text-xs text-muted-foreground">(Enter name first)</span>}
          {autoSaveMutation.isPending && <span className="text-xs text-primary animate-pulse">(Saving...)</span>}
        </TabsTrigger>
      </TabsList>

      {/* Validation Warning */}
      {showValidationWarning && (
        <Alert className="mt-4 form-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please complete both company name and legal company name fields before adding contacts.
          </AlertDescription>
        </Alert>
      )}

      <TabsContent value="details" className="mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit(data as ClientFormData))} className="space-y-4">
            {/* Company Information Section */}
            <div className="form-section section-company">
              <div className="form-section-header">
                <Building2 className="form-section-icon" />
                <h3 className="form-section-title">Company Information</h3>
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
                    <Input placeholder="Enter legal company name (optional)" {...field} />
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
                  <FormLabel>Client Type *</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="main_contractor">Main Contractor</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                        <SelectItem value="property_developer">Property Developer</SelectItem>
                        <SelectItem value="architect">Architect</SelectItem>
                        <SelectItem value="engineer">Engineer</SelectItem>
                        <SelectItem value="government">Government/Council</SelectItem>
                        <SelectItem value="commercial">Commercial Entity</SelectItem>
                        <SelectItem value="residential">Residential Client</SelectItem>
                        <SelectItem value="industrial">Industrial Client</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure Project</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input placeholder="https://www.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@company.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+64 9 123 4567" {...field} />
                  </FormControl>
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
                    <Input placeholder="e.g., Construction, Manufacturing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Manager</FormLabel>
                  <FormControl>
                    <Input placeholder="Primary account manager name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <CollapsibleSection sectionKey="address" icon={MapPin} title="Address Information">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AddressSearch
                      field={field}
                      form={form}
                      placeholder="Enter street address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New Zealand">New Zealand</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="registration" icon={Shield} title="Registration & Legal Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              name="companyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Company registration number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="contact" icon={Users} title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+64 9 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@company.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="financial" icon={DollarSign} title="Financial & Commercial Terms">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                      <SelectItem value="7 days">7 days</SelectItem>
                      <SelectItem value="14 days">14 days</SelectItem>
                      <SelectItem value="30 days">30 days</SelectItem>
                      <SelectItem value="45 days">45 days</SelectItem>
                      <SelectItem value="60 days">60 days</SelectItem>
                      <SelectItem value="90 days">90 days</SelectItem>
                      <SelectItem value="Custom">Custom Terms</SelectItem>
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
                      <SelectItem value="NZD">NZD (New Zealand Dollar)</SelectItem>
                      <SelectItem value="AUD">AUD (Australian Dollar)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (British Pound)</SelectItem>
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
                      placeholder="0" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <Input placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Project Manager</FormLabel>
                  <FormControl>
                    <Input placeholder="Project manager name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Schedule</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly, Per Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="operational" icon={Package} title="Operational Requirements">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="deliveryInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Specific delivery requirements, timing preferences, site access details..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Quality standards, certifications, packaging requirements..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryAreas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Areas</FormLabel>
                  <FormControl>
                    <Input placeholder="Auckland, Wellington, Christchurch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="leadtimes" icon={Clock} title="Lead Times & Order Requirements">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="leadTimeStandard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard Lead Time (days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="7" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leadTimeExpress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Express Lead Time (days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="3" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minimumOrderQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Order Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minimumOrderValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Order Value ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="quality" icon={Award} title="Quality & Compliance">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ISO 9001, AS/NZS 3678, etc."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="standardsCompliance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standards Compliance</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Australian Standards, New Zealand Standards, etc."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="additional" icon={FileText} title="Additional Information">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes about this client (not visible to client)..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection sectionKey="status" icon={Settings} title="Status Settings">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Client</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this client for new projects and quotations
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPreferredClient"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Preferred Client</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as preferred for priority treatment and special rates
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
          </div>
        </CollapsibleSection>

            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : mode === "create" ? "Create Client" : "Update Client"}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="locations" className="mt-6">
        <MultiLocationManager 
          entityType="client"
          entityId={autoSavedClientId || clientId}
        />
      </TabsContent>

      <TabsContent value="contacts" className="mt-6">
        {(autoSavedClientId || clientId) && (
          <ContactManagementTab 
            entityId={autoSavedClientId || clientId!}
            entityType="client"
            entityName={form.getValues("name")}
            mode={mode}
            autoMarkAsPrimary={mode === "create"}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}