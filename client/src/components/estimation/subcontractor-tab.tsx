import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2, Users, Phone, Mail, Clock, DollarSign, MapPin, FileText, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface SubcontractorItem {
  id: number; // Database-backed ID
  projectId: number;
  designation?: string; // Material designation (e.g., C1, B2, PL1)
  parentMaterialId?: number; // Reference to parent material for proper grouping
  operationId?: number; // Direct link to operation for tracking
  operationDesignation?: string; // Operation designation (e.g., C1-310-weld-1, B2-400-erect-2)
  operationType?: string; // Type of operation being subcontracted
  companyName: string;
  companyId?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  scope: string;
  workCategory: 'fabrication' | 'erection' | 'coating' | 'transport' | 'specialized' | 'other';
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  includesLabor: boolean;
  includesMaterial: boolean;
  includesEquipment: boolean;
  leadTime?: number; // days
  paymentTerms?: string;
  notes?: string;
}

interface SubcontractorTabProps {
  projectId?: number;
  subcontractors: SubcontractorItem[];
  setSubcontractors: (subcontractors: SubcontractorItem[]) => void;
}

const WORK_CATEGORIES = {
  fabrication: { label: 'Fabrication', color: 'blue' },
  erection: { label: 'Erection/Installation', color: 'green' },
  coating: { label: 'Coating/Painting', color: 'purple' },
  transport: { label: 'Transport/Logistics', color: 'orange' },
  specialized: { label: 'Specialized Work', color: 'red' },
  other: { label: 'Other Services', color: 'gray' }
};

const COMMON_SUBCONTRACTORS = [
  { name: 'Steel Fabricators Ltd', category: 'fabrication', specialization: 'Heavy structural steel' },
  { name: 'Pro Erection Services', category: 'erection', specialization: 'High-rise installation' },
  { name: 'Industrial Coatings Co', category: 'coating', specialization: 'Blast and paint' },
  { name: 'Heavy Transport Solutions', category: 'transport', specialization: 'Oversized loads' },
  { name: 'Specialist Welding Services', category: 'specialized', specialization: 'Exotic materials' }
];

