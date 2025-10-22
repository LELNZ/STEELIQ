import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRouter } from "@/components/auth/RoleRouter";
import NotFound from "@/pages/not-found";
import Unauthorized from "@/pages/unauthorized";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";

// Role-specific dashboards
import FloorDashboard from "@/pages/dashboards/FloorDashboard";
import PlanningDashboard from "@/pages/dashboards/PlanningDashboard";
import AccountingDashboard from "@/pages/dashboards/AccountingDashboard";
import SupervisorDashboard from "@/pages/dashboards/SupervisorDashboard";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import ExecutiveDashboard from "@/pages/dashboards/ExecutiveDashboard";
import Jobs from "@/pages/jobs";
import Materials from "@/pages/materials";
import Inventory from "@/pages/inventory";
import EstimationPage from "@/pages/estimation-clean";

import ClientPortal from "@/pages/client-portal";
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
import ProductionFloor from "@/pages/ProductionFloor";
import FinancialIntelligence from "@/pages/FinancialIntelligence";
import ResourcePlanning from "@/pages/ResourcePlanning";
import RemnantManagement from "@/pages/remnant-management";
import PDFMarkup from "@/pages/pdf-markup";
import Procurement from "@/pages/procurement";
import AuditCenter from "@/pages/AuditCenter";
import Optimization from "@/pages/optimization";
import MobileOperations from "@/pages/mobile-operations";
import AIDashboard from "@/pages/AIDashboard";
import AIControlCenter from "@/pages/AIControlCenter";

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
    <RoleRouter>
      <Switch>
        <Route path="/login" component={Dashboard} />
        <Route path="/unauthorized" component={Unauthorized} />
        <Route path="/">
          <Dashboard />
        </Route>
        
        {/* Role-specific dashboards */}
        <Route path="/dashboards/floor" component={FloorDashboard} />
        <Route path="/dashboards/planning" component={PlanningDashboard} />
        <Route path="/dashboards/accounting">
          <ProtectedRoute requiredPermissions={['viewCosts', 'viewPricing']}>
            <AccountingDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboards/supervisor">
          <ProtectedRoute requiredRole={['owner', 'supervisor', 'admin', 'full']}>
            <SupervisorDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboards/admin">
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboards/executive">
          <ProtectedRoute requiredRole={['owner', 'full']}>
            <ExecutiveDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute requiredRole={['owner', 'supervisor', 'admin', 'full']}>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        
        {/* Protected routes with permission checks */}
        <Route path="/jobs" component={Jobs} />
        <Route path="/procurement">
          <ProtectedRoute requiredPermissions={['viewSuppliers']}>
            <Procurement />
          </ProtectedRoute>
        </Route>
        <Route path="/supplier/po/:distributionId" component={SupplierPortal} />
        <Route path="/estimation">
          <ProtectedRoute requiredPermissions={['viewJobs', 'createJobs']}>
            <EstimationPage />
          </ProtectedRoute>
        </Route>
        <Route path="/estimation/:id">
          <ProtectedRoute requiredPermissions={['viewJobs', 'editJobs']}>
            <EstimationPage />
          </ProtectedRoute>
        </Route>

        <Route path="/client-portal" component={ClientPortal} />
        <Route path="/materials" component={Materials} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/contacts" component={Contacts} />
        
        {/* Settings - Admin Only */}
        <Route path="/settings">
          <ProtectedRoute requiredRole={['admin', 'full']}>
            <FinancialSettings />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/financial">
          <ProtectedRoute requiredPermissions={['viewCosts', 'manageRates']}>
            <FinancialSettings />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/operations">
          <ProtectedRoute requiredRole={['admin', 'full']}>
            <OperationsSettingsNew />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/lifecycle-templates">
          <ProtectedRoute requiredRole={['admin', 'full']}>
            <LifecycleTemplates />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/audit-center">
          <ProtectedRoute requiredPermissions={['auditLogs']}>
            <AuditCenter />
          </ProtectedRoute>
        </Route>
        <Route path="/organization-settings">
          <ProtectedRoute requiredRole={['admin', 'full']}>
            <OrganizationSettingsPage />
          </ProtectedRoute>
        </Route>
        
        {/* Team Management - Supervisors and above */}
        <Route path="/team-management">
          <ProtectedRoute requiredPermissions={['manageUsers']}>
            <TeamManagement />
          </ProtectedRoute>
        </Route>
        <Route path="/team-management/employee/new">
          <ProtectedRoute requiredPermissions={['manageUsers']}>
            <EmployeeProfile />
          </ProtectedRoute>
        </Route>
        <Route path="/team-management/employee/:id">
          <ProtectedRoute requiredPermissions={['manageUsers']}>
            <EmployeeProfile />
          </ProtectedRoute>
        </Route>
        <Route path="/time-payroll">
          <ProtectedRoute requiredPermissions={['viewCosts', 'manageRates']}>
            <TimePayroll />
          </ProtectedRoute>
        </Route>
        
        {/* Project and Planning Routes */}
        <Route path="/projects/:projectId/lifecycle" component={ProjectLifecycleTracker} />
        <Route path="/estimation-pipeline" component={EstimationPipeline} />
        <Route path="/preferences" component={UserPreferences} />
        <Route path="/email-cost-import">
          <ProtectedRoute requiredPermissions={['viewCosts', 'editPricing']}>
            <EmailCostImport />
          </ProtectedRoute>
        </Route>
        <Route path="/drawing-intelligence" component={DrawingIntelligence} />
        <Route path="/supplier-integration" component={SupplierIntegrationHub} />
        <Route path="/production-floor" component={ProductionFloor} />
        
        {/* Financial - Accounting and above */}
        <Route path="/financial-intelligence">
          <ProtectedRoute requiredPermissions={['viewCosts', 'viewPricing']}>
            <FinancialIntelligence />
          </ProtectedRoute>
        </Route>
        
        <Route path="/resource-planning" component={ResourcePlanning} />
        <Route path="/remnant-management" component={RemnantManagement} />
        <Route path="/optimization" component={Optimization} />
        <Route path="/pdf-markup" component={PDFMarkup} />
        <Route path="/mobile-operations" component={MobileOperations} />
        <Route path="/ai-dashboard" component={AIDashboard} />
        <Route path="/ai-control-center">
          <ProtectedRoute requiredRole={['admin', 'full']}>
            <AIControlCenter />
          </ProtectedRoute>
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </RoleRouter>
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
