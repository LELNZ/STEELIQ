import { useState, useEffect } from 'react';

interface GlobalSettings {
  company: {
    name: string;
    abn: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    timezone: string;
    fiscalYearStart: string;
  };
  system: {
    defaultCurrency: string;
    unitsSystem: 'metric' | 'imperial';
    decimalPlaces: number;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    language: string;
    autoBackupEnabled: boolean;
    backupFrequency: number;
    sessionTimeout: number;
  };
  fabrication: {
    defaultKerf: number;
    defaultTolerance: number;
    standardLengths: number[];
    minimumOffcutLength: number;
    materialWasteAllowance: number;
    defaultSteelGrade: string;
    requireMillCertificates: boolean;
    qualityControlEnabled: boolean;
    welderCertificationTracking: boolean;
  };
  estimation: {
    contingencyRateRange: { min: number; max: number };
    laborRateStructure: 'hourly' | 'piece' | 'hybrid';
    defaultLabourRates: {
      apprentice: number;
      tradesman: number;
      foreman: number;
      supervisor: number;
    };
    autoCalculateCoatings: boolean;
    includeSiteAllowances: boolean;
    standardSiteAllowanceRate: number;
    requireApprovalThreshold: number;
  };
  inventory: {
    enableBarcodeScanning: boolean;
    lowStockThreshold: number;
    reorderPointCalculation: 'manual' | 'automatic';
    stockTakeFrequency: number;
    enableLocationTracking: boolean;
    requireReceiptVerification: boolean;
    autoUpdatePricesFromSuppliers: boolean;
    priceUpdateFrequency: number;
  };
  quality: {
    wpsDatabase: boolean;
    inspectionCheckpoints: boolean;
    nonConformanceTracking: boolean;
    customerSignoffRequired: boolean;
    photoDocumentationMandatory: boolean;
    testCertificateTracking: boolean;
    complianceStandards: string[];
  };
  safety: {
    hsePolicyTracking: boolean;
    riskAssessmentMandatory: boolean;
    inductionTracking: boolean;
    incidentReporting: boolean;
    equipmentInspectionSchedule: boolean;
    emergencyContactSystem: boolean;
    swmsRequired: boolean;
  };
  financial: {
    gstRate: number;
    paymentTermsDefault: number;
    latePaymentPenalty: number;
    creditLimitCheck: boolean;
    multiCurrencyEnabled: boolean;
    exchangeRateSource: string;
    invoiceNumberFormat: string;
    quoteValidityPeriod: number;
  };
  integration: {
    accountingSoftware: string;
    cadSoftware: string;
    crmSystem: string;
    emailProvider: string;
    whatsappProvider: string;
    weatherAPI: boolean;
    mapService: string;
    cloudStorage: string;
  };
  reporting: {
    standardReports: string[];
    defaultExportFormat: 'pdf' | 'excel' | 'csv';
    includeChartsDefault: boolean;
    watermarkDocuments: boolean;
    autoEmailSchedules: boolean;
    kpiDashboardEnabled: boolean;
    benchmarkingEnabled: boolean;
  };
  mobile: {
    offlineModeEnabled: boolean;
    gpsTrackingEnabled: boolean;
    photoCompressionLevel: 'low' | 'medium' | 'high';
    voiceNotesEnabled: boolean;
    barcodeScanning: boolean;
    signatureCapture: boolean;
    timeClockIntegration: boolean;
  };
  workflow: {
    approvalWorkflows: boolean;
    projectStageGates: boolean;
    automaticStatusUpdates: boolean;
    clientPortalEnabled: boolean;
    supplierPortalEnabled: boolean;
    documentVersionControl: boolean;
    changeOrderApproval: boolean;
  };
}

