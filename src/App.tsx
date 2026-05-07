import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RouteResolver from "@/pages/RouteResolver";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import SetPassword from "@/pages/SetPassword";
import Welcome from "@/pages/Welcome";
import Intake from "@/pages/Intake";
import Report from "@/pages/Report";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminInvite from "@/pages/AdminInvite";
import AdminOrgTasks from "@/pages/admin/AdminOrgTasks";
import AdminTasksPage from "@/pages/admin/AdminTasksPage";
import AdminTasksThisWeek from "@/pages/admin/AdminTasksThisWeek";
import AdminTaskTracker from "@/pages/admin/AdminTaskTracker";
import OrgDetail from "@/pages/admin/OrgDetail";
import AdminOrgBranding from "@/pages/admin/AdminOrgBranding";
import AdminEngineFocus from "@/pages/admin/AdminEngineFocus";
import AdminHealthReports from "@/pages/admin/AdminHealthReports";
import AdminPresentations from "@/pages/admin/AdminPresentations";
import AdminTemplates from "@/pages/admin/AdminTemplates";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";

import AdminMyTasks from "@/pages/admin/AdminMyTasks";
import AdminPipeline from "@/pages/admin/AdminPipeline";
import RevenueShare from "@/pages/admin/RevenueShare";
import OrgRevenueShareDetail from "@/pages/admin/OrgRevenueShareDetail";
import AdminWeeklyFocus from "@/pages/admin/AdminWeeklyFocus";
import AdminRoadmap from "@/pages/admin/AdminRoadmap";
import AcquisitionsDashboard from "@/pages/admin/acquisitions/AcquisitionsDashboard";
import AcquisitionDetail from "@/pages/admin/acquisitions/AcquisitionDetail";
import AcquisitionsSettings from "@/pages/admin/acquisitions/AcquisitionsSettings";
import ComplianceOverview from "@/pages/admin/acquisitions/ComplianceOverview";
import Team from "@/pages/Team";
import Dashboard from "@/pages/Dashboard";
import Plan from "@/pages/Plan";
import Calculators from "@/pages/Calculators";
import Communications from "@/pages/Communications";
import OrgSponsorships from "@/pages/OrgSponsorships";
import AdminCommunications from "@/pages/admin/AdminCommunications";
import Settings from "@/pages/Settings";
import Customize from "@/pages/Customize";
import { BrandingProvider } from "@/hooks/useBranding";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
          <Routes>
            <Route path="/" element={<RouteResolver />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<ProtectedRoute><SetPassword /></ProtectedRoute>} />
            <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
            <Route path="/customize" element={<ProtectedRoute role="org_user"><Customize /></ProtectedRoute>} />
            <Route path="/intake" element={<ProtectedRoute role="org_user"><Intake /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute role="org_user"><Dashboard /></ProtectedRoute>} />
            <Route path="/plan" element={<ProtectedRoute role="org_user"><Plan /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute role="org_user"><Report /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute role="org_user"><Team /></ProtectedRoute>} />
            <Route path="/calculators" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
            <Route path="/calculators/:orgId" element={<ProtectedRoute role="admin"><Calculators /></ProtectedRoute>} />
            <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
            <Route path="/communications/:orgId" element={<ProtectedRoute role="admin"><Communications /></ProtectedRoute>} />
            <Route path="/sponsorships" element={<ProtectedRoute role="org_user"><OrgSponsorships /></ProtectedRoute>} />
            <Route path="/admin/communications" element={<ProtectedRoute role="admin"><AdminCommunications /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute role="admin"><AdminTasksPage /></ProtectedRoute>} />
            <Route path="/admin/my-tasks" element={<ProtectedRoute role="admin"><AdminMyTasks /></ProtectedRoute>} />
            <Route path="/admin/weekly-focus" element={<ProtectedRoute role="admin"><AdminWeeklyFocus /></ProtectedRoute>} />
            <Route path="/admin/roadmap" element={<ProtectedRoute role="admin"><AdminRoadmap /></ProtectedRoute>} />
            <Route path="/admin/acquisitions" element={<ProtectedRoute role="admin"><AcquisitionsDashboard /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/settings" element={<ProtectedRoute role="admin"><AcquisitionsSettings /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/compliance" element={<ProtectedRoute role="admin"><ComplianceOverview /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/:id" element={<ProtectedRoute role="admin"><AcquisitionDetail /></ProtectedRoute>} />
            <Route path="/admin/tasks-this-week" element={<ProtectedRoute role="admin"><AdminTasksThisWeek /></ProtectedRoute>} />
            <Route path="/admin/task-tracker" element={<ProtectedRoute role="admin"><AdminTaskTracker /></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute role="admin"><AdminHealthReports /></ProtectedRoute>} />
            <Route path="/admin/presentations" element={<ProtectedRoute role="admin"><AdminPresentations /></ProtectedRoute>} />
            <Route path="/admin/pipeline" element={<ProtectedRoute role="admin"><AdminPipeline /></ProtectedRoute>} />
            <Route path="/admin/revenue-share" element={<ProtectedRoute role="admin"><RevenueShare /></ProtectedRoute>} />
            <Route path="/admin/revenue-share/:orgId" element={<ProtectedRoute role="admin"><OrgRevenueShareDetail /></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute role="admin"><AdminTemplates /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/invite" element={<ProtectedRoute role="admin"><AdminInvite /></ProtectedRoute>} />
            
            <Route path="/admin/org/:orgId" element={<ProtectedRoute role="admin"><OrgDetail /></ProtectedRoute>} />
            <Route path="/admin/org/:orgId/tasks" element={<ProtectedRoute role="admin"><OrgDetail /></ProtectedRoute>} />
            <Route path="/admin/org/:orgId/engine/:engine" element={<ProtectedRoute role="admin"><AdminEngineFocus /></ProtectedRoute>} />
            <Route path="/admin/org/:orgId/branding" element={<ProtectedRoute role="admin"><AdminOrgBranding /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
