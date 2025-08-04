import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
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

export default function OperationsSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Operations Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure time standards and defaults for estimation calculations.
        </p>
      </div>

      <Tabs defaultValue="fabrication">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
          <TabsTrigger value="welding">Welding</TabsTrigger>
          <TabsTrigger value="drilling">Drilling</TabsTrigger>
          <TabsTrigger value="cutting">Cutting</TabsTrigger>
          <TabsTrigger value="position-factors">Position Factors</TabsTrigger>
          <TabsTrigger value="assembly-templates">Assembly Templates</TabsTrigger>
          <TabsTrigger value="labor-defaults">Labor Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="fabrication">
          <FabricationTab />
        </TabsContent>
        
        <TabsContent value="welding">
          <WeldingStandardsTab />
        </TabsContent>

        <TabsContent value="drilling">
          <DrillingStandardsTab />
        </TabsContent>

        <TabsContent value="cutting">
          <CuttingStandardsTab />
        </TabsContent>

        <TabsContent value="position-factors">
          <PositionFactorsTab />
        </TabsContent>

        <TabsContent value="assembly-templates">
          <AssemblyTemplatesTab />
        </TabsContent>

        <TabsContent value="labor-defaults">
          <LaborDefaultsTab />
        </TabsContent>
      </Tabs>
    </div>
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
  }>({
    queryKey: ['/api/operations/fabrication-standards']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    defaultKerf: 2.4,
    defaultMaterialHandlingTime: 15,
    defaultSetupTime: 30
  });
  
  useEffect(() => {
    if (settings) {
      setForm({
        defaultKerf: settings.defaultKerf || 2.4,
        defaultMaterialHandlingTime: settings.defaultMaterialHandlingTime || 15,
        defaultSetupTime: settings.defaultSetupTime || 30
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
      <CardContent className="space-y-4">
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
            <Label htmlFor="defaultMaterialHandlingTime">Default Material Handling Time (min)</Label>
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
      return apiRequest(`/api/operations/welding-standards/${id}`, 'DELETE');
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
      return apiRequest(`/api/operations/drilling-standards/${id}`, 'DELETE');
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
      return apiRequest(`/api/operations/cutting-standards/${id}`, 'DELETE');
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
      return apiRequest(`/api/operations/position-factors/${id}`, 'DELETE');
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
    { key: 'factor', header: 'Factor', render: (value: number) => value.toFixed(2) },
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

// Assembly Templates Tab - Placeholder
function AssemblyTemplatesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assembly Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Assembly templates configuration coming soon...</p>
      </CardContent>
    </Card>
  );
}

// Labor Defaults Tab - Placeholder
function LaborDefaultsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Defaults</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Labor defaults configuration coming soon...</p>
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
      return apiRequest(url, standard ? 'PUT' : 'POST', data);
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
      return apiRequest(url, standard ? 'PUT' : 'POST', data);
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
      return apiRequest(url, standard ? 'PUT' : 'POST', data);
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
      return apiRequest(url, factor ? 'PUT' : 'POST', data);
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