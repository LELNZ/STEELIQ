import { useState, useEffect } from 'react';

interface OverheadSettings {
  opexMonthly: {
    workshopRent: number;
    utilities: number;
    insurance: number;
    administration: number;
    nonBillableStaff: number;
    maintenance: number;
  };
  capexAnnual: {
    equipmentDepreciation: number;
    vehicleDepreciation: number;
    toolsDepreciation: number;
    softwareLicenses: number;
  };
  projectModifiers: {
    smallProject: number;
    largeProject: number;
    siteWork: number;
    workshopOnly: number;
  };
  annualRevenueTarget: number;
}

interface MarginTargets {
  small: { min: number; max: number; threshold: number };
  medium: { min: number; max: number; threshold: number };
  large: { min: number; max: number; threshold: number };
}

export const useBusinessSettings = () => {
  const [overheadSettings, setOverheadSettings] = useState<OverheadSettings>({
    opexMonthly: {
      workshopRent: 8000,
      utilities: 2500,
      insurance: 1250,
      administration: 3000,
      nonBillableStaff: 10000,
      maintenance: 1500
    },
    capexAnnual: {
      equipmentDepreciation: 50000,
      vehicleDepreciation: 30000,
      toolsDepreciation: 14286,
      softwareLicenses: 12000
    },
    projectModifiers: {
      smallProject: 5,
      largeProject: -3,
      siteWork: 8,
      workshopOnly: -2
    },
    annualRevenueTarget: 1500000
  });

  const [marginTargets, setMarginTargets] = useState<MarginTargets>({
    small: { min: 20, max: 30, threshold: 50000 },
    medium: { min: 15, max: 25, threshold: 500000 },
    large: { min: 10, max: 20, threshold: 999999999 }
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedOverhead = localStorage.getItem('lateralEngineering_overheadSettings');
    const savedMargins = localStorage.getItem('lateralEngineering_marginTargets');
    
    if (savedOverhead) {
      setOverheadSettings(JSON.parse(savedOverhead));
    }
    if (savedMargins) {
      setMarginTargets(JSON.parse(savedMargins));
    }
  }, []);

  // Calculate dynamic overhead rate based on project characteristics
  const calculateOverheadRate = (projectValue: number, projectType: 'site' | 'workshop' | 'mixed') => {
    const annualOpex = Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0) * 12;
    const annualCapex = Object.values(overheadSettings.capexAnnual).reduce((sum, value) => sum + value, 0);
    const totalOverheads = annualOpex + annualCapex;
    let baseRate = (totalOverheads / overheadSettings.annualRevenueTarget) * 100;

    // Apply project modifiers
    if (projectValue < 50000) {
      baseRate += overheadSettings.projectModifiers.smallProject;
    } else if (projectValue > 200000) {
      baseRate += overheadSettings.projectModifiers.largeProject;
    }

    if (projectType === 'site') {
      baseRate += overheadSettings.projectModifiers.siteWork;
    } else if (projectType === 'workshop') {
      baseRate += overheadSettings.projectModifiers.workshopOnly;
    }

    return Math.max(baseRate, 10); // Minimum 10% overhead
  };

  // Get margin color and status based on project size and current margin
  const getMarginColorAndStatus = (projectValue: number, actualMargin: number) => {
    let target;
    let projectSize;

    if (projectValue < marginTargets.small.threshold) {
      target = marginTargets.small;
      projectSize = 'small';
    } else if (projectValue < marginTargets.medium.threshold) {
      target = marginTargets.medium;
      projectSize = 'medium';
    } else {
      target = marginTargets.large;
      projectSize = 'large';
    }

    const isBelow = actualMargin < target.min;
    const isAbove = actualMargin >= target.max;
    const isInRange = actualMargin >= target.min && actualMargin < target.max;

    let color, status;
    if (isBelow) {
      color = 'text-red-600 bg-red-50 border-red-200';
      status = 'Below Target';
    } else if (isInRange) {
      color = 'text-orange-600 bg-orange-50 border-orange-200';
      status = 'Acceptable';
    } else {
      color = 'text-green-600 bg-green-50 border-green-200';
      status = 'Excellent';
    }

    return {
      color,
      status,
      target,
      projectSize,
      range: `${target.min}-${target.max}%`
    };
  };

  return {
    overheadSettings,
    marginTargets,
    calculateOverheadRate,
    getMarginColorAndStatus,
    setOverheadSettings,
    setMarginTargets
  };
};