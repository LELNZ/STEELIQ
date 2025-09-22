import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Users, Building2, Plus, Edit, Trash2, Search, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Truck, Contact, Grid3X3, List, Table as TableIcon, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Info, FileText, Eye } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { ActionIcons } from "@/components/ui/action-icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { tableStyles } from "@/lib/design-system";
import { SupplierForm, type SupplierFormData } from "@/components/forms/supplier-form";
import { ClientForm, type ClientFormData } from "@/components/forms/client-form";
import type { Supplier, Client } from "@shared/schema";

type ViewMode = "card" | "list" | "table";

interface ImportResult {
  success: boolean;
  processed: number;
  created: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
}

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Import/Export state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // View modes for each tab
  const [suppliersViewMode, setSuppliersViewMode] = useState<ViewMode>("card");
  const [clientsViewMode, setClientsViewMode] = useState<ViewMode>("card");
  const [contactsViewMode, setContactsViewMode] = useState<ViewMode>("card");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    }
  });

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    retry: false // Don't retry if endpoint doesn't exist yet
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: SupplierFormData) => {
      return apiRequest("POST", "/api/suppliers", supplierData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Supplier created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating supplier", description: error.message, variant: "destructive" });
    }
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async (supplierData: SupplierFormData & { id: number }) => {
      return apiRequest("PATCH", `/api/suppliers/${supplierData.id}`, supplierData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setEditingSupplier(null);
      toast({ title: "Supplier updated successfully" });
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast({ title: "Error deleting supplier", description: error.message, variant: "destructive" });
    }
  });

  const handleCreateSupplier = async (data: SupplierFormData) => {
    setIsLoading(true);
    try {
      await createSupplierMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupplierCreated = (supplierId: number) => {
    // Auto-save callback - supplier has been created and can be used for contacts
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
  };

  const handleUpdateSupplier = async (data: SupplierFormData) => {
    if (!editingSupplier) return;
    setIsLoading(true);
    try {
      await updateSupplierMutation.mutateAsync({ ...data, id: editingSupplier.id });
    } finally {
      setIsLoading(false);
    }
  };

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: ClientFormData) => {
      return apiRequest("/api/clients", "POST", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsCreateClientDialogOpen(false);
      toast({ title: "Client created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating client", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (clientData: ClientFormData & { id: number }) => {
      return apiRequest(`/api/clients/${clientData.id}`, "PUT", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingClient(null);
      toast({ title: "Client updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating client", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleCreateClient = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      await createClientMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = async (data: ClientFormData) => {
    if (!editingClient) return;
    setIsLoading(true);
    try {
      await updateClientMutation.mutateAsync({ ...data, id: editingClient.id });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert database supplier to form data format
  const convertSupplierToFormData = (supplier: Supplier): Partial<SupplierFormData> => {
    return {
      name: supplier.name,
      company: supplier.company || "",
      address: supplier.address || "",
      city: supplier.city || "",
      postcode: supplier.postcode || "",
      country: supplier.country || "New Zealand",
      nzbn: supplier.nzbn || "",
      gstNumber: supplier.gstNumber || "",
      companyNumber: supplier.companyNumber || "",
      website: supplier.website || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      paymentTerms: supplier.paymentTerms || "30 days",
      accountManager: supplier.accountManager || "",
      leadTimeStandard: supplier.leadTimeStandard || 7,
      leadTimeExpress: supplier.leadTimeExpress || 3,
      minimumOrderQuantity: Number(supplier.minimumOrderQuantity) || 0,
      minimumOrderValue: Number(supplier.minimumOrderValue) || 0,
      deliveryAreas: supplier.deliveryAreas || "",
      certifications: supplier.certifications || "",
      standardsCompliance: supplier.standardsCompliance || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive ?? true,
      isPreferredSupplier: supplier.isPreferredSupplier ?? false,
    };
  };

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDeleteClientDialogOpen(false);
      setClientToDelete(null);
      toast({ title: "Client deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting client", description: error.message, variant: "destructive" });
    }
  });

  // Import/Export mutations
  const importSuppliersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/import-export/import/suppliers', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to import suppliers');
      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Import Completed",
        description: `Processed ${data.processed} suppliers. Created: ${data.created}, Updated: ${data.updated || 0}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import suppliers",
        variant: "destructive",
      });
    }
  });

  const importContactsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/import-export/import/contacts', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to import contacts');
      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      setSelectedFile(null);
      toast({
        title: "Import Completed",
        description: `Processed ${data.processed} contacts. Created: ${data.created}, Skipped: ${data.skipped || 0}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import contacts",
        variant: "destructive",
      });
    }
  });

  const handleClientCreated = (clientId: number) => {
    // Auto-save callback - client has been created and can be used for contacts
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
  };

  // Import/Export helper functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleDownloadTemplate = async (type: 'suppliers' | 'contacts') => {
    try {
      const response = await fetch(`/api/import-export/template/${type}`);
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_import_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: `${type} import template has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (type: 'suppliers' | 'contacts', entityType?: string) => {
    try {
      const url = entityType 
        ? `/api/import-export/export/${type}?entityType=${entityType}`
        : `/api/import-export/export/${type}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = entityType 
        ? `${entityType}_${type}_export_${timestamp}.csv`
        : `${type}_export_${timestamp}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Export Completed",
        description: `${type} data has been exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const isImporting = importSuppliersMutation.isPending || importContactsMutation.isPending;

  // Convert database client to form data format
  const convertClientToFormData = (client: Client): Partial<ClientFormData> => {
    return {
      name: client.name,
      company: client.company || "",
      type: client.type,
      address: client.address || undefined,
      city: client.city || undefined,
      state: client.state || undefined,
      postcode: client.postcode || undefined,
      country: client.country || "New Zealand",
      nzbn: client.nzbn || undefined,
      gstNumber: client.gstNumber || undefined,
      website: client.website || undefined,
      industry: client.industry || undefined,
      customerSince: client.customerSince ? new Date(client.customerSince) : undefined,
      creditLimit: String(client.creditLimit || 0),
      paymentTerms: client.paymentTerms || "30 days",
      discountRate: client.discountRate || "0.00",
      isActive: client.isActive ?? true,
      preferredCurrency: client.preferredCurrency || "NZD",
      notes: client.notes || undefined,
      internalReference: client.internalReference || undefined,
    };
  };

  // Filter suppliers based on search query
  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.company && supplier.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter clients based on search query
  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.industry && client.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contacts & Suppliers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your suppliers and business contacts
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers" className="space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="space-x-2">
            <Users className="h-4 w-4" />
            <span>Clients</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="space-x-2">
            <Phone className="h-4 w-4" />
            <span>Individual Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="import-export" className="space-x-2">
            <Upload className="h-4 w-4" />
            <span>Import/Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              <ToggleGroup 
                type="single" 
                value={suppliersViewMode} 
                onValueChange={(value) => value && setSuppliersViewMode(value as ViewMode)}
                className="border rounded-md"
              >
                <ToggleGroupItem value="card" aria-label="Card view">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Supplier</span>
              </Button>
            </div>
          </div>

          {suppliersLoading ? (
            suppliersViewMode === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-40 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-28 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse"></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={suppliersViewMode === "card" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                {[...Array(6)].map((_, i) => (
                  suppliersViewMode === "card" ? (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-muted rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-32"></div>
                          <div className="h-3 bg-muted rounded w-24"></div>
                        </div>
                      </div>
                      <div className="h-8 w-16 bg-muted rounded"></div>
                    </div>
                  )
                ))}
              </div>
            )
          ) : (
            <>
              {/* Card View */}
              {suppliersViewMode === "card" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSuppliers.map((supplier: Supplier) => (
                    <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{supplier.name}</CardTitle>
                          <ActionMenu
                            items={[
                              {
                                label: 'View Details',
                                icon: <Eye className="h-4 w-4" />,
                                onClick: () => setEditingSupplier(supplier)
                              },
                              {
                                label: 'Edit Supplier',
                                icon: <Edit className="h-4 w-4" />,
                                onClick: () => setEditingSupplier(supplier)
                              },
                              {
                                label: 'Delete Supplier',
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteDialogOpen(true);
                                },
                                variant: 'destructive',
                                separator: true
                              }
                            ]}
                          />
                        </div>
                        <CardDescription>
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
                            {supplier.isPreferredSupplier && (
                              <StatusBadge label="Preferred" variant="outline" />
                            )}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {supplier.email && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.city && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{supplier.city}, {supplier.country || "New Zealand"}</span>
                          </div>
                        )}
                        {supplier.paymentTerms && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>{supplier.paymentTerms}</span>
                          </div>
                        )}
                        {supplier.leadTimeStandard && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{supplier.leadTimeStandard} days standard</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {suppliersViewMode === "list" && (
                <div className="space-y-2">
                  {filteredSuppliers.map((supplier: Supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{supplier.name}</h3>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{supplier.company}</span>
                            <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} className="ml-2" />
                            {supplier.isPreferredSupplier && (
                              <StatusBadge label="Preferred" variant="outline" />
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {supplier.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{supplier.email}</span>
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{supplier.phone}</span>
                              </div>
                            )}
                            {supplier.city && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{supplier.city}, {supplier.country || "New Zealand"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <ActionMenu
                        items={[
                          {
                            label: 'View Details',
                            icon: <Eye className="h-4 w-4" />,
                            onClick: () => setEditingSupplier(supplier)
                          },
                          {
                            label: 'Edit Supplier',
                            icon: <Edit className="h-4 w-4" />,
                            onClick: () => setEditingSupplier(supplier)
                          },
                          {
                            label: 'Delete Supplier',
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => {
                              setSupplierToDelete(supplier);
                              setIsDeleteDialogOpen(true);
                            },
                            variant: 'destructive',
                            separator: true
                          }
                        ]}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {suppliersViewMode === "table" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier: Supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.company}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {supplier.email && (
                              <div className="flex items-center space-x-1 text-sm">
                                <Mail className="h-3 w-3" />
                                <span>{supplier.email}</span>
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center space-x-1 text-sm">
                                <Phone className="h-3 w-3" />
                                <span>{supplier.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.city && (
                            <span>{supplier.city}, {supplier.country || "New Zealand"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
                            {supplier.isPreferredSupplier && (
                              <StatusBadge label="Preferred" variant="outline" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={tableStyles.actionsCell}>
                          <ActionMenu
                            items={[
                              {
                                label: 'View Details',
                                icon: <Eye className="h-4 w-4" />,
                                onClick: () => setEditingSupplier(supplier)
                              },
                              {
                                label: 'Edit Supplier',
                                icon: <Edit className="h-4 w-4" />,
                                onClick: () => setEditingSupplier(supplier)
                              },
                              {
                                label: 'Delete Supplier',
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteDialogOpen(true);
                                },
                                variant: 'destructive',
                                separator: true
                              }
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}

          {!suppliersLoading && filteredSuppliers.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery ? "No suppliers match your search criteria." : "Get started by adding your first supplier."}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              <ToggleGroup 
                type="single" 
                value={clientsViewMode} 
                onValueChange={(value) => value && setClientsViewMode(value as ViewMode)}
                className="border rounded-md"
              >
                <ToggleGroupItem value="card" aria-label="Card view">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button onClick={() => setIsCreateClientDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>

          {clientsLoading ? (
            clientsViewMode === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-28 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse"></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={clientsViewMode === "card" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                {[...Array(6)].map((_, i) => (
                  clientsViewMode === "card" ? (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-muted rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-32"></div>
                          <div className="h-3 bg-muted rounded w-24"></div>
                        </div>
                      </div>
                      <div className="h-8 w-16 bg-muted rounded"></div>
                    </div>
                  )
                ))}
              </div>
            )
          ) : (
            <>
              {clients.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No clients found</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Get started by adding your first client.
                    </p>
                    <Button onClick={() => setIsCreateClientDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Card View */}
                  {clientsViewMode === "card" && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredClients.map((client: Client) => (
                        <Card key={client.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <CardTitle className="text-lg">{client.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {client.type.charAt(0).toUpperCase() + client.type.slice(1)}
                                  </Badge>
                                  {client.industry && (
                                    <span className="text-sm text-muted-foreground">• {client.industry}</span>
                                  )}
                                </CardDescription>
                              </div>
                              <ActionIcons
                                onEdit={() => setEditingClient(client)}
                                onDelete={() => {
                                  setClientToDelete(client);
                                  setIsDeleteClientDialogOpen(true);
                                }}
                                editTitle="Edit Client"
                                deleteTitle="Delete Client"
                                compact={false}
                              />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2 text-sm">
                              {client.address && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{client.address}, {client.city}</span>
                                </div>
                              )}
                              {client.paymentTerms && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>Payment: {client.paymentTerms}</span>
                                </div>
                              )}
                              {client.creditLimit && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  <span>Credit Limit: ${parseFloat(client.creditLimit).toLocaleString()}</span>
                                </div>
                              )}
                              {client.customerSince && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Since: {new Date(client.customerSince).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* List View */}
                  {clientsViewMode === "list" && (
                    <div className="space-y-2">
                      {filteredClients.map((client: Client) => (
                        <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium">{client.name}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {client.type.charAt(0).toUpperCase() + client.type.slice(1)}
                                </Badge>
                                {client.industry && (
                                  <span className="text-sm text-muted-foreground">• {client.industry}</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                {client.address && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{client.address}, {client.city}</span>
                                  </div>
                                )}
                                {client.paymentTerms && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{client.paymentTerms}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <ActionIcons
                            onEdit={() => setEditingClient(client)}
                            onDelete={() => {
                              setClientToDelete(client);
                              setIsDeleteClientDialogOpen(true);
                            }}
                            editTitle="Edit Client"
                            deleteTitle="Delete Client"
                            compact={false}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Table View */}
                  {clientsViewMode === "table" && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Industry</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Payment Terms</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client: Client) => (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {client.type.charAt(0).toUpperCase() + client.type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{client.industry || "-"}</TableCell>
                            <TableCell>
                              {client.address ? `${client.address}, ${client.city}` : "-"}
                            </TableCell>
                            <TableCell>{client.paymentTerms || "-"}</TableCell>
                            <TableCell className="text-right">
                              <ActionIcons
                              onEdit={() => setEditingClient(client)}
                              onDelete={() => {
                                setClientToDelete(client);
                                setIsDeleteClientDialogOpen(true);
                              }}
                              editTitle="Edit Client"
                              deleteTitle="Delete Client"
                              compact={false}
                            />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              <ToggleGroup 
                type="single" 
                value={contactsViewMode} 
                onValueChange={(value) => value && setContactsViewMode(value as ViewMode)}
                className="border rounded-md"
              >
                <ToggleGroupItem value="card" aria-label="Card view">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button className="space-x-2" disabled>
                <Plus className="h-4 w-4" />
                <span>Add Contact</span>
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Contact className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Individual Contacts</h3>
              <p className="text-muted-foreground text-center mb-4">
                Individual contact management will be available soon. Currently, contacts are managed within each supplier.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                The view switcher above is ready for when individual contacts are implemented.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-6">
          <Tabs defaultValue="import" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Data
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Suppliers Import */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Import Suppliers
                    </CardTitle>
                    <CardDescription>
                      Upload a CSV file to import supplier information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier-file">Select CSV File</Label>
                      <Input
                        id="supplier-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        disabled={isImporting}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTemplate('suppliers')}
                        className="flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Download Template
                      </Button>
                    </div>

                    {selectedFile && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{selectedFile.name}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                        
                        <Button
                          onClick={() => selectedFile && importSuppliersMutation.mutate(selectedFile)}
                          disabled={isImporting}
                          className="w-full"
                        >
                          {isImporting ? "Importing..." : "Import Suppliers"}
                        </Button>
                      </div>
                    )}

                    {isImporting && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Importing suppliers...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="w-full" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contacts Import */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Import Contacts
                    </CardTitle>
                    <CardDescription>
                      Upload a CSV file to import contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-file">Select CSV File</Label>
                      <Input
                        id="contact-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        disabled={isImporting}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTemplate('contacts')}
                        className="flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Download Template
                      </Button>
                    </div>

                    {selectedFile && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{selectedFile.name}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                        
                        <Button
                          onClick={() => selectedFile && importContactsMutation.mutate(selectedFile)}
                          disabled={isImporting}
                          className="w-full"
                        >
                          {isImporting ? "Importing..." : "Import Contacts"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Import Results */}
              {importResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {importResults.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      Import Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{importResults.processed}</div>
                        <div className="text-sm text-muted-foreground">Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{importResults.created}</div>
                        <div className="text-sm text-muted-foreground">Created</div>
                      </div>
                      {importResults.updated !== undefined && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                          <div className="text-sm text-muted-foreground">Updated</div>
                        </div>
                      )}
                      {importResults.skipped !== undefined && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{importResults.skipped}</div>
                          <div className="text-sm text-muted-foreground">Skipped</div>
                        </div>
                      )}
                    </div>

                    {importResults.errors && importResults.errors.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Errors occurred during import:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {importResults.errors.slice(0, 10).map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                              {importResults.errors.length > 10 && (
                                <li>... and {importResults.errors.length - 10} more errors</li>
                              )}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Export Suppliers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Export Suppliers
                    </CardTitle>
                    <CardDescription>
                      Download all supplier data as CSV
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => handleExport('suppliers')}
                      className="w-full flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export All Suppliers
                    </Button>
                  </CardContent>
                </Card>

                {/* Export Contacts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Export Contacts
                    </CardTitle>
                    <CardDescription>
                      Download contact data as CSV
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleExport('contacts')}
                        className="w-full flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export All Contacts
                      </Button>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Export by Type:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport('contacts', 'supplier')}
                            className="flex items-center gap-2"
                          >
                            <Building2 className="h-3 w-3" />
                            Supplier Contacts
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport('contacts', 'client')}
                            className="flex items-center gap-2"
                          >
                            <Users className="h-3 w-3" />
                            Client Contacts
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Export Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Export Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Supplier Export Includes:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Company details and registration info</li>
                        <li>• Contact information and addresses</li>
                        <li>• Financial terms and ratings</li>
                        <li>• Operational data and preferences</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Contact Export Includes:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Personal and professional details</li>
                        <li>• Phone numbers and email addresses</li>
                        <li>• Role classifications and departments</li>
                        <li>• Contact preferences and notes</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Create Supplier Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Add New Supplier</span>
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            mode="create"
            onSubmit={handleCreateSupplier}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={isLoading}
            onSupplierCreated={handleSupplierCreated}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              Edit Supplier - {editingSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <SupplierForm
              mode="edit"
              initialData={convertSupplierToFormData(editingSupplier)}
              onSubmit={handleUpdateSupplier}
              onCancel={() => setEditingSupplier(null)}
              isLoading={isLoading}
              supplierId={editingSupplier.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Add New Client</span>
            </DialogTitle>
          </DialogHeader>
          <ClientForm
            mode="create"
            onSubmit={handleCreateClient}
            onCancel={() => setIsCreateClientDialogOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              Edit Client - {editingClient?.name}
            </DialogTitle>
          </DialogHeader>
          {editingClient && (
            <ClientForm
              mode="edit"
              initialData={convertClientToFormData(editingClient)}
              onSubmit={handleUpdateClient}
              onCancel={() => setEditingClient(null)}
              isLoading={isLoading}
              clientId={editingClient.id}
              onClientCreated={handleClientCreated}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirmation Dialog */}
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

      {/* Delete Client Confirmation Dialog */}
      <AlertDialog open={isDeleteClientDialogOpen} onOpenChange={setIsDeleteClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete.id)}
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