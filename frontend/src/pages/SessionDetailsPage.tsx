import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Session } from '../services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageCircle, Clock, User, Star, AlertTriangle } from "lucide-react";
import { useChatSocket } from '../hooks/useSocket';

export default function SessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  
  // Ref for auto-scrolling to bottom of messages
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    messages: socketMessages, 
    setMessages, 
    sendMessage: sendSocketMessage, 
    escalateSession,
    isConnected 
  } = useChatSocket(sessionId);

  // Merge socket messages with any optimistic messages, removing duplicates
  const messages = socketMessages;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (isLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (sessionId) {
      loadSession();
    }
  }, [sessionId, isAuthenticated, isLoading]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSession(sessionId!);
      setSession(response.session);
      
      // Filter out any messages that might cause rendering issues
      const validMessages = (response.messages || []).filter(msg => 
        msg && msg._id && (msg.senderId || msg.senderRole)
      );
      
      console.log('Loaded messages:', validMessages.length);
      setMessages(validMessages);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.message || 'Failed to load session');
      if (err.message.includes('Access denied') || err.message.includes('not found')) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !sessionId || sending || !isConnected) {
      console.log('Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasSessionId: !!sessionId, 
        sending, 
        isConnected 
      });
      return;
    }

    const messageText = newMessage.trim();
    
    try {
      setSending(true);
      setNewMessage('');
      
      console.log('📤 Sending message via Socket.IO:', messageText);
      
      // Send via socket
      sendSocketMessage(sessionId, messageText, 'text');
      
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
      // Restore message on error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openEscalateDialog = () => {
    setShowEscalateDialog(true);
  };

  const escalateToCounselor = async () => {
    if (!session) return;

    try {
      setEscalating(true);
      const reason = escalationReason.trim() || 'Session escalated to professional counselor for specialized support';
      
      // Use Socket.IO to escalate session for real-time notification
      escalateSession(
        session._id,
        'severe',
        reason,
        'counselor'
      );
      
      // Also use API for backup
      await apiService.closeSession(
        session._id, 
        undefined, 
        reason
      );
      
      setShowEscalateDialog(false);
      setEscalationReason("");
      
      // Navigate back to peer chat or dashboard
      navigate('/peer/chats');
    } catch (error) {
      console.error('Failed to escalate session:', error);
      setError('Failed to escalate session');
    } finally {
      setEscalating(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'severe': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mild': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout >
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading session...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !session) {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Alert>
            <AlertDescription>Session not found.</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const isPatient = session.patientId._id === user?._id;
  const isHelper = session.helperId?._id === user?._id;
  const canSendMessages = session.status === 'active' && (isPatient || isHelper);

  return (
    <Layout >
      <div className="max-w-6xl mx-auto p-6 h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Session Info Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                  <Badge variant="outline" className={getSeverityColor(session.severity)}>
                    {session.severity}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Patient</p>
                      <p className="text-xs text-muted-foreground">
                        {session.patientId.profile?.preferredName || 
                         session.patientId.profile?.firstName || 
                         session.patientId.username}
                      </p>
                    </div>
                  </div>

                  {session.helperId && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{session.helperType}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.helperId.profile?.firstName || session.helperId.username}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()} {formatTime(session.createdAt)}
                      </p>
                    </div>
                  </div>

                  {session.title && (
                    <div>
                      <p className="text-sm font-medium">Title</p>
                      <p className="text-xs text-muted-foreground">{session.title}</p>
                    </div>
                  )}

                  {session.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-xs text-muted-foreground">{session.description}</p>
                    </div>
                  )}

                  {session.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium">Rating</p>
                        <p className="text-xs text-muted-foreground">{session.rating}/5</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {session.status === 'waiting' && user?.role !== 'patient' && (
              <Card>
                <CardContent className="pt-6">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      // Handle session acceptance
                      console.log('Accept session');
                    }}
                  >
                    Accept Session
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {session.title || `${session.helperType} Session`}
                    {session.patientId && (
                      <span className="text-sm font-normal text-muted-foreground">
                        with {session.patientId.profile?.preferredName || 
                             session.patientId.profile?.firstName || 
                             session.patientId.username}
                      </span>
                    )}
                  </CardTitle>
                  
                  {/* Escalation Button - Only show for active peer sessions */}
                  {user?.role === 'peer' && 
                   session.helperType === 'peer' && 
                   session.status === 'active' && 
                   isHelper && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={openEscalateDialog}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      disabled={escalating}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Escalate to Counselor
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground min-h-[200px]">
                        <div className="text-center">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => {
                          if (!message || message === undefined) {
                            console.log("Found undefined message in the array");
                            return null; // Skip rendering this message
                          }
                          // Handle both populated and unpopulated senderId
                          const senderId = message.senderId ? 
                            (typeof message.senderId === 'string' ? message.senderId : message.senderId._id) 
                            : undefined;
                          const isMyMessage = senderId === user?._id;
                          return (
                            <div
                              key={message._id || `msg-${Math.random()}`}
                              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isMyMessage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {isMyMessage ? 'You' : (
                                      message.senderId && typeof message.senderId === 'object' ? (
                                        message.senderId.profile?.preferredName || 
                                        message.senderId.profile?.firstName || 
                                        message.senderId.username || 'Unknown'
                                      ) : (
                                        message.senderRole ? 
                                          message.senderRole.charAt(0).toUpperCase() + message.senderRole.slice(1)
                                          : 'Unknown User'
                                      )
                                    )}
                                  </span>
                                  <span className="text-xs opacity-70">
                                    {formatTime(message.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm">{message.message}</p>
                                {message.crisisDetected && (
                                  <div className="mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                    Crisis indicators detected
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Invisible div for auto-scrolling */}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Input */}
              {canSendMessages && (
                <div className="border-t p-4">
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={sending || !isConnected}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending || !isConnected}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !isConnected ? (
                        'Connecting...'
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? 'Real-time messaging active' : 'Connecting to chat server...'}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-muted-foreground">
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {session.status === 'waiting' && (
                <div className="border-t p-4 text-center text-muted-foreground">
                  <p>Waiting for a helper to join this session...</p>
                </div>
              )}

              {session.status === 'closed' && (
                <div className="border-t p-4 text-center text-muted-foreground">
                  <p>This session has been closed.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

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
            <Button variant="outline" onClick={() => setShowEscalateDialog(false)} disabled={escalating}>
              Cancel
            </Button>
            <Button 
              onClick={escalateToCounselor} 
              disabled={escalating}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {escalating ? (
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