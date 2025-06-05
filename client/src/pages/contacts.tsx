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
import { Users, Building2, Plus, Edit, Trash2, Upload, Download, Search, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Truck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Schema definitions for suppliers and contacts
const supplierSchema = z.object({
  name: z.string().min(1, "Company/Supplier name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().optional(),
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

type SupplierFormData = z.infer<typeof supplierSchema>;

interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
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

  // Address search functionality
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Free address search using OpenStreetMap Nominatim (matching material library implementation)
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `countrycodes=nz&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `extratags=1`
      );
      
      if (response.ok) {
        const results = await response.json();
        const formattedSuggestions = results.map((result: any) => ({
          display_name: result.display_name,
          address: result.address,
          full_address: result.display_name,
          postcode: result.address?.postcode || '',
          city: result.address?.city || result.address?.town || result.address?.suburb || '',
          state: result.address?.state || '',
          country: result.address?.country || ''
        }));
        
        setAddressSuggestions(formattedSuggestions);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddressChange = (value: string, form: any) => {
    form.setValue('address', value);
    
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }
    
    addressTimeoutRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  const selectAddress = (suggestion: any, form: any) => {
    form.setValue('address', suggestion.full_address);
    form.setValue('city', suggestion.city);
    form.setValue('postcode', suggestion.postcode);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

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
      return apiRequest("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
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
      return apiRequest(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
      toast({ title: "Supplier updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating supplier", description: error.message, variant: "destructive" });
    }
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/suppliers/${id}`, { method: "DELETE" });
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
      email: "",
      phone: "",
      address: "",
      abnTaxId: "",
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
    supplier.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (data: SupplierFormData) => {
    if (selectedSupplier) {
      updateSupplierMutation.mutate({ id: selectedSupplier.id, data });
    } else {
      addSupplierMutation.mutate(data);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    form.reset({
      name: supplier.name,
      company: supplier.company || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      abnTaxId: supplier.abnTaxId || "",
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
      ["Name", "Company", "Email", "Phone", "Address", "ABN/Tax ID", "Payment Terms", "Account Manager", "Lead Time (Standard)", "Lead Time (Express)", "Min Order Qty", "Delivery Areas", "Certifications", "Standards", "Notes", "Active"],
      ...filteredSuppliers.map(supplier => [
        supplier.name,
        supplier.company || "",
        supplier.email || "",
        supplier.phone || "",
        supplier.address || "",
        supplier.abnTaxId || "",
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>
                  Enter comprehensive supplier information for material sourcing and procurement management.
                </DialogDescription>
              </DialogHeader>
              <SupplierForm
                form={form}
                onSubmit={onSubmit}
                isLoading={addSupplierMutation.isPending}
                onCancel={() => {
                  setIsAddDialogOpen(false);
                  form.reset();
                }}
              />
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
                      {supplier.company && (
                        <CardDescription className="text-sm font-medium text-muted-foreground">
                          {supplier.company}
                        </CardDescription>
                      )}
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
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information and business details.
            </DialogDescription>
          </DialogHeader>
          <SupplierForm
            form={form}
            onSubmit={onSubmit}
            isLoading={updateSupplierMutation.isPending}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedSupplier(null);
              form.reset();
            }}
          />
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

interface SupplierFormProps {
  form: any;
  onSubmit: (data: SupplierFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
}

function SupplierForm({ form, onSubmit, isLoading, onCancel }: SupplierFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="ASMUSS Steel Distributors" {...field} />
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
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ASMUSS Pty Ltd" {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="sales@asmuss.com.au" {...field} />
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+61 7 3123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Street address, city, state, postal code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Business Details</h3>

            <FormField
              control={form.control}
              name="abnTaxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ABN / Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="12 345 678 901" {...field} />
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
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                  <FormLabel>Minimum Order Quantity (NZD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Additional Information</h3>
          
          <FormField
            control={form.control}
            name="deliveryAreas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Areas</FormLabel>
                <FormControl>
                  <Textarea placeholder="Auckland, Wellington, Christchurch, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <Textarea placeholder="ISO 9001, AS/NZS 4600, etc." {...field} />
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
                    <Textarea placeholder="NZS 3404, AS/NZS 3679, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional notes and comments" {...field} />
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

        <Separator />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Supplier"}
          </Button>
        </div>
      </form>
    </Form>
  );
}