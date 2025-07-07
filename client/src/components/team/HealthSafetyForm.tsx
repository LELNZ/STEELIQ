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
import { Calendar, Upload, X, Plus, Shield, Heart, HardHat, Car, GraduationCap, FileText } from "lucide-react";

// NZ Driver's License Classes
const NZ_LICENSE_CLASSES = [
  { value: "1", label: "Class 1 - Motorcycle (≤50cc)" },
  { value: "6", label: "Class 6 - Motorcycle (>50cc)" },
  { value: "2", label: "Class 2 - Heavy vehicle" },
  { value: "3", label: "Class 3 - Heavy vehicle with trailer" },
  { value: "4", label: "Class 4 - Heavy vehicle with passengers" },
  { value: "5", label: "Class 5 - Heavy vehicle with dangerous goods" },
  { value: "1F", label: "Class 1F - Full car license" },
  { value: "1L", label: "Class 1L - Learner license" },
  { value: "1R", label: "Class 1R - Restricted license" }
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
  { value: "CPR", label: "CPR Only" },
  { value: "Advanced", label: "Advanced First Aid" }
];

interface CertificationItem {
  id: string;
  type: string;
  name: string;
  level?: string;
  positions?: string[];
  supplier: string;
  issuedDate: string;
  expiryDate: string;
  documentPath?: string;
}

interface HealthSafetyFormProps {
  member: any;
  onUpdate: (field: string, value: any) => void;
}

