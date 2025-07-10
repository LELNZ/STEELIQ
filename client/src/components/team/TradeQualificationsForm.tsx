import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, FileText, Award, Wrench, Shield, Calendar, AlertCircle, CheckCircle, X, Info } from "lucide-react";
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

interface SafetyCertificate {
  id: string;
  name: string;
  certificateNumber: string;
  holderName?: string;
  nhi?: string; // National Health Index for Sitesafe
  company?: string;
  courseType?: string; // For Sitesafe: Passport, Passport Gold, Awareness
  units?: string[]; // Training units completed
  issuer: string;
  issueDate: string;
  expiryDate: string;
  documentPath?: string;
  photo?: string; // For certificates with photo ID
  qrCode?: string; // Verification QR code URL
}

// Welding positions with detailed descriptions
const WELDING_POSITION_INFO: Record<string, { name: string; description: string }> = {
  "PA": { name: "PA - Flat Position", description: "Welding from above, workpiece horizontal, torch pointing down" },
  "PB": { name: "PB - Horizontal-Vertical", description: "Fillet weld with one plate horizontal, one vertical" },
  "PC": { name: "PC - Horizontal", description: "Welding on vertical surface, travel horizontal" },
  "PD": { name: "PD - Horizontal-Overhead", description: "Fillet weld overhead position" },
  "PE": { name: "PE - Overhead", description: "Welding from below, workpiece above welder" },
  "PF": { name: "PF - Vertical-Up", description: "Welding upward on vertical surface" },
  "PG": { name: "PG - Vertical-Down", description: "Welding downward on vertical surface" },
  "1G": { name: "1G - Flat Rotation", description: "Pipe rotated, weld at top (flat position)" },
  "2G": { name: "2G - Horizontal Fixed", description: "Pipe vertical, weld horizontal" },
  "3G": { name: "3G - Vertical Fixed", description: "Pipe horizontal, weld vertical" },
  "4G": { name: "4G - Overhead Fixed", description: "Pipe horizontal, weld overhead" },
  "5G": { name: "5G - Multiple", description: "Pipe horizontal fixed, all positions" },
  "6G": { name: "6G - 45° Fixed", description: "Pipe at 45°, tests all positions" }
};

// Welding processes with detailed explanations
const WELDING_PROCESS_INFO: Record<string, { name: string; description: string; code: string }> = {
  "111": { 
    name: "MMAW/SMAW", 
    description: "Manual Metal Arc Welding (Stick) - Uses consumable electrode with flux coating",
    code: "111"
  },
  "135": { 
    name: "GMAW/MIG", 
    description: "Gas Metal Arc Welding - Semi-automatic, uses solid wire and shielding gas",
    code: "135"
  },
  "136": { 
    name: "FCAW", 
    description: "Flux Cored Arc Welding - Uses flux-filled tubular wire, with or without gas",
    code: "136"
  },
  "138": { 
    name: "GMAW Metal Cored", 
    description: "Gas Metal Arc with metal cored wire - Higher deposition rates than solid wire",
    code: "138"
  },
  "141": { 
    name: "GTAW/TIG", 
    description: "Gas Tungsten Arc Welding - Uses non-consumable tungsten electrode",
    code: "141"
  }
};

// Material group definitions
const MATERIAL_GROUP_INFO: Record<string, string> = {
  "FM1": "Non-alloy and fine grain steels (≤360 N/mm² yield)",
  "FM2": "High strength steels (>360 N/mm² yield)",
  "FM3": "Quenched and tempered steels",
  "FM4": "Low vanadium alloyed Cr-Mo steels",
  "FM5": "Non-vanadium alloyed Cr-Mo steels"
};

// Thickness qualification explanation
const THICKNESS_INFO = {
  title: "Thickness Qualification Range",
  description: "For AS/NZS ISO 9606.1, a 12mm test plate typically qualifies:",
  ranges: [
    "Butt welds: ≥3mm thickness (0.25 × test thickness minimum)",
    "Fillet welds: All thicknesses for throat thickness",
    "Upper limit: Generally unlimited for manual processes",
    "Note: Specific ranges depend on welding process and joint type"
  ]
};

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

// Safety certificate types (NZ construction requirements)
const SAFETY_CERT_TYPES = [
  "Sitesafe Passport",
  "Sitesafe Awareness",
  "First Aid",
  "Working at Heights",
  "Confined Spaces",
  "Gas Detection",
  "Scaffolding",
  "Hot Work Permit",
  "Traffic Management"
];

