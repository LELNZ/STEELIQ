import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Pencil, Trash2, Download, Upload, Flame, Wrench, Scissors, Settings2, Package, FileUp, Zap, MoreVertical, Copy, Edit, DollarSign } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// Schemas for each type of standard
const weldingStandardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  weld_type: z.enum(["fillet", "butt_single_v", "butt_double_v", "butt_single_bevel", "butt_double_bevel", "seal", "plug"]),
  size: z.coerce.number().optional().nullable(),
  time_per_meter: z.coerce.number().min(0, "Time must be positive"),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

const drillingStandardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  method: z.enum(["mag_drill", "hand_drill", "laser", "plasma", "punch"]),
  diameter_min: z.coerce.number().min(0),
  diameter_max: z.coerce.number().min(0),
  time_per_hole: z.coerce.number().min(0, "Time must be positive"),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

const cuttingStandardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  material_type: z.enum(["mild_steel", "stainless", "aluminum", "high_tensile"]),
  thickness_min: z.coerce.number().min(0),
  thickness_max: z.coerce.number().min(0),
  time_per_meter: z.coerce.number().min(0, "Time must be positive"),
  equipment: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

const positionFactorSchema = z.object({
  position: z.enum(["flat", "horizontal", "vertical", "overhead"]),
  factor: z.coerce.number().min(0.1).max(5, "Factor must be between 0.1 and 5"),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

const assemblyTemplateSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  main_material: z.string().optional(),
  components: z.string().optional(), // Will be parsed as JSON
  is_active: z.boolean().default(true)
});

