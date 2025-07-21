import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Link,
  TestTube,
  Database,
  FileJson,
  Zap,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export function ApiConnectionsTab() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["/api/supplier-integration/connections"],
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await fetch(`/api/supplier-integration/connections/${connectionId}/test`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Test failed");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection Test Successful",
        description: "API connection is working properly.",
      });
    },
    onError: () => {
      toast({
        title: "Connection Test Failed",
        description: "Please check your API credentials and endpoint.",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">API Connections</h3>
            <p className="text-sm text-muted-foreground">
              Manage supplier API integrations and catalog connections
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add API Connection</DialogTitle>
                <DialogDescription>
                  Configure a new supplier API integration
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="general" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="authentication">Authentication</TabsTrigger>
                  <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                  <div>
                    <Label>Supplier</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Connection Name</Label>
                    <Input placeholder="e.g., Steel & Tube Price API" />
                  </div>
                  <div>
                    <Label>API Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select API type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rest">REST API</SelectItem>
                        <SelectItem value="soap">SOAP/XML</SelectItem>
                        <SelectItem value="graphql">GraphQL</SelectItem>
                        <SelectItem value="csv">CSV/FTP</SelectItem>
                        <SelectItem value="edi">EDI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Base URL</Label>
                    <Input placeholder="https://api.supplier.com/v1" />
                  </div>
                </TabsContent>
                <TabsContent value="authentication" className="space-y-4">
                  <div>
                    <Label>Authentication Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select auth method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api-key">API Key</SelectItem>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="custom">Custom Headers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>API Key</Label>
                    <Input type="password" placeholder="Enter API key" />
                  </div>
                  <div>
                    <Label>Additional Headers (JSON)</Label>
                    <Textarea 
                      placeholder='{"X-Custom-Header": "value"}'
                      className="font-mono"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="mapping" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Map supplier fields to your system fields
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Supplier Field</Label>
                        <Input placeholder="product_code" />
                      </div>
                      <div>
                        <Label>System Field</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Map to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">Material Code</SelectItem>
                            <SelectItem value="name">Material Name</SelectItem>
                            <SelectItem value="price">Unit Price</SelectItem>
                            <SelectItem value="stock">Stock Level</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Mapping
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test & Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon("connected")}
              <div>
                <h4 className="font-semibold">Steel & Tube Holdings</h4>
                <p className="text-sm text-muted-foreground">Price & Stock API</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span>REST API</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Products:</span>
              <span>1,245</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Sync:</span>
              <span>2 mins ago</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge("connected")}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => testConnectionMutation.mutate(1)}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon("connected")}
              <div>
                <h4 className="font-semibold">Fletcher Steel</h4>
                <p className="text-sm text-muted-foreground">Catalog API</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span>GraphQL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Products:</span>
              <span>892</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Sync:</span>
              <span>15 mins ago</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge("connected")}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1">
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon("error")}
              <div>
                <h4 className="font-semibold">Vulcan Steel</h4>
                <p className="text-sm text-muted-foreground">FTP/CSV Import</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span>CSV/FTP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Products:</span>
              <span>567</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Sync:</span>
              <span className="text-red-600">Failed</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge("error")}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1">
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>

      {/* Connection Logs */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Connection Activity</h3>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2 mins ago</TableCell>
                <TableCell>Steel & Tube Holdings</TableCell>
                <TableCell>Price Sync</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Success</Badge>
                </TableCell>
                <TableCell>Updated 145 prices</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>15 mins ago</TableCell>
                <TableCell>Fletcher Steel</TableCell>
                <TableCell>Catalog Update</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Success</Badge>
                </TableCell>
                <TableCell>Added 23 new products</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>1 hour ago</TableCell>
                <TableCell>Vulcan Steel</TableCell>
                <TableCell>FTP Connection</TableCell>
                <TableCell>
                  <Badge className="bg-red-100 text-red-800">Failed</Badge>
                </TableCell>
                <TableCell>Authentication error</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}