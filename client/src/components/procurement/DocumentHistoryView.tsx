import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Send,
  Download,
  Eye,
  Printer,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Globe,
} from "lucide-react";

const actionIcons = {
  sent: <Send className="h-4 w-4" />,
  downloaded: <Download className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  printed: <Printer className="h-4 w-4" />,
  acknowledged: <CheckCircle className="h-4 w-4" />,
} as const;

const statusColors = {
  pending: "secondary",
  sent: "default",
  delivered: "success",
  opened: "warning",
  bounced: "destructive",
  acknowledged: "success",
} as const;

const methodIcons = {
  email: <Mail className="h-4 w-4" />,
  portal: <Globe className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  print: <Printer className="h-4 w-4" />,
} as const;

export default function DocumentHistoryView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  // Fetch document history
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/document-history"],
  });

  // Filter history based on search and filters
  const filteredHistory = history.filter((item: any) => {
    const matchesSearch = !searchTerm || 
      item.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = documentTypeFilter === "all" || item.documentType === documentTypeFilter;
    const matchesAction = actionFilter === "all" || item.action === actionFilter;
    
    return matchesSearch && matchesType && matchesAction;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Send History
              </CardTitle>
              <CardDescription>
                Track all documents sent, downloaded, and acknowledged
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {filteredHistory.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by document number or recipient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PO">Purchase Orders</SelectItem>
                <SelectItem value="RFQ">RFQs</SelectItem>
                <SelectItem value="Quote">Quotes</SelectItem>
                <SelectItem value="Invoice">Invoices</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="downloaded">Downloaded</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading document history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No document history found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Acknowledged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.documentNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.documentType} • v{item.version || 1}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actionIcons[item.action as keyof typeof actionIcons]}
                          <span className="capitalize">{item.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {item.templateCode || 'Default'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.recipient ? (
                          <div className="flex flex-col">
                            <span className="text-sm">{item.recipient.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.recipient.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {methodIcons[item.sendMethod as keyof typeof methodIcons]}
                          <span className="capitalize">{item.sendMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.emailStatus ? (
                          <Badge variant={statusColors[item.emailStatus as keyof typeof statusColors] || "secondary"}>
                            {item.emailStatus === 'opened' && <Eye className="h-3 w-3 mr-1" />}
                            {item.emailStatus === 'delivered' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {item.emailStatus === 'bounced' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {item.emailStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {item.emailStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(item.sentAt), "MMM d, yyyy")}
                        </span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.sentAt), "h:mm a")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.acknowledgedAt ? (
                          <div className="flex flex-col">
                            <Badge variant="success" className="mb-1">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.acknowledgedAt), "MMM d h:mm a")}
                            </span>
                            {item.acknowledgedBy && (
                              <span className="text-xs text-muted-foreground">
                                by {item.acknowledgedBy}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h: any) => h.action === 'sent').length}
            </div>
            <p className="text-xs text-muted-foreground">Email & portal sends</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h: any) => h.action === 'downloaded').length}
            </div>
            <p className="text-xs text-muted-foreground">PDF downloads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h: any) => h.acknowledgedAt).length}
            </div>
            <p className="text-xs text-muted-foreground">Confirmed receipts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h: any) => h.emailStatus === 'opened').length > 0 
                ? Math.round((history.filter((h: any) => h.emailStatus === 'opened').length / 
                   history.filter((h: any) => h.action === 'sent').length) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Emails opened</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}