import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Package, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  status: string;
  orderDate: Date;
  requestedDeliveryDate?: Date;
  totalAmount: number;
  currency: string;
  itemCount: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  type: string;
  supplierName: string;
  status: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  currency: string;
}

interface Quote {
  id: number;
  quoteNumber: string;
  supplierName: string;
  status: string;
  quoteDate: Date;
  expiryDate?: Date;
  totalAmount: number;
  currency: string;
}

interface FinancialSummary {
  totalPurchaseOrders: number;
  totalPOValue: number;
  pendingInvoices: number;
  pendingInvoiceValue: number;
  overdueInvoices: number;
  overdueValue: number;
  activeQuotes: number;
  quoteValue: number;
}

export default function FinancialDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  // Fetch financial summary
  const { data: summary } = useQuery({
    queryKey: ["/api/financial/summary", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/financial/summary?days=${dateRange}`);
      if (!response.ok) throw new Error("Failed to fetch financial summary");
      return response.json() as FinancialSummary;
    }
  });

  // Fetch purchase orders
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["/api/purchase-orders", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await fetch(`/api/purchase-orders${params}`);
      if (!response.ok) throw new Error("Failed to fetch purchase orders");
      return response.json() as PurchaseOrder[];
    }
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await fetch(`/api/invoices${params}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json() as Invoice[];
    }
  });

  // Fetch quotes
  const { data: quotes = [] } = useQuery({
    queryKey: ["/api/quotes", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await fetch(`/api/quotes${params}`);
      if (!response.ok) throw new Error("Failed to fetch quotes");
      return response.json() as Quote[];
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, icon: FileText },
      pending: { variant: "default" as const, icon: Clock },
      approved: { variant: "default" as const, icon: CheckCircle },
      ordered: { variant: "default" as const, icon: Package },
      received: { variant: "default" as const, icon: CheckCircle },
      paid: { variant: "default" as const, icon: CheckCircle },
      overdue: { variant: "destructive" as const, icon: AlertTriangle },
      expired: { variant: "secondary" as const, icon: AlertTriangle },
      accepted: { variant: "default" as const, icon: CheckCircle },
      rejected: { variant: "destructive" as const, icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary" as const, icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = "NZD") => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po =>
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuotes = quotes.filter(quote =>
    quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">Monitor purchase orders, invoices, and quotes</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalPurchaseOrders || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(summary?.totalPOValue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.pendingInvoices || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(summary?.pendingInvoiceValue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{summary?.overdueInvoices || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(summary?.overdueValue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.activeQuotes || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(summary?.quoteValue || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Tables */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Purchase Orders</CardTitle>
                <CardDescription>Latest purchase order activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.slice(0, 5).map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell>{formatCurrency(po.totalAmount, po.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Invoice Due Dates</CardTitle>
                <CardDescription>Invoices requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices
                      .filter(inv => inv.status === 'pending')
                      .slice(0, 5)
                      .map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.supplierName}</TableCell>
                          <TableCell>{format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{formatCurrency(invoice.totalAmount - invoice.paidAmount, invoice.currency)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search purchase orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage and track purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{format(new Date(po.orderDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {po.requestedDeliveryDate 
                          ? format(new Date(po.requestedDeliveryDate), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>{po.itemCount}</TableCell>
                      <TableCell>{formatCurrency(po.totalAmount, po.currency)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Track and manage invoice payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.type}</TableCell>
                      <TableCell>{invoice.supplierName}</TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount, invoice.currency)}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount - invoice.paidAmount, invoice.currency)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>Manage supplier quotes and requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Quote Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                      <TableCell>{quote.supplierName}</TableCell>
                      <TableCell>{format(new Date(quote.quoteDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {quote.expiryDate 
                          ? format(new Date(quote.expiryDate), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>{formatCurrency(quote.totalAmount, quote.currency)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}