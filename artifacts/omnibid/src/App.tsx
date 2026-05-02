import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Requirements from "@/pages/requirements";
import NewRequirement from "@/pages/new-requirement";
import RequirementDetail from "@/pages/requirement-detail";
import NewBid from "@/pages/new-bid";
import BuyerDashboard from "@/pages/buyer-dashboard";
import ProviderDashboard from "@/pages/provider-dashboard";
import Profile from "@/pages/profile";
import Notifications from "@/pages/notifications";
import Subscriptions from "@/pages/subscriptions";
import Disputes from "@/pages/disputes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/requirements" component={Requirements} />
      <Route path="/requirements/new" component={NewRequirement} />
      <Route path="/requirements/:id" component={RequirementDetail} />
      <Route path="/bid/new/:requirementId" component={NewBid} />
      <Route path="/dashboard/buyer" component={BuyerDashboard} />
      <Route path="/dashboard/provider" component={ProviderDashboard} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/disputes" component={Disputes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
