import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, MapPin, CheckCircle, Smartphone, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";

// Mobile-optimized timesheet component for workshop/site workers
export default function MobileTimesheet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<string>("");
  const [isTracking, setIsTracking] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.log("Location access denied:", error);
          setLocation("Location disabled");
        }
      );
    }
  }, []);

  // Clock mutation for mobile
  const clockMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/time/clock", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] });
      toast({
        title: "Success",
        description: "Time recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record time",
        variant: "destructive",
      });
    },
  });

  const handleQuickClock = (type: string) => {
    const clockData = {
      clockType: type,
      timestamp: new Date().toISOString(),
      location,
      geolocation: location && location !== "Location disabled" ? {
        lat: parseFloat(location.split(',')[0]),
        lng: parseFloat(location.split(',')[1]),
        accuracy: 10
      } : null,
      deviceInfo: {
        userAgent: navigator.userAgent,
        isOnline,
        timestamp: new Date().toISOString()
      }
    };

    clockMutation.mutate(clockData);
    setIsTracking(type === "clock_in");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mobile Timesheet</h1>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>Workshop Ready</span>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
          </div>
        </div>
        <Badge variant={isTracking ? "default" : "secondary"}>
          {isTracking ? "Working" : "Not Working"}
        </Badge>
      </div>

      {/* Current Time Display */}
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-bold mb-2">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-blue-100">
            {format(currentTime, 'EEEE, MMM dd')}
          </div>
        </CardContent>
      </Card>

      {/* Location Status */}
      {location && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span className="font-mono text-xs">{location}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Clock Actions */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Button 
          size="lg"
          onClick={() => handleQuickClock("clock_in")}
          disabled={clockMutation.isPending || isTracking}
          className="h-16 text-lg"
        >
          <Play className="w-6 h-6 mr-2" />
          Clock In
        </Button>

        <Button 
          size="lg"
          variant="destructive"
          onClick={() => handleQuickClock("clock_out")}
          disabled={clockMutation.isPending || !isTracking}
          className="h-16 text-lg"
        >
          <Square className="w-6 h-6 mr-2" />
          Clock Out
        </Button>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline"
            onClick={() => handleQuickClock("break_start")}
            disabled={clockMutation.isPending || !isTracking}
            className="h-12"
          >
            Break Start
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => handleQuickClock("break_end")}
            disabled={clockMutation.isPending || !isTracking}
            className="h-12"
          >
            Break End
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-600">8.5h</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-600">42h</div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-purple-600">2.5h</div>
            <div className="text-xs text-muted-foreground">Overtime</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="font-medium">Steel Cutting - Job #001</div>
              <div className="text-sm text-muted-foreground">Due: 2:00 PM</div>
            </div>
            <Button size="sm" variant="outline">
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="font-medium">Welding Assembly - Job #002</div>
              <div className="text-sm text-muted-foreground">Due: 4:30 PM</div>
            </div>
            <Button size="sm" variant="outline">
              <Play className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offline Notice */}
      {!isOnline && (
        <Card className="mt-4 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-orange-800">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">
                Offline mode - Data will sync when connection returns
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}