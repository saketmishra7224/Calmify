import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Calendar
} from "lucide-react";
import { format, formatDistance } from "date-fns";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  crisisDetected?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  crisisDetected?: boolean;
  isActive?: boolean;
}

export default function ChatbotPage() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("current");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dummy past chat sessions
  const [pastSessions] = useState<ChatSession[]>([
    {
      id: "session-1",
      title: "Dealing with Exam Stress",
      lastMessage: "Thank you for helping me understand different coping strategies for managing exam anxiety. I feel much more prepared now.",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      messageCount: 24,
      crisisDetected: false
    },
    {
      id: "session-2", 
      title: "Work-Life Balance Issues",
      lastMessage: "The boundary-setting techniques you suggested have really helped me separate work stress from my personal time.",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      messageCount: 31,
      crisisDetected: false
    },
    {
      id: "session-3",
      title: "Relationship Concerns",
      lastMessage: "I appreciate your guidance on communication strategies. The active listening tips were particularly helpful.",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      messageCount: 18,
      crisisDetected: false
    },
    {
      id: "session-4",
      title: "Feeling Overwhelmed",
      lastMessage: "Thank you for recognizing my distress and providing those crisis resources. I'm feeling more stable now.",
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      messageCount: 42,
      crisisDetected: true
    },
    {
      id: "session-5",
      title: "Sleep and Anxiety Issues",
      lastMessage: "The sleep hygiene recommendations and breathing exercises have improved my sleep quality significantly.",
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
      messageCount: 27,
      crisisDetected: false
    },
    {
      id: "session-6",
      title: "Building Self-Confidence",
      lastMessage: "I've been practicing the positive self-talk techniques you taught me, and I'm starting to notice small improvements.",
      timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
      messageCount: 35,
      crisisDetected: false
    }
  ]);

  useEffect(() => {
    initializeChat();
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        }

        // Check for crisis detection
        if (response.data.crisisDetected) {
          setCrisisDetected(true);
        }

        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: response.data.response,
          isBot: true,
          timestamp: new Date(),
          crisisDetected: response.data.crisisDetected
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

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setCrisisDetected(false);
    setCurrentSessionId("current");
    initializeChat();
  };

  const startNewChat = () => {
    clearChat();
  };

  const loadPastSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const session = pastSessions.find(s => s.id === sessionId);
    
    if (session) {
      // Generate dummy conversation for the selected session
      const dummyMessages: Message[] = [
        {
          id: 'welcome',
          text: `Hello${user?.profile?.preferredName ? ` ${user.profile.preferredName}` : ''}! I'm Dr. Sarah. I see we're continuing our conversation about "${session.title}". How are you feeling today?`,
          isBot: true,
          timestamp: new Date(session.timestamp.getTime() - 60000)
        },
        {
          id: 'user-1',
          text: "Thank you for continuing to help me with this. I've been thinking about our last conversation.",
          isBot: false,
          timestamp: new Date(session.timestamp.getTime() - 30000)
        },
        {
          id: 'bot-1',
          text: session.lastMessage,
          isBot: true,
          timestamp: session.timestamp,
          crisisDetected: session.crisisDetected
        }
      ];
      
      setMessages(dummyMessages);
      setCrisisDetected(session.crisisDetected || false);
      setConversationId(sessionId);
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
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Sidebar - Past Chats */}
        <div className={`bg-white border-r border-border transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Chat History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={startNewChat}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Past Sessions List - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {/* Current Session */}
                <Card 
                  className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                    currentSessionId === "current" ? "bg-primary/10 border-primary/20" : ""
                  }`}
                  onClick={() => {
                    setCurrentSessionId("current");
                    initializeChat();
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        Current Session
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active now
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

                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground px-2 mb-2">Previous Sessions</p>

                {/* Past Sessions */}
                {pastSessions.map((session) => (
                  <Card 
                    key={session.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                      currentSessionId === session.id ? "bg-primary/10 border-primary/20" : ""
                    }`}
                    onClick={() => loadPastSession(session.id)}
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {session.lastMessage}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistance(session.timestamp, new Date(), { addSuffix: true })}
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
          <div className="bg-white border-b border-border p-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Dr. Sarah - AI Psychology Expert</h1>
                <p className="text-sm text-muted-foreground">
                  {crisisDetected 
                    ? "Crisis support mode - I'm here to help" 
                    : "Compassionate mental health support"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentSessionId !== "current" && (
                <Badge variant="outline" className="text-xs">
                  Past Session
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>

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

          {/* Messages - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.isBot ? 'bg-primary/10' : 'bg-blue-100'
                      }`}>
                        {message.isBot ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <Card className={`p-3 ${
                        message.isBot 
                          ? 'bg-gray-50 border border-border' 
                          : 'bg-blue-50 border border-blue-200'
                      } ${message.crisisDetected ? 'border-l-4 border-l-destructive' : ''}`}>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{message.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
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
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <Card className="p-3 bg-gray-50 border border-border">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
          <div className="bg-white border-t border-border p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentSessionId === "current" ? "Share what's on your mind..." : "This is a past session (read-only)"}
                disabled={isTyping || currentSessionId !== "current"}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isTyping || currentSessionId !== "current"}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {currentSessionId === "current" 
                  ? "This is an AI psychology expert. For emergencies, call 911 or crisis helplines."
                  : "Viewing past session - switch to current session to continue chatting"
                }
              </p>
              {conversationId && currentSessionId === "current" && (
                <p className="text-xs text-muted-foreground">
                  Conversation history maintained
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}