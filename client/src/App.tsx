import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import Materials from "@/pages/materials-fixed";
import Inventory from "@/pages/inventory";
import CuttingOptimizationFixed from "@/pages/cutting-optimization-fixed";
import CuttingPlanTest from "@/pages/cutting-plan-test";
import Estimates from "@/pages/estimates";
import EstimationPage from "@/pages/estimation-clean";
import ProjectEstimation from "@/pages/project-estimation";
import ClientPortal from "@/pages/client-portal";
import MobileInspection from "@/pages/mobile-inspection";
import Contacts from "@/pages/contacts";
import Suppliers from "@/pages/suppliers";
import SupplierContacts from "@/pages/supplier-contacts";

import FinancialDashboard from "@/pages/financial-dashboard";
import SettingsPage from "@/pages/settings";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/estimates" component={Estimates} />
      <Route path="/estimation" component={EstimationPage} />
      <Route path="/project-estimation" component={ProjectEstimation} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/mobile-inspection" component={MobileInspection} />
      <Route path="/materials" component={Materials} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/supplier-contacts" component={SupplierContacts} />
      <Route path="/settings" component={SettingsPage} />

      <Route path="/financial" component={FinancialDashboard} />
      <Route path="/optimization" component={CuttingOptimizationFixed} />
      <Route path="/cutting-plan-test" component={CuttingPlanTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
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
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
