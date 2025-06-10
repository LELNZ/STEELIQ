import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, User, Mail, Phone, Trash2, Edit, Star, Users, Grid3X3, List, Table, Building } from "lucide-react";
import { ActionIcons } from "@/components/ui/action-icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Contact validation schema
const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false)
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Contact {
  id: number;
  supplierId?: number;
  clientId?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneMobile?: string;
  phonePrimary?: string;
  phoneDirect?: string;
  mobile?: string;
  workPhone?: string;
  position?: string;
  title?: string;
  department?: string;
  isPrimaryContact?: boolean;
  isPrimary?: boolean;
}

interface ContactManagementTabProps {
  entityId: number;
  entityType: "supplier" | "client";
  entityName?: string;
  mode?: "create" | "edit";
  autoMarkAsPrimary?: boolean;
  onPreferredContactChange?: (contact: Contact | null) => void;
}

type ViewMode = "grid" | "list" | "table";

export function ContactManagementTab({ entityId, entityType, entityName, mode = "create", autoMarkAsPrimary = false, onPreferredContactChange }: ContactManagementTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contacts for this entity (supplier or client)
  const apiEndpoint = entityType === "supplier" ? "supplier-contacts" : "client-contacts";
  const queryParam = entityType === "supplier" ? "supplierId" : "clientId";
  
  const contactsQuery = useQuery({
    queryKey: [apiEndpoint, entityId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/${apiEndpoint}?${queryParam}=${entityId}`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!entityId
  });

  const contacts = contactsQuery.data || [];
  const isLoading = contactsQuery.isLoading;

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      // Auto-mark as primary if enabled and no existing contacts
      if (autoMarkAsPrimary && contacts.length === 0) {
        contactData.isPrimaryContact = true;
      }
      
      // Add the correct entity ID field
      if (entityType === "supplier") {
        contactData.supplierId = entityId;
      } else {
        contactData.clientId = entityId;
      }
      
      return apiRequest("POST", `/api/${apiEndpoint}`, contactData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint, entityId] });
      queryClient.refetchQueries({ queryKey: [apiEndpoint, entityId] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({ 
        title: "Contact added successfully",
        description: autoMarkAsPrimary && contacts.length === 0 ? "Contact marked as primary" : undefined
      });
    },
    onError: (error) => {
      toast({ title: "Error adding contact", description: error.message, variant: "destructive" });
    }
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      return apiRequest("PATCH", `/api/${apiEndpoint}/${contactData.id}`, contactData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint, entityId] });
      queryClient.refetchQueries({ queryKey: [apiEndpoint, entityId] });
      setIsEditDialogOpen(false);
      setEditingContact(null);
      editForm.reset();
      toast({ title: "Contact updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating contact", description: error.message, variant: "destructive" });
    }
  });

  // Delete contact mutation with comprehensive refresh
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      console.log(`Deleting ${entityType} contact ID ${contactId} via ${apiEndpoint}`);
      
      // Make the delete request
      const response = await fetch(`/api/${apiEndpoint}/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete contact: ${response.status}`);
      }
      
      console.log(`Delete successful - status: ${response.status}`);
      return { success: true };
    },
    onSuccess: async () => {
      console.log(`Refreshing contacts for ${entityType} ID ${entityId}`);
      
      // Multiple refresh strategies to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: [apiEndpoint, entityId] });
      await queryClient.refetchQueries({ queryKey: [apiEndpoint, entityId] });
      await contactsQuery.refetch();
      
      // Force a complete cache reset for this query
      queryClient.removeQueries({ queryKey: [apiEndpoint, entityId] });
      
      toast({ title: "Contact deleted successfully" });
    },
    onError: (error) => {
      console.error(`Delete error:`, error);
      toast({ 
        title: "Error deleting contact", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Add contact form
  const addForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      phone: "",
      title: "",
      department: "",
      isPrimary: false
    }
  });

  // Edit contact form
  const editForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      phone: "",
      title: "",
      department: "",
      isPrimary: false
    }
  });

  const handleEdit = (contact: Contact) => {
    console.log("Editing contact:", contact);
    console.log("Entity type:", entityType);
    setEditingContact(contact);
    
    // Reset form with contact data mapped from database fields - different mapping for suppliers vs clients
    let formData;
    if (entityType === "supplier") {
      formData = {
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        mobile: contact.phoneMobile || "",
        phone: contact.phonePrimary || "",
        title: contact.position || "",
        department: contact.department || "",
        isPrimary: contact.isPrimaryContact || false
      };
    } else {
      // Client contact mapping
      formData = {
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        mobile: contact.mobile || "",
        phone: contact.workPhone || "",
        title: contact.title || "",
        department: contact.department || "",
        isPrimary: contact.isPrimary || false
      };
    }
    
    console.log("Form data being set:", formData);
    editForm.reset(formData);
    
    // Set dialog open after form reset to ensure it's properly populated
    setTimeout(() => {
      setIsEditDialogOpen(true);
    }, 0);
  };

  const handleAddSubmit = (data: ContactFormData) => {
    // Map form data to database schema for creating new contact
    const mappedData = {
      ...(entityType === "supplier" ? { supplierId: entityId } : { clientId: entityId }),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      ...(entityType === "supplier" ? {
        phoneMobile: data.mobile,
        phonePrimary: data.phone,
        position: data.title,
        isPrimaryContact: data.isPrimary
      } : {
        mobile: data.mobile,
        workPhone: data.phone,
        title: data.title,
        isPrimary: data.isPrimary
      }),
      department: data.department
    };
    addContactMutation.mutate(mappedData);
  };

  const handleEditSubmit = (data: ContactFormData) => {
    if (editingContact) {
      // Map form data to database schema
      const mappedData = {
        id: editingContact.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        ...(entityType === "supplier" ? {
          phoneMobile: data.mobile,
          phonePrimary: data.phone,
          position: data.title,
          isPrimaryContact: data.isPrimary
        } : {
          mobile: data.mobile,
          workPhone: data.phone,
          title: data.title,
          isPrimary: data.isPrimary
        }),
        department: data.department
      };
      updateContactMutation.mutate(mappedData);
    }
  };

  // Set primary contact mutation
  const setPrimaryContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const endpoint = entityType === "supplier" ? "supplier-contacts" : "client-contacts";
      return await apiRequest(`/api/${endpoint}/${contactId}/set-primary`, "PATCH");
    },
    onSuccess: async () => {
      // Refresh contacts list
      await queryClient.invalidateQueries({ queryKey: [apiEndpoint, entityId] });
      await contactsQuery.refetch();
      
      // Refresh the parent entity to update main contact fields
      if (entityType === "supplier") {
        await queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      }
      
      toast({ title: "Primary contact updated successfully" });
    },
    onError: (error) => {
      console.error("Set primary contact error:", error);
      toast({ 
        title: "Error setting primary contact", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleSetAsPrimary = (contact: Contact) => {
    console.log("Setting as primary:", contact);
    console.log("Entity type:", entityType);
    console.log("Contact ID:", contact.id);
    setPrimaryContactMutation.mutate(contact.id);
  };

  const handleDelete = (contactId: number) => {
    deleteContactMutation.mutate(contactId);
  };

  const primaryContact = contacts.find((contact: Contact) => 
    entityType === "supplier" ? contact.isPrimaryContact : contact.isPrimary
  );
  const contactCount = contacts.length;

  if (!entityId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Save the {entityType} first to manage contacts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with summary and controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Contact Management
            {contactCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {contactCount} contact{contactCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </h3>
          {entityName && (
            <p className="text-sm text-muted-foreground">
              Managing contacts for {entityName}
            </p>
          )}
          {primaryContact && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              Primary: {primaryContact.firstName} {primaryContact.lastName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggles */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none border-x"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-l-none"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>

          {/* Add contact button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-3">
                  {/* Personal Information */}
                  <div className="space-y-3">
                    <div className="border-b border-border pb-2">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={addForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">First Name *</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Last Name *</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <div className="border-b border-border pb-2">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact Information
                      </h4>
                    </div>
                    <FormField
                      control={addForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={addForm.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Mobile</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Office Phone</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-3">
                    <div className="border-b border-border pb-2">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Professional Information
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={addForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Title</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Department</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sales">Sales</SelectItem>
                                  <SelectItem value="Purchasing">Purchasing</SelectItem>
                                  <SelectItem value="Engineering">Engineering</SelectItem>
                                  <SelectItem value="Quality">Quality</SelectItem>
                                  <SelectItem value="Operations">Operations</SelectItem>
                                  <SelectItem value="Finance">Finance</SelectItem>
                                  <SelectItem value="Management">Management</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-3">
                    <div className="border-b border-border pb-2">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Settings
                      </h4>
                    </div>
                    <FormField
                      control={addForm.control}
                      name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Primary Contact</FormLabel>
                            <div className="text-xs text-muted-foreground">
                              {primaryContact && !field.value ? 
                                `Another contact is already primary for this ${entityType}` : 
                                `Set as main contact for this ${entityType}`
                              }
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!field.value && !!primaryContact}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={addContactMutation.isPending}
                      className="h-9"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addContactMutation.isPending} className="h-9">
                      {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Contact list/grid/table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading contacts...</div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No contacts added yet</p>
            <p className="text-sm">Add a contact to get started</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === "grid" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact: Contact) => (
                <Card key={contact.id} className="relative">
                  <div className="absolute top-2 right-2">
                    {(entityType === "supplier" ? contact.isPrimaryContact : contact.isPrimary) ? (
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetAsPrimary(contact)}
                        title="Set as Primary"
                        disabled={setPrimaryContactMutation.isPending}
                        className="h-7 w-7 p-0 hover:bg-yellow-50"
                      >
                        <Star className="h-4 w-4 text-gray-400 hover:text-yellow-500" />
                      </Button>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      {contact.firstName} {contact.lastName}
                    </CardTitle>
                    {contact.position && (
                      <p className="text-sm text-muted-foreground">{contact.position}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phoneMobile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{contact.phoneMobile}</span>
                      </div>
                    )}
                    {contact.department && (
                      <Badge variant="outline" className="text-xs">
                        {contact.department}
                      </Badge>
                    )}
                    <div className="flex justify-end items-center gap-2 pt-2">
                      <ActionIcons
                        onEdit={() => handleEdit(contact)}
                        onDelete={() => handleDelete(contact.id)}
                        editTitle="Edit Contact"
                        deleteTitle="Delete Contact"
                        compact={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-2">
              {contacts.map((contact: Contact) => (
                <Card key={contact.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </span>
                        {contact.isPrimaryContact && (
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {contact.position} {contact.position && contact.department && "•"} {contact.department}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {contact.email} {contact.email && contact.phoneMobile && "•"} {contact.phoneMobile}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(contact)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {contact.firstName} {contact.lastName}?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(contact.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Mobile</th>
                    <th className="text-left p-3 font-medium">Primary</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact: Contact) => (
                    <tr key={contact.id} className="border-b">
                      <td className="p-3 font-medium">
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td className="p-3 text-muted-foreground">{contact.position || "—"}</td>
                      <td className="p-3 text-muted-foreground">{contact.department || "—"}</td>
                      <td className="p-3 text-muted-foreground">{contact.email || "—"}</td>
                      <td className="p-3 text-muted-foreground">{contact.phoneMobile || "—"}</td>
                      <td className="p-3">
                        {(entityType === "supplier" ? contact.isPrimaryContact : contact.isPrimary) ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetAsPrimary(contact)}
                            title="Set as Primary"
                            disabled={setPrimaryContactMutation.isPending}
                            className="h-6 w-6 p-0 hover:bg-yellow-50"
                          >
                            <Star className="h-3 w-3 text-gray-400 hover:text-yellow-500" />
                          </Button>
                        )}
                      </td>
                      <td className="p-3">
                        <ActionIcons
                          onEdit={() => handleEdit(contact)}
                          onDelete={() => {
                            if (confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}? This action cannot be undone.`)) {
                              handleDelete(contact.id);
                            }
                          }}
                          editTitle="Edit Contact"
                          deleteTitle="Delete Contact"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit contact dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Purchasing">Purchasing</SelectItem>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Quality">Quality</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Management">Management</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Primary Contact</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {primaryContact && !field.value && primaryContact.id !== editingContact?.id ? 
                          `Another contact is already primary for this ${entityType}` : 
                          `Set as main contact for this ${entityType}`
                        }
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!field.value && !!primaryContact && primaryContact.id !== editingContact?.id}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingContact(null);
                  }}
                  disabled={updateContactMutation.isPending}
                >
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