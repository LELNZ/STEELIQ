import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, Trash2, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

// Template schema
const templateSchema = z.object({
  supplierId: z.number().min(1, "Supplier is required"),
  supplierEmail: z.string().email("Invalid email address"),
  templateName: z.string().min(1, "Template name is required"),
  parseRules: z.object({
    invoiceNumberPattern: z.string().optional(),
    datePattern: z.string().optional(),
    amountPattern: z.string().optional(),
    poNumberPattern: z.string().optional(),
    attachmentTypes: z.array(z.string()).optional(),
  }),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface SupplierTemplate {
  id: number;
  supplierId: number;
  supplier: string;
  supplierEmail: string;
  templateName: string;
  accuracy: number;
  lastUsedAt: string;
}

export default function SupplierTemplatesTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/supplier-templates"],
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormData) => apiRequest("/api/supplier-templates", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-templates"] });
      toast({
        title: "Template created",
        description: "The supplier template has been created successfully.",
      });
      setIsAddDialogOpen(false);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/supplier-templates/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-templates"] });
      toast({
        title: "Template deleted",
        description: "The supplier template has been removed.",
      });
    },
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      parseRules: {
        attachmentTypes: ["pdf", "jpg", "png"],
      },
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "bg-green-500";
    if (accuracy >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Supplier Templates</h3>
          <p className="text-sm text-muted-foreground">
            Configure parsing rules for automatic supplier invoice recognition
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Settings2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No supplier templates configured</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: SupplierTemplate) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.templateName}</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{template.supplier}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-mono text-xs">{template.supplierEmail}</span>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Accuracy</span>
                    <span className="text-sm font-medium">{template.accuracy}%</span>
                  </div>
                  <Progress value={template.accuracy} className={`h-2 ${getAccuracyColor(template.accuracy)}`} />
                </div>

                {template.lastUsedAt && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last used:</span>{" "}
                    {format(new Date(template.lastUsedAt), "dd/MM/yyyy")}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Auto-improving
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Supplier Template</DialogTitle>
            <DialogDescription>
              Set up parsing rules for automatic invoice data extraction
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        const supplier = suppliers.find((s: any) => s.id === parseInt(value));
                        if (supplier) {
                          form.setValue("supplierEmail", supplier.email || "");
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Standard Invoice Format" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this parsing template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="invoices@supplier.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      The email address invoices are sent from
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Parse Rules (Optional)</h4>
                <p className="text-xs text-muted-foreground">
                  Leave blank to use AI auto-detection
                </p>

                <FormField
                  control={form.control}
                  name="parseRules.invoiceNumberPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Invoice Number Pattern</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., INV-[0-9]{6}" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parseRules.amountPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Amount Pattern</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Total: $[0-9,]+\.[0-9]{2}" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}