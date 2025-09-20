import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, FileImage, Save, RefreshCw, Eye } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const colorSchemePresets = {
  professional: {
    name: 'Professional',
    description: 'Clean and trustworthy blue tones',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    textColor: '#1f2937',
    backgroundColor: '#ffffff'
  },
  modern: {
    name: 'Modern',
    description: 'Bold purple and teal combination',
    primaryColor: '#8b5cf6',
    secondaryColor: '#14b8a6',
    accentColor: '#ec4899',
    textColor: '#1e293b',
    backgroundColor: '#ffffff'
  },
  vibrant: {
    name: 'Vibrant',
    description: 'Energetic orange and blue',
    primaryColor: '#f97316',
    secondaryColor: '#0ea5e9',
    accentColor: '#a855f7',
    textColor: '#0f172a',
    backgroundColor: '#ffffff'
  },
  minimal: {
    name: 'Minimal',
    description: 'Simple black and white with gray accents',
    primaryColor: '#000000',
    secondaryColor: '#6b7280',
    accentColor: '#3b82f6',
    textColor: '#000000',
    backgroundColor: '#ffffff'
  },
  corporate: {
    name: 'Corporate',
    description: 'Traditional navy and gray',
    primaryColor: '#1e3a8a',
    secondaryColor: '#64748b',
    accentColor: '#059669',
    textColor: '#0f172a',
    backgroundColor: '#ffffff'
  },
  industrial: {
    name: 'Industrial',
    description: 'Steel gray and safety orange',
    primaryColor: '#475569',
    secondaryColor: '#ea580c',
    accentColor: '#fbbf24',
    textColor: '#1f2937',
    backgroundColor: '#f9fafb'
  }
};

