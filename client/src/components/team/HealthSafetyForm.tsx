import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Upload, X, Plus, Shield, Heart, HardHat, Car, GraduationCap, FileText, AlertTriangle, CheckCircle } from "lucide-react";

// NZ Driver's License Classes
const NZ_LICENSE_CLASSES = [
  { value: "1", label: "Class 1 - Car" },
  { value: "2", label: "Class 2 - Medium Rigid Vehicle (bus or truck 6,000-18,000kg)" },
  { value: "3", label: "Class 3 - Medium Combination Vehicle (truck & trailer 12,000-25,000kg)" },
  { value: "4", label: "Class 4 - Heavy Rigid Vehicle (bus or truck 18,000+kg)" },
  { value: "5", label: "Class 5 - Heavy Combination Vehicle (truck & trailer 25,000+kg)" },
  { value: "6", label: "Class 6 - Motorcycle" }
];

// Welding Qualification Types
const WELDING_TYPES = [
  { value: "MIG", label: "MIG (Metal Inert Gas)" },
  { value: "TIG", label: "TIG (Tungsten Inert Gas)" },
  { value: "MMA", label: "MMA (Manual Metal Arc)" },
  { value: "SAW", label: "SAW (Submerged Arc Welding)" },
  { value: "FCAW", label: "FCAW (Flux Core Arc Welding)" }
];

// Welding Positions
const WELDING_POSITIONS = [
  { value: "1G", label: "1G - Flat position" },
  { value: "2G", label: "2G - Horizontal position" },
  { value: "3G", label: "3G - Vertical position" },
  { value: "4G", label: "4G - Overhead position" },
  { value: "5G", label: "5G - Horizontal fixed pipe" },
  { value: "6G", label: "6G - Inclined fixed pipe" },
  { value: "ALL", label: "All Positions" }
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
}

interface HealthSafetyFormProps {
  member: any;
  onUpdate: (field: string, value: any) => void;
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
                value={cert.name}
                onChange={(e) => onCertUpdate({ ...cert, name: e.target.value })}
                placeholder="e.g., CPR & AED"
                className="h-7 text-sm"
              />
            </div>
            
            {levelOptions && (
              <div>
                <Label className="text-xs">Level/Type</Label>
                <Select value={cert.level} onValueChange={(value) => onCertUpdate({ ...cert, level: value })}>
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
                value={cert.supplier}
                onChange={(e) => onCertUpdate({ ...cert, supplier: e.target.value })}
                placeholder="e.g., St John Ambulance"
                className="h-7 text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={cert.expiryDate}
                onChange={(e) => onCertUpdate({ ...cert, expiryDate: e.target.value })}
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
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          // In a real implementation, this would upload to server
                          // For now, we'll store the file name
                          onCertUpdate({ 
                            ...cert, 
                            documentPath: `documents/${cert.type}/${file.name}` 
                          });
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
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
            <div className="mt-2">
              <Label className="text-xs">Qualified Positions</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {WELDING_POSITIONS.slice(0, 6).map((position) => (
                  <div key={position.value} className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={cert.positions?.includes(position.value) || false}
                      onChange={(e) => {
                        const positions = cert.positions || [];
                        if (e.target.checked) {
                          onCertUpdate({ ...cert, positions: [...positions, position.value] });
                        } else {
                          onCertUpdate({ ...cert, positions: positions.filter((p: string) => p !== position.value) });
                        }
                      }}
                      className="rounded"
                    />
                    <Label className="text-xs">{position.value}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-2">
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
              <div className="flex items-center space-x-2 mb-2">
                <Switch
                  checked={member?.inductionCompleted || false}
                  onCheckedChange={(checked) => onUpdate('inductionCompleted', checked)}
                />
                <Label className="text-sm font-medium">Site Induction</Label>
              </div>
              <Input
                type="date"
                value={member?.inductionDate ? new Date(member.inductionDate).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('inductionDate', e.target.value)}
                className="h-8"
              />
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
                  levelOptions={WELDING_TYPES}
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
    </div>
  );
}