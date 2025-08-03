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
import { Loader2, Plus, Pencil, Trash2, Download, Upload, Flame, Wrench, Scissors, Settings2, Package, FileUp, Zap, MoreVertical, Copy, Edit } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("fabrication"); // Start with fabrication tab to ensure visibility
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
      <div className="min-h-screen bg-background p-2 sm:p-4 space-y-4" data-version={`v3-${Date.now()}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Operations Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Configure time standards and defaults for estimation calculations
            </p>
            <p className="text-xs text-green-600 mt-1">Updated: August 3, 2025 - v5</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div 
          className="w-full overflow-x-auto pb-2" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'auto',
            scrollbarWidth: 'thin'
          }}
        >
          <TabsList 
            className="flex flex-nowrap gap-1 bg-muted/30 p-1 w-max" 
            style={{ 
              minWidth: '100%',
              display: 'flex',
              flexDirection: 'row' 
            }}
          >
            <TabsTrigger value="fabrication" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Fabrication</span>
              <span className="sm:hidden">Fab</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure default settings for cutting optimization and fabrication processes</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="welding" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Welding</span>
              <span className="sm:hidden">Weld</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure time standards for different welding types and positions</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="drilling" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Drilling</span>
              <span className="sm:hidden">Drill</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure time standards for different hole drilling operations</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="cutting" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <Scissors className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cutting</span>
              <span className="sm:hidden">Cut</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure time standards for different cutting methods and materials</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="position" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <Settings2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Position Factors</span>
              <span className="sm:hidden">Pos</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure difficulty multipliers for different working positions</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="assembly" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Assembly Templates</span>
              <span className="sm:hidden">Asm</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure standard assembly templates for common steel structures</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="labor" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 group">
              <FileUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Labor Defaults</span>
              <span className="sm:hidden">Labor</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure default labor rates and times for different operations</p>
                </TooltipContent>
              </Tooltip>
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
      setSettings({
        defaultKerf: existingSettings.defaultKerf || 2.4,
        defaultTolerance: existingSettings.defaultTolerance || 0.5,
        minimumOffcutLength: existingSettings.minimumOffcutLength || 500,
        materialWasteAllowance: existingSettings.materialWasteAllowance || 5,
        standardLengths: existingSettings.standardLengths || [6000, 9000, 12000]
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
                  <p>Additional tolerance added to cuts for safety margin</p>
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
                  <p>Minimum length for a piece to be saved as a remnant</p>
                  <p>Pieces shorter than this are considered waste</p>
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
                  <p>Expected waste percentage for material ordering</p>
                  <p>Typically 5-10% depending on material type</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="waste"
            type="number"
            step="0.1"
            value={settings.materialWasteAllowance}
            onChange={(e) => updateSetting('materialWasteAllowance', parseFloat(e.target.value) || 5)}
            className="max-w-xs"
          />
        </div>

        {/* Standard Lengths */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Standard Stock Lengths (mm)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Common stock lengths available from suppliers</p>
                  <p>Used for optimization calculations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-wrap gap-2">
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
              Add Length
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Welding Standards Tab Component
function WeldingStandardsTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<WeldingStandard | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: standards, isLoading } = useQuery({
    queryKey: ['/api/operations/welding-standards']
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/operations/welding-standards/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations/welding-standards'] });
      toast({ title: "Welding standard deleted successfully" });
    }
  });

  const form = useForm<WeldingStandard>({
    resolver: zodResolver(weldingStandardSchema),
    defaultValues: {
      name: "",
      weld_type: "fillet",
      size: null,
      time_per_meter: 0,
      description: "",
      is_active: true
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: WeldingStandard) => {
      if (editingStandard?.id) {
        return apiRequest(`/api/operations/welding-standards/${editingStandard.id}`, 'PUT', data);
      } else {
        return apiRequest('/api/operations/welding-standards', 'POST', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations/welding-standards'] });
      toast({ 
        title: editingStandard ? "Welding standard updated" : "Welding standard created"
      });
      setIsAddOpen(false);
      setEditingStandard(null);
      form.reset();
    }
  });

  const handleEdit = (standard: WeldingStandard) => {
    setEditingStandard(standard);
    form.reset(standard);
    setIsAddOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddOpen(false);
    setEditingStandard(null);
    form.reset();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Welding Standards</CardTitle>
            <CardDescription>
              Configure time standards for different weld types and sizes
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Standard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStandard ? "Edit" : "Add"} Welding Standard</DialogTitle>
                <DialogDescription>
                  Define time standards for welding operations
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="6mm Fillet Weld" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weld_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weld Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fillet">Fillet Weld</SelectItem>
                            <SelectItem value="butt_single_v">Single-V Butt Weld</SelectItem>
                            <SelectItem value="butt_double_v">Double-V Butt Weld</SelectItem>
                            <SelectItem value="butt_single_bevel">Single-Bevel Butt Weld</SelectItem>
                            <SelectItem value="butt_double_bevel">Double-Bevel Butt Weld</SelectItem>
                            <SelectItem value="seal">Seal Weld</SelectItem>
                            <SelectItem value="plug">Plug Weld</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Size (mm)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="inline-block ml-1 h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Leave blank for butt welds</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            placeholder="6" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time_per_meter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time per Meter (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="15" {...field} />
                        </FormControl>
                        <FormDescription>
                          Base time for flat position welding
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable this standard for use in estimations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingStandard ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Size (mm)</th>
                <th className="text-left p-2">Time/Meter</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(standards) && standards.map((standard: WeldingStandard) => (
                <tr key={standard.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{standard.name}</td>
                  <td className="p-2">{standard.weld_type.replace(/_/g, ' ')}</td>
                  <td className="p-2">{standard.size || '-'}</td>
                  <td className="p-2">{standard.time_per_meter} min</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${standard.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {standard.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" style={{ visibility: "visible", opacity: 1, display: "inline-flex" }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(standard)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(standard)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => standard.id && deleteMutation.mutate(standard.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

// Drilling Standards Tab
function DrillingStandardsTab() {
  const { data: standards = [], isLoading } = useQuery({
    queryKey: ['/api/operations/drilling-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/operations/drilling-standards/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Drilling standard deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/drilling-standards'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete drilling standard", 
        variant: "destructive" 
      });
    }
  });

  const handleCopy = (standard: any) => {
    // TODO: Implement copy functionality
    toast({ title: "Copy functionality coming soon" });
  };

  const handleEdit = (standard: any) => {
    // TODO: Implement edit functionality
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
        <CardTitle>Drilling Standards</CardTitle>
        <CardDescription>Configure time standards for hole drilling operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Size (mm)</th>
                <th className="text-left p-2">Material Type</th>
                <th className="text-left p-2">Time/Hole</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(standards) && standards.map((standard: any) => (
                <tr key={standard.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{standard.name}</td>
                  <td className="p-2">{standard.hole_diameter || '-'}</td>
                  <td className="p-2">{standard.material_type?.replace(/_/g, ' ')}</td>
                  <td className="p-2">{standard.time_per_hole} min</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${standard.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {standard.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" style={{ visibility: "visible", opacity: 1, display: "inline-flex" }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(standard)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(standard)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(standard.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

function CuttingStandardsTab() {
  const { data: standards = [], isLoading } = useQuery({
    queryKey: ['/api/operations/cutting-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/operations/cutting-standards/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Cutting standard deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/cutting-standards'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete cutting standard", 
        variant: "destructive" 
      });
    }
  });

  const handleCopy = (standard: any) => {
    toast({ title: "Copy functionality coming soon" });
  };

  const handleEdit = (standard: any) => {
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
        <CardTitle>Cutting Standards</CardTitle>
        <CardDescription>Configure time standards for cutting operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Material Type</th>
                <th className="text-left p-2">Thickness Range (mm)</th>
                <th className="text-left p-2">Time/Meter</th>
                <th className="text-left p-2">Equipment</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(standards) && standards.map((standard: any) => (
                <tr key={standard.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{standard.name}</td>
                  <td className="p-2">{standard.material_type?.replace(/_/g, ' ')}</td>
                  <td className="p-2">
                    {standard.thickness_min || 0} - {standard.thickness_max || '∞'}
                  </td>
                  <td className="p-2">{standard.time_per_meter} min</td>
                  <td className="p-2">{standard.equipment || '-'}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${standard.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {standard.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" style={{ visibility: "visible", opacity: 1, display: "inline-flex" }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(standard)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(standard)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(standard.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

function PositionFactorsTab() {
  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['/api/operations/position-factors']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/operations/position-factors/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Position factor deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/position-factors'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete position factor", 
        variant: "destructive" 
      });
    }
  });

  const handleCopy = (factor: any) => {
    toast({ title: "Copy functionality coming soon" });
  };

  const handleEdit = (factor: any) => {
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
        <CardTitle>Position Factors</CardTitle>
        <CardDescription>Configure multipliers for different welding positions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Position</th>
                <th className="text-left p-2">Factor</th>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(factors) && factors.map((factor: any) => (
                <tr key={factor.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{factor.position}</td>
                  <td className="p-2">{factor.factor}x</td>
                  <td className="p-2 text-sm text-muted-foreground">{factor.description}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${factor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {factor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" style={{ visibility: "visible", opacity: 1, display: "inline-flex" }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(factor)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(factor)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(factor.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

function AssemblyTemplatesTab() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/operations/assembly-templates']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/operations/assembly-templates/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Assembly template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/assembly-templates'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete assembly template", 
        variant: "destructive" 
      });
    }
  });

  const handleCopy = (template: any) => {
    toast({ title: "Copy functionality coming soon" });
  };

  const handleEdit = (template: any) => {
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
        <CardTitle>Assembly Templates</CardTitle>
        <CardDescription>Create reusable assembly templates with predefined components</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Main Material</th>
                <th className="text-left p-2">Components</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(templates) && templates.map((template: any) => (
                <tr key={template.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{template.code}</td>
                  <td className="p-2">{template.name}</td>
                  <td className="p-2">{template.main_material || '-'}</td>
                  <td className="p-2">
                    <div className="text-sm">
                      {Array.isArray(template.components) ? template.components.length : 0} items
                    </div>
                  </td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" style={{ visibility: "visible", opacity: 1, display: "inline-flex" }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        <CardTitle>Labor Defaults</CardTitle>
        <CardDescription>Set default labor allocations and site premiums</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Operation Type</th>
                <th className="text-left p-2">Default Allocation</th>
                <th className="text-left p-2">Site Premium %</th>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"></th>
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
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" style={{ visibility: "visible", opacity: 1, display: "inline-flex" }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(item)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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