import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  FileText,
  Package,
  Users,
  ClipboardList,
  Building,
  ChevronRight,
  ChevronDown,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LifecycleTemplate {
  id: number;
  name: string;
  description: string;
  industry: string;
  projectType: string;
  isActive: boolean;
  phases: TemplatePhase[];
  createdAt: Date;
  updatedAt: Date;
}

interface TemplatePhase {
  id?: number;
  phaseName: string;
  phaseCode: string;
  description: string;
  sequenceOrder: number;
  tasks: TemplateTask[];
}

interface TemplateTask {
  id?: number;
  taskName: string;
  taskCode: string;
  description: string;
  responsibleParty: string;
  approvalRequired: boolean;
  requiredDocuments: string[];
  automationTrigger?: string;
  sequenceOrder: number;
}

export default function LifecycleTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LifecycleTemplate | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: 'steel_fabrication',
    projectType: 'standard',
    phases: [] as TemplatePhase[]
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/lifecycle/templates']
  });

  // Create/Update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedTemplate) {
        return apiRequest(`/api/lifecycle/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest('/api/lifecycle/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lifecycle/templates'] });
      toast({
        title: selectedTemplate ? "Template Updated" : "Template Created",
        description: "The lifecycle template has been saved successfully."
      });
      setShowTemplateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/lifecycle/templates/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lifecycle/templates'] });
      toast({
        title: "Template Deleted",
        description: "The lifecycle template has been deleted."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      industry: 'steel_fabrication',
      projectType: 'standard',
      phases: []
    });
    setSelectedTemplate(null);
  };

  const handleEditTemplate = (template: LifecycleTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      industry: template.industry,
      projectType: template.projectType,
      phases: template.phases || []
    });
    setShowTemplateDialog(true);
  };

  const handleDuplicateTemplate = (template: LifecycleTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      industry: template.industry,
      projectType: template.projectType,
      phases: template.phases || []
    });
    setShowTemplateDialog(true);
  };

  const addPhase = () => {
    const newPhase: TemplatePhase = {
      phaseName: '',
      phaseCode: '',
      description: '',
      sequenceOrder: formData.phases.length + 1,
      tasks: []
    };
    setFormData({
      ...formData,
      phases: [...formData.phases, newPhase]
    });
  };

  const updatePhase = (index: number, updates: Partial<TemplatePhase>) => {
    const updatedPhases = [...formData.phases];
    updatedPhases[index] = { ...updatedPhases[index], ...updates };
    setFormData({ ...formData, phases: updatedPhases });
  };

  const removePhase = (index: number) => {
    const updatedPhases = formData.phases.filter((_, i) => i !== index);
    // Update sequence orders
    updatedPhases.forEach((phase, i) => {
      phase.sequenceOrder = i + 1;
    });
    setFormData({ ...formData, phases: updatedPhases });
  };

  const addTask = (phaseIndex: number) => {
    const newTask: TemplateTask = {
      taskName: '',
      taskCode: '',
      description: '',
      responsibleParty: 'LEL',
      approvalRequired: false,
      requiredDocuments: [],
      sequenceOrder: formData.phases[phaseIndex].tasks.length + 1
    };
    const updatedPhases = [...formData.phases];
    updatedPhases[phaseIndex].tasks.push(newTask);
    setFormData({ ...formData, phases: updatedPhases });
  };

  const updateTask = (phaseIndex: number, taskIndex: number, updates: Partial<TemplateTask>) => {
    const updatedPhases = [...formData.phases];
    updatedPhases[phaseIndex].tasks[taskIndex] = {
      ...updatedPhases[phaseIndex].tasks[taskIndex],
      ...updates
    };
    setFormData({ ...formData, phases: updatedPhases });
  };

  const removeTask = (phaseIndex: number, taskIndex: number) => {
    const updatedPhases = [...formData.phases];
    updatedPhases[phaseIndex].tasks = updatedPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex);
    // Update sequence orders
    updatedPhases[phaseIndex].tasks.forEach((task, i) => {
      task.sequenceOrder = i + 1;
    });
    setFormData({ ...formData, phases: updatedPhases });
  };

  const togglePhaseExpansion = (index: number) => {
    setExpandedPhases(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case 'steel_fabrication':
        return <Package className="h-4 w-4" />;
      case 'construction':
        return <Building className="h-4 w-4" />;
      case 'engineering':
        return <FileText className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lifecycle Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage project lifecycle templates for different industries and project types
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowTemplateDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template: LifecycleTemplate) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getIndustryIcon(template.industry)}
                    {template.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Industry:</span>
                  <span className="font-medium capitalize">
                    {template.industry.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Project Type:</span>
                  <span className="font-medium capitalize">
                    {template.projectType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phases:</span>
                  <span className="font-medium">{template.phases?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Tasks:</span>
                  <span className="font-medium">
                    {template.phases?.reduce((sum, phase) => sum + (phase.tasks?.length || 0), 0) || 0}
                  </span>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this template?')) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Steel Fabrication Workflow"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose and scope of this template"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="steel_fabrication">Steel Fabrication</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project Type</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="complex">Complex</SelectItem>
                      <SelectItem value="fast_track">Fast Track</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Phases */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base">Phases</Label>
                <Button size="sm" onClick={addPhase}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Phase
                </Button>
              </div>

              {formData.phases.map((phase, phaseIndex) => (
                <Card key={phaseIndex}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => togglePhaseExpansion(phaseIndex)}
                        className="flex-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedPhases.includes(phaseIndex) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              {phase.phaseName || `Phase ${phaseIndex + 1}`}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {phase.tasks.length} tasks
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhase(phaseIndex);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </button>
                    </div>
                  </CardHeader>

                  {expandedPhases.includes(phaseIndex) && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Phase Name</Label>
                          <Input
                            value={phase.phaseName}
                            onChange={(e) => updatePhase(phaseIndex, { phaseName: e.target.value })}
                            placeholder="e.g., Pre-Fabrication"
                          />
                        </div>
                        <div>
                          <Label>Phase Code</Label>
                          <Input
                            value={phase.phaseCode}
                            onChange={(e) => updatePhase(phaseIndex, { phaseCode: e.target.value })}
                            placeholder="e.g., PRE-FAB"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Phase Description</Label>
                        <Textarea
                          value={phase.description}
                          onChange={(e) => updatePhase(phaseIndex, { description: e.target.value })}
                          placeholder="Describe this phase"
                          rows={2}
                        />
                      </div>

                      {/* Tasks */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Tasks</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addTask(phaseIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Task
                          </Button>
                        </div>

                        {phase.tasks.map((task, taskIndex) => (
                          <div key={taskIndex} className="p-3 border rounded-lg space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={task.taskName}
                                onChange={(e) => updateTask(phaseIndex, taskIndex, { taskName: e.target.value })}
                                placeholder="Task name"
                              />
                              <Input
                                value={task.taskCode}
                                onChange={(e) => updateTask(phaseIndex, taskIndex, { taskCode: e.target.value })}
                                placeholder="Task code"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Select
                                value={task.responsibleParty}
                                onValueChange={(value) => updateTask(phaseIndex, taskIndex, { responsibleParty: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LEL">LEL</SelectItem>
                                  <SelectItem value="Client">Client</SelectItem>
                                  <SelectItem value="Engineer">Engineer</SelectItem>
                                  <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                                  <SelectItem value="Detailer">Detailer</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={task.approvalRequired}
                                    onChange={(e) => updateTask(phaseIndex, taskIndex, { approvalRequired: e.target.checked })}
                                  />
                                  Approval Required
                                </label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeTask(phaseIndex, taskIndex)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate(formData)}
              disabled={saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}