import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calculator, 
  Zap, 
  FileText, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Bot,
  Package,
  Truck,
  Users,
  Settings,
  Download,
  Send,
  Save,
  Plus,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MaterialsTab } from "@/components/estimation/materials-tab";
import PdfAnalysisTab from "@/components/estimation/pdf-analysis-tab";

// Types for estimation system
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

interface MaterialCost {
  id: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  wasteFactor: number;
  handlingTime: number;
  handlingCost: number;
}

interface LaborCost {
  id: string;
  category: 'workshop' | 'onsite' | 'subcontractor';
  type: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
}

interface EquipmentCost {
  id: string;
  equipment: string;
  type: 'inhouse' | 'rental';
  duration: number;
  unit: 'hours' | 'days';
  rate: number;
  totalCost: number;
}

interface ConsumableCost {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

interface EstimationData {
  project: EstimationProject;
  materials: MaterialCost[];
  labor: LaborCost[];
  equipment: EquipmentCost[];
  consumables: ConsumableCost[];
  overheads: {
    percentage: number;
    amount: number;
  };
  margin: {
    percentage: number;
    amount: number;
  };
  totals: {
    materials: number;
    labor: number;
    equipment: number;
    consumables: number;
    subtotal: number;
    overheads: number;
    margin: number;
    total: number;
  };
}

export default function EstimationPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [currentProject, setCurrentProject] = useState<EstimationProject | null>(null);
  const [estimationData, setEstimationData] = useState<EstimationData | null>(null);
  const [isAiAssistEnabled, setIsAiAssistEnabled] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing estimation projects with demo project
  const { data: projects = [] } = useQuery<EstimationProject[]>({
    queryKey: ["/api/estimations"],
    placeholderData: [{
      id: 1,
      name: "Commercial Warehouse Steel Frame",
      description: "40m x 20m warehouse with 8m ceiling height for Stryde Construction",
      clientId: 12,
      clientName: "Stryde Construction",
      status: 'in_progress' as const,
      totalCost: 53303,
      margin: 20,
      deliveryDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    }]
  });