const defaultGlobalSettings: GlobalSettings = {
  company: {
    name: 'Lateral Engineering Limited',
    abn: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    timezone: 'Pacific/Auckland',
    fiscalYearStart: '04-01'
  },
  system: {
    defaultCurrency: 'NZD',
    unitsSystem: 'metric',
    decimalPlaces: 2,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    language: 'en',
    autoBackupEnabled: true,
    backupFrequency: 24,
    sessionTimeout: 480
  },
  fabrication: {
    defaultKerf: 2.4,
    defaultTolerance: 0.5,
    standardLengths: [6000, 7500, 9000, 12000, 15000],
    minimumOffcutLength: 500,
    materialWasteAllowance: 5,
    defaultSteelGrade: 'AS/NZS 3679.1-300',
    requireMillCertificates: true,
    qualityControlEnabled: true,
    welderCertificationTracking: true
  },
  estimation: {
    contingencyRateRange: { min: 2, max: 15 },
    laborRateStructure: 'hourly',
    defaultLabourRates: {
      apprentice: 35,
      tradesman: 55,
      foreman: 75,
      supervisor: 95
    },
    autoCalculateCoatings: true,
    includeSiteAllowances: true,
    standardSiteAllowanceRate: 12,
    requireApprovalThreshold: 50000
  },
  inventory: {
    enableBarcodeScanning: true,
    lowStockThreshold: 20,
    reorderPointCalculation: 'automatic',
    stockTakeFrequency: 90,
    enableLocationTracking: true,
    requireReceiptVerification: true,
    autoUpdatePricesFromSuppliers: false,
    priceUpdateFrequency: 7
  },
  quality: {
    wpsDatabase: true,
    inspectionCheckpoints: true,
    nonConformanceTracking: true,
    customerSignoffRequired: true,
    photoDocumentationMandatory: true,
    testCertificateTracking: true,
    complianceStandards: ['AS/NZS 1554', 'AS/NZS 3679', 'AWS D1.1', 'AS/NZS 1163']
  },
  safety: {
    hsePolicyTracking: true,
    riskAssessmentMandatory: true,
    inductionTracking: true,
    incidentReporting: true,
    equipmentInspectionSchedule: true,
    emergencyContactSystem: true,
    swmsRequired: true
  },
  financial: {
    gstRate: 15,
    paymentTermsDefault: 30,
    latePaymentPenalty: 1.5,
    creditLimitCheck: true,
    multiCurrencyEnabled: false,
    exchangeRateSource: 'RBNZ',
    invoiceNumberFormat: 'LE-{YYYY}-{####}',
    quoteValidityPeriod: 30
  },
  integration: {
    accountingSoftware: 'Xero',
    cadSoftware: 'AutoCAD',
    crmSystem: '',
    emailProvider: 'SMTP',
    whatsappProvider: '',
    weatherAPI: true,
    mapService: 'Google Maps',
    cloudStorage: 'Replit Storage'
  },
  reporting: {
    standardReports: ['Job Profitability', 'Material Usage', 'Labour Efficiency', 'Cash Flow'],
    defaultExportFormat: 'pdf',
    includeChartsDefault: true,
    watermarkDocuments: true,
    autoEmailSchedules: false,
    kpiDashboardEnabled: true,
    benchmarkingEnabled: false
  },
  mobile: {
    offlineModeEnabled: true,
    gpsTrackingEnabled: false,
    photoCompressionLevel: 'medium',
    voiceNotesEnabled: false,
    barcodeScanning: true,
    signatureCapture: true,
    timeClockIntegration: false
  },
  workflow: {
    approvalWorkflows: true,
    projectStageGates: true,
    automaticStatusUpdates: true,
    clientPortalEnabled: true,
    supplierPortalEnabled: false,
    documentVersionControl: true,
    changeOrderApproval: true
  }
};

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(defaultGlobalSettings);

  useEffect(() => {
    const saved = localStorage.getItem('lateralEngineering_globalSettings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultGlobalSettings, ...parsedSettings });
      } catch (error) {
        console.error('Error loading global settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<GlobalSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('lateralEngineering_globalSettings', JSON.stringify(updatedSettings));
  };

  const resetToDefaults = () => {
    setSettings(defaultGlobalSettings);
    localStorage.setItem('lateralEngineering_globalSettings', JSON.stringify(defaultGlobalSettings));
  };

  return {
    settings,
    updateSettings,
    resetToDefaults
  };
}

export type { GlobalSettings };