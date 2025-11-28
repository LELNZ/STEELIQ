import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

const consumableFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  brand: z.string().min(1, "Brand/Manufacturer is required"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  packSize: z.string().min(1, "Pack size is required"),
  specifications: z.string().optional(),
  pricePerUnit: z.string().min(1, "Price per unit is required"),
  bulkPricing: z.string().optional(),
  minimumStock: z.string().min(1, "Minimum stock level is required"),
  currentStock: z.string().min(1, "Current stock is required"),
  storageLocation: z.string().optional(),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
});

type ConsumableFormData = z.infer<typeof consumableFormSchema>;

const DEFAULT_CATEGORIES = [
  "Welding",
  "Cutting", 
  "Fasteners",
  "Gas",
  "Safety"
];

const WELDING_SUBCATEGORIES = ["Rods", "Wire", "Flux"];
const CUTTING_SUBCATEGORIES = ["Discs", "Blades"];
const FASTENERS_SUBCATEGORIES = ["Bolts", "Screws", "Nuts", "Washers", "Structural Assemblies", "Threaded Rod"];
const GAS_SUBCATEGORIES = ["Oxygen", "Acetylene", "MIG - Arcal 21 Small", "MIG - Arcal 21 Medium", "MIG - Arcal 21 Large", "TIG - Argon Small", "TIG - Argon Medium", "TIG - Argon Large"];
const SAFETY_SUBCATEGORIES = ["Gloves", "Helmets", "3M Respirators", "Filters", "Lenses"];

const UNIT_OPTIONS = ["Each", "Box", "Roll", "Kg", "Pack", "Set", "Meter", "Liter"];

interface ConsumableAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: any[];
}

export function ConsumableAddModal({ open, onOpenChange, suppliers }: ConsumableAddModalProps) {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ConsumableFormData>({
    resolver: zodResolver(consumableFormSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "",
      customCategory: "",
      brand: "",
      unitOfMeasure: "",
      packSize: "",
      specifications: "",
      pricePerUnit: "",
      bulkPricing: "",
      minimumStock: "",
      currentStock: "",
      storageLocation: "",
      supplierId: "",
      notes: "",
    },
  });

  const addConsumableMutation = useMutation({
    mutationFn: async (data: ConsumableFormData) => {
      const processedData = {
        // Required fields matching API schema (camelCase)
        code: data.code,
        name: data.name,
        category: data.customCategory || data.category,
        // Dimension fields as strings
        thickness: "0",
        width: "0", 
        diameter: "0",
        depth: "0",
        // Weight and surface area (camelCase for API)
        weightPerMeter: 0,
        surfaceAreaPerMeter: 0,
        // Pricing fields (camelCase for API)
        pricePerKg: parseFloat(data.pricePerUnit) || 0,
        pricePerMeter: parseFloat(data.pricePerUnit) || 0,
        unitCost: parseFloat(data.pricePerUnit) || 0,
        // Material specifications
        standard: data.specifications || "",
        grade: data.brand,
        supplier: data.supplierId ? `supplier_${data.supplierId}` : "",
      };

      return await apiRequest("/api/materials", "POST", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Consumable Added",
        description: "Consumable has been successfully added to the catalog.",
      });
      onOpenChange(false);
      form.reset();
      setCustomCategories([]);
      setSelectedCategory("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add consumable: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const addCustomCategory = () => {
    if (newCategoryInput.trim() && !customCategories.includes(newCategoryInput.trim())) {
      setCustomCategories([...customCategories, newCategoryInput.trim()]);
      setNewCategoryInput("");
    }
  };

  const removeCustomCategory = (category: string) => {
    setCustomCategories(customCategories.filter(c => c !== category));
  };

  const getSubcategories = (category: string) => {
    switch (category) {
      case "Welding": return WELDING_SUBCATEGORIES;
      case "Cutting": return CUTTING_SUBCATEGORIES;
      case "Fasteners": return FASTENERS_SUBCATEGORIES;
      case "Gas": return GAS_SUBCATEGORIES;
      case "Safety": return SAFETY_SUBCATEGORIES;
      default: return [];
    }
  };

  const onSubmit = (data: ConsumableFormData) => {
    addConsumableMutation.mutate(data);
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Consumable</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3.2mm E7018 Welding Rods" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., WR-E7018-3.2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCategory(value);
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom Category Addition */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Add New Category</label>
                  <Input
                    placeholder="Enter new category name"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
                  />
                </div>
                <Button type="button" onClick={addCustomCategory} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Display Custom Categories */}
              {customCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customCategories.map((category) => (
                    <Badge key={category} variant="secondary" className="flex items-center gap-1">
                      {category}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeCustomCategory(category)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Subcategory for selected category */}
              {selectedCategory && getSubcategories(selectedCategory).length > 0 && (
                <FormField
                  control={form.control}
                  name="customCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedCategory} Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${selectedCategory.toLowerCase()} type`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getSubcategories(selectedCategory).map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand/Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lincoln Electric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specifications</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3.2mm diameter, AWS A5.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Unit & Packaging */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="packSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pack Size/Quantity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 5kg box, 100 pieces" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Unit (NZD)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 45.50" type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bulkPricing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bulk Pricing (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10+ units: $40.00 each" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Stock Management */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 25" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 5" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storageLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Workshop-A3" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this consumable..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addConsumableMutation.isPending}>
                {addConsumableMutation.isPending ? "Adding..." : "Add Consumable"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}