import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCw,
  Maximize2,
  MousePointer,
  Square,
  Circle,
  Type,
  Ruler,
  Trash2,
  Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// We'll use PDF.js via CDN for simplicity
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface PdfViewerProps {
  documentId: number;
  fileUrl: string;
  onAnnotationCreate?: (annotation: any) => void;
  onElementSelect?: (element: any) => void;
  enableAnnotations?: boolean;
  annotations?: Array<{
    id: string;
    pageNumber: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    type: string;
    text?: string;
    color?: string;
    elementId?: string;
  }>;
}

export function PdfViewerComponent({
  documentId,
  fileUrl,
  onAnnotationCreate,
  onElementSelect,
  enableAnnotations = false,
  annotations = []
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Annotation tools
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [annotationColor, setAnnotationColor] = useState('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);

  const { toast } = useToast();

  // Load PDF.js library
  useEffect(() => {
    const loadPdfJs = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        };
        document.head.appendChild(script);
        
        // Wait for library to load
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (window.pdfjsLib) {
              clearInterval(checkInterval);
              resolve(true);
            }
          }, 100);
        });
      }
    };

    loadPdfJs();
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!window.pdfjsLib || !fileUrl) return;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = window.pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setPageCount(pdf.numPages);
        setPageNum(1);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load PDF document",
          variant: "destructive"
        });
      }
    };

    loadPdf();
  }, [fileUrl, toast]);

  // Render PDF page
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale, rotation });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Update overlay dimensions
      if (overlayRef.current) {
        overlayRef.current.style.width = `${viewport.width}px`;
        overlayRef.current.style.height = `${viewport.height}px`;
      }
    } catch (err) {
      console.error('Error rendering page:', err);
      toast({
        title: "Error",
        description: "Failed to render page",
        variant: "destructive"
      });
    }
  }, [pdfDoc, scale, rotation, toast]);

  // Re-render when page, scale, or rotation changes
  useEffect(() => {
    renderPage(pageNum);
  }, [pageNum, renderPage]);

  // Handle page navigation
  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNum < pageCount) {
      setPageNum(pageNum + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= pageCount) {
      setPageNum(value);
    }
  };

  // Handle zoom
  const zoomIn = () => {
    setScale(Math.min(scale + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
  };

  // Handle rotation
  const rotate = () => {
    setRotation((rotation + 90) % 360);
  };

  // Handle annotations
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableAnnotations || selectedTool === 'select') return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });

    if (selectedTool === 'text') {
      // Handle text annotation
      const text = prompt('Enter annotation text:');
      if (text) {
        const annotation = {
          pageNumber: pageNum,
          x,
          y,
          type: 'text',
          text,
          color: annotationColor
        };
        onAnnotationCreate?.(annotation);
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setCurrentAnnotation({
      x: Math.min(drawStart.x, currentX),
      y: Math.min(drawStart.y, currentY),
      width: Math.abs(currentX - drawStart.x),
      height: Math.abs(currentY - drawStart.y),
      type: selectedTool,
      color: annotationColor
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) {
      setIsDrawing(false);
      return;
    }

    if (currentAnnotation.width > 5 && currentAnnotation.height > 5) {
      const annotation = {
        ...currentAnnotation,
        pageNumber: pageNum
      };

      // If rectangle tool, prompt for element ID
      if (selectedTool === 'rectangle') {
        const elementId = prompt('Enter element ID (e.g., B1, C2):');
        if (elementId) {
          annotation.elementId = elementId;
          annotation.type = 'element';
        }
      }

      onAnnotationCreate?.(annotation);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentAnnotation(null);
  };

  // Render annotations for current page
  const renderAnnotations = () => {
    const pageAnnotations = annotations.filter(a => a.pageNumber === pageNum);
    
    return pageAnnotations.map((annotation) => (
      <div
        key={annotation.id}
        className="absolute border-2 pointer-events-none"
        style={{
          left: annotation.x,
          top: annotation.y,
          width: annotation.width || 'auto',
          height: annotation.height || 'auto',
          borderColor: annotation.color || '#FF0000',
          borderStyle: annotation.type === 'element' ? 'solid' : 'dashed'
        }}
      >
        {annotation.text && (
          <div 
            className="absolute -top-6 left-0 px-1 py-0.5 text-xs font-bold"
            style={{ 
              backgroundColor: annotation.color || '#FF0000',
              color: 'white'
            }}
          >
            {annotation.elementId || annotation.text}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading PDF document...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b">
        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevPage}
            disabled={pageNum <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={pageNum}
              onChange={handlePageInputChange}
              className="w-16 text-center"
              min={1}
              max={pageCount}
            />
            <span className="text-sm text-gray-500">/ {pageCount}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNum >= pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 w-32">
            <Slider
              value={[scale]}
              onValueChange={handleScaleChange}
              min={0.5}
              max={3}
              step={0.25}
              className="w-full"
            />
            <span className="text-sm text-gray-500 w-12">
              {Math.round(scale * 100)}%
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Annotation tools */}
        {enableAnnotations && (
          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('select')}
              title="Select"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedTool === 'rectangle' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('rectangle')}
              title="Mark Element"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedTool === 'circle' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('circle')}
              title="Circle"
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedTool === 'text' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('text')}
              title="Text"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedTool === 'ruler' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('ruler')}
              title="Measure"
            >
              <Ruler className="h-4 w-4" />
            </Button>
            <div className="ml-2">
              <input
                type="color"
                value={annotationColor}
                onChange={(e) => setAnnotationColor(e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
                title="Annotation Color"
              />
            </div>
          </div>
        )}

        {/* Other controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={rotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4">
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
          />
          <div
            ref={overlayRef}
            className="absolute top-0 left-0 pointer-events-auto"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              cursor: selectedTool === 'select' ? 'default' : 'crosshair'
            }}
          >
            {/* Render existing annotations */}
            {renderAnnotations()}
            
            {/* Render current drawing */}
            {isDrawing && currentAnnotation && (
              <div
                className="absolute border-2"
                style={{
                  left: currentAnnotation.x,
                  top: currentAnnotation.y,
                  width: currentAnnotation.width,
                  height: currentAnnotation.height,
                  borderColor: currentAnnotation.color,
                  borderStyle: 'dashed'
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}