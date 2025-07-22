import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move, 
  Ruler, 
  Square, 
  Circle, 
  Type, 
  Highlighter,
  Trash2,
  Save,
  Download,
  Share2,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Palette,
  Layers,
  PenTool,
  MessageSquare,
  Hash,
  Grid3x3,
  Crosshair
} from "lucide-react";

interface Annotation {
  id: string;
  type: 'measurement' | 'rectangle' | 'circle' | 'text' | 'highlight' | 'comment' | 'callout';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  points?: { x: number; y: number }[];
  endX?: number;
  endY?: number;
  scale?: number;
  unit?: string;
  actualLength?: number;
}

export default function PDFMarkup() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const drawingId = params.get("id");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>("move");
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(14);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [measurementUnit, setMeasurementUnit] = useState("mm");
  const [pixelsPerUnit, setPixelsPerUnit] = useState(1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Tool configurations
  const tools = [
    { id: "move", icon: Move, label: "Pan" },
    { id: "measurement", icon: Ruler, label: "Measure" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
    { id: "comment", icon: MessageSquare, label: "Comment" },
    { id: "callout", icon: PenTool, label: "Callout" },
  ];

  const colors = [
    "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
    "#FF00FF", "#00FFFF", "#FFA500", "#800080"
  ];

  // Handle tool selection
  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    if (toolId === "calibrate") {
      setIsCalibrating(true);
      toast({
        title: "Calibration Mode",
        description: "Click two points on a known dimension, then enter the actual measurement.",
      });
    }
  };

  // Save annotation
  const handleSave = async () => {
    try {
      const response = await fetch(`/api/drawings/${drawingId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotations }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Annotations saved successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save annotations",
        variant: "destructive",
      });
    }
  };

  // Export annotations
  const handleExport = () => {
    const dataStr = JSON.stringify(annotations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `annotations-${drawingId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Undo/Redo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDF Markup Tools</h1>
          <p className="text-muted-foreground mt-1">
            Add measurements, annotations, and markups to construction drawings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleUndo} disabled={historyIndex === 0}>
            <Undo className="h-4 w-4 mr-2" />
            Undo
          </Button>
          <Button variant="outline" onClick={handleRedo} disabled={historyIndex === history.length - 1}>
            <Redo className="h-4 w-4 mr-2" />
            Redo
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-6">
        {/* Toolbar */}
        <Card className="p-4 h-fit">
          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Drawing Tools</Label>
                <div className="grid grid-cols-4 gap-2">
                  {tools.map((tool) => (
                    <Toggle
                      key={tool.id}
                      pressed={selectedTool === tool.id}
                      onPressedChange={() => handleToolSelect(tool.id)}
                      className="h-12 w-12"
                      title={tool.label}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Toggle>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">View Controls</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setScale(scale + 0.1)}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setScale(scale - 0.1)}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRotation(rotation + 90)}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Toggle pressed={showGrid} onPressedChange={setShowGrid}>
                    <Grid3x3 className="h-4 w-4" />
                  </Toggle>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Measurement Settings</Label>
                <div className="space-y-2">
                  <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">Millimeters (mm)</SelectItem>
                      <SelectItem value="cm">Centimeters (cm)</SelectItem>
                      <SelectItem value="m">Meters (m)</SelectItem>
                      <SelectItem value="ft">Feet (ft)</SelectItem>
                      <SelectItem value="in">Inches (in)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsCalibrating(true)}
                  >
                    <Crosshair className="h-4 w-4 mr-2" />
                    Calibrate Scale
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded border-2 ${
                        currentColor === color ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="stroke-width">Stroke Width</Label>
                <Input
                  id="stroke-width"
                  type="number"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>

              <div>
                <Label htmlFor="font-size">Font Size</Label>
                <Input
                  id="font-size"
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min={8}
                  max={72}
                />
              </div>
            </TabsContent>

            <TabsContent value="layers" className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Annotations</Label>
                <Toggle 
                  pressed={showAnnotations} 
                  onPressedChange={setShowAnnotations}
                  size="sm"
                >
                  {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Toggle>
              </div>
              
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {annotations.map((annotation, index) => (
                  <div 
                    key={annotation.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: annotation.color }}
                      />
                      <span className="text-sm">
                        {annotation.type} {annotation.text ? `- ${annotation.text.substring(0, 20)}...` : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAnnotations(annotations.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* PDF Viewer with Canvas Overlay */}
        <Card className="relative overflow-hidden">
          <div 
            ref={pdfContainerRef}
            className="relative"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            {/* PDF would be rendered here */}
            <div className="bg-muted h-[800px] flex items-center justify-center">
              <p className="text-muted-foreground">PDF Drawing will be displayed here</p>
            </div>
            
            {/* Canvas overlay for annotations */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{
                pointerEvents: selectedTool === 'move' ? 'none' : 'auto',
                display: showAnnotations ? 'block' : 'none',
              }}
            />
            
            {/* Grid overlay */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, transparent 1px, transparent 20px, rgba(0,0,0,0.1) 21px), repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, transparent 1px, transparent 20px, rgba(0,0,0,0.1) 21px)',
                }}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}