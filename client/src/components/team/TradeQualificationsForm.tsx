import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Award, Wrench, Shield, Calendar, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TradeQualificationsFormProps {
  member: any;
  onUpdate: (field: string, value: any) => void;
  isEditing?: boolean;
  isNewEmployee?: boolean;
}

interface WeldingCertificate {
  id: string;
  name: string;
  certificateNumber: string;
  process: string;
  positions: string[];
  materials: string;
  thickness: string;
  pipeRange?: string;
  transferMode?: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  documentPath?: string;
  parsedData?: {
    processes?: string;
    transferModes?: string;
    materialGroups?: string;
    weldDetails?: string;
    layers?: string;
  };
}

interface TradeLicense {
  id: string;
  name: string;
  licenseNumber: string;
  category: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  documentPath?: string;
}

interface EquipmentCertificate {
  id: string;
  equipmentType: string;
  certNumber: string;
  maxCapacity?: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  documentPath?: string;
}

// Welding positions as per AS/NZS standards
const WELDING_POSITIONS = [
  { value: "1G", label: "1G - Flat" },
  { value: "2G", label: "2G - Horizontal" },
  { value: "3G", label: "3G - Vertical" },
  { value: "4G", label: "4G - Overhead" },
  { value: "5G", label: "5G - Pipe Fixed Horizontal" },
  { value: "6G", label: "6G - Pipe Fixed 45°" },
  { value: "ALL", label: "All Positions" }
];

const WELDING_PROCESSES = [
  { value: "GMAW", label: "GMAW (MIG)" },
  { value: "GTAW", label: "GTAW (TIG)" },
  { value: "SMAW", label: "SMAW (Stick)" },
  { value: "FCAW", label: "FCAW (Flux Core)" },
  { value: "SAW", label: "SAW (Submerged Arc)" }
];

const EQUIPMENT_TYPES = [
  "Forklift",
  "Overhead Crane",
  "Mobile Crane",
  "Elevated Work Platform (EWP)",
  "Scissor Lift",
  "Boom Lift",
  "Telehandler",
  "Excavator",
  "Front End Loader"
];

// Simulate PDF parsing for welding qualifications
async function parseWeldingCertificatePDF(file: File): Promise<Partial<WeldingCertificate>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Extract data based on X-Ray Laboratories certificate format
      const parsedData: Partial<WeldingCertificate> = {
        name: file.name.replace('.pdf', '').replace(/_/g, ' '),
        process: 'GMAW',
        positions: ['1G', '2G', '3G'],
        materials: 'Carbon Steel (AS/NZS 3678-250)',
        thickness: '3mm - unlimited',
        pipeRange: '≥75mm diameter',
        transferMode: 'Spray/Pulse',
        certificateNumber: '16211-B',
        issuer: 'X-Ray Laboratories Ltd',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        parsedData: {
          processes: '135/138 GMAW with solid or metal cored electrode',
          transferModes: 'All transfer modes (dip, spray, pulse)',
          materialGroups: 'FM1/FM2 - Carbon & low alloy steels',
          weldDetails: 'Single & multi-layer, with/without backing',
          layers: 'Root, fill, and cap passes'
        }
      };
      
      resolve(parsedData);
    }, 1000);
  });
}

// Simulate PDF parsing for other certificates
async function parseCertificatePDF(file: File, type: 'trade' | 'equipment'): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (type === 'trade') {
        resolve({
          name: file.name.replace('.pdf', '').replace(/_/g, ' '),
          licenseNumber: `NZ${Math.floor(Math.random() * 100000)}`,
          category: 'Electrical',
          issuer: 'Electrical Workers Registration Board',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      } else {
        resolve({
          equipmentType: 'Forklift',
          certNumber: `F${Math.floor(Math.random() * 10000)}`,
          maxCapacity: '3000kg',
          issuer: 'WorkSafe NZ Approved',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
    }, 1000);
  });
}

