import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./lib/auth";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import DonorSearch from "@/pages/donor-search";
import DonorProfile from "@/pages/donor-profile";
import DonorRegistration from "@/pages/donor-registration";
import Reports from "@/pages/reports";
import UserManagement from "@/pages/user-management";
import AdminSecret from "@/pages/admin-secret"; // Assuming AdminSecret component is in this path
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { data: authData, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authData?.user) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route component={Login} />
      </Switch>
    );
  }

  if (authData.user.isProvisional) {
    return <ResetPassword />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/donors/search" component={DonorSearch} />
      <Route path="/donors/register" component={DonorRegistration} />
      <Route path="/donors/:id" component={DonorProfile} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={UserManagement} />
      <Route path="/admin/secret" component={AdminSecret} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;