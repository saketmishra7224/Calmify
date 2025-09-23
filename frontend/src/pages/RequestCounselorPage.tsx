import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, UserCheck, Clock, Shield, CheckCircle, Star } from "lucide-react";

interface Session {
  _id: string;
  helperType: string;
  status: 'waiting' | 'active' | 'closed' | 'escalated';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  title?: string;
  description?: string;
  createdAt: string;
  waitingMinutes?: number;
}

export default function RequestCounselorPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | 'critical'>('mild');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'patient') {
      navigate('/');
      return;
    }

    checkActiveSession();
  }, [isAuthenticated, user, navigate]);

  const checkActiveSession = async () => {
    try {
      const response = await apiService.getMySessions();
      const activeCounselorSession = response.sessions?.find(
        (session: Session) => 
          session.helperType === 'counselor' && 
          (session.status === 'waiting' || session.status === 'active')
      );
      if (activeCounselorSession) {
        setActiveSession(activeCounselorSession);
      }
    } catch (err) {
      console.error('Failed to check active sessions:', err);
    }
  };

  const handleCreateSession = async () => {
    if (!title.trim()) {
      setError('Please provide a title for your counseling request');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.createSession({
        helperType: 'counselor',
        severity,
        title: title.trim(),
        description: description.trim() || undefined
      });

      setSuccess(true);
      setActiveSession(response.session);
      
      // Clear form
      setTitle("");
      setDescription("");
      setSeverity('mild');

    } catch (err: any) {
      console.error('Failed to create counselor session:', err);
      setError(err.message || 'Failed to create counseling session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = () => {
    if (activeSession) {
      navigate(`/session/${activeSession._id}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated || user?.role !== 'patient') {
    return null;
  }

  return (
    <Layout currentRole={user?.role || 'patient'}>
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <UserCheck className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Professional Counseling
            </h1>
            <p className="text-lg text-muted-foreground">
              Connect with licensed mental health professionals for expert guidance and support
            </p>
          </div>

          {/* Active Session Card */}
          {activeSession && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Active Counseling Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{activeSession.title}</h3>
                    {activeSession.description && (
                      <p className="text-muted-foreground mt-1">{activeSession.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <Badge className={getSeverityColor(activeSession.severity)}>
                      {activeSession.severity}
                    </Badge>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {activeSession.status === 'waiting' ? 'Waiting for counselor' : 'Active'}
                    </span>
                  </div>

                  <Button onClick={handleJoinSession} className="w-full">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {activeSession.status === 'waiting' ? 'Check Status' : 'Continue Session'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {success && !activeSession && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your counseling request has been submitted successfully! A licensed counselor will connect with you soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Request Form */}
          {!activeSession && (
            <Card>
              <CardHeader>
                <CardTitle>Request Professional Counseling</CardTitle>
                <p className="text-muted-foreground">
                  Schedule a session with a licensed mental health professional
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">What would you like to work on?</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Anxiety management, Depression, Relationship issues..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-sm text-muted-foreground">
                    {title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Tell us more about your situation (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what's been going on, your goals, or anything else you'd like your counselor to know..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    {description.length}/500 characters
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>How urgent is your need for support?</Label>
                  <RadioGroup value={severity} onValueChange={(value: any) => setSeverity(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mild" id="mild" />
                      <Label htmlFor="mild">Mild - General support and guidance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="moderate" id="moderate" />
                      <Label htmlFor="moderate">Moderate - Experiencing significant distress</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="severe" id="severe" />
                      <Label htmlFor="severe">Severe - Struggling significantly, need help soon</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="critical" id="critical" />
                      <Label htmlFor="critical">Critical - In crisis, need immediate professional help</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">What to expect</h4>
                      <ul className="text-sm text-blue-800 mt-2 space-y-1">
                        <li>• You'll be matched with a licensed mental health professional</li>
                        <li>• Response time is typically 10-30 minutes during business hours</li>
                        <li>• Sessions follow professional ethical guidelines</li>
                        <li>• All conversations are completely confidential</li>
                        <li>• Sessions can be scheduled for follow-up if needed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateSession} 
                  className="w-full"
                  disabled={loading || !title.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting you with a counselor...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Request Professional Counseling
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Information Section */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Star className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Licensed Professionals</h3>
                  <p className="text-sm text-muted-foreground">
                    All our counselors are licensed mental health professionals with years of experience
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Flexible Scheduling</h3>
                  <p className="text-sm text-muted-foreground">
                    Sessions available during extended hours with both immediate and scheduled options
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Professional Standards</h3>
                  <p className="text-sm text-muted-foreground">
                    All sessions follow professional ethical guidelines and maintain strict confidentiality
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}