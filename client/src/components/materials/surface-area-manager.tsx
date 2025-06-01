import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, Save, RotateCcw } from "lucide-react";
import { calculateSurfaceArea, type SteelDimensions, type SurfaceAreaResult } from "@/lib/surface-area-calculator";
import type { Material } from "@shared/schema";

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
  const [manualOverride, setManualOverride] = useState(false);
  const [manualValue, setManualValue] = useState(material.surfaceAreaPerMeter?.toString() || "");
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(["external"]);

  useEffect(() => {
    if (!manualOverride && material.category) {
      const result = calculateSurfaceArea(material.category, dimensions);
      setCalculatedArea(result);
    }
  }, [dimensions, material.category, manualOverride]);

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

  const handleSave = () => {
    const finalValue = manualOverride 
      ? parseFloat(manualValue) 
      : calculatedArea?.totalArea || 0;
    
    if (finalValue > 0) {
      onSave(finalValue);
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

          {/* Manual Override Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="manual-override" 
              checked={manualOverride}
              onCheckedChange={(checked) => setManualOverride(checked === true)}
            />
            <Label htmlFor="manual-override">Manual Override</Label>
          </div>

          {manualOverride ? (
            <div className="space-y-2">
              <Label htmlFor="manual-value">Manual Surface Area (m²/m)</Label>
              <Input
                id="manual-value"
                type="number"
                step="0.01"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Enter surface area per meter"
              />
            </div>
          ) : (
            <>
              {/* Dimension Inputs */}
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
                <div className="space-y-2">
                  <Label htmlFor="height">Height (mm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={dimensions.height || ""}
                    onChange={(e) => handleDimensionChange("height", e.target.value)}
                    placeholder="Height"
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
              </div>

              <Button onClick={handleCalculate} className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Surface Area
              </Button>

              {/* Calculation Results */}
              {calculatedArea && (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Calculation Results</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>External Surface Area:</span>
                        <Badge variant="secondary">{calculatedArea.externalArea.toFixed(2)} m²/m</Badge>
                      </div>
                      {calculatedArea.internalArea > 0 && (
                        <div className="flex justify-between">
                          <span>Internal Surface Area:</span>
                          <Badge variant="secondary">{calculatedArea.internalArea.toFixed(2)} m²/m</Badge>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Total Surface Area:</span>
                        <Badge>{calculatedArea.totalArea.toFixed(2)} m²/m</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Surface Selection */}
                  {getSurfaceOptions().length > 1 && (
                    <div className="space-y-2">
                      <Label>Select Surfaces for Coating</Label>
                      <div className="space-y-2">
                        {getSurfaceOptions().map(option => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={option.id}
                              checked={selectedSurfaces.includes(option.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSurfaces([...selectedSurfaces, option.id]);
                                } else {
                                  setSelectedSurfaces(selectedSurfaces.filter(s => s !== option.id));
                                }
                              }}
                            />
                            <Label htmlFor={option.id} className="flex-1">
                              {option.label}
                            </Label>
                            <Badge variant="outline">{option.area.toFixed(2)} m²/m</Badge>
                          </div>
                        ))}
                      </div>
                      
                      {selectedSurfaces.length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Selected Surface Area:</span>
                            <Badge className="bg-blue-600">{getSelectedArea().toFixed(2)} m²/m</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Surface Area
            </Button>
            <Button variant="outline" onClick={() => {
              setManualOverride(false);
              setManualValue("");
              setCalculatedArea(null);
            }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}