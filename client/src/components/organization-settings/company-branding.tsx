import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save, Loader2, X, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { OrganizationSetting } from "@shared/schema";

const brandingSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logoPath: z.string().optional(),
  logoFile: z.any().optional(),
  enableWatermark: z.boolean().default(false),
  watermarkOpacity: z.number().min(0.05).max(0.5).default(0.15),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

export default function CompanyBranding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch current branding settings
  const { data: brandingData, isLoading } = useQuery<OrganizationSetting>({
    queryKey: ["/api/organization/settings/branding"],
  });

  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      companyName: "",
      tagline: "",
      description: "",
      logoPath: "",
      enableWatermark: false,
      watermarkOpacity: 0.15,
    },
  });

  useEffect(() => {
    if (brandingData?.settingValue) {
      const values = brandingData.settingValue as any;
      form.reset({
        companyName: values.companyName || "",
        tagline: values.tagline || "",
        description: values.description || "",
        logoPath: values.logoPath || "",
        enableWatermark: values.enableWatermark || false,
        watermarkOpacity: values.watermarkOpacity || 0.15,
      });
      if (values.logoPath) {
        setLogoPreview(values.logoPath);
      }
    }
  }, [brandingData, form]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      let finalLogoPath = data.logoPath;

      // Handle logo upload if new file selected
      if (data.logoFile instanceof File) {
        const formData = new FormData();
        formData.append("logo", data.logoFile);
        
        // Use native fetch for file upload since apiRequest expects JSON
        const uploadRes = await fetch("/api/organization/upload-logo", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!uploadRes.ok) {
          throw new Error("Failed to upload logo");
        }
        
        const uploadResponse = await uploadRes.json();
        finalLogoPath = uploadResponse.path;
      }

      const brandingSettings = {
        companyName: data.companyName,
        tagline: data.tagline,
        description: data.description,
        logoPath: finalLogoPath,
        enableWatermark: data.enableWatermark,
        watermarkOpacity: data.watermarkOpacity,
      };

      return apiRequest("/api/organization/settings", "PUT", {
        settingKey: "branding",
        settingValue: brandingSettings,
        settingType: "branding",
        description: "Company branding and logo settings"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/settings/branding"] });
      toast({
        title: "Success",
        description: "Company branding updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branding",
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Logo file size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Please upload a PNG, JPG, SVG, or WebP image",
          variant: "destructive",
        });
        return;
      }

      form.setValue("logoFile", file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: BrandingFormData) => {
    updateBrandingMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Company Branding</h2>
        <p className="text-muted-foreground mt-1">
          Configure your company logo, name, and branding elements
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your company identity and branding details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Lateral Engineering Limited" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Excellence in Steel Fabrication" />
                    </FormControl>
                    <FormDescription>
                      Optional tagline that appears in quotes and documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Leading steel fabrication company specializing in..."
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description for quotes and proposals
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo Management</CardTitle>
              <CardDescription>
                Upload your company logo for quotes and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {logoPreview && (
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Company logo preview" 
                        className="h-24 w-auto object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => {
                          setLogoPreview(null);
                          form.setValue("logoPath", "");
                          form.setValue("logoFile", undefined);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label 
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    PNG, JPG, SVG, or WebP up to 10MB
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Watermark Settings</CardTitle>
              <CardDescription>
                Configure watermark for draft quotes and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enableWatermark"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Watermark</FormLabel>
                      <FormDescription>
                        Show company logo as watermark on documents
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("enableWatermark") && (
                <FormField
                  control={form.control}
                  name="watermarkOpacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Watermark Opacity</FormLabel>
                      <div className="flex items-center gap-4">
                        <FormControl>
                          <Input
                            type="range"
                            min="0.05"
                            max="0.5"
                            step="0.05"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="flex-1"
                          />
                        </FormControl>
                        <span className="text-sm font-medium w-12">
                          {Math.round(field.value * 100)}%
                        </span>
                      </div>
                      <FormDescription>
                        Adjust watermark transparency (5% - 50%)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateBrandingMutation.isPending}
            >
              {updateBrandingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Branding
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}