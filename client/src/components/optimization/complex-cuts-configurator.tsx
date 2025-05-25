import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Settings, Triangle, Square, ChevronDown, ChevronRight } from "lucide-react";

interface ComplexCut {
  id: string;
  position: 'start' | 'end' | 'both';
  angle: number;
  orientation: 'same' | 'opposite';
  quantity: number;
}

interface ComplexCutsConfiguratorProps {
  length: string;
  onComplexCutsChange: (cuts: ComplexCut[]) => void;
  complexCuts: ComplexCut[];
  onAddToRequest?: (length: number, quantity: number, complexCuts: ComplexCut[]) => void;
}

export function ComplexCutsConfigurator({ length, onComplexCutsChange, complexCuts, onAddToRequest }: ComplexCutsConfiguratorProps) {
  const [quantity, setQuantity] = useState(1);
  const [showExamples, setShowExamples] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [draggedCut, setDraggedCut] = useState<{ angle: number; id: string } | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'start' | 'end' | null>(null);
  const [localLength, setLocalLength] = useState(length || '');
  const [isOpen, setIsOpen] = useState(false);
  const [newCut, setNewCut] = useState({
    position: 'end' as 'start' | 'end' | 'both',
    angle: '45',
    orientation: 'same' as 'same' | 'opposite',
    quantity: '1'
  });

  const addComplexCut = () => {
    const cut: ComplexCut = {
      id: `complex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: newCut.position,
      angle: parseInt(newCut.angle),
      orientation: newCut.orientation,
      quantity: parseInt(newCut.quantity)
    };
    
    onComplexCutsChange([...complexCuts, cut]);
    setNewCut({ position: 'end', angle: '45', orientation: 'same', quantity: '1' });
  };

  const removeComplexCut = (id: string) => {
    onComplexCutsChange(complexCuts.filter(cut => cut.id !== id));
  };

  const getComplexCutDescription = () => {
    if (complexCuts.length === 0) return "Standard 90° cuts";
    
    const descriptions = complexCuts.map(cut => {
      const pos = cut.position === 'both' ? 'both ends' : cut.position;
      const orientation = cut.orientation === 'same' ? 'same direction' : 'opposite directions';
      return `${cut.quantity}x ${cut.angle}° at ${pos} (${orientation})`;
    });
    
    return descriptions.join(', ');
  };

  const hasComplexCuts = complexCuts.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasComplexCuts ? "default" : "outline"} 
          size="sm" 
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          {hasComplexCuts ? "Complex Cuts" : "Add Complex Cuts"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Triangle className="h-5 w-5" />
            Complex Cuts Configuration
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure detailed angle cuts for this {length}mm piece
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Current Configuration */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="piece-length" className="text-sm font-medium">Piece Length:</Label>
                <Input
                  id="piece-length"
                  type="number"
                  value={localLength}
                  onChange={(e) => setLocalLength(e.target.value)}
                  className="w-20 h-8 text-center"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">mm</span>
              </div>
              <div className="text-sm mt-1">
                <strong>Cut Specification:</strong> {getComplexCutDescription()}
              </div>
              
              {/* Interactive Drag & Drop Visual Preview */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">Interactive Drag & Drop Preview:</div>
                <div className="text-xs text-purple-600 mb-3">🎯 Drag angle cuts from the toolbox below onto the material bar ends</div>
                
                {/* Drag & Drop Toolbox */}
                <div className="mb-4 p-3 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-xs font-medium text-gray-600 mb-2">Cut Tools - Drag to Material:</div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {[30, 45, 60, 90].map((angle) => (
                      <div
                        key={angle}
                        draggable
                        onDragStart={(e) => {
                          setDraggedCut({ angle, id: `drag_${Date.now()}` });
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg cursor-grab active:cursor-grabbing hover:bg-orange-200 transition-colors text-sm font-medium"
                        title={`Drag ${angle}° cut to material bar`}
                      >
                        {angle}°
                      </div>
                    ))}
                    <div className="flex items-center gap-1 ml-2">
                      <div
                        draggable
                        onDragStart={(e) => {
                          const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                          const customAngle = parseInt(input.value);
                          if (customAngle && customAngle > 0 && customAngle <= 180) {
                            setDraggedCut({ angle: customAngle, id: `custom_${Date.now()}` });
                            e.dataTransfer.effectAllowed = 'copy';
                          } else {
                            e.preventDefault();
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded-lg cursor-grab active:cursor-grabbing hover:bg-orange-200 transition-colors"
                        title="Enter angle and drag to material bar"
                      >
                        <Input
                          type="number"
                          placeholder="Custom"
                          className="w-12 h-6 text-center text-xs border-0 bg-transparent p-0"
                          min="1"
                          max="180"
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs text-gray-600">°</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="relative">
                    {/* Material bar with drop zones */}
                    <div className="w-80 h-12 bg-gradient-to-r from-blue-200 to-blue-300 border-2 border-blue-400 rounded-lg flex items-center justify-center relative shadow-md">
                      <span className="text-sm font-medium text-blue-800">{localLength || '0'}mm</span>
                      
                      {/* Drop zone - Start */}
                      <div 
                        className={`absolute left-0 top-0 w-12 h-full rounded-l-lg transition-all ${
                          dragOverPosition === 'start' 
                            ? 'bg-green-200 border-2 border-green-500' 
                            : 'bg-red-100 opacity-0 hover:opacity-30'
                        } cursor-pointer border-l-2 border-red-400`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverPosition('start');
                        }}
                        onDragLeave={() => setDragOverPosition(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedCut) {
                            const newCut: ComplexCut = {
                              id: `start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              position: 'start',
                              angle: draggedCut.angle,
                              orientation: 'same',
                              quantity: 1
                            };
                            onComplexCutsChange([...complexCuts, newCut]);
                          }
                          setDraggedCut(null);
                          setDragOverPosition(null);
                        }}
                        onClick={() => {
                          const newCut: ComplexCut = {
                            id: `quick_start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            position: 'start',
                            angle: 45,
                            orientation: 'same',
                            quantity: 1
                          };
                          onComplexCutsChange([...complexCuts, newCut]);
                        }}
                        title="Drop cut here or click to add 45° cut"
                      >
                        {dragOverPosition === 'start' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-green-700">Drop Here</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Drop zone - End */}
                      <div 
                        className={`absolute right-0 top-0 w-12 h-full rounded-r-lg transition-all ${
                          dragOverPosition === 'end' 
                            ? 'bg-green-200 border-2 border-green-500' 
                            : 'bg-red-100 opacity-0 hover:opacity-30'
                        } cursor-pointer border-r-2 border-red-400`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverPosition('end');
                        }}
                        onDragLeave={() => setDragOverPosition(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedCut) {
                            const newCut: ComplexCut = {
                              id: `end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              position: 'end',
                              angle: draggedCut.angle,
                              orientation: 'same',
                              quantity: 1
                            };
                            onComplexCutsChange([...complexCuts, newCut]);
                          }
                          setDraggedCut(null);
                          setDragOverPosition(null);
                        }}
                        onClick={() => {
                          const newCut: ComplexCut = {
                            id: `quick_end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            position: 'end',
                            angle: 45,
                            orientation: 'same',
                            quantity: 1
                          };
                          onComplexCutsChange([...complexCuts, newCut]);
                        }}
                        title="Drop cut here or click to add 45° cut"
                      >
                        {dragOverPosition === 'end' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-green-700">Drop Here</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Angled Cut Shape Indicators with external orientation toggles */}
                    {complexCuts.map((cut, index) => (
                      <div key={cut.id}>
                        {(cut.position === 'start' || cut.position === 'both') && (
                          <div className="absolute left-0 top-0 h-12 flex items-center">
                            {/* Angled cut shape that represents the actual cut */}
                            <div 
                              className="relative cursor-pointer transition-opacity group"
                              onClick={() => removeComplexCut(cut.id)}
                              title={`${cut.angle}° cut - Click to remove`}
                            >
                              <svg width="24" height="48" className="overflow-visible">
                                <defs>
                                  <linearGradient id={`grad-start-${cut.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{stopColor:"#ef4444", stopOpacity:1}} />
                                    <stop offset="50%" style={{stopColor:"#dc2626", stopOpacity:1}} />
                                    <stop offset="100%" style={{stopColor:"#b91c1c", stopOpacity:1}} />
                                  </linearGradient>
                                </defs>
                                {/* Angled cut shape based on angle and orientation - fills corner */}
                                <polygon
                                  points={cut.orientation === 'same' 
                                    ? `0,0 ${(90 - cut.angle) / 90 * 24},0 0,${(90 - cut.angle) / 90 * 48}`
                                    : `0,${cut.angle / 90 * 48} ${cut.angle / 90 * 24},0 0,0`
                                  }
                                  fill={`url(#grad-start-${cut.id})`}
                                  opacity="0.9"
                                  className="hover:opacity-100 transition-opacity"
                                />
                                {/* Angle text */}
                                <text 
                                  x="12" 
                                  y="26" 
                                  textAnchor="middle" 
                                  className="text-xs font-bold fill-white"
                                  style={{fontSize: '10px'}}
                                >
                                  {cut.angle}°
                                </text>
                              </svg>
                            </div>
                            {/* Orientation toggle button outside blue bar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updatedCuts = complexCuts.map(c => 
                                  c.id === cut.id 
                                    ? { ...c, orientation: c.orientation === 'same' ? 'opposite' as const : 'same' as const }
                                    : c
                                );
                                onComplexCutsChange(updatedCuts);
                              }}
                              className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded text-xs font-bold transition-colors flex items-center justify-center shadow-sm"
                              title="Toggle cut orientation"
                            >
                              {cut.orientation === 'same' ? '/' : '\\'}
                            </button>
                          </div>
                        )}
                        {(cut.position === 'end' || cut.position === 'both') && (
                          <div className="absolute right-0 top-0 h-12 flex items-center">
                            {/* Angled cut shape that represents the actual cut */}
                            <div 
                              className="relative cursor-pointer transition-opacity group"
                              onClick={() => removeComplexCut(cut.id)}
                              title={`${cut.angle}° cut - Click to remove`}
                            >
                              <svg width="24" height="48" className="overflow-visible">
                                <defs>
                                  <linearGradient id={`grad-end-${cut.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{stopColor:"#ef4444", stopOpacity:1}} />
                                    <stop offset="50%" style={{stopColor:"#dc2626", stopOpacity:1}} />
                                    <stop offset="100%" style={{stopColor:"#b91c1c", stopOpacity:1}} />
                                  </linearGradient>
                                </defs>
                                {/* Angled cut shape based on angle and orientation - fills corner */}
                                <polygon
                                  points={cut.orientation === 'same' 
                                    ? `24,0 24,${cut.angle / 90 * 48} ${24 - (cut.angle / 90 * 24)},48 0,48 0,0`
                                    : `24,${48 - (cut.angle / 90 * 48)} 24,48 0,48 0,0 ${(90 - cut.angle) / 90 * 24},0`
                                  }
                                  fill={`url(#grad-end-${cut.id})`}
                                  opacity="0.9"
                                  className="hover:opacity-100 transition-opacity"
                                />
                                {/* Angle text */}
                                <text 
                                  x="12" 
                                  y="26" 
                                  textAnchor="middle" 
                                  className="text-xs font-bold fill-white"
                                  style={{fontSize: '10px'}}
                                >
                                  {cut.angle}°
                                </text>
                              </svg>
                            </div>
                            {/* Orientation toggle button outside blue bar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updatedCuts = complexCuts.map(c => 
                                  c.id === cut.id 
                                    ? { ...c, orientation: c.orientation === 'same' ? 'opposite' as const : 'same' as const }
                                    : c
                                );
                                onComplexCutsChange(updatedCuts);
                              }}
                              className="absolute -right-8 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded text-xs font-bold transition-colors flex items-center justify-center shadow-sm"
                              title="Toggle cut orientation"
                            >
                              {cut.orientation === 'same' ? '\\' : '/'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Length markers */}
                    <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">0mm</div>
                    <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">{length}mm</div>
                  </div>
                </div>
                
                {/* Quick action buttons below the visual */}
                <div className="mt-3 flex gap-1 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newCut: ComplexCut = {
                        id: `both_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        position: 'both',
                        angle: 45,
                        orientation: 'same',
                        quantity: 1
                      };
                      onComplexCutsChange([...complexCuts, newCut]);
                    }}
                    className="text-xs px-2 py-1 h-6"
                  >
                    45° Both Ends
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onComplexCutsChange([])}
                    disabled={complexCuts.length === 0}
                    className="text-xs px-2 py-1 h-6"
                  >
                    Clear All
                  </Button>
                </div>
                
                {/* Compact Quantity and Add to Request Section */}
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="quantity" className="text-xs font-medium">Qty:</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 h-7 text-center text-xs"
                    />
                    <span className="text-xs text-muted-foreground">pcs</span>
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (onAddToRequest && localLength && complexCuts.length > 0) {
                        onAddToRequest(parseInt(localLength.toString()), quantity, complexCuts);
                        setQuantity(1);
                        onComplexCutsChange([]);
                        setIsOpen(false);
                      }
                    }}
                    disabled={!localLength || complexCuts.length === 0 || !onAddToRequest}
                    className="w-full h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add {quantity}× to Cut List
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add New Complex Cut */}
          <Card>
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                onClick={() => setShowManualAdd(!showManualAdd)}
                className="w-full justify-between p-0 h-auto font-medium text-left hover:bg-transparent"
              >
                <span className="text-sm">Manually Add Complex Cut</span>
                {showManualAdd ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            {showManualAdd && (
              <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="cut-position">Position</Label>
                  <Select value={newCut.position} onValueChange={(value: 'start' | 'end' | 'both') => setNewCut({ ...newCut, position: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Start</SelectItem>
                      <SelectItem value="end">End</SelectItem>
                      <SelectItem value="both">Both Ends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="cut-angle">Angle (°)</Label>
                  <Select value={newCut.angle} onValueChange={(value) => setNewCut({ ...newCut, angle: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15°</SelectItem>
                      <SelectItem value="22.5">22.5°</SelectItem>
                      <SelectItem value="30">30°</SelectItem>
                      <SelectItem value="45">45°</SelectItem>
                      <SelectItem value="60">60°</SelectItem>
                      <SelectItem value="90">90°</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {newCut.angle === 'custom' && (
                    <Input
                      className="mt-2"
                      type="number"
                      placeholder="Enter angle"
                      min="1"
                      max="180"
                      onChange={(e) => setNewCut({ ...newCut, angle: e.target.value })}
                    />
                  )}
                </div>
                
                <div>
                  <Label htmlFor="cut-orientation">Orientation</Label>
                  <Select value={newCut.orientation} onValueChange={(value: 'same' | 'opposite') => setNewCut({ ...newCut, orientation: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same">Same Direction</SelectItem>
                      <SelectItem value="opposite">Opposite Directions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button onClick={addComplexCut} size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Cut
                  </Button>
                </div>
              </div>
              </CardContent>
            )}
          </Card>

          {/* Current Complex Cuts List */}
          {complexCuts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configured Complex Cuts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {complexCuts.map((cut) => (
                    <div key={cut.id} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div className="flex items-center gap-3">
                        <Triangle className="h-4 w-4 text-orange-600" />
                        <div>
                          <div className="font-medium text-sm">
                            {cut.quantity}x {cut.angle}° cuts
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Position: {cut.position === 'both' ? 'Both ends' : cut.position} • 
                            Orientation: {cut.orientation === 'same' ? 'Same direction' : 'Opposite directions'}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComplexCut(cut.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Common Examples - Collapsible */}
          <Card>
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                onClick={() => setShowExamples(!showExamples)}
                className="w-full justify-between p-0 h-auto font-medium text-left hover:bg-transparent"
              >
                <span className="text-sm">Common Examples</span>
                {showExamples ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            {showExamples && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <strong>Example 1:</strong> 300mm with 2x 45° cuts (same orientation)
                    <div className="text-xs text-muted-foreground">Both ends, same direction</div>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <strong>Example 2:</strong> 600mm with 1x 45° and 1x 90° cuts
                    <div className="text-xs text-muted-foreground">Different angles at each end</div>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <strong>Example 3:</strong> 200mm with 2x 45° cuts (same orientation)
                    <div className="text-xs text-muted-foreground">Both ends, parallel cuts</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}