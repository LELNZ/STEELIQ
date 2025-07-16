import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Clock, AlertCircle, DollarSign, Users, FileText, TrendingUp, Shield, CheckCircle2, Building2, Calculator, CreditCard, MapPin, Target, Milestone, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Fortune 500 standard form schema with Phase 1 enhancements
const projectFormSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  clientId: z.string().min(1, 'Client is required'),
  
  // Contract & Project Type (Phase 1 Enhancement)
  contractType: z.enum(['fixed_price', 'time_materials', 'cost_plus', 'unit_price', 'gmp']),
  projectType: z.enum(['new_construction', 'renovation', 'maintenance', 'emergency', 'design_build']),
  wbsCode: z.string().optional(),
  
  // Timeline & Commercial
  bidDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  targetValue: z.string().optional(),
  quoteValidity: z.string().default('30'),
  
  // Risk & Complexity
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  complexityScore: z.string().min(1).max(5),
  
  // Payment Terms (Phase 1 Enhancement)
  paymentTerms: z.enum(['net_30', 'net_60', 'net_90', 'progress_billing', 'milestone_based']),
  retentionPercentage: z.string().optional(),
  
  // Resource Planning
  estimatedHours: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  
  // Key Milestones (Phase 1 Enhancement)
  keyMilestones: z.array(z.object({
    name: z.string(),
    date: z.string(),
    percentage: z.string()
  })).optional()
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface EnhancedProjectFormProps {
  onSubmit: (data: ProjectFormValues) => void;
  initialData?: Partial<ProjectFormValues>;
  isLoading?: boolean;
}

