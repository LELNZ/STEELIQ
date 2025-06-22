import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, Trash2, Search, Package, CheckSquare, Square, AlertTriangle, Loader2, Grid3X3, List, Minus, Plus, Calculator, Info, Building2, DollarSign, Check, ChevronsUpDown } from "lucide-react";
import { ActionIcons } from "@/components/ui/action-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingSpinner, LoadingOverlay, LoadingState } from "@/components/ui/loading-spinner";
import { MaterialTypeIndicator, MaterialIcon } from "./material-icons";
import SurfaceAreaManager from "./surface-area-manager";
import { Material, Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateMaterialSurfaceArea } from "@/lib/surface-area-calculator";
import { calculateMaterialSurfaceArea as calculateUnifiedSurfaceArea } from "@/lib/unified-surface-area-calculator";
import { 
  calculatePricePerKg, 
  calculatePricePerMeter, 
  calculateTonRate, 
  calculatePricePerKgFromTonRate,
  autoCalculatePrices,
  formatCurrency 
} from "@/lib/price-calculator";

// Import dimensional reference images
import anglesImg from "@assets/Angles.png";
import unequalAnglesImg from "@assets/Unequal Angles.png";
import cattleRailImg from "@assets/Cattle Rail.png";
import channelImg from "@assets/Channel.png";
import flatImg from "@assets/Flstd.png";
import meshImg from "@assets/Mesh.png";
import pipeImg from "@assets/Pipe.png";
import rebarImg from "@assets/Reinforcing bar.png";
import rhsImg from "@assets/RHS.png";
import roundImg from "@assets/Round.png";
import sheetMetalImg from "@assets/Sheet metal.png";
import shsImg from "@assets/SHS.png";
import squareBarImg from "@assets/Square Bar.png";
// Updated UB/UC images - force refresh
import ubImg from "@assets/Universal Beam.png";
import ucImg from "@assets/Universal Column.png";
import dhsPurlinImg from "@assets/Purlin DHS_1749087134236.png";

interface EnhancedMaterialLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onSubcategoryChange?: (subcategory: string) => void;
}

// Structured category system for Lateral Engineering (ordered as requested)
// Dimensional reference image mapping
const DIMENSION_IMAGES = {
  "Merchant Bar": {
    "Flats": flatImg,
    "Equal Angles": anglesImg,
    "Unequal Angles": unequalAnglesImg,
    "Rounds": roundImg,
    "Squares": squareBarImg
  },
  "SHS/RHS": {
    "SHS": shsImg,
    "RHS": rhsImg,
    "Cattle Rail Hollow Section": cattleRailImg
  },
  "Structural Sections": {
    "Mild Steel Channel": channelImg,
    "Cold Formed Channel": channelImg,
    "Universal Beam": ubImg,
    "Universal Column": ucImg
  },
  "Pregal": {
    "Pregal Angles": anglesImg,
    "Pregal Flats": flatImg,
    "Pregal Channels": channelImg
  },
  "Purlins": {
    "C Purlins": channelImg,
    "Z Purlins": channelImg,
    "Sigma Purlins": channelImg,
    "DHS Purlins": dhsPurlinImg
  },
  "Pipe": {
    "Seamless Line Pipe": pipeImg,
    "ERW Line Pipe": pipeImg,
    "Black Pipe": pipeImg,
    "Primed Pipe": pipeImg,
    "Galvanised Pipe": pipeImg
  },
  "Sheet Metal": {
    "Mild Steel Plate": sheetMetalImg,
    "Mild Steel Chequer Plate": sheetMetalImg,
    "Weather Resistant Plate": sheetMetalImg,
    "Cold Rolled": sheetMetalImg,
    "Electrogalvanised Sheet": sheetMetalImg,
    "Galvanised Sheet": sheetMetalImg
  },
  "Reinforcing": {
    "Rebar": rebarImg,
    "Mesh": meshImg,
    "Deformed Bar": rebarImg
  }
} as const;

const CATEGORY_STRUCTURE = {
  "Merchant Bar": {
    subcategories: ["Flats", "Equal Angles", "Unequal Angles", "Rounds", "Squares"],
    description: "Standard merchant bar sections"
  },
  "SHS/RHS": {
    subcategories: ["SHS", "RHS", "Cattle Rail Hollow Section"],
    description: "Square and rectangular hollow sections"
  },
  "Structural Sections": {
    subcategories: ["Mild Steel Channel", "Cold Formed Channel", "Universal Beam", "Universal Column"],
    description: "Structural steel sections"
  },
  "Pregal": {
    subcategories: ["Pregal Angles", "Pregal Flats", "Pregal Channels"],
    description: "Pre-galvanized steel sections"
  },
  "Purlins": {
    subcategories: ["C Purlins", "Z Purlins", "Sigma Purlins", "DHS Purlins"],
    description: "Structural purlins for roofing and cladding"
  },
  "Pipe": {
    subcategories: [
      "Seamless Line Pipe", 
      "ERW Line Pipe", 
      "Black Pipe", 
      "Primed Pipe", 
      "Galvanised Pipe"
    ],
    description: "Pipe products"
  },
  "Sheet Metal": {
    subcategories: [
      "Mild Steel Plate", 
      "Mild Steel Chequer Plate", 
      "Weather Resistant Plate", 
      "Cold Rolled", 
      "Electrogalvanised Sheet", 
      "Galvanised Sheet"
    ],
    description: "Sheet metal products"
  },
  "Reinforcing": {
    subcategories: ["Rebar", "Mesh", "Deformed Bar"],
    description: "Reinforcing steel products"
  },
  "Consumables": {
    subcategories: ["Welding", "Cutting", "Fasteners", "Gas", "Safety"],
    description: "Welding electrodes, cutting discs, fasteners, gas, and safety equipment"
  }
};

