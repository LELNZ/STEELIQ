import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Building2, Users, Filter, Search, Download, Upload, Package, Droplets, Zap, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Material, Supplier } from "@shared/schema";

interface CoatingSystem {
  id: number;
  name: string;
  type: "paint" | "galvanizing" | "powder_coating" | "protective";
  category: "primer" | "topcoat" | "finish" | "protective";
  manufacturer?: string;
  productCode?: string;
  description?: string;
  coverage: number; // m2/L or m2/kg
  unitCost: number;
  unit: "L" | "kg" | "m2";
  dryTime?: number; // minutes
  coats: number;
  thickness?: number; // microns
  standard?: string;
  environment?: "interior" | "exterior" | "marine";
  isInhouse: boolean;
  supplier?: string;
  leadTime?: number;
  isActive: boolean;
}

interface EnhancedCoatingSystemsProps {
  materials: Material[];
  suppliers: Supplier[];
  onAddToJob?: (material: any, quantity: number) => void;
}

// Coating category structure
const COATING_CATEGORIES = {
  "Paint Systems": {
    subcategories: ["Primers", "Topcoats", "Undercoats", "Specialty Paints"],
    description: "Liquid paint coating systems",
    icon: Droplets,
    color: "bg-blue-500"
  },
  "Galvanizing": {
    subcategories: ["Hot Dip", "Electro", "Sherardizing", "Zinc Rich"],
    description: "Zinc coating processes",
    icon: Shield,
    color: "bg-zinc-500"
  },
  "Powder Coating": {
    subcategories: ["Epoxy", "Polyester", "Acrylic", "Hybrid"],
    description: "Dry powder coating systems",
    icon: Zap,
    color: "bg-purple-500"
  },
  "Protective Coatings": {
    subcategories: ["Marine", "Industrial", "Fire Protection", "Anti-Corrosion"],
    description: "Specialized protective systems",
    icon: Package,
    color: "bg-red-500"
  }
} as const;

