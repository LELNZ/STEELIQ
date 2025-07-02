import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Shield, ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { useState } from "react";

interface PermissionViewerProps {
  permissions: Record<string, string[]>;
  securityLevel?: string;
  roleName?: string;
}

// Permission category metadata
const permissionCategories = {
  system: {
    name: "System Administration",
    description: "Core system management and configuration",
    icon: Shield,
    color: "destructive"
  },
  users: {
    name: "User & Access Management", 
    description: "User accounts, roles, and security management",
    icon: ShieldCheck,
    color: "destructive"
  },
  financial: {
    name: "Financial Management",
    description: "Pricing, invoicing, and financial oversight",
    icon: ShieldAlert,
    color: "destructive"
  },
  projects: {
    name: "Project Management",
    description: "Project coordination and workflow management",
    icon: Lock,
    color: "default"
  },
  estimation: {
    name: "Estimation & Quoting",
    description: "Cost estimation and project quoting",
    icon: Lock,
    color: "default"
  },
  materials: {
    name: "Materials & Inventory",
    description: "Material management and stock control",
    icon: Lock,
    color: "default"
  },
  production: {
    name: "Production & Manufacturing",
    description: "Workshop operations and production management",
    icon: Lock,
    color: "default"
  },
  quality: {
    name: "Quality & Safety",
    description: "Quality control and safety compliance",
    icon: Lock,
    color: "default"
  },
  clients: {
    name: "Client Management",
    description: "Customer relations and contact management",
    icon: Lock,
    color: "secondary"
  },
  reports: {
    name: "Reporting & Analytics",
    description: "Business intelligence and reporting access",
    icon: Lock,
    color: "secondary"
  },
  time: {
    name: "Time Management",
    description: "Timesheet and scheduling management",
    icon: Lock,
    color: "secondary"
  },
  documents: {
    name: "Document Management",
    description: "Document access and version control",
    icon: Lock,
    color: "secondary"
  }
};

// Security level configurations
const securityLevels = {
  Critical: { color: "destructive", icon: Shield },
  High: { color: "destructive", icon: ShieldAlert },
  Medium: { color: "default", icon: ShieldCheck },
  Low: { color: "secondary", icon: Lock }
};

export function PermissionViewer({ permissions, securityLevel, roleName }: PermissionViewerProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
    }
    setOpenCategories(newOpen);
  };

  const totalPermissions = Object.values(permissions).flat().length;
  const categoryCount = Object.keys(permissions).length;

  const getSecurityConfig = (level?: string) => {
    return securityLevels[level as keyof typeof securityLevels] || securityLevels.Low;
  };

  const securityConfig = getSecurityConfig(securityLevel);
  const SecurityIcon = securityConfig.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <SecurityIcon className="h-5 w-5" />
              Permission Matrix
              {roleName && <span className="text-sm font-normal text-muted-foreground">- {roleName}</span>}
            </CardTitle>
            <CardDescription>
              {categoryCount} categories • {totalPermissions} specific permissions
              {securityLevel && (
                <Badge variant={securityConfig.color as any} className="ml-2">
                  {securityLevel} Level
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {Object.entries(permissions).map(([category, perms]) => {
              const categoryConfig = permissionCategories[category as keyof typeof permissionCategories];
              const isOpen = openCategories.has(category);
              const CategoryIcon = categoryConfig?.icon || Lock;
              
              if (!categoryConfig) return null;

              return (
                <Collapsible
                  key={category}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">{categoryConfig.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {categoryConfig.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {perms.length} permissions
                        </Badge>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 ml-7 space-y-1">
                      {perms.map((permission) => (
                        <div
                          key={permission}
                          className="flex items-center gap-2 py-1 px-2 rounded text-sm"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="font-mono text-xs">
                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}