// Quick Add Client Dialog Component
function QuickAddClientDialog({ onClientAdded }: { onClientAdded: (client: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Client added",
        description: "New client has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      onClientAdded(data);
      setOpen(false);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postcode: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client for this project
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quick-name">Client Name*</Label>
            <Input
              id="quick-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <Label htmlFor="quick-company">Company</Label>
            <Input
              id="quick-company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="ABC Construction Ltd"
            />
          </div>

          <div>
            <Label htmlFor="quick-email">Email</Label>
            <Input
              id="quick-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label htmlFor="quick-phone">Phone</Label>
            <Input
              id="quick-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+64 21 123 4567"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createClientMutation.isPending}>
              {createClientMutation.isPending ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EnhancedProjectForm({ onSubmit, initialData, isLoading }: EnhancedProjectFormProps) {
  const [completenessScore, setCompletenessScore] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({ queryKey: ['/api/clients'] });
  
  // Fetch project templates (Phase 1 Feature)
  const { data: templates = [] } = useQuery({ 
    queryKey: ['/api/estimation/templates'],
    enabled: false // Will implement in backend
  });

  // Define default values separately to track what's been changed
  const defaultValues = {
    name: '',
    description: '',
    clientId: '',
    contractType: 'fixed_price',
    projectType: 'new_construction',
    wbsCode: '',
    bidDate: '',
    deliveryDate: '',
    targetValue: '',
    quoteValidity: '30',
    riskLevel: 'medium',
    complexityScore: '3',
    paymentTerms: 'net_30',
    retentionPercentage: '10',
    estimatedHours: '',
    priority: 'medium',
    keyMilestones: [
      { name: 'Quote Acceptance', date: '', percentage: '0' },
      { name: 'Shop Drawings Approval', date: '', percentage: '20' },
      { name: 'Material Procurement', date: '', percentage: '30' },
      { name: 'Fabrication Complete', date: '', percentage: '70' },
      { name: 'Delivery & Installation', date: '', percentage: '90' },
      { name: 'Final Inspection', date: '', percentage: '100' }
    ],
    ...initialData
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues
  });

  // Generate WBS Code automatically
  const generateWBSCode = () => {
    const projectType = form.getValues('projectType');
    const clientId = form.getValues('clientId');
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get project type prefix
    const typePrefix = {
      'new_construction': 'NC',
      'renovation': 'RN',
      'maintenance': 'MN',
      'emergency': 'EM',
      'design_build': 'DB'
    }[projectType] || 'PRJ';
    
    // Generate sequential number based on timestamp
    const sequential = Date.now().toString().slice(-4);
    
    // Format: TYPE-YEAR-MONTH-SEQ (e.g., NC-2025-01-1234)
    const wbsCode = `${typePrefix}-${currentYear}-${currentMonth}-${sequential}`;
    
    form.setValue('wbsCode', wbsCode);
    toast({
      title: "WBS Code Generated",
      description: `Generated code: ${wbsCode}`,
    });
  };

  // Calculate form completeness (Phase 1 Feature)
  React.useEffect(() => {
    const values = form.watch();
    const fields = Object.keys(projectFormSchema.shape);
    
    // Only count fields that have been modified from their default values
    const filledFields = fields.filter(field => {
      const currentValue = values[field as keyof ProjectFormValues];
      const defaultValue = defaultValues[field as keyof ProjectFormValues];
      
      // Skip empty values
      if (!currentValue || currentValue === '') return false;
      
      // For arrays, check if they have meaningful content
      if (Array.isArray(currentValue)) {
        return currentValue.length > 0 && currentValue.some(item => 
          Object.values(item).some(val => val && val !== '')
        );
      }
      
      // For other fields, check if they've been changed from default
      return currentValue !== defaultValue;
    });
    
    // Only show score if user has started filling the form
    const score = filledFields.length > 0 ? Math.round((filledFields.length / fields.length) * 100) : 0;
    setCompletenessScore(score);
  }, [form.watch()]);

  // Add milestone
  const addMilestone = () => {
    const currentMilestones = form.getValues('keyMilestones') || [];
    form.setValue('keyMilestones', [
      ...currentMilestones,
      { name: '', date: '', percentage: '' }
    ]);
  };

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Create Estimation Project - Fortune 500 Standard
            </CardTitle>
            <CardDescription>
              Enhanced project creation with enterprise-grade features
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Completeness Score - Only show when user has started filling */}
            {completenessScore > 0 && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Form Completeness</div>
                <div className="flex items-center gap-2">
                  <Progress value={completenessScore} className="w-24" />
                  <span className="text-sm font-medium">{completenessScore}%</span>
                </div>
              </div>
            )}
            {/* Template Actions */}
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>
                      <FileText className="h-4 w-4 mr-1" />
                      Use Template
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Load project from saved template (Coming in Phase 2)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="commercial">Commercial</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="risk">Risk & Resources</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
              </TabsList>

              {/* Tab content container with fixed height */}
              <div className="min-h-[500px]">
                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Warehouse Extension - Phase 2" {...field} />
                        </FormControl>
                        <FormDescription>
                          Use a clear, descriptive name that includes location or phase
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wbsCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          WBS Code
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0">
                                  <AlertCircle className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md">
                                <div className="space-y-2">
                                  <p className="font-semibold">What is WBS (Work Breakdown Structure)?</p>
                                  <p>WBS is a hierarchical coding system used by Fortune 500 companies to organize and track projects. It breaks down complex projects into smaller, manageable components.</p>
                                  <p className="font-semibold">Who uses it?</p>
                                  <ul className="list-disc pl-4">
                                    <li>Project Managers - for organizing project tasks</li>
                                    <li>Finance Teams - for cost tracking and budgeting</li>
                                    <li>ERP Systems - for enterprise resource planning</li>
                                    <li>Management - for portfolio oversight</li>
                                  </ul>
                                  <p className="font-semibold">Example Structure:</p>
                                  <p className="font-mono text-sm">NC-2025-01-1234</p>
                                  <p className="text-sm">NC = New Construction<br/>2025 = Year<br/>01 = Month<br/>1234 = Sequential ID</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="e.g., PRJ-2025-001-STL" {...field} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={generateWBSCode}
                            disabled={!form.watch('projectType')}
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                        <FormDescription>
                          Auto-generate or enter custom WBS code for enterprise tracking
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed project scope, including steel tonnage, key structures, and special requirements..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include scope, deliverables, and any special requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client: any) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <QuickAddClientDialog onClientAdded={(client) => {
                            form.setValue('clientId', client.id.toString());
                          }} />
                        </div>
                        <FormDescription>
                          Select existing client or create new one
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new_construction">New Construction</SelectItem>
                            <SelectItem value="renovation">Renovation/Retrofit</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="emergency">Emergency Repair</SelectItem>
                            <SelectItem value="design_build">Design & Build</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Categorize for resource planning and risk assessment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Commercial Tab */}
              <TabsContent value="commercial" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contract type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed_price">Fixed Price (Lump Sum)</SelectItem>
                            <SelectItem value="time_materials">Time & Materials</SelectItem>
                            <SelectItem value="cost_plus">Cost Plus</SelectItem>
                            <SelectItem value="unit_price">Unit Price</SelectItem>
                            <SelectItem value="gmp">GMP (Guaranteed Maximum Price)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Contract structure affects risk and margin calculations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="net_30">Net 30 Days</SelectItem>
                            <SelectItem value="net_60">Net 60 Days</SelectItem>
                            <SelectItem value="net_90">Net 90 Days</SelectItem>
                            <SelectItem value="progress_billing">Progress Billing</SelectItem>
                            <SelectItem value="milestone_based">Milestone Based</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Standard payment schedule for invoicing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Value</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Expected project value for planning
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retentionPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retention %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Contract retention percentage
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quoteValidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quote Validity (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          How long the quote remains valid
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bidDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bid Submission Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          When the bid/tender needs to be submitted
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Delivery Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Expected project completion date
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Risk & Resources Tab */}
              <TabsContent value="risk" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-500">Low</Badge>
                                <span>Standard project, known scope</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-yellow-500">Medium</Badge>
                                <span>Some unknowns, moderate complexity</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-orange-500">High</Badge>
                                <span>Complex scope, tight timeline</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="critical">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-500">Critical</Badge>
                                <span>High stakes, multiple unknowns</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Overall project risk assessment for margin adjustment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complexityScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complexity Score (1-5)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            placeholder="3"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Technical complexity: 1=Simple, 5=Highly Complex
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Hours</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Total estimated labor hours for the project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low - Flexible timeline</SelectItem>
                            <SelectItem value="medium">Medium - Standard delivery</SelectItem>
                            <SelectItem value="high">High - Expedited delivery</SelectItem>
                            <SelectItem value="critical">Critical - Top priority</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Resource allocation priority
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="space-y-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Key Project Milestones</h3>
                    <p className="text-sm text-muted-foreground">
                      Define major milestones for progress tracking and payment schedules
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                    <Milestone className="h-4 w-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>

                <div className="space-y-4">
                  {(form.watch('keyMilestones') || []).map((_, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`keyMilestones.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Milestone Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Foundation Complete" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`keyMilestones.${index}.date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`keyMilestones.${index}.percentage`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Progress %</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="25" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              </div>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                All fields marked with red asterisk are required
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline">
                  Save as Draft
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}