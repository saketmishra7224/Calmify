// API Service Layer for Saneyar Mental Health Platform
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  preferredRole?: 'patient' | 'peer' | 'counselor';
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: 'patient' | 'peer';
  profile?: {
    firstName: string;
    lastName: string;
    age?: number;
    preferredName?: string;
    phoneNumber?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'patient' | 'peer' | 'counselor' | 'admin';
  profile: {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    age?: number;
    phoneNumber?: string;
  };
  isOnline: boolean;
  isAnonymous?: boolean;
  createdAt: string;
}

interface Session {
  _id: string;
  patientId: User;
  helperId?: User;
  helperType: 'chatbot' | 'peer' | 'counselor';
  status: 'waiting' | 'active' | 'closed' | 'escalated';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  title?: string;
  description?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  waitingMinutes?: number;
  messageCount?: number;
  rating?: number;
  feedback?: string;
}

interface Message {
  _id: string;
  sessionId: string;
  senderId: User;
  message: string;
  senderRole: 'patient' | 'peer' | 'counselor' | 'admin' | 'chatbot';
  messageType: 'text' | 'image' | 'file';
  createdAt: string;
  replyTo?: string;
  isEdited?: boolean;
  crisisDetected?: boolean;
}

interface CreateSessionRequest {
  helperType: 'chatbot' | 'peer' | 'counselor';
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  title?: string;
  description?: string;
}

interface SendMessageRequest {
  sessionId: string;
  message: string;
  messageType?: 'text' | 'image' | 'file';
  replyTo?: string;
  attachments?: any[];
}

class ApiService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Unable to connect to server. Please check if the backend is running and CORS is properly configured.');
      }
      throw error;
    }
  }

  // Authentication APIs
  async login(credentials: LoginRequest): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await this.handleResponse<any>(response);
      
      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Login API error:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the authentication server. Please ensure the backend is running on http://localhost:5000 and CORS is properly configured.');
      }
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<{ user: User; token: string; refreshToken: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await this.handleResponse<any>(response);
    
    // Store tokens
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  }

  async createAnonymousSession(): Promise<{ user: User; token: string; sessionId?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await this.handleResponse<any>(response);
    
    // Store anonymous token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async verifyToken(): Promise<{ valid: boolean; user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  // Session Management APIs
  async createSession(sessionData: CreateSessionRequest): Promise<{ session: Session }> {
    const response = await fetch(`${API_BASE_URL}/sessions/create`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });

    return this.handleResponse<any>(response);
  }

  async getAvailableSessions(filters?: {
    helperType?: string;
    severity?: string;
    limit?: number;
  }): Promise<{ sessions: Session[]; totalWaiting: number }> {
    const params = new URLSearchParams();
    if (filters?.helperType) params.append('helperType', filters.helperType);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${API_BASE_URL}/sessions/available?${params}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async getMySessions(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sessions: Session[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${API_BASE_URL}/sessions/my-sessions?${params}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async getSession(sessionId: string): Promise<{ session: Session; messages: Message[]; messageCount: number }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async acceptSession(sessionId: string, welcomeMessage?: string): Promise<{ session: Session }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/accept`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: welcomeMessage }),
    });

    return this.handleResponse<any>(response);
  }

  async declineSession(sessionId: string, reason?: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/decline`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    return this.handleResponse<any>(response);
  }



  async closeSession(sessionId: string, rating?: number, feedback?: string, notes?: string): Promise<{ session: Session }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating, feedback, notes }),
    });

    return this.handleResponse<any>(response);
  }

  async startChatbotSession(sessionId: string): Promise<{ session: Session; welcomeMessage: Message }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/start-chatbot`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    return this.handleResponse<any>(response);
  }

  // Message APIs
  async sendMessage(messageData: SendMessageRequest): Promise<{ messageData: Message }> {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    return this.handleResponse<any>(response);
  }

  async getSessionMessages(sessionId: string, options?: {
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<{ messages: Message[]; pagination: any; sessionInfo: any }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.before) params.append('before', options.before);
    if (options?.after) params.append('after', options.after);

    const response = await fetch(`${API_BASE_URL}/messages/session/${sessionId}?${params}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  // AI Chatbot APIs
  async sendAiMessage(message: string, context?: any): Promise<{ response: any; sessionId: string; conversationId: string }> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, context }),
    });

    return this.handleResponse<any>(response);
  }

  async continueAiConversation(conversationId: string, sessionId: string, message: string): Promise<{ response: any }> {
    const response = await fetch(`${API_BASE_URL}/ai/continue`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, sessionId, message }),
    });

    return this.handleResponse<any>(response);
  }

  // Questionnaire APIs
  async getQuestionnaire(type: 'PHQ-9' | 'GAD-7' | 'GHQ-12' | 'GHQ-28'): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/questionnaires/type/${type}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async startQuestionnaireSession(questionnaireId: string, questionnaireType: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/responses/start`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questionnaireId, questionnaireType }),
    });

    return this.handleResponse<any>(response);
  }

  async submitQuestionnaireAnswer(sessionId: string, questionNumber: number, selectedValue: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/responses/submit-answer`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, questionNumber, selectedValue }),
    });

    return this.handleResponse<any>(response);
  }

  async completeQuestionnaire(sessionId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/responses/complete`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    return this.handleResponse<any>(response);
  }

  // Assessment APIs
  async submitAssessment(assessmentData: {
    questionnaires: any;
    functionalImpact: any;
    overallResults: any;
    timeToComplete?: number;
    startedAt?: string;
    deviceType?: string;
    notes?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/assessment/submit`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assessmentData),
    });

    return this.handleResponse<any>(response);
  }

  async getLatestAssessment(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/assessment/latest`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async getAssessmentHistory(limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/assessment/history?${params}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  async getAssessment(sessionId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/assessment/${sessionId}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    return this.handleResponse<any>(response);
  }

  // Crisis Management APIs
  async createCrisisAlert(alertData: {
    severity: 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    sessionId?: string;
    triggerMessage?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/crisis/create`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alertData),
    });

    return this.handleResponse<any>(response);
  }

  async getCrisisResources(location?: string): Promise<any> {
    const params = new URLSearchParams();
    if (location) params.append('location', location);

    const response = await fetch(`${API_BASE_URL}/crisis/resources?${params}`, {
      method: 'GET',
    });

    return this.handleResponse<any>(response);
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getUserRole(): string | null {
    const user = this.getCurrentUserFromStorage();
    return user?.role || null;
  }

  // Health check method to test connection
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Unable to connect to the backend server. Please ensure it is running on http://localhost:5000');
    }
  }

  // AI Chatbot APIs
  async sendChatMessage(message: string, conversationId?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationId
      }),
    });

    return this.handleResponse<any>(response);
  }
}

export const apiService = new ApiService();
export type { User, Session, Message, CreateSessionRequest, SendMessageRequest, LoginRequest, RegisterRequest };