import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Settings, DollarSign, Clock, Truck, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConfigItem {
  id: string;
  category: string;
  subcategory: string;
  name: string;
  value: string;
  unit: string;
  description: string;
  isEditable: boolean;
}

interface GlobalConfigPanelProps {
  onConfigUpdate: (config: ConfigItem[]) => void;
}

const DEFAULT_CONFIG: ConfigItem[] = [
  // Labor Rates
  { id: '1', category: 'labor_rates', subcategory: 'workshop', name: 'apprentice_rate', value: '45', unit: '$/hr', description: 'Workshop apprentice hourly rate', isEditable: true },
  { id: '2', category: 'labor_rates', subcategory: 'workshop', name: 'standard_rate', value: '55', unit: '$/hr', description: 'Workshop standard hourly rate', isEditable: true },
  { id: '3', category: 'labor_rates', subcategory: 'workshop', name: 'senior_rate', value: '70', unit: '$/hr', description: 'Workshop senior hourly rate', isEditable: true },
  { id: '4', category: 'labor_rates', subcategory: 'workshop', name: 'specialist_rate', value: '85', unit: '$/hr', description: 'Workshop specialist hourly rate', isEditable: true },
  
  { id: '5', category: 'labor_rates', subcategory: 'site', name: 'apprentice_rate', value: '65', unit: '$/hr', description: 'Site apprentice hourly rate', isEditable: true },
  { id: '6', category: 'labor_rates', subcategory: 'site', name: 'standard_rate', value: '80', unit: '$/hr', description: 'Site standard hourly rate', isEditable: true },
  { id: '7', category: 'labor_rates', subcategory: 'site', name: 'senior_rate', value: '100', unit: '$/hr', description: 'Site senior hourly rate', isEditable: true },
  { id: '8', category: 'labor_rates', subcategory: 'site', name: 'specialist_rate', value: '120', unit: '$/hr', description: 'Site specialist hourly rate', isEditable: true },

  // Material Handling
  { id: '9', category: 'material_handling', subcategory: 'crane', name: 'handling_time', value: '10', unit: 'min', description: 'Crane handling time for 40kg+ materials', isEditable: true },
  { id: '10', category: 'material_handling', subcategory: 'crane', name: 'handling_rate', value: '85', unit: '$/hr', description: 'Crane operation rate', isEditable: true },
  { id: '11', category: 'material_handling', subcategory: 'heavy_manual', name: 'handling_time', value: '5', unit: 'min', description: 'Heavy manual handling (20-40kg)', isEditable: true },
  { id: '12', category: 'material_handling', subcategory: 'heavy_manual', name: 'handling_rate', value: '55', unit: '$/hr', description: 'Heavy manual handling rate', isEditable: true },
  { id: '13', category: 'material_handling', subcategory: 'medium_lift', name: 'handling_time', value: '3', unit: 'min', description: 'Medium lift handling (5-20kg)', isEditable: true },
  { id: '14', category: 'material_handling', subcategory: 'medium_lift', name: 'handling_rate', value: '50', unit: '$/hr', description: 'Medium lift handling rate', isEditable: true },
  { id: '15', category: 'material_handling', subcategory: 'light', name: 'handling_time', value: '1', unit: 'min', description: 'Light handling (<5kg)', isEditable: true },
  { id: '16', category: 'material_handling', subcategory: 'light', name: 'handling_rate', value: '45', unit: '$/hr', description: 'Light handling rate', isEditable: true },

  // Connection Rates
  { id: '17', category: 'connection_rates', subcategory: 'welding', name: 'workshop_rate', value: '15', unit: 'min/1000mm', description: 'Workshop welding time per 1000mm', isEditable: true },
  { id: '18', category: 'connection_rates', subcategory: 'welding', name: 'site_rate', value: '15', unit: 'min/1000mm', description: 'Site welding time per 1000mm', isEditable: true },
  { id: '19', category: 'connection_rates', subcategory: 'drilling', name: 'small_hole_time', value: '10', unit: 'min/hole', description: 'Drilling time for holes ≤50mm', isEditable: true },
  { id: '20', category: 'connection_rates', subcategory: 'drilling', name: 'large_hole_time', value: '15', unit: 'min/hole', description: 'Drilling time for holes >50mm', isEditable: true },
  { id: '21', category: 'connection_rates', subcategory: 'cutting', name: 'cutting_time', value: '15', unit: 'min/1000mm', description: 'Cutting/coping time for ≤12mm plate', isEditable: true },

  // Equipment Rates
  { id: '22', category: 'equipment', subcategory: 'inhouse', name: 'truck_rate', value: '45', unit: '$/hr', description: 'Inhouse truck hourly rate', isEditable: true },
  { id: '23', category: 'equipment', subcategory: 'inhouse', name: 'hiab_rate', value: '65', unit: '$/hr', description: 'Inhouse hiab hourly rate', isEditable: true },
  { id: '24', category: 'equipment', subcategory: 'inhouse', name: 'crane_rate', value: '85', unit: '$/hr', description: 'Inhouse crane hourly rate', isEditable: true },
  { id: '25', category: 'equipment', subcategory: 'rental', name: 'truck_rate', value: '80', unit: '$/hr', description: 'Rental truck hourly rate', isEditable: true },
  { id: '26', category: 'equipment', subcategory: 'rental', name: 'hiab_rate', value: '120', unit: '$/hr', description: 'Rental hiab hourly rate', isEditable: true },
  { id: '27', category: 'equipment', subcategory: 'rental', name: 'crane_rate', value: '180', unit: '$/hr', description: 'Rental crane hourly rate', isEditable: true },

  // Project Defaults
  { id: '28', category: 'project_defaults', subcategory: 'margins', name: 'material_margin', value: '15', unit: '%', description: 'Default material markup percentage', isEditable: true },
  { id: '29', category: 'project_defaults', subcategory: 'margins', name: 'labor_margin', value: '20', unit: '%', description: 'Default labor markup percentage', isEditable: true },
  { id: '30', category: 'project_defaults', subcategory: 'factors', name: 'waste_factor', value: '5', unit: '%', description: 'Default material waste factor', isEditable: true },
  { id: '31', category: 'project_defaults', subcategory: 'factors', name: 'overhead', value: '12', unit: '%', description: 'Default overhead percentage', isEditable: true },
];

