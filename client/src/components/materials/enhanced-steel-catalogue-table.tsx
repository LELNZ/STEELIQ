import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MaterialTypeIndicator } from "./material-icons";
import { Edit, Trash2, Calculator, AlertCircle } from "lucide-react";
import { Material } from "@shared/schema";
import MaterialEditModal from "./material-edit-modal";
import SurfaceAreaManager from "./surface-area-manager";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EnhancedSteelCatalogueTableProps {
  materials: Material[];
  selectedMaterials?: Set<number>;
  onMaterialSelect?: (id: number) => void;
}

export function EnhancedSteelCatalogueTable({
  materials,
  selectedMaterials,
  onMaterialSelect,
}: EnhancedSteelCatalogueTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [surfaceAreaModalOpen, setSurfaceAreaModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/materials/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Material Deleted",
        description: "Material has been removed from the catalog.",
      });
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setEditModalOpen(true);
  };

  const handleDelete = (material: Material) => {
    setMaterialToDelete(material);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (materialToDelete) {
      deleteMutation.mutate(materialToDelete.id);
    }
  };

  const handleSurfaceAreaCalculator = (material: Material) => {
    setSelectedMaterial(material);
    setSurfaceAreaModalOpen(true);
  };

  const handleSurfaceAreaSave = (surfaceArea: number) => {
    setSurfaceAreaModalOpen(false);
    toast({
      title: "Surface Area Updated",
      description: `Surface area calculated: ${surfaceArea.toFixed(4)} m²/m`,
    });
    // Refresh data to show updated surface area
    queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
  };

  const formatDimensions = (material: Material) => {
    const parts = [];
    if (material.width) parts.push(`W: ${material.width}mm`);
    if (material.thickness) parts.push(`T: ${material.thickness}mm`);
    if (material.depth) parts.push(`D: ${material.depth}mm`);
    if (material.diameter) parts.push(`Ø: ${material.diameter}mm`);
    return parts.join(" × ") || "—";
  };

  const formatWeight = (weight: string | null) => {
    if (!weight) return "—";
    const numWeight = parseFloat(weight);
    return isNaN(numWeight) ? "—" : `${numWeight.toFixed(3)} kg/m`;
  };

  const formatSurfaceArea = (area: string | null) => {
    if (!area) return "—";
    const numArea = parseFloat(area);
    return isNaN(numArea) ? "—" : `${numArea.toFixed(4)} m²/m`;
  };

  return (
    <>
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
                    className={selectedMaterials?.has(material.id) ? 'bg-blue-50 dark:bg-blue-950' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {onMaterialSelect && (
                          <Checkbox
                            checked={selectedMaterials?.has(material.id) || false}
                            onCheckedChange={() => onMaterialSelect(material.id)}
                          />
                        )}
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
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDimensions(material)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {formatWeight(material.weightPerMeter)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {formatSurfaceArea(material.surfaceAreaPerMeter)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSurfaceAreaCalculator(material)}
                          className="h-6 w-6 p-0"
                          title="Surface Area Calculator"
                        >
                          <Calculator className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {material.grade ? (
                        <Badge variant="secondary" className="text-xs">
                          {material.grade}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-xs text-gray-600 dark:text-gray-400 max-w-[120px] truncate">
                        {material.standard || "—"}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(material)}
                          className="h-8 w-8 p-0"
                          title="Edit Material"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(material)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete Material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Material Modal */}
      <MaterialEditModal
        material={selectedMaterial}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedMaterial(null);
        }}
        mode="edit"
      />

      {/* Surface Area Calculator Modal */}
      {selectedMaterial && (
        <Dialog open={surfaceAreaModalOpen} onOpenChange={setSurfaceAreaModalOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
            <div className="max-h-[95vh] overflow-y-auto">
              <SurfaceAreaManager
                material={selectedMaterial}
                onSave={handleSurfaceAreaSave}
                onClose={() => setSurfaceAreaModalOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Delete Material
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{materialToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}