import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, DollarSign, Clock, Package, Shield, FileText, Users, Grid3X3, List, Table } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";
import { ContactManagementTab } from "./contact-management-tab";

// Unified supplier validation schema
export const supplierFormSchema = z.object({
  name: z.string().min(1, "Company/Supplier name is required"),
  company: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().default("New Zealand"),
  nzbn: z.string().optional(),
  gstNumber: z.string().optional(),
  companyNumber: z.string().optional(),
  website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  paymentTerms: z.string().default("30 days"),
  accountManager: z.string().optional(),
  leadTimeStandard: z.number().min(0, "Lead time must be 0 or greater").default(7),
  leadTimeExpress: z.number().min(0, "Express lead time must be 0 or greater").default(3),
  minimumOrderQuantity: z.number().min(0, "Minimum order quantity must be 0 or greater").default(0),
  minimumOrderValue: z.number().min(0, "Minimum order value must be 0 or greater").default(0),
  deliveryAreas: z.string().optional(),
  certifications: z.string().optional(),
  standardsCompliance: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  isPreferredSupplier: z.boolean().default(false)
});

export type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  initialData?: Partial<SupplierFormData>;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: "create" | "edit";
  supplierId?: number;
}

export function SupplierForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  mode,
  supplierId
}: SupplierFormProps) {
  const [activeTab, setActiveTab] = useState("details");
  
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
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
      accountManager: "",
      leadTimeStandard: 7,
      leadTimeExpress: 3,
      minimumOrderQuantity: 0,
      minimumOrderValue: 0,
      deliveryAreas: "",
      certifications: "",
      standardsCompliance: "",
      notes: "",
      isActive: true,
      isPreferredSupplier: false,
      ...initialData
    }
  });

  const handleAddressSelect = (addressData: any) => {
    form.setValue("address", addressData.formatted_address || "");
    form.setValue("city", addressData.locality || "");
    form.setValue("postcode", addressData.postal_code || "");
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Supplier Details
        </TabsTrigger>
        <TabsTrigger value="contacts" className="flex items-center gap-2" disabled={mode === "create"}>
          <Users className="h-4 w-4" />
          Contacts
          {mode === "create" && <span className="text-xs">(Save first)</span>}
        </TabsTrigger>
      </TabsList>

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
                  <FormLabel>Company/Supplier Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company or supplier name" {...field} />
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
                  <FormLabel>Legal Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter legal company name" {...field} />
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

        {/* Address Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Address Information</h3>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
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
        </div>

        {/* Business Details Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Shield className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Business Registration</h3>
          </div>

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
        </div>

        {/* Commercial Terms Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Commercial Terms</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COD">Cash on Delivery</SelectItem>
                        <SelectItem value="7 days">Net 7 days</SelectItem>
                        <SelectItem value="14 days">Net 14 days</SelectItem>
                        <SelectItem value="30 days">Net 30 days</SelectItem>
                        <SelectItem value="45 days">Net 45 days</SelectItem>
                        <SelectItem value="60 days">Net 60 days</SelectItem>
                        <SelectItem value="90 days">Net 90 days</SelectItem>
                      </SelectContent>
                    </Select>
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
        </div>

        {/* Lead Times Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Clock className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Lead Times</h3>
          </div>

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
          </div>
        </div>

        {/* Quality & Compliance Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Quality & Compliance</h3>
          </div>

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
        </div>

        {/* Additional Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Additional Information</h3>
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional notes, special instructions, or comments"
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Status Settings Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Shield className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Status Settings</h3>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Supplier</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this supplier for material sourcing and pricing
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
              name="isPreferredSupplier"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Preferred Supplier</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark as preferred supplier for priority consideration
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
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
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
              mode === "create" ? "Create Supplier" : "Update Supplier"
            )}
          </Button>
        </div>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="contacts" className="mt-6">
        <ContactManagementTab 
          supplierId={supplierId} 
          supplierName={initialData?.name || form.watch("name")}
        />
      </TabsContent>
    </Tabs>
  );
}