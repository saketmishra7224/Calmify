import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import socketService, { SocketCallbacks, Message, User } from '../services/socket';

interface UseSocketOptions {
  autoConnect?: boolean;
  onNewMessage?: (data: { message: Message; timestamp: Date }) => void;
  onUserJoined?: (data: { user: User; sessionId: string; timestamp: Date }) => void;
  onUserLeft?: (data: { user: User; sessionId: string; reason?: string; timestamp: Date }) => void;
  onSessionJoined?: (data: { sessionId: string; session: any; participants: any }) => void;
  onUserTyping?: (data: { sessionId: string; user: User; isTyping: boolean; timestamp: Date }) => void;
  onSessionEscalated?: (data: { sessionId: string; escalation: any; session: any }) => void;
  onSessionEscalatedToCounselor?: (data: { sessionId: string; newSessionId: string; escalation: any; message: string }) => void;
  onSessionStatusUpdated?: (data: { sessionId: string; statusChange: any; session: any }) => void;
  onCrisisAlert?: (data: { alert: any; message?: Message; timestamp: Date }) => void;
  onUserStatusUpdated?: (data: { userId: string; username: string; status: string; timestamp: Date }) => void;
  onError?: (data: { event: string; message: string; details?: string }) => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  connectionState: string;
  socketId?: string;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  sendMessage: (sessionId: string, message: string, messageType?: string, replyTo?: string) => void;
  setTyping: (sessionId: string, isTyping: boolean) => void;
  escalateSession: (sessionId: string, newSeverity: string, reason: string, targetHelperType?: string) => void;
  updateSessionStatus: (sessionId: string, status: string, additionalData?: any) => void;
  sendCrisisAlert: (description: string, severity?: string, location?: any, sessionId?: string) => void;
  updateUserStatus: (status: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  error?: string;
}

export const useSocket = (options: UseSocketOptions = {}): UseSocketReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [socketId, setSocketId] = useState<string>();
  const [error, setError] = useState<string>();
  const connectedRef = useRef(false);
  const callbacksRef = useRef<SocketCallbacks>({});

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage: options.onNewMessage,
      onUserJoined: options.onUserJoined,
      onUserLeft: options.onUserLeft,
      onSessionJoined: options.onSessionJoined,
      onUserTyping: options.onUserTyping,
      onSessionEscalated: options.onSessionEscalated,
      onSessionEscalatedToCounselor: options.onSessionEscalatedToCounselor,
      onSessionStatusUpdated: options.onSessionStatusUpdated,
      onCrisisAlert: options.onCrisisAlert,
      onUserStatusUpdated: options.onUserStatusUpdated,
      onError: options.onError,
      onConnect: () => {
        setIsConnected(true);
        setConnectionState('connected');
        setSocketId(socketService.getSocketId());
        setError(undefined);
        connectedRef.current = true;
      },
      onDisconnect: () => {
        setIsConnected(false);
        setConnectionState('disconnected');
        setSocketId(undefined);
        connectedRef.current = false;
      }
    };

    socketService.setCallbacks(callbacksRef.current);
  }, [
    options.onNewMessage,
    options.onUserJoined,
    options.onUserLeft,
    options.onSessionJoined,
    options.onUserTyping,
    options.onSessionEscalated,
    options.onSessionEscalatedToCounselor,
    options.onSessionStatusUpdated,
    options.onCrisisAlert,
    options.onUserStatusUpdated,
    options.onError
  ]);

  const connect = useCallback(async (): Promise<void> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('Authentication required');
      return;
    }

    if (connectedRef.current) {
      return;
    }

    try {
      setError(undefined);
      setConnectionState('connecting');
      
      console.log('🔗 Attempting Socket.IO connection with token:', token.substring(0, 10) + '...');
      
      await socketService.connect({ token });
      
      // Update state will be handled by onConnect callback
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setConnectionState('error');
      setIsConnected(false);
      connectedRef.current = false;
      console.error('Socket connection failed:', err);
    }
  }, [getToken, user]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionState('disconnected');
    setSocketId(undefined);
    connectedRef.current = false;
  }, []);

  // Auto-connect when user and token are available
  useEffect(() => {
    if (options.autoConnect !== false && user && getToken() && !connectedRef.current) {
      connect();
    }

    return () => {
      if (connectedRef.current) {
        disconnect();
      }
    };
  }, [user, getToken, connect, disconnect, options.autoConnect]);

  // Update connection state from service
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = socketService.getConnectionState();
      const currentConnected = socketService.isConnected();
      
      if (currentState !== connectionState) {
        setConnectionState(currentState);
      }
      
      if (currentConnected !== isConnected) {
        setIsConnected(currentConnected);
        connectedRef.current = currentConnected;
      }

      const currentSocketId = socketService.getSocketId();
      if (currentSocketId !== socketId) {
        setSocketId(currentSocketId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState, isConnected, socketId]);

  // Session management methods
  const joinSession = useCallback((sessionId: string) => {
    socketService.joinSession(sessionId);
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    socketService.leaveSession(sessionId);
  }, []);

  // Messaging methods
  const sendMessage = useCallback((
    sessionId: string,
    message: string,
    messageType: string = 'text',
    replyTo?: string
  ) => {
    socketService.sendMessage(sessionId, message, messageType, replyTo);
  }, []);

  const setTyping = useCallback((sessionId: string, isTyping: boolean) => {
    socketService.setTyping(sessionId, isTyping);
  }, []);

  // Session operation methods
  const escalateSession = useCallback((
    sessionId: string,
    newSeverity: string,
    reason: string,
    targetHelperType?: string
  ) => {
    socketService.escalateSession(sessionId, newSeverity, reason, targetHelperType);
  }, []);

  const updateSessionStatus = useCallback((
    sessionId: string,
    status: string,
    additionalData?: any
  ) => {
    socketService.updateSessionStatus(sessionId, status, additionalData);
  }, []);

  // Crisis management methods
  const sendCrisisAlert = useCallback((
    description: string,
    severity: string = 'critical',
    location?: any,
    sessionId?: string
  ) => {
    socketService.sendCrisisAlert(description, severity, location, sessionId);
  }, []);

  // User status methods
  const updateUserStatus = useCallback((status: string) => {
    socketService.updateUserStatus(status);
  }, []);

  return {
    isConnected,
    connectionState,
    socketId,
    joinSession,
    leaveSession,
    sendMessage,
    setTyping,
    escalateSession,
    updateSessionStatus,
    sendCrisisAlert,
    updateUserStatus,
    connect,
    disconnect,
    error
  };
};

