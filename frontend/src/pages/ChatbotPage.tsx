import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatInput } from "@/components/ChatInput";
import { 
  Send, 
  User, 
  Bot, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  MessageCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Archive,
  CheckCircle
} from "lucide-react";
import { format, formatDistance } from "date-fns";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  crisisDetected?: boolean;
  crisisInfo?: {
    severity: string;
    confidence: number;
    redirectToCounselor: boolean;
  };
}

interface ChatSession {
  _id: string;
  title: string;
  lastMessageAt: Date;
  messageCount: number;
  crisisDetected?: boolean;
  createdAt: Date;
}

export default function ChatbotPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("current");
  const [pastSessions, setPastSessions] = useState<ChatSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [loadingActiveChat, setLoadingActiveChat] = useState(false);
  const [crisisEscalated, setCrisisEscalated] = useState(false);
  const [bookedCounselorMessageIds, setBookedCounselorMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    if (isAuthenticated) {
      loadChatHistory();
      loadActiveChat();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await apiService.getChatHistory(20);
      
      console.log('Chat history response:', response); // Debug log
      
      if (response.success && response.data) {
        console.log('Loaded past sessions:', response.data); // Debug log
        setPastSessions(response.data);
      } else {
        console.warn('No chat history data received:', response);
        setPastSessions([]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setPastSessions([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadActiveChat = async () => {
    try {
      setLoadingActiveChat(true);
      const response = await apiService.getActiveChat();
      
      console.log('Active chat response:', response); // Debug log
      
      if (response.success && response.data) {
        console.log('Found active chat:', response.data); // Debug log
        setActiveChat(response.data);
        setConversationId(response.data._id);
        
        // Load messages from active chat
        if (response.data.messages && response.data.messages.length > 0) {
          const convertedMessages: Message[] = response.data.messages.map((msg: any, index: number) => ({
            id: `${msg.role}-${index}`,
            text: msg.content,
            isBot: msg.role === 'assistant',
            timestamp: new Date(msg.timestamp),
            crisisDetected: msg.crisisDetected || false
          }));
          setMessages(convertedMessages);
          setCrisisDetected(response.data.crisisDetected || false);
        } else {
          initializeChat();
        }
      } else {
        console.log('No active chat found, initializing new one');
        initializeChat();
      }
    } catch (error) {
      console.error('Failed to load active chat:', error);
      initializeChat();
    } finally {
      setLoadingActiveChat(false);
    }
  };

  const initializeChat = () => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      text: `Hello${user?.profile?.preferredName ? ` ${user.profile.preferredName}` : ''}! I'm Dr. Sarah, a clinical psychologist here to support you. I specialize in helping people navigate their mental health journey with compassion and evidence-based approaches. How are you feeling today, and what would you like to talk about?`,
      isBot: true,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputMessage.trim(),
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputMessage.trim();
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await apiService.sendChatMessage(messageText, conversationId);

      if (response.success) {
        // Update conversation ID if this is the first message
        if (!conversationId && response.data.conversationId) {
          setConversationId(response.data.conversationId);
          // Keep currentSessionId as "current" for active sessions
          // Update active chat info
          setActiveChat({
            _id: response.data.conversationId,
            title: response.data.title || 'New Chat'
          });
        }

        // Check for crisis detection
        if (response.data.crisisDetected) {
          setCrisisDetected(true);
          console.log('🚨 Crisis detected in chat:', response.data.crisisInfo);
        }

        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: response.data.response,
          isBot: true,
          timestamp: new Date(),
          crisisDetected: response.data.crisisDetected,
          crisisInfo: response.data.crisisInfo
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.error || 'Failed to get response');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. If this continues, please consider reaching out to a crisis helpline if you need immediate support.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBookCounselor = (crisisInfo: any, messageId: string) => {
    setBookedCounselorMessageIds(prev => new Set([...prev, messageId]));
    
    // Redirect to the external counselor request URL
    window.location.href = 'http://localhost:8080/counselor/request';
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setCrisisDetected(false);
    setCrisisEscalated(false);
    setCurrentSessionId("current");
    setActiveChat(null);
    setBookedCounselorMessageIds(new Set());
    initializeChat();
  };

  const startNewChat = async () => {
    try {
      setLoading(true);
      console.log('Starting new chat...'); // Debug log
      
      // First close current active chat if it exists
      if (activeChat && activeChat._id) {
        await closeSession();
      }
      
      // Clear current session and initialize new one
      clearChat();
      setActiveChat(null);
      console.log('New chat started successfully'); // Debug log
    } catch (error) {
      console.error('Failed to start new chat:', error);
      // Fallback to just clearing current chat
      clearChat();
    } finally {
      setLoading(false);
    }
  };

  const closeSession = async () => {
    try {
      if (!activeChat || !activeChat._id) {
        console.log('No active chat to close');
        return;
      }

      setLoading(true);
      console.log('Closing session:', activeChat._id); // Debug log
      
      const response = await apiService.closeChat(activeChat._id);
      console.log('Close session response:', response); // Debug log
      
      if (response.success) {
        // Reload chat history to include the now-closed chat
        await loadChatHistory();
        
        // Clear current session
        clearChat();
        setActiveChat(null);
        console.log('Session closed successfully'); // Debug log
      } else {
        console.warn('Failed to close session:', response);
      }
    } catch (error) {
      console.error('Failed to close session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPastSession = async (sessionId: string) => {
    try {
      setLoading(true);
      setCurrentSessionId(sessionId);
      
      const response = await apiService.getChat(sessionId);
      
      if (response.success && response.data) {
        const chatData = response.data;
        
        // Convert API messages to UI format
        const convertedMessages: Message[] = chatData.messages.map((msg: any, index: number) => ({
          id: `${msg.role}-${index}`,
          text: msg.content,
          isBot: msg.role === 'assistant',
          timestamp: new Date(msg.timestamp),
          crisisDetected: msg.crisisDetected || false
        }));
        
        setMessages(convertedMessages);
        setCrisisDetected(chatData.crisisDetected || false);
        setConversationId(sessionId);
      }
    } catch (error) {
      console.error('Failed to load past session:', error);
      // Fallback to current session
      setCurrentSessionId("current");
      initializeChat();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 to-background">
        {/* Sidebar - Past Chats */}
        <div className={`bg-gradient-to-b from-primary/5 to-primary/10 backdrop-blur-sm border-r border-primary/20 transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-primary/20 flex-shrink-0 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Chat History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hover:bg-primary/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={startNewChat}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New Chat
            </Button>
          </div>

          {/* Past Sessions List - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {/* Current Session */}
                {(activeChat || currentSessionId === "current") && (
                  <Card 
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                      currentSessionId === "current" ? "bg-primary/10 border-primary/20" : ""
                    }`}
                    onClick={() => {
                      setCurrentSessionId("current");
                      if (activeChat) {
                        loadActiveChat();
                      } else {
                        initializeChat();
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {activeChat?.title || "Current Session"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activeChat ? "Active conversation" : "Start new conversation"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {messages.length} messages
                          </Badge>
                          {crisisDetected && (
                            <Badge variant="destructive" className="text-xs">
                              Crisis
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground px-2 mb-2">Previous Sessions</p>

                {/* Past Sessions */}
                {loadingHistory ? (
                  <div className="p-4 text-center">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading chat history...</p>
                  </div>
                ) : pastSessions.length === 0 ? (
                  <div className="p-4 text-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No previous sessions</p>
                    <p className="text-xs text-muted-foreground">Start chatting to create history</p>
                  </div>
                ) : pastSessions.map((session) => (
                  <Card 
                    key={session._id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                      currentSessionId === session._id ? "bg-primary/10 border-primary/20" : ""
                    }`}
                    onClick={() => loadPastSession(session._id)}
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          Last activity: {formatDistance(new Date(session.lastMessageAt), new Date(), { addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistance(new Date(session.createdAt), new Date(), { addSuffix: true })}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {session.messageCount}
                          </Badge>
                          {session.crisisDetected && (
                            <Badge variant="destructive" className="text-xs">
                              Crisis
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
          {/* Sidebar toggle button when collapsed */}
          {sidebarCollapsed && (
            <div className="absolute top-4 left-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(false)}
                className="bg-white shadow-md"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Header */}
          <ChatHeader
            title="Dr. Sarah - AI Psychology Expert"
            subtitle={loadingActiveChat 
              ? "Loading conversation..." 
              : crisisDetected 
              ? "Crisis support mode - I'm here to help" 
              : "Compassionate mental health support"}
            icon={loadingActiveChat ? (
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Bot className="h-6 w-6 text-primary" />
            )}
            badges={[
              ...(currentSessionId !== "current" ? [{ text: "Past Session", variant: "outline" as const }] : []),
              ...(crisisDetected ? [{ text: "Crisis", variant: "destructive" as const }] : [])
            ]}
            actions={
              activeChat && currentSessionId === "current" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeSession}
                  disabled={loading || !activeChat._id}
                  className="text-orange-600 hover:bg-orange-50 border-orange-200"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  Close Session
                </Button>
              ) : undefined
            }
          />

          {/* Crisis Alert */}
          {crisisDetected && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-4 mx-4 mt-4 rounded flex-shrink-0">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Crisis Support Resources</p>
                  <p className="text-sm text-destructive/80">
                    If you're in immediate danger, please call 911. For crisis support: National Suicide Prevention Lifeline at 988, or Crisis Text Line by texting HOME to 741741.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Crisis Escalation Alert */}
          {crisisEscalated && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mx-4 mt-2 rounded flex-shrink-0">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">🚨 Crisis Support Team Notified</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Your message has been automatically escalated to our crisis support team. A counselor will reach out to you very soon to provide immediate assistance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Messages - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4 bg-gradient-to-b from-primary/5 to-transparent min-h-full">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.isBot ? 'bg-primary/15 border border-primary/20' : 'bg-blue-100 border border-blue-200'
                      }`}>
                        {message.isBot ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <Card className={`p-3 ${
                        message.isBot 
                          ? 'bg-white/90 backdrop-blur-sm border border-primary/10 shadow-sm' 
                          : 'bg-primary text-primary-foreground border border-primary shadow-sm'
                      } ${message.crisisDetected ? 'border-l-4 border-l-destructive' : ''}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        
                        {/* Crisis Counselor Booking Button */}
                        {message.crisisDetected && message.crisisInfo?.redirectToCounselor && (
                          <div className="mt-3 pt-3 border-t border-red-200 bg-red-50 rounded-b-lg -mx-3 -mb-3 px-3 pb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <p className="text-xs text-red-700 font-semibold">Crisis Support Available</p>
                            </div>
                            {bookedCounselorMessageIds.has(message.id) ? (
                              <Button 
                                disabled
                                className="w-full bg-green-600 text-white shadow-sm cursor-default"
                                size="sm"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Counselor Request Submitted
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleBookCounselor(message.crisisInfo, message.id)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm animate-pulse hover:animate-none"
                                size="sm"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Book Emergency Counselor Session
                              </Button>
                            )}
                            <p className="text-xs text-red-600 mt-1 text-center">
                              Confidence: {message.crisisInfo.confidence}% • Professional help available now
                            </p>
                          </div>
                        )}
                        
                        <p className={`text-xs mt-1 ${
                          message.isBot ? 'text-muted-foreground' : 'text-primary-foreground/70'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </Card>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <Card className="p-3 bg-white/90 backdrop-blur-sm border border-primary/10 shadow-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Dr. Sarah is typing...</p>
                      </Card>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input */}
          <ChatInput
            value={inputMessage}
            onChange={setInputMessage}
            onSend={sendMessage}
            onKeyPress={handleKeyPress}
            placeholder={currentSessionId === "current" ? "Share what's on your mind..." : "This is a past session (read-only)"}
            disabled={isTyping || currentSessionId !== "current" || loadingActiveChat}
            isLoading={isTyping}
            helpText={currentSessionId === "current" 
              ? "This is an AI psychology expert. For emergencies, call 911 or crisis helplines."
              : "Viewing past session - switch to current session to continue chatting"
            }
          />
        </div>
      </div>
    </Layout>
  );
}