import { io, Socket } from 'socket.io-client';

interface SocketAuthData {
  token: string;
}

interface User {
  _id: string;
  username: string;
  role: string;
  profile?: any;
  isAnonymous?: boolean;
}

interface Message {
  _id: string;
  sessionId: string;
  senderId: any;
  message: string;
  senderRole: string;
  messageType: string;
  createdAt: string;
  replyTo?: any;
  crisisDetected?: boolean;
  isAI?: boolean;
}

interface SocketCallbacks {
  onNewMessage?: (data: { message: Message; timestamp: Date }) => void;
  onUserJoined?: (data: { user: User; sessionId: string; timestamp: Date }) => void;
  onUserLeft?: (data: { user: User; sessionId: string; reason?: string; timestamp: Date }) => void;
  onSessionJoined?: (data: { sessionId: string; session: any; participants: any }) => void;
  onUserTyping?: (data: { sessionId: string; user: User; isTyping: boolean; timestamp: Date }) => void;
  onSessionEscalated?: (data: { sessionId: string; escalation: any; session: any }) => void;
  onSessionStatusUpdated?: (data: { sessionId: string; statusChange: any; session: any }) => void;
  onCrisisAlert?: (data: { alert: any; message?: Message; timestamp: Date }) => void;
  onUserStatusUpdated?: (data: { userId: string; username: string; status: string; timestamp: Date }) => void;
  onError?: (data: { event: string; message: string; details?: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class SocketService {
  private socket: Socket | null = null;
  private callbacks: SocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupEventListeners();
  }

  connect(authData: SocketAuthData): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Socket.IO connects to the base server URL, not the API endpoint
      const baseUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      // Remove /api suffix if present in VITE_API_URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const serverUrl = baseUrl || apiUrl.replace('/api', '');
      
      console.log('🔗 Connecting to Socket.IO server:', serverUrl);
      
      this.socket = io(serverUrl, {
        auth: {
          token: authData.token
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        timeout: 20000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        this.reconnectAttempts = 0;
        this.callbacks.onConnect?.();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.callbacks.onDisconnect?.();
      });

      this.setupSocketEventHandlers();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Socket disconnected manually');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  setCallbacks(callbacks: SocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Session Management
  joinSession(sessionId: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot join session: Socket not connected');
      return;
    }

    this.socket.emit('join-session', { sessionId });
    console.log(`📱 Joining session: ${sessionId}`);
  }

  leaveSession(sessionId: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot leave session: Socket not connected');
      return;
    }

    this.socket.emit('leave-session', { sessionId });
    console.log(`📱 Leaving session: ${sessionId}`);
  }

  // Messaging
  sendMessage(sessionId: string, message: string, messageType: string = 'text', replyTo?: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot send message: Socket not connected');
      return;
    }

    if (!sessionId || !message?.trim()) {
      console.error('❌ Cannot send message: Invalid sessionId or empty message');
      return;
    }

    this.socket.emit('send-message', {
      sessionId,
      message: message.trim(),
      messageType,
      replyTo
    });

    console.log(`💬 Message sent to session: ${sessionId}`);
  }

  // Typing Indicators
  setTyping(sessionId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing-indicator', {
      sessionId,
      isTyping
    });
  }

  // Session Operations
  escalateSession(sessionId: string, newSeverity: string, reason: string, targetHelperType?: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot escalate session: Socket not connected');
      return;
    }

    this.socket.emit('escalate-session', {
      sessionId,
      newSeverity,
      reason,
      targetHelperType
    });

    console.log(`⚡ Escalating session ${sessionId} to ${newSeverity}`);
  }

  updateSessionStatus(sessionId: string, status: string, additionalData?: any): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot update session status: Socket not connected');
      return;
    }

    this.socket.emit('session-status', {
      sessionId,
      status,
      additionalData
    });

    console.log(`📊 Updating session ${sessionId} status to ${status}`);
  }

  // Crisis Management
  sendCrisisAlert(description: string, severity: string = 'critical', location?: any, sessionId?: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot send crisis alert: Socket not connected');
      return;
    }

    this.socket.emit('crisis-alert', {
      severity,
      description,
      location,
      sessionId
    });

    console.log(`🚨 Crisis alert sent: ${severity}`);
  }

  // User Status
  updateUserStatus(status: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('update-user-status', { status });
    console.log(`👤 User status updated to: ${status}`);
  }

  private setupEventListeners(): void {
    // Handle browser events
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    window.addEventListener('online', () => {
      if (!this.isConnected()) {
        console.log('🌐 Network back online, attempting to reconnect...');
        // The socket.io client will handle reconnection automatically
      }
    });

    window.addEventListener('offline', () => {
      console.log('🔌 Network offline');
    });
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Message Events
    this.socket.on('new-message', (data) => {
      console.log('💬 New message received:', data);
      this.callbacks.onNewMessage?.(data);
    });

    // Session Events
    this.socket.on('session-joined', (data) => {
      console.log('📱 Session joined:', data);
      this.callbacks.onSessionJoined?.(data);
    });

    this.socket.on('user-joined-session', (data) => {
      console.log('👤 User joined session:', data);
      this.callbacks.onUserJoined?.(data);
    });

    this.socket.on('user-left-session', (data) => {
      console.log('👤 User left session:', data);
      this.callbacks.onUserLeft?.(data);
    });

    this.socket.on('user-typing', (data) => {
      this.callbacks.onUserTyping?.(data);
    });

    this.socket.on('session-escalated', (data) => {
      console.log('⚡ Session escalated:', data);
      this.callbacks.onSessionEscalated?.(data);
    });

    this.socket.on('session-status-updated', (data) => {
      console.log('📊 Session status updated:', data);
      this.callbacks.onSessionStatusUpdated?.(data);
    });

    // Crisis Events
    this.socket.on('crisis-alert', (data) => {
      console.log('🚨 Crisis alert received:', data);
      this.callbacks.onCrisisAlert?.(data);
    });

    this.socket.on('crisis-alert-sent', (data) => {
      console.log('🚨 Crisis alert sent confirmation:', data);
    });

    this.socket.on('session-escalated-critical', (data) => {
      console.log('🚨 Critical session escalation:', data);
      this.callbacks.onCrisisAlert?.(data);
    });

    // User Events
    this.socket.on('user-status-updated', (data) => {
      this.callbacks.onUserStatusUpdated?.(data);
    });

    // Error Handling
    this.socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
      this.callbacks.onError?.(data);
    });

    // Connection Events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔄 Reconnection failed - max attempts reached');
    });
  }

  // Utility Methods
  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Event listener cleanup
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    this.callbacks = {};
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
export type { SocketCallbacks, Message, User };