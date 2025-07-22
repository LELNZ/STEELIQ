import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
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
  Wrench,
  Target,
  Eye,
  Phone,
  Mail,
  XCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Edit,
  UserPlus,
  Workflow,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MaterialsTab } from "@/components/estimation/materials-tab-clean";
import PdfAnalysisTab from "@/components/estimation/pdf-analysis-tab";
import { EnhancedLaborTab } from "@/components/estimation/enhanced-labor-tab";
import EnhancedEquipmentTab from "@/components/estimation/enhanced-equipment-tab";
import { EnhancedConsumablesTab } from "@/components/estimation/enhanced-consumables-tab";
import { SubcontractorsTab } from "@/components/estimation/subcontractors-tab";
import CoatingsTab from "@/components/estimation/coatings-tab";
import OverheadConfiguration from "@/components/estimation/overhead-configuration";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useEstimationDefaults } from "@/hooks/useEstimationDefaults";
import { EnhancedProjectForm } from "@/components/estimation/EnhancedProjectForm";
import { ViewSwitcher } from "@/components/ui/view-switcher";
import EstimationTable from "@/components/estimations/estimation-table";
import QuoteGenerator from "@/components/estimations/quote-generator";

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

interface SubcontractorCost {
  id: string;
  contractor: string;
  service: string;
  description: string;
  quotedAmount: number;
  markup: number;
  totalCost: number;
  startDate?: Date;
  endDate?: Date;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  paymentTerms?: string;
  insurance?: boolean;
  safetyDocs?: boolean;
  notes?: string;
}

interface EstimationData {
  project: EstimationProject;
  materials: MaterialCost[];
  labor: LaborCost[];
  equipment: EquipmentCost[];
  consumables: ConsumableCost[];
  coatings: CoatingCost[];
  subcontractors: SubcontractorCost[];
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
    subcontractors: number;
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
  const [showQuoteGenerator, setShowQuoteGenerator] = useState(false);
  
  // Navigation state management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const originalDataRef = useRef<EstimationData | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/estimation/:id");
  const { overheadSettings } = useBusinessSettings();
  const estimationDefaults = useEstimationDefaults();

