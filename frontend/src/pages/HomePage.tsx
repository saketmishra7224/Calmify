import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { MessageCircle, AlertTriangle, Brain, BookOpen, Clock, UserPlus } from "lucide-react";

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, createAnonymousSession } = useAuth();
  const role = searchParams.get("role") || user?.role || "student";

  const handleAnonymousStart = async () => {
    try {
      await createAnonymousSession();
      navigate('/chatbot');
    } catch (error) {
      console.error('Failed to create anonymous session:', error);
    }
  };

  const handleStartChatbot = () => {
    if (isAuthenticated) {
      navigate('/chatbot');
    } else {
      navigate('/login');
    }
  };

  const handleTakeAssessment = () => {
    if (isAuthenticated) {
      navigate('/questionnaire/PHQ-9');
    } else {
      navigate('/login');
    }
  };

  return (
    <Layout currentRole={role}>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Your Safe Space for Mental Health
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with AI, peers, and counsellors in a confidential environment designed for your wellbeing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 py-3" onClick={handleStartChatbot}>
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Chat with AI
              </Button>
              <Button size="lg" variant="destructive" className="px-8 py-3" onClick={() => navigate('/crisis')}>
                <AlertTriangle className="mr-2 h-5 w-5" />
                Emergency Help
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" className="px-8 py-3" onClick={() => navigate('/register')}>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Join Community
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Quick Actions for Authenticated Users */}
        {isAuthenticated && (
          <section className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-center mb-8">Quick Actions</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                     onClick={handleTakeAssessment}>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Take Assessment</h3>
                  <p className="text-muted-foreground mb-4">PHQ-9 depression screening</p>
                </div>

                <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => navigate('/peer/request')}>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Peer Support</h3>
                  <p className="text-muted-foreground mb-4">Connect with trained volunteers</p>
                </div>

                <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => navigate('/counselor/request')}>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Professional Help</h3>
                  <p className="text-muted-foreground mb-4">Talk to licensed counselors</p>
                </div>

                <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => navigate('/meditation')}>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Meditation</h3>
                  <p className="text-muted-foreground mb-4">Guided relaxation exercises</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-8">How We Support You</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">24/7 AI Support</h3>
                <p className="text-muted-foreground mb-4">Always available chatbot for immediate support and guidance</p>
              </div>

              <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Evidence-Based Assessments</h3>
                <p className="text-muted-foreground mb-4">PHQ-9, GAD-7, and other validated screening tools</p>
              </div>

              <div className="text-center p-6 border border-border rounded-lg hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Crisis Intervention</h3>
                <p className="text-muted-foreground mb-4">Immediate support when you need it most</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        {!isAuthenticated && (
          <section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of people who have found support and guidance through our platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/register')}>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Account
                </Button>
                <Button size="lg" variant="outline" onClick={handleAnonymousStart}>
                  Try Anonymously
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}