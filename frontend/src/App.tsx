import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatbotPage from "./pages/ChatbotPage";
import MeditationPage from "./pages/MeditationPage";
import PeerChatPage from "./pages/PeerChatPage";
import CounselorSessionPage from "./pages/CounselorSessionPage";
import RequestPeerSupportPage from "./pages/RequestPeerSupportPage";
import RequestCounselorPage from "./pages/RequestCounselorPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import SessionDetailsPage from "./pages/SessionDetailsPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import AssessmentPage from "./pages/AssessmentPage";
import CrisisPage from "./pages/CrisisPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/meditation" element={<MeditationPage />} />
            <Route path="/peer/chats" element={<PeerChatPage />} />
            <Route path="/counselor/sessions" element={<CounselorSessionPage />} />
            <Route path="/peer/request" element={<RequestPeerSupportPage />} />
            <Route path="/counselor/request" element={<RequestCounselorPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/session/:sessionId" element={<SessionDetailsPage />} />
            <Route path="/questionnaire/:type" element={<QuestionnairePage />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/crisis" element={<CrisisPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
