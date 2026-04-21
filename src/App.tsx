import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RouteResolver from "@/pages/RouteResolver";
import Auth from "@/pages/Auth";
import Intake from "@/pages/Intake";
import Report from "@/pages/Report";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminInvite from "@/pages/AdminInvite";
import Team from "@/pages/Team";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RouteResolver />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/intake" element={<ProtectedRoute role="org_user"><Intake /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute role="org_user"><Report /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute role="org_user"><Team /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/invite" element={<ProtectedRoute role="admin"><AdminInvite /></ProtectedRoute>} />
            <Route path="/admin/org/:orgId" element={<ProtectedRoute role="admin"><Report /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
