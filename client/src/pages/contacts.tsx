import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Users, Building2, Plus, Edit, Trash2, Upload, Download, Search, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Truck, Contact } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { AddressSearch } from "@/components/ui/address-search";

// Schema definitions for suppliers and contacts
const supplierSchema = z.object({
  name: z.string().min(1, "Company/Supplier name is required"),
  company: z.string().min(1, "Company/Supplier name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  nzbn: z.string().optional(),
  gstNumber: z.string().optional(),
  companyNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  accountManager: z.string().optional(),
  leadTimeStandard: z.number().min(0).optional(),
  leadTimeExpress: z.number().min(0).optional(),
  minimumOrderQuantity: z.number().min(0).optional(),
  deliveryAreas: z.string().optional(),
  certifications: z.string().optional(),
  standardsCompliance: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true)
});

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  mobile: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false)
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface Supplier {
  id: number;
  name: string;
  company: string;
  address?: string;
  city?: string;
  postcode?: string;
  nzbn?: string;
  gstNumber?: string;
  companyNumber?: string;
  paymentTerms?: string;
  accountManager?: string;
  leadTimeStandard?: number;
  leadTimeExpress?: number;
  minimumOrderQuantity?: number;
  deliveryAreas?: string;
  certifications?: string;
  standardsCompliance?: string;
  notes?: string;
  isActive: boolean;
  type?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json() as Supplier[];
    }
  });

  // Add supplier mutation
  const addSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      return apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsAddDialogOpen(false);
      toast({ title: "Supplier added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding supplier", description: error.message, variant: "destructive" });
    }
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SupplierFormData> }) => {
      return apiRequest("PATCH", `/api/suppliers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
      toast({ title: "Supplier updated successfully" });
    },
    onError: (error) => {
      console.error("Update supplier error:", error);
      toast({ title: "Error updating supplier", description: error.message, variant: "destructive" });
    }
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
      toast({ title: "Supplier deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting supplier", description: error.message, variant: "destructive" });
    }
  });

  // Form for adding/editing suppliers
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      company: "",
      address: "",
      city: "",
      postcode: "",
      nzbn: "",
      gstNumber: "",
      companyNumber: "",
      paymentTerms: "30 days",
      accountManager: "",
      leadTimeStandard: 7,
      leadTimeExpress: 3,
      minimumOrderQuantity: 0,
      deliveryAreas: "",
      certifications: "",
      standardsCompliance: "",
      notes: "",
      isActive: true
    }
  });

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (data: SupplierFormData) => {
    console.log('Form submission data:', data);
    console.log('Selected supplier:', selectedSupplier);
    console.log('Form errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);
    
    if (selectedSupplier) {
      console.log('Attempting to update supplier with ID:', selectedSupplier.id);
      updateSupplierMutation.mutate({ id: selectedSupplier.id, data });
    } else {
      console.log('Attempting to add new supplier');
      addSupplierMutation.mutate(data);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    form.reset({
      name: supplier.name,
      company: supplier.company,
      address: supplier.address || "",
      city: supplier.city || "",
      postcode: supplier.postcode || "",
      nzbn: supplier.nzbn || "",
      gstNumber: supplier.gstNumber || "",
      companyNumber: supplier.companyNumber || "",
      paymentTerms: supplier.paymentTerms || "30 days",
      accountManager: supplier.accountManager || "",
      leadTimeStandard: supplier.leadTimeStandard || 7,
      leadTimeExpress: supplier.leadTimeExpress || 3,
      minimumOrderQuantity: supplier.minimumOrderQuantity || 0,
      deliveryAreas: supplier.deliveryAreas || "",
      certifications: supplier.certifications || "",
      standardsCompliance: supplier.standardsCompliance || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };

  const exportSuppliers = () => {
    const csvData = [
      ["Company/Supplier Name", "Address", "City", "Postcode", "NZBN", "GST Number", "Company Number", "Payment Terms", "Account Manager", "Lead Time (Standard)", "Lead Time (Express)", "Min Order Qty", "Delivery Areas", "Certifications", "Standards", "Notes", "Active"],
      ...filteredSuppliers.map(supplier => [
        supplier.name,
        supplier.address || "",
        supplier.city || "",
        supplier.postcode || "",
        supplier.nzbn || "",
        supplier.gstNumber || "",
        supplier.companyNumber || "",
        supplier.paymentTerms || "",
        supplier.accountManager || "",
        supplier.leadTimeStandard || "",
        supplier.leadTimeExpress || "",
        supplier.minimumOrderQuantity || "",
        supplier.deliveryAreas || "",
        supplier.certifications || "",
        supplier.standardsCompliance || "",
        supplier.notes || "",
        supplier.isActive ? "Yes" : "No"
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts Management</h1>
          <p className="text-muted-foreground">Manage suppliers, clients, and business contacts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportSuppliers} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" asChild>
            <Link href="/supplier-contacts">
              <Contact className="h-4 w-4 mr-2" />
              Manage Contacts
            </Link>
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (open) {
              // Reset form to default values when opening add dialog
              form.reset({
                name: "",
                company: "",
                address: "",
                city: "",
                postcode: "",
                nzbn: "",
                gstNumber: "",
                companyNumber: "",
                paymentTerms: "30 days",
                accountManager: "",
                leadTimeStandard: 7,
                leadTimeExpress: 3,
                minimumOrderQuantity: 0,
                deliveryAreas: "",
                certifications: "",
                standardsCompliance: "",
                notes: "",
                isActive: true
              });
              setSelectedSupplier(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  Add New Supplier
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Create a comprehensive supplier profile with business details and contacts
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                  {/* Company Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Company Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Company/Supplier Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter company or supplier name"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Keep company field in sync for compatibility
                                form.setValue("company", e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address Information with Smart Search */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <AddressSearch
                          field={field}
                          form={form}
                          label="Address"
                          placeholder="Start typing address (e.g., 123 Queen Street, Auckland)..."
                        />
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                              City
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter city"
                                {...field}
                              />
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
                            <FormLabel className="text-sm font-medium text-foreground">
                              Postcode
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="0000"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* NZ Business Registration */}
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="nzbn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                              NZBN
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="9429000000000"
                                {...field}
                              />
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
                            <FormLabel className="text-sm font-medium text-foreground">
                              GST Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123-456-789"
                                {...field}
                              />
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
                            <FormLabel className="text-sm font-medium text-foreground">
                              Company Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1234567"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Business Terms */}
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Payment Terms
                          </FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="COD">Cash on Delivery</SelectItem>
                                <SelectItem value="7 days">7 days</SelectItem>
                                <SelectItem value="14 days">14 days</SelectItem>
                                <SelectItem value="30 days">30 days</SelectItem>
                                <SelectItem value="45 days">45 days</SelectItem>
                                <SelectItem value="60 days">60 days</SelectItem>
                                <SelectItem value="90 days">90 days</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Additional Information</h3>

                    <FormField
                      control={form.control}
                      name="accountManager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Manager</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="leadTimeStandard"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Standard Lead Time (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                                {...field} 
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="minimumOrderQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                            <Textarea placeholder="Auckland, Hamilton, Tauranga..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="certifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Certifications</FormLabel>
                          <FormControl>
                            <Textarea placeholder="ISO 9001, AS/NZS 3679..." {...field} />
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
                            <Textarea placeholder="AS/NZS 3679, AS/NZS 1163..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        form.reset();
                      }}
                      disabled={addSupplierMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={addSupplierMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {addSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredSuppliers.length} suppliers
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(supplier)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {supplier.paymentTerms && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.paymentTerms}</span>
                    </div>
                  )}
                  {supplier.leadTimeStandard && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.leadTimeStandard} days lead time</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {supplier.accountManager && (
                      <span className="text-xs text-muted-foreground">
                        AM: {supplier.accountManager}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No suppliers match your search criteria." : "Get started by adding your first supplier."}
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Client Management</h3>
            <p className="text-muted-foreground mb-4">
              Client management functionality will be implemented in the next phase.
            </p>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Client (Coming Soon)
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Edit Supplier
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update comprehensive supplier profile with business details and contacts
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Company Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Company/Supplier Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter company or supplier name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Information with Smart Search */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <AddressSearch
                      field={field}
                      form={form}
                      label="Address"
                      placeholder="Start typing address (e.g., 123 Queen Street, Auckland)..."
                    />
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          City
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter city"
                            {...field}
                          />
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
                        <FormLabel className="text-sm font-medium text-foreground">
                          Postcode
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* NZ Business Registration */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="nzbn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          NZBN
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="9429000000000"
                            {...field}
                          />
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
                        <FormLabel className="text-sm font-medium text-foreground">
                          GST Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123-456-789"
                            {...field}
                          />
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
                        <FormLabel className="text-sm font-medium text-foreground">
                          Company Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1234567"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Business Terms */}
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Payment Terms
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COD">Cash on Delivery</SelectItem>
                            <SelectItem value="7 days">7 days</SelectItem>
                            <SelectItem value="14 days">14 days</SelectItem>
                            <SelectItem value="30 days">30 days</SelectItem>
                            <SelectItem value="45 days">45 days</SelectItem>
                            <SelectItem value="60 days">60 days</SelectItem>
                            <SelectItem value="90 days">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Key Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Additional Information</h3>
                


                <FormField
                  control={form.control}
                  name="accountManager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Manager</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leadTimeStandard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Standard Lead Time (days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                            {...field} 
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="minimumOrderQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                        <Textarea placeholder="Auckland, Hamilton, Tauranga..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications</FormLabel>
                      <FormControl>
                        <Textarea placeholder="ISO 9001, AS/NZS 3679..." {...field} />
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
                        <Textarea placeholder="AS/NZS 3679, AS/NZS 1163..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedSupplier(null);
                    form.reset();
                  }}
                  disabled={updateSupplierMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateSupplierMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateSupplierMutation.isPending ? "Updating..." : "Update Supplier"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{supplierToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => supplierToDelete && deleteSupplierMutation.mutate(supplierToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

