import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/lib/auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CheckInPublic from "./pages/CheckInPublic";
import CheckIn from "./pages/CheckIn";
import GlobalDashboard from "./pages/GlobalDashboard";
import BristolDashboard from "./pages/BristolDashboard";
import MemberDirectory from "./pages/MemberDirectory";
import MemberProfile from "./pages/MemberProfile";
import AddMember from "./pages/AddMember";
import Reports from "./pages/Reports";
import EngagementAlerts from "./pages/EngagementAlerts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Layout wrapper for the portal screens. Auth is intentionally OFF for now
// (no gate) — the Login/Signup pages still exist for when we switch it back on.
function PortalLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public member tap / QR landing */}
            <Route path="/c/:token" element={<CheckInPublic />} />
            {/* Auth pages kept for later (not enforced) */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Open portal — no login required for now */}
            <Route element={<PortalLayout />}>
              <Route path="/" element={<CheckIn />} />
              <Route path="/dashboard" element={<GlobalDashboard />} />
              <Route path="/bristol" element={<BristolDashboard />} />
              <Route path="/members" element={<MemberDirectory />} />
              <Route path="/members/new" element={<AddMember />} />
              <Route path="/members/:id" element={<MemberProfile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/alerts" element={<EngagementAlerts />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
