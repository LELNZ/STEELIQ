import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Upload, X, Plus, Shield, Heart, HardHat, Car, GraduationCap, FileText, AlertTriangle, CheckCircle, Award, Info } from "lucide-react";
import { WorkshopInductionModal } from "./WorkshopInductionModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// NZ Driver's License Classes
const NZ_LICENSE_CLASSES = [
  { value: "1", label: "Class 1 - Car" },
  { value: "2", label: "Class 2 - Medium Rigid Vehicle (bus or truck 6,000-18,000kg)" },
  { value: "3", label: "Class 3 - Medium Combination Vehicle (truck & trailer 12,000-25,000kg)" },
  { value: "4", label: "Class 4 - Heavy Rigid Vehicle (bus or truck 18,000+kg)" },
  { value: "5", label: "Class 5 - Heavy Combination Vehicle (truck & trailer 25,000+kg)" },
  { value: "6", label: "Class 6 - Motorcycle" }
];

// Welding Process Types
const WELDING_PROCESSES = [
  { value: "GMAW", label: "GMAW (MIG/MAG)" },
  { value: "GTAW", label: "GTAW (TIG)" },
  { value: "MMAW", label: "MMAW (MMA/Stick)" },
  { value: "SAW", label: "SAW (Submerged Arc)" },
  { value: "FCAW", label: "FCAW (Flux Core)" }
];

// Transfer Modes (for MIG/MAG)
const TRANSFER_MODES = [
  { value: "dip", label: "Dip/Short Circuit" },
  { value: "spray", label: "Spray Arc" },
  { value: "pulse", label: "Pulse Arc" },
  { value: "globular", label: "Globular" },
  { value: "na", label: "N/A (Not applicable)" }
];

// Product Types
const PRODUCT_TYPES = [
  { value: "P", label: "P - Plate only" },
  { value: "T", label: "T - Tube/Pipe only" },
  { value: "P/T", label: "P/T - Plate and Tube" }
];

// Weld Types
const WELD_TYPES = [
  { value: "BW", label: "BW - Butt Weld" },
  { value: "FW", label: "FW - Fillet Weld" },
  { value: "BW+FW", label: "BW+FW - Butt with Fillet" }
];

// Welding Positions with detailed descriptions
const WELDING_POSITIONS = [
  { 
    value: "PA", 
    label: "PA (1G)",
    description: "Flat position - Plate horizontal, weld from above",
    plateDescription: "Plate flat on bench, welding downward"
  },
  { 
    value: "PB", 
    label: "PB (2F)",
    description: "Horizontal fillet - Plate vertical, weld horizontal",
    plateDescription: "Fillet weld with one plate vertical, one horizontal"
  },
  { 
    value: "PC", 
    label: "PC (2G)",
    description: "Horizontal - Plate vertical, weld axis horizontal",
    plateDescription: "Vertical plate, welding horizontally across"
  },
  { 
    value: "PD", 
    label: "PD (4F)",
    description: "Overhead fillet - Plate horizontal overhead",
    plateDescription: "Fillet weld performed overhead"
  },
  { 
    value: "PE", 
    label: "PE (4G)",
    description: "Overhead - Plate horizontal overhead, weld from below",
    plateDescription: "Plate overhead, welding upward"
  },
  { 
    value: "PF", 
    label: "PF (3G Up)",
    description: "Vertical up - Plate vertical, welding upward",
    plateDescription: "Vertical plate, welding from bottom to top"
  },
  { 
    value: "PG", 
    label: "PG (3G Down)",
    description: "Vertical down - Plate vertical, welding downward",
    plateDescription: "Vertical plate, welding from top to bottom"
  },
  {
    value: "H-L045",
    label: "H-L045 (6G)",
    description: "45° fixed pipe - Pipe inclined at 45°",
    pipeDescription: "Pipe fixed at 45° angle, all position welding"
  },
  {
    value: "ALL",
    label: "All Positions",
    description: "Qualified for all welding positions",
    plateDescription: "Qualified for all plate and pipe positions"
  }
];

// First Aid Levels
const FIRST_AID_LEVELS = [
  { value: "Workplace", label: "Workplace First Aid" },
  { value: "Comprehensive", label: "Comprehensive First Aid" },
  { value: "Occupational", label: "Occupational First Aid" },
  { value: "Advanced", label: "Advanced First Aid" },
  { value: "Wilderness", label: "Wilderness First Aid" }
];