export function EnhancedCoatingSystems({ materials, suppliers, onAddToJob }: EnhancedCoatingSystemsProps) {
  const [activeCategory, setActiveCategory] = useState<string>("Paint Systems");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSystem, setEditingSystem] = useState<CoatingSystem | null>(null);
  const { toast } = useToast();

  // Sample coating systems data
  const [coatingSystems] = useState<CoatingSystem[]>([
    {
      id: 1,
      name: "Epoxy Primer 2-Pack",
      type: "paint",
      category: "primer",
      manufacturer: "Dulux Protective Coatings",
      productCode: "EP2P-100",
      description: "High-build epoxy primer for structural steel",
      coverage: 8.5,
      unitCost: 45.20,
      unit: "L",
      dryTime: 240,
      coats: 1,
      thickness: 75,
      standard: "AS/NZS 2312",
      environment: "exterior",
      isInhouse: true,
      isActive: true
    },
    {
      id: 2,
      name: "Hot Dip Galvanizing",
      type: "galvanizing",
      category: "protective",
      description: "Hot dip galvanizing to AS/NZS 4680",
      coverage: 1.0,
      unitCost: 2.85,
      unit: "kg",
      coats: 1,
      thickness: 85,
      standard: "AS/NZS 4680",
      environment: "exterior",
      isInhouse: false,
      supplier: "Galvanizers Australia",
      leadTime: 14,
      isActive: true
    },
    {
      id: 3,
      name: "Polyester Powder Coat",
      type: "powder_coating",
      category: "finish",
      manufacturer: "AkzoNobel",
      productCode: "PC-200",
      description: "Durable polyester powder coating",
      coverage: 6.0,
      unitCost: 12.50,
      unit: "kg",
      dryTime: 20,
      coats: 1,
      thickness: 60,
      standard: "AS/NZS 4506",
      environment: "exterior",
      isInhouse: false,
      supplier: "Powder Solutions",
      leadTime: 7,
      isActive: true
    }
  ]);

  const defaultSystem: Omit<CoatingSystem, 'id'> = {
    name: "",
    type: "paint",
    category: "primer",
    manufacturer: "",
    productCode: "",
    description: "",
    coverage: 0,
    unitCost: 0,
    unit: "L",
    dryTime: 0,
    coats: 1,
    thickness: 0,
    standard: "",
    environment: "exterior",
    isInhouse: true,
    supplier: "",
    leadTime: 0,
    isActive: true
  };

  const [newSystem, setNewSystem] = useState<Omit<CoatingSystem, 'id'>>(defaultSystem);

  // Filter coating systems based on active category and search
  const getFilteredSystems = () => {
    return coatingSystems.filter(system => {
      const matchesCategory = (() => {
        switch (activeCategory) {
          case "Paint Systems":
            return system.type === "paint";
          case "Galvanizing":
            return system.type === "galvanizing";
          case "Powder Coating":
            return system.type === "powder_coating";
          case "Protective Coatings":
            return system.type === "protective";
          default:
            return true;
        }
      })();

      const matchesSearch = system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           system.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           system.productCode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch && system.isActive;
    });
  };

  const filteredSystems = getFilteredSystems();

  // Get statistics for each category
  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    Object.keys(COATING_CATEGORIES).forEach(category => {
      stats[category] = coatingSystems.filter(system => {
        switch (category) {
          case "Paint Systems":
            return system.type === "paint" && system.isActive;
          case "Galvanizing":
            return system.type === "galvanizing" && system.isActive;
          case "Powder Coating":
            return system.type === "powder_coating" && system.isActive;
          case "Protective Coatings":
            return system.type === "protective" && system.isActive;
          default:
            return false;
        }
      }).length;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'paint': return 'bg-blue-100 text-blue-800';
      case 'galvanizing': return 'bg-zinc-100 text-zinc-800';
      case 'powder_coating': return 'bg-purple-100 text-purple-800';
      case 'protective': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primer': return 'bg-orange-100 text-orange-800';
      case 'topcoat': return 'bg-green-100 text-green-800';
      case 'finish': return 'bg-indigo-100 text-indigo-800';
      case 'protective': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(COATING_CATEGORIES).map(([category, config]) => {
          const Icon = config.icon;
          const isActive = activeCategory === category;
          const count = categoryStats[category];
          
          return (
            <Card 
              key={category}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                isActive 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setActiveCategory(category);
                setSelectedSubcategory("all");
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${config.color} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {count}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1">{category}</h3>
                <p className="text-xs text-gray-600 leading-tight">{config.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Category Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{activeCategory}</h2>
          <p className="text-gray-600">{COATING_CATEGORIES[activeCategory as keyof typeof COATING_CATEGORIES]?.description}</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Coating System
          </Button>
        </div>
      </div>

      {/* Subcategory Filters */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={selectedSubcategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSubcategory("all")}
        >
          All {activeCategory}
        </Button>
        {COATING_CATEGORIES[activeCategory as keyof typeof COATING_CATEGORIES]?.subcategories.map((subcat) => (
          <Button 
            key={subcat}
            variant={selectedSubcategory === subcat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSubcategory(subcat)}
          >
            {subcat}
          </Button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search coating systems, manufacturers, codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {filteredSystems.length} systems
        </Badge>
      </div>

      {/* Coating Systems Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSystems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No coating systems found for {activeCategory}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{system.name}</div>
                        {system.productCode && (
                          <div className="text-sm text-gray-500">{system.productCode}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(system.type)}>
                        {system.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(system.category)}>
                        {system.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{system.manufacturer || '-'}</TableCell>
                    <TableCell>{system.coverage} m²/{system.unit}</TableCell>
                    <TableCell>${system.unitCost.toFixed(2)}/{system.unit}</TableCell>
                    <TableCell>{system.standard || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}