  // Fetch materials for AI assistance
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
  });

  // Fetch clients for project assignment
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  // AI-assisted cost estimation mutation
  const aiEstimateMutation = useMutation({
    mutationFn: async (projectData: any) => {
      return await apiRequest("POST", "/api/ai/estimate", projectData);
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions || []);
      toast({
        title: "AI Analysis Complete",
        description: "Smart cost recommendations generated based on historical data",
      });
    },
    onError: (error) => {
      toast({
        title: "AI Analysis Failed",
        description: "Using standard estimation templates",
        variant: "destructive",
      });
    }
  });

  // Create new estimation project
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: Partial<EstimationProject>) => {
      return await apiRequest("POST", "/api/estimations", projectData);
    },
    onSuccess: (data) => {
      setCurrentProject(data);
      initializeEstimationData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/estimations"] });
      toast({
        title: "Project Created",
        description: "Estimation project created successfully",
      });
    }
  });

  // Initialize estimation data structure with demonstration data
  const initializeEstimationData = (project: EstimationProject) => {
    const demoMaterials = [
      {
        id: 'B1',
        materialCode: '310UB40.4',
        materialName: 'Universal Beam 310UB40.4',
        quantity: 8,
        unitCost: 850,
        totalCost: 6800,
        wasteFactor: 0.05,
        handlingTime: 2,
        handlingCost: 170
      },
      {
        id: 'C1', 
        materialCode: '200UC52.2',
        materialName: 'Universal Column 200UC52.2',
        quantity: 16,
        unitCost: 720,
        totalCost: 11520,
        wasteFactor: 0.03,
        handlingTime: 1.5,
        handlingCost: 240
      },
      {
        id: 'P1',
        materialCode: '150PFC',
        materialName: 'Parallel Flange Channel 150PFC',
        quantity: 24,
        unitCost: 95,
        totalCost: 2280,
        wasteFactor: 0.08,
        handlingTime: 0.5,
        handlingCost: 120
      }
    ];

    const demoLabor = [
      {
        id: 'FAB1',
        category: 'workshop' as const,
        type: 'Structural Fabrication',
        description: 'Main frame assembly and welding',
        hours: 120,
        hourlyRate: 85,
        totalCost: 10200
      },
      {
        id: 'INST1',
        category: 'onsite' as const,
        type: 'Installation',
        description: 'Steel erection and final connections',
        hours: 60,
        hourlyRate: 95,
        totalCost: 5700
      }
    ];

    setEstimationData({
      project,
      materials: demoMaterials,
      labor: demoLabor,
      equipment: [],
      consumables: [],
      overheads: { percentage: 15, amount: 0 },
      margin: { percentage: 20, amount: 0 },
      totals: {
        materials: 0,
        labor: 0,
        equipment: 0,
        consumables: 0,
        subtotal: 0,
        overheads: 0,
        margin: 0,
        total: 0
      }
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!estimationData) return;

    const materialsTotal = estimationData.materials.reduce((sum, item) => sum + item.totalCost, 0);
    const laborTotal = estimationData.labor.reduce((sum, item) => sum + item.totalCost, 0);
    const equipmentTotal = estimationData.equipment.reduce((sum, item) => sum + item.totalCost, 0);
    const consumablesTotal = estimationData.consumables.reduce((sum, item) => sum + item.totalCost, 0);
    
    const subtotal = materialsTotal + laborTotal + equipmentTotal + consumablesTotal;
    const overheadsAmount = subtotal * (estimationData.overheads.percentage / 100);
    const marginAmount = (subtotal + overheadsAmount) * (estimationData.margin.percentage / 100);
    const total = subtotal + overheadsAmount + marginAmount;

    setEstimationData(prev => prev ? {
      ...prev,
      totals: {
        materials: materialsTotal,
        labor: laborTotal,
        equipment: equipmentTotal,
        consumables: consumablesTotal,
        subtotal,
        overheads: overheadsAmount,
        margin: marginAmount,
        total
      }
    } : null);
  };

  // Recalculate totals when data changes
  useEffect(() => {
    calculateTotals();
  }, [estimationData?.materials, estimationData?.labor, estimationData?.equipment, estimationData?.consumables]);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI-Assisted Estimation Engine</h2>
          <p className="text-muted-foreground">
            Professional steel fabrication cost estimation with intelligent recommendations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isAiAssistEnabled ? "default" : "secondary"} className="px-3 py-1">
            <Bot className="h-4 w-4 mr-1" />
            AI {isAiAssistEnabled ? "Enabled" : "Disabled"}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Estimation Project</DialogTitle>
              </DialogHeader>
              <NewProjectForm onSubmit={(data) => createProjectMutation.mutate(data)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {currentProject ? (
        <EstimationWorkspace 
          project={currentProject}
          estimationData={estimationData}
          setEstimationData={setEstimationData}
          materials={materials}
          aiSuggestions={aiSuggestions}
          isAiAssistEnabled={isAiAssistEnabled}
        />
      ) : (
        <ProjectOverview 
          projects={projects} 
          onSelectProject={setCurrentProject}
        />
      )}
    </div>
  );
}

