import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Session as ApiSession } from '../services/api';
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
  ArrowRight
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SessionStats {
  waiting: number;
  active: number;
  closed: number;
  escalated: number;
  total: number;
}

interface Session extends ApiSession {
  userRole?: 'patient' | 'helper';
  waitingMinutes?: number;
  activeDurationMinutes?: number;
  durationMinutes?: number;
  urgencyScore?: number;
}



const MySessionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessionFilter, setSessionFilter] = useState('all');

  useEffect(() => {
    fetchAllSessions();
  }, []);

  const fetchAllSessions = async () => {
    try {
      const response = await apiService.getMySessions({
        status: sessionFilter === 'all' ? undefined : sessionFilter,
        limit: 50
      });
      setAllSessions(response.sessions || []);
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
        helperType: user?.role, // peer or counselor
        limit: 20
      });
      setAvailableSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to fetch available sessions:', error);
    } finally {
      setAvailableLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSessions();
  }, [sessionFilter]);

  useEffect(() => {
    // Fetch available sessions when switching to available tab and user is a helper
    if (activeTab === 'available' && ['peer', 'counselor'].includes(user?.role || '')) {
      fetchAvailableSessions();
    }
  }, [activeTab, user?.role]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
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
      await apiService.acceptSession(sessionId, "Hi! I'm here to help you. How are you feeling right now?");
      fetchAllSessions();
      fetchAvailableSessions(); // Also refresh available sessions
    } catch (error) {
      console.error('Failed to accept session:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, description, color = "bg-primary" }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const SessionCard = ({ session, showActions = false }: { session: Session; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSessionClick(session._id)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{session.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{session.description}</p>
          </div>
          <div className="flex flex-col gap-1 ml-4">
            <Badge className={`text-xs ${getStatusColor(session.status)}`}>
              {session.status}
            </Badge>
            <Badge className={`text-xs ${getSeverityColor(session.severity)}`}>
              {session.severity}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {session.helperType}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(session.createdAt), 'MMM dd, HH:mm')}
            </span>
            {session.waitingMinutes && (
              <span className="flex items-center gap-1 text-yellow-600">
                <Clock className="h-3 w-3" />
                Waiting {session.waitingMinutes}m
              </span>
            )}
            {session.activeDurationMinutes && (
              <span className="flex items-center gap-1 text-green-600">
                <Timer className="h-3 w-3" />
                Active {session.activeDurationMinutes}m
              </span>
            )}
            {session.durationMinutes && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {session.durationMinutes}m total
              </span>
            )}
          </div>
          
          {showActions && session.status === 'waiting' && (
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptSession(session._id);
              }}
            >
              Accept
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground">
            {user?.role === 'patient' ? 'Track your support sessions and progress' :
             user?.role === 'peer' ? 'Manage your peer support sessions' :
             user?.role === 'counselor' ? 'View your counseling sessions and caseload' :
             'Session management interface'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="sessions">All Sessions</TabsTrigger>
          {['peer', 'counselor'].includes(user?.role || '') && (
            <TabsTrigger value="available">Available Sessions</TabsTrigger>
          )}
        </TabsList>



        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center gap-4">
            <select 
              value={sessionFilter} 
              onChange={(e) => setSessionFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Sessions</option>
              <option value="waiting">Waiting</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          <div className="space-y-3">
            {allSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
                  <p className="text-muted-foreground">
                    {sessionFilter === 'all' 
                      ? "You haven't had any sessions yet." 
                      : `No ${sessionFilter} sessions found.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              allSessions.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))
            )}
          </div>
        </TabsContent>

        {['peer', 'counselor'].includes(user?.role || '') && (
          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
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
                    {availableLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
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
                      <SessionCard key={session._id} session={session} showActions={true} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MySessionsPage;