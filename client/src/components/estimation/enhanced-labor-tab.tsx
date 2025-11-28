import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Clock, Users, MapPin, Settings, Calculator, Edit3, Info, ChevronRight, ChevronDown, MoreVertical, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TableActionsDropdown } from "@/components/ui/table-actions-dropdown";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LaborItem {
  id: number; // Database-backed ID
  projectId: number;
  designation?: string;
  parentMaterialId?: number;
  operationId?: number;
  operationDesignation?: string;
  operationType?: string;
  category: 'workshop' | 'onsite' | 'subcontractor';
  subcategory: string;
  description: string;
  hours: number;
  rate: number;
  totalCost: number;
  location: 'workshop' | 'site';
  skillLevel: 'apprentice' | 'standard' | 'senior' | 'specialist';
  notes?: string;
}

interface EnhancedLaborTabProps {
  projectId?: number;
  labor: LaborItem[];
  setLabor: (labor: LaborItem[]) => void;
}

const LABOR_CATEGORIES = {
  workshop: ['fabrication', 'welding', 'assembly', 'loading', 'unloading', 'coatings'],
  onsite: ['fabrication', 'welding', 'assembly', 'erection', 'coatings'],
  subcontractor: ['fabrication', 'welding', 'assembly', 'erection', 'coatings', 'demolition']
};

const SKILL_RATES = {
  workshop: {
    apprentice: 45,
    standard: 55,
    senior: 70,
    specialist: 85
  },
  site: {
    apprentice: 65,
    standard: 80,
    senior: 100,
    specialist: 120
  }
};

