import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import Materials from "@/pages/materials";
import Inventory from "@/pages/inventory";
import CuttingOptimizationFixed from "@/pages/cutting-optimization-fixed";
import CuttingPlanTest from "@/pages/cutting-plan-test";
import Estimates from "@/pages/estimates";
import EstimationPage from "@/pages/estimation-clean";

import ClientPortal from "@/pages/client-portal";
import MobileInspection from "@/pages/mobile-inspection";
import Contacts from "@/pages/contacts";
import Suppliers from "@/pages/suppliers";
import SupplierContacts from "@/pages/supplier-contacts";

import FinancialDashboard from "@/pages/financial-dashboard";
import SettingsPage from "@/pages/settings";
import GlobalSettings from "@/pages/global-settings";
import UserPreferences from "@/pages/user-preferences";
import LaborRates from "@/pages/labor-rates";
import TeamManagement from "@/pages/team-management";
import EmployeeProfile from "@/pages/employee-profile";
import TimeManagement from "@/pages/time-management";
import OrganizationSettings from "@/pages/settings/organization";
import FinancialSettings from "@/pages/settings/financial";
import OperationsSettings from "@/pages/settings/operations";
import TimePayroll from "@/pages/time-payroll";
import ProjectLifecycleTracker from "@/pages/project-lifecycle-tracker";
import LifecycleTemplates from "@/pages/lifecycle-templates";
import EstimationPipeline from "@/pages/estimation-pipeline";

import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
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
      <Route path="/estimates" component={Estimates} />
      <Route path="/estimation" component={EstimationPage} />
      <Route path="/estimation/:id" component={EstimationPage} />

      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/mobile-inspection" component={MobileInspection} />
      <Route path="/materials" component={Materials} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/supplier-contacts" component={SupplierContacts} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/organization" component={OrganizationSettings} />
      <Route path="/settings/financial" component={FinancialSettings} />
      <Route path="/settings/operations" component={OperationsSettings} />
      <Route path="/settings/lifecycle-templates" component={LifecycleTemplates} />
      <Route path="/global-settings" component={GlobalSettings} />
      <Route path="/labor-rates" component={LaborRates} />
      <Route path="/team-management" component={TeamManagement} />
      <Route path="/team-management/employee/:id" component={EmployeeProfile} />
      <Route path="/time-management" component={TimeManagement} />
      <Route path="/time-payroll" component={TimePayroll} />
      <Route path="/projects/:projectId/lifecycle" component={ProjectLifecycleTracker} />
      <Route path="/estimation-pipeline" component={EstimationPipeline} />
      <Route path="/preferences" component={UserPreferences} />
      <Route path="/financial" component={FinancialDashboard} />
      <Route path="/optimization" component={CuttingOptimizationFixed} />
      <Route path="/cutting-plan-test" component={CuttingPlanTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex min-h-screen pt-0">
        <Sidebar />
        <main className="flex-1 p-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
