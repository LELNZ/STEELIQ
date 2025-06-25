import { useGlobalSettings } from './useGlobalSettings';
import { useBusinessSettings } from './useBusinessSettings';

export function useEstimationDefaults() {
  const { settings: globalSettings } = useGlobalSettings();
  const { overheadSettings, marginTargets } = useBusinessSettings();

  // Get defaults from global settings
  const getDefaultKerf = () => globalSettings.fabrication.defaultKerf;
  const getDefaultTolerance = () => globalSettings.fabrication.defaultTolerance;
  const getDefaultSteelGrade = () => globalSettings.fabrication.defaultSteelGrade;
  const getMinimumOffcutLength = () => globalSettings.fabrication.minimumOffcutLength;
  
  // Get labor rates from global settings
  const getDefaultLaborRates = () => globalSettings.estimation.defaultLabourRates;
  
  // Get overhead rate from business settings
  const calculateOverheadRate = () => {
    const annualOpex = Object.values(overheadSettings.opexMonthly).reduce((sum, value) => sum + value, 0) * 12;
    const annualCapex = Object.values(overheadSettings.capexAnnual).reduce((sum, value) => sum + value, 0);
    const totalOverheads = annualOpex + annualCapex;
    return (totalOverheads / overheadSettings.annualRevenueTarget) * 100;
  };
  
  // Get margin targets based on project size
  const getMarginTarget = (projectValue: number) => {
    if (projectValue < marginTargets.small.threshold) {
      return marginTargets.small;
    } else if (projectValue < marginTargets.medium.threshold) {
      return marginTargets.medium;
    } else {
      return marginTargets.large;
    }
  };

  // Check if coating calculation should be automatic
  const shouldAutoCalculateCoatings = () => globalSettings.estimation.autoCalculateCoatings;
  
  // Get GST rate from global settings
  const getGSTRate = () => globalSettings.financial.gstRate;
  
  // Get payment terms
  const getDefaultPaymentTerms = () => globalSettings.financial.paymentTermsDefault;
  
  // Get quote validity period
  const getQuoteValidityPeriod = () => globalSettings.financial.quoteValidityPeriod;

  return {
    // Fabrication defaults
    getDefaultKerf,
    getDefaultTolerance,
    getDefaultSteelGrade,
    getMinimumOffcutLength,
    
    // Labor rates
    getDefaultLaborRates,
    
    // Financial calculations
    calculateOverheadRate,
    getMarginTarget,
    getGSTRate,
    getDefaultPaymentTerms,
    getQuoteValidityPeriod,
    
    // Feature flags
    shouldAutoCalculateCoatings,
    
    // Quality requirements
    requireMillCertificates: () => globalSettings.fabrication.requireMillCertificates,
    requireApprovalThreshold: () => globalSettings.estimation.requireApprovalThreshold,
    
    // System preferences
    getDecimalPlaces: () => globalSettings.system.decimalPlaces,
    getDefaultCurrency: () => globalSettings.system.defaultCurrency,
    getUnitsSystem: () => globalSettings.system.unitsSystem,
    getDateFormat: () => globalSettings.system.dateFormat
  };
}