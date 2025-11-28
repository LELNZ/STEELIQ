import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { GeolocationProvider } from "@/contexts/geolocation-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { NotificationProvider } from "@/hooks/useNotifications";
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
import NotificationPreferences from "@/pages/notification-preferences";
import NotificationPreferencesReport from "@/pages/notification-preferences-report";
import NotificationRolePolicies from "@/pages/notification-role-policies";
import NotificationsPage from "@/pages/notifications";
import WhatsAppTest from "@/pages/whatsapp-test";
import TeamManagement from "@/pages/team-management";
import EmployeeProfile from "@/pages/employee-profile";
import FinancialSettings from "@/pages/settings/financial";
import OperationsSettingsNew from "@/pages/operations-settings-new";
import TimePayroll from "@/pages/time-payroll";
import TimeAnalyticsDashboard from "@/pages/TimeAnalyticsDashboard";
import TimeReportingSystem from "@/pages/TimeReportingSystem";

// Wave 1.5 Time Management Components
import { BulkCorrectionManager } from "@/components/time/BulkCorrectionManager";
import { KioskModePage } from "@/components/time/KioskModePage";
import { ShiftReminderConfigurator } from "@/components/time/ShiftReminderConfigurator";
import { GeofenceDesigner } from "@/components/time/GeofenceDesigner";
import { BatteryOptimizationSettings } from "@/components/time/BatteryOptimizationSettings";
import SupervisorAnomalyConsole from "@/components/time/SupervisorAnomalyConsole";
import { FraudRiskDashboard } from "@/components/time/FraudRiskDashboard";
import { AutomatedShiftScheduler } from "@/components/time/AutomatedShiftScheduler";
import { ShiftSwapWorkflow } from "@/components/time/ShiftSwapWorkflow";

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
import FeatureDashboard from "@/pages/feature-dashboard";
import TestEmailPage from "@/pages/TestEmailPage";

import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { useIsMobile } from "@/hooks/use-mobile";

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
        <Route path="/notification-preferences">
          <ProtectedRoute>
            <NotificationPreferences />
          </ProtectedRoute>
        </Route>
        <Route path="/notifications/policies">
          <ProtectedRoute requiredRole={['owner', 'admin']}>
            <NotificationRolePolicies />
          </ProtectedRoute>
        </Route>
        <Route path="/notifications/preferences-report">
          <ProtectedRoute requiredRole={['owner', 'admin']}>
            <NotificationPreferencesReport />
          </ProtectedRoute>
        </Route>
        <Route path="/notifications">
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/whatsapp-test">
          <ProtectedRoute requiredRole={['owner', 'admin']}>
            <WhatsAppTest />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/financial">
          <ProtectedRoute requiredPermissions={['viewCosts', 'manageRates']}>
            <FinancialSettings />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/operations">
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
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
        <Route path="/settings/features">
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
            <FeatureDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/organization-settings">
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
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
          <ProtectedRoute>
            {/* Employee self-service time clock - accessible to all authenticated users */}
            <TimePayroll />
          </ProtectedRoute>
        </Route>
        <Route path="/time-analytics">
          <ProtectedRoute requiredPermissions={['timeAnalyticsView']}>
            {/* Admin-only analytics dashboard - restricted to system admins */}
            <TimeAnalyticsDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/time-reports">
          <ProtectedRoute requiredPermissions={['timeReportsProcess']}>
            {/* Admin-only reporting system - restricted to system admins */}
            <TimeReportingSystem />
          </ProtectedRoute>
        </Route>
        
        {/* Wave 1.5 Time Management Routes */}
        <Route path="/time/bulk-corrections">
          <ProtectedRoute requiredPermissions={['manage_time_entries']}>
            <BulkCorrectionManager />
          </ProtectedRoute>
        </Route>
        <Route path="/time/kiosk">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <KioskModePage />
          </ProtectedRoute>
        </Route>
        <Route path="/time/shift-reminders">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <ShiftReminderConfigurator />
          </ProtectedRoute>
        </Route>
        <Route path="/time/geofences">
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
            <GeofenceDesigner />
          </ProtectedRoute>
        </Route>
        <Route path="/time/battery-optimization">
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
            <BatteryOptimizationSettings />
          </ProtectedRoute>
        </Route>
        
        {/* Wave 5.1 ML Anomaly Detection Console */}
        <Route path="/time/anomaly-console">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <SupervisorAnomalyConsole />
          </ProtectedRoute>
        </Route>
        
        {/* Wave 5.2 Fraud Prevention Dashboard */}
        <Route path="/time/fraud-dashboard">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <FraudRiskDashboard />
          </ProtectedRoute>
        </Route>
        
        {/* Wave 5.3 AI Scheduling */}
        <Route path="/time/ai-scheduling">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <AutomatedShiftScheduler />
          </ProtectedRoute>
        </Route>
        
        {/* Wave 5.3 Shift Swap Workflow */}
        <Route path="/time/shift-swaps">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <ShiftSwapWorkflow />
          </ProtectedRoute>
        </Route>
        
        {/* Email Test Page - Admin and above */}
        <Route path="/test-email">
          <ProtectedRoute requiredRole={['owner', 'admin', 'supervisor', 'full']}>
            <TestEmailPage />
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
          <ProtectedRoute requiredRole={['owner', 'admin', 'full']}>
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
  const isMobile = useIsMobile();
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

  const handleMenuClick = () => {
    if (isMobile) {
      // On mobile, toggle the sidebar open/closed
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      // On desktop, toggle the sidebar collapsed/expanded
      const newCollapsed = !isSidebarCollapsed;
      setIsSidebarCollapsed(newCollapsed);
      localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuClick={handleMenuClick} />
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
          <Sidebar 
            isCollapsed={isMobile ? false : isSidebarCollapsed} 
            onNavigate={() => isMobile && setIsSidebarOpen(false)} 
          />
        </div>
        
        <main className="flex-1 p-2 sm:p-4 md:p-6 pb-20 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  console.log("App component is rendering");
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="steeliq-ui-theme">
          <AuthProvider>
            <GeolocationProvider>
              <NotificationProvider>
                <TooltipProvider>
                  <Layout>
                    <Router />
                  </Layout>
                  <Toaster />
                  <PwaInstallPrompt />
                </TooltipProvider>
              </NotificationProvider>
            </GeolocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
