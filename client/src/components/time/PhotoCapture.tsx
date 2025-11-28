import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoData: string, captureMethod: string) => void;
  title?: string;
}

export default function PhotoCapture({ isOpen, onClose, onCapture, title = "Take Photo" }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasCamera, setHasCamera] = useState(true);

  // Start camera when dialog opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported on this device");
        setHasCamera(false);
        return;
      }

      // Request camera permission
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setHasCamera(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      
      if (err.name === 'NotAllowedError') {
        setError("Camera access denied. Please enable camera permissions.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device.");
        setHasCamera(false);
      } else if (err.name === 'NotReadableError') {
        setError("Camera is being used by another application.");
      } else {
        setError("Unable to access camera. Please try again.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 JPEG with compression
        const photo = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoData(photo);
        
        // Stop camera after capture
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhotoData(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoData) {
      onCapture(photoData, 'camera');
      handleClose();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoData(result);
        onCapture(result, 'gallery');
        handleClose();
      };
      reader.readAsDataURL(file);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    setPhotoData(null);
    setError(null);
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!photoData ? (
            <>
              {hasCamera && (
                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
              
              <div className="flex gap-2">
                {hasCamera && (
                  <>
                    <Button
                      onClick={capturePhoto}
                      className="flex-1"
                      disabled={!stream}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capture Photo
                    </Button>
                    
                    {stream && (
                      <Button
                        onClick={switchCamera}
                        variant="outline"
                        size="icon"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
                
                <label className={hasCamera ? "" : "flex-1"}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant={hasCamera ? "outline" : "default"}
                    className={hasCamera ? "" : "w-full"}
                    onClick={(e) => e.currentTarget.parentElement?.querySelector('input')?.click()}
                  >
                    Upload Photo
                  </Button>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <img 
                  src={photoData} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={retakePhoto} variant="outline" className="flex-1">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button onClick={confirmPhoto} className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}