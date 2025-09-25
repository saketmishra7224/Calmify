import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { useChatSocket } from "../hooks/useSocket";
import { Layout } from "@/components/Layout";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users, Clock, AlertTriangle, User, MessageCircle, CheckCircle, XCircle, Star, Loader2 } from "lucide-react";
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

export default function PeerChatPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeRating, setCloseRating] = useState<number>(0);
  const [closeFeedback, setCloseFeedback] = useState("");
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket.IO integration for real-time chat
  const socket = useChatSocket(currentSession?._id);

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (isLoading) return;
    
    if (!isAuthenticated || user?.role !== 'peer') {
      navigate('/login');
      return;
    }
    
    loadAvailableSessions();
  }, [isAuthenticated, user, navigate, isLoading]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [socket.messages]);

  // Load existing messages when session starts
  useEffect(() => {
    if (currentSession) {
      loadSessionMessages(currentSession._id);
    }
  }, [currentSession]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await apiService.getSession(sessionId);
      if (response.messages) {
        socket.setMessages(response.messages);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  };

  const loadAvailableSessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAvailableSessions({ 
        helperType: 'peer',
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
      await apiService.acceptSession(session._id, "Hi, I'm here to help and support you. How are you feeling today?");
      
      // Set current session - this will trigger Socket.IO to join the session
      setCurrentSession(session);
      setAvailableSessions(prev => prev.filter(s => s._id !== session._id));
      setError(null);
    } catch (error) {
      console.error('Failed to accept session:', error);
      setError('Failed to accept session');
    } finally {
      setLoading(false);
    }
  };

  const declineSession = async (session: Session) => {
    try {
      await apiService.declineSession(session._id, "Currently unavailable");
      setAvailableSessions(prev => prev.filter(s => s._id !== session._id));
    } catch (error) {
      console.error('Failed to decline session:', error);
      setError('Failed to decline session');
    }
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentSession || !socket.isConnected) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    
    // Stop typing indicator
    handleTypingStop();
    
    try {
      // Send message via Socket.IO for real-time delivery
      socket.sendMessage(currentSession._id, messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      // Restore message on error
      setNewMessage(messageText);
    }
  }, [newMessage, currentSession, socket]);

  const handleTypingStart = useCallback(() => {
    if (!currentSession || isTyping) return;
    
    setIsTyping(true);
    socket.setTyping(currentSession._id, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 2000);
  }, [currentSession, isTyping, socket]);

  const handleTypingStop = useCallback(() => {
    if (!currentSession || !isTyping) return;
    
    setIsTyping(false);
    socket.setTyping(currentSession._id, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentSession, isTyping, socket]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const escalateToCounselor = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const reason = escalationReason.trim() || 'Session escalated to professional counselor for specialized support';
      
      // Use Socket.IO to escalate session for real-time notification
      socket.escalateSession(
        currentSession._id,
        'severe',
        reason,
        'counselor'
      );
      
      // Also use API for backup
      await apiService.closeSession(
        currentSession._id, 
        undefined, 
        reason
      );
      
      setCurrentSession(null);
      socket.setMessages([]);
      setShowEscalateDialog(false);
      setEscalationReason("");
      await loadAvailableSessions();
    } catch (error) {
      console.error('Failed to escalate session:', error);
      setError('Failed to escalate session');
    } finally {
      setLoading(false);
    }
  };

  const openEscalateDialog = () => {
    setShowEscalateDialog(true);
  };

  const openCloseDialog = () => {
    setShowCloseDialog(true);
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      
      // Use Socket.IO to update session status for real-time notification
      socket.updateSessionStatus(currentSession._id, 'closed', {
        rating: closeRating || undefined,
        feedback: closeFeedback.trim() || "Session completed - peer support provided"
      });
      
      // Also use API for backup
      await apiService.closeSession(
        currentSession._id,
        closeRating || undefined,
        closeFeedback.trim() || "Session completed - peer support provided"
      );
      
      setCurrentSession(null);
      socket.setMessages([]);
      setCloseRating(0);
      setCloseFeedback("");
      setShowCloseDialog(false);
      await loadAvailableSessions();
    } catch (error) {
      console.error('Failed to end session:', error);
      setError('Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'peer') {
    return (
      <Layout currentRole="peer">
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to be logged in as a peer volunteer to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentRole="peer">
      <div className="flex h-full bg-gradient-to-br from-primary/5 to-background">
        {/* Session List Sidebar */}
        <div className="w-80 bg-gradient-to-b from-primary/5 to-primary/10 backdrop-blur-sm border-r border-primary/20 p-4 overflow-y-auto">
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
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No sessions waiting</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon for peer support requests</p>
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
                              {session.patientId.profile?.preferredName || 
                               session.patientId.profile?.firstName || 
                               session.patientId.username}
                            </p>
                          </div>
                          <Badge 
                            variant={session.severity === 'critical' ? 'destructive' : 
                                   session.severity === 'severe' ? 'destructive' : 
                                   session.severity === 'moderate' ? 'default' : 'secondary'}
                          >
                            {session.severity}
                          </Badge>
                        </div>
                        
                        {session.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Waiting {session.waitingMinutes || 0} min</span>
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
        <div className="flex-1 flex flex-col">
          {currentSession ? (
            <>
              {/* Header */}
              <ChatHeader
                title={`Supporting ${currentSession.patientId.profile?.preferredName || 
                                   currentSession.patientId.profile?.firstName || 
                                   currentSession.patientId.username}`}
                subtitle={`Session #${currentSession._id.slice(-6)}`}
                icon={<Users className="h-6 w-6 text-primary" />}
                badges={[
                  { 
                    text: `${currentSession.severity} severity`, 
                    variant: currentSession.severity === 'critical' ? 'destructive' as const : 'default' as const 
                  }
                ]}
                actions={
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={openEscalateDialog}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      disabled={loading}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Escalate to Counselor
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={openCloseDialog}
                      disabled={loading}
                    >
                      End Session
                    </Button>
                  </div>
                }
              />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-primary/5 to-transparent">
                {socket.messages.map((message) => (
                  <div key={message._id} className={`flex ${message.senderRole === 'peer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[80%] ${message.senderRole === 'peer' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.senderRole === 'peer' ? 'bg-primary/15 border border-primary/20' : 'bg-blue-100 border border-blue-200'
                      }`}>
                        {message.senderRole === 'peer' ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <ChatBubble
                        message={message.message}
                        sender={message.senderRole === 'peer' ? 'assistant' : 'user'}
                        timestamp={new Date(message.createdAt).toLocaleTimeString()}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {socket.isTypingIndicatorVisible && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm border border-primary/10 rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInput
                value={newMessage}
                onChange={handleInputChange}
                onSend={sendMessage}
                onKeyPress={handleKeyPress}
                placeholder="Type a supportive message..."
                disabled={!socket.isConnected || loading}
                isLoading={loading}
                helpText="Remember to be supportive, non-judgmental, and refer to professionals when needed."
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Ready to Help</h2>
                <p className="text-muted-foreground mb-4">
                  Accept a session from the sidebar to start providing peer support
                </p>
                <Button onClick={loadAvailableSessions}>
                  Check for New Sessions
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Peer Support Session</DialogTitle>
            <DialogDescription>
              You're about to end this peer support session. Please provide a rating and any feedback about the conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rating">How would you rate this session?</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCloseRating(star)}
                    className={`w-8 h-8 flex items-center justify-center ${
                      star <= closeRating 
                        ? 'text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${star <= closeRating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback">Session notes or feedback (optional)</Label>
              <Textarea
                id="feedback"
                value={closeFeedback}
                onChange={(e) => setCloseFeedback(e.target.value)}
                placeholder="Any notes about this peer support session..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={endSession} disabled={loading}>
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate to Counselor Dialog */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Escalate to Professional Counselor
            </DialogTitle>
            <DialogDescription>
              This will permanently end your peer support session and immediately connect the patient with a professional counselor for more specialized support.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="escalation-reason">Reason for escalation</Label>
              <Textarea
                id="escalation-reason"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Please explain why this session needs professional counselor support (e.g., patient needs specialized help, crisis situation, etc.)"
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="text-sm font-medium text-orange-800 mb-2">What happens next:</h4>
              <ul className="text-xs text-orange-700 space-y-1">
                <li>• Your peer support session will end immediately</li>
                <li>• The patient will be notified about the escalation</li>
                <li>• A counselor session request will be created automatically</li>
                <li>• Available counselors will be notified to accept the session</li>
                <li>• You cannot resume this session once escalated</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEscalateDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={escalateToCounselor} 
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Escalating...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Escalate to Counselor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}