export default function EnhancedMaterialLibrary({ searchQuery, setSearchQuery, onCategoryChange, onSubcategoryChange }: EnhancedMaterialLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [viewFormat, setViewFormat] = useState<"card" | "list">("list");
  const [cardSize, setCardSize] = useState<"normal" | "small" | "tiny">("normal");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [surfaceAreaMaterial, setSurfaceAreaMaterial] = useState<Material | null>(null);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: "",
    address: "",
    city: "",
    postcode: "",
    nzbn: "",
    gstNumber: "",
    companyNumber: "",
    paymentTerms: "30 days",
    contacts: [{
      name: "",
      title: "",
      email: "",
      phone: "",
      mobile: "",
      department: "Sales",
      isPrimary: true
    }]
  });

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Supplier dropdown state for searchable functionality
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState("");
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setSupplierDropdownOpen(false);
        setSupplierSearchText("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && supplierDropdownOpen) {
        setSupplierDropdownOpen(false);
        setSupplierSearchText("");
      }
    }

    if (supplierDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [supplierDropdownOpen]);

  // Free address search using OpenStreetMap Nominatim
  // TODO: Google Maps Places API integration available for future use
  // Replace OpenStreetMap with Google Places API by:
  // 1. Adding GOOGLE_PLACES_API_KEY to environment
  // 2. Using Google Places Autocomplete API endpoint
  // 3. Enhanced address parsing with Google's superior data quality
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding - focus on New Zealand
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `countrycodes=nz&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `extratags=1`
      );
      
      if (response.ok) {
        const results = await response.json();
        const formattedSuggestions = results.map((result: any) => ({
          display_name: result.display_name,
          address: result.address,
          full_address: result.display_name,
          postcode: result.address?.postcode || '',
          city: result.address?.city || result.address?.town || result.address?.suburb || '',
          state: result.address?.state || '',
          country: result.address?.country || ''
        }));
        
        setAddressSuggestions(formattedSuggestions);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddressChange = (value: string) => {
    setNewSupplierData({...newSupplierData, address: value});
    
    // Clear existing timeout
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }
    
    // Set new timeout for search
    addressTimeoutRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300); // 300ms delay
  };

  const selectAddress = (suggestion: any) => {
    setNewSupplierData({
      ...newSupplierData,
      address: suggestion.full_address,
      city: suggestion.city,
      postcode: suggestion.postcode
    });
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CSV Export and Template Download Functions
  const handleExportCSV = () => {
    const csvHeaders = [
      'Category', 'Code', 'Name', 'Width (mm)', 'Width1 (mm)', 'Width2 (mm)', 
      'Thickness (mm)', 'Diameter (mm)', 'Depth (mm)', 'Flange Thickness (mm)', 
      'Web Thickness (mm)', 'Length (mm)', 'Weight (kg/m)', 'Length Options (m)', 
      'Grade', 'Standard', 'Coating', 'Price per kg ($)', 'Price per m ($)', 
      'Surface Area (m²/m)', 'Supplier', 'Active'
    ];
    
    // Use all materials when "All Categories" is selected, otherwise use filtered materials
    const materialsToExport = selectedCategory === "all" ? materials : filteredMaterials;
    
    const csvData = (materialsToExport as Material[]).map((material: Material) => [
      material.category || '',
      material.code || '',
      material.name || '',
      material.width || '',
      material.width1 || '',
      material.width2 || '',
      material.thickness || '',
      material.diameter || '',
      material.depth || '',
      material.flangeTf || '',
      material.webTw || '',
      material.length || '',
      material.weightPerMeter || '',
      material.lengthOptions || '',
      material.grade || '',
      material.standard || '',
      material.coating || '',
      material.pricePerKg || '',
      material.pricePerMeter || '',
      material.surfaceAreaPerMeter || '',
      material.supplier || '',
      material.isActive ? 'true' : 'false'
    ]);
    
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
    
    // Generate filename based on selected category
    const categoryName = selectedCategory === "all" 
      ? "All_Categories" 
      : selectedCategory.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const date = new Date().toISOString().split('T')[0];
    const filename = `Materials_${categoryName}_${date}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${(materialsToExport as Material[]).length} materials to ${filename}`,
    });
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Category', 'Code', 'Name', 'Width (mm)', 'Width1 (mm)', 'Width2 (mm)', 
      'Thickness (mm)', 'Diameter (mm)', 'Depth (mm)', 'Flange Thickness (mm)', 
      'Web Thickness (mm)', 'Length (mm)', 'Weight (kg/m)', 'Length Options (m)', 
      'Grade', 'Standard', 'Coating', 'Price per kg ($)', 'Price per m ($)', 
      'Surface Area (m²/m)', 'Supplier', 'Available Lengths (m)', 'Sheet Size (mm)', 
      'Outside Diameter (mm)', 'Inside Diameter (mm)', 'Corner Radius (mm)', 
      'Wall Thickness (mm)', 'Nominal Size', 'Finish Options', 'Mass per Unit (kg)', 'Active'
    ];
    
    const sampleRows = [
      templateHeaders,
      ['Flats', 'SF02505', 'Mild Steel Flat 25x5mm', '25.00', '', '', '5.00', '', '', '', '', '6000', '0.980', '6.0', 'G300', 'AS/NZS 3679.1-300', '', '', '', '', 'ASMUSS', '6.0', '', '', '', '', '', '', '', '', 'true'],
      ['Equal Angles', 'SA05006', 'Mild Steel Equal Angle 50x50x6mm', '50.00', '', '', '6.00', '', '', '', '', '6000', '4.460', '6.0,9.0', 'G300', 'AS/NZS 3679.1-300', '', '', '', '', 'ASMUSS', '6.0,9.0', '', '', '', '', '', '', '', '', 'true'],
      ['Universal Beams', 'SUB150014', 'Universal Beam 150x75x14mm', '75.00', '', '', '', '', '150.00', '7.00', '5.00', '6000', '14.000', '6.0,9.0', 'G300SO', 'AS3679.1', '', '', '', '0.590', 'ASMUSS', '6.0,9.0', '', '', '', '', '', '', '', '', 'true']
    ];
    
    const csvContent = sampleRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lateral_engineering_material_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV import template with sample data downloaded",
    });
  };

  // Bulk surface area calculation mutation
  const bulkCalculateSurfaceAreaMutation = useMutation({
    mutationFn: async () => {
      const materialsResponse = await fetch('/api/materials');
      const materials = await materialsResponse.json();
      const updates = [];
      
      for (const material of materials) {
        // Only calculate if surface area is missing or zero
        if (!material.surfaceAreaPerMeter || parseFloat(material.surfaceAreaPerMeter) === 0) {
          const calculatedArea = calculateMaterialSurfaceArea(material);
          if (calculatedArea && calculatedArea > 0) {
            updates.push({
              id: material.id,
              surfaceAreaPerMeter: calculatedArea.toFixed(4)
            });
          }
        }
      }
      
      // Update materials with calculated surface areas
      const promises = updates.map(update => 
        fetch(`/api/materials/${update.id}/update`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surfaceAreaPerMeter: update.surfaceAreaPerMeter })
        })
      );
      
      await Promise.all(promises);
      return updates.length;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Surface Area Calculation Complete",
        description: `Updated surface area for ${updatedCount} materials`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: "Failed to calculate surface areas. Please try again.",
      });
      console.error("Bulk surface area calculation error:", error);
    }
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/materials"],
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Filter suppliers based on search text
  const filteredSuppliers = suppliers.filter(supplier => {
    if (!supplierSearchText) return true;
    const searchLower = supplierSearchText.toLowerCase();
    return supplier.name.toLowerCase().includes(searchLower);
  });

  // Streamlined material categorization logic
  const categorizeeMaterial = (material: Material): string[] => {
    const name = material.name.toLowerCase();
    const code = material.code.toLowerCase();
    const category = (material.category || "").toLowerCase();
    const categories: string[] = [];
    
    // Helper to check if material is Duragal/Pregal
    const isDuragal = name.includes('duragal') || name.includes('pregal') || code.includes('dga') || code.includes('dgfl') || category.includes('duragal');

    // Pregal Sections (Priority - handle first to avoid duplicates)
    if (isDuragal) {
      if (name.includes('angle')) categories.push('Pregal Angles');
      else if (name.includes('flat') || code.includes('dgfl') || category.includes('duragal flats')) categories.push('Pregal Flats');
      else if (name.includes('channel')) categories.push('Pregal Channels');
      return categories; // Return early to prevent other categorizations
    }

    // Merchant Bar (only non-Duragal materials)
    if (name.includes('flat') || code.includes('flat')) categories.push('Flats');
    if (name.includes('equal angle') || name.includes('ea ') || code.includes('ea')) categories.push('Equal Angles');
    if (name.includes('unequal angle') || name.includes('ua ') || code.includes('ua')) categories.push('Unequal Angles');
    if (name.includes('round') || name.includes('rod') || code.includes('rd')) categories.push('Rounds');
    if (name.includes('square bar') || name.includes('sq ') || code.includes('sq')) categories.push('Squares');

    // Structural Sections
    if (name.includes('channel')) {
      if (name.includes('cold formed') || name.includes('cf')) categories.push('Cold Formed Channel');
      else categories.push('Mild Steel Channel');
    }
    if (name.includes('universal beam') || name.includes('ub') || code.includes('ub')) categories.push('Universal Beam');
    if (name.includes('universal column') || name.includes('uc') || code.includes('uc')) categories.push('Universal Column');

    // Sheet Metal (consolidated logic)
    if (name.includes('plate') || category.includes('plate')) {
      if (name.includes('chequer') || name.includes('checker') || code.includes('plcq')) categories.push('Mild Steel Chequer Plate');
      else if (name.includes('weather resistant') || code.includes('plwr')) categories.push('Weather Resistant Plate');
      else categories.push('Mild Steel Plate');
    }
    if (name.includes('sheet') || category.includes('sheet')) {
      if (name.includes('cold rolled')) categories.push('Cold Rolled');
      else if (name.includes('electrogalvanised') || name.includes('electrogalvanized') || category.includes('electrogalvanized')) categories.push('Electrogalvanised Sheet');
      else categories.push('Galvanised Sheet');
    }

    // SHS/RHS
    if (name.includes('shs') || name.includes('square hollow')) categories.push('SHS');
    if (name.includes('rhs') || name.includes('rectangular hollow')) categories.push('RHS');
    if (name.includes('cattle rail') || name.includes('oval rail')) categories.push('Cattle Rail Hollow Section');

    // Pipe
    if (name.includes('pipe')) {
      if (name.includes('seamless')) categories.push('Seamless Line Pipe');
      else if (name.includes('erw')) categories.push('ERW Line Pipe');
      else if (name.includes('black')) categories.push('Black Pipe');
      else if (name.includes('primed')) categories.push('Primed Pipe');
      else categories.push('Galvanised Pipe');
    }

    // Purlins
    if (name.includes('dhs') && name.includes('purlin') || category.includes('dhs purlins')) categories.push('DHS Purlins');
    if (name.includes('c purlin') || category.includes('c purlins')) categories.push('C Purlins');
    if (name.includes('z purlin') || category.includes('z purlins')) categories.push('Z Purlins');
    if (name.includes('sigma purlin') || category.includes('sigma purlins')) categories.push('Sigma Purlins');

    // Reinforcing (check early to prevent duplicates)
    if (name.includes('mesh')) {
      categories.push('Mesh');
      return categories; // Exit early to prevent mesh appearing in other categories
    }
    if (name.includes('rebar') || name.includes('reinforcing') || name.includes('deformed bar')) categories.push('Rebar');

    return categories;
  };

  // Optimized material filtering - only show materials when category selected or search entered
  const filteredMaterials = (materials as Material[]).filter((material: Material) => {
    // Don't show any materials by default - require category selection or search
    if (selectedCategory === "all" && !searchQuery.trim()) {
      return false;
    }

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      material.name.toLowerCase().includes(searchLower) ||
      material.code.toLowerCase().includes(searchLower) ||
      (material.grade && material.grade.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;
    if (selectedCategory === "all") return true;

    const materialCategories = categorizeeMaterial(material);
    const categorySubcategories = CATEGORY_STRUCTURE[selectedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories || [];
    
    if (selectedSubcategory === "all") {
      return materialCategories.some(cat => categorySubcategories.includes(cat));
    }

    return materialCategories.includes(selectedSubcategory);
  });

  // Delete selected materials mutation
  const deleteSelectedMutation = useMutation({
    mutationFn: async (materialIds: number[]) => {
      const promises = materialIds.map(id => 
        fetch(`/api/materials/${id}`, { method: "DELETE" })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSelectedMaterials(new Set());
      setSelectAll(false);
      toast({
        title: "Success",
        description: `Deleted ${selectedMaterials.size} materials successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete selected materials",
        variant: "destructive",
      });
    },
  });

  // Edit material mutation
  const editMaterialMutation = useMutation({
    mutationFn: async (data: { id: number; material: Partial<Material> }) => {
      console.log('Updating material:', data.id, data.material);
      const response = await fetch(`/api/materials/${data.id}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.material),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Update failed:', errorData);
        throw new Error(`Failed to update material: ${response.status}`);
      }
      
      const responseText = await response.text();
      try {
        const result = JSON.parse(responseText);
        return result;
      } catch (parseError) {
        throw new Error('Server returned invalid JSON response');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setEditingMaterial(null);
      toast({
        title: "Success",
        description: "Material updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update material",
        variant: "destructive",
      });
    },
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (supplierData: any) => {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to add supplier: ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowAddSupplierDialog(false);
      setNewSupplierData({
        name: "",
        address: "",
        city: "",
        postcode: "",
        nzbn: "",
        gstNumber: "",
        companyNumber: "",
        paymentTerms: "30 days",
        contacts: [{
          name: "",
          title: "",
          email: "",
          phone: "",
          mobile: "",
          department: "Sales",
          isPrimary: true
        }]
      });
      if (editingMaterial) {
        setEditingMaterial({...editingMaterial, supplier: newSupplier.name});
      }
      toast({ title: "Supplier added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding supplier", description: error.message, variant: "destructive" });
    }
  });

  // Surface area update mutation
  const updateSurfaceAreaMutation = useMutation({
    mutationFn: async (data: { id: number; surfaceAreaPerMeter: number }) => {
      return await apiRequest(`/api/materials/${data.id}/update`, {
        method: "POST",
        body: JSON.stringify({ surfaceAreaPerMeter: data.surfaceAreaPerMeter.toString() })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSurfaceAreaMaterial(null);
      toast({
        title: "Success",
        description: "Surface area updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update surface area",
        variant: "destructive",
      });
    },
  });

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials(new Set());
      setSelectAll(false);
    } else {
      // Select all materials from the current view (filtered or all)
      const allIds = new Set(filteredMaterials.map((m: Material) => m.id));
      setSelectedMaterials(allIds);
      setSelectAll(true);
    }
  };

  // Handle individual material selection
  const handleMaterialSelect = (materialId: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterials(newSelected);
    setSelectAll(newSelected.size === filteredMaterials.length);
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory) {
      // Toggle expansion
      setExpandedCategory(expandedCategory === category ? null : category);
    } else {
      // Select new category
      setSelectedCategory(category);
      setExpandedCategory(category);
      setSelectedSubcategory("all");
      setSelectedMaterials(new Set());
      setSelectAll(false);
      onCategoryChange?.(category);
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedMaterials(new Set());
    setSelectAll(false);
    onSubcategoryChange?.(subcategory);
  };

  // Handle delete selected
  const handleDeleteSelected = () => {
    if (selectedMaterials.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedMaterials.size} selected materials? This action cannot be undone.`)) {
      deleteSelectedMutation.mutate(Array.from(selectedMaterials));
    }
  };

  const currentSubcategories = selectedCategory !== "all" 
    ? CATEGORY_STRUCTURE[selectedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories || []
    : [];

  return (
    <div className="space-y-6">
      {/* Quick-Click Category Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Steel Catalogue Categories</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* All Category and Main Category Quick-Click Buttons - Horizontal Layout */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs px-3 py-1 h-auto"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSubcategory("all");
                setExpandedCategory(null);
                setSelectedMaterials(new Set());
                setSelectAll(false);
              }}
            >
              All Categories
            </Button>
            {Object.entries(CATEGORY_STRUCTURE).map(([category, info]) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs px-4 py-1 h-auto font-medium"
                onClick={() => handleCategoryChange(category)}
              >
                {category}
                {selectedCategory === category && expandedCategory === category && " ▼"}
                {selectedCategory === category && expandedCategory !== category && " ▶"}
              </Button>
            ))}
          </div>

          {/* Subcategory Buttons (Expandable Row) */}
          {expandedCategory && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200 bg-gray-50 p-3 rounded-lg border">
              <Button
                variant={selectedSubcategory === "all" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-xs px-3 py-1 h-auto"
                onClick={() => handleSubcategoryChange("all")}
              >
                All {expandedCategory}
              </Button>
              {CATEGORY_STRUCTURE[expandedCategory as keyof typeof CATEGORY_STRUCTURE]?.subcategories.map((subcategory) => (
                <Button
                  key={subcategory}
                  variant={selectedSubcategory === subcategory ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full text-xs px-3 py-1 h-auto"
                  onClick={() => handleSubcategoryChange(subcategory)}
                >
                  {subcategory}
                </Button>
              ))}
            </div>
          )}


        </CardContent>
      </Card>

      {/* Search and Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search materials, codes, grades..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View Controls and Selection */}
            <div className="flex items-center gap-4">
              {/* Calculate All Surface Areas Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => bulkCalculateSurfaceAreaMutation.mutate()}
                disabled={bulkCalculateSurfaceAreaMutation.isPending}
                className="whitespace-nowrap"
              >
                {bulkCalculateSurfaceAreaMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate All
                  </>
                )}
              </Button>
              {/* View Format Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewFormat === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFormat("card")}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewFormat === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFormat("list")}
                  className="h-8 px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Card Size Controls (only show in card view) */}
              {viewFormat === "card" && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <Button
                    variant={cardSize === "tiny" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardSize("tiny")}
                    className="h-8 px-2 text-xs"
                  >
                    25%
                  </Button>
                  <Button
                    variant={cardSize === "small" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardSize("small")}
                    className="h-8 px-2 text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    variant={cardSize === "normal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardSize("normal")}
                    className="h-8 px-2 text-xs"
                  >
                    100%
                  </Button>
                </div>
              )}

              <div className="border-l pl-4 flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredMaterials.length})
                </label>
              </div>

              {selectedMaterials.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteSelectedMutation.isPending}
                >
                  {deleteSelectedMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedMaterials.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Loading materials...</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : filteredMaterials.length > 0 ? (
        viewFormat === "card" ? (
          // Card View with Size Options
          <div className={`grid gap-4 ${
            cardSize === "tiny" 
              ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" 
              : cardSize === "small" 
              ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" 
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}>
            {filteredMaterials.map((material: Material) => (
              <Card 
                key={material.id} 
                className={`hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700 ${
                  selectedMaterials.has(material.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-300' 
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                } ${cardSize === "tiny" ? "text-xs" : cardSize === "small" ? "text-sm" : ""}`}
              >
                <CardHeader className={cardSize === "tiny" ? "pb-1 px-2 pt-2" : cardSize === "small" ? "pb-2 px-3 pt-3" : "pb-2 px-4 pt-4"}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      <Checkbox
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => handleMaterialSelect(material.id)}
                        className={cardSize === "tiny" ? "h-3 w-3" : ""}
                      />
                      {/* Material Type Icon */}
                      <MaterialTypeIndicator 
                        category={material.category || ""} 
                        name={material.name}
                        size={cardSize === "tiny" ? "sm" : "md"}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className={`font-semibold text-gray-900 dark:text-gray-100 leading-tight ${
                          cardSize === "tiny" ? "text-xs" : cardSize === "small" ? "text-sm" : "text-lg"
                        }`}>
                          <span className="line-clamp-2">{material.name}</span>
                        </CardTitle>
                        <div className="flex flex-col gap-1 mt-2">
                          <Badge variant="secondary" className={`self-start bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 ${
                            cardSize === "tiny" ? "text-xs px-2 py-0.5" : cardSize === "small" ? "text-xs px-2 py-1" : "text-sm px-3 py-1"
                          }`}>
                            {material.code}
                          </Badge>
                          <p className={`text-gray-500 dark:text-gray-400 ${
                            cardSize === "tiny" ? "text-xs" : "text-sm"
                          }`}>
                            {material.category}
                          </p>
                        </div>
                      </div>
                    </div>
                    {cardSize !== "tiny" && (
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSurfaceAreaMaterial(material)}
                          title="Calculate Surface Area"
                        >
                          <Calculator className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingMaterial(material)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${material.name}?`)) {
                              deleteSelectedMutation.mutate([material.id]);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className={`${
                  cardSize === "tiny" ? "px-2 pb-2 space-y-1" : cardSize === "small" ? "px-3 pb-3 space-y-2" : "px-4 pb-4 space-y-3"
                }`}>
                  {cardSize !== "tiny" && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Show diameter for rounds, pipes, and reinforcing bars, otherwise show width/thickness */}
                      {(material.category?.toLowerCase().includes('round') || 
                        material.category?.toLowerCase().includes('pipe') || 
                        material.category?.toLowerCase().includes('chs') ||
                        material.category?.toLowerCase().includes('reinforc')) ? (
                        <>
                          <div>
                            <p className="text-muted-foreground">Diameter (mm)</p>
                            <p className="font-medium">⌀ {material.diameter || 'N/A'}</p>
                          </div>
                          {material.thickness && (
                            <div>
                              <p className="text-muted-foreground">Wall Thickness</p>
                              <p className="font-medium">{material.thickness}mm</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Special display for sheet metal materials - show width, length, thickness */}
                          {(material.category?.toLowerCase().includes('sheet') || 
                            material.category?.toLowerCase().includes('plate') ||
                            material.name.toLowerCase().includes('sheet') ||
                            material.name.toLowerCase().includes('plate')) ? (
                            <>
                              <div>
                                <p className="text-muted-foreground">Width</p>
                                <p className="font-medium">{material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Length</p>
                                <p className="font-medium">{material.length ? parseFloat(material.length.toString()).toFixed(0) : 'N/A'}mm</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Thickness</p>
                                <p className="font-medium">{material.thickness || 'N/A'}mm</p>
                              </div>
                            </>
                          ) : /* Special display for unequal angles - show W1/W2 */
                          material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle') ? (
                            <>
                              <div>
                                <p className="text-muted-foreground">Width 1 (W1)</p>
                                <p className="font-medium">{material.width1 ? parseFloat(String(material.width1)).toFixed(0) : 'N/A'}mm</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Width 2 (W2)</p>
                                <p className="font-medium">{material.width2 ? parseFloat(String(material.width2)).toFixed(0) : 'N/A'}mm</p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-muted-foreground">Width</p>
                              <p className="font-medium">{material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
                            </div>
                          )}
                          {/* Show separate web and flange thickness for structural sections */}
                          {!(material.category?.toLowerCase().includes('sheet') || 
                            material.category?.toLowerCase().includes('plate') ||
                            material.name.toLowerCase().includes('sheet') ||
                            material.name.toLowerCase().includes('plate')) && 
                           (material.category?.toLowerCase().includes('channel') || 
                            material.category?.toLowerCase().includes('structural channels') ||
                            material.category?.toLowerCase().includes('universal beam') ||
                            material.category?.toLowerCase().includes('universal column')) ? (
                            <>
                              <div>
                                <p className="text-muted-foreground">Web Thickness</p>
                                <p className="font-medium">{material.webTw || 'N/A'}mm</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Flange Thickness</p>
                                <p className="font-medium">{material.flangeTf || 'N/A'}mm</p>
                              </div>
                            </>
                          ) : !(material.category?.toLowerCase().includes('sheet') || 
                                material.category?.toLowerCase().includes('plate') ||
                                material.name.toLowerCase().includes('sheet') ||
                                material.name.toLowerCase().includes('plate')) &&
                               !(material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle')) ? (
                            <div>
                              <p className="text-muted-foreground">Thickness</p>
                              <p className="font-medium">{material.thickness || 'N/A'}</p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}

                  <div className={`${cardSize === "tiny" ? "space-y-1" : "grid grid-cols-2 gap-2"}`}>
                    {cardSize !== "tiny" && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Grade</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{material.grade || 'Standard'}</p>
                      </div>
                    )}
                    <div className={`${cardSize === "tiny" ? "text-center bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded" : "bg-gray-50 dark:bg-gray-800/50 p-2 rounded"}`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Weight</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{material.weightPerMeter || 0} kg/m</p>
                    </div>
                    {cardSize !== "tiny" && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Supplier</p>
                        <p className="font-semibold text-indigo-700 dark:text-indigo-300">{material.supplier || 'Unknown'}</p>
                      </div>
                    )}
                    {cardSize !== "tiny" && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Surface Area</p>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          {(() => {
                            // Calculate surface area with proper dimension handling for all material types
                            if (material.category && (material.width || material.width1 || material.diameter)) {
                              // Check if it's a round material that needs diameter instead of width
                              const isRoundMaterial = material.category.toLowerCase().includes('round') || 
                                                     material.category.toLowerCase().includes('pipe') || 
                                                     material.category.toLowerCase().includes('reinforc');
                              
                              const dimensions = {
                                width: material.width ? parseFloat(material.width) : (material.width1 ? parseFloat(material.width1.toString()) : 0),
                                depth: material.depth ? parseFloat(material.depth) : (material.width2 ? parseFloat(material.width2.toString()) : (material.width ? parseFloat(material.width) : 0)),
                                webThickness: material.webTw ? parseFloat(material.webTw.toString()) : (material.thickness ? parseFloat(material.thickness.toString()) : 0),
                                flangeThickness: material.flangeTf ? parseFloat(material.flangeTf.toString()) : (material.thickness ? parseFloat(material.thickness.toString()) : 0),
                                thickness: material.thickness ? parseFloat(material.thickness.toString()) : 0,
                                diameter: isRoundMaterial && material.diameter ? parseFloat(material.diameter.toString()) : undefined,
                                width1: material.width1 ? parseFloat(material.width1.toString()) : undefined,
                                width2: material.width2 ? parseFloat(material.width2.toString()) : undefined
                              };
                              
                              const result = calculateUnifiedSurfaceArea(
                                material.category,
                                dimensions,
                                'external-internal'
                              );
                              
                              return `${result.total.toFixed(3)} m²/m`;
                            } else if (material.surfaceAreaPerMeter) {
                              return `${Number(material.surfaceAreaPerMeter).toFixed(3)} m²/m`;
                            } else {
                              return 'Not calculated';
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>

                  {cardSize !== "tiny" && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Price</p>
                          <div className="space-y-0.5">
                            {material.pricePerMeter && (
                              <p className="font-bold text-sm text-green-700 dark:text-green-300">
                                ${material.pricePerMeter}/m
                              </p>
                            )}
                            {material.pricePerKg && (
                              <p className="font-bold text-sm text-green-700 dark:text-green-300">
                                ${material.pricePerKg}/kg
                              </p>
                            )}
                            {!material.pricePerMeter && !material.pricePerKg && (
                              <p className="font-bold text-sm text-green-700 dark:text-green-300">
                                Contact for Quote
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Available Lengths */}
                      {material.lengthOptions && (
                        <div>
                          <p className="text-muted-foreground text-xs">Available Lengths</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {material.lengthOptions.split(';').map((length, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs px-1 py-0"
                              >
                                {length.trim()}m
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {filteredMaterials.map((material: Material) => (
              <Card 
                key={material.id} 
                className={`hover:shadow-sm transition-all ${
                  selectedMaterials.has(material.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Checkbox
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => handleMaterialSelect(material.id)}
                      />
                      {/* Material Type Icon for List View */}
                      <MaterialTypeIndicator 
                        category={material.category || ""} 
                        name={material.name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 grid grid-cols-9 gap-3 items-center">
                        <div className="col-span-2">
                          <div className="flex flex-col">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{material.name}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{material.code}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{material.category}</p>
                          </div>
                          {/* Available Lengths for List View */}
                          {material.lengthOptions && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {material.lengthOptions.split(';').slice(0, 2).map((length, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="text-xs px-1 py-0 bg-gray-100 dark:bg-gray-700"
                                >
                                  {length.trim()}m
                                </Badge>
                              ))}
                              {material.lengthOptions.split(';').length > 2 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{material.lengthOptions.split(';').length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          {/* Show diameter for rounds, pipes, and reinforcing bars, otherwise show width/thickness */}
                          {(material.category?.toLowerCase().includes('round') || 
                            material.category?.toLowerCase().includes('pipe') || 
                            material.category?.toLowerCase().includes('chs') ||
                            material.category?.toLowerCase().includes('reinforc')) ? (
                            <>
                              <p className="text-sm">⌀: {material.diameter || 'N/A'}mm</p>
                              {material.thickness && <p className="text-sm">T: {material.thickness}mm</p>}
                            </>
                          ) : (
                            <>
                              {/* Special display for sheet metal materials in tiny view */}
                              {(material.category?.toLowerCase().includes('sheet') || 
                                material.category?.toLowerCase().includes('plate') ||
                                material.name.toLowerCase().includes('sheet') ||
                                material.name.toLowerCase().includes('plate')) ? (
                                <>
                                  <p className="text-sm">W: {material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
                                  <p className="text-sm">L: {material.length ? parseFloat(material.length.toString()).toFixed(0) : 'N/A'}mm</p>
                                  <p className="text-sm">T: {material.thickness || 'N/A'}mm</p>
                                </>
                              ) : /* Special display for unequal angles - show W1/W2 */
                              material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle') ? (
                                <>
                                  <p className="text-sm">W1: {material.width1 ? parseFloat(String(material.width1)).toFixed(0) : 'N/A'}mm</p>
                                  <p className="text-sm">W2: {material.width2 ? parseFloat(String(material.width2)).toFixed(0) : 'N/A'}mm</p>
                                </>
                              ) : (
                                <p className="text-sm">W: {material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
                              )}
                              {!(material.category?.toLowerCase().includes('sheet') || 
                                material.category?.toLowerCase().includes('plate') ||
                                material.name.toLowerCase().includes('sheet') ||
                                material.name.toLowerCase().includes('plate')) && material.depth && (
                                <div className="flex items-center gap-1">
                                  <p className="text-sm">D: {material.depth}mm</p>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="w-3 h-3 text-muted-foreground hover:text-blue-600" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Depth/height dimension of the steel profile (mm)</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                              {/* Show separate web and flange thickness for structural sections */}
                              {!(material.category?.toLowerCase().includes('sheet') || 
                                material.category?.toLowerCase().includes('plate') ||
                                material.name.toLowerCase().includes('sheet') ||
                                material.name.toLowerCase().includes('plate')) &&
                               (material.category?.toLowerCase().includes('channel') || 
                                material.category?.toLowerCase().includes('structural channels') ||
                                material.category?.toLowerCase().includes('universal beam') ||
                                material.category?.toLowerCase().includes('universal column')) ? (
                                <>
                                  <p className="text-sm">Web: {material.webTw || 'N/A'}mm</p>
                                  <p className="text-sm">Flange: {material.flangeTf || 'N/A'}mm</p>
                                </>
                              ) : !(material.category?.toLowerCase().includes('sheet') || 
                                    material.category?.toLowerCase().includes('plate') ||
                                    material.name.toLowerCase().includes('sheet') ||
                                    material.name.toLowerCase().includes('plate')) &&
                                   !(material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle')) ? (
                                <p className="text-sm">T: {material.thickness || 'N/A'}</p>
                              ) : null}
                            </>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{material.weightPerMeter || 0} kg/m</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-blue-600">
                              {(() => {
                                // Always calculate for consistency, handling round materials properly
                                if (material.category && (material.width || material.width1 || material.diameter)) {
                                  const isRoundMaterial = material.category.toLowerCase().includes('round') || 
                                                         material.category.toLowerCase().includes('pipe') || 
                                                         material.category.toLowerCase().includes('reinforc');
                                  
                                  const dimensions = {
                                    width: material.width ? parseFloat(material.width) : (material.width1 ? parseFloat(material.width1.toString()) : 0),
                                    depth: material.depth ? parseFloat(material.depth) : (material.width2 ? parseFloat(material.width2.toString()) : (material.width ? parseFloat(material.width) : 0)),
                                    webThickness: material.webTw ? parseFloat(material.webTw.toString()) : (material.thickness ? parseFloat(material.thickness.toString()) : 0),
                                    flangeThickness: material.flangeTf ? parseFloat(material.flangeTf.toString()) : (material.thickness ? parseFloat(material.thickness.toString()) : 0),
                                    thickness: material.thickness ? parseFloat(material.thickness.toString()) : 0,
                                    diameter: isRoundMaterial && material.diameter ? parseFloat(material.diameter.toString()) : undefined,
                                    outerDiameter: isRoundMaterial && material.diameter ? parseFloat(material.diameter.toString()) : undefined,
                                    width1: material.width1 ? parseFloat(material.width1.toString()) : undefined,
                                    width2: material.width2 ? parseFloat(material.width2.toString()) : undefined
                                  };
                                  
                                  const result = calculateUnifiedSurfaceArea(
                                    material.category,
                                    dimensions,
                                    'external-internal'
                                  );
                                  
                                  return `${result.total.toFixed(3)} m²/m`;
                                } else if (material.surfaceAreaPerMeter) {
                                  return `${Number(material.surfaceAreaPerMeter).toFixed(3)} m²/m`;
                                } else {
                                  return 'Not calculated';
                                }
                              })()}
                            </p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-3 h-3 text-muted-foreground hover:text-blue-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p className="font-medium">Surface area per linear meter for coating calculations (m²/m)</p>
                                    <p className="text-xs text-muted-foreground">Includes configurable face selections:</p>
                                    <ul className="text-xs space-y-1 ml-2">
                                      <li>• External faces (top, bottom, sides)</li>
                                      <li>• Internal faces (where applicable)</li>
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{material.weightPerMeter || 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">kg/m</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{material.grade || 'Standard'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Grade</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{material.supplier || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                        </div>
                        <div className="text-center">
                          <div className="space-y-0.5">
                            {material.pricePerMeter && (
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ${material.pricePerMeter}/m
                              </p>
                            )}
                            {material.pricePerKg && (
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ${material.pricePerKg}/kg
                              </p>
                            )}
                            {!material.pricePerMeter && !material.pricePerKg && (
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                Quote
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSurfaceAreaMaterial(material)}
                        title="Calculate Surface Area"
                        className="h-6 w-8 p-0"
                      >
                        <Calculator className="w-3 h-3" />
                      </Button>
                      <ActionIcons
                        onEdit={() => setEditingMaterial(material)}
                        onDelete={() => {
                          if (confirm(`Are you sure you want to delete ${material.name}?`)) {
                            deleteSelectedMutation.mutate([material.id]);
                          }
                        }}
                        editTitle="Edit Material"
                        deleteTitle="Delete Material"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {selectedCategory === "all" && !searchQuery.trim() ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-2">Select a Material Category</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a category above or use the search bar to browse your steel catalogue
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>💡 <strong>Tip:</strong> Click on category buttons like "Merchant Bar" or "SHS/RHS" to start browsing</p>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-2">No materials found</h3>
                <p className="text-muted-foreground mb-4">
                  No materials match your current filters
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedSubcategory("all");
                }}>
                  Clear Filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedMaterials.size > 0 && (
        <Card className={`${deleteSelectedMutation.isPending ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {deleteSelectedMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                    <span className="font-medium text-red-800">
                      Deleting {selectedMaterials.size} materials...
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {selectedMaterials.size} materials selected
                    </span>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedMaterials(new Set());
                    setSelectAll(false);
                  }}
                  disabled={deleteSelectedMutation.isPending}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteSelectedMutation.isPending}
                >
                  {deleteSelectedMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Progress indicator during bulk operations */}
            {deleteSelectedMutation.isPending && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <div className="flex items-center space-x-2 text-sm text-red-700">
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <span className="whitespace-nowrap">Processing...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay for Bulk Operations */}
      {deleteSelectedMutation.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Card className="p-6 min-w-[300px]">
            <CardContent className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Processing Request</h3>
                <p className="text-sm text-gray-600">
                  Deleting {selectedMaterials.size} materials from your catalogue...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Professional Edit Material Modal */}
      {editingMaterial && (
        <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Material Details
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Update material specifications and pricing for your steel catalogue
              </p>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Material Name</Label>
                    <Input
                      id="edit-name"
                      value={editingMaterial.name}
                      onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                      placeholder="Enter material name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Material Code</Label>
                    <Input
                      id="edit-code"
                      value={editingMaterial.code}
                      onChange={(e) => setEditingMaterial({...editingMaterial, code: e.target.value})}
                      placeholder="Enter material code"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Dimensions</h3>
                {/* Show different fields based on material type */}
                {(editingMaterial.category?.toLowerCase().includes('round') || 
                  editingMaterial.category?.toLowerCase().includes('pipe') || 
                  editingMaterial.category?.toLowerCase().includes('chs') ||
                  editingMaterial.category?.toLowerCase().includes('reinforc')) ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-diameter">Diameter (mm)</Label>
                      <Input
                        id="edit-diameter"
                        type="number"
                        value={editingMaterial.diameter?.toString() || ""}
                        onChange={(e) => setEditingMaterial({...editingMaterial, diameter: e.target.value ? parseFloat(e.target.value) : undefined})}
                        placeholder="Diameter"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-thickness">
                        {editingMaterial.category?.toLowerCase().includes('pipe') ? 'Wall Thickness (mm)' : 'Thickness (mm)'}
                      </Label>
                      <Input
                        id="edit-thickness"
                        type="number"
                        value={editingMaterial.thickness?.toString() || ""}
                        onChange={(e) => setEditingMaterial({...editingMaterial, thickness: e.target.value ? parseFloat(e.target.value) : undefined})}
                        placeholder={editingMaterial.category?.toLowerCase().includes('pipe') ? 'Wall Thickness' : 'Thickness'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-length">Length (mm)</Label>
                      <Input
                        id="edit-length"
                        type="number"
                        value={editingMaterial.length?.toString() || ""}
                        onChange={(e) => setEditingMaterial({...editingMaterial, length: parseFloat(e.target.value) || undefined})}
                        placeholder="Length"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show different layouts for structural sections vs other materials */}
                    {(editingMaterial.category?.toLowerCase().includes('channel') || 
                      editingMaterial.category?.toLowerCase().includes('structural channels') ||
                      editingMaterial.category?.toLowerCase().includes('cold formed channel') ||
                      editingMaterial.category?.toLowerCase().includes('mild steel channel') ||
                      editingMaterial.category?.toLowerCase().includes('pfc') ||
                      editingMaterial.category?.toLowerCase().includes('universal beam') ||
                      editingMaterial.category?.toLowerCase().includes('universal column')) ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-width">Width (mm)</Label>
                          <Input
                            id="edit-width"
                            type="number"
                            value={editingMaterial.width?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, width: parseFloat(e.target.value) || undefined})}
                            placeholder="Width"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-depth">Depth (mm)</Label>
                          <Input
                            id="edit-depth"
                            type="number"
                            value={editingMaterial.depth?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, depth: parseFloat(e.target.value) || undefined})}
                            placeholder="Depth"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-web-thickness">Web Thickness (mm)</Label>
                          <Input
                            id="edit-web-thickness"
                            type="number"
                            value={editingMaterial.webTw?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, webTw: parseFloat(e.target.value) || undefined})}
                            placeholder="Web Thickness"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-flange-thickness">Flange Thickness (mm)</Label>
                          <Input
                            id="edit-flange-thickness"
                            type="number"
                            value={editingMaterial.flangeTf?.toString() || ""}
                            onChange={(e) => setEditingMaterial({...editingMaterial, flangeTf: parseFloat(e.target.value) || undefined})}
                            placeholder="Flange Thickness"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Special form for unequal angles - show W1/W2 */}
                        {editingMaterial.category?.toLowerCase().includes('unequal') && editingMaterial.category?.toLowerCase().includes('angle') ? (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-width1">Width 1 / W1 (mm)</Label>
                              <Input
                                id="edit-width1"
                                type="number"
                                value={editingMaterial.width1 ? parseFloat(String(editingMaterial.width1)).toFixed(0) : ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, width1: parseFloat(e.target.value) || undefined})}
                                placeholder="W1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-width2">Width 2 / W2 (mm)</Label>
                              <Input
                                id="edit-width2"
                                type="number"
                                value={editingMaterial.width2 ? parseFloat(String(editingMaterial.width2)).toFixed(0) : ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, width2: parseFloat(e.target.value) || undefined})}
                                placeholder="W2"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-thickness">Thickness (mm)</Label>
                              <Input
                                id="edit-thickness"
                                type="number"
                                value={editingMaterial.thickness?.toString() || ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, thickness: parseFloat(e.target.value) || undefined})}
                                placeholder="Thickness"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-length">Length (mm)</Label>
                              <Input
                                id="edit-length"
                                type="number"
                                value={editingMaterial.length?.toString() || ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, length: parseFloat(e.target.value) || undefined})}
                                placeholder="Length"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-width">Width (mm)</Label>
                              <Input
                                id="edit-width"
                                type="number"
                                value={editingMaterial.width?.toString() || ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, width: parseFloat(e.target.value) || undefined})}
                                placeholder="Width"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-thickness">Thickness (mm)</Label>
                              <Input
                                id="edit-thickness"
                                type="number"
                                value={editingMaterial.thickness?.toString() || ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, thickness: parseFloat(e.target.value) || undefined})}
                                placeholder="Thickness"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-length">Length (mm)</Label>
                              <Input
                                id="edit-length"
                                type="number"
                                value={editingMaterial.length?.toString() || ""}
                                onChange={(e) => setEditingMaterial({...editingMaterial, length: parseFloat(e.target.value) || undefined})}
                                placeholder="Length"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-grade">Steel Grade</Label>
                    <Input
                      id="edit-grade"
                      value={editingMaterial.grade || ""}
                      onChange={(e) => setEditingMaterial({...editingMaterial, grade: e.target.value})}
                      placeholder="e.g., 300, 350, 450"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-standard">Standard</Label>
                    <Input
                      id="edit-standard"
                      value={editingMaterial.standard || ""}
                      onChange={(e) => setEditingMaterial({...editingMaterial, standard: e.target.value})}
                      placeholder="e.g., AS/NZS 3679.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-supplier" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Primary Supplier
                    </Label>
                    <div className="relative" ref={supplierDropdownRef}>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplierDropdownOpen}
                        className="w-full justify-between"
                        onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                      >
                        {editingMaterial.supplier ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {editingMaterial.supplier}
                          </div>
                        ) : (
                          "Select primary supplier"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      
                      {supplierDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[320px] overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                          {/* Search Header */}
                          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search suppliers..."
                                value={supplierSearchText}
                                onChange={(e) => setSupplierSearchText(e.target.value)}
                                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                autoFocus
                              />
                            </div>
                          </div>
                          
                          {/* Results Count */}
                          {supplierSearchText && (
                            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50/30 border-b border-gray-100">
                              {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} found
                            </div>
                          )}
                          
                          {/* Supplier List */}
                          <div className="max-h-[240px] overflow-y-auto">
                            {filteredSuppliers.map((supplier, index) => (
                              <div
                                key={supplier.id}
                                className={`group flex items-center cursor-pointer transition-all duration-150 px-3 py-2
                                  ${editingMaterial.supplier === supplier.name 
                                    ? 'bg-blue-50 border-l-3 border-blue-500' 
                                    : 'hover:bg-gray-50 border-l-3 border-transparent'
                                  }
                                  ${index !== filteredSuppliers.length - 1 ? 'border-b border-gray-100' : ''}
                                `}
                                onClick={() => {
                                  setEditingMaterial({
                                    ...editingMaterial, 
                                    supplier: supplier.name
                                  });
                                  setSupplierDropdownOpen(false);
                                  setSupplierSearchText("");
                                }}
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <div className={`mr-2.5 p-1 rounded-md transition-colors
                                    ${editingMaterial.supplier === supplier.name 
                                      ? 'bg-blue-100 text-blue-600' 
                                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                                    }`}>
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate transition-colors leading-tight
                                      ${editingMaterial.supplier === supplier.name 
                                        ? 'text-blue-900' 
                                        : 'text-gray-900 group-hover:text-gray-800'
                                      }`}>
                                      {supplier.name}
                                    </div>
                                    {supplier.city && (
                                      <div className="text-xs text-gray-500 truncate leading-tight">
                                        {supplier.city}
                                      </div>
                                    )}
                                  </div>
                                  <Check
                                    className={`ml-2 h-3.5 w-3.5 transition-all duration-200 ${
                                      editingMaterial.supplier === supplier.name 
                                        ? "opacity-100 text-blue-600" 
                                        : "opacity-0"
                                    }`}
                                  />
                                </div>
                              </div>
                            ))}
                            
                            {/* Empty State */}
                            {filteredSuppliers.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8 px-4">
                                <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                                <div className="text-sm text-gray-500 font-medium">No suppliers found</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {supplierSearchText ? 'Try adjusting your search' : 'No suppliers available'}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Footer hint */}
                          {filteredSuppliers.length > 0 && (
                            <div className="px-3 py-2 bg-gray-50/50 border-t border-gray-100">
                              <div className="text-xs text-gray-400 flex items-center justify-between">
                                <span>Click to select supplier</span>
                                <span className="font-mono">ESC to close</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Weight per Meter (kg/m)</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.01"
                    value={editingMaterial.weightPerMeter || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, weightPerMeter: parseFloat(e.target.value) || undefined})}
                    placeholder="Weight per meter"
                  />
                </div>
              </div>

              {/* Advanced Pricing with Automatic Calculations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Advanced Pricing Calculator
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-2">
                    <Calculator className="w-4 h-4 inline mr-1" />
                    Enter any pricing value - other fields will auto-calculate using weight per meter
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-price-meter" className="flex items-center gap-1">
                        Price per Meter (NZD)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Linear pricing - cost per meter of material</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="edit-price-meter"
                        type="number"
                        step="0.01"
                        value={editingMaterial.pricePerMeter?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && editingMaterial.weightPerMeter) {
                            const priceM = parseFloat(value);
                            const weightM = parseFloat(editingMaterial.weightPerMeter.toString());
                            const priceKg = calculatePricePerKg(priceM, weightM);
                            const tonRate = calculateTonRate(parseFloat(priceKg));
                            
                            setEditingMaterial({
                              ...editingMaterial, 
                              pricePerMeter: priceM,
                              pricePerKg: parseFloat(priceKg),
                              tonRate: parseFloat(tonRate)
                            });
                          } else {
                            setEditingMaterial({...editingMaterial, pricePerMeter: value ? parseFloat(value) : undefined});
                          }
                        }}
                        placeholder="0.00"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-price-kg" className="flex items-center gap-1">
                        Price per Kg (NZD)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Weight-based pricing - cost per kilogram</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="edit-price-kg"
                        type="number"
                        step="0.01"
                        value={editingMaterial.pricePerKg?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && editingMaterial.weightPerMeter) {
                            const priceKg = parseFloat(value);
                            const weightM = parseFloat(editingMaterial.weightPerMeter.toString());
                            const priceM = calculatePricePerMeter(priceKg, weightM);
                            const tonRate = calculateTonRate(priceKg);
                            
                            setEditingMaterial({
                              ...editingMaterial, 
                              pricePerKg: priceKg,
                              pricePerMeter: parseFloat(priceM),
                              tonRate: parseFloat(tonRate)
                            });
                          } else {
                            setEditingMaterial({...editingMaterial, pricePerKg: value ? parseFloat(value) : undefined});
                          }
                        }}
                        placeholder="0.00"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-ton-rate" className="flex items-center gap-1">
                        Ton Rate (NZD)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Bulk pricing - cost per metric tonne</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="edit-ton-rate"
                        type="number"
                        step="0.01"
                        value={editingMaterial.tonRate?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && editingMaterial.weightPerMeter) {
                            const tonRate = parseFloat(value);
                            const priceKg = calculatePricePerKgFromTonRate(tonRate);
                            const weightM = parseFloat(editingMaterial.weightPerMeter.toString());
                            const priceM = calculatePricePerMeter(parseFloat(priceKg), weightM);
                            
                            setEditingMaterial({
                              ...editingMaterial, 
                              tonRate: tonRate,
                              pricePerKg: parseFloat(priceKg),
                              pricePerMeter: parseFloat(priceM)
                            });
                          } else {
                            setEditingMaterial({...editingMaterial, tonRate: value ? parseFloat(value) : undefined});
                          }
                        }}
                        placeholder="0.00"
                        className="bg-white"
                      />
                    </div>
                  </div>
                  {editingMaterial.weightPerMeter && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-600">
                        Weight: {editingMaterial.weightPerMeter} kg/m | 
                        {editingMaterial.pricePerMeter && editingMaterial.pricePerKg && editingMaterial.tonRate && (
                          <span className="ml-1">
                            Calculations: {formatCurrency(editingMaterial.pricePerMeter)}/m = {formatCurrency(editingMaterial.pricePerKg)}/kg = {formatCurrency(editingMaterial.tonRate)}/t
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {!editingMaterial.weightPerMeter && (
                    <div className="mt-3 pt-3 border-t border-orange-200 bg-orange-50 p-2 rounded">
                      <p className="text-xs text-orange-600">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Weight per meter required for automatic price calculations
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Surface Area Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Surface Area for Coating</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-surface-area" className="flex items-center gap-2">
                      Surface Area per Meter (m²/m)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground hover:text-blue-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">Surface area per linear meter for coating calculations</p>
                              <p className="text-xs text-muted-foreground">Edit to override calculated value</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="edit-surface-area"
                      type="number"
                      step="0.0001"
                      value={(() => {
                        // Display calculated value if dimensions are available, otherwise stored value
                        if (editingMaterial.width && editingMaterial.category) {
                          const dimensions = {
                            width: parseFloat(editingMaterial.width),
                            depth: editingMaterial.depth ? parseFloat(editingMaterial.depth) : parseFloat(editingMaterial.width),
                            webThickness: editingMaterial.webTw ? parseFloat(editingMaterial.webTw.toString()) : (editingMaterial.thickness ? parseFloat(editingMaterial.thickness.toString()) : 0),
                            flangeThickness: editingMaterial.flangeTf ? parseFloat(editingMaterial.flangeTf.toString()) : (editingMaterial.thickness ? parseFloat(editingMaterial.thickness.toString()) : 0),
                            thickness: editingMaterial.thickness ? parseFloat(editingMaterial.thickness.toString()) : 0,
                            width1: editingMaterial.width1 ? parseFloat(editingMaterial.width1.toString()) : undefined,
                            width2: editingMaterial.width2 ? parseFloat(editingMaterial.width2.toString()) : undefined
                          };
                          
                          const result = calculateUnifiedSurfaceArea(
                            editingMaterial.category,
                            dimensions,
                            editingMaterial.coatingConfig?.type as 'external-only' | 'internal-only' | 'external-internal' || 'external-internal'
                          );
                          
                          return result.total.toFixed(3);
                        }
                        return editingMaterial.surfaceAreaPerMeter || "";
                      })()}
                      onChange={(e) => setEditingMaterial({...editingMaterial, surfaceAreaPerMeter: e.target.value})}
                      placeholder="0.0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-coating-config">Coating Configuration</Label>
                    <Select 
                      value={editingMaterial.coatingConfig?.type || "external-internal"}
                      onValueChange={(value) => {
                        // Calculate surface area based on configuration type using unified system
                        let calculatedSurfaceArea = editingMaterial.surfaceAreaPerMeter;
                        
                        if (value !== 'custom' && editingMaterial.category) {
                          // Check if it's a round material that needs diameter instead of width
                          const isRoundMaterial = editingMaterial.category.toLowerCase().includes('round') || 
                                                 editingMaterial.category.toLowerCase().includes('pipe') || 
                                                 editingMaterial.category.toLowerCase().includes('reinforc');
                          
                          const dimensions = {
                            width: editingMaterial.width ? parseFloat(editingMaterial.width) : 0,
                            depth: editingMaterial.depth ? parseFloat(editingMaterial.depth) : (editingMaterial.width ? parseFloat(editingMaterial.width) : 0),
                            webThickness: editingMaterial.webTw ? parseFloat(editingMaterial.webTw.toString()) : (editingMaterial.thickness ? parseFloat(editingMaterial.thickness.toString()) : 0),
                            flangeThickness: editingMaterial.flangeTf ? parseFloat(editingMaterial.flangeTf.toString()) : (editingMaterial.thickness ? parseFloat(editingMaterial.thickness.toString()) : 0),
                            thickness: editingMaterial.thickness ? parseFloat(editingMaterial.thickness.toString()) : 0,
                            diameter: isRoundMaterial && editingMaterial.diameter ? parseFloat(editingMaterial.diameter.toString()) : undefined,
                            width1: editingMaterial.width1 ? parseFloat(editingMaterial.width1.toString()) : undefined,
                            width2: editingMaterial.width2 ? parseFloat(editingMaterial.width2.toString()) : undefined
                          };
                          
                          const result = calculateUnifiedSurfaceArea(
                            editingMaterial.category,
                            dimensions,
                            value as 'external-only' | 'internal-only' | 'external-internal'
                          );
                          
                          calculatedSurfaceArea = result.total.toFixed(3);
                        }
                        
                        setEditingMaterial({
                          ...editingMaterial, 
                          coatingConfig: { type: value, faces: [] },
                          surfaceAreaPerMeter: value !== 'custom' ? calculatedSurfaceArea : editingMaterial.surfaceAreaPerMeter
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coating type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external-only">External Only</SelectItem>
                        <SelectItem value="internal-only">Internal Only</SelectItem>
                        <SelectItem value="external-internal">External + Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Available Lengths */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Available Lengths</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-lengths">Length Options (semicolon separated)</Label>
                  <Input
                    id="edit-lengths"
                    value={editingMaterial.lengthOptions || ""}
                    onChange={(e) => setEditingMaterial({...editingMaterial, lengthOptions: e.target.value})}
                    placeholder="e.g., 6.0;9.0;12.0 or 3.0x1.5;6.0x2.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    For linear materials use "6.0;9.0;12.0", for sheets use "3.0x1.5;6.0x2.0"
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingMaterial(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  editMaterialMutation.mutate({
                    id: editingMaterial.id,
                    material: {
                      name: editingMaterial.name,
                      code: editingMaterial.code,
                      width: editingMaterial.width !== undefined && editingMaterial.width !== null && editingMaterial.width !== '' ? String(editingMaterial.width) : null,
                      thickness: editingMaterial.thickness !== undefined && editingMaterial.thickness !== null && editingMaterial.thickness !== '' ? String(editingMaterial.thickness) : null,
                      diameter: editingMaterial.diameter !== undefined && editingMaterial.diameter !== null && editingMaterial.diameter !== '' ? String(editingMaterial.diameter) : null,
                      length: editingMaterial.length !== undefined && editingMaterial.length !== null && editingMaterial.length !== '' ? String(editingMaterial.length) : null,
                      grade: editingMaterial.grade && editingMaterial.grade !== '' ? editingMaterial.grade : null,
                      standard: editingMaterial.standard && editingMaterial.standard !== '' ? editingMaterial.standard : null,
                      weightPerMeter: editingMaterial.weightPerMeter !== undefined && editingMaterial.weightPerMeter !== null && editingMaterial.weightPerMeter !== '' ? String(editingMaterial.weightPerMeter) : null,
                      pricePerMeter: editingMaterial.pricePerMeter !== undefined && editingMaterial.pricePerMeter !== null && editingMaterial.pricePerMeter !== '' ? String(editingMaterial.pricePerMeter) : null,
                      pricePerKg: editingMaterial.pricePerKg !== undefined && editingMaterial.pricePerKg !== null && editingMaterial.pricePerKg !== '' ? String(editingMaterial.pricePerKg) : null,
                      lengthOptions: editingMaterial.lengthOptions,
                      webTw: editingMaterial.webTw !== undefined && editingMaterial.webTw !== null && editingMaterial.webTw !== '' ? String(editingMaterial.webTw) : null,
                      flangeTf: editingMaterial.flangeTf !== undefined && editingMaterial.flangeTf !== null && editingMaterial.flangeTf !== '' ? String(editingMaterial.flangeTf) : null,
                      surfaceAreaPerMeter: editingMaterial.surfaceAreaPerMeter,
                      coatingConfig: editingMaterial.coatingConfig,
                      supplier: editingMaterial.supplier
                    }
                  });
                }}
                disabled={editMaterialMutation.isPending}
              >
                {editMaterialMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Surface Area Manager Dialog */}
      {surfaceAreaMaterial && (
        <Dialog open={!!surfaceAreaMaterial} onOpenChange={() => setSurfaceAreaMaterial(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Surface Area Calculator - {surfaceAreaMaterial.name}</DialogTitle>
              <DialogDescription>
                Calculate surface area for coating and paint estimates
              </DialogDescription>
            </DialogHeader>
            <SurfaceAreaManager
              material={surfaceAreaMaterial}
              onSave={(surfaceArea) => {
                updateSurfaceAreaMutation.mutate({
                  id: surfaceAreaMaterial.id,
                  surfaceAreaPerMeter: surfaceArea
                });
              }}
              onClose={() => setSurfaceAreaMaterial(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Add New Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Add New Supplier
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a comprehensive supplier profile with business details and contacts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Company Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="supplier-company-name" className="text-sm font-medium text-foreground">
                  Company/Supplier Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="supplier-company-name"
                  value={newSupplierData.name}
                  onChange={(e) => setNewSupplierData({...newSupplierData, name: e.target.value})}
                  placeholder="Enter company or supplier name"
                />
              </div>

              {/* NZ Business Registration */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-nzbn" className="text-sm font-medium text-foreground">
                    NZBN
                  </Label>
                  <Input
                    id="supplier-nzbn"
                    value={newSupplierData.nzbn}
                    onChange={(e) => setNewSupplierData({...newSupplierData, nzbn: e.target.value})}
                    placeholder="9429000000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-gst" className="text-sm font-medium text-foreground">
                    GST Number
                  </Label>
                  <Input
                    id="supplier-gst"
                    value={newSupplierData.gstNumber}
                    onChange={(e) => setNewSupplierData({...newSupplierData, gstNumber: e.target.value})}
                    placeholder="123-456-789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-company-num" className="text-sm font-medium text-foreground">
                    Company Number
                  </Label>
                  <Input
                    id="supplier-company-num"
                    value={newSupplierData.companyNumber}
                    onChange={(e) => setNewSupplierData({...newSupplierData, companyNumber: e.target.value})}
                    placeholder="1234567"
                  />
                </div>
              </div>

              {/* Address Information with Smart Search */}
              <div className="space-y-2 relative">
                <Label htmlFor="supplier-address" className="text-sm font-medium text-foreground">
                  Address
                </Label>
                <div className="relative">
                  <Input
                    id="supplier-address"
                    value={newSupplierData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="Start typing address (e.g., 123 Queen Street, Auckland)..."
                    className="pr-8"
                  />
                  {isSearchingAddress && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {/* Address Suggestions Dropdown */}
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          onClick={() => selectAddress(suggestion)}
                        >
                          <div className="font-medium text-foreground">{suggestion.display_name}</div>
                          {suggestion.city && suggestion.postcode && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {suggestion.city} {suggestion.postcode}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-city" className="text-sm font-medium text-foreground">
                    City
                  </Label>
                  <Input
                    id="supplier-city"
                    value={newSupplierData.city}
                    onChange={(e) => setNewSupplierData({...newSupplierData, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-postcode" className="text-sm font-medium text-foreground">
                    Postcode
                  </Label>
                  <Input
                    id="supplier-postcode"
                    value={newSupplierData.postcode}
                    onChange={(e) => setNewSupplierData({...newSupplierData, postcode: e.target.value})}
                    placeholder="0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-terms" className="text-sm font-medium text-foreground">
                  Payment Terms
                </Label>
                <Select 
                  value={newSupplierData.paymentTerms} 
                  onValueChange={(value) => setNewSupplierData({...newSupplierData, paymentTerms: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7 days">7 days</SelectItem>
                    <SelectItem value="14 days">14 days</SelectItem>
                    <SelectItem value="30 days">30 days</SelectItem>
                    <SelectItem value="60 days">60 days</SelectItem>
                    <SelectItem value="90 days">90 days</SelectItem>
                    <SelectItem value="Cash on delivery">Cash on delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex-1">Contact Information</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewSupplierData({
                      ...newSupplierData,
                      contacts: [...newSupplierData.contacts, {
                        name: "",
                        title: "",
                        email: "",
                        phone: "",
                        mobile: "",
                        department: "Sales",
                        isPrimary: false
                      }]
                    });
                  }}
                  className="ml-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Contact
                </Button>
              </div>

              {newSupplierData.contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">
                      Contact {index + 1} {contact.isPrimary && <span className="text-blue-600">(Primary)</span>}
                    </h4>
                    {newSupplierData.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedContacts = newSupplierData.contacts.filter((_, i) => i !== index);
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => {
                          const updatedContacts = [...newSupplierData.contacts];
                          updatedContacts[index].name = e.target.value;
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                        placeholder="Contact name"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                      <Input
                        value={contact.title}
                        onChange={(e) => {
                          const updatedContacts = [...newSupplierData.contacts];
                          updatedContacts[index].title = e.target.value;
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                        placeholder="Job title"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => {
                          const updatedContacts = [...newSupplierData.contacts];
                          updatedContacts[index].email = e.target.value;
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                        placeholder="email@company.com"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => {
                          const updatedContacts = [...newSupplierData.contacts];
                          updatedContacts[index].phone = e.target.value;
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                        placeholder="Office phone"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Mobile</Label>
                      <Input
                        value={contact.mobile}
                        onChange={(e) => {
                          const updatedContacts = [...newSupplierData.contacts];
                          updatedContacts[index].mobile = e.target.value;
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                        placeholder="Mobile phone"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Department</Label>
                      <Select 
                        value={contact.department}
                        onValueChange={(value) => {
                          const updatedContacts = [...newSupplierData.contacts];
                          updatedContacts[index].department = value;
                          setNewSupplierData({...newSupplierData, contacts: updatedContacts});
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Accounts">Accounts</SelectItem>
                          <SelectItem value="Technical">Technical</SelectItem>
                          <SelectItem value="Management">Management</SelectItem>
                          <SelectItem value="Customer Service">Customer Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddSupplierDialog(false);
                setNewSupplierData({
                  name: "",
                  address: "",
                  city: "",
                  postcode: "",
                  nzbn: "",
                  gstNumber: "",
                  companyNumber: "",
                  paymentTerms: "30 days",
                  contacts: [{
                    name: "",
                    title: "",
                    email: "",
                    phone: "",
                    mobile: "",
                    department: "Sales",
                    isPrimary: true
                  }]
                });
              }}
              disabled={addSupplierMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (newSupplierData.name.trim()) {
                  addSupplierMutation.mutate({
                    name: newSupplierData.name.trim(),
                    address: newSupplierData.address.trim(),
                    city: newSupplierData.city.trim(),
                    postcode: newSupplierData.postcode.trim(),
                    nzbn: newSupplierData.nzbn.trim(),
                    gstNumber: newSupplierData.gstNumber.trim(),
                    companyNumber: newSupplierData.companyNumber.trim(),
                    paymentTerms: newSupplierData.paymentTerms,
                    type: "supplier",
                    contacts: newSupplierData.contacts.filter(c => c.name.trim())
                  });
                }
              }}
              disabled={!newSupplierData.name.trim() || addSupplierMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {addSupplierMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supplier
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}