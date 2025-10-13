import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Plus, Info, ChevronDown, Settings2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { StandardTooltip } from '@/components/ui/tooltip-standard';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import ConsumptionRates from '@/components/organization-settings/consumption-rates';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Helper function to safely convert values to numbers
const safeToNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Tab configuration for cleaner code
const tabs = [
  {
    value: 'fabrication',
    label: 'Fabrication',
    tooltip: 'Configure workshop operations settings including remnant thresholds, quality standards, and safety protocols'
  },
  {
    value: 'welding',
    label: 'Welding', 
    tooltip: 'Manage welding time standards for different weld types, sizes, and materials (time per meter)'
  },
  {
    value: 'drilling',
    label: 'Drilling',
    tooltip: 'Set drilling time standards for various hole diameters, materials, and machine types'
  },
  {
    value: 'cutting', 
    label: 'Cutting',
    tooltip: 'Configure cutting time standards for different materials, thicknesses, and machine types'
  },
  {
    value: 'edge-preparations',
    label: 'Edge Prep',
    tooltip: 'Define edge preparation standards for welding including bevels, grooves, and chamfers'
  },
  {
    value: 'annotation-themes',
    label: 'PDF Themes',
    tooltip: 'Configure color themes and styles for PDF markup and annotations'
  },
  {
    value: 'position-factors',
    label: 'Positions',
    tooltip: 'Define difficulty multipliers for operations in challenging positions (overhead, vertical, confined spaces)'
  },
  {
    value: 'assembly-templates',
    label: 'Assembly', 
    tooltip: 'Create reusable assembly templates with predefined labor allocations for common configurations'
  },
  {
    value: 'labor-defaults',
    label: 'Labor Defaults',
    tooltip: 'Set default labor allocations and site premiums for different operation types used in estimations'
  },
  {
    value: 'labor-rates',
    label: 'Labor Rates',
    tooltip: 'Manage role-based labor rates with skill levels, allowances, and overtime multipliers for accurate cost estimation'
  },
  {
    value: 'consumption-rates',
    label: 'Consumption Rates',
    tooltip: 'Configure consumption rates for materials and consumables used in operations'
  }
];

