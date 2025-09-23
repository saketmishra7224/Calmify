import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { Layout } from "@/components/Layout";
import { ChatBubble } from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Save, Calendar, User, AlertTriangle, Clock, FileText, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Session {
  _id: string;
  patientId: {
    _id: string;
    username: string;
    profile?: {
      preferredName?: string;
      firstName?: string;
    };
  };
  helperType: string;
  status: 'waiting' | 'active' | 'closed' | 'escalated';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  title?: string;
  description?: string;
  createdAt: string;
  startedAt?: string;
  waitingMinutes?: number;
  messageCount?: number;
}

interface Message {
  _id: string;
  sessionId: string;
  senderId: {
    _id: string;
    username: string;
    profile?: {
      preferredName?: string;
      firstName?: string;
    };
  };
  message: string;
  senderRole: 'patient' | 'peer' | 'counselor' | 'admin' | 'chatbot';
  messageType: 'text' | 'image' | 'file';
  createdAt: string;
  crisisDetected?: boolean;
}

export default function CounselorSessionPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'counselor') {
      navigate('/login');
      return;
    }
    
    loadAvailableSessions();
  }, [isAuthenticated, user, navigate]);

  const loadAvailableSessions = async () => {
    try {
      setLoading(true);
      // Get sessions for counselors (includes escalated ones and direct requests)
      const response = await apiService.getAvailableSessions({ 
        helperType: 'counselor',
        limit: 10 
      });
      setAvailableSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError('Failed to load available sessions');
    } finally {
      setLoading(false);
    }
  };

  const acceptSession = async (session: Session) => {
    try {
      setLoading(true);
      await apiService.acceptSession(
        session._id, 
        "Hello, I'm a licensed counselor and I'm here to provide professional support. Thank you for reaching out."
      );
      
      // Load session details and messages
      const sessionDetails = await apiService.getSession(session._id);
      setCurrentSession(sessionDetails.session);
      setMessages(sessionDetails.messages);
      
      // Remove from available sessions
      setAvailableSessions(prev => prev.filter(s => s._id !== session._id));
    } catch (error) {
      console.error('Failed to accept session:', error);
      setError('Failed to accept session');
    } finally {
      setLoading(false);
    }
  };

  const declineSession = async (session: Session) => {
    try {
      await apiService.declineSession(session._id, "Currently at capacity - session referred to available counselor");
      setAvailableSessions(prev => prev.filter(s => s._id !== session._id));
    } catch (error) {
      console.error('Failed to decline session:', error);
      setError('Failed to decline session');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    try {
      await apiService.sendMessage({
        sessionId: currentSession._id,
        message: newMessage.trim(),
        messageType: 'text'
      });

      // Add message to local state immediately for better UX
      const messageData: Message = {
        _id: `temp-${Date.now()}`,
        sessionId: currentSession._id,
        senderId: {
          _id: user!._id,
          username: user!.username,
          profile: user!.profile
        },
        message: newMessage.trim(),
        senderRole: 'counselor',
        messageType: 'text',
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, messageData]);
      setNewMessage("");

      // Reload messages to get the actual message from backend
      setTimeout(async () => {
        try {
          const sessionDetails = await apiService.getSession(currentSession._id);
          setMessages(sessionDetails.messages);
        } catch (error) {
          console.error('Failed to reload messages:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  const saveSessionNotes = async () => {
    if (!currentSession || !notes.trim()) return;

    try {
      setLoading(true);
      // Save notes through session close with professional notes
      // Note: In a real implementation, you'd have a separate endpoint for saving notes
      await apiService.closeSession(
        currentSession._id, 
        undefined, 
        undefined,
        notes.trim()
      );
      
      setNotes("");
      alert("Session notes saved successfully");
    } catch (error) {
      console.error('Failed to save notes:', error);
      setError('Failed to save session notes');
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      await apiService.closeSession(
        currentSession._id,
        undefined,
        "Session completed - professional support provided",
        notes.trim() || undefined
      );
      
      setCurrentSession(null);
      setMessages([]);
      setNotes("");
      await loadAvailableSessions();
    } catch (error) {
      console.error('Failed to end session:', error);
      setError('Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'counselor') {
    return (
      <Layout currentRole="counselor">
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to be logged in as a licensed counselor to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentRole="counselor">
      <div className="flex h-screen bg-background">
        {/* Session List Sidebar */}
        <div className="w-80 bg-white border-r border-border p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Available Sessions</h2>
              <Button variant="outline" size="sm" onClick={loadAvailableSessions}>
                Refresh
              </Button>
            </div>

            {error && (
              <Alert className="border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading sessions...</p>
              </div>
            ) : availableSessions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No sessions available</p>
                <p className="text-xs text-muted-foreground mt-1">Check back for professional consultation requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSessions.map((session) => (
                  <Card key={session._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-foreground">
                              Session #{session._id.slice(-6)}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Patient: {session.patientId.profile?.preferredName || 
                                       session.patientId.profile?.firstName || 
                                       session.patientId.username}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Badge 
                              variant={session.severity === 'critical' ? 'destructive' : 
                                     session.severity === 'severe' ? 'destructive' : 
                                     session.severity === 'moderate' ? 'default' : 'secondary'}
                            >
                              {session.severity}
                            </Badge>
                            {session.status === 'escalated' && (
                              <Badge variant="outline" className="text-xs">
                                Escalated
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {session.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Waiting {session.waitingMinutes || 0} min</span>
                          {session.messageCount && (
                            <>
                              <span>•</span>
                              <MessageCircle className="h-3 w-3" />
                              <span>{session.messageCount} messages</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => acceptSession(session)}
                            className="flex-1"
                            disabled={loading}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => declineSession(session)}
                            disabled={loading}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            {currentSession ? (
              <>
                {/* Header */}
                <div className="bg-white border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-semibold text-foreground">
                        Professional Session - Patient {currentSession.patientId.profile?.preferredName || 
                                                     currentSession.patientId.profile?.firstName || 
                                                     currentSession.patientId.username}
                      </h1>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={currentSession.severity === 'critical' ? 'destructive' : 'default'}>
                          {currentSession.severity} severity
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Session #{currentSession._id.slice(-6)}
                        </span>
                        {currentSession.status === 'escalated' && (
                          <Badge variant="outline">Escalated from Peer Support</Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={endSession}
                    >
                      End Session
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message._id}>
                      {message.crisisDetected && (
                        <Alert className="mb-2 border-destructive bg-destructive/10">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-destructive text-xs">
                            Crisis indicators detected in this message
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className={`flex ${message.senderRole === 'counselor' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[80%] ${message.senderRole === 'counselor' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.senderRole === 'counselor' ? 'bg-primary/10' : 
                            message.senderRole === 'peer' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {message.senderRole === 'counselor' ? (
                              <FileText className="h-4 w-4 text-primary" />
                            ) : message.senderRole === 'peer' ? (
                              <User className="h-4 w-4 text-green-600" />
                            ) : (
                              <User className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <ChatBubble
                            message={message.message}
                            sender={message.senderRole === 'counselor' ? 'assistant' : 
                                   message.crisisDetected ? 'urgent' : 'user'}
                            timestamp={new Date(message.createdAt).toLocaleTimeString()}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="bg-white border-t border-border p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type professional response..."
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Professional counseling session - maintain clinical standards and documentation requirements.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">Ready for Sessions</h2>
                  <p className="text-muted-foreground mb-4">
                    Accept a session from the sidebar to begin professional counseling
                  </p>
                  <Button onClick={loadAvailableSessions}>
                    Check for New Sessions
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Session Notes Sidebar */}
          {currentSession && (
            <div className="w-80 bg-white border-l border-border p-4">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Session Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm mb-2">Clinical Notes</h3>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Document assessment, interventions, treatment plan..."
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Session Type:</p>
                        <p className="font-medium">Text Counseling</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration:</p>
                        <p className="font-medium">Ongoing</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Severity:</p>
                        <p className="font-medium capitalize">{currentSession.severity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status:</p>
                        <p className="font-medium capitalize">{currentSession.status}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={saveSessionNotes}
                        disabled={!notes.trim() || loading}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Session Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>• Maintain professional boundaries</p>
                    <p>• Document assessment and interventions</p>
                    <p>• Monitor for crisis indicators</p>
                    <p>• Follow up with care coordination</p>
                    <p>• Ensure HIPAA compliance</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}