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
import { Loader2, MessageCircle, Users, Clock, Heart, CheckCircle, UserPlus } from "lucide-react";

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

export default function RequestPeerSupportPage() {
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
      const activePeerSession = response.sessions?.find(
        (session: Session) => 
          session.helperType === 'peer' && 
          (session.status === 'waiting' || session.status === 'active')
      );
      if (activePeerSession) {
        setActiveSession(activePeerSession);
      }
    } catch (err) {
      console.error('Failed to check active sessions:', err);
    }
  };

  const handleCreateSession = async () => {
    if (!title.trim()) {
      setError('Please provide a title for your peer support request');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.createSession({
        helperType: 'peer',
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
      console.error('Failed to create peer session:', err);
      setError(err.message || 'Failed to create peer support session');
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
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Peer Support
            </h1>
            <p className="text-lg text-muted-foreground">
              Connect with someone who understands - find support from people with similar experiences
            </p>
          </div>

          {/* Active Session Card */}
          {activeSession && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Active Peer Support Session
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
                      {activeSession.status === 'waiting' ? 'Waiting for peer supporter' : 'Active'}
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
                Your peer support request has been submitted successfully! A peer supporter will connect with you soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Request Form */}
          {!activeSession && (
            <Card>
              <CardHeader>
                <CardTitle>Request Peer Support</CardTitle>
                <p className="text-muted-foreground">
                  Connect with someone who has walked a similar path and can offer understanding and encouragement
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
                  <Label htmlFor="title">What kind of support are you looking for?</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Someone to talk to about anxiety, Need encouragement..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-sm text-muted-foreground">
                    {title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Tell us more about what you're going through (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Share what's on your mind, what you're struggling with, or what kind of peer support would be most helpful..."
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
                  <Label>How urgent is your need for peer support?</Label>
                  <RadioGroup value={severity} onValueChange={(value: any) => setSeverity(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mild" id="mild" />
                      <Label htmlFor="mild">Mild - Just need someone to talk to</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="moderate" id="moderate" />
                      <Label htmlFor="moderate">Moderate - Having a tough time, could use support</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="severe" id="severe" />
                      <Label htmlFor="severe">Severe - Really struggling, need someone who understands</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="critical" id="critical" />
                      <Label htmlFor="critical">Critical - In a very difficult place, need immediate peer support</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Heart className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">What to expect</h4>
                      <ul className="text-sm text-blue-800 mt-2 space-y-1">
                        <li>• You'll be matched with someone who has similar experiences</li>
                        <li>• Peer supporters are trained volunteers, not professional counselors</li>
                        <li>• Response time is typically 15-45 minutes during active hours</li>
                        <li>• Conversations are supportive and non-judgmental</li>
                        <li>• All chats are confidential within our community guidelines</li>
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
                      Finding a peer supporter...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Request Peer Support
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
                  <UserPlus className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Lived Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with people who have faced similar challenges and can offer genuine understanding
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Available 24/7</h3>
                  <p className="text-sm text-muted-foreground">
                    Our peer support community is active around the clock with volunteers ready to help
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Safe & Supportive</h3>
                  <p className="text-sm text-muted-foreground">
                    A welcoming community focused on mutual support, encouragement, and shared healing
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