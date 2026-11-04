import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { RoleProvider } from "@/lib/rbac";
import { ScopeProvider } from "@/lib/scope";
import { DataProvider } from "@/store/DataStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageSkeleton } from "@/components/marcomm/PageSkeleton";
import { RequireRole } from "@/components/marcomm/RequireRole";

const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const IdeationHub = lazy(() => import("@/pages/IdeationHub"));
const IdeaDetail = lazy(() => import("@/pages/IdeaDetail"));
const CampaignList = lazy(() => import("@/pages/CampaignList"));
const CampaignDetail = lazy(() => import("@/pages/CampaignDetail"));
const ContentList = lazy(() => import("@/pages/ContentList"));
const ContentDetail = lazy(() => import("@/pages/ContentDetail"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const ApprovalsInbox = lazy(() => import("@/pages/ApprovalsInbox"));
const ApprovalDetail = lazy(() => import("@/pages/ApprovalDetail"));
const AssetLibrary = lazy(() => import("@/pages/AssetLibrary"));
const AssetDetail = lazy(() => import("@/pages/AssetDetail"));
const LoginPicker = lazy(() => import("@/pages/LoginPicker"));

/** First-time visitors pick a seeded identity; returning visitors skip ahead. */
function FirstRunGate() {
  let hasIdentity = false;
  try {
    hasIdentity = localStorage.getItem("marcomm-role") !== null;
  } catch {
    /* storage unavailable — treat as returning visitor */
    hasIdentity = true;
  }
  return <Navigate to={hasIdentity ? "/dashboard" : "/login"} replace />;
}
const PerformancePage = lazy(() => import("@/pages/PerformancePage"));
const BoardPackPage = lazy(() => import("@/pages/BoardPackPage"));
const BudgetPage = lazy(() => import("@/pages/BudgetPage"));
const AudiencesPage = lazy(() => import("@/pages/AudiencesPage"));
const AudienceDetail = lazy(() => import("@/pages/AudienceDetail"));
const MarketIntelligencePage = lazy(() => import("@/pages/MarketIntelligencePage"));
const AgenciesPage = lazy(() => import("@/pages/AgenciesPage"));
const AgencyDetail = lazy(() => import("@/pages/AgencyDetail"));
const JourneysChannels = lazy(() => import("@/pages/JourneysChannels"));
const JourneyDetail = lazy(() => import("@/pages/JourneyDetail"));
const CommunicationsPage = lazy(() => import("@/pages/CommunicationsPage"));
const CommunicationDetail = lazy(() => import("@/pages/CommunicationDetail"));
const InternalCommsPage = lazy(() => import("@/pages/InternalCommsPage"));
const RulebookPage = lazy(() => import("@/pages/RulebookPage"));
const GovernancePage = lazy(() => import("@/pages/GovernancePage"));
const PRMediaPage = lazy(() => import("@/pages/PRMediaPage"));
const MediaContactDetail = lazy(() => import("@/pages/MediaContactDetail"));
const GraphExplorer = lazy(() => import("@/pages/GraphExplorer"));
const LifecyclePage = lazy(() => import("@/pages/LifecyclePage"));
const AgentsPage = lazy(() => import("@/pages/AgentsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <ScopeProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename="/marcomm/">
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    {/* First-run: visitors who never chose an identity see the
                        login picker; returning visitors go straight in. */}
                    <Route path="/" element={<FirstRunGate />} />
                    <Route path="/login" element={<LoginPicker />} />
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<CommandCenter />} />
                      <Route path="/lifecycle" element={<LifecyclePage />} />
                      <Route path="/agents" element={<AgentsPage />} />
                      <Route path="/ideas" element={<IdeationHub />} />
                      <Route path="/ideas/:id" element={<IdeaDetail />} />
                      <Route path="/campaigns" element={<CampaignList />} />
                      <Route path="/campaigns/:id" element={<CampaignDetail />} />
                      <Route path="/communications" element={<CommunicationsPage />} />
                      <Route path="/communications/:id" element={<CommunicationDetail />} />
                      <Route path="/internal" element={<RequireRole navKey="internal"><InternalCommsPage /></RequireRole>} />
                      <Route path="/content" element={<ContentList />} />
                      <Route path="/content/:id" element={<ContentDetail />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="/events" element={<EventsPage />} />
                      <Route path="/events/:id" element={<EventDetail />} />
                      <Route path="/approvals" element={<ApprovalsInbox />} />
                      <Route path="/approvals/:id" element={<ApprovalDetail />} />
                      <Route path="/assets" element={<AssetLibrary />} />
                      <Route path="/assets/:id" element={<AssetDetail />} />
                      <Route path="/journeys" element={<RequireRole navKey="journeys"><JourneysChannels /></RequireRole>} />
                      <Route path="/journeys/:id" element={<RequireRole navKey="journeys"><JourneyDetail /></RequireRole>} />
                      <Route path="/performance" element={<RequireRole navKey="performance"><PerformancePage /></RequireRole>} />
                      <Route path="/reports" element={<RequireRole navKey="reports"><BoardPackPage /></RequireRole>} />
                      <Route path="/budget" element={<RequireRole navKey="budget"><BudgetPage /></RequireRole>} />
                      <Route path="/audiences" element={<RequireRole navKey="audiences"><AudiencesPage /></RequireRole>} />
                      <Route path="/audiences/:id" element={<RequireRole navKey="audiences"><AudienceDetail /></RequireRole>} />
                      <Route path="/market" element={<RequireRole navKey="market"><MarketIntelligencePage /></RequireRole>} />
                      <Route path="/pr" element={<RequireRole navKey="pr"><PRMediaPage /></RequireRole>} />
                      <Route path="/pr/contacts/:id" element={<RequireRole navKey="pr"><MediaContactDetail /></RequireRole>} />
                      <Route path="/agencies" element={<RequireRole navKey="agencies"><AgenciesPage /></RequireRole>} />
                      <Route path="/agencies/:id" element={<RequireRole navKey="agencies"><AgencyDetail /></RequireRole>} />
                      <Route path="/rulebook" element={<RequireRole navKey="rulebook"><RulebookPage /></RequireRole>} />
                      <Route path="/governance" element={<RequireRole navKey="governance"><GovernancePage /></RequireRole>} />
                      <Route path="/admin" element={<RequireRole navKey="admin"><AdminPage /></RequireRole>} />
                      <Route path="/graph" element={<RequireRole navKey="graph"><GraphExplorer /></RequireRole>} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </DataProvider>
        </ScopeProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}