// New Project Form Component
function NewProjectForm({ onSubmit }: { onSubmit: (data: Partial<EstimationProject>) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    deliveryDate: ""
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
      status: 'draft',
      totalCost: 0,
      margin: 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter project name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the project requirements"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="clientId">Client</Label>
        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select client (optional)" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client: any) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="deliveryDate">Target Delivery Date</Label>
        <Input
          id="deliveryDate"
          type="date"
          value={formData.deliveryDate}
          onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
}

// Project Overview Component
function ProjectOverview({ 
  projects, 
  onSelectProject 
}: { 
  projects: EstimationProject[]; 
  onSelectProject: (project: EstimationProject) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <Badge variant={
                project.status === 'completed' ? 'default' :
                project.status === 'in_progress' ? 'secondary' :
                project.status === 'sent' ? 'outline' : 'destructive'
              }>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                ${project.totalCost.toLocaleString()}
              </div>
              <Button onClick={() => onSelectProject(project)} size="sm">
                Open
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Estimation Workspace Component
function EstimationWorkspace({ 
  project, 
  estimationData, 
  setEstimationData,
  materials,
  aiSuggestions,
  isAiAssistEnabled
}: {
  project: EstimationProject;
  estimationData: EstimationData | null;
  setEstimationData: (data: EstimationData | null) => void;
  materials: any[];
  aiSuggestions: string[];
  isAiAssistEnabled: boolean;
}) {
  const [activeTab, setActiveTab] = useState("materials");

  if (!estimationData) return null;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{project.name}</CardTitle>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${estimationData.totals.total.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Estimate</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Suggestions */}
      {isAiAssistEnabled && aiSuggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Bot className="h-5 w-5 mr-2" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiSuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <AlertCircle className="h-4 w-4 mt-0.5 mr-2 text-blue-600" />
                  <span className="text-sm text-blue-800">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Main Estimation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="drawings" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Drawings
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="labor" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Labor
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="consumables" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Consumables
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="quote" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quote
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drawings">
          <PdfAnalysisTab 
            projectId={project.id || 0}
            onElementsExtracted={(elements) => {
              // Convert extracted elements to materials
              const newMaterials = elements.map(el => ({
                id: `ai-${el.partMark}`,
                materialId: null,
                materialCode: el.material,
                materialName: el.material,
                quantity: el.quantity,
                unit: "m",
                unitCost: 0,
                totalCost: 0,
                wasteFactor: 0.05,
                handlingTime: 0,
                handlingCost: 0,
                handlingCategory: "manual",
                aiSuggested: true,
                elementIds: [el.partMark]
              }));
              setEstimationData(prev => prev ? { 
                ...prev, 
                materials: [...prev.materials, ...newMaterials] 
              } : null);
            }}
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab 
            materials={estimationData.materials}
            availableMaterials={materials}
            onUpdate={(materials) => setEstimationData(prev => prev ? { ...prev, materials } : null)}
          />
        </TabsContent>

        <TabsContent value="labor">
          <LaborTab 
            labor={estimationData.labor}
            onUpdate={(labor) => setEstimationData(prev => prev ? { ...prev, labor } : null)}
          />
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentTab 
            equipment={estimationData.equipment}
            onUpdate={(equipment) => setEstimationData(prev => prev ? { ...prev, equipment } : null)}
          />
        </TabsContent>

        <TabsContent value="consumables">
          <ConsumablesTab 
            consumables={estimationData.consumables}
            onUpdate={(consumables) => setEstimationData(prev => prev ? { ...prev, consumables } : null)}
          />
        </TabsContent>

        <TabsContent value="summary">
          <SummaryTab estimationData={estimationData} />
        </TabsContent>

        <TabsContent value="quote">
          <QuoteTab project={project} estimationData={estimationData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}



// Labor estimation tab with industry-standard rates
function LaborTab({ labor, onUpdate }: { labor: LaborCost[]; onUpdate: (labor: LaborCost[]) => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Labor Cost Estimation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Comprehensive labor estimation coming next</p>
            <p className="text-sm">Workshop, onsite, and subcontractor labor rates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Equipment rental and usage estimation
function EquipmentTab({ equipment, onUpdate }: { equipment: EquipmentCost[]; onUpdate: (equipment: EquipmentCost[]) => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipment Cost Estimation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Equipment rental and usage estimation coming next</p>
            <p className="text-sm">Inhouse and rental equipment with operator costs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Consumables estimation with category management
function ConsumablesTab({ consumables, onUpdate }: { consumables: ConsumableCost[]; onUpdate: (consumables: ConsumableCost[]) => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Consumables Cost Estimation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Consumables estimation coming next</p>
            <p className="text-sm">Welding rods, cutting discs, fasteners, and more</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Comprehensive cost summary with breakdown
function SummaryTab({ estimationData }: { estimationData: EstimationData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materials Total</p>
                <p className="text-2xl font-bold">${estimationData.totals.materials.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Labor Total</p>
                <p className="text-2xl font-bold">${estimationData.totals.labor.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Equipment Total</p>
                <p className="text-2xl font-bold">${estimationData.totals.equipment.toLocaleString()}</p>
              </div>
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consumables Total</p>
                <p className="text-2xl font-bold">${estimationData.totals.consumables.toLocaleString()}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overheads ({estimationData.overheads.percentage}%)</p>
                <p className="text-2xl font-bold">${estimationData.totals.overheads.toLocaleString()}</p>
              </div>
              <Calculator className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Final Total</p>
                <p className="text-3xl font-bold text-primary">${estimationData.totals.total.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Subtotal (before overheads & margin)</span>
              <span className="font-semibold">${estimationData.totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Overheads ({estimationData.overheads.percentage}%)</span>
              <span className="font-semibold">${estimationData.totals.overheads.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Margin ({estimationData.margin.percentage}%)</span>
              <span className="font-semibold">${estimationData.totals.margin.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-lg font-bold border-t-2">
              <span>Total Project Cost</span>
              <span>${estimationData.totals.total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Professional quote generation and export
function QuoteTab({ project, estimationData }: { project: EstimationProject; estimationData: EstimationData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Professional Quote Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Professional quote generation coming next</p>
            <p className="text-sm">PDF export, email delivery, and client presentation tools</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}