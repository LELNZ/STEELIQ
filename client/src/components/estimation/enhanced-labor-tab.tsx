import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Clock, Users, MapPin, Settings, Calculator, Edit3, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LaborItem {
  id: string;
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

export function EnhancedLaborTab({ labor, setLabor }: EnhancedLaborTabProps) {
  const [activeTab, setActiveTab] = useState('workshop');
  const [newItem, setNewItem] = useState<Partial<LaborItem>>({
    category: 'workshop',
    subcategory: 'fabrication',
    location: 'workshop',
    skillLevel: 'standard',
    hours: 0,
    rate: 55
  });

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

  const addLaborItem = () => {
    if (!newItem.description || !newItem.hours) return;

    const item: LaborItem = {
      id: `labor-${Date.now()}`,
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

    const updatedLabor = [...labor, item];
    console.log('Adding labor item:', item);
    console.log('New labor array length:', updatedLabor.length);
    setLabor(updatedLabor);
    
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

  const updateLaborItem = (id: string, updates: Partial<LaborItem>) => {
    const updatedLabor = labor.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.totalCost = (updated.hours || 0) * (updated.rate || 0);
        console.log('Updated labor item:', updated);
        return updated;
      }
      return item;
    });
    console.log('Updating labor array:', updatedLabor);
    setLabor(updatedLabor);
  };

  const removeLaborItem = (id: string) => {
    const updatedLabor = labor.filter(item => item.id !== id);
    console.log('Removing labor item, new array:', updatedLabor);
    setLabor(updatedLabor);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enhanced Labor Management
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Workshop and onsite labor including fabrication, welding, assembly, and erection.<br/>
                  Tracks hours, skill levels, rates, and location-based cost variations.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-3 w-full mb-6 h-auto p-1">
              <TabsTrigger value="workshop" className="h-auto p-3 border-l-4 border-l-blue-500 data-[state=active]:border-l-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-blue-100 rounded-md">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">Workshop Labor</div>
                    <div className="text-xs text-muted-foreground">Fabrication & Assembly</div>
                  </div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="onsite" className="h-auto p-3 border-l-4 border-l-green-500 data-[state=active]:border-l-green-600 data-[state=active]:bg-green-50 data-[state=active]:text-green-900">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-green-100 rounded-md">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">Onsite Labor</div>
                    <div className="text-xs text-muted-foreground">Installation & Erection</div>
                  </div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="subcontractor" className="h-auto p-3 border-l-4 border-l-orange-500 data-[state=active]:border-l-orange-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-900">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-orange-100 rounded-md">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">Subcontractor</div>
                    <div className="text-xs text-muted-foreground">External Services</div>
                  </div>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workshop" className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <Label>Subcategory</Label>
                  <Select 
                    value={newItem.subcategory} 
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, subcategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABOR_CATEGORIES.workshop.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Labor description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    value={newItem.hours || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Skill Level</Label>
                  <Select 
                    value={newItem.skillLevel} 
                    onValueChange={(value) => {
                      const rate = updateRate('workshop', value);
                      setNewItem(prev => ({ ...prev, skillLevel: value as LaborItem['skillLevel'], rate }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apprentice">Apprentice ($45/hr)</SelectItem>
                      <SelectItem value="standard">Standard ($55/hr)</SelectItem>
                      <SelectItem value="senior">Senior ($70/hr)</SelectItem>
                      <SelectItem value="specialist">Specialist ($85/hr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rate ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.rate || 55}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 55 }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={addLaborItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="onsite" className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <Label>Subcategory</Label>
                  <Select 
                    value={newItem.subcategory} 
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, subcategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABOR_CATEGORIES.onsite.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Labor description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    value={newItem.hours || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Skill Level</Label>
                  <Select 
                    value={newItem.skillLevel} 
                    onValueChange={(value) => {
                      const rate = updateRate('site', value);
                      setNewItem(prev => ({ ...prev, skillLevel: value as LaborItem['skillLevel'], rate }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apprentice">Apprentice ($65/hr)</SelectItem>
                      <SelectItem value="standard">Standard ($80/hr)</SelectItem>
                      <SelectItem value="senior">Senior ($100/hr)</SelectItem>
                      <SelectItem value="specialist">Specialist ($120/hr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rate ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.rate || 80}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 80 }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={addLaborItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="subcontractor" className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <Label>Subcategory</Label>
                  <Select 
                    value={newItem.subcategory} 
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, subcategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABOR_CATEGORIES.subcontractor.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Subcontractor work description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    value={newItem.hours || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Select 
                    value={newItem.location} 
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, location: value as 'workshop' | 'site' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rate ($/hr)</Label>
                  <Input
                    type="number"
                    value={newItem.rate || 90}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 90 }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={addLaborItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Labor Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Workshop</span>
            </div>
            <div className="text-2xl font-bold">${getCategoryTotal('workshop').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Onsite</span>
            </div>
            <div className="text-2xl font-bold">${getCategoryTotal('onsite').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Subcontractor</span>
            </div>
            <div className="text-2xl font-bold">${getCategoryTotal('subcontractor').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Total Labor</span>
            </div>
            <div className="text-2xl font-bold">${getTotalLabor().toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Labor Items Table */}
      {labor.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Labor Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Skill Level</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labor.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{item.subcategory}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.hours}
                        onChange={(e) => {
                          const newHours = parseFloat(e.target.value) || 0;
                          const newCost = newHours * item.rate;
                          updateLaborItem(item.id, { hours: newHours, totalCost: newCost });
                        }}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value) || 0;
                          const newCost = item.hours * newRate;
                          updateLaborItem(item.id, { rate: newRate, totalCost: newCost });
                        }}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.location === 'workshop' ? 'default' : 'secondary'}>
                        {item.location}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.skillLevel}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">${item.totalCost.toLocaleString()}</TableCell>
                    <TableCell className="max-w-40">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Add notes..."
                                value={item.notes || ''}
                                onChange={(e) => updateLaborItem(item.id, { notes: e.target.value })}
                                className="text-sm min-w-32"
                              />
                              {item.notes && (
                                <div className="text-xs text-muted-foreground truncate max-w-20">
                                  {item.notes.length > 20 ? `${item.notes.substring(0, 20)}...` : item.notes}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          {item.notes && (
                            <TooltipContent>
                              <p className="max-w-xs">{item.notes}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newCost = item.hours * item.rate;
                                  updateLaborItem(item.id, { totalCost: newCost });
                                }}
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Recalculate cost</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLaborItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove item</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}