import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  User, 
  Building2, 
  Star,
  Download,
  Upload,
  FileText,
  Calendar,
  MapPin
} from "lucide-react";

const contactSchema = z.object({
  supplierId: z.number(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  position: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phonePrimary: z.string().optional(),
  phoneMobile: z.string().optional(),
  phoneDirect: z.string().optional(),
  isPrimaryContact: z.boolean().default(false),
  isAccountsContact: z.boolean().default(false),
  isTechnicalContact: z.boolean().default(false),
  isSalesContact: z.boolean().default(false),
  preferredContactMethod: z.string().default("email"),
  notes: z.string().optional(),
  isActive: z.boolean().default(true)
});

type ContactFormData = z.infer<typeof contactSchema>;

interface SupplierContact {
  id: number;
  supplierId: number;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
  phonePrimary?: string;
  phoneMobile?: string;
  phoneDirect?: string;
  isPrimaryContact: boolean;
  isAccountsContact: boolean;
  isTechnicalContact: boolean;
  isSalesContact: boolean;
  preferredContactMethod: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  supplier?: {
    id: number;
    name: string;
  };
}

interface Supplier {
  id: number;
  name: string;
  company: string;
}

export default function SupplierContactsPage() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<SupplierContact | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    select: (data) => Array.isArray(data) ? data : []
  });

  // Fetch contacts for selected supplier
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["/api/supplier-contacts", selectedSupplierId],
    queryFn: () => selectedSupplierId ? `/api/supplier-contacts?supplierId=${selectedSupplierId}` : "/api/supplier-contacts",
    enabled: !!selectedSupplierId,
    select: (data) => Array.isArray(data) ? data : []
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: (data: ContactFormData) => apiRequest("/api/supplier-contacts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contacts", selectedSupplierId] });
      setIsAddDialogOpen(false);
      toast({ title: "Contact added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding contact", description: error.message, variant: "destructive" });
    }
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ContactFormData }) => 
      apiRequest(`/api/supplier-contacts/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contacts", selectedSupplierId] });
      setIsEditDialogOpen(false);
      setSelectedContact(null);
      toast({ title: "Contact updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating contact", description: error.message, variant: "destructive" });
    }
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/supplier-contacts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contacts", selectedSupplierId] });
      toast({ title: "Contact deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting contact", description: error.message, variant: "destructive" });
    }
  });

  // Contact form
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      supplierId: selectedSupplierId || 0,
      firstName: "",
      lastName: "",
      position: "",
      department: "",
      email: "",
      phonePrimary: "",
      phoneMobile: "",
      phoneDirect: "",
      isPrimaryContact: false,
      isAccountsContact: false,
      isTechnicalContact: false,
      isSalesContact: false,
      preferredContactMethod: "email",
      notes: "",
      isActive: true
    }
  });

  const onSubmit = (data: ContactFormData) => {
    if (selectedContact) {
      updateContactMutation.mutate({ id: selectedContact.id, data });
    } else {
      addContactMutation.mutate({ ...data, supplierId: selectedSupplierId! });
    }
  };

  const handleEdit = (contact: SupplierContact) => {
    setSelectedContact(contact);
    form.reset({
      supplierId: contact.supplierId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      position: contact.position || "",
      department: contact.department || "",
      email: contact.email || "",
      phonePrimary: contact.phonePrimary || "",
      phoneMobile: contact.phoneMobile || "",
      phoneDirect: contact.phoneDirect || "",
      isPrimaryContact: contact.isPrimaryContact,
      isAccountsContact: contact.isAccountsContact,
      isTechnicalContact: contact.isTechnicalContact,
      isSalesContact: contact.isSalesContact,
      preferredContactMethod: contact.preferredContactMethod,
      notes: contact.notes || "",
      isActive: contact.isActive
    });
    setIsEditDialogOpen(true);
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getContactRoles = (contact: SupplierContact) => {
    const roles = [];
    if (contact.isPrimaryContact) roles.push("Primary");
    if (contact.isAccountsContact) roles.push("Accounts");
    if (contact.isTechnicalContact) roles.push("Technical");
    if (contact.isSalesContact) roles.push("Sales");
    return roles;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Contacts</h1>
          <p className="text-muted-foreground">Manage detailed contact information for suppliers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Contacts
          </Button>
          {selectedSupplierId && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                              <Input placeholder="Sales Manager" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input placeholder="Sales" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Contact Information</h3>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john.smith@supplier.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="phonePrimary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="+64 9 123 4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phoneMobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile</FormLabel>
                              <FormControl>
                                <Input placeholder="+64 21 123 456" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phoneDirect"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Direct Line</FormLabel>
                              <FormControl>
                                <Input placeholder="+64 9 123 4568" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Contact Roles</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="isPrimaryContact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Primary Contact</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isAccountsContact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Accounts Contact</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isTechnicalContact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Technical Contact</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isSalesContact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Sales Contact</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="preferredContactMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Contact Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select contact method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="mobile">Mobile</SelectItem>
                            </SelectContent>
                          </Select>
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
                            <Textarea placeholder="Additional notes about this contact..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addContactMutation.isPending}>
                        {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Supplier Selection Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {(suppliers as Supplier[]).map((supplier: Supplier) => (
                <button
                  key={supplier.id}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                    selectedSupplierId === supplier.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(contacts as SupplierContact[]).filter((c: SupplierContact) => c.supplierId === supplier.id).length} contacts
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contacts Display */}
        <div className="lg:col-span-3">
          {selectedSupplierId ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {(suppliers as Supplier[]).find((s: Supplier) => s.id === selectedSupplierId)?.name} Contacts
                </h2>
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {isLoading ? (
                <div className="text-center py-8">Loading contacts...</div>
              ) : filteredContacts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? "No contacts match your search." : "Add your first contact for this supplier."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredContacts.map((contact: SupplierContact) => (
                    <Card key={contact.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {contact.firstName} {contact.lastName}
                              {contact.isPrimaryContact && (
                                <Star className="h-4 w-4 inline ml-2 text-yellow-500" />
                              )}
                            </CardTitle>
                            {contact.position && (
                              <CardDescription>{contact.position}</CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(contact)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => deleteContactMutation.mutate(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phonePrimary && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.phonePrimary}</span>
                          </div>
                        )}
                        {contact.department && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.department}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {getContactRoles(contact).map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Select a Supplier</h3>
                <p className="text-muted-foreground">
                  Choose a supplier from the sidebar to view and manage their contacts.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Same form fields as add dialog */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateContactMutation.isPending}>
                  {updateContactMutation.isPending ? "Updating..." : "Update Contact"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}