  // Performance optimized queries with loading states
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<EstimationProject[]>({
    queryKey: ["/api/estimations"],
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Fetch materials for AI assistance
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["/api/materials"],
    staleTime: 10 * 60 * 1000, // 10 minutes - materials don't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Fetch clients for project assignment
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch suppliers for coating subcontractors
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Load estimation from URL parameter if present
  useEffect(() => {
    if (match && params?.id) {
      const estimationId = parseInt(params.id);
      const project = projects.find(p => p.id === estimationId);
      if (project) {
        setCurrentProject(project);
        initializeEstimationData(project);
      }
    }
  }, [match, params?.id, projects]);

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
      const subcontractors = (estimationData.subcontractors || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
      
      // INDUSTRY STANDARD: Margin calculated on direct costs before overheads
      const directCosts = materials + labor + equipment + consumables + coatings + subcontractors;
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
        subcontractors,
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
        // Handle the nested project structure from the server
        if (existingData.project) {
          // Server returns data with nested project, normalize it
          const normalizedData = {
            ...existingData,
            project: existingData.project
          };
          setEstimationData(normalizedData);
        } else {
          setEstimationData(existingData);
        }
        // Reset original data reference for new project
        originalDataRef.current = null;
        // Will be set in the useEffect when estimationData updates
        return;
      }
    } catch (error) {
      console.log("No existing estimation data, creating new", error);
    }

    // Check for drawing import data from Drawing Intelligence
    let importedMaterials: MaterialCost[] = [];
    const drawingImportData = sessionStorage.getItem('drawingImportData');
    if (drawingImportData) {
      try {
        const importData = JSON.parse(drawingImportData);
        
        // Convert imported materials to estimation format
        if (importData.materials && Array.isArray(importData.materials)) {
          importedMaterials = importData.materials.map((material: any, index: number) => ({
            id: `import-${Date.now()}-${index}`,
            materialCode: material.materialCode || '',
            materialName: material.materialName || '',
            quantity: material.quantity || 0,
            unit: material.unit || 'm',
            unitCost: material.unitCost || 0,
            wasteFactor: material.wasteFactor || 5,
            handlingTime: material.handlingTime || 0,
            handlingCost: material.handlingCost || 0,
            supplier: material.supplier || 'Drawing Import',
            notes: material.notes || '',
            totalCost: material.totalCost || 0
          }));
          
          // Clear the sessionStorage to prevent re-import
          sessionStorage.removeItem('drawingImportData');
          
          // Show success message
          toast({
            title: "Materials Imported",
            description: `Successfully imported ${importedMaterials.length} materials from Drawing Intelligence`,
          });
        }
        
        // Update project name if provided
        if (importData.projectName && !project.name) {
          project.name = importData.projectName;
        }
      } catch (error) {
        console.error('Error parsing drawing import data:', error);
        sessionStorage.removeItem('drawingImportData');
      }
    }

    // Create new estimation data with imported materials if any
    const data: EstimationData = {
      project,
      materials: importedMaterials,
      labor: [],
      equipment: [],
      consumables: [],
      coatings: [],
      subcontractors: [],
      overheads: { percentage: 20, amount: 0, projectModifier: 0 },
      margin: { percentage: 20, amount: 0 },
      totals: {
        materials: 0,
        labor: 0,
        equipment: 0,
        consumables: 0,
        coatings: 0,
        subcontractors: 0,
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
    mutationFn: async (formData: any) => {
      // Transform enhanced form data to match backend expectations
      const projectData = {
        name: formData.name,
        description: formData.description,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
        clientName: formData.clientName,
        status: 'draft' as const,
        totalCost: 0,
        margin: 20, // Default margin, will be updated from risk assessment
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
        // Store additional Fortune 500 fields in projectData JSON
        projectData: {
          contractType: formData.contractType,
          projectType: formData.projectType,
          wbsCode: formData.wbsCode,
          bidDate: formData.bidDate,
          targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
          quoteValidity: parseInt(formData.quoteValidity || '30'),
          riskLevel: formData.riskLevel,
          complexityScore: parseInt(formData.complexityScore || '3'),
          paymentTerms: formData.paymentTerms,
          retentionPercentage: formData.retentionPercentage ? parseFloat(formData.retentionPercentage) : undefined,
          priority: formData.priority,
          keyMilestones: formData.keyMilestones || []
        }
      };
      
      return await apiRequest("POST", "/api/estimations", projectData);
    },
    onSuccess: (data) => {
      setCurrentProject(data);
      initializeEstimationData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/estimations"] });
      toast({
        title: "Project Created",
        description: "Fortune 500 standard estimation project created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Project",
        description: error.message || "Please check all required fields and try again",
        variant: "destructive",
      });
    }
  });

  // Check loading states for Week 3 optimization
  const isLoading = projectsLoading || materialsLoading || clientsLoading || suppliersLoading;

  // Error state handling
  if (projectsError) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Estimations</h2>
            <p className="text-muted-foreground mb-4">
              We encountered an error while loading your estimation data.
            </p>
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/estimations"] });
              }}
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading skeleton for better perceived performance
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-8xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="animate-pulse">
            <div className="h-12 bg-muted rounded-lg w-64 mb-4" />
            <div className="h-6 bg-muted rounded w-96" />
          </div>

          {/* Tabs skeleton */}
          <div className="flex gap-4 mb-8">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-32 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">AI Estimation Engine</h1>
            <p className="text-muted-foreground">
              Comprehensive estimation platform with quotation monitoring and pipeline analytics
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
                  variant="outline"
                  onClick={() => navigate(`/projects/${currentProject.id}/lifecycle`)}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Workflow className="h-4 w-4" />
                  Process Tracking
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowQuoteGenerator(true)}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  Generate Quote
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
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                  <EnhancedProjectForm 
                    onSubmit={(data) => createProjectMutation.mutate(data)} 
                    isLoading={createProjectMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs defaultValue="estimation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="estimation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            AI Estimation
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pipeline Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estimation" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <AIEstimationDashboardContent />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <EstimationAnalyticsContent />
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

      {/* Quote Generator Dialog */}
      {currentProject && estimationData && (
        <QuoteGenerator
          estimation={{
            id: currentProject.id,
            project: currentProject,
            ...estimationData
          }}
          open={showQuoteGenerator}
          onOpenChange={setShowQuoteGenerator}
        />
      )}
    </div>
  );
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

