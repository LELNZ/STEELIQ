import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Users, 
  Plus, 
  Save, 
  Edit2, 
  Trash2, 
  Clock, 
  DollarSign, 
  Info,
  Calculator,
  TrendingUp,
  Settings,
  AlertCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface LaborCategory {
  id: string;
  name: string;
  description: string;
  chargeOutRate: number; // rate charged to clients per hour
  inHouseCostRate: number; // actual cost to company per hour (default $45)
  overtimeMultiplier: number;
  skillLevel: string; // user-editable
  certifications: string[];
  workshopChargeRate?: number; // workshop charge-out rate
  siteChargeRate?: number; // site charge-out rate
  workshopCostRate?: number; // workshop cost rate
  siteCostRate?: number; // site cost rate
  effectiveDate: string;
  isActive: boolean;
  dayShiftMultiplier: number;
  nightShiftMultiplier: number;
  weekendMultiplier: number;
  publicHolidayMultiplier: number;
}

interface LaborRatesState {
  categories: LaborCategory[];
  defaultOvertime: number;
  defaultInHouseCostRate: number; // company-wide default cost rate
  travelTime: {
    billable: boolean;
    chargeRate: number; // rate charged to client
    costRate: number; // cost to company
    minimumHours: number;
  };
  aiIntegration: {
    enabled: boolean;
    autoAssignCategories: boolean;
    suggestHours: boolean;
    complexityFactors: boolean;
    pdfAnalysisIntegration: boolean;
  };
  historicalTracking: {
    enabled: boolean;
    retentionMonths: number;
  };
}

const defaultLaborCategories: LaborCategory[] = [
  {
    id: 'apprentice-1',
    name: 'First Year Apprentice',
    description: 'Entry level apprentice, basic tasks under supervision',
    chargeOutRate: 45.00,
    inHouseCostRate: 28.00,
    overtimeMultiplier: 1.5,
    skillLevel: 'Apprentice',
    certifications: [],
    workshopChargeRate: 45.00,
    siteChargeRate: 55.00,
    workshopCostRate: 28.00,
    siteCostRate: 32.00,
    dayShiftMultiplier: 1.0,
    nightShiftMultiplier: 1.2,
    weekendMultiplier: 1.5,
    publicHolidayMultiplier: 2.0,
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true
  },
  {
    id: 'apprentice-4',
    name: 'Final Year Apprentice',
    description: 'Advanced apprentice, near-tradesman capabilities',
    chargeOutRate: 65.00,
    inHouseCostRate: 38.00,
    overtimeMultiplier: 1.5,
    skillLevel: 'Apprentice',
    certifications: ['Basic Welding', 'Workshop Safety'],
    workshopChargeRate: 65.00,
    siteChargeRate: 75.00,
    workshopCostRate: 38.00,
    siteCostRate: 42.00,
    dayShiftMultiplier: 1.0,
    nightShiftMultiplier: 1.2,
    weekendMultiplier: 1.5,
    publicHolidayMultiplier: 2.0,
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true
  },
  {
    id: 'tradesman',
    name: 'Qualified Tradesman',
    description: 'Qualified steel fabricator, independent work',
    chargeOutRate: 95.00,
    inHouseCostRate: 55.00,
    overtimeMultiplier: 1.5,
    skillLevel: 'Tradesman',
    certifications: ['Trade Certificate', 'Advanced Welding'],
    workshopChargeRate: 95.00,
    siteChargeRate: 110.00,
    workshopCostRate: 55.00,
    siteCostRate: 62.00,
    dayShiftMultiplier: 1.0,
    nightShiftMultiplier: 1.2,
    weekendMultiplier: 1.5,
    publicHolidayMultiplier: 2.0,
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true
  },
  {
    id: 'senior-welder',
    name: 'Senior Welder',
    description: 'Specialist welder, complex structural work',
    chargeOutRate: 125.00,
    inHouseCostRate: 75.00,
    overtimeMultiplier: 1.5,
    skillLevel: 'Senior Specialist',
    certifications: ['Advanced Welding', 'Structural Welding', 'Pressure Vessel'],
    workshopChargeRate: 125.00,
    siteChargeRate: 145.00,
    workshopCostRate: 75.00,
    siteCostRate: 85.00,
    dayShiftMultiplier: 1.0,
    nightShiftMultiplier: 1.2,
    weekendMultiplier: 1.5,
    publicHolidayMultiplier: 2.0,
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true
  },
  {
    id: 'supervisor',
    name: 'Workshop Supervisor',
    description: 'Team leadership, quality control, project coordination',
    chargeOutRate: 150.00,
    inHouseCostRate: 95.00,
    overtimeMultiplier: 1.5,
    skillLevel: 'Supervisor',
    certifications: ['Trade Certificate', 'Management Training', 'WPS Qualified'],
    workshopChargeRate: 150.00,
    siteChargeRate: 175.00,
    workshopCostRate: 95.00,
    siteCostRate: 105.00,
    dayShiftMultiplier: 1.0,
    nightShiftMultiplier: 1.2,
    weekendMultiplier: 1.5,
    publicHolidayMultiplier: 2.0,
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true
  }
];

