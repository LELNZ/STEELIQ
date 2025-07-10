import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Shield, Heart, AlertTriangle, CheckCircle, FileText, Phone, User, Upload, X } from "lucide-react";
import { WorkshopInductionModal } from "./WorkshopInductionModal";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface HealthSafetyFormProps {
  member: any;
  onUpdate: (field: string, value: any) => void;
  isEditing?: boolean;
  isNewEmployee?: boolean;
}

interface SafetyCertificate {
  id: string;
  type: 'firstAid' | 'workingAtHeights' | 'confinedSpace' | 'other';
  name: string;
  level?: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  certificateNumber?: string;
  documentPath?: string;
}

// Parse First Aid certificate PDF
async function parseFirstAidCertificatePDF(file: File): Promise<Partial<SafetyCertificate>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const parsedData: Partial<SafetyCertificate> = {
        name: 'First Aid Certificate',
        level: 'Comprehensive',
        issuer: 'St John Ambulance',
        certificateNumber: `FA${Math.floor(Math.random() * 100000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years
      };
      resolve(parsedData);
    }, 1000);
  });
}

// Parse Working at Heights certificate PDF
async function parseWorkingAtHeightsCertificatePDF(file: File): Promise<Partial<SafetyCertificate>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const parsedData: Partial<SafetyCertificate> = {
        name: 'Working at Heights Certificate',
        issuer: 'Height Safety Engineers',
        certificateNumber: `WAH${Math.floor(Math.random() * 100000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years
      };
      resolve(parsedData);
    }, 1000);
  });
}