const laborDefaultSchema = z.object({
  operation_type: z.string().min(1, "Operation type is required"),
  default_allocation: z.enum(["workshop", "onsite", "subcontractor"]),
  site_premium_percentage: z.coerce.number().min(0).max(200),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

type WeldingStandard = z.infer<typeof weldingStandardSchema> & { id?: number };
type DrillingStandard = z.infer<typeof drillingStandardSchema> & { id?: number };
type CuttingStandard = z.infer<typeof cuttingStandardSchema> & { id?: number };
type PositionFactor = z.infer<typeof positionFactorSchema> & { id?: number };
type AssemblyTemplate = z.infer<typeof assemblyTemplateSchema> & { id?: number };
type LaborDefault = z.infer<typeof laborDefaultSchema> & { id?: number };

export default function OperationsSettings() {
  const [activeTab, setActiveTab] = useState("fabrication");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Force re-render on mount to ensure mobile app displays correctly
  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setActiveTab("fabrication");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <TooltipProvider>
      <div id="operations-settings" className="min-h-screen bg-background p-2 sm:p-4 space-y-4" data-version={`v3-${Date.now()}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Operations Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Configure time standards and defaults for estimation calculations
            </p>
            <p className="text-xs text-green-600 mt-1">Updated: August 5, 2025 - v6</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div 
            className="w-full overflow-x-auto pb-2 mb-4" 
            style={{ 
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'auto',
              scrollbarWidth: 'thin'
            }}
          >
            <TabsList 
              className="inline-flex flex-nowrap gap-1 bg-muted/30 p-1 min-w-full" 
              style={{ 
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}
            >
              <TabsTrigger value="fabrication" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Fabrication</span>
                <span className="sm:hidden">Fab</span>
              </TabsTrigger>
              <TabsTrigger value="welding" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Welding</span>
                <span className="sm:hidden">Weld</span>
              </TabsTrigger>
              <TabsTrigger value="drilling" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Drilling</span>
                <span className="sm:hidden">Drill</span>
              </TabsTrigger>
              <TabsTrigger value="cutting" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <Scissors className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Cutting</span>
                <span className="sm:hidden">Cut</span>
              </TabsTrigger>
              <TabsTrigger value="position" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <Settings2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Position Factors</span>
                <span className="sm:hidden">Pos</span>
              </TabsTrigger>
              <TabsTrigger value="assembly" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Assembly Templates</span>
                <span className="sm:hidden">Asm</span>
              </TabsTrigger>
              <TabsTrigger value="labor" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <FileUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Labor Defaults</span>
                <span className="sm:hidden">Labor</span>
              </TabsTrigger>
              <TabsTrigger value="rates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Labor Rates</span>
                <span className="sm:hidden">Rates</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="fabrication" className="mt-4">
            <FabricationStandardsTab />
          </TabsContent>

          <TabsContent value="welding" className="mt-4">
            <WeldingStandardsTab />
          </TabsContent>

          <TabsContent value="drilling" className="mt-4">
            <DrillingStandardsTab />
          </TabsContent>

          <TabsContent value="cutting" className="mt-4">
            <CuttingStandardsTab />
          </TabsContent>

          <TabsContent value="position" className="mt-4">
            <PositionFactorsTab />
          </TabsContent>

          <TabsContent value="assembly" className="mt-4">
            <AssemblyTemplatesTab />
          </TabsContent>

          <TabsContent value="labor" className="mt-4">
            <LaborDefaultsTab />
          </TabsContent>

          <TabsContent value="rates" className="mt-4">
            <LaborRatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Fabrication Standards Tab Component
function FabricationStandardsTab() {
  const [settings, setSettings] = useState({
    defaultKerf: 2.4,
    defaultTolerance: 0.5,
    minimumOffcutLength: 500,
    materialWasteAllowance: 5,
    standardLengths: [6000, 9000, 12000]
  });
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['/api/operations/fabrication-standards'],
    retry: false
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (existingSettings && typeof existingSettings === 'object') {
      const settings = existingSettings as any;
      setSettings({
        defaultKerf: settings.defaultKerf || 2.4,
        defaultTolerance: settings.defaultTolerance || 0.5,
        minimumOffcutLength: settings.minimumOffcutLength || 500,
        materialWasteAllowance: settings.materialWasteAllowance || 5,
        standardLengths: settings.standardLengths || [6000, 9000, 12000]
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/operations/fabrication-standards', 'PUT', settings);
    },
    onSuccess: () => {
      toast({ title: "Fabrication settings saved successfully" });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/operations/fabrication-standards'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to save settings", 
        variant: "destructive" 
      });
    }
  });

  const updateSetting = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fabrication Standards</CardTitle>
          <CardDescription>
            Configure default settings for cutting optimization and fabrication processes
          </CardDescription>
        </div>
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={!hasChanges || saveMutation.isPending}
          size="sm"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Kerf Width */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="kerf">Default Kerf Width (mm)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Standard cutting kerf width used in optimization calculations.</p>
                  <p>Typical values: 2.4mm for plasma, 1.5mm for laser</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="kerf"
            type="number"
            step="0.1"
            value={settings.defaultKerf}
            onChange={(e) => updateSetting('defaultKerf', parseFloat(e.target.value) || 2.4)}
            className="max-w-xs"
          />
        </div>

        {/* Default Tolerance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="tolerance">Default Tolerance (mm)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Additional allowance for cutting accuracy.</p>
                  <p>Applied to all cut lengths in optimization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="tolerance"
            type="number"
            step="0.1"
            value={settings.defaultTolerance}
            onChange={(e) => updateSetting('defaultTolerance', parseFloat(e.target.value) || 0.5)}
            className="max-w-xs"
          />
        </div>

        {/* Minimum Offcut Length */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="offcut">Minimum Offcut Length (mm)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Minimum length of steel to save as offcut.</p>
                  <p>Pieces shorter than this are treated as waste</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="offcut"
            type="number"
            value={settings.minimumOffcutLength}
            onChange={(e) => updateSetting('minimumOffcutLength', parseInt(e.target.value) || 500)}
            className="max-w-xs"
          />
        </div>

        {/* Material Waste Allowance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="waste">Material Waste Allowance (%)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expected percentage of material waste.</p>
                  <p>Used in cost calculations and quotations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="waste"
            type="number"
            step="0.5"
            value={settings.materialWasteAllowance}
            onChange={(e) => updateSetting('materialWasteAllowance', parseFloat(e.target.value) || 5)}
            className="max-w-xs"
          />
        </div>

        {/* Standard Lengths */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Standard Lengths (mm)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Common stock lengths available from suppliers.</p>
                  <p>Used as defaults in cutting optimization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2 flex-wrap">
            {settings.standardLengths.map((length, index) => (
              <div key={index} className="flex items-center gap-1">
                <Input
                  type="number"
                  value={length}
                  onChange={(e) => {
                    const newLengths = [...settings.standardLengths];
                    newLengths[index] = parseInt(e.target.value) || 0;
                    updateSetting('standardLengths', newLengths);
                  }}
                  className="w-24"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newLengths = settings.standardLengths.filter((_, i) => i !== index);
                    updateSetting('standardLengths', newLengths);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                updateSetting('standardLengths', [...settings.standardLengths, 6000]);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Placeholder components for other tabs
function WeldingStandardsTab() {
  return <Card><CardContent className="p-6">Welding Standards - Implementation Coming Soon</CardContent></Card>;
}

function DrillingStandardsTab() {
  return <Card><CardContent className="p-6">Drilling Standards - Implementation Coming Soon</CardContent></Card>;
}

function CuttingStandardsTab() {
  return <Card><CardContent className="p-6">Cutting Standards - Implementation Coming Soon</CardContent></Card>;
}

function PositionFactorsTab() {
  return <Card><CardContent className="p-6">Position Factors - Implementation Coming Soon</CardContent></Card>;
}

function AssemblyTemplatesTab() {
  return <Card><CardContent className="p-6">Assembly Templates - Implementation Coming Soon</CardContent></Card>;
}

// Labor Defaults Tab Component
function LaborDefaultsTab() {
  const { data: defaults = [], isLoading } = useQuery({
    queryKey: ['/api/operations/labor-defaults']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/operations/labor-defaults/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Labor default deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/labor-defaults'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete labor default", 
        variant: "destructive" 
      });
    }
  });

  const handleCopy = (item: any) => {
    toast({ title: "Copy functionality coming soon" });
  };

  const handleEdit = (item: any) => {
    toast({ title: "Edit functionality coming soon" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Labor Defaults</CardTitle>
            <CardDescription>Set default labor allocations and site premiums</CardDescription>
          </div>
          <Button onClick={() => toast({ title: "Create functionality coming soon" })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Default
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b">
                <th className="text-left p-2" style={{ width: '20%' }}>Operation Type</th>
                <th className="text-left p-2" style={{ width: '15%' }}>Default Allocation</th>
                <th className="text-left p-2" style={{ width: '15%' }}>Site Premium %</th>
                <th className="text-left p-2" style={{ width: '25%' }}>Description</th>
                <th className="text-left p-2" style={{ width: '10%' }}>Status</th>
                <th className="labor-actions-header text-right p-2" style={{ width: '15%', minWidth: '120px', visibility: 'visible', display: 'table-cell' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(defaults) && defaults.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">
                    {item.operation_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="p-2">
                    <span className="capitalize">{item.default_allocation}</span>
                  </td>
                  <td className="p-2">{item.site_premium_percentage}%</td>
                  <td className="p-2 text-sm text-muted-foreground">{item.description}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2 text-right" style={{ minWidth: '120px' }}>
                    <div className="flex gap-1 justify-end" style={{ visibility: 'visible', opacity: 1 }}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="h-8 px-2"
                        style={{ visibility: 'visible', opacity: 1, display: 'inline-flex' }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="h-8 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        style={{ visibility: 'visible', opacity: 1, display: 'inline-flex' }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Labor Rates Tab Component
function LaborRatesTab() {
  const { data: laborRates = [], isLoading } = useQuery({
    queryKey: ['/api/labor-rate-profiles']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/labor-rate-profiles/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Labor rate profile deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/labor-rate-profiles'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete labor rate profile", 
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Labor Rate Profiles</CardTitle>
            <CardDescription>Configure hourly rates for different skill levels and operation types</CardDescription>
          </div>
          <Button onClick={() => toast({ title: "Create functionality coming soon" })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b">
                <th className="text-left p-2" style={{ width: '20%' }}>Profile Name</th>
                <th className="text-left p-2" style={{ width: '15%' }}>Skill Level</th>
                <th className="text-left p-2" style={{ width: '15%' }}>Base Rate</th>
                <th className="text-left p-2" style={{ width: '15%' }}>Overtime Rate</th>
                <th className="text-left p-2" style={{ width: '20%' }}>Description</th>
                <th className="text-left p-2" style={{ width: '10%' }}>Status</th>
                <th className="text-right p-2" style={{ width: '5%', minWidth: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(laborRates) && laborRates.length > 0 ? (
                laborRates.map((rate: any) => (
                  <tr key={rate.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{rate.profile_name}</td>
                    <td className="p-2">{rate.skill_level}</td>
                    <td className="p-2">${rate.base_rate}/hr</td>
                    <td className="p-2">${rate.overtime_rate}/hr</td>
                    <td className="p-2 text-sm text-muted-foreground">{rate.description || '-'}</td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded ${rate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toast({ title: "Edit functionality coming soon" })}
                          className="h-8 px-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteMutation.mutate(rate.id)}
                          className="h-8 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No labor rate profiles configured. Click "Add Rate Profile" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}