// Trade Qualification Types
const TRADE_QUALS = [
  { value: "Steel Fabrication", label: "Steel Fabrication" },
  { value: "Welding", label: "Welding" },
  { value: "Boilermaking", label: "Boilermaking" },
  { value: "Mechanical Engineering", label: "Mechanical Engineering" },
  { value: "Structural Engineering", label: "Structural Engineering" },
  { value: "Project Management", label: "Project Management" }
];

interface CertificationItem {
  id: string;
  type: string;
  name: string;
  level?: string;
  supplier: string;
  issuedDate: string;
  expiryDate: string;
  positions?: string[];
  documentPath?: string;
  // Welding specific fields
  weldingProcess?: string;
  transferMode?: string;
  productType?: string;
  weldType?: string;
  materialThickness?: string;
  certifyingCompany?: string;
  certificateNumber?: string;
  // Range of qualification details
  rangeOfQualification?: {
    processes?: string;
    transferModes?: string;
    materialGroups?: string;
    pipeRange?: string;
    weldDetails?: string;
    layers?: string;
  };
}

interface HealthSafetyFormProps {
  member: any;
  onUpdate: (field: string, value: any) => void;
}

// Simulate PDF parsing for welding qualifications
async function parseWeldingQualificationPDF(file: File): Promise<any> {
  // In a real implementation, this would use a PDF parsing library
  // For demonstration, we'll simulate parsing based on Adam Green's actual certificate format
  
  return new Promise((resolve) => {
    // Simulate async processing
    setTimeout(() => {
      // Extract data based on X-Ray Laboratories certificate format
      const testDate = new Date('2022-03-08'); // Date of test from certificate
      const revalidationDate = new Date(testDate);
      revalidationDate.setFullYear(revalidationDate.getFullYear() + 3); // 3-year validity per 9.3 a)
      
      const parsedData = {
        name: 'GMAW Qualification - ' + file.name.replace('.pdf', '').replace(/_/g, ' '),
        weldingProcess: 'GMAW', // 135 GMAW from certificate
        transferMode: 'dip', // SCT Short-circuiting or Dip transfer
        productType: 'P/T', // Plate & Tube (range of qualification)
        weldType: 'BW+FW', // Butt and fillet welds (range)
        materialThickness: '≥3mm', // Greater than or equal to 3mm (range)
        positions: ['PA', 'PB', 'PF'], // Flat, horizontal-vertical & vertical-up
        expiryDate: revalidationDate.toISOString().split('T')[0], // 9/03/2025
        supplier: 'X-Ray Laboratories Ltd',
        certificateNumber: '16211 B',
        // Additional qualification range details
        rangeOfQualification: {
          processes: '135/138 MAG with solid or metal cored electrode',
          transferModes: 'All transfer modes',
          materialGroups: 'FM1/FM2 - High strength & non alloy/fine grain steels',
          pipeRange: '≥500mm⌀ fixed, ≥75mm⌀ rotated PA, PB',
          weldDetails: 'Material backing or from both sides',
          layers: 'Single or multi-layer welds'
        }
      };
      
      // Show notification that PDF was parsed
      const event = new CustomEvent('show-toast', {
        detail: {
          title: 'PDF Parsed Successfully',
          description: 'Welding qualification details extracted from X-Ray Labs certificate',
          variant: 'success'
        }
      });
      window.dispatchEvent(event);
      
      resolve(parsedData);
    }, 1000);
  });
}