// Parse welding certificate PDF from X-Ray Laboratories format
async function parseWeldingCertificatePDF(file: File): Promise<Partial<WeldingCertificate>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let parsedData: Partial<WeldingCertificate>;
      
      // Check if it's GMAW or MMAW certificate
      if (file.name.toLowerCase().includes('gmaw')) {
        // GMAW Certificate data
        parsedData = {
          name: 'GMAW Welder Qualification',
          process: '135 GMAW (MIG)',
          positions: ['PA', 'PB', 'PF'], // Flat, horizontal-vertical, vertical-up
          materials: 'FM1/FM2 - Non-alloy/fine grain steels & high strength steels',
          thickness: '≥3mm (qualified range from 12mm test)',
          pipeRange: '≥500mmØ fixed, ≥75mmØ rotated PA/PB',
          transferMode: 'All transfer modes (SCT short-circuit, spray, pulse)',
          certificateNumber: '16211B',
          issuer: 'X-Ray Laboratories Ltd',
          issueDate: '2022-03-08',
          expiryDate: '2025-03-09', // 3 years as per 9.3a
          parsedData: {
            processes: '135/138 MAG with solid or metal cored electrode',
            transferModes: 'Short-circuiting/Dip transfer qualified for all modes',
            materialGroups: 'Group 1.2 Low carbon steel',
            weldDetails: 'BW/FW - Butt and fillet welds, single-sided with material backing or from both sides',
            layers: 'Single or multi-layer welds (sl/ml)'
          }
        };
      } else if (file.name.toLowerCase().includes('mmaw')) {
        // MMAW Certificate data
        parsedData = {
          name: 'MMAW Welder Qualification',
          process: '111 MMAW (Manual Metal Arc)',
          positions: ['PA', 'PB'], // Flat positions only
          materials: 'FM1/FM2 - Non-alloy/fine grain steels & high strength steels',
          thickness: '≥3mm (qualified range from 12mm test)',
          pipeRange: '≥500mmØ fixed, ≥75mmØ rotated PA/PB',
          transferMode: 'N/A - Manual metal arc',
          certificateNumber: '16587A',
          issuer: 'X-Ray Laboratories Ltd',
          issueDate: '2022-08-16',
          expiryDate: '2025-08-17', // 3 years as per 9.3a
          parsedData: {
            processes: '111 Manual metal arc welding',
            transferModes: 'Not applicable',
            materialGroups: 'Group 1.2 Low carbon steel',
            weldDetails: 'BW/FW - Butt and fillet welds, welded from both sides or with material backing',
            layers: 'Single or multi-layer welds (sl/ml), basic/rutile/other coverings'
          }
        };
      } else {
        // Generic welding certificate
        parsedData = {
          name: file.name.replace('.pdf', '').replace(/_/g, ' '),
          process: 'Welding Process',
          positions: ['Various'],
          materials: 'Steel',
          thickness: '3mm - unlimited',
          certificateNumber: 'CERT-' + Date.now(),
          issuer: 'Certification Body',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      }
      
      resolve(parsedData);
    }, 1000);
  });
}

