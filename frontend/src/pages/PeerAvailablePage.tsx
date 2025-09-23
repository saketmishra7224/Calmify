import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MessageCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { Layout } from '@/components/Layout';

interface Session {
  _id: string;
  patientId: {
    _id: string;
    username: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      preferredName?: string;
    };
    anonymousId?: string;
  };
  helperType: 'peer' | 'counselor' | 'chatbot';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  status: 'waiting' | 'active' | 'closed' | 'escalated';
  title?: string;
  description?: string;
  createdAt: string;
  waitingMinutes?: number;
  urgencyScore?: number;
}

const PeerAvailablePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAvailableSessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAvailableSessions({
        helperType: 'peer',
        limit: 20
      });
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Error fetching available sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available sessions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSession = async (sessionId: string) => {
    try {
      setAccepting(sessionId);
      await apiService.acceptSession(sessionId);
      toast({
        title: 'Success',
        description: 'Session accepted successfully!'
      });
      navigate(`/sessions/${sessionId}`);
    } catch (error) {
      console.error('Error accepting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept session',
        variant: 'destructive'
      });
    } finally {
      setAccepting(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'severe': return 'bg-orange-100 text-orange-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'mild': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'severe':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchAvailableSessions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAvailableSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Available Peer Support Sessions</h1>
            <p className="text-gray-600">Help someone who needs peer support</p>
          </div>
          <Button onClick={fetchAvailableSessions} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Available Sessions
              </h3>
              <p className="text-gray-600">
                There are currently no peer support sessions waiting for helpers.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card key={session._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getSeverityIcon(session.severity)}
                      {session.title || 'Peer Support Session'}
                    </CardTitle>
                    <Badge className={getSeverityColor(session.severity)}>
                      {session.severity}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {session.patientId.profile?.preferredName || 
                     session.patientId.username || 
                     session.patientId.anonymousId || 
                     'Anonymous User'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {session.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {session.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Waiting {session.waitingMinutes || 0} min
                    </div>
                    {session.urgencyScore && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Score: {Math.round(session.urgencyScore)}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleAcceptSession(session._id)}
                    disabled={accepting === session._id}
                    className="w-full"
                  >
                    {accepting === session._id ? 'Accepting...' : 'Accept Session'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PeerAvailablePage;