export function HealthSafetyForm({ member, onUpdate }: HealthSafetyFormProps) {
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

  const addCertification = (type: 'firstAid' | 'welding' | 'heights' | 'trade') => {
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
    }
  };

  const removeCertification = (type: 'firstAid' | 'welding' | 'heights' | 'trade', id: string) => {
    switch (type) {
      case 'firstAid':
        const updatedFirstAid = firstAidCerts.filter(cert => cert.id !== id);
        setFirstAidCerts(updatedFirstAid);
        onUpdate('firstAidCertifications', updatedFirstAid);
        break;
      case 'welding':
        const updatedWelding = weldingQuals.filter(cert => cert.id !== id);
        setWeldingQuals(updatedWelding);
        onUpdate('weldingQualifications', updatedWelding);
        break;
      case 'heights':
        const updatedHeights = heightsCerts.filter(cert => cert.id !== id);
        setHeightsCerts(updatedHeights);
        onUpdate('workingAtHeightsCerts', updatedHeights);
        break;
      case 'trade':
        const updatedTrade = tradeQuals.filter(cert => cert.id !== id);
        setTradeQuals(updatedTrade);
        onUpdate('tradeQualifications', updatedTrade);
        break;
    }
  };

  const updateCertification = (
    type: 'firstAid' | 'welding' | 'heights' | 'trade',
    id: string,
    field: string,
    value: any
  ) => {
    const updateArray = (certs: CertificationItem[]) =>
      certs.map(cert => cert.id === id ? { ...cert, [field]: value } : cert);

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
    }
  };

  const handleFileUpload = async (file: File, certType: string, certId: string) => {
    // Mock file upload - in production, this would upload to your file storage
    const fileName = `${certType}_${certId}_${file.name}`;
    const filePath = `/documents/team/${member?.employeeNumber}/${fileName}`;
    
    // Update the certification with the file path
    updateCertification(certType as any, certId, 'documentPath', filePath);
    
    console.log(`File uploaded: ${fileName} -> ${filePath}`);
  };

  return (
    <div className="space-y-6">
      {/* Basic Safety Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Basic Safety Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={member?.inductionCompleted || false}
                onCheckedChange={(checked) => onUpdate('inductionCompleted', checked)}
              />
              <Label>Site Induction Completed</Label>
            </div>
            <div>
              <Label>Induction Date</Label>
              <Input
                type="date"
                value={member?.inductionDate ? new Date(member.inductionDate).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('inductionDate', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={member?.medicalClearance || false}
                onCheckedChange={(checked) => onUpdate('medicalClearance', checked)}
              />
              <Label>Medical Clearance</Label>
            </div>
            <div>
              <Label>Medical Expiry Date</Label>
              <Input
                type="date"
                value={member?.medicalExpiryDate ? new Date(member.medicalExpiryDate).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('medicalExpiryDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Aid Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            First Aid Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {firstAidCerts.map((cert) => (
              <div key={cert.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <div>
                      <Label>Level</Label>
                      <Select
                        value={cert.level}
                        onValueChange={(value) => updateCertification('firstAid', cert.id, 'level', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIRST_AID_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Supplier/Provider</Label>
                      <Input
                        value={cert.supplier}
                        onChange={(e) => updateCertification('firstAid', cert.id, 'supplier', e.target.value)}
                        placeholder="Red Cross, St John, etc."
                      />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={cert.expiryDate}
                        onChange={(e) => updateCertification('firstAid', cert.id, 'expiryDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCertification('firstAid', cert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label>Upload Certificate</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'firstAid', cert.id);
                    }}
                  />
                  {cert.documentPath && (
                    <Badge variant="secondary" className="mt-1">
                      Document uploaded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addCertification('firstAid')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Aid Certification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Welding Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Welding Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weldingQuals.map((qual) => (
              <div key={qual.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <div>
                      <Label>Welding Type</Label>
                      <Select
                        value={qual.type}
                        onValueChange={(value) => updateCertification('welding', qual.id, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {WELDING_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Supplier/Certifying Body</Label>
                      <Input
                        value={qual.supplier}
                        onChange={(e) => updateCertification('welding', qual.id, 'supplier', e.target.value)}
                        placeholder="HERA, WTIA, etc."
                      />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={qual.expiryDate}
                        onChange={(e) => updateCertification('welding', qual.id, 'expiryDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCertification('welding', qual.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label>Qualified Positions</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {WELDING_POSITIONS.map(position => (
                      <Badge
                        key={position.value}
                        variant={qual.positions?.includes(position.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const positions = qual.positions || [];
                          const newPositions = positions.includes(position.value)
                            ? positions.filter(p => p !== position.value)
                            : [...positions, position.value];
                          updateCertification('welding', qual.id, 'positions', newPositions);
                        }}
                      >
                        {position.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Upload Certificate</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'welding', qual.id);
                    }}
                  />
                  {qual.documentPath && (
                    <Badge variant="secondary" className="mt-1">
                      Document uploaded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addCertification('welding')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Welding Qualification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Working at Heights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Working at Heights Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {heightsCerts.map((cert) => (
              <div key={cert.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <div>
                      <Label>Certificate Name</Label>
                      <Input
                        value={cert.name}
                        onChange={(e) => updateCertification('heights', cert.id, 'name', e.target.value)}
                        placeholder="Working at Heights"
                      />
                    </div>
                    <div>
                      <Label>Supplier/Provider</Label>
                      <Input
                        value={cert.supplier}
                        onChange={(e) => updateCertification('heights', cert.id, 'supplier', e.target.value)}
                        placeholder="Training provider"
                      />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={cert.expiryDate}
                        onChange={(e) => updateCertification('heights', cert.id, 'expiryDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCertification('heights', cert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label>Upload Certificate</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'heights', cert.id);
                    }}
                  />
                  {cert.documentPath && (
                    <Badge variant="secondary" className="mt-1">
                      Document uploaded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addCertification('heights')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Working at Heights Certificate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Driver's License */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Driver's License
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>License Class</Label>
              <Select
                value={member?.driversLicenseClass || ''}
                onValueChange={(value) => onUpdate('driversLicenseClass', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select license class" />
                </SelectTrigger>
                <SelectContent>
                  {NZ_LICENSE_CLASSES.map(license => (
                    <SelectItem key={license.value} value={license.value}>
                      {license.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={member?.driversLicenseExpiry ? new Date(member.driversLicenseExpiry).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('driversLicenseExpiry', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Upload License Document</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const fileName = `drivers_license_${member?.employeeNumber}_${file.name}`;
                  const filePath = `/documents/team/${member?.employeeNumber}/${fileName}`;
                  onUpdate('driversLicenseDocument', filePath);
                }
              }}
            />
            {member?.driversLicenseDocument && (
              <Badge variant="secondary" className="mt-1">
                Document uploaded
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trade Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Trade Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tradeQuals.map((qual) => (
              <div key={qual.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <div>
                      <Label>Qualification Name</Label>
                      <Input
                        value={qual.name}
                        onChange={(e) => updateCertification('trade', qual.id, 'name', e.target.value)}
                        placeholder="e.g. NZ Certificate in Engineering"
                      />
                    </div>
                    <div>
                      <Label>Institution/Provider</Label>
                      <Input
                        value={qual.supplier}
                        onChange={(e) => updateCertification('trade', qual.id, 'supplier', e.target.value)}
                        placeholder="NZQA, University, etc."
                      />
                    </div>
                    <div>
                      <Label>Date Achieved</Label>
                      <Input
                        type="date"
                        value={qual.issuedDate}
                        onChange={(e) => updateCertification('trade', qual.id, 'issuedDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCertification('trade', qual.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label>Upload Certificate</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'trade', qual.id);
                    }}
                  />
                  {qual.documentPath && (
                    <Badge variant="secondary" className="mt-1">
                      Document uploaded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addCertification('trade')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Trade Qualification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visa & Immigration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Visa & Immigration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Visa Type</Label>
              <Input
                value={member?.visaType || ''}
                onChange={(e) => onUpdate('visaType', e.target.value)}
                placeholder="Work Visa, Resident Visa, etc."
              />
            </div>
            <div>
              <Label>Visa Number</Label>
              <Input
                value={member?.visaNumber || ''}
                onChange={(e) => onUpdate('visaNumber', e.target.value)}
                placeholder="Visa number"
              />
            </div>
            <div>
              <Label>Visa Expiry</Label>
              <Input
                type="date"
                value={member?.visaExpiry ? new Date(member.visaExpiry).toISOString().split('T')[0] : ''}
                onChange={(e) => onUpdate('visaExpiry', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={member?.workEligibility || false}
                onCheckedChange={(checked) => onUpdate('workEligibility', checked)}
              />
              <Label>Eligible to Work in NZ</Label>
            </div>
          </div>
          <div>
            <Label>Upload Visa Document</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const fileName = `visa_${member?.employeeNumber}_${file.name}`;
                  const filePath = `/documents/team/${member?.employeeNumber}/${fileName}`;
                  onUpdate('visaDocument', filePath);
                }
              }}
            />
            {member?.visaDocument && (
              <Badge variant="secondary" className="mt-1">
                Document uploaded
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}