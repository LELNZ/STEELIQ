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
import Optimization from "@/pages/optimization";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/materials" component={Materials} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/optimization" component={Optimization} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <TopBar />
      <div className="flex h-full pt-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
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
