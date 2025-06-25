import { useState, useEffect } from 'react';

export interface LaborCategory {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  overtimeMultiplier: number;
  skillLevel: 'apprentice' | 'tradesman' | 'senior' | 'supervisor';
  certifications: string[];
  workshopRate?: number;
  siteRate?: number;
  effectiveDate: string;
  isActive: boolean;
}

export interface LaborRatesState {
  categories: LaborCategory[];
  defaultOvertime: number;
  nightShiftMultiplier: number;
  weekendMultiplier: number;
  publicHolidayMultiplier: number;
  travelTime: {
    billable: boolean;
    rate: number;
    minimumHours: number;
  };
  aiIntegration: {
    enabled: boolean;
    autoAssignCategories: boolean;
    suggestHours: boolean;
    complexityFactors: boolean;
  };
}

const defaultLaborRates: LaborRatesState = {
  categories: [
    {
      id: 'apprentice-1',
      name: 'First Year Apprentice',
      description: 'Entry level apprentice, basic tasks under supervision',
      baseRate: 25.00,
      overtimeMultiplier: 1.5,
      skillLevel: 'apprentice',
      certifications: [],
      workshopRate: 25.00,
      siteRate: 28.00,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true
    },
    {
      id: 'apprentice-4',
      name: 'Final Year Apprentice',
      description: 'Advanced apprentice, near-tradesman capabilities',
      baseRate: 35.00,
      overtimeMultiplier: 1.5,
      skillLevel: 'apprentice',
      certifications: ['Basic Welding', 'Workshop Safety'],
      workshopRate: 35.00,
      siteRate: 38.00,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true
    },
    {
      id: 'tradesman',
      name: 'Qualified Tradesman',
      description: 'Qualified steel fabricator, independent work',
      baseRate: 55.00,
      overtimeMultiplier: 1.5,
      skillLevel: 'tradesman',
      certifications: ['Trade Certificate', 'Advanced Welding'],
      workshopRate: 55.00,
      siteRate: 65.00,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true
    },
    {
      id: 'senior-welder',
      name: 'Senior Welder',
      description: 'Specialist welder, complex structural work',
      baseRate: 70.00,
      overtimeMultiplier: 1.5,
      skillLevel: 'senior',
      certifications: ['Advanced Welding', 'Structural Welding', 'Pressure Vessel'],
      workshopRate: 70.00,
      siteRate: 80.00,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true
    },
    {
      id: 'supervisor',
      name: 'Workshop Supervisor',
      description: 'Team leadership, quality control, project coordination',
      baseRate: 85.00,
      overtimeMultiplier: 1.5,
      skillLevel: 'supervisor',
      certifications: ['Trade Certificate', 'Management Training', 'WPS Qualified'],
      workshopRate: 85.00,
      siteRate: 95.00,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true
    }
  ],
  defaultOvertime: 1.5,
  nightShiftMultiplier: 1.2,
  weekendMultiplier: 1.5,
  publicHolidayMultiplier: 2.0,
  travelTime: {
    billable: true,
    rate: 45.00,
    minimumHours: 0.5
  },
  aiIntegration: {
    enabled: true,
    autoAssignCategories: true,
    suggestHours: true,
    complexityFactors: true
  }
};

export function useLaborRates() {
  const [laborRates, setLaborRates] = useState<LaborRatesState>(defaultLaborRates);

  useEffect(() => {
    const saved = localStorage.getItem('lateralEngineering_laborRates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLaborRates(parsed);
      } catch (error) {
        console.error('Failed to parse labor rates from localStorage:', error);
      }
    }
  }, []);

  const saveLaborRates = (newRates: LaborRatesState) => {
    setLaborRates(newRates);
    localStorage.setItem('lateralEngineering_laborRates', JSON.stringify(newRates));
  };

  const getActiveCategories = () => {
    return laborRates.categories.filter(cat => cat.isActive);
  };

  const getCategoryById = (id: string) => {
    return laborRates.categories.find(cat => cat.id === id);
  };

  const calculateEffectiveRate = (
    categoryId: string, 
    workType: 'workshop' | 'site' = 'workshop',
    isOvertime: boolean = false,
    isNightShift: boolean = false,
    isWeekend: boolean = false,
    isPublicHoliday: boolean = false
  ) => {
    const category = getCategoryById(categoryId);
    if (!category) return 0;

    let baseRate = workType === 'site' ? 
      (category.siteRate || category.baseRate) : 
      (category.workshopRate || category.baseRate);

    // Apply overtime multiplier
    if (isOvertime) {
      baseRate *= category.overtimeMultiplier;
    }

    // Apply premium multipliers
    if (isPublicHoliday) {
      baseRate *= laborRates.publicHolidayMultiplier;
    } else if (isWeekend) {
      baseRate *= laborRates.weekendMultiplier;
    } else if (isNightShift) {
      baseRate *= laborRates.nightShiftMultiplier;
    }

    return baseRate;
  };

  const suggestLaborCategory = (taskType: string, complexity: 'low' | 'medium' | 'high' = 'medium') => {
    if (!laborRates.aiIntegration.enabled || !laborRates.aiIntegration.autoAssignCategories) {
      return null;
    }

    const activeCategories = getActiveCategories();
    
    // Simple AI logic for suggesting categories based on task type
    const taskMappings: Record<string, string[]> = {
      'cutting': ['apprentice-1', 'apprentice-4', 'tradesman'],
      'welding': ['tradesman', 'senior-welder'],
      'assembly': ['tradesman', 'senior-welder'],
      'finishing': ['apprentice-4', 'tradesman'],
      'inspection': ['senior-welder', 'supervisor'],
      'supervision': ['supervisor']
    };

    const suggestedIds = taskMappings[taskType.toLowerCase()] || ['tradesman'];
    
    // Filter by complexity
    const filtered = activeCategories.filter(cat => {
      if (complexity === 'low' && ['apprentice', 'tradesman'].includes(cat.skillLevel)) return true;
      if (complexity === 'medium' && ['tradesman', 'senior'].includes(cat.skillLevel)) return true;
      if (complexity === 'high' && ['senior', 'supervisor'].includes(cat.skillLevel)) return true;
      return false;
    });

    return filtered.find(cat => suggestedIds.includes(cat.id)) || filtered[0] || activeCategories[0];
  };

  const estimateLaborHours = (
    materialType: string,
    complexity: 'low' | 'medium' | 'high' = 'medium',
    quantity: number = 1
  ) => {
    if (!laborRates.aiIntegration.enabled || !laborRates.aiIntegration.suggestHours) {
      return 0;
    }

    // Base hour estimates per unit for different material types
    const baseHours: Record<string, number> = {
      'cutting': 0.5,
      'welding': 2.0,
      'assembly': 1.5,
      'finishing': 1.0,
      'beam': 3.0,
      'column': 4.0,
      'plate': 1.5,
      'sheet': 1.0
    };

    const base = baseHours[materialType.toLowerCase()] || 2.0;
    
    // Apply complexity multipliers
    const complexityMultipliers = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.5
    };

    return base * complexityMultipliers[complexity] * quantity;
  };

  return {
    laborRates,
    setLaborRates: saveLaborRates,
    getActiveCategories,
    getCategoryById,
    calculateEffectiveRate,
    suggestLaborCategory,
    estimateLaborHours
  };
}