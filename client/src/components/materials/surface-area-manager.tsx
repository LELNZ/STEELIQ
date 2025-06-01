import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Save, RotateCcw, Image, CheckSquare, Percent } from "lucide-react";
import { calculateSurfaceArea, type SteelDimensions, type SurfaceAreaResult } from "@/lib/surface-area-calculator";
import type { Material } from "@shared/schema";

// Import dimensional reference images
import anglesImg from "@assets/Angles.png";
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
}

export default function SurfaceAreaManager({ material, onSave }: SurfaceAreaManagerProps) {
  const [dimensions, setDimensions] = useState<SteelDimensions>({
    width: material.width ? Number(material.width) : undefined,
    thickness: material.thickness ? Number(material.thickness) : undefined,
    depth: material.depth ? Number(material.depth) : undefined,
    flangeWidth: material.flangeTf ? Number(material.flangeTf) : undefined,
    flangeThickness: material.flangeTf ? Number(material.flangeTf) : undefined,
    webThickness: material.webTw ? Number(material.webTw) : undefined,
    outerDiameter: material.diameter ? Number(material.diameter) : undefined,
  });
  
  const [length, setLength] = useState(1000); // Default 1000mm (1 meter)
  const [calculatedArea, setCalculatedArea] = useState<SurfaceAreaResult | null>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [calculationMethod, setCalculationMethod] = useState<"3d" | "checklist" | "percentage">("3d");
  const [percentageOverride, setPercentageOverride] = useState("100");

  // Individual surface areas for detailed breakdown
  const [surfaceAreas, setSurfaceAreas] = useState<Record<string, number>>({});

  // Get dimensional reference image based on material category
  const getDimensionalReference = () => {
    const category = material.category?.toLowerCase() || '';
    let imageSrc = flatImg; // default
    
    if (category.includes('rhs') || category.includes('rectangular')) {
      imageSrc = rhsImg;
    } else if (category.includes('shs') || category.includes('square')) {
      imageSrc = shsImg;
    } else if (category.includes('ub') || category.includes('universal beam')) {
      imageSrc = ubImg;
    } else if (category.includes('uc') || category.includes('universal column')) {
      imageSrc = ucImg;
    } else if (category.includes('angle')) {
      imageSrc = anglesImg;
    } else if (category.includes('channel') || category.includes('pfc')) {
      imageSrc = channelImg;
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
    const L = length;
    
    const areas: Record<string, number> = {};
    
    if (category.includes('channel') || category.includes('pfc')) {
      // Channel (PFC) - C-shaped profile
      areas['external_web'] = d * L / 1000000; // Convert mm² to m²
      areas['internal_web_left'] = (d - 2 * t) * L / 1000000;
      areas['internal_web_right'] = (d - 2 * t) * L / 1000000;
      areas['external_flange_top'] = w * L / 1000000;
      areas['external_flange_bottom'] = w * L / 1000000;
      areas['internal_flange_top'] = (w - t) * L / 1000000;
      areas['internal_flange_bottom'] = (w - t) * L / 1000000;
    } else if (category.includes('ub') || category.includes('universal beam')) {
      // Universal Beam - I-shaped profile
      areas['external_web'] = d * L / 1000000;
      areas['internal_web_left'] = (d - 2 * t) * L / 1000000;
      areas['internal_web_right'] = (d - 2 * t) * L / 1000000;
      areas['external_flange_top'] = w * L / 1000000;
      areas['external_flange_bottom'] = w * L / 1000000;
      areas['internal_flange_top'] = w * L / 1000000;
      areas['internal_flange_bottom'] = w * L / 1000000;
    } else if (category.includes('uc') || category.includes('universal column')) {
      // Universal Column - H-shaped profile (wider flanges)
      areas['external_web'] = d * L / 1000000;
      areas['internal_web_left'] = (d - 2 * t) * L / 1000000;
      areas['internal_web_right'] = (d - 2 * t) * L / 1000000;
      areas['external_flange_top'] = w * L / 1000000;
      areas['external_flange_bottom'] = w * L / 1000000;
      areas['internal_flange_top'] = w * L / 1000000;
      areas['internal_flange_bottom'] = w * L / 1000000;
    } else if (category.includes('shs')) {
      // Square Hollow Section
      areas['external_top'] = w * L / 1000000;
      areas['external_bottom'] = w * L / 1000000;
      areas['external_left'] = w * L / 1000000;
      areas['external_right'] = w * L / 1000000;
      areas['internal_top'] = (w - 2 * t) * L / 1000000;
      areas['internal_bottom'] = (w - 2 * t) * L / 1000000;
      areas['internal_left'] = (w - 2 * t) * L / 1000000;
      areas['internal_right'] = (w - 2 * t) * L / 1000000;
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
      // Angle - L-shaped profile
      areas['external_leg1'] = w * L / 1000000;
      areas['external_leg2'] = d * L / 1000000;
      areas['internal_leg1'] = (w - t) * L / 1000000;
      areas['internal_leg2'] = (d - t) * L / 1000000;
      areas['internal_corner'] = (w - t) * L / 1000000; // Corner intersection
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
                      <div>• Web surfaces = depth × length</div>
                      <div>• External flanges = width × length</div>
                      <div>• Internal flanges = (width - thickness) × length</div>
                      <div>• Internal dimensions account for material thickness</div>
                      <div>• Length: {length}mm | Width: {dimensions.width}mm | Depth: {dimensions.depth}mm | Thickness: {dimensions.thickness}mm</div>
                    </div>
                  </div>
                  
                  {/* Interactive SVG Profile - Channel (PFC) */}
                  {(material.category?.toLowerCase().includes('channel') || material.category?.toLowerCase().includes('pfc')) && (
                    <div className="space-y-4">
                      {/* Clean Profile Diagram */}
                      <div className="flex justify-center p-8 bg-white dark:bg-gray-900 rounded-lg border">
                        <svg width="300" height="200" viewBox="0 0 300 200" className="drop-shadow-sm">
                          <defs>
                            <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#9ca3af" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          
                          {/* Channel Profile - Clean C shape */}
                          {/* External Web */}
                          <rect x="120" y="60" width="20" height="80" 
                            fill={selectedSurfaces.includes("external_web") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_web") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_web")} />
                          
                          {/* Top External Flange */}
                          <rect x="140" y="60" width="60" height="20"
                            fill={selectedSurfaces.includes("external_flange_top") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_top") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_top")} />
                          
                          {/* Bottom External Flange */}
                          <rect x="140" y="120" width="60" height="20"
                            fill={selectedSurfaces.includes("external_flange_bottom") ? "#3b82f6" : "#f3f4f6"}
                            stroke={selectedSurfaces.includes("external_flange_bottom") ? "#1d4ed8" : "#d1d5db"} 
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("external_flange_bottom")} />
                          
                          {/* Internal surfaces with different styling */}
                          <rect x="145" y="80" width="50" height="6"
                            fill={selectedSurfaces.includes("internal_flange_top") ? "#10b981" : "url(#hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_top") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_top")} />
                          
                          <rect x="145" y="114" width="50" height="6"
                            fill={selectedSurfaces.includes("internal_flange_bottom") ? "#10b981" : "url(#hatch)"}
                            stroke={selectedSurfaces.includes("internal_flange_bottom") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_flange_bottom")} />
                          
                          <rect x="125" y="86" width="6" height="28"
                            fill={selectedSurfaces.includes("internal_web_left") ? "#10b981" : "url(#hatch)"}
                            stroke={selectedSurfaces.includes("internal_web_left") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web_left")} />
                          
                          <rect x="131" y="86" width="6" height="28"
                            fill={selectedSurfaces.includes("internal_web_right") ? "#10b981" : "url(#hatch)"}
                            stroke={selectedSurfaces.includes("internal_web_right") ? "#059669" : "#9ca3af"} 
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-all duration-200"
                            onClick={() => toggleSurface("internal_web_right")} />
                          
                          {/* Clean dimension labels */}
                          <text x="150" y="45" textAnchor="middle" className="text-sm font-semibold fill-gray-700 dark:fill-gray-300">
                            Channel Profile
                          </text>
                          
                          <text x="150" y="175" textAnchor="middle" className="text-xs fill-gray-500">
                            {dimensions.width} × {dimensions.depth} × {dimensions.thickness}mm
                          </text>
                        </svg>
                      </div>
                      
                      {/* Simplified Legend */}
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
                  
                  {/* Enhanced SHS Profile with individual sides */}
                  {material.category?.toLowerCase().includes('shs') && (
                    <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <svg width="350" height="250" viewBox="0 0 350 250" className="border rounded">
                        <rect width="350" height="250" fill="white" />
                        
                        {/* External Top */}
                        <rect x="100" y="75" width="150" height="15"
                          fill={selectedSurfaces.includes("external_top") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_top")} />
                        <text x="175" y="70" textAnchor="middle" className="text-xs font-medium">Ext Top</text>
                        
                        {/* External Left */}
                        <rect x="100" y="90" width="15" height="120"
                          fill={selectedSurfaces.includes("external_left") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_left")} />
                        <text x="95" y="150" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 95 150)">Ext Left</text>
                        
                        {/* External Right */}
                        <rect x="235" y="90" width="15" height="120"
                          fill={selectedSurfaces.includes("external_right") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_right")} />
                        <text x="255" y="150" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 255 150)">Ext Right</text>
                        
                        {/* External Bottom */}
                        <rect x="100" y="210" width="150" height="15"
                          fill={selectedSurfaces.includes("external_bottom") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_bottom")} />
                        <text x="175" y="240" textAnchor="middle" className="text-xs font-medium">Ext Bottom</text>
                        
                        {/* Internal surfaces - smaller and centered */}
                        <rect x="120" y="100" width="110" height="10"
                          fill={selectedSurfaces.includes("internal_top") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_top")} />
                        <text x="175" y="118" textAnchor="middle" className="text-xs">Int Top</text>
                        
                        <rect x="120" y="110" width="10" height="90"
                          fill={selectedSurfaces.includes("internal_left") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_left")} />
                        
                        <rect x="220" y="110" width="10" height="90"
                          fill={selectedSurfaces.includes("internal_right") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_right")} />
                        
                        <rect x="120" y="200" width="110" height="10"
                          fill={selectedSurfaces.includes("internal_bottom") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_bottom")} />
                        <text x="175" y="195" textAnchor="middle" className="text-xs">Int Bottom</text>
                      </svg>
                    </div>
                  )}
                  
                  {/* RHS Profile with individual sides */}
                  {material.category?.toLowerCase().includes('rhs') && (
                    <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <svg width="400" height="250" viewBox="0 0 400 250" className="border rounded">
                        <rect width="400" height="250" fill="white" />
                        
                        {/* External Top */}
                        <rect x="75" y="75" width="250" height="15"
                          fill={selectedSurfaces.includes("external_top") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_top")} />
                        <text x="200" y="70" textAnchor="middle" className="text-xs font-medium">External Top</text>
                        
                        {/* External Left */}
                        <rect x="75" y="90" width="15" height="120"
                          fill={selectedSurfaces.includes("external_left") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_left")} />
                        <text x="70" y="150" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 70 150)">Ext Left</text>
                        
                        {/* External Right */}
                        <rect x="310" y="90" width="15" height="120"
                          fill={selectedSurfaces.includes("external_right") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_right")} />
                        <text x="330" y="150" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 330 150)">Ext Right</text>
                        
                        {/* External Bottom */}
                        <rect x="75" y="210" width="250" height="15"
                          fill={selectedSurfaces.includes("external_bottom") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_bottom")} />
                        <text x="200" y="240" textAnchor="middle" className="text-xs font-medium">External Bottom</text>
                        
                        {/* Internal surfaces */}
                        <rect x="100" y="100" width="200" height="10"
                          fill={selectedSurfaces.includes("internal_top") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_top")} />
                        <text x="200" y="118" textAnchor="middle" className="text-xs">Internal Top</text>
                        
                        <rect x="100" y="110" width="10" height="90"
                          fill={selectedSurfaces.includes("internal_left") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_left")} />
                        <text x="105" y="155" textAnchor="middle" className="text-xs" transform="rotate(-90 105 155)">Int L</text>
                        
                        <rect x="290" y="110" width="10" height="90"
                          fill={selectedSurfaces.includes("internal_right") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_right")} />
                        <text x="295" y="155" textAnchor="middle" className="text-xs" transform="rotate(-90 295 155)">Int R</text>
                        
                        <rect x="100" y="200" width="200" height="10"
                          fill={selectedSurfaces.includes("internal_bottom") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_bottom")} />
                        <text x="200" y="195" textAnchor="middle" className="text-xs">Internal Bottom</text>
                      </svg>
                    </div>
                  )}
                  
                  {/* Universal Beam (UB) Profile with individual surfaces */}
                  {(material.category?.toLowerCase().includes('ub') || material.category?.toLowerCase().includes('universal beam')) && (
                    <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <svg width="400" height="280" viewBox="0 0 400 280" className="border rounded">
                        <rect width="400" height="280" fill="white" />
                        
                        {/* External Top Flange */}
                        <rect x="100" y="50" width="200" height="20"
                          fill={selectedSurfaces.includes("external_flange_top") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_flange_top")} />
                        <text x="200" y="45" textAnchor="middle" className="text-xs font-medium">External Top Flange</text>
                        
                        {/* External Web */}
                        <rect x="185" y="70" width="30" height="120"
                          fill={selectedSurfaces.includes("external_web") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_web")} />
                        <text x="175" y="130" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 175 130)">Ext Web</text>
                        
                        {/* External Bottom Flange */}
                        <rect x="100" y="190" width="200" height="20"
                          fill={selectedSurfaces.includes("external_flange_bottom") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_flange_bottom")} />
                        <text x="200" y="225" textAnchor="middle" className="text-xs font-medium">External Bottom Flange</text>
                        
                        {/* Internal Top Flange */}
                        <rect x="120" y="75" width="160" height="10"
                          fill={selectedSurfaces.includes("internal_flange_top") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_flange_top")} />
                        <text x="200" y="92" textAnchor="middle" className="text-xs">Internal Top Flange</text>
                        
                        {/* Internal Web Left */}
                        <rect x="190" y="85" width="8" height="100"
                          fill={selectedSurfaces.includes("internal_web_left") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_web_left")} />
                        <text x="194" y="135" textAnchor="middle" className="text-xs" transform="rotate(-90 194 135)">Int L</text>
                        
                        {/* Internal Web Right */}
                        <rect x="202" y="85" width="8" height="100"
                          fill={selectedSurfaces.includes("internal_web_right") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_web_right")} />
                        <text x="206" y="135" textAnchor="middle" className="text-xs" transform="rotate(-90 206 135)">Int R</text>
                        
                        {/* Internal Bottom Flange */}
                        <rect x="120" y="175" width="160" height="10"
                          fill={selectedSurfaces.includes("internal_flange_bottom") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_flange_bottom")} />
                        <text x="200" y="172" textAnchor="middle" className="text-xs">Internal Bottom Flange</text>
                        
                        <text x="200" y="250" textAnchor="middle" className="text-xs text-gray-600">
                          UB: {dimensions.width}mm × {dimensions.depth}mm × {dimensions.thickness}mm × {length}mm
                        </text>
                      </svg>
                    </div>
                  )}
                  
                  {/* Angle Profile with individual legs */}
                  {material.category?.toLowerCase().includes('angle') && (
                    <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <svg width="350" height="250" viewBox="0 0 350 250" className="border rounded">
                        <rect width="350" height="250" fill="white" />
                        
                        {/* External Leg 1 (Horizontal) */}
                        <rect x="150" y="120" width="120" height="15"
                          fill={selectedSurfaces.includes("external_leg1") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_leg1")} />
                        <text x="210" y="115" textAnchor="middle" className="text-xs font-medium">External Leg 1</text>
                        
                        {/* External Leg 2 (Vertical) */}
                        <rect x="150" y="60" width="15" height="120"
                          fill={selectedSurfaces.includes("external_leg2") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_leg2")} />
                        <text x="145" y="120" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 145 120)">Ext Leg 2</text>
                        
                        {/* Internal Leg 1 */}
                        <rect x="170" y="125" width="90" height="8"
                          fill={selectedSurfaces.includes("internal_leg1") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_leg1")} />
                        <text x="215" y="145" textAnchor="middle" className="text-xs">Internal Leg 1</text>
                        
                        {/* Internal Leg 2 */}
                        <rect x="157" y="80" width="8" height="90"
                          fill={selectedSurfaces.includes("internal_leg2") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_leg2")} />
                        <text x="161" y="125" textAnchor="middle" className="text-xs" transform="rotate(-90 161 125)">Int Leg 2</text>
                        
                        {/* Internal Corner */}
                        <rect x="157" y="125" width="13" height="8"
                          fill={selectedSurfaces.includes("internal_corner") ? "#10b981" : "#f3f4f6"}
                          stroke="#374151" strokeWidth="1"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("internal_corner")} />
                        <text x="164" y="155" textAnchor="middle" className="text-xs">Corner</text>
                        
                        <text x="210" y="200" textAnchor="middle" className="text-xs text-gray-600">
                          Angle: {dimensions.width}mm × {dimensions.depth}mm × {dimensions.thickness}mm × {length}mm
                        </text>
                      </svg>
                    </div>
                  )}
                  
                  {/* Flat Bar Profile */}
                  {(material.category?.toLowerCase().includes('flat') || material.category?.toLowerCase().includes('plate')) && (
                    <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <svg width="350" height="200" viewBox="0 0 350 200" className="border rounded">
                        <rect width="350" height="200" fill="white" />
                        
                        {/* External Top */}
                        <rect x="100" y="80" width="150" height="15"
                          fill={selectedSurfaces.includes("external_top") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_top")} />
                        <text x="175" y="75" textAnchor="middle" className="text-xs font-medium">External Top</text>
                        
                        {/* External Bottom */}
                        <rect x="100" y="105" width="150" height="15"
                          fill={selectedSurfaces.includes("external_bottom") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_bottom")} />
                        <text x="175" y="135" textAnchor="middle" className="text-xs font-medium">External Bottom</text>
                        
                        {/* External Edge 1 */}
                        <rect x="95" y="80" width="5" height="40"
                          fill={selectedSurfaces.includes("external_edge1") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_edge1")} />
                        <text x="85" y="100" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 85 100)">Edge 1</text>
                        
                        {/* External Edge 2 */}
                        <rect x="250" y="80" width="5" height="40"
                          fill={selectedSurfaces.includes("external_edge2") ? "#3b82f6" : "#e5e7eb"}
                          stroke="#374151" strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleSurface("external_edge2")} />
                        <text x="265" y="100" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90 265 100)">Edge 2</text>
                        
                        <text x="175" y="160" textAnchor="middle" className="text-xs text-gray-600">
                          Flat Bar: {dimensions.width}mm × {dimensions.thickness}mm × {length}mm
                        </text>
                      </svg>
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
                  
                  {/* Professional Surface Selection Table */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <Label className="text-lg font-semibold">Surface Area Selection</Label>
                      <p className="text-sm text-muted-foreground mt-1">Click surfaces above or select from the list below</p>
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
              onClick={() => {
                let finalArea = 0;
                if (calculationMethod === "percentage" && calculatedArea) {
                  finalArea = calculatedArea.totalArea * (parseFloat(percentageOverride) || 100) / 100;
                } else {
                  finalArea = getSelectedArea();
                }
                onSave(finalArea);
              }}
              className="flex-1"
              disabled={!calculatedArea || getSelectedArea() === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Surface Area
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCalculatedArea(null);
                setSelectedSurfaces(["external"]);
                setPercentageOverride("100");
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}