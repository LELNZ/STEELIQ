import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  FileImage,
  FileCheck,
  AlertCircle,
  Loader2,
  Brain,
  Settings2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "analyzing" | "complete" | "error";
  progress: number;
  result?: any;
  error?: string;
}

export function DrawingUploadTab() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [projectDetails, setProjectDetails] = useState({
    name: "",
    type: "general",
    standards: "AS/NZS",
    notes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/acad": [".dwg"],
      "application/dxf": [".dxf"],
    },
    multiple: true,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (fileData: { file: File; id: string; settings: any }) => {
      const formData = new FormData();
      formData.append("file", fileData.file);
      formData.append("settings", JSON.stringify(fileData.settings));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id && f.status === "analyzing"
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 500);

      try {
        const result = await apiRequest("/api/drawing-intelligence/analyze", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        return { id: fileData.id, result };
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: ({ id, result }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "complete", progress: 100, result }
            : f
        )
      );
      toast({
        title: "Analysis Complete",
        description: "Drawing has been successfully analyzed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drawing-intelligence/drawings"] });
    },
    onError: (error: any, { id }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "error", error: error.message }
            : f
        )
      );
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!projectDetails.name) {
      toast({
        title: "Project Name Required",
        description: "Please enter a project name before analyzing",
        variant: "destructive",
      });
      return;
    }

    files.forEach((file) => {
      if (file.status === "pending") {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "analyzing" } : f
          )
        );
        analyzeMutation.mutate({
          file: file.file,
          id: file.id,
          settings: projectDetails,
        });
      }
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return <FileText className="h-6 w-6" />;
    if (file.type.startsWith("image/")) return <FileImage className="h-6 w-6" />;
    return <FileText className="h-6 w-6" />;
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "analyzing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "complete":
        return <FileCheck className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Project Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Configure analysis parameters for accurate results
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Advanced Settings
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Warehouse Extension - ABC Corp"
                  value={projectDetails.name}
                  onChange={(e) =>
                    setProjectDetails({ ...projectDetails, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drawing-type">Drawing Type</Label>
                <Select
                  value={projectDetails.type}
                  onValueChange={(value) =>
                    setProjectDetails({ ...projectDetails, type: value })
                  }
                >
                  <SelectTrigger id="drawing-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Arrangement</SelectItem>
                    <SelectItem value="structural">Structural Plans</SelectItem>
                    <SelectItem value="assembly">Assembly Drawings</SelectItem>
                    <SelectItem value="detail">Detail Drawings</SelectItem>
                    <SelectItem value="workshop">Workshop Drawings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? "Drop the files here..."
                : "Drag & drop drawings here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports PDF, DWG, DXF, PNG, JPG (Max 50MB per file)
            </p>
            <Button variant="outline" size="sm">
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Uploaded Files ({files.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={!projectDetails.name || files.every(f => f.status !== "pending")}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">{getFileIcon(file.file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {file.status === "analyzing" && (
                      <Progress value={file.progress} className="h-2 mt-2" />
                    )}
                    {file.error && (
                      <p className="text-sm text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusIcon(file.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advanced Analysis Settings</DialogTitle>
            <DialogDescription>
              Configure AI recognition parameters for optimal results
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="standards">Steel Standards</Label>
              <Select
                value={projectDetails.standards}
                onValueChange={(value) =>
                  setProjectDetails({ ...projectDetails, standards: value })
                }
              >
                <SelectTrigger id="standards">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AS/NZS">AS/NZS (Australian/NZ)</SelectItem>
                  <SelectItem value="AISC">AISC (American)</SelectItem>
                  <SelectItem value="BS">BS (British)</SelectItem>
                  <SelectItem value="EN">EN (European)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Instructions</Label>
              <Textarea
                id="notes"
                placeholder="Any special requirements or notes for the AI analysis..."
                value={projectDetails.notes}
                onChange={(e) =>
                  setProjectDetails({ ...projectDetails, notes: e.target.value })
                }
                rows={4}
              />
            </div>

            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                The AI will automatically detect steel sections, welds, connections,
                and dimensions based on the selected standards. For best results,
                ensure drawings are clear and properly scaled.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}