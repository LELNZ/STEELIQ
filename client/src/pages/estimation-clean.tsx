import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Info,
  MapPin,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MaterialsTab } from "@/components/estimation/materials-tab-clean";
import PdfAnalysisTab from "@/components/estimation/pdf-analysis-tab";
import { EnhancedLaborTab } from "@/components/estimation/enhanced-labor-tab";
import CoatingsTab from "@/components/estimation/coatings-tab";
import OverheadConfiguration from "@/components/estimation/overhead-configuration";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useEstimationDefaults } from "@/hooks/useEstimationDefaults";

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
  materialId?: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  wasteFactor: number;
  handlingTime: number;
  handlingCost: number;
  supplier?: string;
  leadTime?: number;
  notes?: string;
  aiSuggested?: boolean;
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
  type: 'rental' | 'owned' | 'purchase';
  hoursPerDay: number;
  days: number;
  hourlyRate: number;
  totalCost: number;
  notes?: string;
}

interface ConsumableCost {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

interface CoatingCost {
  id: string;
  coatingName: string;
  coatingType: "paint" | "galvanizing" | "powder_coating";
  category: "primer" | "topcoat" | "finish" | "protective";
  surfaceArea?: number;
  weightKg?: number; // For galvanizing p/kg pricing
  coats: number;
  unitCost: number;
  totalCost: number;
  isInhouse: boolean;
  supplier?: string;
  supplierId?: number;
  leadTime?: number;
  notes: string;
}

interface EstimationData {
  project: EstimationProject;
  materials: MaterialCost[];
  labor: LaborCost[];
  equipment: EquipmentCost[];
  consumables: ConsumableCost[];
  coatings: CoatingCost[];
  overheads: {
    percentage: number;
    amount: number;
    opexMonthly?: number;
    capexAnnual?: number;
    projectModifier?: number;
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
    coatings: number;
    directCosts: number;
    overheads: number;
    margin: number;
    total: number;
    grossProfitMargin?: number;
  };
}

export default function EstimationPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [currentProject, setCurrentProject] = useState<EstimationProject | null>(null);
  const [estimationData, setEstimationData] = useState<EstimationData | null>(null);
  const [isAiAssistEnabled, setIsAiAssistEnabled] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  // Navigation state management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const originalDataRef = useRef<EstimationData | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { overheadSettings } = useBusinessSettings();
  const estimationDefaults = useEstimationDefaults();

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

  // Fetch suppliers for coating subcontractors
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Store original data on mount to track changes - only once per project load
  useEffect(() => {
    if (estimationData && !originalDataRef.current && currentProject) {
      // Deep clone and store original data
      originalDataRef.current = JSON.parse(JSON.stringify(estimationData));
      setHasUnsavedChanges(false);
      console.log('Set original data on mount for project:', currentProject.id);
    }
  }, [estimationData, currentProject]);

  // Reset original data when switching projects
  useEffect(() => {
    if (currentProject) {
      originalDataRef.current = null;
      setHasUnsavedChanges(false);
    }
  }, [currentProject?.id]);



