import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Camera, 
  MapPin, 
  Ruler, 
  Edit3, 
  Save, 
  Upload,
  Eye,
  Layers,
  Navigation,
  Compass,
  Target,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  User,
  Smartphone
} from 'lucide-react';

interface InspectionPoint {
  id: string;
  x: number;
  y: number;
  type: 'measurement' | 'photo' | 'note' | 'issue';
  content: any;
  timestamp: Date;
  gpsCoordinates?: { lat: number; lng: number };
}

interface Drawing {
  id: number;
  name: string;
  type: 'plan' | 'section' | 'elevation';
  url: string;
  scale: number;
}

interface Measurement {
  id: string;
  drawingId: number;
  elementId: string;
  actualLength: number;
  designLength: number;
  variance: number;
  tolerance: number;
  status: 'within_tolerance' | 'minor_variance' | 'major_variance';
  notes: string;
}

// Mobile Site Inspection App
export default function MobileInspection() {
  const { toast } = useToast();
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [inspectionPoints, setInspectionPoints] = useState<InspectionPoint[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock drawings data
  const mockDrawings: Drawing[] = [
    { id: 1, name: "Structural Plan - Ground Level", type: "plan", url: "/api/drawings/1", scale: 1000 },
    { id: 2, name: "Section A-A", type: "section", url: "/api/drawings/2", scale: 500 },
    { id: 3, name: "North Elevation", type: "elevation", url: "/api/drawings/3", scale: 200 }
  ];

  // Get current GPS location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to get current location",
            variant: "destructive"
          });
        }
      );
    }
  }, [toast]);

  // Capture photo with GPS tagging
  const capturePhoto = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handlePhotoCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    getCurrentLocation();
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const newPoint: InspectionPoint = {
        id: `photo_${Date.now()}`,
        x: Math.random() * 800,
        y: Math.random() * 600,
        type: 'photo',
        content: {
          image: e.target?.result,
          fileName: file.name,
          fileSize: file.size,
          description: ''
        },
        timestamp: new Date(),
        gpsCoordinates: currentLocation
      };
      
      setInspectionPoints(prev => [...prev, newPoint]);
      toast({
        title: "Photo Captured",
        description: "Photo added to inspection points with GPS location",
      });
    };
    reader.readAsDataURL(file);
  }, [currentLocation, getCurrentLocation, toast]);

  // Add measurement point
  const addMeasurement = useCallback((x: number, y: number) => {
    if (!measurementMode || !selectedDrawing) return;

    const actualLength = parseFloat(prompt("Enter actual measurement (mm):") || "0");
    const designLength = parseFloat(prompt("Enter design length (mm):") || "0");
    
    if (actualLength && designLength) {
      const variance = ((actualLength - designLength) / designLength) * 100;
      const tolerance = 5; // 5% tolerance
      
      const status = Math.abs(variance) <= tolerance 
        ? 'within_tolerance' 
        : Math.abs(variance) <= 10 
        ? 'minor_variance' 
        : 'major_variance';

      const newMeasurement: Measurement = {
        id: `meas_${Date.now()}`,
        drawingId: selectedDrawing.id,
        elementId: `elem_${Math.random()}`,
        actualLength,
        designLength,
        variance,
        tolerance,
        status,
        notes: ''
      };

      setMeasurements(prev => [...prev, newMeasurement]);
      
      const newPoint: InspectionPoint = {
        id: `measurement_${Date.now()}`,
        x,
        y,
        type: 'measurement',
        content: newMeasurement,
        timestamp: new Date(),
        gpsCoordinates: currentLocation
      };
      
      setInspectionPoints(prev => [...prev, newPoint]);
      setMeasurementMode(false);
      
      toast({
        title: "Measurement Added",
        description: `Variance: ${variance.toFixed(1)}% - ${status.replace('_', ' ')}`,
        variant: status === 'major_variance' ? 'destructive' : 'default'
      });
    }
  }, [measurementMode, selectedDrawing, currentLocation, toast]);

  // Canvas click handler for drawing markup
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (measurementMode) {
      addMeasurement(x, y);
    }
  }, [addMeasurement, measurementMode]);

  // Sync data when online
  const syncData = useMutation({
    mutationFn: async () => {
      const inspectionData = {
        points: inspectionPoints,
        measurements,
        timestamp: new Date(),
        location: currentLocation
      };
      
      return apiRequest('/api/mobile-inspection/sync', {
        method: 'POST',
        body: JSON.stringify(inspectionData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Data Synced",
        description: "All inspection data synchronized with office",
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2">
      {/* Mobile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Site Inspection</h1>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <Button
              size="sm"
              onClick={() => syncData.mutate()}
              disabled={!isOnline || syncData.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">Project:</span>
            <p className="font-medium">PROJ-2025-001</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">Inspector:</span>
            <p className="font-medium">Site Foreman</p>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card className="p-3">
          <div className="text-center">
            <Camera className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <p className="text-sm font-medium">{inspectionPoints.filter(p => p.type === 'photo').length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">Photos</p>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <Ruler className="h-6 w-6 mx-auto mb-1 text-green-600" />
            <p className="text-sm font-medium">{measurements.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">Measurements</p>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-orange-600" />
            <p className="text-sm font-medium">{measurements.filter(m => m.status === 'major_variance').length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">Issues</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="drawings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drawings">Drawings</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        {/* Drawings Tab */}
        <TabsContent value="drawings" className="space-y-4">
          {/* Drawing Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Drawing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockDrawings.map((drawing) => (
                <Button
                  key={drawing.id}
                  variant={selectedDrawing?.id === drawing.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDrawing(drawing)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {drawing.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Interactive Drawing Canvas */}
          {selectedDrawing && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{selectedDrawing.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={measurementMode ? "default" : "outline"}
                      onClick={() => setMeasurementMode(!measurementMode)}
                    >
                      <Ruler className="h-4 w-4 mr-1" />
                      Measure
                    </Button>
                    <Button size="sm" variant="outline" onClick={capturePhoto}>
                      <Camera className="h-4 w-4 mr-1" />
                      Photo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative border rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-auto cursor-crosshair"
                    style={{ maxHeight: '60vh' }}
                    onClick={handleCanvasClick}
                  />
                  
                  {/* Inspection Points Overlay */}
                  {inspectionPoints.map((point) => (
                    <div
                      key={point.id}
                      className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ left: `${(point.x / 800) * 100}%`, top: `${(point.y / 600) * 100}%` }}
                    >
                      {point.type === 'photo' && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <Camera className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {point.type === 'measurement' && (
                        <div className="w-6 h-6 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <Ruler className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>Scale: 1:{selectedDrawing.scale}</p>
                  {measurementMode && (
                    <Alert className="mt-2">
                      <Target className="h-4 w-4" />
                      <AlertDescription>
                        Click on the drawing to add measurement points
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Site Measurements
              </CardTitle>
              <CardDescription>
                Actual vs design measurements with variance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {measurements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Ruler className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No measurements recorded yet</p>
                    <p className="text-sm">Use the drawing view to add measurements</p>
                  </div>
                ) : (
                  measurements.map((measurement) => (
                    <div key={measurement.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">Element: {measurement.elementId}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Drawing: {mockDrawings.find(d => d.id === measurement.drawingId)?.name}
                          </p>
                        </div>
                        <Badge variant={
                          measurement.status === 'within_tolerance' ? 'default' :
                          measurement.status === 'minor_variance' ? 'secondary' : 'destructive'
                        }>
                          {measurement.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Design:</span>
                          <p className="font-medium">{measurement.designLength}mm</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Actual:</span>
                          <p className="font-medium">{measurement.actualLength}mm</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-gray-300">Variance:</span>
                          <p className={`font-medium ${
                            Math.abs(measurement.variance) <= measurement.tolerance
                              ? 'text-green-600'
                              : Math.abs(measurement.variance) <= 10
                              ? 'text-orange-600'
                              : 'text-red-600'
                          }`}>
                            {measurement.variance > 0 ? '+' : ''}{measurement.variance.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Site Photos
              </CardTitle>
              <CardDescription>
                Photo documentation with GPS coordinates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={capturePhoto}
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
                
                <div className="grid gap-4">
                  {inspectionPoints
                    .filter(point => point.type === 'photo')
                    .map((point) => (
                      <div key={point.id} className="border rounded-lg overflow-hidden">
                        <img
                          src={point.content.image}
                          alt="Site photo"
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{point.content.fileName}</h4>
                            <span className="text-xs text-gray-500">
                              {point.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          
                          {point.gpsCoordinates && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {point.gpsCoordinates.lat.toFixed(6)}, {point.gpsCoordinates.lng.toFixed(6)}
                            </div>
                          )}
                          
                          <Input
                            placeholder="Add description..."
                            value={point.content.description}
                            onChange={(e) => {
                              setInspectionPoints(prev =>
                                prev.map(p =>
                                  p.id === point.id
                                    ? { ...p, content: { ...p.content, description: e.target.value } }
                                    : p
                                )
                              );
                            }}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  
                  {inspectionPoints.filter(p => p.type === 'photo').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No photos captured yet</p>
                      <p className="text-sm">Tap the camera button to start documenting</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden file input for photo capture */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoCapture}
      />

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <p className="font-medium">
              {inspectionPoints.length} points recorded
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {isOnline ? 'Online' : 'Offline mode'}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => getCurrentLocation()}
            >
              <Navigation className="h-4 w-4 mr-1" />
              GPS
            </Button>
            <Button
              size="sm"
              onClick={() => syncData.mutate()}
              disabled={!isOnline || syncData.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {syncData.isPending ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}