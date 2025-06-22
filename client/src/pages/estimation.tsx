import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Calculator, 
  Zap, 
  FileText, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Bot,
  Package,
  Trash2,
  Truck,
  Users,
  Settings,
  Download,
  Send,
  Save,
  Plus,
  AlertCircle,
  ArrowLeft,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MaterialsTab } from "@/components/estimation/materials-tab-clean";
import PdfAnalysisTab from "@/components/estimation/pdf-analysis-tab";
import { EnhancedLaborTab } from "@/components/estimation/enhanced-labor-tab";

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
  subcategory: string;
  description: string;
  hours: number;
  rate: number;
  totalCost: number;
  location: 'workshop' | 'site';
  skillLevel: 'apprentice' | 'standard' | 'senior' | 'specialist';
  notes?: string;
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

  // Fetch existing estimation projects
  const { data: projects = [] } = useQuery<EstimationProject[]>({
    queryKey: ["/api/estimations"],
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
        subcategory: 'fabrication',
        description: 'Main frame assembly and welding',
        hours: 120,
        rate: 85,
        totalCost: 10200,
        location: 'workshop' as const,
        skillLevel: 'standard' as const,
        notes: 'Primary structural welding and assembly'
      },
      {
        id: 'INST1',
        category: 'onsite' as const,
        subcategory: 'erection',
        description: 'Steel erection and final connections',
        hours: 60,
        rate: 95,
        totalCost: 5700,
        location: 'site' as const,
        skillLevel: 'senior' as const,
        notes: 'Site installation with crane operations'
      }
    ];

    setEstimationData({
      project,
      materials: demoMaterials,
      labor: demoLabor,
      equipment: [
        {
          id: 'CRANE1',
          equipment: '25T Mobile Crane',
          type: 'rental' as const,
          duration: 2,
          unit: 'days' as const,
          rate: 1200,
          totalCost: 2400
        },
        {
          id: 'WELD1',
          equipment: 'MIG Welding Machine',
          type: 'inhouse' as const,
          duration: 180,
          unit: 'hours' as const,
          rate: 15,
          totalCost: 2700
        },
        {
          id: 'FORGE1',
          equipment: 'Forklift 3T',
          type: 'inhouse' as const,
          duration: 3,
          unit: 'days' as const,
          rate: 150,
          totalCost: 450
        }
      ],
      consumables: [
        {
          id: 'ELEC1',
          item: 'Welding Electrodes 3.2mm',
          quantity: 25,
          unit: 'kg',
          unitCost: 12.50,
          totalCost: 312.50
        },
        {
          id: 'GAS1',
          item: 'Argon Gas Cylinder',
          quantity: 2,
          unit: 'cylinders',
          unitCost: 180,
          totalCost: 360
        },
        {
          id: 'PAINT1',
          item: 'Primer Paint',
          quantity: 15,
          unit: 'litres',
          unitCost: 45,
          totalCost: 675
        }
      ],
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
          onBack={() => setCurrentProject(null)}
        />
      ) : (
        <ProjectOverview 
          projects={projects} 
          onSelectProject={(project) => {
            setCurrentProject(project);
            initializeEstimationData(project);
          }}
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
  isAiAssistEnabled,
  onBack
}: {
  project: EstimationProject;
  estimationData: EstimationData | null;
  setEstimationData: (data: EstimationData | null) => void;
  materials: any[];
  aiSuggestions: string[];
  isAiAssistEnabled: boolean;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState("materials");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const originalDataRef = useRef<EstimationData | null>(null);
  const { toast } = useToast();

  // Store original data on mount to track changes
  useEffect(() => {
    if (estimationData && !originalDataRef.current) {
      originalDataRef.current = JSON.parse(JSON.stringify(estimationData));
    }
  }, [estimationData]);

  // Track changes in estimation data
  useEffect(() => {
    if (originalDataRef.current && estimationData) {
      const hasChanges = JSON.stringify(originalDataRef.current) !== JSON.stringify(estimationData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [estimationData]);

  // Prevent browser navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save estimation data
  const saveEstimationMutation = useMutation({
    mutationFn: async (data: EstimationData) => {
      const response = await apiRequest("PUT", `/api/estimations/${project.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      originalDataRef.current = JSON.parse(JSON.stringify(estimationData));
      toast({
        title: "Changes Saved",
        description: "All estimation data has been saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle navigation with unsaved changes
  const handleNavigation = (navigationFn: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navigationFn);
      setShowSaveDialog(true);
    } else {
      navigationFn();
    }
  };

  // Save and continue navigation
  const handleSaveAndContinue = async () => {
    if (estimationData) {
      await saveEstimationMutation.mutateAsync(estimationData);
      setShowSaveDialog(false);
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
    }
  };

  // Continue without saving
  const handleContinueWithoutSaving = () => {
    setShowSaveDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  // Cancel navigation
  const handleCancelNavigation = () => {
    setShowSaveDialog(false);
    setPendingNavigation(null);
  };

  if (!estimationData) return null;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => handleNavigation(onBack)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="animate-pulse">
                  Unsaved Changes
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => estimationData && saveEstimationMutation.mutate(estimationData)}
                disabled={!hasUnsavedChanges || saveEstimationMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveEstimationMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <p className="text-muted-foreground">{project.description}</p>
              </div>
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
          <EnhancedLaborTab 
            labor={estimationData.labor as any}
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

      {/* Save Changes Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Save Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this estimation. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={handleCancelNavigation}>
              Cancel
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={handleContinueWithoutSaving}
            >
              Don't Save
            </Button>
            <AlertDialogAction 
              onClick={handleSaveAndContinue}
              disabled={saveEstimationMutation.isPending}
            >
              {saveEstimationMutation.isPending ? "Saving..." : "Save & Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



// Labor estimation tab with industry-standard rates
function LaborTab({ labor, onUpdate }: { labor: LaborCost[]; onUpdate: (labor: LaborCost[]) => void }) {
  const totalLaborCost = labor.reduce((sum, item) => sum + item.totalCost, 0);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Labor Cost Breakdown</CardTitle>
            <div className="text-2xl font-bold">${totalLaborCost.toLocaleString()}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labor.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Hours</th>
                      <th className="text-right p-2">Rate/hr</th>
                      <th className="text-right p-2">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labor.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">
                          <Badge variant={item.category === 'workshop' ? 'default' : 'secondary'}>
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-2">{item.description}</td>
                        <td className="text-right p-2">{item.hours}h</td>
                        <td className="text-right p-2">${item.rate}</td>
                        <td className="text-right p-2 font-semibold">${item.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No labor costs added yet</p>
                <p className="text-sm">Add workshop, onsite, or subcontractor labor</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Equipment rental and usage estimation
function EquipmentTab({ equipment, onUpdate }: { equipment: EquipmentCost[]; onUpdate: (equipment: EquipmentCost[]) => void }) {
  const totalEquipmentCost = equipment.reduce((sum, item) => sum + item.totalCost, 0);
  
  const updateEquipmentItem = (id: string, updates: Partial<EquipmentCost>) => {
    const updatedEquipment = equipment.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate(updatedEquipment);
  };

  const removeEquipmentItem = (id: string) => {
    const updatedEquipment = equipment.filter(item => item.id !== id);
    onUpdate(updatedEquipment);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Equipment & Machinery
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Construction equipment, machinery, and tools required for the project.<br/>
                    Includes cranes, welding equipment, cutting tools, and specialized machinery.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <div className="text-2xl font-bold">${totalEquipmentCost.toLocaleString()}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {equipment.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.equipment}
                          onChange={(e) => updateEquipmentItem(item.id, { equipment: e.target.value })}
                          className="font-medium border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.type} 
                          onValueChange={(value) => updateEquipmentItem(item.id, { type: value as 'inhouse' | 'rental' })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inhouse">Inhouse</SelectItem>
                            <SelectItem value="rental">Rental</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.duration}
                          onChange={(e) => {
                            const newDuration = parseFloat(e.target.value) || 0;
                            const newCost = newDuration * item.rate;
                            updateEquipmentItem(item.id, { duration: newDuration, totalCost: newCost });
                          }}
                          className="w-20 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.unit} 
                          onValueChange={(value) => updateEquipmentItem(item.id, { unit: value as 'hours' | 'days' })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const newRate = parseFloat(e.target.value) || 0;
                            const newCost = item.duration * newRate;
                            updateEquipmentItem(item.id, { rate: newRate, totalCost: newCost });
                          }}
                          className="w-24 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${item.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newCost = item.duration * item.rate;
                              updateEquipmentItem(item.id, { totalCost: newCost });
                            }}
                            title="Recalculate cost"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEquipmentItem(item.id)}
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No equipment costs added yet</p>
                <p className="text-sm">Add inhouse and rental equipment with operator costs</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Consumables estimation with category management
function ConsumablesTab({ consumables, onUpdate }: { consumables: ConsumableCost[]; onUpdate: (consumables: ConsumableCost[]) => void }) {
  const totalConsumablesCost = consumables.reduce((sum, item) => sum + item.totalCost, 0);
  
  const updateConsumableItem = (id: string, updates: Partial<ConsumableCost>) => {
    const updatedConsumables = consumables.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate(updatedConsumables);
  };

  const removeConsumableItem = (id: string) => {
    const updatedConsumables = consumables.filter(item => item.id !== id);
    onUpdate(updatedConsumables);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Consumables & Supplies
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Welding electrodes, cutting discs, gas, consumables, and supplies.<br/>
                    Includes safety equipment, protective gear, and project-specific materials.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <div className="text-2xl font-bold">${totalConsumablesCost.toLocaleString()}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consumables.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumables.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.item}
                          onChange={(e) => updateConsumableItem(item.id, { item: e.target.value })}
                          className="font-medium border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseFloat(e.target.value) || 0;
                            const newCost = newQuantity * item.unitCost;
                            updateConsumableItem(item.id, { quantity: newQuantity, totalCost: newCost });
                          }}
                          className="w-24 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateConsumableItem(item.id, { unit: e.target.value })}
                          className="w-24 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => {
                            const newUnitCost = parseFloat(e.target.value) || 0;
                            const newCost = item.quantity * newUnitCost;
                            updateConsumableItem(item.id, { unitCost: newUnitCost, totalCost: newCost });
                          }}
                          className="w-24 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${item.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newCost = item.quantity * item.unitCost;
                              updateConsumableItem(item.id, { totalCost: newCost });
                            }}
                            title="Recalculate cost"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConsumableItem(item.id)}
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No consumables added yet</p>
                <p className="text-sm">Add welding electrodes, gas, paint, and other supplies</p>
              </div>
            )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <span>Total (excluding GST)</span>
                <span>${estimationData.totals.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-orange-600">
                <span>GST (15%)</span>
                <span className="font-semibold">${(estimationData.totals.total * 0.15).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-xl font-bold border-t-2 text-primary">
                <span>Total (including GST)</span>
                <span>${(estimationData.totals.total * 1.15).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit & Efficiency Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Gross Profit $</span>
                <span className="font-semibold text-green-600">${estimationData.totals.margin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Gross Profit %</span>
                <span className="font-semibold text-green-600">{estimationData.margin.percentage}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Total Labor Hours</span>
                <span className="font-semibold">
                  {(() => {
                    const totalHours = estimationData.labor.reduce((sum, item) => sum + item.hours, 0);
                    return `${totalHours.toFixed(1)}h`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Gross Profit per Hour</span>
                <span className="font-semibold text-blue-600">
                  ${(() => {
                    const totalHours = estimationData.labor.reduce((sum, item) => sum + item.hours, 0);
                    return totalHours > 0 ? (estimationData.totals.margin / totalHours).toFixed(2) : '0.00';
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Project Efficiency Rating</span>
                <span className="font-semibold">
                  {(() => {
                    const profitPercent = estimationData.margin.percentage;
                    if (profitPercent >= 25) return <Badge className="bg-green-500">Excellent</Badge>;
                    if (profitPercent >= 20) return <Badge className="bg-blue-500">Good</Badge>;
                    if (profitPercent >= 15) return <Badge className="bg-yellow-500">Fair</Badge>;
                    return <Badge className="bg-red-500">Low</Badge>;
                  })()}
                </span>
              </div>
              <div className="pt-2 border-t-2">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Excellent: 25%+ margin</p>
                  <p>• Good: 20-24% margin</p>
                  <p>• Fair: 15-19% margin</p>
                  <p>• Low: &lt;15% margin</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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