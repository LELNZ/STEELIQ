import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Info, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EstimationProject {
  id?: number;
  name: string;
  description: string;
  clientId?: number;
  clientName?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'sent' | 'accepted' | 'declined';
  totalCost: number;
  margin: number;
  deliveryDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
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
    postcode: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      onClientAdded(newClient);
      setOpen(false);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postcode: "",
      });
      toast({
        title: "Success",
        description: "Client added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add client",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <UserPlus className="h-4 w-4 mr-1" />
          Quick Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-name">Client Name*</Label>
              <Input
                id="quick-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client or Company Name"
                required
              />
            </div>
            <div>
              <Label htmlFor="quick-company">Company</Label>
              <Input
                id="quick-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company Name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-email">Email</Label>
              <Input
                id="quick-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@company.com"
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
          </div>

          <div>
            <Label htmlFor="quick-address">Address</Label>
            <Input
              id="quick-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-city">City</Label>
              <Input
                id="quick-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Auckland"
              />
            </div>
            <div>
              <Label htmlFor="quick-postcode">Postcode</Label>
              <Input
                id="quick-postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="1010"
              />
            </div>
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

export function NewProjectFormTabbed({ onSubmit, clients = [] }: { 
  onSubmit: (data: Partial<EstimationProject>) => void;
  clients?: any[];
}) {
  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    projectNumber: "",
    description: "",
    clientId: "",
    projectType: "rfq", // rfq, tender, budget, direct_award
    
    // Financial Controls
    margin: "20",
    targetValue: "",
    approvalRequired: false,
    
    // Timeline
    bidDueDate: "",
    deliveryDate: "",
    validityDays: "30",
    
    // Risk Assessment
    riskLevel: "medium", // low, medium, high, critical
    complexityScore: "3", // 1-5 scale
    
    // Documentation
    hasDrawings: false,
    requiresEngineering: false,
    requiresCompliance: false,
    
    // Resource Planning
    estimatedHours: "",
    requiredSkills: [] as string[],
    priority: "normal", // low, normal, high, urgent
    
    // Approval Workflow
    approvalLevel: "single", // single, dual, multi, board
    approvalThreshold: "50000", // Dollar amount requiring approval
    autoEscalate: true,
    approverRoles: [] as string[],
    
    // Document Management
    documentControl: true,
    versionControl: true,
    changeTracking: true,
    documentRetention: "7", // years
    
    // KPI Tracking
    kpiTracking: true,
    targetGrossMargin: "25",
    targetCompletionRate: "95",
    targetQualityScore: "98",
    targetSafetyIncidents: "0",
    
    // Budget Monitoring
    budgetVarianceAlert: "5", // percentage
    costReviewFrequency: "weekly", // daily, weekly, monthly
    requireCostBreakdown: true,
    trackChangeOrders: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate smart defaults based on project type
    const baseMargin = parseInt(formData.margin);
    const complexityMultiplier = parseInt(formData.complexityScore) / 3;
    const adjustedMargin = Math.round(baseMargin * complexityMultiplier);
    
    onSubmit({
      name: formData.name,
      description: formData.description,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      margin: adjustedMargin,
      status: 'draft' as const,
      totalCost: 0,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
      projectData: {
        // Basic Information
        projectNumber: formData.projectNumber,
        projectType: formData.projectType,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
        bidDueDate: formData.bidDueDate,
        validityDays: parseInt(formData.validityDays),
        riskLevel: formData.riskLevel,
        complexityScore: parseInt(formData.complexityScore),
        hasDrawings: formData.hasDrawings,
        requiresEngineering: formData.requiresEngineering,
        requiresCompliance: formData.requiresCompliance,
        requiredSkills: formData.requiredSkills,
        priority: formData.priority,
        
        // Approval Workflow
        approvalLevel: formData.approvalLevel,
        approvalThreshold: parseFloat(formData.approvalThreshold),
        autoEscalate: formData.autoEscalate,
        approverRoles: formData.approverRoles,
        
        // Document Management
        documentControl: formData.documentControl,
        versionControl: formData.versionControl,
        changeTracking: formData.changeTracking,
        documentRetention: parseInt(formData.documentRetention),
        
        // KPI Tracking
        kpiTracking: formData.kpiTracking,
        targetGrossMargin: parseFloat(formData.targetGrossMargin),
        targetCompletionRate: parseFloat(formData.targetCompletionRate),
        targetQualityScore: parseFloat(formData.targetQualityScore),
        targetSafetyIncidents: parseInt(formData.targetSafetyIncidents),
        
        // Budget Monitoring
        budgetVarianceAlert: parseFloat(formData.budgetVarianceAlert),
        costReviewFrequency: formData.costReviewFrequency,
        requireCostBreakdown: formData.requireCostBreakdown,
        trackChangeOrders: formData.trackChangeOrders
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="project-details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="project-details">Project Details</TabsTrigger>
          <TabsTrigger value="risk-resources">Risk & Resources</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise Features</TabsTrigger>
        </TabsList>
        
        {/* Project Details Tab */}
        <TabsContent value="project-details" className="space-y-6">
          {/* Project Identification Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">PROJECT IDENTIFICATION</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Basic project identification details. These fields establish project tracking, client relationships, and type categorization for reporting and workflow routing.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="name">Project Name*</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Descriptive name for internal reference. Use client name + location/project type (e.g., "ABC Corp - Warehouse Extension").</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ABC Corp - Warehouse Extension"
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="projectNumber">Project Number</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Optional internal tracking number. Leave blank for auto-generation using format: EST-YYYY-XXX.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="projectNumber"
                  value={formData.projectNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                  placeholder="Auto-generated if blank"
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="projectType">Project Type</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm font-semibold mb-1">Project Types:</p>
                      <ul className="text-sm space-y-1">
                        <li>• RFQ: Request for quotation</li>
                        <li>• Tender: Formal bid submission</li>
                        <li>• Budget: Preliminary estimate</li>
                        <li>• Direct Award: Pre-approved work</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select 
                value={formData.projectType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rfq">RFQ - Request for Quote</SelectItem>
                  <SelectItem value="tender">Tender - Formal Bid</SelectItem>
                  <SelectItem value="budget">Budget Estimate</SelectItem>
                  <SelectItem value="direct_award">Direct Award</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="clientId">Client</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Select existing client or create new client profile. Links to contract terms, payment history, and communication preferences.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <QuickAddClientDialog 
                  onClientAdded={(newClient) => {
                    setFormData(prev => ({ ...prev, clientId: newClient.id.toString() }));
                  }} 
                />
              </div>
              <Select 
                value={formData.clientId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} {client.company && `(${client.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="description">Description</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Brief project scope description. Include key deliverables, location, and special requirements. This appears on quotes and reports.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Supply and install structural steel for 1000m² warehouse extension including mezzanine floor"
                className="h-20"
              />
            </div>
          </div>

          {/* Timeline & Commercial Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">TIMELINE & COMMERCIAL</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Critical dates and commercial parameters. These drive scheduling, resource allocation, and pricing strategies.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="bidDueDate">Bid Due Date</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Quote submission deadline. System sends reminders 48 and 24 hours before due date.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="bidDueDate"
                  type="date"
                  value={formData.bidDueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, bidDueDate: e.target.value }))}
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="deliveryDate">Delivery Date</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Project completion deadline. Used for backwards scheduling and resource planning.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="targetValue">Target Value ($)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Expected project value for pipeline reporting. Helps prioritize estimation effort and resource allocation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="targetValue"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="margin">Target Margin (%)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Initial margin target. System adjusts based on complexity and risk factors. Industry standard: 15-25%.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="margin"
                  type="number"
                  value={formData.margin}
                  onChange={(e) => setFormData(prev => ({ ...prev, margin: e.target.value }))}
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="validityDays">Quote Validity (days)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">How long the quote remains valid. Standard 30 days. Shorter for volatile material prices.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="validityDays"
                  type="number"
                  value={formData.validityDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, validityDays: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Risk & Resources Tab */}
        <TabsContent value="risk-resources" className="space-y-6">
          {/* Risk & Complexity Assessment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">RISK & COMPLEXITY</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Assess project risks and complexity to determine appropriate margins, resource allocation, and approval requirements. Higher risk projects require additional contingencies.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm font-semibold mb-1">Risk Categories:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Low: Standard designs, repeat clients</li>
                          <li>• Medium: Custom work, new techniques</li>
                          <li>• High: Complex engineering, tight deadlines</li>
                          <li>• Critical: Safety-critical, regulatory compliance</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select 
                  value={formData.riskLevel} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, riskLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Standard work</SelectItem>
                    <SelectItem value="medium">Medium - Some complexity</SelectItem>
                    <SelectItem value="high">High - Complex requirements</SelectItem>
                    <SelectItem value="critical">Critical - Major project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="complexityScore">Complexity Score (1-5)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Technical complexity rating. Affects resource allocation, timeline padding, and margin calculations. Score 3+ requires senior team involvement.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select 
                  value={formData.complexityScore} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, complexityScore: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Very Simple</SelectItem>
                    <SelectItem value="2">2 - Simple</SelectItem>
                    <SelectItem value="3">3 - Moderate</SelectItem>
                    <SelectItem value="4">4 - Complex</SelectItem>
                    <SelectItem value="5">5 - Very Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Project Requirements</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Document availability and compliance requirements affect project timeline, costs, and approval processes.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasDrawings"
                  checked={formData.hasDrawings}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasDrawings: checked }))}
                />
                <Label htmlFor="hasDrawings" className="font-normal cursor-pointer">
                  Technical drawings available
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline-block h-3 w-3 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">CAD files, PDF drawings, or sketches. Reduces estimation time by 30%.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresEngineering"
                  checked={formData.requiresEngineering}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresEngineering: checked }))}
                />
                <Label htmlFor="requiresEngineering" className="font-normal cursor-pointer">
                  Requires engineering review
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline-block h-3 w-3 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Structural calculations, PE stamps, or design verification needed.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresCompliance"
                  checked={formData.requiresCompliance}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresCompliance: checked }))}
                />
                <Label htmlFor="requiresCompliance" className="font-normal cursor-pointer">
                  Compliance documentation required
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline-block h-3 w-3 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">AS/NZS standards, building codes, or safety compliance documentation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
            </div>
          </div>

          {/* Resource Planning */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">RESOURCE PLANNING</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Resource allocation and scheduling parameters. These values drive workforce planning, equipment booking, and project timeline calculations.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Total labor hours estimate. Used for scheduling, cost calculations, and resource allocation. Include all phases: fabrication, finishing, installation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm font-semibold mb-1">Priority Levels:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Low: Flexible timeline</li>
                          <li>• Normal: Standard scheduling</li>
                          <li>• High: Expedited processing</li>
                          <li>• Urgent: Immediate attention required</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Enterprise Features Tab */}
        <TabsContent value="enterprise" className="space-y-6">
          {/* Approval Workflow */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">APPROVAL WORKFLOW</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Configure multi-level approval chains based on project value and risk. Automatically routes to appropriate managers, directors, or board members based on thresholds.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="approvalLevel">Approval Level</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm font-semibold mb-1">Approval Levels:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Single: One manager approval</li>
                          <li>• Dual: Manager + Director</li>
                          <li>• Multi: Full management chain</li>
                          <li>• Board: Requires board approval</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select 
                  value={formData.approvalLevel} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, approvalLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Approval</SelectItem>
                    <SelectItem value="dual">Dual Approval</SelectItem>
                    <SelectItem value="multi">Multi-Level Approval</SelectItem>
                    <SelectItem value="board">Board Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="approvalThreshold">Threshold Amount ($)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Dollar value requiring approval. Standard thresholds: Manager $50k, Director $250k, Board $1M+.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="approvalThreshold"
                  type="number"
                  value={formData.approvalThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, approvalThreshold: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="autoEscalate"
                checked={formData.autoEscalate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoEscalate: checked }))}
              />
              <Label htmlFor="autoEscalate" className="font-normal cursor-pointer">
                Auto-escalate if no response within 48 hours
              </Label>
            </div>
          </div>

          {/* Document Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">DOCUMENT MANAGEMENT</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Enterprise document control features for ISO 9001:2015 compliance. Ensures proper version control, change tracking, and retention policies.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="documentControl"
                  checked={formData.documentControl}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, documentControl: checked }))}
                />
                <Label htmlFor="documentControl" className="font-normal cursor-pointer">
                  Enable document control (unique doc numbers, access logs)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="versionControl"
                  checked={formData.versionControl}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, versionControl: checked }))}
                />
                <Label htmlFor="versionControl" className="font-normal cursor-pointer">
                  Version control with revision history
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="changeTracking"
                  checked={formData.changeTracking}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, changeTracking: checked }))}
                />
                <Label htmlFor="changeTracking" className="font-normal cursor-pointer">
                  Track all changes with user attribution
                </Label>
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="documentRetention">Document Retention (years)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Legal retention period. Standard: 7 years for contracts, 10 years for safety-critical projects.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select 
                value={formData.documentRetention} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, documentRetention: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 years</SelectItem>
                  <SelectItem value="5">5 years</SelectItem>
                  <SelectItem value="7">7 years (standard)</SelectItem>
                  <SelectItem value="10">10 years (safety-critical)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Tracking */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">KPI TRACKING</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Set performance targets and track against industry benchmarks. Automated alerts when KPIs fall below thresholds.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="kpiTracking"
                checked={formData.kpiTracking}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, kpiTracking: checked }))}
              />
              <Label htmlFor="kpiTracking" className="font-normal cursor-pointer">
                Enable KPI tracking and reporting
              </Label>
            </div>
            
            {formData.kpiTracking && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="targetGrossMargin">Target Gross Margin (%)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Industry benchmark: 20-30% for fabrication projects.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="targetGrossMargin"
                    type="number"
                    value={formData.targetGrossMargin}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetGrossMargin: e.target.value }))}
                  />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="targetCompletionRate">On-Time Completion (%)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Target for projects completed by promised date. Industry standard: 95%+.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="targetCompletionRate"
                    type="number"
                    value={formData.targetCompletionRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetCompletionRate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="targetQualityScore">Quality Score (%)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">First-pass quality rate without rework. Target: 98%+ for premium fabrication.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="targetQualityScore"
                    type="number"
                    value={formData.targetQualityScore}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetQualityScore: e.target.value }))}
                  />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="targetSafetyIncidents">Safety Incidents Target</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Maximum acceptable safety incidents. Industry best practice: Zero harm target.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="targetSafetyIncidents"
                    type="number"
                    value={formData.targetSafetyIncidents}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetSafetyIncidents: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget Monitoring */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">BUDGET MONITORING</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Real-time budget tracking with variance alerts. Proactive management of cost overruns and change orders.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="budgetVarianceAlert">Budget Variance Alert (%)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Alert threshold when costs exceed budget. Standard: 5% for early warning, 10% for escalation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="budgetVarianceAlert"
                  type="number"
                  value={formData.budgetVarianceAlert}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetVarianceAlert: e.target.value }))}
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="costReviewFrequency">Cost Review Frequency</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">How often to review actual vs. budgeted costs. Higher frequency for critical projects.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select 
                  value={formData.costReviewFrequency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, costReviewFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="requireCostBreakdown"
                  checked={formData.requireCostBreakdown}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireCostBreakdown: checked }))}
                />
                <Label htmlFor="requireCostBreakdown" className="font-normal cursor-pointer">
                  Require detailed cost breakdown for all expenses
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="trackChangeOrders"
                  checked={formData.trackChangeOrders}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, trackChangeOrders: checked }))}
                />
                <Label htmlFor="trackChangeOrders" className="font-normal cursor-pointer">
                  Track and approve all change orders separately
                </Label>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="submit">
          Create Project
        </Button>
      </div>
    </form>
  );
}