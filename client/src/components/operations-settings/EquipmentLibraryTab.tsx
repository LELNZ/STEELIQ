import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { EquipmentLibrary } from "@shared/schema";

export function EquipmentLibraryTab() {
  const [equipment, setEquipment] = useState<EquipmentLibrary[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentLibrary[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentLibrary | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    equipment_type: "cutting",
    model: "",
    manufacturer: "",
    ownership: "owned",
    hourly_rate: 0,
    setup_time_minutes: 0,
    power_kw: 0,
    max_capacity: {},
    maintenance_interval_hours: 0,
    location: "workshop",
    automation_level: "manual",
    operator_required: true,
    consumables_list: [],
    notes: "",
    is_active: true
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchTerm, filterType]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/operations/equipment-library");
      if (!response.ok) throw new Error("Failed to fetch equipment");
      const data = await response.json();
      setEquipment(data);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast({
        title: "Error",
        description: "Failed to fetch equipment library",
        variant: "destructive"
      });
    }
  };

  const filterEquipment = () => {
    let filtered = [...equipment];
    
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== "all") {
      filtered = filtered.filter(e => e.equipment_type === filterType);
    }
    
    setFilteredEquipment(filtered);
  };

  const handleSubmit = async () => {
    try {
      const url = editingEquipment 
        ? `/api/operations/equipment-library/${editingEquipment.id}`
        : "/api/operations/equipment-library";
      
      const method = editingEquipment ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      if (!response.ok) throw new Error("Failed to save equipment");
      
      toast({
        title: "Success",
        description: `Equipment ${editingEquipment ? "updated" : "created"} successfully`
      });
      
      fetchEquipment();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving equipment:", error);
      toast({
        title: "Error",
        description: "Failed to save equipment",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;
    
    try {
      const response = await fetch(`/api/operations/equipment-library/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) throw new Error("Failed to delete equipment");
      
      toast({
        title: "Success",
        description: "Equipment deleted successfully"
      });
      
      fetchEquipment();
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast({
        title: "Error",
        description: "Failed to delete equipment",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (equipment: EquipmentLibrary) => {
    setEditingEquipment(equipment);
    setForm({
      name: equipment.name,
      equipment_type: equipment.equipment_type,
      model: equipment.model || "",
      manufacturer: equipment.manufacturer || "",
      ownership: equipment.ownership || "owned",
      hourly_rate: parseFloat(equipment.hourly_rate || "0"),
      setup_time_minutes: parseFloat(equipment.setup_time_minutes || "0"),
      power_kw: parseFloat(equipment.power_kw || "0"),
      max_capacity: equipment.max_capacity || {},
      maintenance_interval_hours: equipment.maintenance_interval_hours || 0,
      location: equipment.location || "workshop",
      automation_level: equipment.automation_level || "manual",
      operator_required: equipment.operator_required ?? true,
      consumables_list: equipment.consumables_list || [],
      notes: equipment.notes || "",
      is_active: equipment.is_active ?? true
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEquipment(null);
    setForm({
      name: "",
      equipment_type: "cutting",
      model: "",
      manufacturer: "",
      ownership: "owned",
      hourly_rate: 0,
      setup_time_minutes: 0,
      power_kw: 0,
      max_capacity: {},
      maintenance_interval_hours: 0,
      location: "workshop",
      automation_level: "manual",
      operator_required: true,
      consumables_list: [],
      notes: "",
      is_active: true
    });
  };

  const getOwnershipBadgeColor = (ownership: string) => {
    switch (ownership) {
      case "owned": return "default";
      case "leased": return "secondary";
      case "rental": return "outline";
      default: return "default";
    }
  };

  const getAutomationBadgeColor = (level: string) => {
    switch (level) {
      case "manual": return "outline";
      case "semi_auto": return "secondary";
      case "full_auto": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="cutting">Cutting</SelectItem>
              <SelectItem value="welding">Welding</SelectItem>
              <SelectItem value="drilling">Drilling</SelectItem>
              <SelectItem value="grinding">Grinding</SelectItem>
              <SelectItem value="material_handling">Material Handling</SelectItem>
              <SelectItem value="surface_treatment">Surface Treatment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Model/Manufacturer</TableHead>
            <TableHead>Ownership</TableHead>
            <TableHead>Hourly Rate</TableHead>
            <TableHead>Automation</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEquipment.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.equipment_type}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {item.model && <div>{item.model}</div>}
                  {item.manufacturer && <div className="text-muted-foreground">{item.manufacturer}</div>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getOwnershipBadgeColor(item.ownership || "owned")}>
                  {item.ownership || "owned"}
                </Badge>
              </TableCell>
              <TableCell>${item.hourly_rate}/hr</TableCell>
              <TableCell>
                <Badge variant={getAutomationBadgeColor(item.automation_level || "manual")}>
                  {item.automation_level || "manual"}
                </Badge>
              </TableCell>
              <TableCell>{item.location || "workshop"}</TableCell>
              <TableCell>
                {item.is_active ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
            <DialogDescription>
              Manage your equipment inventory and hourly rates
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Equipment Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Bandsaw Heavy"
                />
              </div>
              <div>
                <Label htmlFor="equipment_type">Type *</Label>
                <Select 
                  value={form.equipment_type} 
                  onValueChange={(value) => setForm({ ...form, equipment_type: value })}
                >
                  <SelectTrigger id="equipment_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cutting">Cutting</SelectItem>
                    <SelectItem value="welding">Welding</SelectItem>
                    <SelectItem value="drilling">Drilling</SelectItem>
                    <SelectItem value="grinding">Grinding</SelectItem>
                    <SelectItem value="material_handling">Material Handling</SelectItem>
                    <SelectItem value="surface_treatment">Surface Treatment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g., HBS-1018W"
                />
              </div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  placeholder="e.g., Baileigh Industrial"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ownership">Ownership</Label>
                <Select 
                  value={form.ownership} 
                  onValueChange={(value) => setForm({ ...form, ownership: value })}
                >
                  <SelectTrigger id="ownership">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="leased">Leased</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Select 
                  value={form.location} 
                  onValueChange={(value) => setForm({ ...form, location: value })}
                >
                  <SelectTrigger id="location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="automation_level">Automation Level</Label>
                <Select 
                  value={form.automation_level} 
                  onValueChange={(value) => setForm({ ...form, automation_level: value })}
                >
                  <SelectTrigger id="automation_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="semi_auto">Semi-Automatic</SelectItem>
                    <SelectItem value="full_auto">Fully Automatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate ($) *</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="setup_time">Setup Time (minutes)</Label>
                <Input
                  id="setup_time"
                  type="number"
                  value={form.setup_time_minutes}
                  onChange={(e) => setForm({ ...form, setup_time_minutes: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="power_kw">Power (kW)</Label>
                <Input
                  id="power_kw"
                  type="number"
                  step="0.1"
                  value={form.power_kw}
                  onChange={(e) => setForm({ ...form, power_kw: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes about this equipment..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="operator_required"
                  checked={form.operator_required}
                  onCheckedChange={(checked) => setForm({ ...form, operator_required: checked })}
                />
                <Label htmlFor="operator_required">Operator Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingEquipment ? "Update" : "Create"} Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}