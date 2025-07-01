import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionIcons } from "@/components/ui/action-icons";
import { MaterialTypeIndicator } from "./material-icons";
import { Material } from "@shared/schema";
import { calculateMaterialSurfaceArea as calculateUnifiedSurfaceArea } from "@/lib/unified-surface-area-calculator";

interface SteelCatalogueTableProps {
  materials: Material[];
  selectedMaterials: Set<number>;
  onMaterialSelect: (id: number) => void;
  onEditMaterial: (material: Material) => void;
  onDeleteMaterial: (id: number) => void;
}

export function SteelCatalogueTable({
  materials,
  selectedMaterials,
  onMaterialSelect,
  onEditMaterial,
  onDeleteMaterial
}: SteelCatalogueTableProps) {
  
  const renderDimensions = (material: Material) => {
    const isRoundMaterial = material.category?.toLowerCase().includes('round') || 
                           material.category?.toLowerCase().includes('pipe') || 
                           material.category?.toLowerCase().includes('chs') ||
                           material.category?.toLowerCase().includes('reinforc');
    
    if (isRoundMaterial) {
      return (
        <div>
          <p className="text-sm">⌀: {material.diameter || 'N/A'}mm</p>
          {material.thickness && <p className="text-sm">T: {material.thickness}mm</p>}
        </div>
      );
    }
    
    // Handle unequal angles
    if (material.category?.toLowerCase().includes('unequal') && material.category?.toLowerCase().includes('angle')) {
      return (
        <div>
          <p className="text-sm">W1: {material.width1 ? parseFloat(String(material.width1)).toFixed(0) : 'N/A'}mm</p>
          <p className="text-sm">W2: {material.width2 ? parseFloat(String(material.width2)).toFixed(0) : 'N/A'}mm</p>
          <p className="text-sm">T: {material.thickness || 'N/A'}mm</p>
        </div>
      );
    }
    
    // Handle sheet/plate materials
    if (material.category?.toLowerCase().includes('sheet') || 
        material.category?.toLowerCase().includes('plate') ||
        material.name.toLowerCase().includes('sheet') ||
        material.name.toLowerCase().includes('plate')) {
      return (
        <div>
          <p className="text-sm">W: {material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
          <p className="text-sm">L: {material.length ? parseFloat(material.length.toString()).toFixed(0) : 'N/A'}mm</p>
          <p className="text-sm">T: {material.thickness || 'N/A'}mm</p>
        </div>
      );
    }
    
    // Handle structural sections (channels, beams, columns)
    if (material.category?.toLowerCase().includes('channel') || 
        material.category?.toLowerCase().includes('structural channels') ||
        material.category?.toLowerCase().includes('universal beam') ||
        material.category?.toLowerCase().includes('universal column')) {
      return (
        <div>
          <p className="text-sm">W: {material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
          {material.depth && <p className="text-sm">D: {material.depth}mm</p>}
          <p className="text-sm">Web: {material.webTw || 'N/A'}mm</p>
          <p className="text-sm">Flange: {material.flangeTf || 'N/A'}mm</p>
        </div>
      );
    }
    
    // Standard dimensions for other materials
    return (
      <div>
        <p className="text-sm">W: {material.width ? parseFloat(material.width.toString()).toFixed(0) : 'N/A'}mm</p>
        {material.depth && <p className="text-sm">D: {material.depth}mm</p>}
        <p className="text-sm">T: {material.thickness || 'N/A'}mm</p>
      </div>
    );
  };

  const calculateSurfaceArea = (material: Material) => {
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
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Details</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Surface Area</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material: Material) => (
                <TableRow 
                  key={material.id}
                  className={selectedMaterials.has(material.id) ? 'bg-blue-50' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => onMaterialSelect(material.id)}
                      />
                      <MaterialTypeIndicator 
                        category={material.category || ""} 
                        name={material.name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{material.name}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{material.code}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{material.category}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderDimensions(material)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{material.weightPerMeter || 0} kg/m</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-blue-600">
                      {calculateSurfaceArea(material)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{material.grade || 'Standard'}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{material.standard || 'AS/NZS'}</p>
                  </TableCell>
                  <TableCell>
                    <ActionIcons
                      onEdit={() => onEditMaterial(material)}
                      onDelete={() => onDeleteMaterial(material.id)}
                      editTitle="Edit Material"
                      deleteTitle="Delete Material"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}