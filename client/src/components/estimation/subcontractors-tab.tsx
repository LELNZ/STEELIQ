import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Phone, Mail, Calendar, DollarSign, Shield, FileText, Edit, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubcontractorCost {
  id: string;
  contractor: string;
  service: string;
  description: string;
  quotedAmount: number;
  markup: number;
  totalCost: number;
  startDate?: Date;
  endDate?: Date;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  paymentTerms?: string;
  insurance?: boolean;
  safetyDocs?: boolean;
  notes?: string;
}

interface SubcontractorsTabProps {
  subcontractors: SubcontractorCost[];
  setSubcontractors: (subcontractors: SubcontractorCost[]) => void;
}

const COMMON_SERVICES = [
  "Steel Erection",
  "Concrete Works",
  "Painting & Coating",
  "Electrical Installation",
  "Plumbing & Drainage",
  "Crane Hire",
  "Transport & Logistics",
  "Scaffolding",
  "Site Preparation",
  "Welding Services",
  "NDT Testing",
  "Galvanizing",
  "Engineering & Design",
  "Other"
];

export function SubcontractorsTab({ subcontractors, setSubcontractors }: SubcontractorsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SubcontractorCost>>({
    contractor: "",
    service: "",
    description: "",
    quotedAmount: 0,
    markup: 15, // Default 15% markup
    insurance: false,
    safetyDocs: false,
    paymentTerms: "30 days",
  });
  
  const { toast } = useToast();

  const handleAdd = () => {
    if (!formData.contractor || !formData.service || !formData.quotedAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in contractor name, service, and quoted amount",
        variant: "destructive"
      });
      return;
    }

    const newSubcontractor: SubcontractorCost = {
      id: Date.now().toString(),
      contractor: formData.contractor,
      service: formData.service,
      description: formData.description || "",
      quotedAmount: formData.quotedAmount || 0,
      markup: formData.markup || 15,
      totalCost: (formData.quotedAmount || 0) * (1 + (formData.markup || 15) / 100),
      startDate: formData.startDate,
      endDate: formData.endDate,
      contactPerson: formData.contactPerson,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail,
      paymentTerms: formData.paymentTerms || "30 days",
      insurance: formData.insurance || false,
      safetyDocs: formData.safetyDocs || false,
      notes: formData.notes
    };

    if (editingId) {
      setSubcontractors(subcontractors.map(s => s.id === editingId ? newSubcontractor : s));
      setEditingId(null);
    } else {
      setSubcontractors([...subcontractors, newSubcontractor]);
    }

    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (subcontractor: SubcontractorCost) => {
    setFormData(subcontractor);
    setEditingId(subcontractor.id);
    setShowAddDialog(true);
  };

  const handleRemove = (id: string) => {
    setSubcontractors((subcontractors || []).filter(s => s.id !== id));
  };

  const updateMarkup = (id: string, markup: number) => {
    setSubcontractors((subcontractors || []).map(s => {
      if (s.id === id) {
        const totalCost = s.quotedAmount * (1 + markup / 100);
        return { ...s, markup, totalCost };
      }
      return s;
    }));
  };

  const resetForm = () => {
    setFormData({
      contractor: "",
      service: "",
      description: "",
      quotedAmount: 0,
      markup: 15,
      insurance: false,
      safetyDocs: false,
      paymentTerms: "30 days",
    });
  };

  const totalCost = (subcontractors || []).reduce((sum, s) => sum + s.totalCost, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Subcontractors
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Subcontract Cost</p>
                <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcontractor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!subcontractors || subcontractors.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subcontractors added yet</p>
              <p className="text-sm mt-2">Add subcontractors to include their costs in the estimate</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quoted Amount</TableHead>
                  <TableHead>Markup %</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontractors.map((subcontractor) => (
                  <TableRow key={subcontractor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subcontractor.contractor}</p>
                        {subcontractor.contactPerson && (
                          <p className="text-sm text-muted-foreground">{subcontractor.contactPerson}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{subcontractor.service}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{subcontractor.description}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono">${subcontractor.quotedAmount.toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={subcontractor.markup}
                        onChange={(e) => updateMarkup(subcontractor.id, parseFloat(e.target.value) || 0)}
                        className="w-20"
                        min="0"
                        step="0.5"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">${subcontractor.totalCost.toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {subcontractor.insurance && (
                          <Badge variant="success" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Insured
                          </Badge>
                        )}
                        {subcontractor.safetyDocs && (
                          <Badge variant="success" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Safety
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subcontractor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(subcontractor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Subcontractor" : "Add Subcontractor"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractor">Contractor Name</Label>
                <Input
                  id="contractor"
                  value={formData.contractor}
                  onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                  placeholder="ABC Construction Ltd"
                />
              </div>
              <div>
                <Label htmlFor="service">Service Type</Label>
                <select
                  id="service"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select service...</option>
                  {COMMON_SERVICES.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Work Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of work to be performed..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quotedAmount">Quoted Amount ($)</Label>
                <Input
                  id="quotedAmount"
                  type="number"
                  value={formData.quotedAmount}
                  onChange={(e) => setFormData({ ...formData, quotedAmount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              <div>
                <Label htmlFor="markup">Markup %</Label>
                <Input
                  id="markup"
                  type="number"
                  value={formData.markup}
                  onChange={(e) => setFormData({ ...formData, markup: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <Label>Total Cost</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {((formData.quotedAmount || 0) * (1 + (formData.markup || 0) / 100)).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="0274 123 456"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="30 days"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insurance"
                  checked={formData.insurance}
                  onCheckedChange={(checked) => setFormData({ ...formData, insurance: !!checked })}
                />
                <Label htmlFor="insurance" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="h-4 w-4" />
                  Insurance Certificate Provided
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="safetyDocs"
                  checked={formData.safetyDocs}
                  onCheckedChange={(checked) => setFormData({ ...formData, safetyDocs: !!checked })}
                />
                <Label htmlFor="safetyDocs" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Safety Documentation Complete
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
              setEditingId(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              {editingId ? "Update" : "Add"} Subcontractor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}