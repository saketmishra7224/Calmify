import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Session } from '../services/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  MessageCircle, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Calendar,
  Timer,
  User,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SessionStats {
  total: number;
  active: number;
  completed: number;
  waiting: number;
  averageRating?: number;
  totalHours?: number;
}

const PeerCounselorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my-sessions');
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    active: 0,
    completed: 0,
    waiting: 0
  });

  useEffect(() => {
    fetchMySessions();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableSessions();
    }
  }, [activeTab]);

  const fetchMySessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMySessions({
        limit: 50
      });
      
      const sessions = response.sessions || [];
      setMySessions(sessions);
      
      // Calculate stats
      const sessionStats: SessionStats = {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        completed: sessions.filter(s => s.status === 'closed').length,
        waiting: sessions.filter(s => s.status === 'waiting').length,
        averageRating: sessions.filter(s => s.rating).length > 0 
          ? sessions.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) / sessions.filter(s => s.rating).length
          : undefined,
        totalHours: sessions.reduce((sum, s) => {
          if (s.startedAt && s.endedAt) {
            const duration = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
            return sum + (duration / (1000 * 60 * 60)); // Convert to hours
          }
          return sum;
        }, 0)
      };
      
      setStats(sessionStats);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSessions = async () => {
    try {
      setAvailableLoading(true);
      const response = await apiService.getAvailableSessions({
        helperType: user?.role,
        limit: 20
      });
      setAvailableSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to fetch available sessions:', error);
    } finally {
      setAvailableLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  const handleAcceptSession = async (sessionId: string) => {
    try {
      const welcomeMessage = user?.role === 'peer' 
        ? "Hi! I'm here to help and support you. How are you feeling right now?"
        : "Hello, I'm a licensed counselor here to provide professional support. What would you like to talk about today?";
        
      await apiService.acceptSession(sessionId, welcomeMessage);
      
      // Refresh both lists
      fetchMySessions();
      fetchAvailableSessions();
      
      // Navigate to the session
      navigate(`/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to accept session:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {user?.role === 'peer' ? 'Peer Support' : 'Counselor'} Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your sessions and help those in need
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All time sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Session rating
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="available">Available Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="my-sessions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Sessions</CardTitle>
                    <CardDescription>
                      Sessions you have participated in as a {user?.role}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchMySessions}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mySessions.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't participated in any sessions yet. Check available sessions to get started.
                      </p>
                      <Button onClick={() => setActiveTab('available')}>
                        View Available Sessions
                      </Button>
                    </div>
                  ) : (
                    mySessions.map((session) => (
                      <Card key={session._id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getStatusColor(session.status)}>
                                  {session.status}
                                </Badge>
                                <Badge className={getSeverityColor(session.severity)}>
                                  {session.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {session.helperType}
                                </Badge>
                              </div>
                              
                              <h4 className="font-semibold text-lg mb-1">
                                {session.title || 'Support Session'}
                              </h4>
                              
                              {session.description && (
                                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                  {session.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(session.createdAt), 'MMM dd, yyyy')}
                                </div>
                                
                                {session.endedAt && session.startedAt && (
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-4 w-4" />
                                    {Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60))} min
                                  </div>
                                )}
                                
                                {session.messageCount && (
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    {session.messageCount} messages
                                  </div>
                                )}

                                {session.rating && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">★</span>
                                    {session.rating}/5
                                  </div>
                                )}
                              </div>

                              {session.patientId && typeof session.patientId === 'object' && (
                                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  Patient: {session.patientId.profile?.preferredName || session.patientId.username}
                                </div>
                              )}
                            </div>

                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSessionClick(session._id)}
                              className="ml-4"
                            >
                              View Details
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Available Sessions</CardTitle>
                    <CardDescription>
                      Sessions waiting for {user?.role} support - sorted by urgency
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAvailableSessions}
                    disabled={availableLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${availableLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading available sessions...</p>
                    </div>
                  ) : availableSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No sessions available</h3>
                      <p className="text-muted-foreground">
                        All sessions are currently being handled. Check back later.
                      </p>
                    </div>
                  ) : (
                    availableSessions.map((session) => (
                      <Card key={session._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getSeverityColor(session.severity)}>
                                  {session.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {session.helperType}
                                </Badge>
                                {session.waitingMinutes && session.waitingMinutes > 0 && (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {session.waitingMinutes}m waiting
                                  </Badge>
                                )}
                              </div>
                              
                              <h4 className="font-semibold text-lg mb-1">
                                {session.title || 'Support Request'}
                              </h4>
                              
                              {session.description && (
                                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                  {session.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDistance(new Date(session.createdAt), new Date(), { addSuffix: true })}
                                </div>

                                {session.patientId && typeof session.patientId === 'object' && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {session.patientId.profile?.preferredName || 'Anonymous'}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button 
                                size="sm"
                                onClick={() => handleAcceptSession(session._id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Accept Session
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default PeerCounselorDashboard;