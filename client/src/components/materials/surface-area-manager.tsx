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
  
  const [calculatedArea, setCalculatedArea] = useState<SurfaceAreaResult | null>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(["external"]);
  const [calculationMethod, setCalculationMethod] = useState<"3d" | "checklist" | "percentage">("3d");
  const [percentageOverride, setPercentageOverride] = useState("100");

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
    if (material.category) {
      const result = calculateSurfaceArea(material.category, dimensions);
      setCalculatedArea(result);
    }
  }, [dimensions, material.category]);

  const handleDimensionChange = (field: keyof SteelDimensions, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    setDimensions(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleCalculate = () => {
    if (material.category) {
      const result = calculateSurfaceArea(material.category, dimensions);
      setCalculatedArea(result);
    }
  };

  const getSurfaceOptions = () => {
    if (!calculatedArea) return [];
    
    const options = [];
    if (calculatedArea.externalArea > 0) {
      options.push({ id: "external", label: "External Surfaces", area: calculatedArea.externalArea });
    }
    if (calculatedArea.internalArea > 0) {
      options.push({ id: "internal", label: "Internal Surfaces", area: calculatedArea.internalArea });
    }
    return options;
  };

  const getSelectedArea = () => {
    if (!calculatedArea) return 0;
    
    let total = 0;
    if (selectedSurfaces.includes("external")) {
      total += calculatedArea.externalArea;
    }
    if (selectedSurfaces.includes("internal")) {
      total += calculatedArea.internalArea;
    }
    return total;
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
              <div className="grid grid-cols-2 gap-4">
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
                {dimensions.thickness !== undefined && (
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

              {/* 3D Interactive Profile Selector */}
              {calculatedArea && (
                <div className="space-y-4">
                  <Label>3D Interactive Profile - Click surfaces to select/deselect:</Label>
                  
                  {/* Interactive SVG Profile based on material type */}
                  <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <svg width="300" height="200" viewBox="0 0 300 200" className="border rounded">
                      {/* Background */}
                      <rect width="300" height="200" fill="white" />
                      
                      {/* SHS Profile Interactive Areas */}
                      {material.category?.toLowerCase().includes('shs') && (
                        <g>
                          {/* Outer rectangle - External Surface */}
                          <rect
                            x="75" y="50" width="150" height="100"
                            fill={selectedSurfaces.includes("external") ? "#3b82f6" : "#e5e7eb"}
                            stroke="#374151" strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("external")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "external"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "external"]);
                              }
                            }}
                          />
                          
                          {/* Inner rectangle - Internal Surface */}
                          <rect
                            x="85" y="60" width="130" height="80"
                            fill={selectedSurfaces.includes("internal") ? "#10b981" : "#f3f4f6"}
                            stroke="#374151" strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("internal")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "internal"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "internal"]);
                              }
                            }}
                          />
                          
                          {/* Labels */}
                          <text x="150" y="35" textAnchor="middle" className="text-xs font-medium">External Surface</text>
                          <text x="150" y="105" textAnchor="middle" className="text-xs font-medium">Internal Surface</text>
                          
                          {/* Dimensions */}
                          <text x="150" y="180" textAnchor="middle" className="text-xs text-gray-600">
                            {dimensions.width}mm × {dimensions.width}mm × {dimensions.thickness}mm
                          </text>
                        </g>
                      )}
                      
                      {/* RHS Profile Interactive Areas */}
                      {material.category?.toLowerCase().includes('rhs') && (
                        <g>
                          {/* Outer rectangle - External Surface */}
                          <rect
                            x="50" y="60" width="200" height="80"
                            fill={selectedSurfaces.includes("external") ? "#3b82f6" : "#e5e7eb"}
                            stroke="#374151" strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("external")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "external"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "external"]);
                              }
                            }}
                          />
                          
                          {/* Inner rectangle - Internal Surface */}
                          <rect
                            x="60" y="70" width="180" height="60"
                            fill={selectedSurfaces.includes("internal") ? "#10b981" : "#f3f4f6"}
                            stroke="#374151" strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("internal")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "internal"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "internal"]);
                              }
                            }}
                          />
                          
                          {/* Labels */}
                          <text x="150" y="45" textAnchor="middle" className="text-xs font-medium">External Surface</text>
                          <text x="150" y="105" textAnchor="middle" className="text-xs font-medium">Internal Surface</text>
                          
                          {/* Dimensions */}
                          <text x="150" y="180" textAnchor="middle" className="text-xs text-gray-600">
                            {dimensions.width}mm × {dimensions.depth}mm × {dimensions.thickness}mm
                          </text>
                        </g>
                      )}
                      
                      {/* Universal Beam Profile Interactive Areas */}
                      {(material.category?.toLowerCase().includes('ub') || material.category?.toLowerCase().includes('universal beam')) && (
                        <g>
                          {/* Top flange */}
                          <rect
                            x="75" y="50" width="150" height="15"
                            fill={selectedSurfaces.includes("external") ? "#3b82f6" : "#e5e7eb"}
                            stroke="#374151" strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("external")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "external"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "external"]);
                              }
                            }}
                          />
                          
                          {/* Web */}
                          <rect
                            x="140" y="65" width="20" height="70"
                            fill={selectedSurfaces.includes("external") ? "#3b82f6" : "#e5e7eb"}
                            stroke="#374151" strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("external")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "external"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "external"]);
                              }
                            }}
                          />
                          
                          {/* Bottom flange */}
                          <rect
                            x="75" y="135" width="150" height="15"
                            fill={selectedSurfaces.includes("external") ? "#3b82f6" : "#e5e7eb"}
                            stroke="#374151" strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("external")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "external"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "external"]);
                              }
                            }}
                          />
                          
                          {/* Labels */}
                          <text x="150" y="35" textAnchor="middle" className="text-xs font-medium">Click surfaces to select</text>
                          
                          {/* Dimensions */}
                          <text x="150" y="180" textAnchor="middle" className="text-xs text-gray-600">
                            UB Profile: {dimensions.width}mm × {dimensions.depth}mm
                          </text>
                        </g>
                      )}
                      
                      {/* Default rectangular profile for other types */}
                      {(!material.category?.toLowerCase().includes('shs') && 
                        !material.category?.toLowerCase().includes('rhs') && 
                        !material.category?.toLowerCase().includes('ub') && 
                        !material.category?.toLowerCase().includes('universal beam')) && (
                        <g>
                          <rect
                            x="100" y="75" width="100" height="50"
                            fill={selectedSurfaces.includes("external") ? "#3b82f6" : "#e5e7eb"}
                            stroke="#374151" strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (selectedSurfaces.includes("external")) {
                                setSelectedSurfaces(selectedSurfaces.filter(s => s !== "external"));
                              } else {
                                setSelectedSurfaces([...selectedSurfaces, "external"]);
                              }
                            }}
                          />
                          <text x="150" y="105" textAnchor="middle" className="text-xs font-medium">External Surface</text>
                          <text x="150" y="180" textAnchor="middle" className="text-xs text-gray-600">
                            Click to select surface
                          </text>
                        </g>
                      )}
                      
                      {/* Legend */}
                      <g transform="translate(10, 160)">
                        <rect x="0" y="0" width="15" height="10" fill="#3b82f6" />
                        <text x="20" y="8" className="text-xs">Selected External</text>
                        <rect x="0" y="15" width="15" height="10" fill="#10b981" />
                        <text x="20" y="23" className="text-xs">Selected Internal</text>
                        <rect x="0" y="30" width="15" height="10" fill="#e5e7eb" />
                        <text x="20" y="38" className="text-xs">Unselected</text>
                      </g>
                    </svg>
                  </div>
                  
                  {/* Surface selection summary */}
                  <div className="space-y-2">
                    <Label>Selected Surfaces:</Label>
                    {getSurfaceOptions().map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-2 border rounded">
                        <span className={`flex items-center gap-2 ${selectedSurfaces.includes(option.id) ? 'font-medium' : 'text-muted-foreground'}`}>
                          <div className={`w-3 h-3 rounded ${selectedSurfaces.includes(option.id) ? 
                            (option.id === 'external' ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-300'}`} />
                          {option.label}
                        </span>
                        <Badge variant={selectedSurfaces.includes(option.id) ? "default" : "secondary"}>
                          {option.area.toFixed(2)} m²/m
                        </Badge>
                      </div>
                    ))}
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