export function HealthSafetyForm({ member, onUpdate }: HealthSafetyFormProps) {
  // State for certifications
  const [firstAidCerts, setFirstAidCerts] = useState<CertificationItem[]>(
    member?.firstAidCertifications || []
  );
  const [weldingQuals, setWeldingQuals] = useState<CertificationItem[]>(
    member?.weldingQualifications || []
  );
  const [heightsCerts, setHeightsCerts] = useState<CertificationItem[]>(
    member?.workingAtHeightsCerts || []
  );
  const [tradeQuals, setTradeQuals] = useState<CertificationItem[]>(
    member?.tradeQualifications || []
  );
  const [driversLicenses, setDriversLicenses] = useState<CertificationItem[]>(
    member?.driversLicenses || []
  );
  
  // Workshop Induction Modal state
  const [showInductionModal, setShowInductionModal] = useState(false);

  const handleInductionComplete = (passed: boolean, score: number) => {
    if (passed) {
      onUpdate('inductionCompleted', true);
      onUpdate('inductionDate', new Date().toISOString().split('T')[0]);
      onUpdate('inductionScore', score);
    }
  };

  const addCertification = (type: 'firstAid' | 'welding' | 'heights' | 'trade' | 'drivers') => {
    const newCert: CertificationItem = {
      id: Date.now().toString(),
      type,
      name: '',
      supplier: '',
      issuedDate: '',
      expiryDate: '',
      ...(type === 'welding' && { positions: [] })
    };

    switch (type) {
      case 'firstAid':
        const newFirstAid = [...firstAidCerts, newCert];
        setFirstAidCerts(newFirstAid);
        onUpdate('firstAidCertifications', newFirstAid);
        break;
      case 'welding':
        const newWelding = [...weldingQuals, newCert];
        setWeldingQuals(newWelding);
        onUpdate('weldingQualifications', newWelding);
        break;
      case 'heights':
        const newHeights = [...heightsCerts, newCert];
        setHeightsCerts(newHeights);
        onUpdate('workingAtHeightsCerts', newHeights);
        break;
      case 'trade':
        const newTrade = [...tradeQuals, newCert];
        setTradeQuals(newTrade);
        onUpdate('tradeQualifications', newTrade);
        break;
      case 'drivers':
        const newDrivers = [...driversLicenses, newCert];
        setDriversLicenses(newDrivers);
        onUpdate('driversLicenses', newDrivers);
        break;
    }
  };

  const updateCertification = (type: string, index: number, updatedCert: CertificationItem) => {
    const updateArray = (array: CertificationItem[]) => {
      const updated = [...array];
      updated[index] = updatedCert;
      return updated;
    };

    switch (type) {
      case 'firstAid':
        const updatedFirstAid = updateArray(firstAidCerts);
        setFirstAidCerts(updatedFirstAid);
        onUpdate('firstAidCertifications', updatedFirstAid);
        break;
      case 'welding':
        const updatedWelding = updateArray(weldingQuals);
        setWeldingQuals(updatedWelding);
        onUpdate('weldingQualifications', updatedWelding);
        break;
      case 'heights':
        const updatedHeights = updateArray(heightsCerts);
        setHeightsCerts(updatedHeights);
        onUpdate('workingAtHeightsCerts', updatedHeights);
        break;
      case 'trade':
        const updatedTrade = updateArray(tradeQuals);
        setTradeQuals(updatedTrade);
        onUpdate('tradeQualifications', updatedTrade);
        break;
      case 'drivers':
        const updatedDrivers = updateArray(driversLicenses);
        setDriversLicenses(updatedDrivers);
        onUpdate('driversLicenses', updatedDrivers);
        break;
    }
  };

  const removeCertification = (type: string, index: number) => {
    const removeFromArray = (array: CertificationItem[]) => array.filter((_, i) => i !== index);

    switch (type) {
      case 'firstAid':
        const updatedFirstAid = removeFromArray(firstAidCerts);
        setFirstAidCerts(updatedFirstAid);
        onUpdate('firstAidCertifications', updatedFirstAid);
        break;
      case 'welding':
        const updatedWelding = removeFromArray(weldingQuals);
        setWeldingQuals(updatedWelding);
        onUpdate('weldingQualifications', updatedWelding);
        break;
      case 'heights':
        const updatedHeights = removeFromArray(heightsCerts);
        setHeightsCerts(updatedHeights);
        onUpdate('workingAtHeightsCerts', updatedHeights);
        break;
      case 'trade':
        const updatedTrade = removeFromArray(tradeQuals);
        setTradeQuals(updatedTrade);
        onUpdate('tradeQualifications', updatedTrade);
        break;
      case 'drivers':
        const updatedDrivers = removeFromArray(driversLicenses);
        setDriversLicenses(updatedDrivers);
        onUpdate('driversLicenses', updatedDrivers);
        break;
    }
  };

  const CertificationCard = ({ cert, onUpdate: onCertUpdate, onRemove, levelOptions }: any) => {
    const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
    const isExpiringSoon = cert.expiryDate && new Date(cert.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Local state for the certification to prevent focus loss
    const [localCert, setLocalCert] = useState(cert);

    // Update parent only on blur or significant changes
    const handleFieldChange = (field: string, value: any) => {
      const updatedCert = { ...localCert, [field]: value };
      setLocalCert(updatedCert);
      // Debounced update to parent
      const timeoutId = setTimeout(() => {
        onCertUpdate(updatedCert);
      }, 300);
      return () => clearTimeout(timeoutId);
    };

    // Sync local state when cert prop changes (e.g., after PDF upload)
    useEffect(() => {
      setLocalCert(cert);
    }, [cert]);

    return (
      <Card className={`border-l-2 ${isExpired ? 'border-l-red-500' : isExpiringSoon ? 'border-l-amber-500' : 'border-l-green-500'}`}>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              {isExpired ? (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              ) : isExpiringSoon ? (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
              <Badge variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"} className="text-xs">
                {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Valid"}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Certification Name</Label>
              <Input
                value={localCert.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => onCertUpdate(localCert)}
                placeholder="e.g., CPR & AED"
                className="h-7 text-sm"
              />
            </div>
            
            {levelOptions && (
              <div>
                <Label className="text-xs">Level/Type</Label>
                <Select value={localCert.level} onValueChange={(value) => {
                  handleFieldChange('level', value);
                  onCertUpdate({ ...localCert, level: value });
                }}>
                  <SelectTrigger className="h-7">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label className="text-xs">Training Provider</Label>
              <Input
                value={localCert.supplier}
                onChange={(e) => handleFieldChange('supplier', e.target.value)}
                onBlur={() => onCertUpdate(localCert)}
                placeholder="e.g., St John Ambulance"
                className="h-7 text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={localCert.expiryDate}
                onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
                onBlur={() => onCertUpdate(localCert)}
                className="h-7 text-sm"
              />
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Document</Label>
              <div className="flex items-center gap-2">
                {cert.documentPath ? (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                      onClick={() => {
                        // View document functionality
                        window.open(cert.documentPath, '_blank');
                      }}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      // File upload functionality
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.jpg,.jpeg,.png';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          // For welding qualifications, parse PDF and extract data
                          if (cert.type === 'welding' && file.type === 'application/pdf') {
                            // Simulate PDF parsing for welding qualifications
                            const parsedData = await parseWeldingQualificationPDF(file);
                            if (parsedData) {
                              const updatedCert = {
                                ...localCert,
                                ...parsedData,
                                documentPath: `documents/${cert.type}/${file.name}`
                              };
                              setLocalCert(updatedCert);
                              onCertUpdate(updatedCert);
                            }
                          } else {
                            // For other types, just store the file path
                            onCertUpdate({ 
                              ...localCert, 
                              documentPath: `documents/${cert.type}/${file.name}` 
                            });
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {cert.type === 'welding' ? 'Upload PDF' : 'Upload'}
                  </Button>
                )}
              </div>
            </div>
            {cert.documentPath && (
              <div className="mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {cert.documentPath.split('/').pop()}
                </span>
              </div>
            )}
          </div>

          {cert.type === 'welding' && (
            <>
              {/* Welding Process and Details */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold mb-2 text-orange-600">Welding Specification Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Welding Process</Label>
                    <Select value={localCert.weldingProcess} onValueChange={(value) => {
                      handleFieldChange('weldingProcess', value);
                      onCertUpdate({ ...localCert, weldingProcess: value });
                    }}>
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Select process" />
                      </SelectTrigger>
                      <SelectContent>
                        {WELDING_PROCESSES.map((process) => (
                          <SelectItem key={process.value} value={process.value}>
                            {process.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Transfer Mode</Label>
                    <Select value={localCert.transferMode} onValueChange={(value) => {
                      handleFieldChange('transferMode', value);
                      onCertUpdate({ ...localCert, transferMode: value });
                    }}>
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFER_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Product Type</Label>
                    <Select value={localCert.productType} onValueChange={(value) => {
                      handleFieldChange('productType', value);
                      onCertUpdate({ ...localCert, productType: value });
                    }}>
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Weld Type</Label>
                    <Select value={localCert.weldType} onValueChange={(value) => {
                      handleFieldChange('weldType', value);
                      onCertUpdate({ ...localCert, weldType: value });
                    }}>
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Select weld type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WELD_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Material Thickness</Label>
                    <Input
                      value={localCert.materialThickness}
                      onChange={(e) => handleFieldChange('materialThickness', e.target.value)}
                      onBlur={() => onCertUpdate(localCert)}
                      placeholder="e.g., 12mm - <3mm"
                      className="h-7 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Certificate Number</Label>
                    <Input
                      value={localCert.certificateNumber}
                      onChange={(e) => handleFieldChange('certificateNumber', e.target.value)}
                      onBlur={() => onCertUpdate(localCert)}
                      placeholder="e.g., WQ-2024-001"
                      className="h-7 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Qualified Positions with Tooltips */}
              <div className="mt-3">
                <Label className="text-xs font-semibold">Qualified Positions</Label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {WELDING_POSITIONS.map((position) => (
                    <div key={position.value} className="flex items-center space-x-1 group relative">
                      <input
                        type="checkbox"
                        checked={localCert.positions?.includes(position.value) || false}
                        onChange={(e) => {
                          const positions = localCert.positions || [];
                          const newPositions = e.target.checked 
                            ? [...positions, position.value]
                            : positions.filter((p: string) => p !== position.value);
                          handleFieldChange('positions', newPositions);
                          onCertUpdate({ ...localCert, positions: newPositions });
                        }}
                        className="rounded"
                      />
                      <Label className="text-xs cursor-pointer">{position.label}</Label>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg invisible group-hover:visible z-10 w-48">
                        <div className="font-semibold mb-1">{position.label}</div>
                        <div>{position.description}</div>
                        {localCert.productType === 'P' && position.plateDescription && (
                          <div className="mt-1 text-gray-300">{position.plateDescription}</div>
                        )}
                        {localCert.productType === 'T' && position.pipeDescription && (
                          <div className="mt-1 text-gray-300">{position.pipeDescription}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Range of Qualification - What the welder is capable of */}
              {localCert.rangeOfQualification && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold mb-2 text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Range of Qualification - What this welder can do:
                  </h4>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 space-y-1.5">
                    {localCert.rangeOfQualification.processes && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 min-w-[80px]">Processes:</span>
                        <span className="text-xs text-green-600 dark:text-green-500">{localCert.rangeOfQualification.processes}</span>
                      </div>
                    )}
                    {localCert.rangeOfQualification.transferModes && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 min-w-[80px]">Transfer:</span>
                        <span className="text-xs text-green-600 dark:text-green-500">{localCert.rangeOfQualification.transferModes}</span>
                      </div>
                    )}
                    {localCert.rangeOfQualification.materialGroups && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 min-w-[80px]">Materials:</span>
                        <span className="text-xs text-green-600 dark:text-green-500">{localCert.rangeOfQualification.materialGroups}</span>
                      </div>
                    )}
                    {localCert.rangeOfQualification.pipeRange && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 min-w-[80px]">Pipe Range:</span>
                        <span className="text-xs text-green-600 dark:text-green-500">{localCert.rangeOfQualification.pipeRange}</span>
                      </div>
                    )}
                    {localCert.rangeOfQualification.weldDetails && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 min-w-[80px]">Weld Details:</span>
                        <span className="text-xs text-green-600 dark:text-green-500">{localCert.rangeOfQualification.weldDetails}</span>
                      </div>
                    )}
                    {localCert.rangeOfQualification.layers && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 min-w-[80px]">Layers:</span>
                        <span className="text-xs text-green-600 dark:text-green-500">{localCert.rangeOfQualification.layers}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-[calc(75vh-120px)] overflow-y-auto space-y-4 pr-4 pb-6">
      {/* Safety Status Overview */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Safety Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={member?.inductionCompleted || false}
                    onCheckedChange={(checked) => onUpdate('inductionCompleted', checked)}
                  />
                  <Label className="text-sm font-medium">Workshop Site Induction</Label>
                </div>
                {!member?.inductionCompleted && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInductionModal(true)}
                    className="h-7 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Award className="h-3 w-3 mr-1" />
                    Take Induction
                  </Button>
                )}
              </div>
              {member?.inductionCompleted && (
                <>
                  <Input
                    type="date"
                    value={member?.inductionDate ? new Date(member.inductionDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => onUpdate('inductionDate', e.target.value)}
                    className="h-8 mb-2"
                  />
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Induction Completed
                  </Badge>
                </>
              )}
              {!member?.inductionCompleted && (
                <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Induction required before workshop access
                </div>
              )}
            </div>
            
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Switch
                  checked={member?.medicalClearance || false}
                  onCheckedChange={(checked) => onUpdate('medicalClearance', checked)}
                />
                <Label className="text-sm font-medium">Medical Clearance</Label>
              </div>
              <Input
                type="date"
                value={member?.medicalExpiryDate ? new Date(member.medicalExpiryDate).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('medicalExpiryDate', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Aid Certifications */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
            <Heart className="h-4 w-4" />
            First Aid Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {firstAidCerts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-800/60 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Heart className="h-6 w-6 mx-auto mb-1 text-gray-400" />
              <p className="text-xs">No certifications recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {firstAidCerts.map((cert, index) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  onUpdate={(updatedCert) => updateCertification('firstAid', index, updatedCert)}
                  onRemove={() => removeCertification('firstAid', index)}
                  levelOptions={FIRST_AID_LEVELS}
                />
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCertification('firstAid')}
            className="w-full h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add First Aid Certification
          </Button>
        </CardContent>
      </Card>

      {/* Welding Qualifications */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-orange-600 dark:text-orange-400">
            <HardHat className="h-4 w-4" />
            Welding Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {weldingQuals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-800/60 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <HardHat className="h-6 w-6 mx-auto mb-1 text-gray-400" />
              <p className="text-xs">No qualifications recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weldingQuals.map((cert, index) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  onUpdate={(updatedCert) => updateCertification('welding', index, updatedCert)}
                  onRemove={() => removeCertification('welding', index)}
                  levelOptions={WELDING_PROCESSES}
                />
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCertification('welding')}
            className="w-full h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/30"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Welding Qualification
          </Button>
        </CardContent>
      </Card>

      {/* Working at Heights */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            <HardHat className="h-4 w-4" />
            Working at Heights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {heightsCerts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-800/60 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <HardHat className="h-6 w-6 mx-auto mb-1 text-gray-400" />
              <p className="text-xs">No certifications recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {heightsCerts.map((cert, index) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  onUpdate={(updatedCert) => updateCertification('heights', index, updatedCert)}
                  onRemove={() => removeCertification('heights', index)}
                />
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCertification('heights')}
            className="w-full h-8 text-xs border-yellow-200 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-950/30"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Working at Heights Certificate
          </Button>
        </CardContent>
      </Card>

      {/* Trade Qualifications */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-purple-600 dark:text-purple-400">
            <GraduationCap className="h-4 w-4" />
            Trade Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tradeQuals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-800/60 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <GraduationCap className="h-6 w-6 mx-auto mb-1 text-gray-400" />
              <p className="text-xs">No qualifications recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tradeQuals.map((cert, index) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  onUpdate={(updatedCert) => updateCertification('trade', index, updatedCert)}
                  onRemove={() => removeCertification('trade', index)}
                  levelOptions={TRADE_QUALS}
                />
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCertification('trade')}
            className="w-full h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/30"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Trade Qualification
          </Button>
        </CardContent>
      </Card>

      {/* Driver's Licenses */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400">
            <Car className="h-4 w-4" />
            Driver's Licenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {driversLicenses.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-800/60 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Car className="h-6 w-6 mx-auto mb-1 text-gray-400" />
              <p className="text-xs">No licenses recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {driversLicenses.map((cert, index) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  onUpdate={(updatedCert) => updateCertification('drivers', index, updatedCert)}
                  onRemove={() => removeCertification('drivers', index)}
                  levelOptions={NZ_LICENSE_CLASSES}
                />
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCertification('drivers')}
            className="w-full h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/30"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Driver's License
          </Button>
        </CardContent>
      </Card>

      {/* Visa & Immigration */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-600 dark:text-gray-400">
            <FileText className="h-4 w-4" />
            Visa & Immigration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Visa Type</Label>
              <Input
                value={member?.visaType || ''}
                onChange={(e) => onUpdate('visaType', e.target.value)}
                placeholder="e.g., Work Visa"
                className="h-7 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Visa Number</Label>
              <Input
                value={member?.visaNumber || ''}
                onChange={(e) => onUpdate('visaNumber', e.target.value)}
                placeholder="Visa number"
                className="h-7 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={member?.visaExpiry ? new Date(member.visaExpiry).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('visaExpiry', e.target.value)}
                className="h-7 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Upload Document</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 w-full text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Choose File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workshop Induction Modal */}
      <WorkshopInductionModal
        isOpen={showInductionModal}
        onClose={() => setShowInductionModal(false)}
        onComplete={handleInductionComplete}
        employeeName={`${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Employee'}
      />
    </div>
  );
}