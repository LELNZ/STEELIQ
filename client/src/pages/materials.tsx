import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialUpload from "@/components/materials/material-upload";
import { SteelCatalogueOnly } from "@/components/materials/steel-catalogue-only";
import { ConsumablesCleanFixed } from "@/components/materials/consumables-clean-fixed";
import CoatingSystemsConsumableStyle from "@/components/materials/coating-systems-consumable-style";
import { useQuery } from "@tanstack/react-query";
import { Material, Supplier, ConnectionComponent } from "@shared/schema";
import { Plus, Upload, Download, Search, Package, Wrench } from "lucide-react";

export default function Materials() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load materials and suppliers for components
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: connectionComponents = [] } = useQuery<ConnectionComponent[]>({
    queryKey: ["/api/connection-components"],
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/materials/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "materials.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Library</h1>
          <p className="text-sm text-muted-foreground">Manage your steel catalogue with organized categories and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            variant="outline"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Material Library with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steel-catalogue" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-12 bg-muted/50 rounded-lg p-1">
              <TabsTrigger 
                value="steel-catalogue" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Steel Catalogue
              </TabsTrigger>
              <TabsTrigger 
                value="consumables" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Consumables
              </TabsTrigger>
              <TabsTrigger 
                value="coating-systems" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Coating Systems
              </TabsTrigger>
              <TabsTrigger 
                value="connections" 
                className="text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Connections ({connectionComponents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steel-catalogue" className="space-y-6">
              <SteelCatalogueOnly />
            </TabsContent>

            <TabsContent value="consumables">
              <ConsumablesCleanFixed 
                materials={materials}
                suppliers={suppliers}
              />
            </TabsContent>

            <TabsContent value="coating-systems">
              <CoatingSystemsConsumableStyle />
            </TabsContent>

            <TabsContent value="connections" className="space-y-4">
              <ConnectionComponentsTab connectionComponents={connectionComponents} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <MaterialUpload 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
      />
    </div>
  );
}

// Connection Components Tab Component - Consistent with other tabs
function ConnectionComponentsTab({ connectionComponents }: { connectionComponents: ConnectionComponent[] }) {
  const [selectedSectionType, setSelectedSectionType] = useState("All Sections");
  const [selectedComponentType, setSelectedComponentType] = useState("All Components");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Extract section types from compatibility data
  const getSectionType = (sectionCompatibility: string): string => {
    if (sectionCompatibility.includes('PFC')) return 'PFC';
    if (sectionCompatibility.includes('UB')) return 'UB';
    if (sectionCompatibility.includes('UC')) return 'UC';
    if (sectionCompatibility.includes('WB')) return 'WB';
    if (sectionCompatibility.includes('WC')) return 'WC';
    return 'Other';
  };

  // Get unique section types for filtering
  const sectionTypes = ['All Sections', ...Array.from(new Set(connectionComponents.map(c => getSectionType(c.section_compatibility))))];
  
  // Get unique component types for filtering
  const componentTypes = ['All Components', ...Array.from(new Set(connectionComponents.map(c => c.component_type.replace('_', ' '))))];

  // Filter components based on selections and search
  const filteredComponents = connectionComponents.filter(component => {
    const matchesSection = selectedSectionType === 'All Sections' || getSectionType(component.section_compatibility) === selectedSectionType;
    const matchesComponent = selectedComponentType === 'All Components' || component.component_type.replace('_', ' ') === selectedComponentType;
    const matchesSearch = !searchQuery || 
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.section_compatibility.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.component_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSection && matchesComponent && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Connection Components</h3>
          <p className="text-sm text-muted-foreground">
            {filteredComponents.length} of {connectionComponents.length} connection components shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            data-testid="button-add-connection"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search connections by name, section, or type..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-connections"
        />
      </div>

      {/* Section Type Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto">
        {sectionTypes.map((sectionType) => (
          <Button
            key={sectionType}
            variant={selectedSectionType === sectionType ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSectionType(sectionType)}
            className="whitespace-nowrap"
            data-testid={`filter-section-${sectionType.toLowerCase().replace(' ', '-')}`}
          >
            {sectionType}
            {sectionType !== 'All Sections' && (
              <span className="ml-1 text-xs">
                ({connectionComponents.filter(c => getSectionType(c.section_compatibility) === sectionType).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Component Type Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto">
        {componentTypes.map((componentType) => (
          <Button
            key={componentType}
            variant={selectedComponentType === componentType ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedComponentType(componentType)}
            className="whitespace-nowrap"
            data-testid={`filter-component-${componentType.toLowerCase().replace(' ', '-')}`}
          >
            {componentType}
            {componentType !== 'All Components' && (
              <span className="ml-1 text-xs">
                ({connectionComponents.filter(c => c.component_type.replace('_', ' ') === componentType).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Components Grid */}
      {filteredComponents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComponents.map((component) => (
            <Card key={component.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-sm font-medium leading-tight">
                      {component.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`button-edit-${component.id}`}>
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" data-testid={`button-delete-${component.id}`}>
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {component.component_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                    {component.section_compatibility}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Height</p>
                    <p className="font-medium">{component.height}mm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Width</p>
                    <p className="font-medium">{component.width}mm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Thickness</p>
                    <p className="font-medium">{component.thickness}mm</p>
                  </div>
                </div>

                {/* Weld Time and Grade */}
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Weld Time</p>
                    <p className="font-medium text-green-600">{component.weld_time_per_hour} h/h</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Grade</p>
                    <p className="font-medium">{component.material_grade || '250'}</p>
                  </div>
                </div>

                {/* Weight and Surface Area (if available) */}
                {(component.weight || component.surface_area) && (
                  <div className="flex items-center justify-between text-xs">
                    {component.weight && (
                      <div>
                        <p className="text-muted-foreground">Weight</p>
                        <p className="font-medium">{component.weight} kg</p>
                      </div>
                    )}
                    {component.surface_area && (
                      <div className="text-right">
                        <p className="text-muted-foreground">Surface</p>
                        <p className="font-medium">{component.surface_area} m²</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard */}
                {component.standard && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground">Standard: {component.standard}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No connection components found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || selectedSectionType !== 'All Sections' || selectedComponentType !== 'All Components'
              ? 'Try adjusting your filters or search terms'
              : 'Add your first connection component to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
}