  // Save estimation data mutation - defined before use
  const saveEstimationMutation = useMutation({
    mutationFn: async (data: EstimationData) => {
      console.log('Saving estimation data:', data);
      // apiRequest already handles response parsing and error throwing
      const result = await apiRequest("PUT", `/api/estimations/${currentProject?.id}`, data);
      console.log('Save response:', result);
      
      // Update original data to match current state after successful save
      originalDataRef.current = JSON.parse(JSON.stringify(data));
      return result;
    },
    onSuccess: (response) => {
      console.log('Save successful:', response);
      
      // Update original data to match current state
      if (estimationData) {
        originalDataRef.current = JSON.parse(JSON.stringify(estimationData));
      }
      
      // Clear unsaved changes state
      setHasUnsavedChanges(false);
      
      // Clear auto-save timer on successful save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      toast({
        title: "Changes Saved",
        description: response.message || "All estimation data has been saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/estimations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/estimations/${currentProject?.id}`] });
    },
    onError: (error) => {
      console.error("Save error details:", error);
      toast({
        title: "Save Failed",
        description: `Failed to save changes. ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Disable change detection temporarily for testing
  useEffect(() => {
    // Force unsaved changes to false for now
    setHasUnsavedChanges(false);
  }, [estimationData]);

  // Auto-save timer management
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear and set auto-save timer
  const resetAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    if (hasUnsavedChanges && estimationData && !saveEstimationMutation.isPending) {
      autoSaveTimerRef.current = setTimeout(() => {
        console.log('Auto-saving after 10 minutes of inactivity...');
        saveEstimationMutation.mutate(estimationData);
      }, 10 * 60 * 1000); // 10 minutes
    }
  }, [hasUnsavedChanges, estimationData, saveEstimationMutation]);

  // Auto-save on 10 minutes of inactivity
  useEffect(() => {
    resetAutoSaveTimer();
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [resetAutoSaveTimer]);

  // Manual save function
  const handleManualSave = () => {
    if (!estimationData) {
      toast({
        title: "Save Failed",
        description: "No estimation data to save",
        variant: "destructive"
      });
      return;
    }

    if (saveEstimationMutation.isPending) {
      toast({
        title: "Save in Progress",
        description: "Please wait for current save to complete",
        variant: "destructive"
      });
      return;
    }

    console.log('Manual save triggered');
    saveEstimationMutation.mutate(estimationData);
  };

  // Calculate and update totals whenever data changes - runs on every state change
  useEffect(() => {
    if (estimationData && estimationData.materials && estimationData.labor && estimationData.equipment && estimationData.consumables) {
      const materials = estimationData.materials.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const labor = estimationData.labor.reduce((sum, item) => {
        const cost = item.totalCost || 0;
        return sum + cost;
      }, 0);
      const equipment = estimationData.equipment.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const consumables = estimationData.consumables.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const coatings = (estimationData.coatings || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
      
      // INDUSTRY STANDARD: Margin calculated on direct costs before overheads
      const directCosts = materials + labor + equipment + consumables + coatings;
      const overheadsAmount = directCosts * (estimationData.overheads.percentage / 100);
      const marginAmount = directCosts * (estimationData.margin.percentage / 100);
      const total = directCosts + overheadsAmount + marginAmount;

      // Calculate gross profit margin for color coding
      const grossProfit = overheadsAmount + marginAmount;
      const grossProfitMargin = total > 0 ? (grossProfit / total) * 100 : 0;

      // Always update totals to ensure UI consistency
      const newTotals = {
        materials,
        labor,
        equipment,
        consumables,
        coatings,
        directCosts,
        overheads: overheadsAmount,
        margin: marginAmount,
        total,
        grossProfitMargin
      };
      
      // Only update if totals differ to prevent loops
      const currentTotals = estimationData.totals;
      if (!currentTotals || JSON.stringify(currentTotals) !== JSON.stringify(newTotals)) {
        setEstimationData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            totals: newTotals
          };
        });
      }
    }
  }, [estimationData?.materials, estimationData?.labor, estimationData?.equipment, estimationData?.consumables, estimationData?.coatings, estimationData?.overheads?.percentage, estimationData?.margin?.percentage]);

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

  // Handle navigation with unsaved changes - auto-save before navigation
  const handleNavigation = (navigationFn: () => void) => {
    console.log('Navigation triggered with unsaved changes:', hasUnsavedChanges);
    if (hasUnsavedChanges && estimationData && !saveEstimationMutation.isPending) {
      console.log('Auto-saving before navigation...');
      saveEstimationMutation.mutate(estimationData, {
        onSuccess: () => {
          navigationFn();
        },
        onError: () => {
          // Show dialog on save error
          setPendingNavigation(() => navigationFn);
          setShowSaveDialog(true);
        }
      });
    } else {
      navigationFn();
    }
  };

  // Enhanced navigation handler for router navigation
  const handleRouterNavigation = (path: string) => {
    handleNavigation(() => {
      window.location.href = path;
    });
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

  // Initialize estimation data for a project
  const initializeEstimationData = async (project: EstimationProject) => {
    try {
      // Try to fetch existing estimation data
      const response = await fetch(`/api/estimations/${project.id}`);
      if (response.ok) {
        const existingData = await response.json();
        setEstimationData(existingData);
        // Reset original data reference for new project
        originalDataRef.current = null;
        // Will be set in the useEffect when estimationData updates
        return;
      }
    } catch (error) {
      console.log("No existing estimation data, creating new");
    }

    // Create new estimation data if none exists
    const data: EstimationData = {
      project,
      materials: [],
      labor: [],
      equipment: [],
      consumables: [],
      coatings: [],
      overheads: { percentage: 20, amount: 0, projectModifier: 0 },
      margin: { percentage: 20, amount: 0 },
      totals: {
        materials: 0,
        labor: 0,
        equipment: 0,
        consumables: 0,
        coatings: 0,
        directCosts: 0,
        overheads: 0,
        margin: 0,
        total: 0,
        grossProfitMargin: 0
      }
    };
    setEstimationData(data);
    originalDataRef.current = JSON.parse(JSON.stringify(data));
  };

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

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">AI-Assisted Estimation Engine</h1>
            <p className="text-muted-foreground">
              Professional steel fabrication cost estimation with intelligent recommendations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Show project controls when viewing a project */}
            {currentProject && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleNavigation(() => setCurrentProject(null))}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Button>
                
                <Button 
                  onClick={handleManualSave}
                  disabled={saveEstimationMutation.isPending}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  {saveEstimationMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
            
            <Badge variant={isAiAssistEnabled ? "default" : "secondary"} className="px-3 py-1">
              <Bot className="h-4 w-4 mr-1" />
              AI Enabled
            </Badge>
            
            {/* Show New Project button only when not viewing a project */}
            {!currentProject && (
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
            )}
          </div>
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
          onBack={() => handleNavigation(() => setCurrentProject(null))}
          hasUnsavedChanges={hasUnsavedChanges}
          onManualSave={handleManualSave}
          saveEstimationMutation={saveEstimationMutation}
        />
      ) : (
        <ProjectOverview 
          projects={projects} 
          onSelectProject={(project) => {
            handleNavigation(async () => {
              setCurrentProject(project);
              await initializeEstimationData(project);
            });
          }}
        />
      )}

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

// New Project Form Component
function NewProjectForm({ onSubmit }: { onSubmit: (data: Partial<EstimationProject>) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    margin: "20"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      margin: parseInt(formData.margin),
      status: 'draft' as const,
      totalCost: 0
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
          placeholder="Steel fabrication project name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Project scope and requirements"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="margin">Target Margin (%)</Label>
        <Input
          id="margin"
          type="number"
          value={formData.margin}
          onChange={(e) => setFormData(prev => ({ ...prev, margin: e.target.value }))}
          min="0"
          max="100"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
}

// Project Overview Component
function ProjectOverview({ projects, onSelectProject }: {
  projects: EstimationProject[];
  onSelectProject: (project: EstimationProject) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
                <div className="text-right">
                  <div className="text-lg font-bold">${project.totalCost.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => onSelectProject(project)}
                className="w-full"
              >
                Open Estimation
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
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
  onBack,
  hasUnsavedChanges,
  onManualSave,
  saveEstimationMutation
}: {
  project: EstimationProject;
  estimationData: EstimationData | null;
  setEstimationData: (data: EstimationData | null) => void;
  materials: any[];
  aiSuggestions: string[];
  isAiAssistEnabled: boolean;
  onBack: () => void;
  hasUnsavedChanges: boolean;
  onManualSave: () => void;
  saveEstimationMutation: any;
}) {
  const [activeTab, setActiveTab] = useState("materials");

  // Simple tab change without auto-save
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  if (!estimationData) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Project Header - Clean without save controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <p className="text-muted-foreground">{project.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${(estimationData.totals?.total || 0).toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Estimate</p>
              <p className="text-xs text-muted-foreground">
                Labor: ${(estimationData.totals?.labor || 0).toLocaleString()}
              </p>
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
                  <Zap className="h-4 w-4 mt-0.5 mr-2 text-blue-600" />
                  <span className="text-sm text-blue-800">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Estimation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="drawings">AI Drawings</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="consumables">Consumables</TabsTrigger>
          <TabsTrigger value="coatings">Coatings</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="quote">Quote</TabsTrigger>
        </TabsList>

        <TabsContent value="drawings">
          <PdfAnalysisTab 
            onMaterialsExtracted={(newMaterials) => {
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
            onUpdate={(labor) => {
              console.log('Labor tab onUpdate called with:', labor);
              setEstimationData(prev => {
                if (!prev) return null;
                const updated = { ...prev, labor };
                console.log('State updated with labor:', updated.labor);
                console.log('Triggering change detection and totals recalculation');
                return updated;
              });
            }}
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
            availableMaterials={materials}
            onUpdate={(consumables) => setEstimationData(prev => prev ? { ...prev, consumables } : null)}
          />
        </TabsContent>

        <TabsContent value="coatings">
          <CoatingsTab 
            coatings={estimationData.coatings || []}
            onCoatingsChange={(coatings) => setEstimationData(prev => prev ? { ...prev, coatings } : null)}
            materials={estimationData.materials}
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

// Equipment tab with rental costs and operating hours
function EquipmentTab({ equipment, onUpdate }: { equipment: EquipmentCost[]; onUpdate: (equipment: EquipmentCost[]) => void }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const addEquipmentItem = (newItem: Partial<EquipmentCost>) => {
    const item: EquipmentCost = {
      id: Date.now().toString(),
      equipment: newItem.equipment || "",
      type: newItem.type || "rental",
      hoursPerDay: newItem.hoursPerDay || 8,
      days: newItem.days || 1,
      hourlyRate: newItem.hourlyRate || 0,
      totalCost: (newItem.hoursPerDay || 8) * (newItem.days || 1) * (newItem.hourlyRate || 0),
      notes: newItem.notes || ""
    };
    onUpdate([...equipment, item]);
    setIsAddDialogOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Plant & Equipment
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cranes, transport, power tools, and specialized equipment.<br/>
                    Includes rental costs, operating hours, and mobilization fees.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">${totalEquipmentCost.toLocaleString()}</div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Equipment</DialogTitle>
                  </DialogHeader>
                  <AddEquipmentForm onSubmit={addEquipmentItem} />
                </DialogContent>
              </Dialog>
            </div>
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
                    <TableHead>Hours/Day</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Hourly Rate</TableHead>
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
                        <Select value={item.type} onValueChange={(value) => updateEquipmentItem(item.id, { type: value as any })}>
                          <SelectTrigger className="w-24 border-0 px-1 py-0 h-6">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rental">Rental</SelectItem>
                            <SelectItem value="owned">Owned</SelectItem>
                            <SelectItem value="purchase">Purchase</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.hoursPerDay}
                          onChange={(e) => {
                            const newHours = parseFloat(e.target.value) || 0;
                            const newCost = newHours * item.days * item.hourlyRate;
                            updateEquipmentItem(item.id, { hoursPerDay: newHours, totalCost: newCost });
                          }}
                          className="w-20 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.days}
                          onChange={(e) => {
                            const newDays = parseFloat(e.target.value) || 0;
                            const newCost = item.hoursPerDay * newDays * item.hourlyRate;
                            updateEquipmentItem(item.id, { days: newDays, totalCost: newCost });
                          }}
                          className="w-20 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.hourlyRate}
                          onChange={(e) => {
                            const newRate = parseFloat(e.target.value) || 0;
                            const newCost = item.hoursPerDay * item.days * newRate;
                            updateEquipmentItem(item.id, { hourlyRate: newRate, totalCost: newCost });
                          }}
                          className="w-24 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        ${item.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEquipmentItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No equipment added yet</p>
                <p className="text-sm">Add cranes, tools, and machinery for the project</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add Equipment Form Component
function AddEquipmentForm({ onSubmit }: { onSubmit: (data: Partial<EquipmentCost>) => void }) {
  const [formData, setFormData] = useState({
    equipment: "",
    type: "rental" as const,
    hoursPerDay: 8,
    days: 1,
    hourlyRate: 0,
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      equipment: "",
      type: "rental",
      hoursPerDay: 8,
      days: 1,
      hourlyRate: 0,
      notes: ""
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="equipment">Equipment Name</Label>
        <Input
          id="equipment"
          value={formData.equipment}
          onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
          placeholder="e.g. 25T Mobile Crane"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rental">Rental</SelectItem>
              <SelectItem value="owned">Owned</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hoursPerDay">Hours per Day</Label>
          <Input
            id="hoursPerDay"
            type="number"
            value={formData.hoursPerDay}
            onChange={(e) => setFormData(prev => ({ ...prev, hoursPerDay: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="days">Number of Days</Label>
          <Input
            id="days"
            type="number"
            value={formData.days}
            onChange={(e) => setFormData(prev => ({ ...prev, days: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional details or requirements"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Add Equipment</Button>
      </div>
    </form>
  );
}

// Consumables tab for welding supplies, cutting discs, etc.
function ConsumablesTab({ consumables, onUpdate, availableMaterials }: { 
  consumables: ConsumableCost[]; 
  onUpdate: (consumables: ConsumableCost[]) => void;
  availableMaterials: any[];
}) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const addConsumableItem = (newItem: Partial<ConsumableCost>) => {
    const item: ConsumableCost = {
      id: Date.now().toString(),
      item: newItem.item || "",
      quantity: newItem.quantity || 1,
      unit: newItem.unit || "kg",
      unitCost: newItem.unitCost || 0,
      totalCost: (newItem.quantity || 1) * (newItem.unitCost || 0),
      notes: newItem.notes || ""
    };
    onUpdate([...consumables, item]);
    setIsAddDialogOpen(false);
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
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">${totalConsumablesCost.toLocaleString()}</div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Consumable
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Consumable</DialogTitle>
                  </DialogHeader>
                  <AddConsumableForm onSubmit={addConsumableItem} availableMaterials={availableMaterials} />
                </DialogContent>
              </Dialog>
            </div>
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
                            const newCost = parseFloat(e.target.value) || 0;
                            const totalCost = item.quantity * newCost;
                            updateConsumableItem(item.id, { unitCost: newCost, totalCost });
                          }}
                          className="w-24 border-0 px-1 py-0 h-6"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        ${item.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConsumableItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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

// Add Consumable Form Component
function AddConsumableForm({ onSubmit, availableMaterials }: { 
  onSubmit: (data: Partial<ConsumableCost>) => void;
  availableMaterials: any[];
}) {
  const [formData, setFormData] = useState({
    item: "",
    quantity: 1,
    unit: "kg",
    unitCost: 0,
    notes: ""
  });

  // Common consumables for suggestions
  const commonConsumables = [
    { name: "7018 Welding Electrodes", unit: "kg", estimatedCost: 12.50 },
    { name: "6013 Welding Electrodes", unit: "kg", estimatedCost: 8.90 },
    { name: "Cutting Discs 9\"", unit: "pcs", estimatedCost: 3.25 },
    { name: "Grinding Discs 4.5\"", unit: "pcs", estimatedCost: 2.10 },
    { name: "Oxygen Gas", unit: "m3", estimatedCost: 2.85 },
    { name: "Acetylene Gas", unit: "m3", estimatedCost: 8.50 },
    { name: "CO2 Welding Gas", unit: "m3", estimatedCost: 1.95 },
    { name: "Anti-Spatter Spray", unit: "can", estimatedCost: 15.50 },
    { name: "Primer Paint", unit: "L", estimatedCost: 25.80 },
    { name: "Safety Glasses", unit: "pcs", estimatedCost: 8.90 },
    { name: "Welding Gloves", unit: "pair", estimatedCost: 22.50 },
    { name: "Hard Hat", unit: "pcs", estimatedCost: 18.90 }
  ];

  const handleSuggestionSelect = (suggestion: any) => {
    setFormData(prev => ({
      ...prev,
      item: suggestion.name,
      unit: suggestion.unit,
      unitCost: suggestion.estimatedCost
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      item: "",
      quantity: 1,
      unit: "kg",
      unitCost: 0,
      notes: ""
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="item">Consumable Item</Label>
        <Input
          id="item"
          value={formData.item}
          onChange={(e) => setFormData(prev => ({ ...prev, item: e.target.value }))}
          placeholder="e.g. 7018 Welding Electrodes"
          required
        />
        
        {/* Common consumables suggestions */}
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">Common Items:</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {commonConsumables.slice(0, 6).map((item, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-6"
                onClick={() => handleSuggestionSelect(item)}
              >
                {item.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="pcs">Pieces</SelectItem>
              <SelectItem value="L">Liters</SelectItem>
              <SelectItem value="m3">Cubic Meters</SelectItem>
              <SelectItem value="can">Cans</SelectItem>
              <SelectItem value="pair">Pairs</SelectItem>
              <SelectItem value="box">Boxes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="unitCost">Unit Cost ($)</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional specifications or requirements"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Add Consumable</Button>
      </div>
    </form>
  );
}

// Summary tab placeholder
function SummaryTab({ estimationData }: { estimationData: EstimationData }) {
  const calculateTotals = () => {
    const materials = estimationData.materials.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const labor = estimationData.labor.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const equipment = estimationData.equipment.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const consumables = estimationData.consumables.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const coatings = (estimationData.coatings || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
    
    // FIXED: Include coatings and use consistent calculation logic
    const directCosts = materials + labor + equipment + consumables + coatings;
    const overheads = directCosts * (estimationData.overheads.percentage / 100);
    const margin = directCosts * (estimationData.margin.percentage / 100);
    const revenueBeforeGST = directCosts + overheads + margin;
    
    // New Zealand GST is 15%
    const gstAmount = revenueBeforeGST * 0.15;
    const totalCostAfterGST = revenueBeforeGST + gstAmount;
    
    // Gross profit calculations (Revenue - COGS)
    // COGS = Direct materials + Direct labor + Direct production costs
    const grossProfit = revenueBeforeGST - directCosts;
    const grossProfitPercentage = (grossProfit / revenueBeforeGST) * 100;
    
    // Calculate total labor hours for GP per hour
    // Total Hours Worked = All staff involved in producing the service/product
    const totalLaborHours = estimationData.labor.reduce((sum, item) => sum + (item.hours || 0), 0);
    const grossProfitPerHour = totalLaborHours > 0 ? grossProfit / totalLaborHours : 0;
    
    // Additional KPIs
    const materialCostRatio = directCosts > 0 ? (materials / directCosts) * 100 : 0;
    const revenuePerLaborHour = totalLaborHours > 0 ? revenueBeforeGST / totalLaborHours : 0;
    const overheadRecoveryRate = overheads > 0 ? (overheads / overheads) * 100 : 100; // Currently 100% as overheads are calculated based on percentage
    
    // Cost category percentages
    const directCostPercentage = revenueBeforeGST > 0 ? (directCosts / revenueBeforeGST) * 100 : 0;
    const overheadPercentage = revenueBeforeGST > 0 ? (overheads / revenueBeforeGST) * 100 : 0;
    const marginPercentage = revenueBeforeGST > 0 ? (margin / revenueBeforeGST) * 100 : 0;
    
    return { 
      materials, 
      labor, 
      equipment, 
      consumables,
      coatings,
      directCosts,
      overheads, 
      margin, 
      revenueBeforeGST,
      gstAmount,
      totalCostAfterGST,
      grossProfit,
      grossProfitPercentage,
      grossProfitPerHour,
      totalLaborHours,
      materialCostRatio,
      revenuePerLaborHour,
      overheadRecoveryRate,
      directCostPercentage,
      overheadPercentage,
      marginPercentage
    };
  };
  
  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Project Name</p>
                <p className="font-semibold">{estimationData.project.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-semibold">{estimationData.project.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={estimationData.project.status === 'in_progress' ? 'default' : 'secondary'}>
                  {estimationData.project.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{estimationData.project.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project Margin</p>
                <p className="font-semibold">{estimationData.margin.percentage}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materials</p>
                <p className="text-2xl font-bold text-blue-600">${totals.materials.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{estimationData.materials.length} items</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Labor</p>
                <p className="text-2xl font-bold text-green-600">${totals.labor.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{estimationData.labor.length} tasks</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Equipment</p>
                <p className="text-2xl font-bold text-orange-600">${totals.equipment.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{estimationData.equipment.length} items</p>
              </div>
              <Wrench className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consumables</p>
                <p className="text-2xl font-bold text-purple-600">${totals.consumables.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{estimationData.consumables.length} items</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Financial Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Direct Costs</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Raw materials, direct labor, equipment rental, and consumables directly used in fabrication</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-semibold">${totals.directCosts.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Overheads ({estimationData.overheads.percentage}%)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Workshop rent, utilities, insurance, administration costs, and other indirect expenses</p>
                      <p className="text-xs text-muted-foreground">Currently calculated as {estimationData.overheads.percentage}% of direct costs</p>
                      <p className="text-xs text-muted-foreground">Best practice: Track actual overhead costs and adjust percentage quarterly</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-semibold">${totals.overheads.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Margin ({estimationData.margin.percentage}%)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Profit markup to cover business growth, risk, and return on investment</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-semibold">${totals.margin.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-t border-primary/20">
              <span className="text-lg font-bold">Total Revenue (ex-GST)</span>
              <span className="text-xl font-bold text-primary">${totals.revenueBeforeGST.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">GST (15%)</span>
              <span className="font-semibold">${totals.gstAmount.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-t-2 border-primary">
              <span className="text-lg font-bold">Total Cost (inc-GST)</span>
              <span className="text-2xl font-bold text-primary">${totals.totalCostAfterGST.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profitability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Gross Profit %</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Revenue minus Cost of Goods Sold (COGS), expressed as percentage.</p>
                      <p className="text-xs text-muted-foreground">COGS = Direct materials + Direct labor + Direct production costs</p>
                      <p className="text-xs text-muted-foreground">Industry standard: 30-40% for steel fabrication</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ProjectMarginIndicator 
                projectValue={totals.revenueBeforeGST}
                actualMargin={totals.grossProfitPercentage}
              />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Gross Profit $</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Revenue minus Cost of Goods Sold (COGS)</p>
                      <p className="text-xs text-muted-foreground">COGS includes: materials, labor, equipment, consumables</p>
                      <p className="text-xs text-muted-foreground">This is profit before overheads and taxes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold text-green-600">${totals.grossProfit.toLocaleString()}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">GP per Hour</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold">Gross Profit per Hour Formula:</p>
                        <p>Gross Profit ÷ Total Hours Worked</p>
                        <p className="text-xs">Where Gross Profit = Revenue - COGS (direct materials, labor, production costs)</p>
                        <p className="text-xs">Current: ${totals.grossProfit.toLocaleString()} ÷ {totals.totalLaborHours.toFixed(1)}h = ${totals.grossProfitPerHour.toFixed(0)}/hour</p>
                        <p className="text-xs text-muted-foreground">Measures pricing effectiveness and labor productivity</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold text-green-600">${totals.grossProfitPerHour.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Key Performance Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Material Cost Ratio</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Materials as % of total direct costs</p>
                      <p className="text-xs text-muted-foreground">${totals.materials.toLocaleString()} ÷ ${totals.directCosts.toLocaleString()} = {totals.materialCostRatio.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Helps track material efficiency vs labor intensity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold text-blue-600">{totals.materialCostRatio.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">${totals.materials.toLocaleString()}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Revenue per Labor Hour</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Total revenue divided by labor hours</p>
                      <p className="text-xs text-muted-foreground">${totals.revenueBeforeGST.toLocaleString()} ÷ {totals.totalLaborHours.toFixed(1)}h = ${totals.revenuePerLaborHour.toFixed(0)}/hour</p>
                      <p className="text-xs text-muted-foreground">Measures overall labor efficiency and pricing</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold text-green-600">${totals.revenuePerLaborHour.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{totals.totalLaborHours.toFixed(1)} hours</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Overhead Recovery</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Overheads recovered vs actual overhead costs</p>
                      <p className="text-xs text-muted-foreground">Currently calculated as {estimationData.overheads.percentage}% of direct costs</p>
                      <p className="text-xs text-muted-foreground">Workshop rent, utilities, insurance, admin costs</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold text-orange-600">{totals.overheadRecoveryRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">${totals.overheads.toLocaleString()}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Direct Cost %</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Direct costs as % of total revenue</p>
                      <p className="text-xs text-muted-foreground">Industry target: 60-70% for steel fabrication</p>
                      <p className="text-xs text-muted-foreground">Current: {totals.directCostPercentage.toFixed(1)}%</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold text-slate-600">{totals.directCostPercentage.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">${totals.directCosts.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Details Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Materials Summary */}
        {estimationData.materials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {estimationData.materials.slice(0, 5).map((material, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{material.materialName}</p>
                      <p className="text-xs text-muted-foreground">{material.quantity} {material.unit}</p>
                    </div>
                    <span className="font-semibold">${material.totalCost?.toLocaleString()}</span>
                  </div>
                ))}
                {estimationData.materials.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{estimationData.materials.length - 5} more materials
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Labor Summary */}
        {estimationData.labor.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Labor Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {estimationData.labor.slice(0, 5).map((labor, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{labor.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {labor.hours}h @ ${labor.rate}/h • {labor.category}
                      </p>
                    </div>
                    <span className="font-semibold">${labor.totalCost?.toLocaleString()}</span>
                  </div>
                ))}
                {estimationData.labor.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{estimationData.labor.length - 5} more labor items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Quote tab placeholder
function QuoteTab({ project, estimationData }: { project: EstimationProject; estimationData: EstimationData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Quote generation functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}