import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Settings, Triangle, Square } from "lucide-react";

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
}

export function ComplexCutsConfigurator({ length, onComplexCutsChange, complexCuts }: ComplexCutsConfiguratorProps) {
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

        <div className="space-y-6">
          {/* Current Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <strong>Piece Length:</strong> {length}mm
              </div>
              <div className="text-sm mt-1">
                <strong>Cut Specification:</strong> {getComplexCutDescription()}
              </div>
              
              {/* Interactive Visual Preview */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">Interactive Visual Preview:</div>
                <div className="text-xs text-blue-600 mb-2">💡 Click on the left or right end of the material bar to add cuts</div>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    {/* Material bar */}
                    <div className="w-80 h-12 bg-gradient-to-r from-blue-200 to-blue-300 border-2 border-blue-400 rounded-lg flex items-center justify-center relative shadow-md">
                      <span className="text-sm font-medium text-blue-800">{length || '0'}mm</span>
                      
                      {/* Clickable zones for adding cuts */}
                      <div 
                        className="absolute left-0 top-0 w-8 h-full bg-red-100 opacity-0 hover:opacity-30 cursor-pointer border-l-2 border-red-400 rounded-l-lg transition-opacity"
                        onClick={() => {
                          const newCut: ComplexCut = {
                            id: `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            position: 'start',
                            angle: 45,
                            orientation: 'same',
                            quantity: 1
                          };
                          onComplexCutsChange([...complexCuts, newCut]);
                        }}
                        title="Click to add cut at start"
                      />
                      
                      <div 
                        className="absolute right-0 top-0 w-8 h-full bg-red-100 opacity-0 hover:opacity-30 cursor-pointer border-r-2 border-red-400 rounded-r-lg transition-opacity"
                        onClick={() => {
                          const newCut: ComplexCut = {
                            id: `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            position: 'end',
                            angle: 45,
                            orientation: 'same',
                            quantity: 1
                          };
                          onComplexCutsChange([...complexCuts, newCut]);
                        }}
                        title="Click to add cut at end"
                      />
                    </div>
                    
                    {/* Cut indicators with interactive controls */}
                    {complexCuts.map((cut, index) => (
                      <div key={cut.id}>
                        {(cut.position === 'start' || cut.position === 'both') && (
                          <div className="absolute left-0 top-0 h-12 flex items-center">
                            <div 
                              className="w-6 h-12 bg-red-500 opacity-80 rounded-l-lg cursor-pointer hover:opacity-100 transition-opacity flex items-center justify-center group"
                              onClick={() => removeComplexCut(cut.id)}
                              title={`${cut.angle}° cut - Click to remove`}
                            >
                              <div className="text-xs text-white font-bold transform -rotate-90">
                                {cut.angle}°
                              </div>
                            </div>
                          </div>
                        )}
                        {(cut.position === 'end' || cut.position === 'both') && (
                          <div className="absolute right-0 top-0 h-12 flex items-center">
                            <div 
                              className="w-6 h-12 bg-red-500 opacity-80 rounded-r-lg cursor-pointer hover:opacity-100 transition-opacity flex items-center justify-center group"
                              onClick={() => removeComplexCut(cut.id)}
                              title={`${cut.angle}° cut - Click to remove`}
                            >
                              <div className="text-xs text-white font-bold transform -rotate-90">
                                {cut.angle}°
                              </div>
                            </div>
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
                <div className="mt-4 flex gap-2 justify-center">
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
                  >
                    Add 45° Both Ends
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onComplexCutsChange([])}
                    disabled={complexCuts.length === 0}
                  >
                    Clear All Cuts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add New Complex Cut */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add Complex Cut</CardTitle>
            </CardHeader>
            <CardContent>
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

          {/* Common Examples */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Common Examples</CardTitle>
            </CardHeader>
            <CardContent>
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