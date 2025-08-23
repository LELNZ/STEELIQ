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
import React from "react";

// Email account schema
const emailAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  provider: z.enum(["gmail", "outlook", "custom"]),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(), // For App Password
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  imapConfig: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    secure: z.boolean().optional(),
    user: z.string().optional(),
    pass: z.string().optional(),
  }).optional(),
});

type EmailAccountFormData = z.infer<typeof emailAccountSchema>;

export default function EmailAccountsTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOAuthConnecting, setIsOAuthConnecting] = useState(false);
  const { toast } = useToast();

  // Check for OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      toast({
        title: "Gmail connected successfully",
        description: "Your Gmail account has been connected via OAuth.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-accounts"] });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'oauth_failed') {
      toast({
        title: "Connection failed",
        description: "Failed to connect Gmail account. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  // Fetch email accounts
  const { data: accounts = [], isLoading } = useQuery<any[]>({
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
        host: "imap.gmail.com",
        port: 993,
        secure: true,
      },
    },
  });

  // Update IMAP config when provider changes
  const provider = form.watch("provider");
  if (provider === "gmail") {
    form.setValue("imapConfig.host", "imap.gmail.com");
    form.setValue("imapConfig.port", 993);
  } else if (provider === "outlook") {
    form.setValue("imapConfig.host", "outlook.office365.com");
    form.setValue("imapConfig.port", 993);
  }

  const onSubmit = (data: EmailAccountFormData) => {
    createAccountMutation.mutate(data);
  };

  // Handle OAuth connection
  const handleOAuthConnect = async () => {
    try {
      setIsOAuthConnecting(true);
      const response = await fetch('/api/auth/google', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: "Error",
        description: "Failed to start OAuth flow. Please try again.",
        variant: "destructive",
      });
      setIsOAuthConnecting(false);
    }
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

          {/* OAuth Option for Gmail */}
          <div className="border rounded-lg p-4 mb-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">Recommended: Connect with Google OAuth</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Securely connect your Gmail account using Google's OAuth authentication. 
                  No passwords are stored in our system.
                </p>
                <Button 
                  onClick={handleOAuthConnect} 
                  disabled={isOAuthConnecting}
                  className="w-full"
                  variant="default"
                >
                  {isOAuthConnecting ? "Connecting..." : "Connect Gmail with OAuth"}
                </Button>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or connect manually</span>
            </div>
          </div>

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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter 16-character app password" {...field} />
                    </FormControl>
                    <FormDescription>
                      {form.watch("provider") === "gmail" ? (
                        <>
                          <strong>For Gmail:</strong> Go to Google Account → Security → 2-Step Verification → App passwords. 
                          Generate a new password for "Mail" and paste it here.
                        </>
                      ) : form.watch("provider") === "outlook" ? (
                        <>
                          <strong>For Outlook:</strong> Use your regular password or create an app password if 2FA is enabled.
                        </>
                      ) : (
                        "Enter your email password or app-specific password"
                      )}
                    </FormDescription>
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