// New Project Form Component
function NewProjectForm({ onSubmit, clients = [] }: { 
  onSubmit: (data: Partial<EstimationProject>) => void;
  clients?: any[];
}) {
  const [formData, setFormData] = useState({
    name: "",
    projectNumber: "",
    description: "",
    clientId: "",
    projectType: "rfq",
    margin: "20",
    targetValue: "",
    bidDueDate: "",
    deliveryDate: "",
    estimatedHours: "",
    priority: "normal"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      name: formData.name,
      description: formData.description,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      margin: parseInt(formData.margin),
      status: 'draft' as const,
      totalCost: 0,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
      projectData: {
        projectNumber: formData.projectNumber,
        projectType: formData.projectType,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
        bidDueDate: formData.bidDueDate,
        priority: formData.priority
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Project Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">PROJECT INFORMATION</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Project Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Steel Warehouse Construction"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="projectNumber">Project Number</Label>
            <Input
              id="projectNumber"
              value={formData.projectNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
              placeholder="PRJ-2025-001"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the project scope"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientId">Client</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.clientId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <QuickAddClientDialog onClientAdded={(client) => {
                setFormData(prev => ({ ...prev, clientId: client.id.toString() }));
              }} />
            </div>
          </div>
          
          <div>
            <Label htmlFor="projectType">Project Type</Label>
            <Select 
              value={formData.projectType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rfq">RFQ - Request for Quote</SelectItem>
                <SelectItem value="tender">Tender</SelectItem>
                <SelectItem value="budget">Budget Estimate</SelectItem>
                <SelectItem value="direct_award">Direct Award</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Financial & Timeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">FINANCIAL & TIMELINE</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="margin">Margin (%)</Label>
            <Input
              id="margin"
              type="number"
              value={formData.margin}
              onChange={(e) => setFormData(prev => ({ ...prev, margin: e.target.value }))}
              placeholder="20"
            />
          </div>
          
          <div>
            <Label htmlFor="targetValue">Target Value ($)</Label>
            <Input
              id="targetValue"
              type="number"
              value={formData.targetValue}
              onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
              placeholder="100000"
            />
          </div>
          
          <div>
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
              placeholder="480"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="bidDueDate">Bid Due Date</Label>
            <Input
              id="bidDueDate"
              type="date"
              value={formData.bidDueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, bidDueDate: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="priority">Priority</Label>
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
      
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="submit">
          Create Project
        </Button>
      </div>
    </form>
  );
}

// Project Overview Component
function ProjectOverview({ projects, onSelectProject }: {
  projects: EstimationProject[];
  onSelectProject: (project: EstimationProject) => void;
}) {
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'list'>(() => {
    const saved = localStorage.getItem('ai-estimation-view-preference');
    return (saved as 'table' | 'card' | 'list') || 'table';
  });

  const handleViewChange = (view: 'table' | 'card' | 'list') => {
    setViewMode(view);
    localStorage.setItem('ai-estimation-view-preference', view);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Estimation Projects</h2>
        <ViewSwitcher 
          view={viewMode} 
          onViewChange={handleViewChange} 
          storageKey="ai-estimation-view-preference" 
        />
      </div>

      {viewMode === 'table' ? (
        <EstimationTable 
          estimations={projects.map(p => ({
            ...p,
            totalCost: p.totalCost.toString(),
            margin: p.margin?.toString() || '',
            estimatedHours: '',
            createdAt: p.createdAt?.toString() || new Date().toISOString(),
            updatedAt: p.updatedAt?.toString() || new Date().toISOString()
          }))} 
          onStatusChange={() => {}}
        />
      ) : (
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
      )}
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
  const [, navigate] = useLocation();

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
      
      {/* Tabs for estimation sections */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="consumables">Consumables</TabsTrigger>
          <TabsTrigger value="coatings">Coatings</TabsTrigger>
          <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="materials">
          <MaterialsTab
            materials={estimationData.materials}
            onUpdate={(materials) => setEstimationData({ ...estimationData, materials })}
            availableMaterials={materials}
          />
        </TabsContent>
        
        <TabsContent value="labor">
          <EnhancedLaborTab
            labor={estimationData.labor}
            setLabor={(labor) => setEstimationData({ ...estimationData, labor })}
          />
        </TabsContent>
        
        <TabsContent value="equipment">
          <EnhancedEquipmentTab
            equipment={estimationData.equipment}
            setEquipment={(equipment) => setEstimationData({ ...estimationData, equipment })}
          />
        </TabsContent>
        
        <TabsContent value="subcontractors">
          <SubcontractorsTab
            subcontractors={estimationData.subcontractors}
            setSubcontractors={(subcontractors) => setEstimationData({ ...estimationData, subcontractors })}
          />
        </TabsContent>
        
        <TabsContent value="consumables">
          <EnhancedConsumablesTab
            consumables={estimationData.consumables}
            setConsumables={(consumables) => setEstimationData({ ...estimationData, consumables })}
          />
        </TabsContent>
        
        <TabsContent value="coatings">
          <CoatingsTab
            coatings={estimationData.coatings}
            onCoatingsChange={(coatings) => setEstimationData({ ...estimationData, coatings })}
            materials={estimationData.materials}
          />
        </TabsContent>
        
        <TabsContent value="summary">
          <SummaryTab
            estimationData={estimationData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Removed duplicate EstimationWorkspace function


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
    const subcontractors = (estimationData.subcontractors || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
    
    // FIXED: Include coatings and subcontractors in consistent calculation logic
    const directCosts = materials + labor + equipment + consumables + coatings + subcontractors;
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
      subcontractors,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materials</p>
                <p className="text-2xl font-bold text-blue-600">${totals.materials.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{(estimationData.materials || []).length} items</p>
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
                <p className="text-xs text-muted-foreground">{(estimationData.labor || []).length} tasks</p>
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
                <p className="text-xs text-muted-foreground">{(estimationData.equipment || []).length} items</p>
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
                <p className="text-xs text-muted-foreground">{(estimationData.consumables || []).length} items</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coatings</p>
                <p className="text-2xl font-bold text-cyan-600">${totals.coatings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{(estimationData.coatings || []).length} systems</p>
              </div>
              <Building2 className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subcontractors</p>
                <p className="text-2xl font-bold text-indigo-600">${totals.subcontractors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{(estimationData.subcontractors || []).length} contractors</p>
              </div>
              <UserPlus className="h-8 w-8 text-indigo-600" />
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
                      <p>Raw materials, direct labor, equipment rental, consumables, and subcontractor services directly used in fabrication</p>
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
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    totals.grossProfitPercentage >= 25 ? 'bg-green-600' :
                    totals.grossProfitPercentage >= 15 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(totals.grossProfitPercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-2xl font-bold text-slate-600">{totals.grossProfitPercentage.toFixed(1)}%</p>
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

// Dashboard Content Component
function AIEstimationDashboardContent() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch estimation projects with quotation data
  const { data: estimationProjects = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/estimations'],
  });

  // Calculate quotation metrics
  const quotationMetrics = estimationProjects.reduce((acc: any, project: any) => {
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

    return acc;
  }, {
    total: 0,
    active: 0,
    won: 0,
    lost: 0,
    expired: 0,
    totalValue: 0,
    activeValue: 0,
    wonValue: 0
  });

  const winRate = quotationMetrics.total > 0 ? (quotationMetrics.won / quotationMetrics.total * 100) : 0;

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-600',
    converted: 'bg-purple-100 text-purple-800'
  };

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

  return (
    <>
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
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotationMetrics.total}</div>
            <p className="text-xs text-muted-foreground">
              ${quotationMetrics.totalValue.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
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
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading quotations...</div>
          </div>
        ) : estimationProjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No quotations found</h3>
              <p className="text-muted-foreground mb-4">
                Create estimations using the AI Estimation tab to start tracking your pipeline.
              </p>
            </CardContent>
          </Card>
        ) : (
          estimationProjects
            .filter((project) => filterStatus === 'all' || project.status === filterStatus)
            .map((project: any) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(project.status)}
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.clientName || 'No client assigned'}
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

                      <Badge className={statusColors[project.status as keyof typeof statusColors] || statusColors.draft}>
                        {project.status || 'draft'}
                      </Badge>

                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </>
  );
}

// Analytics Content Component  
function EstimationAnalyticsContent() {
  const { data: estimationProjects = [] } = useQuery<any[]>({
    queryKey: ['/api/estimations'],
  });

  // Calculate analytics metrics
  const analytics = estimationProjects.reduce((acc: any, project: any) => {
    acc.totalProjects += 1;
    acc.totalValue += project.totalCost || 0;
    
    if (project.status === 'accepted' || project.status === 'converted') {
      acc.wonProjects += 1;
      acc.wonValue += project.totalCost || 0;
    }
    
    return acc;
  }, {
    totalProjects: 0,
    wonProjects: 0,
    totalValue: 0,
    wonValue: 0
  });

  const conversionRate = analytics.totalProjects > 0 ? (analytics.wonProjects / analytics.totalProjects * 100) : 0;
  const averageValue = analytics.totalProjects > 0 ? analytics.totalValue / analytics.totalProjects : 0;

  return (
    <>
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <span>Total Estimations</span>
                <span className="font-medium">{analytics.totalProjects}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Conversion Rate</span>
                <span className="font-medium">{conversionRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Average Project Value</span>
                <span className="font-medium">${averageValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Won Value</span>
                <span className="font-medium text-green-600">${analytics.wonValue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{analytics.totalProjects}</div>
                <div className="text-sm text-muted-foreground">Active Pipeline</div>
              </div>
              <Progress value={Math.max(conversionRate, 5)} className="h-4" />
              <p className="text-sm text-muted-foreground text-center">
                Current conversion rate trending {conversionRate > 20 ? 'positive' : 'needs improvement'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Estimation Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.wonProjects}</div>
              <div className="text-sm text-muted-foreground">Projects Won</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">${averageValue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Average Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{conversionRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}