export default function LaborRates() {
  const { toast } = useToast();
  const [laborRates, setLaborRates] = useState<LaborRatesState>({
    categories: defaultLaborCategories,
    defaultOvertime: 1.5,
    defaultInHouseCostRate: 45.00,
    travelTime: {
      billable: true,
      chargeRate: 75.00,
      costRate: 45.00,
      minimumHours: 0.5
    },
    aiIntegration: {
      enabled: true,
      autoAssignCategories: true,
      suggestHours: true,
      complexityFactors: true,
      pdfAnalysisIntegration: true
    },
    historicalTracking: {
      enabled: true,
      retentionMonths: 24
    }
  });

  const [editingCategory, setEditingCategory] = useState<LaborCategory | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Load saved rates on component mount
  useEffect(() => {
    const saved = localStorage.getItem('lateralEngineering_laborRates');
    if (saved) {
      setLaborRates(JSON.parse(saved));
    }
  }, []);

  const saveLaborRates = () => {
    localStorage.setItem('lateralEngineering_laborRates', JSON.stringify(laborRates));
    toast({
      title: "Labor Rates Saved",
      description: "All labor rates and settings have been updated successfully."
    });
  };

  const addCategory = (category: Omit<LaborCategory, 'id'>) => {
    const newCategory: LaborCategory = {
      ...category,
      id: `custom-${Date.now()}`
    };
    setLaborRates(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
    setShowAddForm(false);
  };

  const updateCategory = (id: string, updates: Partial<LaborCategory>) => {
    setLaborRates(prev => ({
      ...prev,
      categories: prev.categories.map(cat => 
        cat.id === id ? { ...cat, ...updates } : cat
      )
    }));
    setEditingCategory(null);
    setShowEditDialog(false);
    toast({
      title: "Category Updated",
      description: "Labor category has been successfully updated."
    });
  };

  const confirmDeleteCategory = (id: string) => {
    setLaborRates(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== id)
    }));
    setCategoryToDelete(null);
    toast({
      title: "Category Deleted",
      description: "Labor category has been removed."
    });
  };

  const startEditCategory = (category: LaborCategory) => {
    setEditingCategory(category);
    setShowEditDialog(true);
  };

  const calculateEffectiveRate = (
    category: LaborCategory, 
    workType: 'workshop' | 'site', 
    rateType: 'charge' | 'cost' = 'charge',
    isOvertime: boolean = false,
    timeMultiplier: number = 1.0
  ) => {
    let baseRate: number;
    
    if (rateType === 'charge') {
      baseRate = workType === 'site' ? 
        (category.siteChargeRate || category.chargeOutRate) : 
        (category.workshopChargeRate || category.chargeOutRate);
    } else {
      baseRate = workType === 'site' ? 
        (category.siteCostRate || category.inHouseCostRate) : 
        (category.workshopCostRate || category.inHouseCostRate);
    }
    
    // Apply overtime multiplier
    if (isOvertime) {
      baseRate *= category.overtimeMultiplier;
    }
    
    // Apply time period multiplier (night, weekend, holiday)
    baseRate *= timeMultiplier;
    
    return baseRate;
  };

  const calculateProfitMargin = (category: LaborCategory, workType: 'workshop' | 'site') => {
    const chargeRate = calculateEffectiveRate(category, workType, 'charge');
    const costRate = calculateEffectiveRate(category, workType, 'cost');
    const profit = chargeRate - costRate;
    const marginPercentage = (profit / chargeRate) * 100;
    return { profit, marginPercentage, chargeRate, costRate };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Labor Rates Management</h1>
          <p className="text-muted-foreground">Configure labor categories, rates, and AI integration for estimation engine</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={saveLaborRates}>
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Company Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Company Labor Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Default In-House Cost Rate ($/hr)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={laborRates.defaultInHouseCostRate}
                        onChange={(e) => setLaborRates(prev => ({
                          ...prev,
                          defaultInHouseCostRate: parseFloat(e.target.value) || 45
                        }))}
                      />
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Company-wide default cost rate for profit margin calculations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <Label>Default Overtime Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="3"
                value={laborRates.defaultOvertime}
                onChange={(e) => setLaborRates(prev => ({
                  ...prev,
                  defaultOvertime: parseFloat(e.target.value) || 1.5
                }))}
              />
            </div>
            <div>
              <Label>Travel Time Charge Rate</Label>
              <Input
                type="number"
                step="0.50"
                min="0"
                value={laborRates.travelTime.chargeRate}
                onChange={(e) => setLaborRates(prev => ({
                  ...prev,
                  travelTime: { ...prev.travelTime, chargeRate: parseFloat(e.target.value) || 75 }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            AI Estimation Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable AI Integration</Label>
                <p className="text-xs text-muted-foreground">Connect labor rates to AI estimation engine</p>
              </div>
              <Switch
                checked={laborRates.aiIntegration.enabled}
                onCheckedChange={(checked) => setLaborRates(prev => ({
                  ...prev,
                  aiIntegration: { ...prev.aiIntegration, enabled: checked }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-assign Categories</Label>
                <p className="text-xs text-muted-foreground">Automatically suggest labor categories for tasks</p>
              </div>
              <Switch
                checked={laborRates.aiIntegration.autoAssignCategories}
                onCheckedChange={(checked) => setLaborRates(prev => ({
                  ...prev,
                  aiIntegration: { ...prev.aiIntegration, autoAssignCategories: checked }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>PDF Analysis Integration</Label>
                <p className="text-xs text-muted-foreground">Extract labor requirements from uploaded drawings</p>
              </div>
              <Switch
                checked={laborRates.aiIntegration.pdfAnalysisIntegration}
                onCheckedChange={(checked) => setLaborRates(prev => ({
                  ...prev,
                  aiIntegration: { ...prev.aiIntegration, pdfAnalysisIntegration: checked }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Historical Rate Tracking</Label>
                <p className="text-xs text-muted-foreground">Track rate changes for trend analysis</p>
              </div>
              <Switch
                checked={laborRates.historicalTracking.enabled}
                onCheckedChange={(checked) => setLaborRates(prev => ({
                  ...prev,
                  historicalTracking: { ...prev.historicalTracking, enabled: checked }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Labor Categories */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Labor Categories</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {laborRates.categories.map((category) => (
            <Card key={category.id} className={!category.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <Badge variant={category.skillLevel.toLowerCase().includes('apprentice') ? 'secondary' : 
                                   category.skillLevel.toLowerCase().includes('tradesman') ? 'default' :
                                   category.skillLevel.toLowerCase().includes('senior') || category.skillLevel.toLowerCase().includes('specialist') ? 'destructive' : 'outline'}>
                        {category.skillLevel}
                      </Badge>
                      {!category.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Workshop Charge</Label>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">{calculateEffectiveRate(category, 'workshop', 'charge').toFixed(2)}/hr</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cost: ${calculateEffectiveRate(category, 'workshop', 'cost').toFixed(2)}/hr
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Site Charge</Label>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">{calculateEffectiveRate(category, 'site', 'charge').toFixed(2)}/hr</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cost: ${calculateEffectiveRate(category, 'site', 'cost').toFixed(2)}/hr
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Profit Margin</Label>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold text-orange-600">
                            {calculateProfitMargin(category, 'workshop').marginPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${calculateProfitMargin(category, 'workshop').profit.toFixed(2)}/hr profit
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Certifications</Label>
                        <div className="flex flex-wrap gap-1">
                          {category.certifications.length > 0 ? (
                            category.certifications.slice(0, 2).map((cert, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {cert}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None required</span>
                          )}
                          {category.certifications.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{category.certifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEditCategory(category)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Labor Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{category.name}"? This action cannot be undone and may affect existing estimations that use this labor category.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => confirmDeleteCategory(category.id)}>
                            Delete Category
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{laborRates.categories.filter(c => c.isActive).length}</div>
              <div className="text-sm text-muted-foreground">Active Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${(laborRates.categories.reduce((avg, cat) => avg + cat.chargeOutRate, 0) / laborRates.categories.length).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Average Charge Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {laborRates.aiIntegration.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-sm text-muted-foreground">AI Integration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Integration Info */}
      {laborRates.aiIntegration.enabled && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">AI Estimation Integration Active</h4>
                <p className="text-sm text-blue-700 mt-1">
                  The estimation engine will automatically suggest appropriate labor categories and hours based on:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• PDF drawing analysis and material take-off calculations</li>
                  <li>• Material complexity and fabrication requirements</li>
                  <li>• Welding specifications and quality standards</li>
                  <li>• Workshop vs site work considerations with rate differentials</li>
                  <li>• Real-time profit margin analysis (charge rate vs cost rate)</li>
                  <li>• Historical project data for accuracy improvements</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Labor Category</DialogTitle>
            <DialogDescription>
              Update the details for this labor category
            </DialogDescription>
          </DialogHeader>
          
          {editingCategory && (
            <EditCategoryForm
              category={editingCategory}
              onSave={(updates) => updateCategory(editingCategory.id, updates)}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Category Form Component
function EditCategoryForm({ 
  category, 
  onSave, 
  onCancel 
}: { 
  category: LaborCategory;
  onSave: (updates: Partial<LaborCategory>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category.name,
    description: category.description,
    chargeOutRate: category.chargeOutRate,
    inHouseCostRate: category.inHouseCostRate,
    overtimeMultiplier: category.overtimeMultiplier,
    skillLevel: category.skillLevel,
    workshopChargeRate: category.workshopChargeRate || category.chargeOutRate,
    siteChargeRate: category.siteChargeRate || category.chargeOutRate,
    workshopCostRate: category.workshopCostRate || category.inHouseCostRate,
    siteCostRate: category.siteCostRate || category.inHouseCostRate,
    isActive: category.isActive
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Senior Welder"
          />
        </div>
        <div>
          <Label>Skill Level</Label>
          <Input
            value={formData.skillLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, skillLevel: e.target.value }))}
            placeholder="e.g. Specialist, Tradesman"
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of role and responsibilities"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Workshop Charge Rate ($/hr)</Label>
          <Input
            type="number"
            step="0.50"
            value={formData.workshopChargeRate}
            onChange={(e) => setFormData(prev => ({ ...prev, workshopChargeRate: parseFloat(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Site Charge Rate ($/hr)</Label>
          <Input
            type="number"
            step="0.50"
            value={formData.siteChargeRate}
            onChange={(e) => setFormData(prev => ({ ...prev, siteChargeRate: parseFloat(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Workshop Cost Rate ($/hr)</Label>
          <Input
            type="number"
            step="0.50"
            value={formData.workshopCostRate}
            onChange={(e) => setFormData(prev => ({ ...prev, workshopCostRate: parseFloat(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Site Cost Rate ($/hr)</Label>
          <Input
            type="number"
            step="0.50"
            value={formData.siteCostRate}
            onChange={(e) => setFormData(prev => ({ ...prev, siteCostRate: parseFloat(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Overtime Multiplier</Label>
          <Input
            type="number"
            step="0.1"
            min="1"
            max="3"
            value={formData.overtimeMultiplier}
            onChange={(e) => setFormData(prev => ({ ...prev, overtimeMultiplier: parseFloat(e.target.value) }))}
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
          <Label>Active Category</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
}