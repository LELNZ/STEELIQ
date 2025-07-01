import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Calculator, Package } from "lucide-react";
import { Material } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SurfaceAreaManager from "./surface-area-manager";

interface MaterialEditModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "edit" | "add";
}

const MATERIAL_CATEGORIES = [
  "SHS", "RHS", "Flats", "Angles", "Rounds", "Universal Beams", "Universal Columns",
  "Channels", "Unequal Angles", "Reinforcing Bar", "Pipe", "Sheet Metal", "Square Bar",
  "Cattle Rail", "Purlin DHS", "Mesh"
];

const MATERIAL_GRADES = [
  "250", "300", "350", "C350L0", "C450L0", "Grade 300", "Grade 250", "DuraGal",
  "Galvanised", "Mild Steel", "High Tensile"
];

const MATERIAL_STANDARDS = [
  "AS/NZS 3679.1-300", "AS/NZS 1163", "AS/NZS 4671", "AS 1397", "AS/NZS 1594",
  "API 5L", "ASTM A53", "AS/NZS 3566", "AS 3679.2"
];

export default function MaterialEditModal({ material, isOpen, onClose, mode }: MaterialEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Material>>({});
  const [showSurfaceAreaCalc, setShowSurfaceAreaCalc] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (material && mode === "edit") {
      setFormData(material);
    } else if (mode === "add") {
      setFormData({
        category: "",
        name: "",
        code: "",
        grade: "",
        standard: "",
        width: "0",
        thickness: "0",
        depth: "0",
        diameter: "0",
        weightPerMeter: "0",
        surfaceAreaPerMeter: "0",
        isActive: true
      });
    }
  }, [material, mode]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Material>) => {
      if (mode === "edit" && material?.id) {
        return await apiRequest(`/api/materials/${material.id}`, "PUT", data);
      } else {
        return await apiRequest("/api/materials", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: mode === "edit" ? "Material Updated" : "Material Added",
        description: `${formData.name} has been ${mode === "edit" ? "updated" : "added"} successfully.`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${mode} material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.name || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Material name and category are required.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleSurfaceAreaSave = (surfaceArea: number) => {
    setFormData(prev => ({ ...prev, surfaceAreaPerMeter: surfaceArea.toString() }));
    setShowSurfaceAreaCalc(false);
    toast({
      title: "Surface Area Updated",
      description: `Surface area set to ${surfaceArea.toFixed(4)} m²/m`,
    });
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (showSurfaceAreaCalc && formData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <SurfaceAreaManager
            material={formData as Material}
            onSave={handleSurfaceAreaSave}
            onClose={() => setShowSurfaceAreaCalc(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === "edit" ? "Edit Material" : "Add New Material"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? "Update material specifications and properties" 
              : "Add a new material to your catalog"
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Material Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g., SHS 50x50x3"
                />
              </div>
              <div>
                <Label htmlFor="code">Material Code</Label>
                <Input
                  id="code"
                  value={formData.code || ""}
                  onChange={(e) => updateField("code", e.target.value)}
                  placeholder="e.g., SHS-50X50X3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category || ""} onValueChange={(value) => updateField("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grade">Grade</Label>
                <Select value={formData.grade || ""} onValueChange={(value) => updateField("grade", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_GRADES.map((grade) => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="standard">Standard</Label>
              <Select value={formData.standard || ""} onValueChange={(value) => updateField("standard", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_STANDARDS.map((std) => (
                    <SelectItem key={std} value={std}>{std}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </TabsContent>

          <TabsContent value="dimensions" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width || ""}
                  onChange={(e) => updateField("width", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="thickness">Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  value={formData.thickness || ""}
                  onChange={(e) => updateField("thickness", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="depth">Depth (mm)</Label>
                <Input
                  id="depth"
                  type="number"
                  value={formData.depth || ""}
                  onChange={(e) => updateField("depth", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="diameter">Diameter (mm)</Label>
                <Input
                  id="diameter"
                  type="number"
                  value={formData.diameter || ""}
                  onChange={(e) => updateField("diameter", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="flangeTf">Flange Thickness (mm)</Label>
                <Input
                  id="flangeTf"
                  type="number"
                  value={formData.flangeTf || ""}
                  onChange={(e) => updateField("flangeTf", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="webTw">Web Thickness (mm)</Label>
                <Input
                  id="webTw"
                  type="number"
                  value={formData.webTw || ""}
                  onChange={(e) => updateField("webTw", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="properties" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weightPerMeter">Weight (kg/m)</Label>
                <Input
                  id="weightPerMeter"
                  type="number"
                  step="0.001"
                  value={formData.weightPerMeter || ""}
                  onChange={(e) => updateField("weightPerMeter", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="surfaceAreaPerMeter">Surface Area (m²/m)</Label>
                <div className="flex gap-2">
                  <Input
                    id="surfaceAreaPerMeter"
                    type="number"
                    step="0.0001"
                    value={formData.surfaceAreaPerMeter || ""}
                    onChange={(e) => updateField("surfaceAreaPerMeter", parseFloat(e.target.value) || 0)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSurfaceAreaCalc(true)}
                    className="flex-shrink-0"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {formData.surfaceAreaPerMeter && parseFloat(String(formData.surfaceAreaPerMeter)) > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Calculated Surface Area</span>
                    <Badge variant="secondary">
                      {parseFloat(String(formData.surfaceAreaPerMeter)).toFixed(4)} m²/m
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : mode === "edit" ? "Update Material" : "Add Material"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}