export default function OperationsSettings() {
  // Debug log to verify this component is loaded
  console.log("OperationsSettings v2 component loaded");
  
  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Operations Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure time standards and defaults for estimation calculations.
          </p>
        </div>

        <Tabs defaultValue="fabrication" className="w-full">
          {/* Tabs on single line with proper spacing */}
          <TabsList className="grid grid-cols-11 h-10 p-1 bg-muted w-full gap-0">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className="px-2 py-1 text-xs font-medium whitespace-nowrap data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-colors"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="fabrication" className="mt-4">
            <FabricationTab />
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

          <TabsContent value="edge-preparations" className="mt-4">
            <EdgePreparationsTab />
          </TabsContent>

          <TabsContent value="annotation-themes" className="mt-4">
            <AnnotationThemesTab />
          </TabsContent>

          <TabsContent value="position-factors" className="mt-4">
            <PositionFactorsTab />
          </TabsContent>

          <TabsContent value="assembly-templates" className="mt-4">
            <AssemblyTemplatesTab />
          </TabsContent>

          <TabsContent value="labor-defaults" className="mt-4">
            <LaborDefaultsTab />
          </TabsContent>
          
          <TabsContent value="labor-rates" className="mt-4">
            <LaborRatesTab />
          </TabsContent>
          
          <TabsContent value="consumption-rates" className="mt-4">
            <ConsumptionRates />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Reusable table component for consistent rendering
function StandardsTable({ 
  data, 
  columns, 
  onEdit, 
  onDelete,
  emptyMessage = "No standards configured"
}: {
  data: any[];
  columns: { key: string; header: string; render?: (value: any, row: any) => React.ReactNode }[];
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  emptyMessage?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key}>{col.header}</TableHead>
          ))}
          <TableHead className="text-right w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((row) => (
            <TableRow key={row.id}>
              {columns.map(col => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDelete(row.id)}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// Fabrication Tab Component
function FabricationTab() {
  const { data: settings, isLoading } = useQuery<{
    defaultKerf?: number;
    defaultMaterialHandlingTime?: number;
    defaultSetupTime?: number;
    defaultMarkupPercentage?: number;
    defaultOverheadPercentage?: number;
    defaultContingencyPercentage?: number;
    defaultProfitMargin?: number;
    defaultHourlyRate?: number;
    defaultShopRate?: number;
  }>({
    queryKey: ['/api/operations/fabrication-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    defaultKerf: 2.4,
    defaultMaterialHandlingTime: 15,
    defaultSetupTime: 30,
    defaultMarkupPercentage: 20,
    defaultOverheadPercentage: 15,
    defaultContingencyPercentage: 10,
    defaultProfitMargin: 25,
    defaultHourlyRate: 120,
    defaultShopRate: 85
  });
  
  useEffect(() => {
    if (settings) {
      setForm({
        defaultKerf: settings.defaultKerf || 2.4,
        defaultMaterialHandlingTime: settings.defaultMaterialHandlingTime || 15,
        defaultSetupTime: settings.defaultSetupTime || 30,
        defaultMarkupPercentage: settings.defaultMarkupPercentage || 20,
        defaultOverheadPercentage: settings.defaultOverheadPercentage || 15,
        defaultContingencyPercentage: settings.defaultContingencyPercentage || 10,
        defaultProfitMargin: settings.defaultProfitMargin || 25,
        defaultHourlyRate: settings.defaultHourlyRate || 120,
        defaultShopRate: settings.defaultShopRate || 85
      });
    }
  }, [settings]);
  
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return apiRequest('/api/operations/fabrication-standards', 'PUT', data);
    },
    onSuccess: () => {
      toast({ title: "Fabrication settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/fabrication-standards'] });
    },
    onError: () => {
      toast({ 
        title: "Failed to save fabrication settings", 
        variant: "destructive" 
      });
    }
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fabrication Standards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">Production Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="defaultKerf">Default Kerf Width (mm)</Label>
              <Input
                id="defaultKerf"
                type="number"
                step="0.1"
                value={form.defaultKerf}
                onChange={(e) => setForm({ ...form, defaultKerf: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultMaterialHandlingTime">Material Handling Time (min)</Label>
              <Input
                id="defaultMaterialHandlingTime"
                type="number"
                value={form.defaultMaterialHandlingTime}
                onChange={(e) => setForm({ ...form, defaultMaterialHandlingTime: parseInt(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultSetupTime">Default Setup Time (min)</Label>
              <Input
                id="defaultSetupTime"
                type="number"
                value={form.defaultSetupTime}
                onChange={(e) => setForm({ ...form, defaultSetupTime: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Financial Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="defaultMarkupPercentage">Default Markup (%)</Label>
              <Input
                id="defaultMarkupPercentage"
                type="number"
                step="0.1"
                value={form.defaultMarkupPercentage}
                onChange={(e) => setForm({ ...form, defaultMarkupPercentage: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultOverheadPercentage">Default Overhead (%)</Label>
              <Input
                id="defaultOverheadPercentage"
                type="number"
                step="0.1"
                value={form.defaultOverheadPercentage}
                onChange={(e) => setForm({ ...form, defaultOverheadPercentage: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultContingencyPercentage">Default Contingency (%)</Label>
              <Input
                id="defaultContingencyPercentage"
                type="number"
                step="0.1"
                value={form.defaultContingencyPercentage}
                onChange={(e) => setForm({ ...form, defaultContingencyPercentage: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultProfitMargin">Default Profit Margin (%)</Label>
              <Input
                id="defaultProfitMargin"
                type="number"
                step="0.1"
                value={form.defaultProfitMargin}
                onChange={(e) => setForm({ ...form, defaultProfitMargin: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultHourlyRate">Default Hourly Rate ($/hr)</Label>
              <Input
                id="defaultHourlyRate"
                type="number"
                step="0.01"
                value={form.defaultHourlyRate}
                onChange={(e) => setForm({ ...form, defaultHourlyRate: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultShopRate">Default Shop Rate ($/hr)</Label>
              <Input
                id="defaultShopRate"
                type="number"
                step="0.01"
                value={form.defaultShopRate}
                onChange={(e) => setForm({ ...form, defaultShopRate: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

// Assembly Template Form
function AssemblyTemplateForm({ template, onClose }: { template: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    code: template?.code || '',
    name: template?.name || '',
    description: template?.description || '',
    main_material: template?.main_material || '',
    components: template?.components || [],
    is_active: template?.is_active !== false
  });
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = template 
        ? `/api/operations/assembly-templates/${template.id}`
        : '/api/operations/assembly-templates';
      const method = template ? 'PUT' : 'POST';
      
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({ title: `Assembly template ${template ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/assembly-templates'] });
      onClose();
    }
  });
  
  const handleSubmit = () => {
    mutation.mutate(form);
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g., ASM001"
          />
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Standard Beam Connection"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Template description"
        />
      </div>
      
      <div>
        <Label htmlFor="main_material">Main Material</Label>
        <Input
          id="main_material"
          value={form.main_material}
          onChange={(e) => setForm({ ...form, main_material: e.target.value })}
          placeholder="e.g., 250UC89.5"
        />
      </div>
      
      <div>
        <Label>Components</Label>
        <div className="space-y-2">
          {form.components.map((component: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={component}
                onChange={(e) => {
                  const newComponents = [...form.components];
                  newComponents[index] = e.target.value;
                  setForm({ ...form, components: newComponents });
                }}
                placeholder="Component description"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newComponents = form.components.filter((_: any, i: number) => i !== index);
                  setForm({ ...form, components: newComponents });
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setForm({ ...form, components: [...form.components, ''] })}
          >
            Add Component
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active
        </Label>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// Labor Default Form
function LaborDefaultForm({ defaultItem, onClose }: { defaultItem: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    operation_type: defaultItem?.operation_type || '',
    description: defaultItem?.description || '',
    default_allocation: defaultItem?.default_allocation || 'workshop',
    site_premium_percentage: defaultItem?.site_premium_percentage || 20,
    is_active: defaultItem?.is_active !== false
  });
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = defaultItem 
        ? `/api/operations/labor-defaults/${defaultItem.id}`
        : '/api/operations/labor-defaults';
      const method = defaultItem ? 'PUT' : 'POST';
      
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({ title: `Labor default ${defaultItem ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/labor-defaults'] });
      onClose();
    },
    onError: (error) => {
      toast({ 
        title: "Error saving labor default", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });
  
  const handleSubmit = () => {
    if (!form.operation_type) {
      toast({ 
        title: "Operation type is required",
        variant: "destructive" 
      });
      return;
    }
    mutation.mutate(form);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="operation_type">Operation Type</Label>
        <Select 
          value={form.operation_type} 
          onValueChange={(value) => setForm({ ...form, operation_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="welding">Welding</SelectItem>
            <SelectItem value="cutting">Cutting</SelectItem>
            <SelectItem value="drilling">Drilling</SelectItem>
            <SelectItem value="assembly">Assembly</SelectItem>
            <SelectItem value="fabrication">Fabrication</SelectItem>
            <SelectItem value="grinding">Grinding</SelectItem>
            <SelectItem value="painting">Painting</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Operation description"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="default_allocation">Default Allocation</Label>
          <Select 
            value={form.default_allocation} 
            onValueChange={(value) => setForm({ ...form, default_allocation: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="site_premium_percentage">Site Premium (%)</Label>
          <Input
            id="site_premium_percentage"
            type="number"
            step="1"
            value={form.site_premium_percentage}
            onChange={(e) => setForm({ ...form, site_premium_percentage: parseFloat(e.target.value) || 0 })}
            placeholder="Extra % for on-site work"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active
        </Label>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// Welding Standards Tab
function WeldingStandardsTab() {
  const { data: standards = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/welding-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingStandard, setEditingStandard] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/welding-standards/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Welding standard deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/welding-standards'] });
    }
  });

  const handleEdit = (standard: any) => {
    setEditingStandard(standard);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStandard(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'size', header: 'Size' },
    { key: 'material_type', header: 'Material Type', render: (value: string) => value?.replace(/_/g, ' ') },
    { key: 'time_per_meter', header: 'Time/Meter', render: (value: number) => `${value} min` },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Welding Standards</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStandard ? 'Edit Welding Standard' : 'Create Welding Standard'}
              </DialogTitle>
            </DialogHeader>
            <WeldingStandardForm 
              standard={editingStandard}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={standards}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No welding standards configured"
        />
      </CardContent>
    </Card>
  );
}

// Annotation Themes Tab
function AnnotationThemesTab() {
  const { data: themes = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/annotation-themes']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTheme, setEditingTheme] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/annotation-themes/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Annotation theme deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/annotation-themes'] });
    }
  });

  const handleEdit = (theme: any) => {
    setEditingTheme(theme);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTheme(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description', render: (value: string) => value || '-' },
    { 
      key: 'beamColor', 
      header: 'Beam',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border" style={{ backgroundColor: value }} />
          <span className="text-xs">{value}</span>
        </div>
      )
    },
    { 
      key: 'columnColor', 
      header: 'Column',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border" style={{ backgroundColor: value }} />
          <span className="text-xs">{value}</span>
        </div>
      )
    },
    { 
      key: 'plateColor', 
      header: 'Plate',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border" style={{ backgroundColor: value }} />
          <span className="text-xs">{value}</span>
        </div>
      )
    },
    { key: 'lineWidth', header: 'Line Width', render: (value: number) => `${value}px` },
    { key: 'lineStyle', header: 'Line Style' },
    { 
      key: 'isDefault', 
      header: 'Default',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Default' : 'Custom'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Annotation Themes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingTheme ? 'Edit Annotation Theme' : 'Create Annotation Theme'}
              </DialogTitle>
            </DialogHeader>
            <AnnotationThemeForm 
              theme={editingTheme}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={themes}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No annotation themes configured"
        />
      </CardContent>
    </Card>
  );
}

// Edge Preparations Tab
function EdgePreparationsTab() {
  const { data: preparations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/edge-preparations']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPreparation, setEditingPreparation] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/edge-preparations/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Edge preparation deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/edge-preparations'] });
    }
  });

  const handleEdit = (preparation: any) => {
    setEditingPreparation(preparation);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPreparation(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'preparation_type', header: 'Type', render: (value: string) => value?.replace(/_/g, ' ') },
    { 
      key: 'angle_degrees', 
      header: 'Angle',
      render: (value: any) => value ? `${value}°` : '-'
    },
    { 
      key: 'applicable_thickness_min', 
      header: 'Thickness Range',
      render: (_: any, row: any) => {
        if (row.applicable_thickness_min || row.applicable_thickness_max) {
          return `${row.applicable_thickness_min || 0}-${row.applicable_thickness_max || '∞'}mm`;
        }
        return '-';
      }
    },
    { key: 'time_per_meter', header: 'Time/Meter', render: (value: number) => `${value} min` },
    { key: 'equipment', header: 'Equipment', render: (value: string) => value || '-' },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edge Preparations</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPreparation ? 'Edit Edge Preparation' : 'Create Edge Preparation'}
              </DialogTitle>
            </DialogHeader>
            <EdgePreparationForm 
              preparation={editingPreparation}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={preparations}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No edge preparations configured"
        />
      </CardContent>
    </Card>
  );
}

// Drilling Standards Tab
function DrillingStandardsTab() {
  const { data: standards = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/drilling-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingStandard, setEditingStandard] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/drilling-standards/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Drilling standard deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/drilling-standards'] });
    }
  });

  const handleEdit = (standard: any) => {
    setEditingStandard(standard);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStandard(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'hole_diameter', header: 'Size (mm)', render: (value: number) => value || '-' },
    { key: 'material_type', header: 'Material Type', render: (value: string) => value?.replace(/_/g, ' ') },
    { key: 'time_per_hole', header: 'Time/Hole', render: (value: number) => `${value} min` },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Drilling Standards</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStandard ? 'Edit Drilling Standard' : 'Create Drilling Standard'}
              </DialogTitle>
            </DialogHeader>
            <DrillingStandardForm 
              standard={editingStandard}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={standards}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No drilling standards configured"
        />
      </CardContent>
    </Card>
  );
}

// Cutting Standards Tab
function CuttingStandardsTab() {
  const { data: standards = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/cutting-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingStandard, setEditingStandard] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/cutting-standards/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Cutting standard deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/cutting-standards'] });
    }
  });

  const handleEdit = (standard: any) => {
    setEditingStandard(standard);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStandard(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'material_type', header: 'Material Type', render: (value: string) => value?.replace(/_/g, ' ') },
    { 
      key: 'thickness_range', 
      header: 'Thickness Range',
      render: (_: any, row: any) => `${row.thickness_min}-${row.thickness_max}mm`
    },
    { key: 'time_per_meter', header: 'Time/Meter', render: (value: number) => `${value} min` },
    { key: 'equipment', header: 'Equipment' },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cutting Standards</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStandard ? 'Edit Cutting Standard' : 'Create Cutting Standard'}
              </DialogTitle>
            </DialogHeader>
            <CuttingStandardForm 
              standard={editingStandard}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={standards}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No cutting standards configured"
        />
      </CardContent>
    </Card>
  );
}

// Position Factors Tab
function PositionFactorsTab() {
  const { data: factors = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/position-factors']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFactor, setEditingFactor] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/position-factors/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Position factor deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/position-factors'] });
    }
  });

  const handleEdit = (factor: any) => {
    setEditingFactor(factor);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingFactor(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'position', header: 'Position' },
    { key: 'description', header: 'Description' },
    { key: 'factor', header: 'Factor', render: (value: any) => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return numValue.toFixed(2);
    }},
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Position Factors</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFactor ? 'Edit Position Factor' : 'Create Position Factor'}
              </DialogTitle>
            </DialogHeader>
            <PositionFactorForm 
              factor={editingFactor}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={factors}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No position factors configured"
        />
      </CardContent>
    </Card>
  );
}

// Assembly Templates Tab
function AssemblyTemplatesTab() {
  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/assembly-templates']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/assembly-templates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Assembly template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/assembly-templates'] });
    }
  });

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    { key: 'main_material', header: 'Main Material' },
    { 
      key: 'components', 
      header: 'Components', 
      render: (value: string[]) => (
        <span className="text-sm">{(value || []).length} components</span>
      )
    },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Assembly Templates</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Assembly Template' : 'Create Assembly Template'}
              </DialogTitle>
            </DialogHeader>
            <AssemblyTemplateForm 
              template={editingTemplate}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={templates}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No assembly templates configured"
        />
      </CardContent>
    </Card>
  );
}

// Labor Defaults Tab
function LaborDefaultsTab() {
  const { data: defaults = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/operations/labor-defaults']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDefault, setEditingDefault] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/operations/labor-defaults/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Labor default deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/labor-defaults'] });
    }
  });

  const handleEdit = (defaultItem: any) => {
    setEditingDefault(defaultItem);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingDefault(null);
    setIsDialogOpen(true);
  };

  const columns = [
    { key: 'operation_type', header: 'Operation Type' },
    { key: 'description', header: 'Description' },
    { 
      key: 'default_allocation', 
      header: 'Default Allocation',
      render: (value: string) => (
        <span className={`text-xs px-2 py-1 rounded ${
          value === 'workshop' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {value === 'workshop' ? 'Workshop' : 'On-site'}
        </span>
      )
    },
    { 
      key: 'site_premium_percentage', 
      header: 'Site Premium (%)', 
      render: (value: any) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `${numValue.toFixed(0)}%`;
      }
    },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Labor Defaults</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDefault ? 'Edit Labor Default' : 'Create Labor Default'}
              </DialogTitle>
            </DialogHeader>
            <LaborDefaultForm 
              defaultItem={editingDefault}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <StandardsTable
          data={defaults}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          emptyMessage="No labor defaults configured"
        />
      </CardContent>
    </Card>
  );
}

function LaborRatesTab() {
  const [activeTab, setActiveTab] = useState('profiles');
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profiles">Rate Profiles</TabsTrigger>
          <TabsTrigger value="skill-levels">Skill Levels</TabsTrigger>
          <TabsTrigger value="role-rates">Role Rates</TabsTrigger>
          <TabsTrigger value="allowances">Allowances</TabsTrigger>
          <TabsTrigger value="history">Rate History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profiles">
          <LaborRateProfiles />
        </TabsContent>
        
        <TabsContent value="skill-levels">
          <SkillLevels />
        </TabsContent>
        
        <TabsContent value="role-rates">
          <RoleRates />
        </TabsContent>
        
        <TabsContent value="allowances">
          <LaborAllowances />
        </TabsContent>
        
        <TabsContent value="history">
          <RateHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LaborRateProfiles() {
  const { data: profiles = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/labor-rate-profiles']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/labor-rate-profiles/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Rate profile deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/labor-rate-profiles'] });
    }
  });

  const handleEdit = (profile: any) => {
    setEditingProfile(profile);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setIsDialogOpen(true);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Labor Rate Profiles</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? 'Edit Rate Profile' : 'Create Rate Profile'}
              </DialogTitle>
            </DialogHeader>
            <LaborRateProfileForm 
              profile={editingProfile}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile Name</TableHead>
              <TableHead>Base Rate ($/hr)</TableHead>
              <TableHead>Overtime Multiplier</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.name}</TableCell>
                <TableCell>${safeToNumber(profile.baseRate || profile.base_rate).toFixed(2)}</TableCell>
                <TableCell>{safeToNumber(profile.overtimeMultiplier || profile.overtime_multiplier || 1.50).toFixed(2)}x</TableCell>
                <TableCell>{profile.effectiveDate || profile.effective_date ? new Date(profile.effectiveDate || profile.effective_date).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    (profile.isActive ?? profile.is_active) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(profile.isActive ?? profile.is_active) ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(profile)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteMutation.mutate(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LaborRateProfileForm({ profile, onClose }: { profile: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: profile?.name || '',
    baseRate: safeToNumber(profile?.baseRate || profile?.base_rate || 0),
    overtimeMultiplier: safeToNumber(profile?.overtimeMultiplier || profile?.overtime_multiplier || 1.5),
    effectiveDate: profile?.effectiveDate || profile?.effective_date || new Date().toISOString().split('T')[0],
    isActive: profile?.isActive ?? profile?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = profile 
        ? `/api/labor-rate-profiles/${profile.id}`
        : '/api/labor-rate-profiles';
      return apiRequest(profile ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Rate profile ${profile ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/labor-rate-profiles'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Profile Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Standard Fabricator"
        />
      </div>
      
      <div>
        <Label htmlFor="baseRate">Base Rate ($/hr)</Label>
        <Input
          id="baseRate"
          type="number"
          step="0.01"
          value={form.baseRate}
          onChange={(e) => setForm({ ...form, baseRate: parseFloat(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="overtimeMultiplier">Overtime Multiplier</Label>
        <Input
          id="overtimeMultiplier"
          type="number"
          step="0.01"
          value={form.overtimeMultiplier}
          onChange={(e) => setForm({ ...form, overtimeMultiplier: parseFloat(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="effectiveDate">Effective Date</Label>
        <Input
          id="effectiveDate"
          type="date"
          value={form.effectiveDate}
          onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {profile ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function SkillLevels() {
  const { data: levels = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/skill-levels']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Skill Levels</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditingLevel(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Skill Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? 'Edit Skill Level' : 'Create Skill Level'}
              </DialogTitle>
            </DialogHeader>
            <SkillLevelForm 
              level={editingLevel}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level Name</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Experience Required</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.map((level) => (
              <TableRow key={level.id}>
                <TableCell className="font-medium">{level.name}</TableCell>
                <TableCell>{safeToNumber(level.multiplier || 1).toFixed(2)}x</TableCell>
                <TableCell>{level.description}</TableCell>
                <TableCell>{level.required_experience || level.requiredExperience || 0} years</TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => { setEditingLevel(level); setIsDialogOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SkillLevelForm({ level, onClose }: { level: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: level?.name || '',
    multiplier: level?.multiplier || 1.0,
    description: level?.description || '',
    requiredExperience: level?.required_experience || level?.requiredExperience || 0
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = level 
        ? `/api/skill-levels/${level.id}`
        : '/api/skill-levels';
      const payload = {
        name: data.name,
        multiplier: data.multiplier,
        description: data.description,
        requiredExperience: data.requiredExperience
      };
      return apiRequest(level ? 'PUT' : 'POST', url, payload);
    },
    onSuccess: () => {
      toast({ title: `Skill level ${level ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/skill-levels'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Level Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Apprentice, Journeyman"
        />
      </div>
      
      <div>
        <Label htmlFor="multiplier">Rate Multiplier</Label>
        <Input
          id="multiplier"
          type="number"
          step="0.01"
          value={form.multiplier}
          onChange={(e) => {
            const value = e.target.value;
            const parsed = parseFloat(value);
            setForm({ ...form, multiplier: isNaN(parsed) ? 1.0 : parsed });
          }}
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of skill level"
        />
      </div>
      
      <div>
        <Label htmlFor="requiredExperience">Experience Required (years)</Label>
        <Input
          id="requiredExperience"
          type="number"
          value={form.requiredExperience}
          onChange={(e) => {
            const value = e.target.value;
            const parsed = parseInt(value);
            setForm({ ...form, requiredExperience: isNaN(parsed) ? 0 : parsed });
          }}
          min="0"
          placeholder="Years of experience required"
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {level ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function RoleRates() {
  const { data: profiles = [] } = useQuery<any[]>({
    queryKey: ['/api/labor-rate-profiles']
  });
  
  const { data: skillLevels = [] } = useQuery<any[]>({
    queryKey: ['/api/skill-levels']
  });
  
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['/api/team/departments']
  });
  
  const { data: roleRates = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/role-rates']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRate, setEditingRate] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Role-Based Rates</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditingRate(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRate ? 'Edit Role Rate' : 'Create Role Rate'}
              </DialogTitle>
            </DialogHeader>
            <RoleRateForm 
              rate={editingRate}
              profiles={profiles}
              skillLevels={skillLevels}
              departments={departments}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Skill Level</TableHead>
              <TableHead>Base Rate ($/hr)</TableHead>
              <TableHead>Effective Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleRates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-medium">{rate.roleName || rate.role || 'N/A'}</TableCell>
                <TableCell>{rate.departmentName || rate.department || 'N/A'}</TableCell>
                <TableCell>
                  {rate.skillLevelName || rate.skillLevel?.name || 'Standard'}
                  {rate.skillLevelMultiplier && ` (${safeToNumber(rate.skillLevelMultiplier).toFixed(2)}x)`}
                </TableCell>
                <TableCell>${safeToNumber(rate.baseRate || rate.laborRateProfile?.baseRate).toFixed(2)}</TableCell>
                <TableCell className="font-medium text-green-700">
                  ${(safeToNumber(rate.baseRate) * safeToNumber(rate.skillLevelMultiplier || 1)).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => { setEditingRate(rate); setIsDialogOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RoleRateForm({ rate, profiles, skillLevels, departments, onClose }: { 
  rate: any; 
  profiles: any[]; 
  skillLevels: any[];
  departments: any[];
  onClose: () => void 
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Ensure all values are safe
  const [form, setForm] = useState({
    laborRateProfileId: rate?.profileId || rate?.laborRateProfileId || '',
    skillLevelId: rate?.skillLevelId || '',
    role: rate?.roleName || rate?.role || '',
    departmentId: rate?.departmentId || '',
    department: rate?.department || '' // Keep for backward compatibility
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = rate 
        ? `/api/role-rates/${rate.id}`
        : '/api/role-rates';
      return apiRequest(rate ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Role rate ${rate ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/role-rates'] });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error saving role rate', 
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  });

  // Helper to safely get display text for profile
  const getProfileDisplay = (profile: any): string => {
    if (!profile) return 'Invalid Profile';
    const name = profile.name || 'Unnamed Profile';
    const baseRateValue = profile.baseRate || profile.base_rate || profile.base_rate_value || 0;
    const safeRate = safeToNumber(baseRateValue);
    return `${name} - $${safeRate.toFixed(2)}/hr`;
  };

  // Helper to safely get display text for skill level
  const getSkillLevelDisplay = (level: any): string => {
    if (!level) return 'Invalid Level';
    const name = level.name || 'Unnamed Level';
    const multiplierValue = level.multiplier || 1;
    const safeMultiplier = safeToNumber(multiplierValue);
    return `${name} (${safeMultiplier.toFixed(2)}x)`;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="e.g., Welder, Fabricator"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="departmentId">Department</Label>
        <Select 
          value={form.departmentId ? String(form.departmentId) : ''} 
          onValueChange={(value) => setForm({ ...form, departmentId: value ? parseInt(value) : 0 })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments && departments.length > 0 ? (
              departments.map((dept) => {
                if (!dept || !dept.id) return null;
                return (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="0" disabled>No departments available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="laborRateProfileId">Rate Profile</Label>
        <Select 
          value={form.laborRateProfileId ? String(form.laborRateProfileId) : ''} 
          onValueChange={(value) => setForm({ ...form, laborRateProfileId: value ? parseInt(value) : 0 })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select rate profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles && profiles.length > 0 ? (
              profiles.map((profile) => {
                if (!profile || !profile.id) return null;
                return (
                  <SelectItem key={profile.id} value={String(profile.id)}>
                    {getProfileDisplay(profile)}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="0" disabled>No profiles available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="skillLevelId">Skill Level</Label>
        <Select 
          value={form.skillLevelId ? String(form.skillLevelId) : ''} 
          onValueChange={(value) => setForm({ ...form, skillLevelId: value ? parseInt(value) : 0 })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select skill level" />
          </SelectTrigger>
          <SelectContent>
            {skillLevels && skillLevels.length > 0 ? (
              skillLevels.map((level) => {
                if (!level || !level.id) return null;
                return (
                  <SelectItem key={level.id} value={String(level.id)}>
                    {getSkillLevelDisplay(level)}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="0" disabled>No skill levels available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* Show calculated effective rate */}
      {form.laborRateProfileId && form.skillLevelId && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <Label className="text-sm text-blue-700">Calculated Effective Rate</Label>
          <div className="text-lg font-semibold text-blue-900">
            ${(() => {
              const profile = profiles.find(p => p.id === form.laborRateProfileId);
              const skillLevel = skillLevels.find(s => s.id === form.skillLevelId);
              const baseRate = safeToNumber(profile?.baseRate || profile?.base_rate || 0);
              const multiplier = safeToNumber(skillLevel?.multiplier || 1);
              return (baseRate * multiplier).toFixed(2);
            })()}/hr
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Base Rate × Skill Multiplier = Effective Rate
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending || !form.role}
        >
          {saveMutation.isPending ? 'Saving...' : rate ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function LaborAllowances() {
  const { data: allowances = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/labor-allowances']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingAllowance, setEditingAllowance] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleEditAllowance = (allowance: any) => {
    console.log('Editing allowance:', allowance); // Debug log
    setEditingAllowance(allowance);
    setIsDialogOpen(true);
  };
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/labor-allowances/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Allowance deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/labor-allowances'] });
    },
    onError: () => {
      toast({ title: "Failed to delete allowance", variant: "destructive" });
    }
  });
  
  const handleDeleteAllowance = (id: number) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Labor Allowances</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditingAllowance(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Allowance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAllowance ? 'Edit Allowance' : 'Create Allowance'}
              </DialogTitle>
            </DialogHeader>
            <AllowanceForm 
              allowance={editingAllowance}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Allowance Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount/Percentage</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allowances.map((allowance) => (
              <TableRow key={allowance.id}>
                <TableCell className="font-medium">{allowance.name}</TableCell>
                <TableCell>{allowance.code}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {allowance.description || '-'}
                </TableCell>
                <TableCell>
                  {allowance.allowanceType === 'percentage' 
                    ? `${allowance.amount}%` 
                    : allowance.allowanceType === 'multiplier'
                    ? `${allowance.amount}x`
                    : `$${safeToNumber(allowance.amount).toFixed(2)}`
                  }
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    allowance.allowanceType === 'percentage' ? 'bg-blue-100 text-blue-800' : 
                    allowance.allowanceType === 'multiplier' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {allowance.allowanceType === 'percentage' ? 'Percentage' : 
                     allowance.allowanceType === 'multiplier' ? 'Multiplier' : 
                     'Fixed Amount'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAllowance(allowance)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAllowance(allowance.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AllowanceForm({ allowance, onClose }: { allowance: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: allowance?.name || '',
    code: allowance?.code || '',
    description: allowance?.description || '',
    allowanceType: allowance?.allowance_type || allowance?.allowanceType || 'fixed',
    amount: safeToNumber(allowance?.amount || 0),
    isActive: allowance?.is_active ?? allowance?.isActive ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      console.log('Saving data:', data); // Debug log
      const url = allowance 
        ? `/api/labor-allowances/${allowance.id}`
        : '/api/labor-allowances';
      return apiRequest(allowance ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Allowance ${allowance ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/labor-allowances'] });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to save allowance', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Allowance Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Hazard Pay, Height Allowance"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          placeholder="e.g., HAZ, HGT"
          maxLength={10}
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of when this allowance applies"
        />
      </div>
      
      <div>
        <Label htmlFor="allowanceType">Allowance Type</Label>
        <Select 
          value={form.allowanceType}
          onValueChange={(value) => setForm({ ...form, allowanceType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Amount ($/hr)</SelectItem>
            <SelectItem value="percentage">Percentage (%)</SelectItem>
            <SelectItem value="multiplier">Multiplier (x)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="amount">
          {form.allowanceType === 'fixed' ? 'Amount ($/hr)' :
           form.allowanceType === 'percentage' ? 'Percentage (%)' :
           'Multiplier (x)'}
        </Label>
        <Input
          id="amount"
          type="number"
          step={form.allowanceType === 'fixed' ? '0.01' : '0.1'}
          value={form.amount}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            setForm({ ...form, amount: isNaN(value) ? 0 : value });
          }}
          placeholder={form.allowanceType === 'fixed' ? '10.00' :
                      form.allowanceType === 'percentage' ? '15' : '1.5'}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending || !form.name}
        >
          {saveMutation.isPending ? 'Saving...' : allowance ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function RateHistory() {
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/labor-rates/history']
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Change History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Old Rate</TableHead>
              <TableHead>New Rate</TableHead>
              <TableHead>Change %</TableHead>
              <TableHead>Changed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.changedAt).toLocaleDateString()}</TableCell>
                <TableCell>{record.laborRateProfile?.name}</TableCell>
                <TableCell>${safeToNumber(record.oldRate).toFixed(2)}</TableCell>
                <TableCell>${safeToNumber(record.newRate).toFixed(2)}</TableCell>
                <TableCell>
                  {record.oldRate && record.newRate ? (
                    <span className={`text-sm font-medium ${
                      safeToNumber(record.newRate) > safeToNumber(record.oldRate) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(((safeToNumber(record.newRate) - safeToNumber(record.oldRate)) / safeToNumber(record.oldRate)) * 100).toFixed(1)}%
                    </span>
                  ) : 'N/A'}
                </TableCell>
                <TableCell>{record.changedBy || 'System'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Form Components
function WeldingStandardForm({ standard, onClose }: { standard: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: standard?.name || '',
    size: standard?.size || '',
    material_type: standard?.material_type || 'mild_steel',
    time_per_meter: standard?.time_per_meter || 5,
    is_active: standard?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = standard 
        ? `/api/operations/welding-standards/${standard.id}`
        : '/api/operations/welding-standards';
      return apiRequest(standard ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Welding standard ${standard ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/welding-standards'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., 10mm Fillet"
        />
      </div>
      
      <div>
        <Label htmlFor="size">Size</Label>
        <Input
          id="size"
          value={form.size}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
          placeholder="e.g., 10mm"
        />
      </div>
      
      <div>
        <Label htmlFor="material_type">Material Type</Label>
        <Select value={form.material_type} onValueChange={(value) => setForm({ ...form, material_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild_steel">Mild Steel</SelectItem>
            <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
            <SelectItem value="aluminum">Aluminum</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="time_per_meter">Time per Meter (minutes)</Label>
        <Input
          id="time_per_meter"
          type="number"
          step="0.1"
          value={form.time_per_meter}
          onChange={(e) => setForm({ ...form, time_per_meter: parseFloat(e.target.value) })}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {standard ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function DrillingStandardForm({ standard, onClose }: { standard: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: standard?.name || '',
    hole_diameter: standard?.hole_diameter || null,
    material_type: standard?.material_type || 'mild_steel',
    time_per_hole: standard?.time_per_hole || 1,
    is_active: standard?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = standard 
        ? `/api/operations/drilling-standards/${standard.id}`
        : '/api/operations/drilling-standards';
      return apiRequest(standard ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Drilling standard ${standard ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/drilling-standards'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Extra Large Holes"
        />
      </div>
      
      <div>
        <Label htmlFor="hole_diameter">Hole Diameter (mm)</Label>
        <Input
          id="hole_diameter"
          type="number"
          step="0.1"
          value={form.hole_diameter || ''}
          onChange={(e) => setForm({ ...form, hole_diameter: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="Optional"
        />
      </div>
      
      <div>
        <Label htmlFor="material_type">Material Type</Label>
        <Select value={form.material_type} onValueChange={(value) => setForm({ ...form, material_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild_steel">Mild Steel</SelectItem>
            <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
            <SelectItem value="aluminum">Aluminum</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="time_per_hole">Time per Hole (minutes)</Label>
        <Input
          id="time_per_hole"
          type="number"
          step="0.1"
          value={form.time_per_hole}
          onChange={(e) => setForm({ ...form, time_per_hole: parseFloat(e.target.value) })}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {standard ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function CuttingStandardForm({ standard, onClose }: { standard: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: standard?.name || '',
    material_type: standard?.material_type || 'mild_steel',
    thickness_min: standard?.thickness_min || 0,
    thickness_max: standard?.thickness_max || 10,
    time_per_meter: standard?.time_per_meter || 2,
    equipment: standard?.equipment || '',
    is_active: standard?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = standard 
        ? `/api/operations/cutting-standards/${standard.id}`
        : '/api/operations/cutting-standards';
      return apiRequest(standard ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Cutting standard ${standard ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/cutting-standards'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Plasma Cut - Thick"
        />
      </div>
      
      <div>
        <Label htmlFor="material_type">Material Type</Label>
        <Select value={form.material_type} onValueChange={(value) => setForm({ ...form, material_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild_steel">Mild Steel</SelectItem>
            <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
            <SelectItem value="aluminum">Aluminum</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="thickness_min">Min Thickness (mm)</Label>
          <Input
            id="thickness_min"
            type="number"
            step="0.1"
            value={form.thickness_min}
            onChange={(e) => setForm({ ...form, thickness_min: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="thickness_max">Max Thickness (mm)</Label>
          <Input
            id="thickness_max"
            type="number"
            step="0.1"
            value={form.thickness_max}
            onChange={(e) => setForm({ ...form, thickness_max: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="time_per_meter">Time per Meter (minutes)</Label>
        <Input
          id="time_per_meter"
          type="number"
          step="0.1"
          value={form.time_per_meter}
          onChange={(e) => setForm({ ...form, time_per_meter: parseFloat(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="equipment">Equipment</Label>
        <Input
          id="equipment"
          value={form.equipment}
          onChange={(e) => setForm({ ...form, equipment: e.target.value })}
          placeholder="e.g., Plasma Cutter"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {standard ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function AnnotationThemeForm({ theme, onClose }: { theme: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: theme?.name || '',
    description: theme?.description || '',
    beamColor: theme?.beamColor || '#0000FF',
    columnColor: theme?.columnColor || '#FF0000',
    plateColor: theme?.plateColor || '#00FF00',
    connectionColor: theme?.connectionColor || '#FF00FF',
    weldColor: theme?.weldColor || '#FFA500',
    boltColor: theme?.boltColor || '#800080',
    dimensionColor: theme?.dimensionColor || '#000000',
    noteColor: theme?.noteColor || '#808080',
    lineWidth: theme?.lineWidth || 2,
    lineStyle: theme?.lineStyle || 'solid',
    opacity: theme?.opacity || 0.7,
    fontSize: theme?.fontSize || 12,
    fontFamily: theme?.fontFamily || 'Arial',
    isDefault: theme?.isDefault ?? false
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = theme 
        ? `/api/operations/annotation-themes/${theme.id}`
        : '/api/operations/annotation-themes';
      return apiRequest(theme ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Annotation theme ${theme ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/annotation-themes'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Theme Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Default Theme, High Contrast"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Theme description"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Element Colors</Label>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="beamColor" className="text-xs">Beam</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="beamColor"
                value={form.beamColor}
                onChange={(e) => setForm({ ...form, beamColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.beamColor}
                onChange={(e) => setForm({ ...form, beamColor: e.target.value })}
                placeholder="#0000FF"
                className="font-mono text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="columnColor" className="text-xs">Column</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="columnColor"
                value={form.columnColor}
                onChange={(e) => setForm({ ...form, columnColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.columnColor}
                onChange={(e) => setForm({ ...form, columnColor: e.target.value })}
                placeholder="#FF0000"
                className="font-mono text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="plateColor" className="text-xs">Plate</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="plateColor"
                value={form.plateColor}
                onChange={(e) => setForm({ ...form, plateColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.plateColor}
                onChange={(e) => setForm({ ...form, plateColor: e.target.value })}
                placeholder="#00FF00"
                className="font-mono text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="connectionColor" className="text-xs">Connection</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="connectionColor"
                value={form.connectionColor}
                onChange={(e) => setForm({ ...form, connectionColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.connectionColor}
                onChange={(e) => setForm({ ...form, connectionColor: e.target.value })}
                placeholder="#FF00FF"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="weldColor" className="text-xs">Weld</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="weldColor"
                value={form.weldColor}
                onChange={(e) => setForm({ ...form, weldColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.weldColor}
                onChange={(e) => setForm({ ...form, weldColor: e.target.value })}
                placeholder="#FFA500"
                className="font-mono text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="boltColor" className="text-xs">Bolt</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="boltColor"
                value={form.boltColor}
                onChange={(e) => setForm({ ...form, boltColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.boltColor}
                onChange={(e) => setForm({ ...form, boltColor: e.target.value })}
                placeholder="#800080"
                className="font-mono text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="dimensionColor" className="text-xs">Dimension</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="dimensionColor"
                value={form.dimensionColor}
                onChange={(e) => setForm({ ...form, dimensionColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.dimensionColor}
                onChange={(e) => setForm({ ...form, dimensionColor: e.target.value })}
                placeholder="#000000"
                className="font-mono text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="noteColor" className="text-xs">Note</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="noteColor"
                value={form.noteColor}
                onChange={(e) => setForm({ ...form, noteColor: e.target.value })}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={form.noteColor}
                onChange={(e) => setForm({ ...form, noteColor: e.target.value })}
                placeholder="#808080"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Line & Font Settings</Label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="lineWidth">Line Width (px)</Label>
            <Input
              id="lineWidth"
              type="number"
              value={form.lineWidth}
              onChange={(e) => setForm({ ...form, lineWidth: parseInt(e.target.value) || 0 })}
              placeholder="2"
            />
          </div>
          
          <div>
            <Label htmlFor="lineStyle">Line Style</Label>
            <Select value={form.lineStyle} onValueChange={(value) => setForm({ ...form, lineStyle: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="opacity">Opacity</Label>
            <Input
              id="opacity"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={form.opacity}
              onChange={(e) => setForm({ ...form, opacity: parseFloat(e.target.value) || 0 })}
              placeholder="0.7"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fontSize">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              value={form.fontSize}
              onChange={(e) => setForm({ ...form, fontSize: parseInt(e.target.value) || 0 })}
              placeholder="12"
            />
          </div>
          
          <div>
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select value={form.fontFamily} onValueChange={(value) => setForm({ ...form, fontFamily: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={form.isDefault}
          onCheckedChange={(checked) => setForm({ ...form, isDefault: checked === true })}
        />
        <Label htmlFor="isDefault">Set as Default Theme</Label>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {theme ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function EdgePreparationForm({ preparation, onClose }: { preparation: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: preparation?.name || '',
    preparation_type: preparation?.preparation_type || 'bevel',
    angle_degrees: preparation?.angle_degrees || '',
    root_gap_mm: preparation?.root_gap_mm || '',
    land_thickness_mm: preparation?.land_thickness_mm || '',
    radius_mm: preparation?.radius_mm || '',
    applicable_thickness_min: preparation?.applicable_thickness_min || '',
    applicable_thickness_max: preparation?.applicable_thickness_max || '',
    time_per_meter: preparation?.time_per_meter || 5,
    equipment: preparation?.equipment || '',
    description: preparation?.description || '',
    is_active: preparation?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = preparation 
        ? `/api/operations/edge-preparations/${preparation.id}`
        : '/api/operations/edge-preparations';
      return apiRequest(preparation ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Edge preparation ${preparation ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/edge-preparations'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Single V-Bevel 45°"
          />
        </div>
        
        <div>
          <Label htmlFor="preparation_type">Preparation Type</Label>
          <Select value={form.preparation_type} onValueChange={(value) => setForm({ ...form, preparation_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bevel">Bevel</SelectItem>
              <SelectItem value="chamfer">Chamfer</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="j_groove">J-Groove</SelectItem>
              <SelectItem value="v_groove">V-Groove</SelectItem>
              <SelectItem value="u_groove">U-Groove</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="angle_degrees">Angle (degrees)</Label>
          <Input
            id="angle_degrees"
            type="number"
            value={form.angle_degrees}
            onChange={(e) => setForm({ ...form, angle_degrees: e.target.value })}
            placeholder="e.g., 45"
          />
        </div>
        
        <div>
          <Label htmlFor="root_gap_mm">Root Gap (mm)</Label>
          <Input
            id="root_gap_mm"
            type="number"
            value={form.root_gap_mm}
            onChange={(e) => setForm({ ...form, root_gap_mm: e.target.value })}
            placeholder="e.g., 3"
          />
        </div>
        
        <div>
          <Label htmlFor="land_thickness_mm">Land Thickness (mm)</Label>
          <Input
            id="land_thickness_mm"
            type="number"
            value={form.land_thickness_mm}
            onChange={(e) => setForm({ ...form, land_thickness_mm: e.target.value })}
            placeholder="e.g., 2"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="radius_mm">Radius (mm) - U-Groove</Label>
          <Input
            id="radius_mm"
            type="number"
            value={form.radius_mm}
            onChange={(e) => setForm({ ...form, radius_mm: e.target.value })}
            placeholder="For U-Groove"
          />
        </div>
        
        <div>
          <Label htmlFor="applicable_thickness_min">Min Thickness (mm)</Label>
          <Input
            id="applicable_thickness_min"
            type="number"
            value={form.applicable_thickness_min}
            onChange={(e) => setForm({ ...form, applicable_thickness_min: e.target.value })}
            placeholder="e.g., 6"
          />
        </div>
        
        <div>
          <Label htmlFor="applicable_thickness_max">Max Thickness (mm)</Label>
          <Input
            id="applicable_thickness_max"
            type="number"
            value={form.applicable_thickness_max}
            onChange={(e) => setForm({ ...form, applicable_thickness_max: e.target.value })}
            placeholder="e.g., 25"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="time_per_meter">Time per Meter (minutes)</Label>
          <Input
            id="time_per_meter"
            type="number"
            value={form.time_per_meter}
            onChange={(e) => setForm({ ...form, time_per_meter: parseFloat(e.target.value) || 0 })}
            placeholder="e.g., 5"
          />
        </div>
        
        <div>
          <Label htmlFor="equipment">Equipment</Label>
          <Input
            id="equipment"
            value={form.equipment}
            onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            placeholder="e.g., Plasma Bevel, Machining"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Additional details about this edge preparation"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked === true })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {preparation ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

function PositionFactorForm({ factor, onClose }: { factor: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    position: factor?.position || '',
    description: factor?.description || '',
    factor: factor?.factor || 1.0,
    is_active: factor?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = factor 
        ? `/api/operations/position-factors/${factor.id}`
        : '/api/operations/position-factors';
      return apiRequest(factor ? 'PUT' : 'POST', url, data);
    },
    onSuccess: () => {
      toast({ title: `Position factor ${factor ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/position-factors'] });
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="position">Position Code</Label>
        <Input
          id="position"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
          placeholder="e.g., H-L045"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g., Horizontal at 45 degrees"
        />
      </div>
      
      <div>
        <Label htmlFor="factor">Factor</Label>
        <Input
          id="factor"
          type="number"
          step="0.01"
          value={form.factor}
          onChange={(e) => setForm({ ...form, factor: parseFloat(e.target.value) })}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)}>
          {factor ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}