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
import AdminUserLookup from "@/pages/admin/AdminUserLookup";

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
import MeetingsInbox from "@/pages/admin/acquisitions/MeetingsInbox";
import TranscriptDetail from "@/pages/admin/acquisitions/TranscriptDetail";
import StaffOnboard from "@/pages/StaffOnboard";
import SellerPortal from "@/pages/seller/SellerPortal";
import Team from "@/pages/Team";
import Dashboard from "@/pages/Dashboard";
import Plan from "@/pages/Plan";
import Calculators from "@/pages/Calculators";
import Communications from "@/pages/Communications";
import OrgSponsorships from "@/pages/OrgSponsorships";
import AdminCommunications from "@/pages/admin/AdminCommunications";
import Settings from "@/pages/Settings";
import Customize from "@/pages/Customize";
import MarketingHub from "@/pages/marketing/MarketingHub";
import BrandKit from "@/pages/marketing/BrandKit";
import Contacts from "@/pages/marketing/Contacts";
import EmailSetup from "@/pages/marketing/EmailSetup";
import Designs from "@/pages/marketing/Designs";
import Media from "@/pages/marketing/Media";
import DesignEditor from "@/pages/marketing/DesignEditor";
import Emails from "@/pages/marketing/Emails";
import EmailComposer from "@/pages/marketing/EmailComposer";
import AdminDesignTemplates from "@/pages/admin/marketing/AdminDesignTemplates";
import AdminEmailTemplates from "@/pages/admin/marketing/AdminEmailTemplates";
import Campaigns from "@/pages/marketing/Campaigns";
import CampaignDetail from "@/pages/marketing/CampaignDetail";
import Shortlinks from "@/pages/marketing/Shortlinks";
import AbTests from "@/pages/marketing/AbTests";
import SendTimes from "@/pages/marketing/SendTimes";
import SmsCompanion from "@/pages/marketing/SmsCompanion";
import SocialAccounts from "@/pages/marketing/SocialAccounts";
import SystemIntegrations from "@/pages/admin/system/SystemIntegrations";
import SequenceLibrary from "@/pages/marketing/SequenceLibrary";
import SequencePreview from "@/pages/marketing/SequencePreview";
import SequenceLaunch from "@/pages/marketing/SequenceLaunch";
import SmsSetup from "@/pages/marketing/SmsSetup";
import SmsComposer from "@/pages/marketing/SmsComposer";
import SmsSends from "@/pages/marketing/SmsSends";
import NpsSurveys from "@/pages/marketing/NpsSurveys";
import NpsSurveyDetail from "@/pages/marketing/NpsSurveyDetail";
import Insights from "@/pages/marketing/Insights";
import Create from "@/pages/marketing/Create";
import NpsResponse from "@/pages/NpsResponse";
import PortfolioAnalytics from "@/pages/admin/marketing/PortfolioAnalytics";
import AdminSequenceTemplates from "@/pages/admin/marketing/AdminSequenceTemplates";
import AdminSchools from "@/pages/admin/marketing/AdminSchools";
import AdminNpsOverview from "@/pages/admin/marketing/AdminNpsOverview";
import AdminAudits from "@/pages/admin/marketing/AdminAudits";
import AdminBrowseOrgs from "@/pages/admin/AdminBrowseOrgs";
import EventIntake from "@/pages/events/EventIntake";
import AdminEventIntake from "@/pages/admin/events/AdminEventIntake";
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
            <Route path="/onboard/:token" element={<StaffOnboard />} />
            <Route path="/portal/seller/:acquisitionId" element={<ProtectedRoute role="seller_portal"><SellerPortal /></ProtectedRoute>} />
            <Route path="/set-password" element={<ProtectedRoute><SetPassword /></ProtectedRoute>} />
            <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
            <Route path="/customize" element={<ProtectedRoute role="org_user"><Customize /></ProtectedRoute>} />
            <Route path="/intake" element={<ProtectedRoute role="org_user" module="allegiance"><Intake /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute role="org_user" module="allegiance"><Dashboard /></ProtectedRoute>} />
            <Route path="/plan" element={<ProtectedRoute role="org_user" module="allegiance"><Plan /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute role="org_user" module="allegiance"><Report /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute role="org_user" module="allegiance"><Team /></ProtectedRoute>} />
            <Route path="/calculators" element={<ProtectedRoute module="allegiance"><Calculators /></ProtectedRoute>} />
            <Route path="/calculators/:orgId" element={<ProtectedRoute role="admin" module="allegiance"><Calculators /></ProtectedRoute>} />
            <Route path="/communications" element={<ProtectedRoute module="allegiance"><Communications /></ProtectedRoute>} />
            <Route path="/communications/:orgId" element={<ProtectedRoute role="admin" module="allegiance"><Communications /></ProtectedRoute>} />
            <Route path="/sponsorships" element={<ProtectedRoute role="org_user" module="allegiance"><OrgSponsorships /></ProtectedRoute>} />
            <Route path="/marketing" element={<ProtectedRoute role="org_user"><MarketingHub /></ProtectedRoute>} />
            <Route path="/marketing/brand-kit" element={<ProtectedRoute role="org_user"><BrandKit /></ProtectedRoute>} />
            <Route path="/marketing/contacts" element={<ProtectedRoute role="org_user"><Contacts /></ProtectedRoute>} />
            <Route path="/marketing/email-setup" element={<ProtectedRoute role="org_user"><EmailSetup /></ProtectedRoute>} />
            <Route path="/marketing/designs" element={<ProtectedRoute><Designs /></ProtectedRoute>} />
            <Route path="/marketing/media" element={<ProtectedRoute><Media /></ProtectedRoute>} />
            <Route path="/marketing/designs/:id" element={<ProtectedRoute><DesignEditor /></ProtectedRoute>} />
            <Route path="/marketing/emails" element={<ProtectedRoute><Emails /></ProtectedRoute>} />
            <Route path="/marketing/emails/new" element={<ProtectedRoute><EmailComposer /></ProtectedRoute>} />
            <Route path="/marketing/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/marketing/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
            <Route path="/marketing/shortlinks" element={<ProtectedRoute><Shortlinks /></ProtectedRoute>} />
            <Route path="/marketing/ab-tests" element={<ProtectedRoute><AbTests /></ProtectedRoute>} />
            <Route path="/marketing/send-times" element={<ProtectedRoute><SendTimes /></ProtectedRoute>} />
            <Route path="/marketing/sms-companion" element={<ProtectedRoute><SmsCompanion /></ProtectedRoute>} />
            <Route path="/marketing/social" element={<ProtectedRoute><SocialAccounts /></ProtectedRoute>} />
            <Route path="/admin/marketing/templates" element={<ProtectedRoute role="admin" module="marketing"><AdminDesignTemplates /></ProtectedRoute>} />
            <Route path="/admin/marketing/email-templates" element={<ProtectedRoute role="admin" module="marketing"><AdminEmailTemplates /></ProtectedRoute>} />
            <Route path="/marketing/sequences" element={<ProtectedRoute><SequenceLibrary /></ProtectedRoute>} />
            <Route path="/marketing/sequences/:id" element={<ProtectedRoute><SequencePreview /></ProtectedRoute>} />
            <Route path="/marketing/sequences/:id/launch" element={<ProtectedRoute><SequenceLaunch /></ProtectedRoute>} />
            <Route path="/marketing/sms-setup" element={<ProtectedRoute><SmsSetup /></ProtectedRoute>} />
            <Route path="/marketing/sms" element={<ProtectedRoute><SmsSends /></ProtectedRoute>} />
            <Route path="/marketing/sms/new" element={<ProtectedRoute><SmsComposer /></ProtectedRoute>} />
            <Route path="/marketing/nps" element={<ProtectedRoute><NpsSurveys /></ProtectedRoute>} />
            <Route path="/marketing/nps/:id" element={<ProtectedRoute><NpsSurveyDetail /></ProtectedRoute>} />
            <Route path="/marketing/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/marketing/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/create" element={<ProtectedRoute role="admin" module="marketing"><Create /></ProtectedRoute>} />
            <Route path="/nps/:token" element={<NpsResponse />} />
            <Route path="/nps/preview/:surveyId" element={<NpsResponse />} />
            <Route path="/events/intake/:slug" element={<EventIntake />} />
            <Route path="/events/intake" element={<EventIntake />} />
            <Route path="/admin/events/intake" element={<ProtectedRoute role="admin" module="events"><AdminEventIntake /></ProtectedRoute>} />

            {/* Admin "act on behalf of org" — same components, scoped via URL :orgId */}
            <Route path="/admin/orgs" element={<ProtectedRoute role="admin" module="marketing"><AdminBrowseOrgs /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing" element={<ProtectedRoute role="admin" module="marketing"><MarketingHub /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/brand-kit" element={<ProtectedRoute role="admin" module="marketing"><BrandKit /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/contacts" element={<ProtectedRoute role="admin" module="marketing"><Contacts /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/email-setup" element={<ProtectedRoute role="admin" module="marketing"><EmailSetup /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/designs" element={<ProtectedRoute role="admin" module="marketing"><Designs /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/media" element={<ProtectedRoute role="admin" module="marketing"><Media /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/designs/:id" element={<ProtectedRoute role="admin" module="marketing"><DesignEditor /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/emails" element={<ProtectedRoute role="admin" module="marketing"><Emails /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/emails/new" element={<ProtectedRoute role="admin" module="marketing"><EmailComposer /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/campaigns" element={<ProtectedRoute role="admin" module="marketing"><Campaigns /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/campaigns/:id" element={<ProtectedRoute role="admin" module="marketing"><CampaignDetail /></ProtectedRoute>} />
            
            <Route path="/admin/orgs/:orgId/marketing/shortlinks" element={<ProtectedRoute role="admin" module="marketing"><Shortlinks /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/ab-tests" element={<ProtectedRoute role="admin" module="marketing"><AbTests /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/send-times" element={<ProtectedRoute role="admin" module="marketing"><SendTimes /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sms-companion" element={<ProtectedRoute role="admin" module="marketing"><SmsCompanion /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/social" element={<ProtectedRoute role="admin" module="marketing"><SocialAccounts /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sequences" element={<ProtectedRoute role="admin" module="marketing"><SequenceLibrary /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sequences/:id" element={<ProtectedRoute role="admin" module="marketing"><SequencePreview /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sequences/:id/launch" element={<ProtectedRoute role="admin" module="marketing"><SequenceLaunch /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sms-setup" element={<ProtectedRoute role="admin" module="marketing"><SmsSetup /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sms" element={<ProtectedRoute role="admin" module="marketing"><SmsSends /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/sms/new" element={<ProtectedRoute role="admin" module="marketing"><SmsComposer /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/nps" element={<ProtectedRoute role="admin" module="marketing"><NpsSurveys /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/nps/:id" element={<ProtectedRoute role="admin" module="marketing"><NpsSurveyDetail /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId/marketing/insights" element={<ProtectedRoute role="admin" module="marketing"><Insights /></ProtectedRoute>} />
            <Route path="/admin/marketing/portfolio" element={<ProtectedRoute role="admin" module="marketing"><PortfolioAnalytics /></ProtectedRoute>} />
            <Route path="/admin/marketing/sequence-templates" element={<ProtectedRoute role="admin" module="marketing"><AdminSequenceTemplates /></ProtectedRoute>} />
            <Route path="/admin/marketing/schools" element={<ProtectedRoute role="admin" module="marketing"><AdminSchools /></ProtectedRoute>} />
            <Route path="/admin/marketing/nps" element={<ProtectedRoute role="admin" module="marketing"><AdminNpsOverview /></ProtectedRoute>} />
            <Route path="/admin/marketing/audits" element={<ProtectedRoute role="admin" module="marketing"><AdminAudits /></ProtectedRoute>} />
            <Route path="/admin/communications" element={<ProtectedRoute role="admin" module="allegiance"><AdminCommunications /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin" module="allegiance"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute role="admin" module="allegiance"><AdminTasksPage /></ProtectedRoute>} />
            <Route path="/admin/my-tasks" element={<ProtectedRoute role="admin" module="allegiance"><AdminMyTasks /></ProtectedRoute>} />
            <Route path="/admin/weekly-focus" element={<ProtectedRoute role="admin" module="allegiance"><AdminWeeklyFocus /></ProtectedRoute>} />
            <Route path="/admin/roadmap" element={<ProtectedRoute role="admin" module="allegiance"><AdminRoadmap /></ProtectedRoute>} />
            <Route path="/admin/acquisitions" element={<ProtectedRoute role="admin" module="acquisitions"><AcquisitionsDashboard /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/settings" element={<ProtectedRoute role="admin" module="acquisitions"><AcquisitionsSettings /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/compliance" element={<ProtectedRoute role="admin" module="acquisitions"><ComplianceOverview /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/meetings" element={<ProtectedRoute role="admin" module="acquisitions"><MeetingsInbox /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/:id/transcript/:transcriptId" element={<ProtectedRoute role="admin" module="acquisitions"><TranscriptDetail /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/transcript/:transcriptId" element={<ProtectedRoute role="admin" module="acquisitions"><TranscriptDetail /></ProtectedRoute>} />
            <Route path="/admin/acquisitions/:id" element={<ProtectedRoute role="admin" module="acquisitions"><AcquisitionDetail /></ProtectedRoute>} />
            <Route path="/admin/tasks-this-week" element={<ProtectedRoute role="admin" module="allegiance"><AdminTasksThisWeek /></ProtectedRoute>} />
            <Route path="/admin/task-tracker" element={<ProtectedRoute role="admin" module="allegiance"><AdminTaskTracker /></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute role="admin" module="allegiance"><AdminHealthReports /></ProtectedRoute>} />
            <Route path="/admin/presentations" element={<ProtectedRoute role="admin" module="allegiance"><AdminPresentations /></ProtectedRoute>} />
            <Route path="/admin/pipeline" element={<ProtectedRoute role="admin" module="allegiance"><AdminPipeline /></ProtectedRoute>} />
            <Route path="/admin/revenue-share" element={<ProtectedRoute role="admin" module="allegiance"><RevenueShare /></ProtectedRoute>} />
            <Route path="/admin/revenue-share/:orgId" element={<ProtectedRoute role="admin" module="allegiance"><OrgRevenueShareDetail /></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute role="admin" module="allegiance"><AdminTemplates /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/users/lookup" element={<ProtectedRoute role="admin"><AdminUserLookup /></ProtectedRoute>} />
            <Route path="/admin/invite" element={<ProtectedRoute role="admin"><AdminInvite /></ProtectedRoute>} />
            <Route path="/admin/system/wiring-status" element={<ProtectedRoute role="admin"><SystemIntegrations /></ProtectedRoute>} />
            
            <Route path="/admin/org/:orgId" element={<ProtectedRoute role="admin" module="allegiance"><OrgDetail /></ProtectedRoute>} />
            <Route path="/admin/org/:orgId/tasks" element={<ProtectedRoute role="admin" module="allegiance"><OrgDetail /></ProtectedRoute>} />
            <Route path="/admin/org/:orgId/engine/:engine" element={<ProtectedRoute role="admin" module="allegiance"><AdminEngineFocus /></ProtectedRoute>} />
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