export function TradeQualificationsForm({ member, onUpdate, isEditing = false, isNewEmployee = false }: TradeQualificationsFormProps) {
  const { toast } = useToast();
  const canEdit = isEditing || isNewEmployee;

  const [weldingCerts, setWeldingCerts] = useState<WeldingCertificate[]>(member?.weldingCertificates || []);
  const [tradeLicenses, setTradeLicenses] = useState<TradeLicense[]>(member?.tradeLicenses || []);
  const [equipmentCerts, setEquipmentCerts] = useState<EquipmentCertificate[]>(member?.equipmentCertificates || []);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'welding' | 'trade' | 'equipment', itemId?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFor(itemId || 'new');

    try {
      if (type === 'welding') {
        const parsedData = await parseWeldingCertificatePDF(file);
        
        if (itemId) {
          // Update existing
          const updated = weldingCerts.map(cert => 
            cert.id === itemId ? { ...cert, ...parsedData, documentPath: file.name } : cert
          );
          setWeldingCerts(updated);
          onUpdate('weldingCertificates', updated);
        } else {
          // Add new
          const newCert: WeldingCertificate = {
            id: Date.now().toString(),
            ...parsedData as WeldingCertificate,
            documentPath: file.name
          };
          const updated = [...weldingCerts, newCert];
          setWeldingCerts(updated);
          onUpdate('weldingCertificates', updated);
        }

        toast({
          title: "Welding Certificate Parsed",
          description: "Certificate details extracted successfully",
          variant: "default"
        });
      } else if (type === 'trade') {
        const parsedData = await parseCertificatePDF(file, 'trade');
        
        if (itemId) {
          const updated = tradeLicenses.map(license => 
            license.id === itemId ? { ...license, ...parsedData, documentPath: file.name } : license
          );
          setTradeLicenses(updated);
          onUpdate('tradeLicenses', updated);
        } else {
          const newLicense: TradeLicense = {
            id: Date.now().toString(),
            ...parsedData,
            documentPath: file.name
          };
          const updated = [...tradeLicenses, newLicense];
          setTradeLicenses(updated);
          onUpdate('tradeLicenses', updated);
        }

        toast({
          title: "Trade License Uploaded",
          description: "License details extracted successfully",
          variant: "default"
        });
      } else {
        const parsedData = await parseCertificatePDF(file, 'equipment');
        
        if (itemId) {
          const updated = equipmentCerts.map(cert => 
            cert.id === itemId ? { ...cert, ...parsedData, documentPath: file.name } : cert
          );
          setEquipmentCerts(updated);
          onUpdate('equipmentCertificates', updated);
        } else {
          const newCert: EquipmentCertificate = {
            id: Date.now().toString(),
            ...parsedData,
            documentPath: file.name
          };
          const updated = [...equipmentCerts, newCert];
          setEquipmentCerts(updated);
          onUpdate('equipmentCertificates', updated);
        }

        toast({
          title: "Equipment Certificate Uploaded",
          description: "Certificate details extracted successfully",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to parse certificate",
        variant: "destructive"
      });
    } finally {
      setUploadingFor(null);
    }
  };

  const removeCertificate = (type: 'welding' | 'trade' | 'equipment', id: string) => {
    if (type === 'welding') {
      const updated = weldingCerts.filter(cert => cert.id !== id);
      setWeldingCerts(updated);
      onUpdate('weldingCertificates', updated);
    } else if (type === 'trade') {
      const updated = tradeLicenses.filter(license => license.id !== id);
      setTradeLicenses(updated);
      onUpdate('tradeLicenses', updated);
    } else {
      const updated = equipmentCerts.filter(cert => cert.id !== id);
      setEquipmentCerts(updated);
      onUpdate('equipmentCertificates', updated);
    }
  };

  return (
    <Tabs defaultValue="welding" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="welding">Welding Certifications</TabsTrigger>
        <TabsTrigger value="trade">Trade Licenses</TabsTrigger>
        <TabsTrigger value="equipment">Equipment Operator</TabsTrigger>
        <TabsTrigger value="professional">Professional Registration</TabsTrigger>
      </TabsList>

      {/* Welding Certifications */}
      <TabsContent value="welding" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Welding Certifications
            </CardTitle>
            <CardDescription>
              Upload welding qualification certificates for automatic parsing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Label htmlFor="welding-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Upload Certificate
                  </div>
                  <Input
                    id="welding-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'welding')}
                    disabled={uploadingFor !== null}
                  />
                </Label>
              </div>
            )}

            {weldingCerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No welding certifications uploaded
              </div>
            ) : (
              <div className="space-y-4">
                {weldingCerts.map((cert) => (
                  <div key={cert.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          {cert.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Certificate: {cert.certificateNumber} | Issuer: {cert.issuer}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertificate('welding', cert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Process:</span> {cert.process}
                      </div>
                      <div>
                        <span className="font-medium">Positions:</span> {cert.positions.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Materials:</span> {cert.materials}
                      </div>
                      <div>
                        <span className="font-medium">Thickness:</span> {cert.thickness}
                      </div>
                      {cert.pipeRange && (
                        <div>
                          <span className="font-medium">Pipe Range:</span> {cert.pipeRange}
                        </div>
                      )}
                      {cert.transferMode && (
                        <div>
                          <span className="font-medium">Transfer Mode:</span> {cert.transferMode}
                        </div>
                      )}
                    </div>

                    {cert.parsedData && (
                      <div className="bg-muted/50 rounded p-3 space-y-2 text-sm">
                        <h5 className="font-medium">Range of Qualification:</h5>
                        <ul className="space-y-1 text-muted-foreground">
                          {cert.parsedData.processes && <li>• Processes: {cert.parsedData.processes}</li>}
                          {cert.parsedData.transferModes && <li>• Transfer Modes: {cert.parsedData.transferModes}</li>}
                          {cert.parsedData.materialGroups && <li>• Material Groups: {cert.parsedData.materialGroups}</li>}
                          {cert.parsedData.weldDetails && <li>• Weld Details: {cert.parsedData.weldDetails}</li>}
                          {cert.parsedData.layers && <li>• Layers: {cert.parsedData.layers}</li>}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Issued: {format(new Date(cert.issueDate), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          {new Date(cert.expiryDate) < new Date() ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          Expires: {format(new Date(cert.expiryDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      {cert.documentPath && (
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          {cert.documentPath}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Trade Licenses */}
      <TabsContent value="trade" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Trade Licenses
            </CardTitle>
            <CardDescription>
              Professional trade licenses and registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Label htmlFor="trade-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Upload License
                  </div>
                  <Input
                    id="trade-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'trade')}
                    disabled={uploadingFor !== null}
                  />
                </Label>
              </div>
            )}

            {tradeLicenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trade licenses uploaded
              </div>
            ) : (
              <div className="space-y-4">
                {tradeLicenses.map((license) => (
                  <div key={license.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{license.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          License #: {license.licenseNumber} | Category: {license.category}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertificate('trade', license.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Issuer: {license.issuer}</span>
                      <div className="flex items-center gap-4">
                        <span>Issued: {format(new Date(license.issueDate), "MMM d, yyyy")}</span>
                        <span className="flex items-center gap-1">
                          {new Date(license.expiryDate) < new Date() ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          Expires: {format(new Date(license.expiryDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Equipment Operator Certificates */}
      <TabsContent value="equipment" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Equipment Operator Certificates
            </CardTitle>
            <CardDescription>
              Certified to operate specific equipment and machinery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Label htmlFor="equipment-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Upload Certificate
                  </div>
                  <Input
                    id="equipment-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'equipment')}
                    disabled={uploadingFor !== null}
                  />
                </Label>
              </div>
            )}

            {equipmentCerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No equipment certificates uploaded
              </div>
            ) : (
              <div className="space-y-4">
                {equipmentCerts.map((cert) => (
                  <div key={cert.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{cert.equipmentType}</h4>
                        <p className="text-sm text-muted-foreground">
                          Certificate #: {cert.certNumber}
                          {cert.maxCapacity && ` | Max Capacity: ${cert.maxCapacity}`}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertificate('equipment', cert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Issuer: {cert.issuer}</span>
                      <div className="flex items-center gap-4">
                        <span>Issued: {format(new Date(cert.issueDate), "MMM d, yyyy")}</span>
                        <span className="flex items-center gap-1">
                          {new Date(cert.expiryDate) < new Date() ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          Expires: {format(new Date(cert.expiryDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Professional Registration */}
      <TabsContent value="professional" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Professional Registration
            </CardTitle>
            <CardDescription>
              Engineering and professional body registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Professional Engineer (CPEng)</Label>
                {canEdit ? (
                  <Input
                    value={member?.cpengNumber || ""}
                    onChange={(e) => onUpdate('cpengNumber', e.target.value)}
                    placeholder="CPEng number"
                  />
                ) : (
                  <p className="mt-1">{member?.cpengNumber || "Not registered"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Chartered Member (CMEngNZ)</Label>
                {canEdit ? (
                  <Input
                    value={member?.cmengNumber || ""}
                    onChange={(e) => onUpdate('cmengNumber', e.target.value)}
                    placeholder="CMEngNZ number"
                  />
                ) : (
                  <p className="mt-1">{member?.cmengNumber || "Not registered"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>IPENZ Member Number</Label>
                {canEdit ? (
                  <Input
                    value={member?.ipenzNumber || ""}
                    onChange={(e) => onUpdate('ipenzNumber', e.target.value)}
                    placeholder="IPENZ number"
                  />
                ) : (
                  <p className="mt-1">{member?.ipenzNumber || "Not a member"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Other Professional Bodies</Label>
                {canEdit ? (
                  <Input
                    value={member?.otherProfessional || ""}
                    onChange={(e) => onUpdate('otherProfessional', e.target.value)}
                    placeholder="e.g., HERA, SCNZ"
                  />
                ) : (
                  <p className="mt-1">{member?.otherProfessional || "None"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}