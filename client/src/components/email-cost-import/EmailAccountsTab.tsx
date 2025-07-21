import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, RefreshCw, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Email account schema
const emailAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  provider: z.enum(["gmail", "outlook", "custom"]),
  email: z.string().email("Invalid email address"),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  imapConfig: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    secure: z.boolean().optional(),
  }).optional(),
});

type EmailAccountFormData = z.infer<typeof emailAccountSchema>;

export default function EmailAccountsTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch email accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/email-accounts"],
  });

  // Create email account mutation
  const createAccountMutation = useMutation({
    mutationFn: (data: EmailAccountFormData) => apiRequest("/api/email-accounts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-accounts"] });
      toast({
        title: "Email account added",
        description: "The email account has been connected successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add email account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete email account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/email-accounts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-accounts"] });
      toast({
        title: "Account removed",
        description: "The email account has been disconnected.",
      });
    },
  });

  // Sync email mutation
  const syncEmailMutation = useMutation({
    mutationFn: (accountId: number) => apiRequest(`/api/email-sync/${accountId}`, "POST"),
    onSuccess: () => {
      toast({
        title: "Email sync started",
        description: "Checking for new invoices and quotes...",
      });
    },
  });

  const form = useForm<EmailAccountFormData>({
    resolver: zodResolver(emailAccountSchema),
    defaultValues: {
      provider: "gmail",
      imapConfig: {
        secure: true,
      },
    },
  });

  const onSubmit = (data: EmailAccountFormData) => {
    createAccountMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Email Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Connect email accounts to automatically import supplier invoices and quotes
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Email Account
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading email accounts...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No email accounts connected</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Connect Your First Email
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(accounts as any[]).map((account: any) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {account.name}
                  </CardTitle>
                  <Badge variant={account.isActive ? "default" : "secondary"}>
                    {account.isActive ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>
                <CardDescription>{account.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Provider:</span>{" "}
                    <span className="capitalize">{account.provider}</span>
                  </div>
                  {account.lastSyncAt && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last sync:</span>{" "}
                      {new Date(account.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncEmailMutation.mutate(account.id)}
                      disabled={syncEmailMutation.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteAccountMutation.mutate(account.id)}
                      disabled={deleteAccountMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Email Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Email Account</DialogTitle>
            <DialogDescription>
              Connect your email to automatically import invoices and quotes from suppliers
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Purchasing Email" {...field} />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this email account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Provider</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="outlook">Outlook/Office 365</SelectItem>
                        <SelectItem value="custom">Custom IMAP</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Input type="email" placeholder="purchasing@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("provider") === "custom" && (
                <>
                  <FormField
                    control={form.control}
                    name="imapConfig.host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IMAP Server</FormLabel>
                        <FormControl>
                          <Input placeholder="imap.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imapConfig.port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IMAP Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="993"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAccountMutation.isPending}>
                  {createAccountMutation.isPending ? "Connecting..." : "Connect Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}