export default function BrandingSettings() {
  const { toast } = useToast();
  const [selectedScheme, setSelectedScheme] = useState('professional');
  const [brandingData, setBrandingData] = useState({
    brandName: 'Lateral Engineering Limited',
    colorScheme: 'professional',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    logoUrl: '',
    faviconUrl: '',
    fontFamily: 'Helvetica Neue, Arial, sans-serif',
    headingFontFamily: 'Helvetica Neue, Arial, sans-serif',
    defaultPaperSize: 'A4',
    customCss: '',
    headerLayout: { style: 'professional', showLogo: true, showDate: true },
    footerLayout: { style: 'simple', showPageNumbers: true, showCompanyInfo: true }
  });

  // Fetch current branding settings
  const { data: currentBranding, isLoading } = useQuery({
    queryKey: ['/api/organization/branding'],
    staleTime: 0
  });

  useEffect(() => {
    if (currentBranding) {
      setBrandingData(currentBranding);
      setSelectedScheme(currentBranding.colorScheme || 'professional');
    }
  }, [currentBranding]);

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/organization/branding', 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization/branding'] });
      toast({
        title: "Success",
        description: "Branding settings updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branding settings",
        variant: "destructive"
      });
    }
  });

  const handleColorSchemeChange = (scheme: string) => {
    setSelectedScheme(scheme);
    const preset = colorSchemePresets[scheme as keyof typeof colorSchemePresets];
    if (preset) {
      setBrandingData(prev => ({
        ...prev,
        colorScheme: scheme,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        accentColor: preset.accentColor,
        textColor: preset.textColor,
        backgroundColor: preset.backgroundColor
      }));
    }
  };

  const handleSave = () => {
    updateBrandingMutation.mutate(brandingData);
  };

  const handleReset = () => {
    if (currentBranding) {
      setBrandingData(currentBranding);
      setSelectedScheme(currentBranding.colorScheme || 'professional');
    }
  };

  if (isLoading) {
    return <div>Loading branding settings...</div>;
  }

  return (
    <div className="space-y-6" data-testid="branding-settings-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organization Branding</h2>
          <p className="text-muted-foreground">Configure your organization-wide branding and template settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={updateBrandingMutation.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={updateBrandingMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="logos">Logos</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>Select a preset color scheme or customize individual colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Scheme Presets */}
              <div className="space-y-2">
                <Label>Color Scheme Preset</Label>
                <Select value={selectedScheme} onValueChange={handleColorSchemeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a color scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(colorSchemePresets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{preset.name}</div>
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color Preview */}
              <div className="p-4 border rounded-lg space-y-2">
                <div className="text-sm font-medium mb-2">Preview</div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="space-y-1">
                    <div 
                      className="h-16 rounded border"
                      style={{ backgroundColor: brandingData.primaryColor }}
                    />
                    <div className="text-xs text-center">Primary</div>
                  </div>
                  <div className="space-y-1">
                    <div 
                      className="h-16 rounded border"
                      style={{ backgroundColor: brandingData.secondaryColor }}
                    />
                    <div className="text-xs text-center">Secondary</div>
                  </div>
                  <div className="space-y-1">
                    <div 
                      className="h-16 rounded border"
                      style={{ backgroundColor: brandingData.accentColor }}
                    />
                    <div className="text-xs text-center">Accent</div>
                  </div>
                  <div className="space-y-1">
                    <div 
                      className="h-16 rounded border"
                      style={{ backgroundColor: brandingData.textColor }}
                    />
                    <div className="text-xs text-center">Text</div>
                  </div>
                  <div className="space-y-1">
                    <div 
                      className="h-16 rounded border"
                      style={{ backgroundColor: brandingData.backgroundColor }}
                    />
                    <div className="text-xs text-center">Background</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={brandingData.primaryColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={brandingData.primaryColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={brandingData.secondaryColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={brandingData.secondaryColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={brandingData.accentColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={brandingData.accentColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, accentColor: e.target.value }))}
                      placeholder="#f59e0b"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-color">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text-color"
                      type="color"
                      value={brandingData.textColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, textColor: e.target.value }))}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={brandingData.textColor}
                      onChange={(e) => setBrandingData(prev => ({ ...prev, textColor: e.target.value }))}
                      placeholder="#1f2937"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography Settings
              </CardTitle>
              <CardDescription>Configure fonts for documents and templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input
                  id="brand-name"
                  value={brandingData.brandName}
                  onChange={(e) => setBrandingData(prev => ({ ...prev, brandName: e.target.value }))}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-family">Body Font</Label>
                <Select 
                  value={brandingData.fontFamily} 
                  onValueChange={(value) => setBrandingData(prev => ({ ...prev, fontFamily: value }))}
                >
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica Neue, Arial, sans-serif">Helvetica Neue</SelectItem>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                    <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                    <SelectItem value="Lato, sans-serif">Lato</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heading-font">Heading Font</Label>
                <Select 
                  value={brandingData.headingFontFamily} 
                  onValueChange={(value) => setBrandingData(prev => ({ ...prev, headingFontFamily: value }))}
                >
                  <SelectTrigger id="heading-font">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica Neue, Arial, sans-serif">Helvetica Neue</SelectItem>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                    <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                    <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                    <SelectItem value="Playfair Display, serif">Playfair Display</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper-size">Default Paper Size</Label>
                <Select 
                  value={brandingData.defaultPaperSize} 
                  onValueChange={(value) => setBrandingData(prev => ({ ...prev, defaultPaperSize: value }))}
                >
                  <SelectTrigger id="paper-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210mm × 297mm)</SelectItem>
                    <SelectItem value="Letter" disabled>Letter (8.5" × 11") - Not Available</SelectItem>
                    <SelectItem value="Legal" disabled>Legal (8.5" × 14") - Not Available</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">All templates use A4 format for consistency</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Logo & Images
              </CardTitle>
              <CardDescription>Upload your company logo and favicon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input
                  id="logo-url"
                  type="url"
                  value={brandingData.logoUrl || ''}
                  onChange={(e) => setBrandingData(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">Recommended size: 200x60px</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon-url">Favicon URL</Label>
                <Input
                  id="favicon-url"
                  type="url"
                  value={brandingData.faviconUrl || ''}
                  onChange={(e) => setBrandingData(prev => ({ ...prev, faviconUrl: e.target.value }))}
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-xs text-muted-foreground">Recommended size: 32x32px</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Layout Settings</CardTitle>
              <CardDescription>Configure header and footer layouts for templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Header Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-logo">Show Logo in Header</Label>
                    <Switch
                      id="show-logo"
                      checked={brandingData.headerLayout?.showLogo ?? true}
                      onCheckedChange={(checked) => 
                        setBrandingData(prev => ({
                          ...prev,
                          headerLayout: { ...prev.headerLayout, showLogo: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-date">Show Date in Header</Label>
                    <Switch
                      id="show-date"
                      checked={brandingData.headerLayout?.showDate ?? true}
                      onCheckedChange={(checked) => 
                        setBrandingData(prev => ({
                          ...prev,
                          headerLayout: { ...prev.headerLayout, showDate: checked }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Footer Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-page-numbers">Show Page Numbers</Label>
                    <Switch
                      id="show-page-numbers"
                      checked={brandingData.footerLayout?.showPageNumbers ?? true}
                      onCheckedChange={(checked) => 
                        setBrandingData(prev => ({
                          ...prev,
                          footerLayout: { ...prev.footerLayout, showPageNumbers: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-company-info">Show Company Info</Label>
                    <Switch
                      id="show-company-info"
                      checked={brandingData.footerLayout?.showCompanyInfo ?? true}
                      onCheckedChange={(checked) => 
                        setBrandingData(prev => ({
                          ...prev,
                          footerLayout: { ...prev.footerLayout, showCompanyInfo: checked }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="custom-css">Custom CSS (Advanced)</Label>
                <Textarea
                  id="custom-css"
                  value={brandingData.customCss || ''}
                  onChange={(e) => setBrandingData(prev => ({ ...prev, customCss: e.target.value }))}
                  placeholder="/* Add custom CSS rules here */"
                  className="font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Add custom CSS to further customize template appearance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}