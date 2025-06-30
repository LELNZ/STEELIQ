import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Send,
  Archive,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { format, isAfter, differenceInDays } from "date-fns";

interface QuoteStatus {
  id: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'converted';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface EstimationProject {
  id: number;
  name: string;
  description?: string;
  status: string;
  totalCost: number;
  margin: number;
  overheadPercentage: number;
  deliveryDate?: string;
  estimatedHours?: number;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  quotationData?: {
    sentDate?: string;
    expiryDate?: string;
    viewedDate?: string;
    followUpDate?: string;
    probability?: number;
    notes?: string;
  };
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-600',
  converted: 'bg-purple-100 text-purple-800'
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function AIEstimationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<EstimationProject | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Fetch estimation projects with quotation data
  const { data: estimationProjects = [], isLoading } = useQuery<EstimationProject[]>({
    queryKey: ['/api/estimations'],
  });

  // Calculate quotation metrics
  const quotationMetrics = estimationProjects.reduce((acc: any, project: EstimationProject) => {
    acc.total += 1;
    acc.totalValue += project.totalCost || 0;
    
    switch (project.status) {
      case 'sent':
        acc.active += 1;
        acc.activeValue += project.totalCost || 0;
        break;
      case 'accepted':
      case 'converted':
        acc.won += 1;
        acc.wonValue += project.totalCost || 0;
        break;
      case 'declined':
        acc.lost += 1;
        break;
      case 'expired':
        acc.expired += 1;
        break;
    }

    // Check for overdue follow-ups
    if (project.quotationData?.followUpDate) {
      const followUpDate = new Date(project.quotationData.followUpDate);
      if (isAfter(new Date(), followUpDate) && !['accepted', 'declined', 'converted'].includes(project.status)) {
        acc.overdue += 1;
      }
    }

    return acc;
  }, {
    total: 0,
    active: 0,
    won: 0,
    lost: 0,
    expired: 0,
    overdue: 0,
    totalValue: 0,
    activeValue: 0,
    wonValue: 0
  });

  const winRate = quotationMetrics.total > 0 ? (quotationMetrics.won / quotationMetrics.total * 100) : 0;
  const conversionRate = quotationMetrics.active > 0 ? (quotationMetrics.won / (quotationMetrics.won + quotationMetrics.lost) * 100) : 0;

  // Filter projects
  const filteredProjects = estimationProjects.filter((project) => {
    if (filterStatus !== 'all' && project.status !== filterStatus) return false;
    // Add priority filtering logic here when priority field is available
    return true;
  });

  // Update quotation status
  const updateQuotationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/estimations/${id}/quotation`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimations'] });
      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-4 w-4" />;
      case 'viewed': return <Eye className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <XCircle className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      case 'converted': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    return differenceInDays(new Date(expiryDate), new Date());
  };

  const getUrgencyLevel = (project: EstimationProject) => {
    const daysUntilExpiry = getDaysUntilExpiry(project.quotationData?.expiryDate);
    const followUpOverdue = project.quotationData?.followUpDate && 
      isAfter(new Date(), new Date(project.quotationData.followUpDate));

    if (followUpOverdue) return 'urgent';
    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) return 'high';
    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) return 'medium';
    return 'low';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Estimation Dashboard</h1>
          <p className="text-muted-foreground">Monitor quotations and track conversion performance</p>
        </div>
        <Button onClick={() => window.location.href = '/estimation'}>
          <Brain className="h-4 w-4 mr-2" />
          Create New Estimation
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotationMetrics.active}</div>
            <p className="text-xs text-muted-foreground">
              ${quotationMetrics.activeValue.toLocaleString()} in pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <Progress value={winRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Won</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${quotationMetrics.wonValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {quotationMetrics.won} accepted quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Follow-ups</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{quotationMetrics.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitor">Quotation Monitor</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          <TabsTrigger value="pipeline">Sales Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quotation List */}
          <div className="grid gap-4">
            {filteredProjects.map((project: EstimationProject) => {
              const urgency = getUrgencyLevel(project);
              const daysUntilExpiry = getDaysUntilExpiry(project.quotationData?.expiryDate);
              
              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(project.status)}
                          <div>
                            <h3 className="font-medium">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {project.client?.name || 'No client assigned'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">${project.totalCost?.toLocaleString() || 0}</div>
                          <div className="text-sm text-muted-foreground">
                            {project.margin ? `${project.margin}% margin` : 'No margin set'}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                            {project.status}
                          </Badge>
                          {urgency !== 'low' && (
                            <Badge className={priorityColors[urgency as keyof typeof priorityColors]}>
                              {urgency}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {project.client?.email && (
                            <Button size="sm" variant="outline">
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {project.client?.phone && (
                            <Button size="sm" variant="outline">
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedQuote(project);
                              setIsQuoteDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        {project.quotationData?.sentDate && (
                          <span>Sent: {format(new Date(project.quotationData.sentDate), 'MMM dd')}</span>
                        )}
                        {daysUntilExpiry !== null && (
                          <span className={daysUntilExpiry <= 3 ? 'text-red-600' : ''}>
                            {daysUntilExpiry > 0 ? `Expires in ${daysUntilExpiry} days` : 'Expired'}
                          </span>
                        )}
                        {project.quotationData?.probability && (
                          <span>{project.quotationData.probability}% probability</span>
                        )}
                      </div>
                      <span>Updated: {format(new Date(project.updatedAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Quotes</span>
                    <span className="font-medium">{quotationMetrics.total}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Sent to Clients</span>
                    <span className="font-medium">{quotationMetrics.active + quotationMetrics.won + quotationMetrics.lost}</span>
                  </div>
                  <Progress value={quotationMetrics.total > 0 ? ((quotationMetrics.active + quotationMetrics.won + quotationMetrics.lost) / quotationMetrics.total * 100) : 0} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Won</span>
                    <span className="font-medium text-green-600">{quotationMetrics.won}</span>
                  </div>
                  <Progress value={quotationMetrics.total > 0 ? (quotationMetrics.won / quotationMetrics.total * 100) : 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Win Rate</span>
                    <span className="font-medium">{winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Conversion Rate</span>
                    <span className="font-medium">{conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Quote Value</span>
                    <span className="font-medium">
                      ${quotationMetrics.total > 0 ? (quotationMetrics.totalValue / quotationMetrics.total).toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pipeline Value</span>
                    <span className="font-medium">${quotationMetrics.activeValue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Sales Pipeline Overview
              </CardTitle>
              <CardDescription>
                Track quotes through their lifecycle from creation to conversion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{quotationMetrics.active}</div>
                  <div className="text-sm text-muted-foreground">Active Quotes</div>
                  <div className="text-lg font-medium">${quotationMetrics.activeValue.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{quotationMetrics.won}</div>
                  <div className="text-sm text-muted-foreground">Won This Month</div>
                  <div className="text-lg font-medium">${quotationMetrics.wonValue.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{quotationMetrics.overdue}</div>
                  <div className="text-sm text-muted-foreground">Require Follow-up</div>
                  <div className="text-lg font-medium">Immediate Action</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quote Details Dialog */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quotation Details</DialogTitle>
            <DialogDescription>
              Update quotation status and follow-up information
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Project Name</Label>
                  <Input value={selectedQuote.name} readOnly />
                </div>
                <div>
                  <Label>Quote Value</Label>
                  <Input value={`$${selectedQuote.totalCost?.toLocaleString() || 0}`} readOnly />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select defaultValue={selectedQuote.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Probability (%)</Label>
                  <Input 
                    type="number" 
                    placeholder="50"
                    defaultValue={selectedQuote.quotationData?.probability} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Follow-up Date</Label>
                  <Input 
                    type="date" 
                    defaultValue={selectedQuote.quotationData?.followUpDate?.split('T')[0]} 
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input 
                    type="date" 
                    defaultValue={selectedQuote.quotationData?.expiryDate?.split('T')[0]} 
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Add notes about client interaction, requirements, or follow-up actions..."
                  defaultValue={selectedQuote.quotationData?.notes}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>Update Quotation</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}