export default function SubcontractorTab({ projectId, subcontractors, setSubcontractors }: SubcontractorTabProps) {
  const { toast } = useToast();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<SubcontractorItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [formData, setFormData] = useState<Partial<SubcontractorItem>>({
    companyName: '',
    scope: '',
    workCategory: 'fabrication',
    quantity: 1,
    unit: 'each',
    unitCost: 0,
    totalCost: 0,
    includesLabor: true,
    includesMaterial: false,
    includesEquipment: false,
  });

  // Fetch subcontractors from database
  const { data: subcontractorItems, isLoading, refetch } = useQuery({
    queryKey: ['/api/estimation/projects', projectId, 'subcontractors'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/estimation/projects/${projectId}/subcontractors`);
      if (!response.ok) throw new Error('Failed to fetch subcontractor items');
      return response.json();
    },
    enabled: !!projectId
  });

  // Sync database items with local state
  useEffect(() => {
    if (subcontractorItems && subcontractorItems.length > 0) {
      setSubcontractors(subcontractorItems);
    }
  }, [subcontractorItems, setSubcontractors]);

  // Create subcontractor mutation
  const createSubcontractorMutation = useMutation({
    mutationFn: async (subcontractorData: Partial<SubcontractorItem>) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      return apiRequest(`/api/estimation/projects/${projectId}/subcontractors`, {
        method: 'POST',
        body: JSON.stringify(subcontractorData)
      });
    },
    onSuccess: (newSubcontractor) => {
      const updatedSubcontractors = [...subcontractors, newSubcontractor];
      setSubcontractors(updatedSubcontractors);
      
      toast({
        title: "Subcontractor added",
        description: "Subcontractor has been saved to the database"
      });
      
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error adding subcontractor",
        description: error.message || "Failed to save subcontractor",
        variant: "destructive"
      });
    }
  });

  // Update subcontractor mutation
  const updateSubcontractorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SubcontractorItem> }) => {
      return apiRequest(`/api/estimation/subcontractors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: (updatedItem) => {
      const updatedSubcontractors = subcontractors.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      setSubcontractors(updatedSubcontractors);
      
      toast({
        title: "Subcontractor updated",
        description: "Changes have been saved"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating subcontractor",
        description: error.message || "Failed to update subcontractor",
        variant: "destructive"
      });
    }
  });

  // Delete subcontractor mutation
  const deleteSubcontractorMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/estimation/subcontractors/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, deletedId) => {
      const updatedSubcontractors = subcontractors.filter(item => item.id !== deletedId);
      setSubcontractors(updatedSubcontractors);
      
      toast({
        title: "Subcontractor removed",
        description: "Subcontractor has been deleted"
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing subcontractor",
        description: error.message || "Failed to delete subcontractor",
        variant: "destructive"
      });
    }
  });

  // Group subcontractor items by company for company-based management
  const groupedByCompany = useMemo(() => {
    const groups: { [key: string]: { 
      company: string;
      items: SubcontractorItem[];
      totalCost: number;
      itemCount: number;
      categories: Set<string>;
    }} = {};
    
    subcontractors.forEach(item => {
      const groupKey = item.companyName || 'Unassigned';
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          company: groupKey,
          items: [],
          totalCost: 0,
          itemCount: 0,
          categories: new Set()
        };
      }
      
      groups[groupKey].items.push(item);
      groups[groupKey].totalCost += item.totalCost;
      groups[groupKey].itemCount += 1;
      groups[groupKey].categories.add(item.workCategory);
    });
    
    // Sort groups by company name
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
    
    const result: typeof groups = {};
    sortedGroups.forEach(key => {
      result[key] = groups[key];
    });
    
    return result;
  }, [subcontractors]);

  // Group subcontractor items by parent material for material-based view
  const groupedByMaterial = useMemo(() => {
    const groups: { [key: string]: { 
      designation: string;
      items: SubcontractorItem[];
    }} = {};
    
    subcontractors.forEach(item => {
      // Use parentMaterialId as primary grouping key, fallback to designation
      const groupKey = item.parentMaterialId || item.designation || 'Unassigned';
      const displayDesignation = item.designation || 'Unassigned';
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          designation: displayDesignation,
          items: []
        };
      }
      groups[groupKey].items.push(item);
    });
    
    // Sort groups by designation
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const desA = groups[a].designation;
      const desB = groups[b].designation;
      return desA.localeCompare(desB);
    });
    
    const result: typeof groups = {};
    sortedGroups.forEach(key => {
      result[key] = groups[key];
    });
    
    return result;
  }, [subcontractors]);

  // Calculate summary for a material group
  const getMaterialGroupSummary = (items: SubcontractorItem[]) => {
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const itemCount = items.length;
    const companies = new Set(items.map(item => item.companyName));
    
    return {
      totalCost,
      itemCount,
      companyCount: companies.size
    };
  };

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(key => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  // Toggle all groups
  const toggleAllGroups = (expand: boolean) => {
    if (expand) {
      setExpandedGroups(Object.keys(groupedByCompany));
    } else {
      setExpandedGroups([]);
    }
  };

  const handleAddSubcontractor = () => {
    if (!formData.companyName || !formData.scope) {
      toast({ 
        title: "Missing required fields", 
        description: "Please provide company name and scope",
        variant: "destructive" 
      });
      return;
    }

    const subcontractorData: Partial<SubcontractorItem> = {
      projectId: projectId,
      ...formData,
      totalCost: (formData.quantity || 1) * (formData.unitCost || 0)
    };

    createSubcontractorMutation.mutate(subcontractorData);
    setShowAddDialog(false);
    resetForm();
  };

  const handleUpdateSubcontractor = (id: number, updates: Partial<SubcontractorItem>) => {
    // Calculate totalCost if quantity or unitCost changes
    if (updates.quantity !== undefined || updates.unitCost !== undefined) {
      const item = subcontractors.find(s => s.id === id);
      if (item) {
        const quantity = updates.quantity !== undefined ? updates.quantity : item.quantity;
        const unitCost = updates.unitCost !== undefined ? updates.unitCost : item.unitCost;
        updates.totalCost = quantity * unitCost;
      }
    }
    
    updateSubcontractorMutation.mutate({ id, updates });
  };

  const handleRemoveSubcontractor = (id: number) => {
    deleteSubcontractorMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      scope: '',
      workCategory: 'fabrication',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      totalCost: 0,
      includesLabor: true,
      includesMaterial: false,
      includesEquipment: false,
    });
    setEditingSubcontractor(null);
  };

  const getTotalSubcontractorCost = () => {
    return subcontractors.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const getCategoryTotal = (category: string) => {
    return subcontractors
      .filter(item => item.workCategory === category)
      .reduce((sum, item) => sum + item.totalCost, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading subcontractors...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subcontractor Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Manage subcontracted work packages, track costs, and coordinate with external contractors.
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Companies</span>
            </div>
            <div className="text-2xl font-bold">{Object.keys(groupedByCompany).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Work Packages</span>
            </div>
            <div className="text-2xl font-bold">{subcontractors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Avg Lead Time</span>
            </div>
            <div className="text-2xl font-bold">
              {subcontractors.length > 0 
                ? Math.round(subcontractors.reduce((sum, item) => sum + (item.leadTime || 0), 0) / subcontractors.length)
                : 0} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <div className="text-2xl font-bold">${getTotalSubcontractorCost().toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Work Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(WORK_CATEGORIES).map(([key, category]) => {
              const categoryTotal = getCategoryTotal(key);
              const categoryCount = subcontractors.filter(item => item.workCategory === key).length;
              return (
                <div key={key} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{category.label}</span>
                    <Badge variant="outline">{categoryCount}</Badge>
                  </div>
                  <div className="text-xl font-bold">${categoryTotal.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Subcontractor Items by Material (Primary Grouping for Parent-Child Hierarchy) */}
      {subcontractors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subcontractors by Material Designation</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleAllGroups(true)}
                >
                  Expand All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleAllGroups(false)}
                >
                  Collapse All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" value={expandedGroups} className="w-full">
              {Object.entries(groupedByMaterial).map(([materialId, group]) => {
                const summary = getMaterialGroupSummary(group.items);
                return (
                  <AccordionItem key={materialId} value={materialId}>
                    <AccordionTrigger onClick={() => toggleGroup(materialId)}>
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Badge className="text-sm font-semibold">
                            {group.designation}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {summary.itemCount} subcontractor{summary.itemCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({summary.companyCount} {summary.companyCount === 1 ? 'company' : 'companies'})
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            ${summary.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Material/Operation</TableHead>
                              <TableHead>Scope</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit Cost</TableHead>
                              <TableHead>Includes</TableHead>
                              <TableHead>Lead Time</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.designation || 'General'}
                                    </Badge>
                                    {item.operationDesignation && (
                                      <div className="text-xs font-mono text-muted-foreground">
                                        {item.operationDesignation}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    <p className="text-sm truncate">{item.scope}</p>
                                    {item.notes && (
                                      <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {WORK_CATEGORIES[item.workCategory].label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateSubcontractor(item.id, { 
                                        quantity: parseFloat(e.target.value) || 0 
                                      })}
                                      className="w-16"
                                    />
                                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.unitCost}
                                    onChange={(e) => handleUpdateSubcontractor(item.id, { 
                                      unitCost: parseFloat(e.target.value) || 0 
                                    })}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {item.includesLabor && <Badge variant="outline" className="text-xs">L</Badge>}
                                    {item.includesMaterial && <Badge variant="outline" className="text-xs">M</Badge>}
                                    {item.includesEquipment && <Badge variant="outline" className="text-xs">E</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.leadTime || 0}
                                    onChange={(e) => handleUpdateSubcontractor(item.id, { 
                                      leadTime: parseInt(e.target.value) || 0 
                                    })}
                                    className="w-14"
                                  />
                                  <span className="text-xs text-muted-foreground">days</span>
                                </TableCell>
                                <TableCell className="font-medium">
                                  ${item.totalCost.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSubcontractor(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Subcontractor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSubcontractor ? 'Edit Subcontractor' : 'Add Subcontractor Package'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Company Selection/Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                  list="company-list"
                />
                <datalist id="company-list">
                  {COMMON_SUBCONTRACTORS.map(sub => (
                    <option key={sub.name} value={sub.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="category">Work Category</Label>
                <Select
                  value={formData.workCategory}
                  onValueChange={(value) => setFormData({ ...formData, workCategory: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORK_CATEGORIES).map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contact">Contact Person</Label>
                <Input
                  id="contact"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+64 21 xxx xxxx"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            {/* Scope of Work */}
            <div>
              <Label htmlFor="scope">Scope of Work</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="Describe the work to be performed..."
                rows={3}
              />
            </div>

            {/* Quantity and Pricing */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="each, m², kg"
                />
              </div>
              <div>
                <Label htmlFor="unitCost">Unit Cost ($)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="totalCost">Total Cost ($)</Label>
                <Input
                  id="totalCost"
                  type="number"
                  value={(formData.quantity || 0) * (formData.unitCost || 0)}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Includes Checkboxes */}
            <div>
              <Label>Package Includes:</Label>
              <div className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includesLabor}
                    onCheckedChange={(checked) => setFormData({ ...formData, includesLabor: checked })}
                  />
                  <Label>Labor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includesMaterial}
                    onCheckedChange={(checked) => setFormData({ ...formData, includesMaterial: checked })}
                  />
                  <Label>Material</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.includesEquipment}
                    onCheckedChange={(checked) => setFormData({ ...formData, includesEquipment: checked })}
                  />
                  <Label>Equipment</Label>
                </div>
              </div>
            </div>

            {/* Lead Time and Payment Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leadTime">Lead Time (days)</Label>
                <Input
                  id="leadTime"
                  type="number"
                  value={formData.leadTime}
                  onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) || 0 })}
                  placeholder="Number of days"
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g., Net 30, 50% deposit"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddSubcontractor}>
              {editingSubcontractor ? 'Update' : 'Add'} Subcontractor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Additional Company Summary View */}
      {Object.keys(groupedByCompany).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Company Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {Object.entries(groupedByCompany).map(([companyName, group]) => (
                <div key={companyName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">{group.company}</span>
                      <Badge variant="outline">{group.itemCount} packages</Badge>
                    </div>
                    <div className="text-lg font-bold">
                      ${group.totalCost.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from(group.categories).map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {WORK_CATEGORIES[cat as keyof typeof WORK_CATEGORIES].label}
                      </Badge>
                    ))}
                  </div>
                  {group.items[0].contactPerson && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {group.items[0].contactPerson}
                        {group.items[0].phone && <> • {group.items[0].phone}</>}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}