export function EnhancedLaborTab({ projectId, labor, setLabor }: EnhancedLaborTabProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('workshop');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<Partial<LaborItem>>({
    category: 'workshop',
    subcategory: 'fabrication',
    location: 'workshop',
    skillLevel: 'standard',
    hours: 0,
    rate: 55
  });

  // Fetch labor items from database
  const { data: laborItems, isLoading, refetch } = useQuery({
    queryKey: ['/api/estimation/projects', projectId, 'labor'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/estimation/projects/${projectId}/labor`);
      if (!response.ok) throw new Error('Failed to fetch labor items');
      return response.json();
    },
    enabled: !!projectId
  });

  // Sync database items with local state
  useEffect(() => {
    if (laborItems && laborItems.length > 0) {
      setLabor(laborItems);
    }
  }, [laborItems, setLabor]);

  // Create labor item mutation
  const createLaborMutation = useMutation({
    mutationFn: async (laborData: Partial<LaborItem>) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      return apiRequest(`/api/estimation/projects/${projectId}/labor`, {
        method: 'POST',
        body: JSON.stringify(laborData)
      });
    },
    onSuccess: (newLabor) => {
      // Add the new labor item with database-generated ID
      const updatedLabor = [...labor, newLabor];
      setLabor(updatedLabor);
      
      toast({
        title: "Labor item created",
        description: "Labor item has been saved to the database"
      });
      
      // Refetch to ensure sync
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating labor item",
        description: error.message || "Failed to save labor item",
        variant: "destructive"
      });
    }
  });

  // Update labor item mutation
  const updateLaborMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<LaborItem> }) => {
      return apiRequest(`/api/estimation/labor/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: (updatedItem) => {
      // Update the local state
      const updatedLabor = labor.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      setLabor(updatedLabor);
      
      toast({
        title: "Labor item updated",
        description: "Changes have been saved"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating labor item",
        description: error.message || "Failed to update labor item",
        variant: "destructive"
      });
    }
  });

  // Delete labor item mutation
  const deleteLaborMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/estimation/labor/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, deletedId) => {
      // Remove from local state
      const updatedLabor = labor.filter(item => item.id !== deletedId);
      setLabor(updatedLabor);
      
      toast({
        title: "Labor item deleted",
        description: "Labor item has been removed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting labor item",
        description: error.message || "Failed to delete labor item",
        variant: "destructive"
      });
    }
  });

  // Group labor items by parent material ID
  const groupedLabor = useMemo(() => {
    const groups: { [key: string]: { designation: string; items: LaborItem[] } } = {};
    
    labor.forEach(item => {
      const groupKey = item.parentMaterialId ? item.parentMaterialId.toString() : (item.designation || 'Unassigned');
      const displayDesignation = item.designation || 'Unassigned';
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          designation: displayDesignation,
          items: []
        };
      }
      groups[groupKey].items.push(item);
    });
    
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const desA = groups[a].designation;
      const desB = groups[b].designation;
      return desA.localeCompare(desB);
    });
    
    const result: { [key: string]: { designation: string; items: LaborItem[] } } = {};
    sortedGroups.forEach(key => {
      result[key] = groups[key];
    });
    
    return result;
  }, [labor]);

  // Calculate summary for a group
  const getGroupSummary = (items: LaborItem[]) => {
    const totalHours = items.reduce((sum, item) => sum + item.hours, 0);
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const operationCount = items.length;
    
    return {
      totalHours,
      totalCost,
      operationCount
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
      setExpandedGroups(Object.keys(groupedLabor));
    } else {
      setExpandedGroups([]);
    }
  };

  // Update newItem category and location when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const location = tab === 'onsite' ? 'site' : 'workshop';
    const rate = updateRate(location, newItem.skillLevel || 'standard');
    setNewItem(prev => ({
      ...prev,
      category: tab as LaborItem['category'],
      location: location as LaborItem['location'],
      rate
    }));
  };

  const addLaborItem = async () => {
    if (!newItem.description || !newItem.hours) return;
    
    if (!projectId) {
      toast({
        title: "Cannot add labor item",
        description: "No project selected. Please select a project first.",
        variant: "destructive"
      });
      return;
    }

    const laborData = {
      category: newItem.category as LaborItem['category'],
      subcategory: newItem.subcategory || 'fabrication',
      description: newItem.description,
      hours: newItem.hours || 0,
      rate: newItem.rate || 55,
      totalCost: (newItem.hours || 0) * (newItem.rate || 55),
      location: newItem.location as LaborItem['location'],
      skillLevel: newItem.skillLevel as LaborItem['skillLevel'],
      notes: newItem.notes
    };

    // Create in database - will get back item with database-generated ID
    await createLaborMutation.mutate(laborData);
    
    // Reset form but keep current tab context
    const location = activeTab === 'onsite' ? 'site' : 'workshop';
    const defaultRate = updateRate(location, 'standard');
    setNewItem({
      category: activeTab as LaborItem['category'],
      subcategory: 'fabrication',
      location: location as LaborItem['location'],
      skillLevel: 'standard',
      hours: 0,
      rate: defaultRate,
      description: ''
    });
  };

  const updateLaborItem = (id: number, updates: Partial<LaborItem>) => {
    // Calculate total cost if hours or rate changed
    if (updates.hours !== undefined || updates.rate !== undefined) {
      const item = labor.find(i => i.id === id);
      if (item) {
        const hours = updates.hours !== undefined ? updates.hours : item.hours;
        const rate = updates.rate !== undefined ? updates.rate : item.rate;
        updates.totalCost = hours * rate;
      }
    }
    
    updateLaborMutation.mutate({ id, updates });
  };

  const removeLaborItem = (id: number) => {
    deleteLaborMutation.mutate(id);
  };

  const updateRate = (location: 'workshop' | 'site', skillLevel: string) => {
    return SKILL_RATES[location][skillLevel as keyof typeof SKILL_RATES.workshop] || 55;
  };

  const getCategoryTotal = (category: string) => {
    return labor
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + item.totalCost, 0);
  };

  const getTotalLabor = () => {
    return labor.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const isCreating = createLaborMutation.isPending;
  const isUpdating = updateLaborMutation.isPending;
  const isDeleting = deleteLaborMutation.isPending;
  const isAnyOperationPending = isCreating || isUpdating || isDeleting || isLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enhanced Labor Management
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="workshop" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Workshop
                <Badge variant="secondary">{getCategoryTotal('workshop').toFixed(2)}</Badge>
              </TabsTrigger>
              <TabsTrigger value="onsite" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Onsite
                <Badge variant="secondary">{getCategoryTotal('onsite').toFixed(2)}</Badge>
              </TabsTrigger>
              <TabsTrigger value="subcontractor" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Subcontractor
                <Badge variant="secondary">{getCategoryTotal('subcontractor').toFixed(2)}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workshop" className="space-y-4">
              {!projectId && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                  <p className="text-sm text-yellow-800">
                    No project selected. Please select a project to add labor items.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={newItem.subcategory}
                    onValueChange={(value) => setNewItem({ ...newItem, subcategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABOR_CATEGORIES.workshop.map(sub => (
                        <SelectItem key={sub} value={sub}>
                          {sub.charAt(0).toUpperCase() + sub.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Task description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Skill Level</Label>
                  <Select
                    value={newItem.skillLevel}
                    onValueChange={(value) => {
                      const rate = updateRate('workshop', value);
                      setNewItem({ ...newItem, skillLevel: value, rate });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apprentice">Apprentice</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newItem.hours || ''}
                    onChange={(e) => setNewItem({ ...newItem, hours: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Rate ($/hr)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.rate || ''}
                    onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={addLaborItem}
                    disabled={!projectId || isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Similar TabsContent for "onsite" and "subcontractor" tabs... */}
            {/* I'll keep them similar but adjust for their specific contexts */}
          </Tabs>
        </CardContent>
      </Card>

      {/* Labor items display section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Labor Items by Material
          </CardTitle>
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
        </CardHeader>
        <CardContent>
          {Object.keys(groupedLabor).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No labor items added yet. Add items using the form above.
            </div>
          ) : (
            <Accordion type="multiple" value={expandedGroups}>
              {Object.entries(groupedLabor).map(([groupKey, group]) => {
                const summary = getGroupSummary(group.items);
                return (
                  <AccordionItem key={groupKey} value={groupKey}>
                    <AccordionTrigger
                      onClick={() => toggleGroup(groupKey)}
                      className="hover:no-underline"
                    >
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          {expandedGroups.includes(groupKey) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <span className="font-semibold">{group.designation}</span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{summary.operationCount} operations</span>
                          <span>{summary.totalHours.toFixed(1)} hrs</span>
                          <span className="font-semibold">${summary.totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operation</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Skill Level</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">
                                {item.operationDesignation || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.category}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>
                                <Badge variant={item.location === 'site' ? 'default' : 'secondary'}>
                                  {item.location}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.skillLevel}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{item.hours.toFixed(1)}</TableCell>
                              <TableCell className="text-right">${item.rate.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                ${item.totalCost.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLaborItem(item.id)}
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Labor Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Total Labor Cost</Label>
              <p className="text-2xl font-bold">${getTotalLabor().toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Hours</Label>
              <p className="text-2xl font-bold">
                {labor.reduce((sum, item) => sum + item.hours, 0).toFixed(1)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Average Rate</Label>
              <p className="text-2xl font-bold">
                ${labor.length > 0 
                  ? (labor.reduce((sum, item) => sum + item.rate, 0) / labor.length).toFixed(2)
                  : '0.00'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Labor Items</Label>
              <p className="text-2xl font-bold">{labor.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}