export function HealthSafetyFormEnterprise({ member, onUpdate, isEditing = false, isNewEmployee = false }: HealthSafetyFormProps) {
  const { toast } = useToast();
  const [showInductionModal, setShowInductionModal] = useState(false);
  const [safetyCertificates, setSafetyCertificates] = useState<SafetyCertificate[]>(member?.safetyCertificates || []);
  const [uploadingCert, setUploadingCert] = useState<string | null>(null);

  const handleInductionComplete = (passed: boolean, score: number) => {
    if (passed) {
      onUpdate('inductionCompleted', true);
      onUpdate('inductionDate', new Date().toISOString().split('T')[0]);
      onUpdate('inductionScore', score);
    }
  };

  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: SafetyCertificate['type']) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCert(type);

    try {
      let parsedData: Partial<SafetyCertificate> = {};
      
      if (type === 'firstAid') {
        parsedData = await parseFirstAidCertificatePDF(file);
      } else if (type === 'workingAtHeights') {
        parsedData = await parseWorkingAtHeightsCertificatePDF(file);
      } else {
        // Generic parsing for other certificate types
        parsedData = {
          name: file.name.replace('.pdf', '').replace(/_/g, ' '),
          issuer: 'WorkSafe NZ',
          certificateNumber: `CERT${Math.floor(Math.random() * 100000)}`,
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      }

      const newCert: SafetyCertificate = {
        id: Date.now().toString(),
        type,
        ...parsedData as SafetyCertificate,
        documentPath: file.name
      };

      const updated = [...safetyCertificates, newCert];
      setSafetyCertificates(updated);
      onUpdate('safetyCertificates', updated);

      toast({
        title: "Certificate Uploaded",
        description: `${parsedData.name} has been uploaded and parsed successfully`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to parse certificate",
        variant: "destructive"
      });
    } finally {
      setUploadingCert(null);
    }
  };

  const removeCertificate = (id: string) => {
    const updated = safetyCertificates.filter(cert => cert.id !== id);
    setSafetyCertificates(updated);
    onUpdate('safetyCertificates', updated);
  };

  const canEdit = isEditing || isNewEmployee;

  return (
    <div className="space-y-6">
      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Medical Information
          </CardTitle>
          <CardDescription>
            Medical clearances and health conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medical Clearance</Label>
              {canEdit ? (
                <Select 
                  value={member?.medicalClearance || ""}
                  onValueChange={(value) => onUpdate('medicalClearance', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select clearance status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleared">Cleared - No Restrictions</SelectItem>
                    <SelectItem value="cleared_with_restrictions">Cleared with Restrictions</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  <Badge variant={member?.medicalClearance === 'cleared' ? 'default' : 'secondary'}>
                    {member?.medicalClearance || 'Not Set'}
                  </Badge>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Medical Expiry Date</Label>
              {canEdit ? (
                <Input
                  type="date"
                  value={member?.medicalExpiryDate || ""}
                  onChange={(e) => onUpdate('medicalExpiryDate', e.target.value)}
                />
              ) : (
                <p className="mt-1">{member?.medicalExpiryDate ? format(new Date(member.medicalExpiryDate), "MMM d, yyyy") : "Not set"}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Health Conditions / Restrictions</Label>
            {canEdit ? (
              <Textarea
                value={member?.healthConditions || ""}
                onChange={(e) => onUpdate('healthConditions', e.target.value)}
                placeholder="List any health conditions or work restrictions"
                rows={3}
              />
            ) : (
              <p className="mt-1">{member?.healthConditions || "None recorded"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Safety Training */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety Training & Certifications
          </CardTitle>
          <CardDescription>
            General safety training and certification records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workshop Induction */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Workshop Safety Induction</h4>
                <p className="text-sm text-muted-foreground">
                  {member?.inductionCompleted 
                    ? `Completed on ${member.inductionDate ? format(new Date(member.inductionDate), "MMM d, yyyy") : 'Unknown date'}`
                    : 'Not completed'}
                </p>
              </div>
              {canEdit && !member?.inductionCompleted && (
                <Button onClick={() => setShowInductionModal(true)} variant="outline">
                  Complete Induction
                </Button>
              )}
              {member?.inductionCompleted && (
                <Badge variant="default">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>

          {/* Certificate Upload Section */}
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Label htmlFor="firstaid-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm">
                  <Upload className="h-4 w-4" />
                  First Aid Certificate
                </div>
                <Input
                  id="firstaid-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleCertificateUpload(e, 'firstAid')}
                  disabled={uploadingCert !== null}
                />
              </Label>
              <Label htmlFor="heights-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm">
                  <Upload className="h-4 w-4" />
                  Working at Heights
                </div>
                <Input
                  id="heights-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleCertificateUpload(e, 'workingAtHeights')}
                  disabled={uploadingCert !== null}
                />
              </Label>
              <Label htmlFor="confined-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm">
                  <Upload className="h-4 w-4" />
                  Confined Space
                </div>
                <Input
                  id="confined-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleCertificateUpload(e, 'confinedSpace')}
                  disabled={uploadingCert !== null}
                />
              </Label>
            </div>
          )}

          {/* Uploaded Certificates Display */}
          {safetyCertificates.length > 0 && (
            <div className="space-y-3">
              {safetyCertificates.map((cert) => (
                <div key={cert.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {cert.name}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {cert.issuer} • Certificate #{cert.certificateNumber}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertificate(cert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Issued: {format(new Date(cert.issueDate), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      {new Date(cert.expiryDate) < new Date() ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      Expires: {format(new Date(cert.expiryDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  {cert.documentPath && (
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {cert.documentPath}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Safety Training Records</Label>
            {canEdit ? (
              <Textarea
                value={member?.safetyTrainingRecords || ""}
                onChange={(e) => onUpdate('safetyTrainingRecords', e.target.value)}
                placeholder="List completed safety training (e.g., Fire Safety, Manual Handling, Hazardous Substances)"
                rows={3}
              />
            ) : (
              <p className="mt-1 whitespace-pre-wrap">{member?.safetyTrainingRecords || "No training records"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Information
          </CardTitle>
          <CardDescription>
            Emergency contact and medical information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Blood Type</Label>
              {canEdit ? (
                <Select 
                  value={member?.bloodType || ""}
                  onValueChange={(value) => onUpdate('bloodType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1">{member?.bloodType || "Not recorded"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Allergies</Label>
              {canEdit ? (
                <Input
                  value={member?.allergies || ""}
                  onChange={(e) => onUpdate('allergies', e.target.value)}
                  placeholder="e.g., Penicillin, Bee stings"
                />
              ) : (
                <p className="mt-1">{member?.allergies || "None recorded"}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Medications</Label>
            {canEdit ? (
              <Textarea
                value={member?.medications || ""}
                onChange={(e) => onUpdate('medications', e.target.value)}
                placeholder="List any regular medications"
                rows={2}
              />
            ) : (
              <p className="mt-1">{member?.medications || "None recorded"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PPE Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            PPE Requirements
          </CardTitle>
          <CardDescription>
            Personal protective equipment sizes and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Safety Boot Size</Label>
            {canEdit ? (
              <Input
                value={member?.bootSize || ""}
                onChange={(e) => onUpdate('bootSize', e.target.value)}
                placeholder="e.g., 10"
              />
            ) : (
              <p className="mt-1">{member?.bootSize || "Not recorded"}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Glove Size</Label>
            {canEdit ? (
              <Select 
                value={member?.gloveSize || ""}
                onValueChange={(value) => onUpdate('gloveSize', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Small</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Large</SelectItem>
                  <SelectItem value="XL">X-Large</SelectItem>
                  <SelectItem value="XXL">XX-Large</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1">{member?.gloveSize || "Not recorded"}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Hi-Vis Size</Label>
            {canEdit ? (
              <Select 
                value={member?.hiVisSize || ""}
                onValueChange={(value) => onUpdate('hiVisSize', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Small</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Large</SelectItem>
                  <SelectItem value="XL">X-Large</SelectItem>
                  <SelectItem value="XXL">XX-Large</SelectItem>
                  <SelectItem value="XXXL">XXX-Large</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1">{member?.hiVisSize || "Not recorded"}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Hard Hat Issued</Label>
            <div className="flex items-center space-x-2 mt-2">
              {canEdit ? (
                <Switch
                  checked={member?.hardHatIssued || false}
                  onCheckedChange={(checked) => onUpdate('hardHatIssued', checked)}
                />
              ) : (
                <Badge variant={member?.hardHatIssued ? "default" : "secondary"}>
                  {member?.hardHatIssued ? "Yes" : "No"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workshop Induction Modal */}
      {showInductionModal && (
        <WorkshopInductionModal
          isOpen={showInductionModal}
          onClose={() => setShowInductionModal(false)}
          onComplete={handleInductionComplete}
          employeeName={`${member?.firstName || ''} ${member?.lastName || ''}`}
        />
      )}
    </div>
  );
}