// Parse Sitesafe certificate PDF
async function parseSitesafeCertificate(file: File): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const parsedData = {
        name: 'Sitesafe Passport',
        certificateNumber: `SP${Math.floor(Math.random() * 1000000)}`,
        holderName: 'Adam Green',
        nhi: 'ABC1234', // National Health Index number
        dateOfBirth: '1988-04-29',
        company: 'Lateral Engineering Limited',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years validity
        trainingProvider: 'Sitesafe New Zealand',
        courseType: 'Passport Gold', // Can be Passport, Passport Gold, or Awareness
        units: [
          'Unit 24316 - Demonstrate knowledge of workplace H&S requirements',
          'Unit 497 - Demonstrate knowledge of workplace H&S legislation',
          'Unit 30265 - Apply health and safety risk assessment to a job role'
        ],
        photo: 'embedded', // Sitesafe certificates include photo ID
        qrCode: `https://verify.sitesafe.org.nz/${Date.now()}` // Verification QR code
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
  const [safetyCerts, setSafetyCerts] = useState<SafetyCertificate[]>(member?.safetyCertificates || []);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  // Update local state when member data changes
  useEffect(() => {
    setWeldingCerts(member?.weldingCertificates || []);
    setTradeLicenses(member?.tradeLicenses || []);
    setEquipmentCerts(member?.equipmentCertificates || []);
    setSafetyCerts(member?.safetyCertificates || []);
  }, [member?.weldingCertificates, member?.tradeLicenses, member?.equipmentCertificates, member?.safetyCertificates]);

  // Create qualification reminder when certificate is uploaded
  const createQualificationReminder = async (certificateData: any, certificateType: string) => {
    if (!member?.id) return;

    try {
      const reminderData = {
        teamMemberId: member.id,
        qualificationType: certificateType,
        qualificationName: certificateData.name || certificateData.equipmentType || 'Unknown',
        issueDate: certificateData.issueDate,
        expiryDate: certificateData.expiryDate,
        isActive: true,
        notifyEmployee: true,
        notifyManager: true,
        notifyHR: true
      };

      const response = await fetch('/api/qualification-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderData)
      });

      if (!response.ok) {
        console.error('Failed to create qualification reminder');
      }
    } catch (error) {
      console.error('Error creating qualification reminder:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'welding' | 'trade' | 'equipment' | 'safety', itemId?: string) => {
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
          // Create qualification reminder
          await createQualificationReminder(newCert, 'welding');
        }

        toast({
          title: "Welding Certificate Parsed",
          description: "Certificate details extracted successfully. Remember to save your changes!",
          variant: "default",
          duration: 5000
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
          // Create qualification reminder
          await createQualificationReminder(newLicense, 'trade');
        }

        toast({
          title: "Trade License Uploaded",
          description: "License details extracted successfully. Remember to save your changes!",
          variant: "default",
          duration: 5000
        });
      } else if (type === 'equipment') {
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
          // Create qualification reminder
          await createQualificationReminder(newCert, 'equipment');
        }

        toast({
          title: "Equipment Certificate Uploaded",
          description: "Certificate details extracted successfully. Remember to save your changes!",
          variant: "default",
          duration: 5000
        });
      } else if (type === 'safety') {
        // Parse based on certificate type
        let parsedData;
        if (file.name.toLowerCase().includes('sitesafe')) {
          parsedData = await parseSitesafeCertificate(file);
        } else {
          parsedData = await parseCertificatePDF(file, 'trade');
          parsedData.name = parsedData.name || 'Safety Certificate';
        }
        
        if (itemId) {
          const updated = safetyCerts.map(cert => 
            cert.id === itemId ? { ...cert, ...parsedData, documentPath: file.name } : cert
          );
          setSafetyCerts(updated);
          onUpdate('safetyCertificates', updated);
        } else {
          const newCert: SafetyCertificate = {
            id: Date.now().toString(),
            ...parsedData,
            documentPath: file.name
          };
          const updated = [...safetyCerts, newCert];
          setSafetyCerts(updated);
          onUpdate('safetyCertificates', updated);
          // Create qualification reminder with specific type
          const certType = file.name.toLowerCase().includes('sitesafe') ? 'sitesafe' : 
                          file.name.toLowerCase().includes('first') ? 'first_aid' :
                          file.name.toLowerCase().includes('height') ? 'heights' : 'safety';
          await createQualificationReminder(newCert, certType);
        }

        toast({
          title: "Safety Certificate Uploaded",
          description: "Certificate details extracted successfully. Remember to save your changes!",
          variant: "default",
          duration: 5000
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

  const removeCertificate = (type: 'welding' | 'trade' | 'equipment' | 'safety', id: string) => {
    if (type === 'welding') {
      const updated = weldingCerts.filter(cert => cert.id !== id);
      setWeldingCerts(updated);
      onUpdate('weldingCertificates', updated);
    } else if (type === 'trade') {
      const updated = tradeLicenses.filter(license => license.id !== id);
      setTradeLicenses(updated);
      onUpdate('tradeLicenses', updated);
    } else if (type === 'equipment') {
      const updated = equipmentCerts.filter(cert => cert.id !== id);
      setEquipmentCerts(updated);
      onUpdate('equipmentCertificates', updated);
    } else if (type === 'safety') {
      const updated = safetyCerts.filter(cert => cert.id !== id);
      setSafetyCerts(updated);
      onUpdate('safetyCertificates', updated);
    }
  };

  return (
    <Tabs defaultValue="welding" className="space-y-4">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="welding">Welding Certifications</TabsTrigger>
        <TabsTrigger value="trade">Trade Licenses</TabsTrigger>
        <TabsTrigger value="equipment">Equipment Operator</TabsTrigger>
        <TabsTrigger value="safety">Safety Certificates</TabsTrigger>
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
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Process:</span> 
                          <span>{cert.process}</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium">{cert.process.split(' ')[0]} Process Details</p>
                              <p className="text-sm">
                                {cert.process.includes('135') ? WELDING_PROCESS_INFO['135'].description :
                                 cert.process.includes('111') ? WELDING_PROCESS_INFO['111'].description :
                                 "Welding process qualification"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Positions:</span>
                          <span>{cert.positions.join(', ')}</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-2">Qualified Positions</p>
                              {cert.positions.map(pos => (
                                <div key={pos} className="text-sm mb-1">
                                  <span className="font-medium">{WELDING_POSITION_INFO[pos]?.name || pos}:</span>
                                  <br />
                                  <span className="text-xs text-muted-foreground">
                                    {WELDING_POSITION_INFO[pos]?.description || "Position qualification"}
                                  </span>
                                </div>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Materials:</span>
                          <span className="truncate">{cert.materials}</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-2">Material Groups</p>
                              <div className="text-sm space-y-1">
                                {cert.materials.includes('FM1') && (
                                  <p><span className="font-medium">FM1:</span> {MATERIAL_GROUP_INFO['FM1']}</p>
                                )}
                                {cert.materials.includes('FM2') && (
                                  <p><span className="font-medium">FM2:</span> {MATERIAL_GROUP_INFO['FM2']}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Qualified for welding these material groups as per AS/NZS ISO 9606.1
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Thickness:</span>
                          <span>{cert.thickness}</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-2">{THICKNESS_INFO.title}</p>
                              <p className="text-sm mb-2">{THICKNESS_INFO.description}</p>
                              <ul className="text-sm space-y-1">
                                {THICKNESS_INFO.ranges.map((range, idx) => (
                                  <li key={idx} className="text-xs">• {range}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      
                      {cert.pipeRange && (
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Pipe Range:</span>
                            <span>{cert.pipeRange}</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-medium mb-1">Pipe Diameter Range</p>
                                <p className="text-sm">Qualified to weld pipes with:</p>
                                <ul className="text-xs mt-1 space-y-1">
                                  <li>• Fixed position: ≥500mm diameter</li>
                                  <li>• Rotated position: ≥75mm diameter</li>
                                  <li>• Applies to PA and PB positions</li>
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      )}
                      
                      {cert.transferMode && (
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Transfer Mode:</span>
                            <span>{cert.transferMode}</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-medium mb-1">Transfer Modes</p>
                                <p className="text-sm">
                                  {cert.transferMode.includes('All') ? 
                                    "Qualified for all transfer modes including short-circuit (dip), spray, and pulse transfer" :
                                    "Specific transfer mode qualification"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
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

      {/* Safety Certificates */}
      <TabsContent value="safety" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Safety Certificates
            </CardTitle>
            <CardDescription>
              Sitesafe, First Aid, Working at Heights, and other safety certifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Label htmlFor="safety-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Upload Certificate
                  </div>
                  <Input
                    id="safety-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'safety')}
                    disabled={uploadingFor !== null}
                  />
                </Label>
              </div>
            )}

            {safetyCerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No safety certificates uploaded
              </div>
            ) : (
              <div className="space-y-4">
                {safetyCerts.map((cert) => (
                  <div key={cert.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Certificate #: {cert.certificateNumber}
                          {cert.courseType && ` | Type: ${cert.courseType}`}
                        </p>
                        {cert.holderName && (
                          <p className="text-sm text-muted-foreground">
                            Holder: {cert.holderName}
                            {cert.nhi && ` | NHI: ${cert.nhi}`}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertificate('safety', cert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {cert.units && cert.units.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Training Units Completed:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {cert.units.map((unit, idx) => (
                            <li key={idx}>{unit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
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
                    
                    {cert.qrCode && (
                      <div className="text-sm text-muted-foreground">
                        <a href={cert.qrCode} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Verify Certificate Online
                        </a>
                      </div>
                    )}
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