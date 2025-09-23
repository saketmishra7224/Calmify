import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { useChatSocket } from "../hooks/useSocket";
import { Layout } from "@/components/Layout";
import { ChatBubble } from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, AlertTriangle, Clock, FileText, MessageCircle, CheckCircle, XCircle, Star } from "lucide-react";
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
  const [newMessage, setNewMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeRating, setCloseRating] = useState<number>(0);
  const [closeFeedback, setCloseFeedback] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Socket.IO integration for real-time chat
  const socket = useChatSocket(currentSession?._id);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'counselor') {
      navigate('/login');
      return;
    }
    
    loadAvailableSessions();
  }, [isAuthenticated, user, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [socket.messages]);

  const loadAvailableSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAvailableSessions();
      setAvailableSessions(response.sessions || []);
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
      setError(null);
      
      await apiService.acceptSession(session._id, "Hello! I'm a licensed professional counselor. I'm here to provide you with compassionate, evidence-based support. How are you feeling today?");
      
      // Join the Socket.IO room for this session
      socket.joinSession(session._id);
      
      setCurrentSession({
        ...session,
        status: 'active',
        startedAt: new Date().toISOString()
      });
      
      // Remove from available sessions
      setAvailableSessions(prev => prev.filter(s => s._id !== session._id));
    } catch (error) {
      console.error('Failed to accept session:', error);
      setError('Failed to accept session');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentSession) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      // Send through Socket.IO for real-time delivery
      socket.sendMessage(messageText, 'text');
      
      // Also send through API for persistence
      await apiService.sendMessage({
        sessionId: currentSession._id,
        message: messageText,
        messageType: 'text'
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      // Restore message text on error
      setNewMessage(messageText);
    }
  }, [newMessage, currentSession, socket]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openCloseDialog = () => {
    setShowCloseDialog(true);
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      await apiService.closeSession(
        currentSession._id,
        closeRating || undefined,
        closeFeedback.trim() || "Session completed - professional support provided"
      );
      
      // Leave the Socket.IO room
      socket.leaveSession(currentSession._id);
      
      setCurrentSession(null);
      setNotes("");
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

  if (!isAuthenticated || user?.role !== 'counselor') {
    return (
      <Layout>
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
    <Layout>
      <div className="flex h-full bg-gradient-to-b from-white to-gray-50">
        {/* Session List Sidebar */}
        <div className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 p-6 overflow-y-auto shadow-lg">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Sessions</h2>
              </div>
              <p className="text-gray-600 text-sm">Professional Counseling Queue</p>
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadAvailableSessions}
                className="bg-white/80 backdrop-blur-sm border-gray-300 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                Refresh Sessions
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-red-700 text-sm font-medium">Error</p>
                </div>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                </div>
                <p className="text-gray-600 font-medium">Loading sessions...</p>
                <p className="text-gray-500 text-sm mt-1">Please wait while we fetch available sessions</p>
              </div>
            ) : availableSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-2">No Active Sessions</h3>
                <p className="text-gray-600 text-sm mb-4">All patients are currently being helped</p>
                <p className="text-gray-500 text-xs">Check back for new consultation requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSessions.map((session) => (
                  <div 
                    key={session._id} 
                    className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 p-5 hover:border-gray-300"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-bold">#{session._id.slice(-2)}</span>
                            </div>
                            <h3 className="text-gray-900 font-semibold text-sm">
                              Session #{session._id.slice(-6)}
                            </h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-1">
                            Patient: {session.patientId.profile?.preferredName || 
                                     session.patientId.profile?.firstName || 
                                     session.patientId.username}
                          </p>
                          {session.description && (
                            <p className="text-gray-500 text-xs line-clamp-2 mt-2">
                              {session.description}
                            </p>
                          )}
                        </div>
                        <Badge 
                          className={`ml-3 ${
                            session.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' : 
                            session.severity === 'severe' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                            session.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                            'bg-green-100 text-green-700 border-green-200'
                          }`}
                        >
                          {session.severity}
                        </Badge>
                      </div>
                      
                      {session.waitingMinutes !== undefined && (
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>Waiting {session.waitingMinutes} minutes</span>
                          {session.messageCount && (
                            <>
                              <span>•</span>
                              <MessageCircle className="h-3 w-3" />
                              <span>{session.messageCount} messages</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <Button 
                        size="sm" 
                        onClick={() => acceptSession(session)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {currentSession ? (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                      Professional Session
                    </h1>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">
                          {currentSession.patientId.profile?.preferredName || 
                           currentSession.patientId.profile?.firstName || 
                           currentSession.patientId.username}
                        </span>
                      </div>
                      <Badge className={`${
                        currentSession.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' : 
                        currentSession.severity === 'severe' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                        currentSession.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                        'bg-green-100 text-green-700 border-green-200'
                      }`}>
                        {currentSession.severity} severity
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={openCloseDialog}
                    className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    End Session
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {socket.messages.map((message) => (
                  <div key={message._id}>
                    <div className={`flex ${message.senderRole === 'counselor' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[80%] ${message.senderRole === 'counselor' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.senderRole === 'counselor' ? 'bg-primary/10' : 'bg-blue-100'
                        }`}>
                          {message.senderRole === 'counselor' ? (
                            <FileText className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <ChatBubble
                          message={message.message}
                          sender={message.senderRole === 'counselor' ? 'assistant' : 'user'}
                          timestamp={new Date(message.createdAt).toLocaleTimeString()}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200 p-6">
                <div className="flex gap-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your professional response..."
                    onKeyPress={handleKeyPress}
                    className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-gray-600 text-xs mt-3 text-center">
                  🔒 Professional counseling session - maintain clinical standards and documentation requirements
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready for Sessions</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Accept a session from the sidebar to begin providing professional counseling support to patients in need.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm font-medium">
                    💡 Sessions are prioritized by severity level and waiting time
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session</DialogTitle>
            <DialogDescription>
              You're about to end this counseling session. Please provide a rating and session summary.
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
              <Label htmlFor="feedback">Session summary</Label>
              <Textarea
                id="feedback"
                value={closeFeedback}
                onChange={(e) => setCloseFeedback(e.target.value)}
                placeholder="Brief summary of the session outcome and next steps..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={endSession} disabled={loading}>
              {loading ? 'Ending...' : 'End Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
