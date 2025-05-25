import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Download, Eye, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PDFConfig {
  name: string;
  showCheckboxes: boolean;
  checkboxPosition: "left" | "right";
  compactLayout: boolean;
  showMaterialSpecs: boolean;
  showEfficiency: boolean;
  showWaste: boolean;
  showAngles: boolean;
  fontSize: number;
  lineSpacing: number;
  includeRemnants: boolean;
  headerStyle: "colored" | "simple";
}

interface PDFConfiguratorProps {
  onExportWithConfig: (config: PDFConfig) => void;
  defaultConfig?: Partial<PDFConfig>;
}

const DEFAULT_CONFIG: PDFConfig = {
  name: "Workshop Standard",
  showCheckboxes: true,
  checkboxPosition: "right",
  compactLayout: true,
  showMaterialSpecs: true,
  showEfficiency: true,
  showWaste: true,
  showAngles: true,
  fontSize: 10,
  lineSpacing: 1.2,
  includeRemnants: true,
  headerStyle: "colored"
};

export function PDFExportConfigurator({ onExportWithConfig, defaultConfig }: PDFConfiguratorProps) {
  const [config, setConfig] = useState<PDFConfig>({ ...DEFAULT_CONFIG, ...defaultConfig });
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  const updateConfig = (key: keyof PDFConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    toast({
      title: "Configuration reset",
      description: "PDF settings have been reset to workshop defaults.",
    });
  };

  const saveAsPreset = () => {
    // This would save to localStorage or database
    toast({
      title: "Preset saved",
      description: `"${config.name}" has been saved as a custom preset.`,
    });
  };

  const handleExport = () => {
    onExportWithConfig(config);
    toast({
      title: "PDF Export Started",
      description: "Your workshop cutting instructions are being generated with custom settings.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          PDF Export Configurator
          <Badge variant="outline" className="ml-auto">
            {config.compactLayout ? "Compact" : "Standard"} Layout
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Options */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Layout & Format</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compact-layout" className="text-xs">Compact Layout</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="compact-layout"
                  checked={config.compactLayout}
                  onCheckedChange={(checked) => updateConfig('compactLayout', checked)}
                />
                <span className="text-xs text-muted-foreground">
                  {config.compactLayout ? "Save paper" : "More spacing"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="show-checkboxes" className="text-xs">Workshop Checkboxes</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-checkboxes"
                  checked={config.showCheckboxes}
                  onCheckedChange={(checked) => updateConfig('showCheckboxes', checked)}
                />
                <span className="text-xs text-muted-foreground">
                  {config.showCheckboxes ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {config.showCheckboxes && (
            <div className="space-y-2">
              <Label className="text-xs">Checkbox Position</Label>
              <Select value={config.checkboxPosition} onValueChange={(value: "left" | "right") => updateConfig('checkboxPosition', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Right Side (Space Saving)</SelectItem>
                  <SelectItem value="left">Left Side (Traditional)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        {/* Content Options */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Content Display</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="material-specs" className="text-xs">Material Specifications</Label>
                <Switch
                  id="material-specs"
                  checked={config.showMaterialSpecs}
                  onCheckedChange={(checked) => updateConfig('showMaterialSpecs', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="efficiency" className="text-xs">Efficiency Percentage</Label>
                <Switch
                  id="efficiency"
                  checked={config.showEfficiency}
                  onCheckedChange={(checked) => updateConfig('showEfficiency', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="waste" className="text-xs">Waste Information</Label>
                <Switch
                  id="waste"
                  checked={config.showWaste}
                  onCheckedChange={(checked) => updateConfig('showWaste', checked)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="angles" className="text-xs">Angle Cut Indicators</Label>
                <Switch
                  id="angles"
                  checked={config.showAngles}
                  onCheckedChange={(checked) => updateConfig('showAngles', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="remnants" className="text-xs">Remnant Tracking</Label>
                <Switch
                  id="remnants"
                  checked={config.includeRemnants}
                  onCheckedChange={(checked) => updateConfig('includeRemnants', checked)}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Typography Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Typography & Spacing</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Font Size: {config.fontSize}pt</Label>
              <Slider
                value={[config.fontSize]}
                onValueChange={([value]) => updateConfig('fontSize', value)}
                min={8}
                max={14}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small (8pt)</span>
                <span>Large (14pt)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Line Spacing: {config.lineSpacing}x</Label>
              <Slider
                value={[config.lineSpacing]}
                onValueChange={([value]) => updateConfig('lineSpacing', value)}
                min={1.0}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tight (1.0x)</span>
                <span>Loose (2.0x)</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Style Options */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Visual Style</h3>
          
          <div className="space-y-2">
            <Label className="text-xs">Header Style</Label>
            <Select value={config.headerStyle} onValueChange={(value: "colored" | "simple") => updateConfig('headerStyle', value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="colored">Colored Headers (Workshop Friendly)</SelectItem>
                <SelectItem value="simple">Simple Black & White</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preset-name" className="text-xs">Configuration Name</Label>
            <Input
              id="preset-name"
              value={config.name}
              onChange={(e) => updateConfig('name', e.target.value)}
              placeholder="e.g., Workshop Standard, Office Copy"
              className="text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            className="flex-1"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Preview Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="bg-muted/50 p-3 rounded">
                  <h4 className="font-medium mb-2">Current Settings Preview</h4>
                  <div className="space-y-1 text-xs">
                    <div>✓ {config.compactLayout ? "Compact" : "Standard"} layout</div>
                    <div>✓ {config.showCheckboxes ? `Checkboxes on ${config.checkboxPosition}` : "No checkboxes"}</div>
                    <div>✓ {config.fontSize}pt font, {config.lineSpacing}x spacing</div>
                    <div>✓ {config.headerStyle === "colored" ? "Colored" : "Simple"} headers</div>
                    {config.showMaterialSpecs && <div>✓ Material specifications included</div>}
                    {config.includeRemnants && <div>✓ Remnant tracking included</div>}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={saveAsPreset}
          >
            <Save className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}