import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import Materials from "@/pages/materials";
import Inventory from "@/pages/inventory";
import CuttingOptimizationFixed from "@/pages/cutting-optimization-fixed";
import EstimationPage from "@/pages/estimation-clean";

import ClientPortal from "@/pages/client-portal";
import MobileInspection from "@/pages/mobile-inspection";
import Contacts from "@/pages/contacts";

import UserPreferences from "@/pages/user-preferences";
import TeamManagement from "@/pages/team-management";
import EmployeeProfile from "@/pages/employee-profile";
import FinancialSettings from "@/pages/settings/financial";
import OperationsSettingsNew from "@/pages/operations-settings-new";
import TimePayroll from "@/pages/time-payroll";
import ProjectLifecycleTracker from "@/pages/project-lifecycle-tracker";
import LifecycleTemplates from "@/pages/lifecycle-templates";
import EstimationPipeline from "@/pages/estimation-pipeline";
import OrganizationSettingsPage from "@/pages/organization-settings";
import EmailCostImport from "@/pages/EmailCostImport";
import DrawingIntelligence from "@/pages/DrawingIntelligence";
import SupplierIntegrationHub from "@/pages/SupplierIntegrationHub";
import SupplierPortal from "@/pages/SupplierPortal";
import MobileOperations from "@/pages/mobile-operations";
import ProductionFloor from "@/pages/ProductionFloor";
import RealTimeProduction from "@/pages/RealTimeProduction";
import QualityControl from "@/pages/QualityControl";
import InventoryMovements from "@/pages/InventoryMovements";
import FinancialIntelligence from "@/pages/FinancialIntelligence";
import ResourcePlanning from "@/pages/ResourcePlanning";
import RemnantManagement from "@/pages/remnant-management";
import PDFMarkup from "@/pages/pdf-markup";
import Procurement from "@/pages/procurement";
import AuditCenter from "@/pages/AuditCenter";

import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4">
            <span className="text-4xl font-bold text-primary">LEL</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Dashboard} />
      <Route path="/" component={Dashboard} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/procurement" component={Procurement} />
      <Route path="/supplier/po/:distributionId" component={SupplierPortal} />
      <Route path="/estimation" component={EstimationPage} />
      <Route path="/estimation/:id" component={EstimationPage} />

      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/mobile-inspection" component={MobileInspection} />
      <Route path="/materials" component={Materials} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/settings" component={FinancialSettings} />
      <Route path="/settings/financial" component={FinancialSettings} />
      <Route path="/settings/operations" component={OperationsSettingsNew} />
      <Route path="/settings/lifecycle-templates" component={LifecycleTemplates} />
      <Route path="/settings/audit-center" component={AuditCenter} />
      <Route path="/organization-settings" component={OrganizationSettingsPage} />
      <Route path="/team-management" component={TeamManagement} />
      <Route path="/team-management/employee/new" component={EmployeeProfile} />
      <Route path="/team-management/employee/:id" component={EmployeeProfile} />
      <Route path="/time-payroll" component={TimePayroll} />
      <Route path="/projects/:projectId/lifecycle" component={ProjectLifecycleTracker} />
      <Route path="/estimation-pipeline" component={EstimationPipeline} />
      <Route path="/preferences" component={UserPreferences} />
      <Route path="/email-cost-import" component={EmailCostImport} />
      <Route path="/drawing-intelligence" component={DrawingIntelligence} />
      <Route path="/supplier-integration" component={SupplierIntegrationHub} />
      <Route path="/mobile-operations" component={MobileOperations} />
      <Route path="/production-floor" component={ProductionFloor} />
      <Route path="/real-time-production" component={RealTimeProduction} />
      <Route path="/quality-control" component={QualityControl} />
      <Route path="/inventory-movements" component={InventoryMovements} />
      <Route path="/financial-intelligence" component={FinancialIntelligence} />
      <Route path="/resource-planning" component={ResourcePlanning} />
      <Route path="/remnant-management" component={RemnantManagement} />
      <Route path="/pdf-markup" component={PDFMarkup} />
      <Route path="/optimization" component={CuttingOptimizationFixed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  const toggleSidebarCollapse = () => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuClick={toggleSidebarCollapse} />
      <div className="flex min-h-screen pt-0">
        {/* Mobile sidebar overlay */}
        <div 
          className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />
        
        {/* Sidebar */}
        <div className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative transition-transform duration-200 z-50 md:z-auto`}>
          <Sidebar isCollapsed={isSidebarCollapsed} />
        </div>
        
        <main className="flex-1 p-2 sm:p-4 md:p-6 pb-20 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Layout>
              <Router />
            </Layout>
            <Toaster />
            <PwaInstallPrompt />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
