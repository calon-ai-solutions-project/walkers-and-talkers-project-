import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import ChangePasswordFirst from "./pages/ChangePasswordFirst";
import CheckInPublic from "./pages/CheckInPublic";
import CheckIn from "./pages/CheckIn";
import GlobalDashboard from "./pages/GlobalDashboard";
import BristolDashboard from "./pages/BristolDashboard";
import MemberDirectory from "./pages/MemberDirectory";
import MemberProfile from "./pages/MemberProfile";
import AddMember from "./pages/AddMember";
import Reports from "./pages/Reports";
import EngagementAlerts from "./pages/EngagementAlerts";
import Settings from "./pages/Settings";
import Cards from "./pages/Cards";
import CardProgrammer from "./pages/CardProgrammer";
import VolunteerCheckIn from "./pages/VolunteerCheckIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}

// Any signed-in user (used for /walk so admins can preview it too).
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.must_change_password)
    return <Navigate to="/auth/change-password" replace />;
  return <>{children}</>;
}

// Admin shell — volunteers are bounced to /walk and never see it.
function RequireAuthLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.must_change_password)
    return <Navigate to="/auth/change-password" replace />;
  if (profile?.role === "volunteer") return <Navigate to="/walk" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// Forced-password-change route. Bounces away if the user is signed out
// (back to /login) or the flag was already cleared (forward to /).
function ForcePasswordChangeRoute() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile?.must_change_password) return <Navigate to="/" replace />;
  return <ChangePasswordFirst />;
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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/auth/change-password"
              element={<ForcePasswordChangeRoute />}
            />

            {/* Volunteer kiosk (its own shell; admins can preview it) */}
            <Route
              path="/walk"
              element={
                <AuthGate>
                  <VolunteerCheckIn />
                </AuthGate>
              }
            />

            {/* Admin portal — sign-in required (data is protected by RLS) */}
            <Route element={<RequireAuthLayout />}>
              <Route path="/" element={<CheckIn />} />
              <Route path="/dashboard" element={<GlobalDashboard />} />
              <Route path="/bristol" element={<BristolDashboard />} />
              <Route path="/members" element={<MemberDirectory />} />
              <Route path="/members/new" element={<AddMember />} />
              <Route path="/members/:id" element={<MemberProfile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/alerts" element={<EngagementAlerts />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/cards/program/:cardId" element={<CardProgrammer />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
