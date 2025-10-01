import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { HomeRedirect } from "./components/HomeRedirect";
import { RoleBasedRoute } from "./components/RoleBasedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatbotPage from "./pages/ChatbotPage";
import MeditationPage from "./pages/MeditationPage";
import RequestPeerSupportPage from "./pages/RequestPeerSupportPage";
import RequestCounselorPage from "./pages/RequestCounselorPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import SessionDetailsPage from "./pages/SessionDetailsPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import AssessmentPage from "./pages/AssessmentPage";
import CrisisPage from "./pages/CrisisPage";
import MySessionsPage from "./pages/MySessionsPage";
import PeerAvailablePage from "./pages/PeerAvailablePage";
import CounselorAvailablePage from "./pages/CounselorAvailablePage";
import CounselorNotesPage from "./pages/CounselorNotesPage";
import PeerResourcesPage from "./pages/PeerResourcesPage";
import PeerCounselorDashboard from "./pages/PeerCounselorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter 
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/dashboard" element={
              <RoleBasedRoute allowedRoles={['peer', 'counselor']}>
                <PeerCounselorDashboard />
              </RoleBasedRoute>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/chatbot" element={
              <RoleBasedRoute allowedRoles={['patient']}>
                <ChatbotPage />
              </RoleBasedRoute>
            } />
            <Route path="/meditation" element={
              <RoleBasedRoute>
                <MeditationPage />
              </RoleBasedRoute>
            } />
            <Route path="/peer/request" element={
              <RoleBasedRoute allowedRoles={['patient']}>
                <RequestPeerSupportPage />
              </RoleBasedRoute>
            } />
            <Route path="/counselor/request" element={
              <RoleBasedRoute allowedRoles={['patient']}>
                <RequestCounselorPage />
              </RoleBasedRoute>
            } />
            <Route path="/admin/analytics" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminAnalyticsPage />
              </RoleBasedRoute>
            } />
            <Route path="/session/:sessionId" element={
              <ErrorBoundary>
                <RoleBasedRoute>
                  <SessionDetailsPage />
                </RoleBasedRoute>
              </ErrorBoundary>
            } />
            <Route path="/questionnaire/:type" element={
              <RoleBasedRoute>
                <QuestionnairePage />
              </RoleBasedRoute>
            } />
            <Route path="/assessment" element={
              <RoleBasedRoute>
                <AssessmentPage />
              </RoleBasedRoute>
            } />
            <Route path="/crisis" element={<CrisisPage />} />
            <Route path="/my-sessions" element={
              <RoleBasedRoute>
                <MySessionsPage />
              </RoleBasedRoute>
            } />
            <Route path="/peer/available" element={
              <RoleBasedRoute allowedRoles={['peer']}>
                <PeerAvailablePage />
              </RoleBasedRoute>
            } />
            <Route path="/counselor/available" element={
              <RoleBasedRoute allowedRoles={['counselor']}>
                <CounselorAvailablePage />
              </RoleBasedRoute>
            } />
            <Route path="/counselor/notes" element={
              <RoleBasedRoute allowedRoles={['counselor']}>
                <CounselorNotesPage />
              </RoleBasedRoute>
            } />
            <Route path="/peer/resources" element={
              <RoleBasedRoute allowedRoles={['peer']}>
                <PeerResourcesPage />
              </RoleBasedRoute>
            } />
            <Route path="/sessions/:sessionId" element={
              <ErrorBoundary>
                <RoleBasedRoute>
                  <SessionDetailsPage />
                </RoleBasedRoute>
              </ErrorBoundary>
            } />
            {/* Legacy route redirects */}
            <Route path="/peer/chats" element={
              <RoleBasedRoute allowedRoles={['peer']}>
                <Navigate to="/peer/available" replace />
              </RoleBasedRoute>
            } />
            <Route path="/counselor/sessions" element={
              <RoleBasedRoute allowedRoles={['counselor']}>
                <Navigate to="/counselor/available" replace />
              </RoleBasedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
