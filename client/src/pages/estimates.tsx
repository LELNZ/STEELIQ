import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search, 
  Plus, 
  Clock, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Copy,
  Trash2
} from "lucide-react";

interface Estimate {
  id: string;
  number: string;
  customerName: string;
  projectDescription: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  totalAmount: number;
  createdDate: string;
  expiryDate: string;
  validDays: number;
}

export default function EstimatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock estimates data - replace with actual API call
  const estimates: Estimate[] = [
    {
      id: "1",
      number: "EST-2024-001",
      customerName: "ABC Construction",
      projectDescription: "Steel frame cutting for warehouse project",
      status: "sent",
      totalAmount: 15750.00,
      createdDate: "2024-01-15",
      expiryDate: "2024-02-15",
      validDays: 30
    },
    {
      id: "2", 
      number: "EST-2024-002",
      customerName: "XYZ Builders",
      projectDescription: "Custom brackets and supports",
      status: "draft",
      totalAmount: 8900.00,
      createdDate: "2024-01-18",
      expiryDate: "2024-02-18",
      validDays: 30
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="h-3 w-3" />;
      case 'sent': return <Clock className="h-3 w-3" />;
      case 'accepted': return <CheckCircle className="h-3 w-3" />;
      case 'declined': return <AlertCircle className="h-3 w-3" />;
      case 'expired': return <AlertCircle className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = estimate.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         estimate.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         estimate.projectDescription.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || estimate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalValue = estimates.reduce((sum, est) => sum + est.totalAmount, 0);
  const pendingCount = estimates.filter(est => est.status === 'sent').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estimates & Quotes</h1>
          <p className="text-muted-foreground">
            Manage all customer estimates and track their status
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Estimate
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{estimates.length}</div>
                <div className="text-sm text-muted-foreground">Total Estimates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Pending Response</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {estimates.filter(est => est.status === 'accepted').length}
                </div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search estimates by customer, number, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Estimates List */}
      <div className="space-y-3">
        {filteredEstimates.map((estimate) => (
          <Card key={estimate.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{estimate.number}</h3>
                    <Badge className={getStatusColor(estimate.status)}>
                      {getStatusIcon(estimate.status)}
                      <span className="ml-1 capitalize">{estimate.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">{estimate.customerName}</div>
                      <div className="text-muted-foreground">{estimate.projectDescription}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium">${estimate.totalAmount.toLocaleString()}</div>
                      <div className="text-muted-foreground">
                        Created: {new Date(estimate.createdDate).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium">
                        Expires: {new Date(estimate.expiryDate).toLocaleDateString()}
                      </div>
                      <div className="text-muted-foreground">
                        Valid for {estimate.validDays} days
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEstimates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No estimates found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Create your first estimate to get started"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}