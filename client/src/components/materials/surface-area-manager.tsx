import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Image, CheckSquare, Percent } from "lucide-react";
import { calculateSurfaceArea, calculateSquareBarArea, type SteelDimensions, type SurfaceAreaResult } from "@/lib/surface-area-calculator";
import type { Material } from "@shared/schema";

// Import dimensional reference images
import anglesImg from "@assets/Angles.png";
import unequalAnglesImg from "@assets/Unequal Angles.png";
import cattleRailImg from "@assets/Cattle Rail.png";
import channelImg from "@assets/Channel.png";
import flatImg from "@assets/Flstd.png";
import meshImg from "@assets/Mesh.png";
import pipeImg from "@assets/Pipe.png";
import rebarImg from "@assets/Reinforcing bar.png";
import rhsImg from "@assets/RHS.png";
import roundImg from "@assets/Round.png";
import sheetMetalImg from "@assets/Sheet metal.png";
import shsImg from "@assets/SHS.png";
import squareBarImg from "@assets/Square Bar.png";
import ubImg from "@assets/Universal Beam.png";
import ucImg from "@assets/Universal Column.png";

interface SurfaceAreaManagerProps {
  material: Material;
  onSave: (surfaceArea: number) => void;
  onClose: () => void;
}

export default function SurfaceAreaManager({ material, onSave, onClose }: SurfaceAreaManagerProps) {
  const [dimensions, setDimensions] = useState<SteelDimensions>(() => {
    const category = material.category?.toLowerCase() || '';
    const width = material.width ? Number(material.width) : undefined;
    
    return {
      width: width,
      height: (category.includes('square') && !category.includes('hollow')) ? width : material.depth ? Number(material.depth) : undefined,
      thickness: material.thickness ? Number(material.thickness) : undefined,
      depth: material.depth ? Number(material.depth) : undefined,
      flangeWidth: material.flangeTf ? Number(material.flangeTf) : undefined,
      flangeThickness: material.flangeTf ? Number(material.flangeTf) : undefined,
      webThickness: material.webTw ? Number(material.webTw) : undefined,
      outerDiameter: material.diameter ? Number(material.diameter) : undefined,
      width1: material.width1 ? parseFloat(String(material.width1)) : undefined,
      width2: material.width2 ? parseFloat(String(material.width2)) : undefined,
    };
  });
  
  const [length, setLength] = useState(1000); // Default 1000mm (1 meter)
  const [calculatedArea, setCalculatedArea] = useState<SurfaceAreaResult | null>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [calculationMethod, setCalculationMethod] = useState<"3d" | "checklist" | "percentage">("3d");
  const [percentageOverride, setPercentageOverride] = useState("100");
  const [coatingConfig, setCoatingConfig] = useState<"external-only" | "internal-only" | "external-internal">("external-internal");

  // Individual surface areas for detailed breakdown
  const [surfaceAreas, setSurfaceAreas] = useState<Record<string, number>>({});

  // Get dimensional reference image based on material category
  const getDimensionalReference = () => {
    const category = material.category?.toLowerCase() || '';
    let imageSrc = flatImg; // default
    
    if (category.includes('rhs') || category.includes('rectangular')) {
      imageSrc = rhsImg;
    } else if (category.includes('shs') || (category.includes('square') && category.includes('hollow'))) {
      imageSrc = shsImg;
    } else if (category.includes('square') && !category.includes('hollow')) {
      imageSrc = squareBarImg;
    } else if (category.includes('channel') || category.includes('pfc') || category.includes('structural channels') || category.includes('channels')) {
      imageSrc = channelImg;
    } else if (category.includes('ub') || category.includes('universal beam')) {
      imageSrc = ubImg;
    } else if (category.includes('uc') || category.includes('universal column')) {
      imageSrc = ucImg;
    } else if (category.includes('unequal') && category.includes('angle')) {
      imageSrc = unequalAnglesImg;
    } else if (category.includes('angle')) {
      imageSrc = anglesImg;
    } else if (category.includes('pipe') || category.includes('chs')) {
      imageSrc = pipeImg;
    } else if (category.includes('round') || category.includes('rod')) {
      imageSrc = roundImg;
    } else if (category.includes('flat') || category.includes('plate')) {
      imageSrc = flatImg;
    } else if (category.includes('mesh')) {
      imageSrc = meshImg;
    } else if (category.includes('rebar') || category.includes('reinforcing')) {
      imageSrc = rebarImg;
    }

    return (
      <div className="text-center">
        <img 
          src={imageSrc} 
          alt={`${material.category} dimensional reference`}
          className="mx-auto mb-2 max-h-32 object-contain"
        />
        <p className="text-xs text-muted-foreground">
          Dimensional reference for {material.category}
        </p>
      </div>
    );
  };

  useEffect(() => {
    if (material.category && dimensions.width && dimensions.thickness) {
      handleCalculate();
    }
  }, [dimensions, material.category, length]);

  // Initialize surface areas on component mount
  useEffect(() => {
    const areas = calculateIndividualSurfaces();
    setSurfaceAreas(areas);
  }, []);

  // Handle coating configuration change
  const handleCoatingConfigChange = (config: "external-only" | "internal-only" | "external-internal") => {
    setCoatingConfig(config);
    
    // Auto-select surfaces based on coating configuration
    const surfaceKeys = Object.keys(surfaceAreas);
    let newSelectedSurfaces: string[] = [];
    
    if (config === "external-only") {
      newSelectedSurfaces = surfaceKeys.filter(key => key.includes('external'));
    } else if (config === "internal-only") {
      newSelectedSurfaces = surfaceKeys.filter(key => key.includes('internal'));
    } else if (config === "external-internal") {
      newSelectedSurfaces = [...surfaceKeys]; // Select all surfaces
    }
    
    setSelectedSurfaces(newSelectedSurfaces);
    
    // Recalculate with new selection
    setTimeout(() => {
      handleCalculate();
    }, 100);
  };

  const handleDimensionChange = (field: keyof SteelDimensions, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    setDimensions(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const calculateIndividualSurfaces = () => {
    const category = material.category?.toLowerCase() || '';
    const w = dimensions.width || 0;
    const d = dimensions.depth || 0;
    const t = dimensions.thickness || 0;
    const webThickness = dimensions.webThickness || 0;
    const flangeThickness = dimensions.flangeThickness || 0;
    const L = length;
    
    const areas: Record<string, number> = {};
    
    if (category.includes('channel') || category.includes('pfc') || category.includes('structural channels') || 
        category.includes('cold formed channel') || category.includes('mild steel channel')) {
      // Channel (PFC) - C-shaped profile with separate web and flange thickness
      
      // External surfaces (3)
      areas['external_flange_top'] = w * L / 1000000; // Full flange width
      areas['external_flange_bottom'] = w * L / 1000000; // Full flange width
      areas['external_web'] = d * L / 1000000; // Full web depth
      
      // Internal surfaces (3) - calculated using actual geometry
      // Internal flanges: flange width minus web thickness (as specified)
      const internalFlangeWidth = w - webThickness;
      
      // Internal web: web depth minus both flange thicknesses
      const internalWebDepth = d - (2 * flangeThickness);
      
      areas['internal_flange_top'] = internalFlangeWidth * L / 1000000;
      areas['internal_flange_bottom'] = internalFlangeWidth * L / 1000000;
      areas['internal_web'] = internalWebDepth * L / 1000000;
      
    } else if (category.includes('ub') || category.includes('universal beam')) {
      // Universal Beam - I-shaped profile with separate web and flange thickness
      // External surfaces (no external web - web is internal between flanges)
      areas['external_flange_top'] = w * L / 1000000;
      areas['external_flange_bottom'] = w * L / 1000000;
      
      // Internal surfaces - UB has internal web surfaces and separated flange portions
      const internalWebDepth = d - (2 * flangeThickness);
      areas['internal_web_left'] = internalWebDepth * L / 1000000;
      areas['internal_web_right'] = internalWebDepth * L / 1000000;
      
      // Separated internal flange portions (excluding web thickness)
      const internalFlangePortionWidth = (w - webThickness) / 2;
      areas['internal_flange_top_left'] = internalFlangePortionWidth * L / 1000000;
      areas['internal_flange_top_right'] = internalFlangePortionWidth * L / 1000000;
      areas['internal_flange_bottom_left'] = internalFlangePortionWidth * L / 1000000;
      areas['internal_flange_bottom_right'] = internalFlangePortionWidth * L / 1000000;
      
    } else if (category.includes('uc') || category.includes('universal column')) {
      // Universal Column - H-shaped profile with separate web and flange thickness
      // External surfaces (no external web - web is internal between flanges)
      areas['external_flange_top'] = w * L / 1000000;
      areas['external_flange_bottom'] = w * L / 1000000;
      
      // Internal surfaces - UC similar to UB with separated flange portions
      const internalWebDepth = d - (2 * flangeThickness);
      areas['internal_web_left'] = internalWebDepth * L / 1000000;
      areas['internal_web_right'] = internalWebDepth * L / 1000000;
      
      // Separated internal flange portions (excluding web thickness)
      const internalFlangePortionWidth = (w - webThickness) / 2;
      areas['internal_flange_top_left'] = internalFlangePortionWidth * L / 1000000;
      areas['internal_flange_top_right'] = internalFlangePortionWidth * L / 1000000;
      areas['internal_flange_bottom_left'] = internalFlangePortionWidth * L / 1000000;
      areas['internal_flange_bottom_right'] = internalFlangePortionWidth * L / 1000000;
    } else if (category.includes('shs') || (category.includes('square') && category.includes('hollow'))) {
      // Square Hollow Section
      areas['external_top'] = w * L / 1000000;
      areas['external_bottom'] = w * L / 1000000;
      areas['external_left'] = w * L / 1000000;
      areas['external_right'] = w * L / 1000000;
      areas['internal_top'] = (w - 2 * t) * L / 1000000;
      areas['internal_bottom'] = (w - 2 * t) * L / 1000000;
      areas['internal_left'] = (w - 2 * t) * L / 1000000;
      areas['internal_right'] = (w - 2 * t) * L / 1000000;
    } else if (category.includes('square') && !category.includes('hollow')) {
      // Solid Square Bar - 4 external faces only
      areas['external_face1'] = w * L / 1000000;
      areas['external_face2'] = w * L / 1000000;
      areas['external_face3'] = w * L / 1000000;
      areas['external_face4'] = w * L / 1000000;
    } else if (category.includes('rhs')) {
      // Rectangular Hollow Section
      areas['external_top'] = w * L / 1000000;
      areas['external_bottom'] = w * L / 1000000;
      areas['external_left'] = d * L / 1000000;
      areas['external_right'] = d * L / 1000000;
      areas['internal_top'] = (w - 2 * t) * L / 1000000;
      areas['internal_bottom'] = (w - 2 * t) * L / 1000000;
      areas['internal_left'] = (d - 2 * t) * L / 1000000;
      areas['internal_right'] = (d - 2 * t) * L / 1000000;
    } else if (category.includes('chs') || category.includes('pipe')) {
      // Circular Hollow Section
      const outerDiameter = dimensions.outerDiameter || w || 0;
      const innerDiameter = outerDiameter - 2 * t;
      areas['external_surface'] = Math.PI * outerDiameter * L / 1000000;
      areas['internal_surface'] = Math.PI * innerDiameter * L / 1000000;
    } else if (category.includes('angle')) {
      // Angle - L-shaped profile with 4 selectable surfaces
      const width1 = dimensions.width1 || w || 0;
      const width2 = dimensions.width2 || d || w || 0;
      
      areas['external_leg_1'] = width1 * L / 1000000;
      areas['external_leg_2'] = width2 * L / 1000000;
      areas['internal_leg_1'] = (width1 - t) * L / 1000000;
      areas['internal_leg_2'] = (width2 - t) * L / 1000000;
    } else if (category.includes('flat') || category.includes('plate')) {
      // Flat bar/plate
      areas['external_top'] = w * L / 1000000;
      areas['external_bottom'] = w * L / 1000000;
      areas['external_edge1'] = t * L / 1000000;
      areas['external_edge2'] = t * L / 1000000;
    }
    
    setSurfaceAreas(areas);
    return areas;
  };

  const handleCalculate = () => {
    const areas = calculateIndividualSurfaces();
    const total = Object.values(areas).reduce((sum, area) => sum + area, 0);
    setCalculatedArea({
      externalArea: total,
      internalArea: 0,
      totalArea: total,
      breakdown: {}
    });
  };

  const getSurfaceOptions = () => {
    return Object.entries(surfaceAreas).map(([key, area]) => ({
      id: key,
      label: formatSurfaceLabel(key),
      area: area
    }));
  };

  const formatSurfaceLabel = (key: string) => {
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getSelectedArea = () => {
    return selectedSurfaces.reduce((total, surfaceId) => {
      return total + (surfaceAreas[surfaceId] || 0);
    }, 0);
  };

  const toggleSurface = (surfaceId: string) => {
    if (selectedSurfaces.includes(surfaceId)) {
      setSelectedSurfaces(selectedSurfaces.filter(s => s !== surfaceId));
    } else {
      setSelectedSurfaces([...selectedSurfaces, surfaceId]);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Surface Area Calculator
          </CardTitle>
          <CardDescription>
            Calculate coating surface area for {material.name} ({material.code})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Value Display */}
          {material.surfaceAreaPerMeter && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Current Surface Area</div>
              <div className="text-lg font-semibold">
                {Number(material.surfaceAreaPerMeter).toFixed(2)} m²/m
              </div>
            </div>
          )}

          {/* Dimensional Reference */}
          <div className="mb-6">
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Dimensional Reference</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {getDimensionalReference()}
              </CardContent>
            </Card>
          </div>

          {/* Coating Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Surface Area per Meter (m²/m)</Label>
                <div className="text-lg font-bold text-primary">
                  {getSelectedArea().toFixed(4)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coating-config">Coating Configuration</Label>
                <Select value={coatingConfig} onValueChange={handleCoatingConfigChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external-only">External Only</SelectItem>
                    <SelectItem value="internal-only">Internal Only</SelectItem>
                    <SelectItem value="external-internal">External + Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calculation Method Tabs */}
          <Tabs value={calculationMethod} onValueChange={(value: any) => setCalculationMethod(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="3d" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                3D Interactive
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Checklist Format
              </TabsTrigger>
              <TabsTrigger value="percentage" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Percentage Override
              </TabsTrigger>
            </TabsList>

            {/* 3D Interactive Method */}
            <TabsContent value="3d" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Interactive 3D profile selector with clickable surfaces
              </div>
              
              {/* Dimension inputs for 3D method */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (mm)</Label>
                  <Input
                    id="length"
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value) || 1000)}
                    placeholder="1000"
                  />
                </div>
                {/* Show diameter for rounds, pipes, reinforcing bars */}
                {(material.category?.toLowerCase().includes('round') || 
                  material.category?.toLowerCase().includes('pipe') || 
                  material.category?.toLowerCase().includes('reinforc')) ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="diameter">Diameter (mm)</Label>
                      <Input
                        id="diameter"
                        type="number"
                        value={dimensions.outerDiameter || ""}
                        onChange={(e) => handleDimensionChange("outerDiameter", e.target.value)}
                        placeholder="Diameter"
                      />
                    </div>
                    {material.category?.toLowerCase().includes('pipe') && (
                      <div className="space-y-2">
                        <Label htmlFor="thickness">Wall Thickness (mm)</Label>
                        <Input
                          id="thickness"
                          type="number"
                          value={dimensions.thickness || ""}
                          onChange={(e) => handleDimensionChange("thickness", e.target.value)}
                          placeholder="Wall Thickness"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Special input fields for unequal angles - show W1/W2 */}
                    {material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle') ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="width1">Width 1 / W1 (mm)</Label>
                          <Input
                            id="width1"
                            type="number"
                            value={dimensions.width1 ? parseFloat(String(dimensions.width1)).toString() : ""}
                            onChange={(e) => handleDimensionChange("width1", e.target.value)}
                            placeholder="W1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="width2">Width 2 / W2 (mm)</Label>
                          <Input
                            id="width2"
                            type="number"
                            value={dimensions.width2 ? parseFloat(String(dimensions.width2)).toString() : ""}
                            onChange={(e) => handleDimensionChange("width2", e.target.value)}
                            placeholder="W2"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="width">Width (mm)</Label>
                        <Input
                          id="width"
                          type="number"
                          value={dimensions.width || ""}
                          onChange={(e) => handleDimensionChange("width", e.target.value)}
                          placeholder="Width"
                        />
                      </div>
                    )}
                    {/* Show separate web and flange thickness for structural sections */}
                    {(material.category?.toLowerCase().includes('channel') || 
                      material.category?.toLowerCase().includes('structural channels') ||
                      material.category?.toLowerCase().includes('universal beam') ||
                      material.category?.toLowerCase().includes('universal column')) ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="web-thickness">Web Thickness (mm)</Label>
                          <Input
                            id="web-thickness"
                            type="number"
                            value={dimensions.webThickness || ""}
                            onChange={(e) => handleDimensionChange("webThickness", e.target.value)}
                            placeholder="Web Thickness"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="flange-thickness">Flange Thickness (mm)</Label>
                          <Input
                            id="flange-thickness"
                            type="number"
                            value={dimensions.flangeThickness || ""}
                            onChange={(e) => handleDimensionChange("flangeThickness", e.target.value)}
                            placeholder="Flange Thickness"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="thickness">Thickness (mm)</Label>
                        <Input
                          id="thickness"
                          type="number"
                          value={dimensions.thickness || ""}
                          onChange={(e) => handleDimensionChange("thickness", e.target.value)}
                          placeholder="Thickness"
                        />
                      </div>
                    )}
                  </>
                )}
                {dimensions.depth !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor="depth">Depth (mm)</Label>
                    <Input
                      id="depth"
                      type="number"
                      value={dimensions.depth || ""}
                      onChange={(e) => handleDimensionChange("depth", e.target.value)}
                      placeholder="Depth"
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleCalculate} className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Surface Area
              </Button>

              {/* Enhanced 3D Interactive Profile Selector with Individual Surfaces */}
              {calculatedArea && Object.keys(surfaceAreas).length > 0 && (
                <div className="space-y-4">
                  <Label>3D Interactive Profile - Click individual surfaces to select/deselect:</Label>
                  
                  {/* Calculation Formula Display */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium mb-2">Surface Area Calculations:</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {(material.category?.toLowerCase().includes('channel') || 
                        material.category?.toLowerCase().includes('structural channels') ||
                        material.category?.toLowerCase().includes('universal beam') ||
                        material.category?.toLowerCase().includes('universal column')) ? (
                        <>
                          <div>• External surfaces: web, top flange, bottom flange</div>
                          <div>• Internal flange width = width - web thickness</div>
                          <div>• Internal web depth = depth - (2 × flange thickness)</div>
                          <div>• Enhanced accuracy using separate web/flange thicknesses</div>
                          <div>• Length: {length}mm | Width: {dimensions.width}mm | Depth: {dimensions.depth}mm</div>
                          <div>• Web Thickness: {dimensions.webThickness}mm | Flange Thickness: {dimensions.flangeThickness}mm</div>
                        </>
                      ) : (
                        <>
                          <div>• Web surfaces = depth × length</div>
                          <div>• External flanges = width × length</div>
                          <div>• Internal flanges = (width - thickness) × length</div>
                          <div>• Internal dimensions account for material thickness</div>
                          <div>• Length: {length}mm | Width: {dimensions.width}mm | Depth: {dimensions.depth}mm | Thickness: {dimensions.thickness}mm</div>
                        </>
                      )}
                    </div>
                  </div>
                  

                  
                  {/* Enhanced SHS Profile with individual sides */}
                  {material.category?.toLowerCase().includes('shs') && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="260" height="180" viewBox="0 0 260 180" className="drop-shadow-sm">
                          <defs>
                            <pattern id="shs-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* SHS Profile - Clean square shape */}
                          {/* External Top */}
                          <rect x="80" y="50" width="100" height="15"
                            fill={selectedSurfaces.includes("external_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_top")} />
                          
                          {/* External Left */}
                          <rect x="80" y="65" width="15" height="70"
                            fill={selectedSurfaces.includes("external_left") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_left") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_left")} />
                          
                          {/* External Right */}
                          <rect x="165" y="65" width="15" height="70"
                            fill={selectedSurfaces.includes("external_right") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_right") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_right")} />
                          
                          {/* External Bottom */}
                          <rect x="80" y="135" width="100" height="15"
                            fill={selectedSurfaces.includes("external_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_bottom")} />
                          
                          {/* Internal surfaces */}
                          <rect x="100" y="70" width="60" height="8"
                            fill={selectedSurfaces.includes("internal_top") ? "#10b981" : "url(#shs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_top") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_top")} />
                          
                          <rect x="100" y="78" width="8" height="44"
                            fill={selectedSurfaces.includes("internal_left") ? "#10b981" : "url(#shs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_left")} />
                          
                          <rect x="152" y="78" width="8" height="44"
                            fill={selectedSurfaces.includes("internal_right") ? "#10b981" : "url(#shs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_right")} />
                          
                          <rect x="100" y="122" width="60" height="8"
                            fill={selectedSurfaces.includes("internal_bottom") ? "#10b981" : "url(#shs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_bottom") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_bottom")} />
                          
                          <text x="130" y="35" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Square Hollow Section
                          </text>
                          
                          <text x="130" y="170" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width} × {dimensions.width} × {dimensions.thickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* RHS Profile with individual sides */}
                  {material.category?.toLowerCase().includes('rhs') && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="320" height="180" viewBox="0 0 320 180" className="drop-shadow-sm">
                          <defs>
                            <pattern id="rhs-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* RHS Profile - Clean rectangular shape */}
                          {/* External Top */}
                          <rect x="60" y="50" width="200" height="15"
                            fill={selectedSurfaces.includes("external_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_top")} />
                          
                          {/* External Left */}
                          <rect x="60" y="65" width="15" height="70"
                            fill={selectedSurfaces.includes("external_left") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_left") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_left")} />
                          
                          {/* External Right */}
                          <rect x="245" y="65" width="15" height="70"
                            fill={selectedSurfaces.includes("external_right") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_right") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_right")} />
                          
                          {/* External Bottom */}
                          <rect x="60" y="135" width="200" height="15"
                            fill={selectedSurfaces.includes("external_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_bottom")} />
                          
                          {/* Internal surfaces */}
                          <rect x="80" y="70" width="160" height="8"
                            fill={selectedSurfaces.includes("internal_top") ? "#10b981" : "url(#rhs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_top") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_top")} />
                          
                          <rect x="80" y="78" width="8" height="44"
                            fill={selectedSurfaces.includes("internal_left") ? "#10b981" : "url(#rhs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_left")} />
                          
                          <rect x="232" y="78" width="8" height="44"
                            fill={selectedSurfaces.includes("internal_right") ? "#10b981" : "url(#rhs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_right")} />
                          
                          <rect x="80" y="122" width="160" height="8"
                            fill={selectedSurfaces.includes("internal_bottom") ? "#10b981" : "url(#rhs-hatch)"}
                            stroke={selectedSurfaces.includes("internal_bottom") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_bottom")} />
                          
                          <text x="160" y="35" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Rectangular Hollow Section
                          </text>
                          
                          <text x="160" y="170" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width} × {dimensions.depth} × {dimensions.thickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Universal Beam (UB) Profile with individual surfaces */}
                  {(material.category?.toLowerCase().includes('ub') || material.category?.toLowerCase().includes('universal beam')) && 
                   !material.category?.toLowerCase().includes('channel') && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="300" height="200" viewBox="0 0 300 200" className="drop-shadow-sm">
                          <defs>
                            <pattern id="ub-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Universal Beam I-beam Profile */}
                          {/* External Top Flange */}
                          <rect x="100" y="60" width="100" height="12"
                            fill={selectedSurfaces.includes("external_flange_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_top")} />
                          
                          {/* External Bottom Flange */}
                          <rect x="100" y="128" width="100" height="12"
                            fill={selectedSurfaces.includes("external_flange_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_bottom")} />
                          
                          {/* Internal Web Left */}
                          <rect x="144" y="78" width="6" height="44"
                            fill={selectedSurfaces.includes("internal_web_left") ? "#10b981" : "url(#ub-hatch)"}
                            stroke={selectedSurfaces.includes("internal_web_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web_left")} />
                          
                          {/* Internal Web Right */}
                          <rect x="150" y="78" width="6" height="44"
                            fill={selectedSurfaces.includes("internal_web_right") ? "#10b981" : "url(#ub-hatch)"}
                            stroke={selectedSurfaces.includes("internal_web_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web_right")} />
                          
                          {/* Internal Top Flange - Left */}
                          <rect x="106" y="72" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_top_left") ? "#10b981" : "url(#ub-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_top_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_top_left")} />
                          
                          {/* Internal Top Flange - Right */}
                          <rect x="156" y="72" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_top_right") ? "#10b981" : "url(#ub-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_top_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_top_right")} />
                          
                          {/* Internal Bottom Flange - Left */}
                          <rect x="106" y="122" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_bottom_left") ? "#10b981" : "url(#ub-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_bottom_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_bottom_left")} />
                          
                          {/* Internal Bottom Flange - Right */}
                          <rect x="156" y="122" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_bottom_right") ? "#10b981" : "url(#ub-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_bottom_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_bottom_right")} />
                          
                          <text x="150" y="50" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Universal Beam
                          </text>
                          
                          <text x="150" y="170" textAnchor="middle" className="text-xs fill-gray-500">
                            UB: {dimensions.width}mm × {dimensions.depth}mm × {dimensions.webThickness}mm × {dimensions.flangeThickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  

                  
                  {/* Equal Angle Profile */}
                  {material.category?.toLowerCase().includes('angle') && !material.category?.toLowerCase().includes('unequal') && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="280" height="180" viewBox="0 0 280 180" className="drop-shadow-sm">
                          <defs>
                            <pattern id="angle-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Equal Angle Profile - Clean L shape */}
                          {/* External Leg 1 (Vertical) */}
                          <rect x="120" y="50" width="18" height="80" 
                            fill={selectedSurfaces.includes("external_leg_1") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_leg_1") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_leg_1")} />
                          
                          {/* External Leg 2 (Horizontal) */}
                          <rect x="138" y="112" width="80" height="18"
                            fill={selectedSurfaces.includes("external_leg_2") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_leg_2") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_leg_2")} />
                          
                          {/* Internal Leg 1 */}
                          <rect x="125" y="55" width="8" height="57"
                            fill={selectedSurfaces.includes("internal_leg_1") ? "#10b981" : "url(#angle-hatch)"}
                            stroke={selectedSurfaces.includes("internal_leg_1") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_leg_1")} />
                          
                          {/* Internal Leg 2 */}
                          <rect x="143" y="117" width="57" height="8"
                            fill={selectedSurfaces.includes("internal_leg_2") ? "#10b981" : "url(#angle-hatch)"}
                            stroke={selectedSurfaces.includes("internal_leg_2") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_leg_2")} />
                          
                          <text x="140" y="35" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Equal Angle
                          </text>
                          
                          <text x="140" y="160" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width} × {dimensions.width} × {dimensions.thickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Unequal Angle Profile */}
                  {material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle') && (
                    <div className="space-y-3">
                      <div className="flex justify-center p-6 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="240" height="140" viewBox="0 0 240 140" className="drop-shadow-sm">
                          <defs>
                            <pattern id="unequal-angle-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Unequal Angle Profile - L-shape with accurate internal faces */}
                          {/* External Leg 1 (Vertical - W1) */}
                          <rect x="80" y="25" width="16" height="70" 
                            fill={selectedSurfaces.includes("external_leg_1") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_leg_1") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_leg_1")} />
                          
                          {/* External Leg 2 (Horizontal - W2) */}
                          <rect x="96" y="79" width="50" height="16"
                            fill={selectedSurfaces.includes("external_leg_2") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_leg_2") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_leg_2")} />
                          
                          {/* Internal Leg 1 - positioned exactly on the inside right edge of vertical leg */}
                          <rect x="92" y="29" width="4" height="50"
                            fill={selectedSurfaces.includes("internal_leg_1") ? "#10b981" : "url(#unequal-angle-hatch)"}
                            stroke={selectedSurfaces.includes("internal_leg_1") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_leg_1")} />
                          
                          {/* Internal Leg 2 - positioned exactly on the inside top edge of horizontal leg */}
                          <rect x="100" y="79" width="38" height="4"
                            fill={selectedSurfaces.includes("internal_leg_2") ? "#10b981" : "url(#unequal-angle-hatch)"}
                            stroke={selectedSurfaces.includes("internal_leg_2") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_leg_2")} />
                          
                          <text x="120" y="18" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Unequal Angle
                          </text>
                          
                          <text x="120" y="120" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width1 || dimensions.width} × {dimensions.width2 || dimensions.depth} × {dimensions.thickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Flat Bar Profile - Enhanced with larger selectable areas */}
                  {(material.category?.toLowerCase().includes('flat') || material.category?.toLowerCase().includes('plate')) && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="280" height="160" viewBox="0 0 280 160" className="drop-shadow-sm">
                          <defs>
                            <pattern id="flat-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Flat Bar Profile - Larger, easier to select areas */}
                          {/* External Top - Much larger clickable area */}
                          <rect x="60" y="50" width="160" height="25"
                            fill={selectedSurfaces.includes("external_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_top")} />
                          
                          {/* External Bottom - Much larger clickable area */}
                          <rect x="60" y="85" width="160" height="25"
                            fill={selectedSurfaces.includes("external_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_bottom")} />
                          
                          {/* External Edge 1 - Larger clickable area */}
                          <rect x="40" y="50" width="20" height="60"
                            fill={selectedSurfaces.includes("external_edge1") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_edge1") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_edge1")} />
                          
                          {/* External Edge 2 - Larger clickable area */}
                          <rect x="220" y="50" width="20" height="60"
                            fill={selectedSurfaces.includes("external_edge2") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_edge2") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_edge2")} />
                          
                          <text x="140" y="35" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Flat Bar
                          </text>
                          
                          <text x="140" y="140" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width} × {dimensions.thickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Channel Profile (PFC, Cold Formed, Mild Steel) */}
                  {(material.category?.toLowerCase().includes('channel') || 
                    material.category?.toLowerCase().includes('pfc') || 
                    material.category?.toLowerCase().includes('structural channels') ||
                    material.category?.toLowerCase().includes('cold formed channel') ||
                    material.category?.toLowerCase().includes('mild steel channel')) && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="300" height="200" viewBox="0 0 300 200" className="drop-shadow-sm">
                          <defs>
                            <pattern id="channel-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Channel C-shaped Profile */}
                          {/* External Top Flange */}
                          <rect x="120" y="60" width="80" height="12"
                            fill={selectedSurfaces.includes("external_flange_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_top")} />
                          
                          {/* External Web */}
                          <rect x="120" y="72" width="12" height="56"
                            fill={selectedSurfaces.includes("external_web") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_web") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_web")} />
                          
                          {/* External Bottom Flange */}
                          <rect x="120" y="128" width="80" height="12"
                            fill={selectedSurfaces.includes("external_flange_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_bottom")} />
                          
                          {/* Internal Top Flange */}
                          <rect x="132" y="72" width="56" height="6"
                            fill={selectedSurfaces.includes("internal_flange_top") ? "#10b981" : "url(#channel-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_top") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_top")} />
                          
                          {/* Internal Web */}
                          <rect x="132" y="78" width="6" height="44"
                            fill={selectedSurfaces.includes("internal_web") ? "#10b981" : "url(#channel-hatch)"}
                            stroke={selectedSurfaces.includes("internal_web") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web")} />
                          
                          {/* Internal Bottom Flange */}
                          <rect x="132" y="122" width="56" height="6"
                            fill={selectedSurfaces.includes("internal_flange_bottom") ? "#10b981" : "url(#channel-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_bottom") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_bottom")} />
                          
                          <text x="150" y="50" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Channel
                          </text>
                          
                          <text x="150" y="170" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width}mm × {dimensions.depth}mm × {dimensions.webThickness}mm × {dimensions.flangeThickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Circular Hollow Section (CHS) */}
                  {(material.category?.toLowerCase().includes('chs') || material.category?.toLowerCase().includes('pipe')) && (
                    <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <svg width="300" height="200" viewBox="0 0 300 200" className="border rounded">
                        <rect width="300" height="200" fill="white" />
                        
                        {/* External Circle */}
                        <circle cx="150" cy="100" r="60"
                          fill={selectedSurfaces.includes("external_surface") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="3"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_surface")} />
                        
                        {/* Internal Circle */}
                        <circle cx="150" cy="100" r="45"
                          fill={selectedSurfaces.includes("internal_surface") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_surface")} />
                        
                        <text x="150" y="75" textAnchor="middle" className="text-xs font-medium">External Surface</text>
                        <text x="150" y="100" textAnchor="middle" className="text-xs font-medium">Internal Surface</text>
                        
                        <text x="150" y="180" textAnchor="middle" className="text-xs text-gray-600">
                          CHS: ⌀{dimensions.outerDiameter || dimensions.width}mm × {dimensions.thickness}mm × {length}mm
                        </text>
                      </svg>
                    </div>
                  )}
                  
                  {/* Universal Column Profile */}
                  {(material.category?.toLowerCase().includes('uc') || material.category?.toLowerCase().includes('universal column')) && 
                   !material.category?.toLowerCase().includes('channel') && (
                    <div className="space-y-4">
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="300" height="200" viewBox="0 0 300 200" className="drop-shadow-sm">
                          <defs>
                            <pattern id="uc-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Universal Column I-beam Profile */}
                          {/* External Top Flange */}
                          <rect x="100" y="60" width="100" height="12"
                            fill={selectedSurfaces.includes("external_flange_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_top")} />
                          
                          {/* External Bottom Flange */}
                          <rect x="100" y="128" width="100" height="12"
                            fill={selectedSurfaces.includes("external_flange_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_bottom")} />
                          
                          {/* Internal Web Left */}
                          <rect x="144" y="78" width="6" height="44"
                            fill={selectedSurfaces.includes("internal_web_left") ? "#10b981" : "url(#uc-hatch)"}
                            stroke={selectedSurfaces.includes("internal_web_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web_left")} />
                          
                          {/* Internal Web Right */}
                          <rect x="150" y="78" width="6" height="44"
                            fill={selectedSurfaces.includes("internal_web_right") ? "#10b981" : "url(#uc-hatch)"}
                            stroke={selectedSurfaces.includes("internal_web_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web_right")} />
                          
                          {/* Internal Top Flange - Left */}
                          <rect x="106" y="72" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_top_left") ? "#10b981" : "url(#uc-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_top_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_top_left")} />
                          
                          {/* Internal Top Flange - Right */}
                          <rect x="156" y="72" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_top_right") ? "#10b981" : "url(#uc-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_top_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_top_right")} />
                          
                          {/* Internal Bottom Flange - Left */}
                          <rect x="106" y="122" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_bottom_left") ? "#10b981" : "url(#uc-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_bottom_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_bottom_left")} />
                          
                          {/* Internal Bottom Flange - Right */}
                          <rect x="156" y="122" width="38" height="6"
                            fill={selectedSurfaces.includes("internal_flange_bottom_right") ? "#10b981" : "url(#uc-hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_bottom_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_bottom_right")} />
                          
                          <text x="150" y="50" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Universal Column
                          </text>
                          
                          <text x="150" y="170" textAnchor="middle" className="text-xs fill-gray-500">
                            UC: {dimensions.width}mm × {dimensions.depth}mm × {dimensions.webThickness}mm × {dimensions.flangeThickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                          <span>External</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded border"></div>
                          <span>Internal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                          <span>Unselected</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Professional Surface Selection Table */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <Label className="text-lg font-semibold">Surface Area Selection</Label>
                      <p className="text-sm text-muted-foreground mt-1">Click surfaces above or select from the list below</p>
                    </div>
                    
                    {/* Quick Selection Buttons */}
                    <div className="flex justify-center gap-3 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const externalSurfaces = getSurfaceOptions()
                            .filter(option => option.id.includes('external'))
                            .map(option => option.id);
                          setSelectedSurfaces(prev => {
                            const nonExternal = prev.filter(id => !id.includes('external'));
                            return [...nonExternal, ...externalSurfaces];
                          });
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                      >
                        Select All External
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const internalSurfaces = getSurfaceOptions()
                            .filter(option => option.id.includes('internal'))
                            .map(option => option.id);
                          setSelectedSurfaces(prev => {
                            const nonInternal = prev.filter(id => !id.includes('internal'));
                            return [...nonInternal, ...internalSurfaces];
                          });
                        }}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      >
                        Select All Internal
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSurfaces([])}
                        className="hover:bg-gray-100"
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-900 rounded-lg border overflow-hidden">
                      <div className="grid grid-cols-4 gap-0 bg-gray-50 dark:bg-gray-800 border-b text-sm font-medium">
                        <div className="p-3 text-center">Surface</div>
                        <div className="p-3 text-center">Type</div>
                        <div className="p-3 text-center">Area (m²)</div>
                        <div className="p-3 text-center">Select</div>
                      </div>
                      
                      {getSurfaceOptions().map((option, index) => (
                        <div key={option.id} 
                          className={`grid grid-cols-4 gap-0 border-b border-gray-100 dark:border-gray-700 transition-colors ${
                            selectedSurfaces.includes(option.id) 
                              ? 'bg-blue-50 dark:bg-blue-900/20' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}>
                          <div className="p-3 text-sm font-medium">
                            {option.label}
                          </div>
                          <div className="p-3 text-center">
                            <Badge variant={option.id.includes('external') ? 'default' : 'secondary'} className="text-xs">
                              {option.id.includes('external') ? 'External' : 'Internal'}
                            </Badge>
                          </div>
                          <div className="p-3 text-center font-mono text-sm">
                            {option.area.toFixed(4)}
                          </div>
                          <div className="p-3 text-center">
                            <Checkbox
                              checked={selectedSurfaces.includes(option.id)}
                              onCheckedChange={() => toggleSurface(option.id)}
                              className="mx-auto"
                            />
                          </div>
                        </div>
                      ))}
                      
                      {/* Total Row */}
                      <div className="grid grid-cols-4 gap-0 bg-green-50 dark:bg-green-900/20 font-semibold">
                        <div className="p-3 text-sm">Total Selected</div>
                        <div className="p-3 text-center">
                          <Badge variant="outline">{selectedSurfaces.length} surfaces</Badge>
                        </div>
                        <div className="p-3 text-center font-mono text-green-600 dark:text-green-400">
                          {getSelectedArea().toFixed(4)}
                        </div>
                        <div className="p-3 text-center">
                          <div className="w-4 h-4 bg-green-500 rounded mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Checklist Format Method */}
            <TabsContent value="checklist" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Simple checkboxes for each surface area component
              </div>
              
              {/* Dimension inputs for checklist method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checklist-width">Width (mm)</Label>
                  <Input
                    id="checklist-width"
                    type="number"
                    value={dimensions.width || ""}
                    onChange={(e) => handleDimensionChange("width", e.target.value)}
                    placeholder="Width"
                  />
                </div>
                {dimensions.thickness !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor="checklist-thickness">Thickness (mm)</Label>
                    <Input
                      id="checklist-thickness"
                      type="number"
                      value={dimensions.thickness || ""}
                      onChange={(e) => handleDimensionChange("thickness", e.target.value)}
                      placeholder="Thickness"
                    />
                  </div>
                )}
                {dimensions.depth !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor="checklist-depth">Depth (mm)</Label>
                    <Input
                      id="checklist-depth"
                      type="number"
                      value={dimensions.depth || ""}
                      onChange={(e) => handleDimensionChange("depth", e.target.value)}
                      placeholder="Depth"
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleCalculate} className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Surface Area
              </Button>

              {/* Checklist format surface selection */}
              {calculatedArea && getSurfaceOptions().length > 0 && (
                <div className="space-y-3">
                  <Label>Surface Areas to Include:</Label>
                  {getSurfaceOptions().map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`checklist-${option.id}`}
                          checked={selectedSurfaces.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSurfaces([...selectedSurfaces, option.id]);
                            } else {
                              setSelectedSurfaces(selectedSurfaces.filter(s => s !== option.id));
                            }
                          }}
                        />
                        <Label htmlFor={`checklist-${option.id}`} className="font-medium">
                          {option.label}
                        </Label>
                      </div>
                      <Badge variant="secondary">
                        {option.area.toFixed(2)} m²/m
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Percentage Override Method */}
            <TabsContent value="percentage" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Manual percentage input for complex situations
              </div>
              
              {/* Calculate base area first */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="percentage-width">Width (mm)</Label>
                  <Input
                    id="percentage-width"
                    type="number"
                    value={dimensions.width || ""}
                    onChange={(e) => handleDimensionChange("width", e.target.value)}
                    placeholder="Width"
                  />
                </div>
                {dimensions.thickness !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor="percentage-thickness">Thickness (mm)</Label>
                    <Input
                      id="percentage-thickness"
                      type="number"
                      value={dimensions.thickness || ""}
                      onChange={(e) => handleDimensionChange("thickness", e.target.value)}
                      placeholder="Thickness"
                    />
                  </div>
                )}
                {dimensions.depth !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor="percentage-depth">Depth (mm)</Label>
                    <Input
                      id="percentage-depth"
                      type="number"
                      value={dimensions.depth || ""}
                      onChange={(e) => handleDimensionChange("depth", e.target.value)}
                      placeholder="Depth"
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleCalculate} className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Base Surface Area
              </Button>

              {calculatedArea && (
                <div className="space-y-4">
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Theoretical Total Surface Area</div>
                    <div className="text-lg font-semibold">
                      {calculatedArea.totalArea.toFixed(2)} m²/m
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="percentage-override">Surface Area Percentage (%)</Label>
                    <Input
                      id="percentage-override"
                      type="number"
                      value={percentageOverride}
                      onChange={(e) => setPercentageOverride(e.target.value)}
                      placeholder="100"
                      min="0"
                      max="200"
                    />
                    <div className="text-xs text-muted-foreground">
                      Adjust percentage based on connection deductions, access limitations, etc.
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm text-muted-foreground">Final Surface Area</div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {(calculatedArea.totalArea * (parseFloat(percentageOverride) || 100) / 100).toFixed(2)} m²/m
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Results Display */}
          {calculationMethod === "3d" && calculatedArea && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Selected Surface Area</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {getSelectedArea().toFixed(2)} m²/m
              </div>
            </div>
          )}

          {calculationMethod === "checklist" && calculatedArea && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Selected Surface Area</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {getSelectedArea().toFixed(2)} m²/m
              </div>
            </div>
          )}

          {calculationMethod === "percentage" && calculatedArea && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Final Surface Area</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {(calculatedArea.totalArea * (parseFloat(percentageOverride) || 100) / 100).toFixed(2)} m²/m
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}