// Specialized hook for chat sessions
export const useChatSocket = (sessionId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: User }>({});
  const [sessionParticipants, setSessionParticipants] = useState<{ patient?: any; helper?: any }>({});
  const [lastActivity, setLastActivity] = useState<Date>();
  const [isSessionJoined, setIsSessionJoined] = useState(false);
  const previousSessionId = useRef<string>();

  const socket = useSocket({
    onNewMessage: (data) => {
      setMessages(prev => [...prev, data.message]);
      setLastActivity(new Date(data.timestamp));
    },
    onUserJoined: (data) => {
      console.log(`User ${data.user.username} joined session ${data.sessionId}`);
      setLastActivity(new Date(data.timestamp));
    },
    onUserLeft: (data) => {
      console.log(`User ${data.user.username} left session ${data.sessionId}`);
      // Remove from typing users if they were typing
      setTypingUsers(prev => {
        const newTyping = { ...prev };
        delete newTyping[data.user._id];
        return newTyping;
      });
      setLastActivity(new Date(data.timestamp));
    },
    onSessionJoined: (data) => {
      console.log('Session joined successfully:', data.sessionId);
      setSessionParticipants(data.participants);
      setIsSessionJoined(true);
    },
    onUserTyping: (data) => {
      setTypingUsers(prev => {
        const newTyping = { ...prev };
        if (data.isTyping) {
          newTyping[data.user._id] = data.user;
        } else {
          delete newTyping[data.user._id];
        }
        return newTyping;
      });
      
      // Clear typing indicator after 3 seconds
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const newTyping = { ...prev };
            delete newTyping[data.user._id];
            return newTyping;
          });
        }, 3000);
      }
    },
    onSessionEscalated: (data) => {
      console.log('Session escalated:', data.escalation);
      setLastActivity(new Date(data.escalation.timestamp));
    },
    onSessionEscalatedToCounselor: (data) => {
      console.log('Session escalated to counselor:', data);
      // Could show a notification or update UI state
      setLastActivity(new Date(data.escalation.timestamp));
    },
    onSessionStatusUpdated: (data) => {
      console.log('Session status updated:', data.statusChange);
      setLastActivity(new Date(data.statusChange.timestamp));
    },
    onError: (data) => {
      console.error('Socket error:', data);
    }
  });

  // Join session when sessionId changes
  useEffect(() => {
    if (sessionId && socket.isConnected && sessionId !== previousSessionId.current) {
      // Leave previous session if different
      if (previousSessionId.current) {
        socket.leaveSession(previousSessionId.current);
        setIsSessionJoined(false);
      }
      
      // Join new session
      socket.joinSession(sessionId);
      previousSessionId.current = sessionId;
      
      return () => {
        if (sessionId) {
          socket.leaveSession(sessionId);
          setIsSessionJoined(false);
        }
      };
    }
  }, [sessionId, socket.isConnected, socket]);

  // Clear messages when session changes
  useEffect(() => {
    if (sessionId !== previousSessionId.current) {
      setMessages([]);
      setTypingUsers({});
      setSessionParticipants({});
      setIsSessionJoined(false);
    }
  }, [sessionId]);

  return {
    ...socket,
    messages,
    setMessages,
    typingUsers,
    sessionParticipants,
    lastActivity,
    isSessionJoined,
    isTypingIndicatorVisible: Object.keys(typingUsers).length > 0
  };
};