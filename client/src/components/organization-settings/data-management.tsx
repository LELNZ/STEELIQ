import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  RefreshCw,
  HardDrive,
  Clock,
  Hash,
  Settings,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";

interface BackupMetadata {
  id: number;
  backupId: string;
  backupName: string;
  description?: string;
  backupType: string;
  categories: string[];
  tableCount: number;
  recordCount: number;
  backupSize: number;
  status: string;
  createdBy: number;
  createdAt: string;
  restoredAt?: string;
}

interface NumberingSequence {
  id: number;
  sequenceType: string;
  currentNumber: number;
  prefix: string;
  includeYear: boolean;
  padLength: number;
  startingNumber: number;
  lastResetAt?: string;
  lastResetBy?: number;
  createdAt: string;
  updatedAt?: string;
}

export default function DataManagement() {
  const { toast } = useToast();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [createBackupBeforeClear, setCreateBackupBeforeClear] = useState(true);
  const [sequenceSettings, setSequenceSettings] = useState<Record<string, number>>({});

  // Fetch backups
  const { data: backups = [], isLoading: loadingBackups } = useQuery({
    queryKey: ["/api/data-management/backups"],
  });

  // Fetch numbering sequences
  const { data: sequences = [], isLoading: loadingSequences } = useQuery({
    queryKey: ["/api/data-management/numbering-sequences"],
  });

  // Initialize sequences on first load
  const initializeSequences = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/data-management/initialize-sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to initialize sequences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-management/numbering-sequences"] });
    },
  });

  useEffect(() => {
    if (!loadingSequences && sequences.length === 0) {
      initializeSequences.mutate();
    }
  }, [loadingSequences, sequences.length]);

  // Create backup mutation
  const createBackup = useMutation({
    mutationFn: async ({ categories, description }: { categories: string[]; description?: string }) => {
      const response = await fetch("/api/data-management/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categories, description }),
      });
      if (!response.ok) throw new Error("Failed to create backup");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Backup created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-management/backups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackup = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch("/api/data-management/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ backupId }),
      });
      if (!response.ok) throw new Error("Failed to restore backup");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Backup restored successfully. The page will reload.",
      });
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete backup mutation
  const deleteBackup = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch(`/api/data-management/backup/${backupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete backup");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-management/backups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear data mutation
  const clearData = useMutation({
    mutationFn: async ({ categories, createBackup }: { categories: string[]; createBackup: boolean }) => {
      const response = await fetch("/api/data-management/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categories, createBackup }),
      });
      if (!response.ok) throw new Error("Failed to clear data");
      return response.json();
    },
    onSuccess: (data) => {
      const deletedItems = Object.entries(data.deletedCounts)
        .filter(([_, count]) => count > 0)
        .map(([table, count]) => `${table}: ${count}`)
        .join(", ");
      
      toast({
        title: "Data Cleared Successfully",
        description: deletedItems || "No data was cleared",
      });
      
      setShowClearDialog(false);
      setSelectedCategories([]);
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset numbering sequence mutation
  const resetSequence = useMutation({
    mutationFn: async ({ sequenceType, startingNumber }: { sequenceType: string; startingNumber: number }) => {
      const response = await fetch(`/api/data-management/numbering-sequences/${sequenceType}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ startingNumber }),
      });
      if (!response.ok) throw new Error("Failed to reset sequence");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-management/numbering-sequences"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dataCategories = [
    { id: "procurement", label: "Procurement (Requisitions, RFQs, POs, Receipts)", icon: <Database className="h-4 w-4" /> },
    { id: "jobs", label: "Jobs & Projects", icon: <HardDrive className="h-4 w-4" /> },
    { id: "estimation", label: "AI Estimation Engine (Projects, Simulations)", icon: <Settings className="h-4 w-4" /> },
    { id: "finance", label: "Financial Records (Quotes, Invoices)", icon: <DollarSign className="h-4 w-4" /> },
    { id: "time_payroll", label: "Time & Payroll (Timesheets, Clock Events, GPS)", icon: <Clock className="h-4 w-4" /> },
    { id: "audit", label: "Audit Trails & History", icon: <Hash className="h-4 w-4" /> },
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCreateBackup = () => {
    const allCategories = dataCategories.map(c => c.id);
    createBackup.mutate({
      categories: allCategories,
      description: `Manual backup - ${new Date().toLocaleString()}`,
    });
  };

  const handleClearData = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "No categories selected",
        description: "Please select at least one category to clear",
        variant: "destructive",
      });
      return;
    }
    clearData.mutate({
      categories: selectedCategories,
      createBackup: createBackupBeforeClear,
    });
  };

  const handleRestoreBackup = () => {
    if (selectedBackup) {
      restoreBackup.mutate(selectedBackup.backupId);
      setShowRestoreDialog(false);
    }
  };

  const handleResetSequence = (sequenceType: string) => {
    const startingNumber = sequenceSettings[sequenceType] || 1;
    resetSequence.mutate({ sequenceType, startingNumber });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="backups" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="clear">Clear Data</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Backups
              </CardTitle>
              <CardDescription>
                Create and manage backups of your business data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {backups.length} backup{backups.length !== 1 ? 's' : ''} available
                </p>
                <Button 
                  onClick={handleCreateBackup}
                  disabled={createBackup.isPending}
                >
                  {createBackup.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>
              </div>

              {loadingBackups ? (
                <div className="text-center py-8">Loading backups...</div>
              ) : backups.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No backups available. Create your first backup to protect your data.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup: BackupMetadata) => (
                    <Card key={backup.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{backup.backupName}</h4>
                            <Badge variant="outline" className="text-xs">
                              {backup.recordCount} records
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}
                          </p>
                          <div className="flex gap-1">
                            {backup.categories.map(cat => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setShowRestoreDialog(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBackup.mutate(backup.backupId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clear" className="space-y-4">
          <Alert className="border-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Clearing data is irreversible unless you have a backup. 
              Always create a backup before clearing data.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Clear Business Data
              </CardTitle>
              <CardDescription>
                Select categories of data to clear for testing or reset purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {dataCategories.map(category => (
                  <div key={category.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                      id={category.id}
                    />
                    <Label 
                      htmlFor={category.id}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      {category.icon}
                      {category.label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <Checkbox
                  checked={createBackupBeforeClear}
                  onCheckedChange={(checked) => setCreateBackupBeforeClear(checked as boolean)}
                  id="backup-before-clear"
                />
                <Label htmlFor="backup-before-clear" className="cursor-pointer">
                  Create backup before clearing data (recommended)
                </Label>
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="destructive"
                  onClick={() => setShowClearDialog(true)}
                  disabled={selectedCategories.length === 0 || clearData.isPending}
                >
                  {clearData.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Selected Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbering" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Numbering Sequences
              </CardTitle>
              <CardDescription>
                Manage and reset document numbering sequences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSequences ? (
                <div className="text-center py-8">Loading sequences...</div>
              ) : sequences.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No numbering sequences configured. They will be created automatically when needed.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {sequences.map((seq: NumberingSequence) => (
                    <div key={seq.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{seq.sequenceType}</h4>
                          <p className="text-sm text-muted-foreground">
                            Current: {seq.prefix}{seq.includeYear && new Date().getFullYear() + '-'}{String(seq.currentNumber).padStart(seq.padLength, '0')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          Next: {seq.prefix}{seq.includeYear && new Date().getFullYear() + '-'}{String(seq.currentNumber + 1).padStart(seq.padLength, '0')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Input
                          type="number"
                          min="1"
                          defaultValue={1}
                          className="w-24"
                          onChange={(e) => setSequenceSettings({
                            ...sequenceSettings,
                            [seq.sequenceType]: parseInt(e.target.value) || 1
                          })}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetSequence(seq.sequenceType)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reset to
                        </Button>
                      </div>
                      {seq.lastResetAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last reset {formatDistanceToNow(new Date(seq.lastResetAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Data Clear</DialogTitle>
            <DialogDescription>
              You are about to clear the following data categories:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="list-disc list-inside space-y-1">
              {selectedCategories.map(cat => {
                const category = dataCategories.find(c => c.id === cat);
                return <li key={cat}>{category?.label}</li>;
              })}
            </ul>
            {createBackupBeforeClear && (
              <Alert className="mt-4">
                <AlertDescription>
                  A backup will be created before clearing the data.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearData}>
              Clear Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Backup Restore</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore from backup "{selectedBackup?.backupName}"?
            </DialogDescription>
          </DialogHeader>
          <Alert className="my-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will replace all current data with the backup data. 
              This action cannot be undone.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestoreBackup}>
              Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}