export default function GlobalConfigPanel({ onConfigUpdate }: GlobalConfigPanelProps) {
  const [config, setConfig] = useState<ConfigItem[]>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  const updateConfigItem = (id: string, newValue: string) => {
    setConfig(prev => prev.map(item => 
      item.id === id ? { ...item, value: newValue } : item
    ));
    setIsDirty(true);
  };

  const saveConfig = () => {
    onConfigUpdate(config);
    setIsDirty(false);
    toast({
      title: "Configuration saved",
      description: "Global settings have been updated successfully",
    });
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    setIsDirty(true);
    toast({
      title: "Reset to defaults",
      description: "All settings have been reset to default values",
    });
  };

  const getConfigByCategory = (category: string, subcategory?: string) => {
    return config.filter(item => 
      item.category === category && 
      (subcategory ? item.subcategory === subcategory : true)
    );
  };

  const renderConfigTable = (items: ConfigItem[], title: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.value}
                    onChange={(e) => updateConfigItem(item.id, e.target.value)}
                    disabled={!item.isEditable}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.unit}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Configuration</h2>
          <p className="text-muted-foreground">Manage system-wide rates and settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveConfig} disabled={!isDirty}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {isDirty && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Unsaved changes detected</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Your changes will be applied to new estimations after saving.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="labor" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="labor">Labor Rates</TabsTrigger>
          <TabsTrigger value="handling">Material Handling</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="defaults">Project Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="labor" className="space-y-4">
          {renderConfigTable(getConfigByCategory('labor_rates', 'workshop'), 'Workshop Labor Rates')}
          {renderConfigTable(getConfigByCategory('labor_rates', 'site'), 'Site Labor Rates')}
        </TabsContent>

        <TabsContent value="handling" className="space-y-4">
          {renderConfigTable(getConfigByCategory('material_handling', 'crane'), 'Crane Handling (40kg+)')}
          {renderConfigTable(getConfigByCategory('material_handling', 'heavy_manual'), 'Heavy Manual (20-40kg)')}
          {renderConfigTable(getConfigByCategory('material_handling', 'medium_lift'), 'Medium Lift (5-20kg)')}
          {renderConfigTable(getConfigByCategory('material_handling', 'light'), 'Light Handling (<5kg)')}
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          {renderConfigTable(getConfigByCategory('connection_rates', 'welding'), 'Welding Rates')}
          {renderConfigTable(getConfigByCategory('connection_rates', 'drilling'), 'Drilling Rates')}
          {renderConfigTable(getConfigByCategory('connection_rates', 'cutting'), 'Cutting/Coping Rates')}
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          {renderConfigTable(getConfigByCategory('equipment', 'inhouse'), 'Inhouse Equipment Rates')}
          {renderConfigTable(getConfigByCategory('equipment', 'rental'), 'Rental Equipment Rates')}
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          {renderConfigTable(getConfigByCategory('project_defaults', 'margins'), 'Default Margins')}
          {renderConfigTable(getConfigByCategory('project_defaults', 'factors'), 'Default Factors')}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rate Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="font-medium">Workshop Rates</Label>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between">
                  <span>Apprentice:</span>
                  <span>${getConfigByCategory('labor_rates', 'workshop').find(i => i.name === 'apprentice_rate')?.value}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard:</span>
                  <span>${getConfigByCategory('labor_rates', 'workshop').find(i => i.name === 'standard_rate')?.value}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Senior:</span>
                  <span>${getConfigByCategory('labor_rates', 'workshop').find(i => i.name === 'senior_rate')?.value}/hr</span>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="font-medium">Site Rates</Label>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between">
                  <span>Apprentice:</span>
                  <span>${getConfigByCategory('labor_rates', 'site').find(i => i.name === 'apprentice_rate')?.value}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard:</span>
                  <span>${getConfigByCategory('labor_rates', 'site').find(i => i.name === 'standard_rate')?.value}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Senior:</span>
                  <span>${getConfigByCategory('labor_rates', 'site').find(i => i.name === 'senior_rate')?.value}/hr</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="font-medium">Connection Rates</Label>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between">
                  <span>Welding:</span>
                  <span>{getConfigByCategory('connection_rates', 'welding').find(i => i.name === 'workshop_rate')?.value} min/1000mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Drilling ≤50mm:</span>
                  <span>{getConfigByCategory('connection_rates', 'drilling').find(i => i.name === 'small_hole_time')?.value} min/hole</span>
                </div>
                <div className="flex justify-between">
                  <span>Cutting:</span>
                  <span>{getConfigByCategory('connection_rates', 'cutting').find(i => i.name === 'cutting_time')?.value} min/1000mm</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="font-medium">Default Factors</Label>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between">
                  <span>Material Margin:</span>
                  <span>{getConfigByCategory('project_defaults', 'margins').find(i => i.name === 'material_margin')?.value}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Waste Factor:</span>
                  <span>{getConfigByCategory('project_defaults', 'factors').find(i => i.name === 'waste_factor')?.value}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Overhead:</span>
                  <span>{getConfigByCategory('project_defaults', 'factors').find(i => i.name === 'overhead')?.value}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}