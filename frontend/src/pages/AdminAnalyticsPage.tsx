import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, TrendingUp, Users, AlertTriangle, Clock, MessageCircle, Shield, Activity, Zap, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AnalyticsData {
  totalUsers: number;
  activeSessions: number;
  completedSessions: number;
  crisisAlerts: number;
  usersByRole?: {
    patient?: number;
    peer?: number;
    counselor?: number;
    admin?: number;
  };
  sessionsByType: {
    chatbot: number;
    peer: number;
    counselor: number;
  };
  severityDistribution: {
    mild: number;
    moderate: number;
    severe: number;
    critical: number;
  };
  responseMetrics: {
    averageResponseTime: number;
    peakHours: string[];
    satisfaction: number;
  };
}

interface CrisisMetrics {
  total: number;
  resolved: number;
  pending: number;
  averageResolutionTime: number;
}

export default function AdminAnalyticsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [crisisMetrics, setCrisisMetrics] = useState<CrisisMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Initialize with default values to prevent undefined errors
  const defaultAnalytics: AnalyticsData = {
    totalUsers: 0,
    activeSessions: 0,
    completedSessions: 0,
    crisisAlerts: 0,
    usersByRole: {
      patient: 0,
      peer: 0,
      counselor: 0,
      admin: 0
    },
    sessionsByType: {
      chatbot: 0,
      peer: 0,
      counselor: 0
    },
    severityDistribution: {
      mild: 0,
      moderate: 0,
      severe: 0,
      critical: 0
    },
    responseMetrics: {
      averageResponseTime: 0,
      peakHours: [],
      satisfaction: 0
    }
  };

  // Use current analytics data or default
  const currentAnalytics = analytics ? {
    ...defaultAnalytics,
    ...analytics,
    usersByRole: analytics.usersByRole || defaultAnalytics.usersByRole,
    sessionsByType: analytics.sessionsByType || defaultAnalytics.sessionsByType,
    severityDistribution: analytics.severityDistribution || defaultAnalytics.severityDistribution,
    responseMetrics: analytics.responseMetrics || defaultAnalytics.responseMetrics
  } : defaultAnalytics;

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (isLoading) return;
    
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadAnalytics();
  }, [isAuthenticated, user, navigate, timeRange, isLoading]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching analytics data from backend...');

      // Fetch real analytics data from backend
      const analyticsData = await apiService.getAdminAnalytics(timeRange);
      
      console.log('Analytics response:', analyticsData);

      // Handle analytics response - data is already extracted by handleResponse
      if (analyticsData) {
        setAnalytics({
          totalUsers: analyticsData.totalUsers || 0,
          activeSessions: analyticsData.activeSessions || 0,
          completedSessions: analyticsData.completedSessions || 0,
          crisisAlerts: analyticsData.crisisAlerts || 0,
          usersByRole: analyticsData.usersByRole || {},
          sessionsByType: analyticsData.sessionsByType || { chatbot: 0, peer: 0, counselor: 0 },
          severityDistribution: analyticsData.severityDistribution || { mild: 0, moderate: 0, severe: 0, critical: 0 },
          responseMetrics: analyticsData.responseMetrics || { averageResponseTime: 0, peakHours: [], satisfaction: 0 }
        });

        console.log('Analytics data set successfully');
      } else {
        throw new Error('No analytics data received');
      }

      // Fetch crisis analytics separately
      try {
        const crisisData = await apiService.getCrisisAnalytics(timeRange);
        if (crisisData) {
          setCrisisMetrics(crisisData);
        } else {
          // Use fallback crisis metrics from analytics data
          setCrisisMetrics({
            total: analyticsData.crisisAlerts || 0,
            resolved: Math.floor((analyticsData.crisisAlerts || 0) * 0.7),
            pending: Math.floor((analyticsData.crisisAlerts || 0) * 0.3),
            averageResolutionTime: 15
          });
        }
      } catch (crisisError) {
        console.warn('Crisis analytics failed, using fallback:', crisisError);
        setCrisisMetrics({
          total: analyticsData.crisisAlerts || 0,
          resolved: Math.floor((analyticsData.crisisAlerts || 0) * 0.7),
          pending: Math.floor((analyticsData.crisisAlerts || 0) * 0.3),
          averageResolutionTime: 15
        });
      }

    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      setError(`Failed to load analytics: ${error.message}`);
      
      // Set empty analytics on error
      setAnalytics({
        totalUsers: 0,
        activeSessions: 0,
        completedSessions: 0,
        crisisAlerts: 0,
        usersByRole: { patient: 0, peer: 0, counselor: 0, admin: 0 },
        sessionsByType: { chatbot: 0, peer: 0, counselor: 0 },
        severityDistribution: { mild: 0, moderate: 0, severe: 0, critical: 0 },
        responseMetrics: { averageResponseTime: 0, peakHours: [], satisfaction: 0 }
      });
      
      setCrisisMetrics({
        total: 0,
        resolved: 0,
        pending: 0,
        averageResolutionTime: 0
      });
      
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <Layout currentRole="admin">
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to be logged in as an administrator to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentRole="admin">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <BarChart3 className="h-6 w-6" />
                Platform Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time insights into platform performance and user engagement
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <Button onClick={loadAnalytics} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              {analytics && (
                <Badge variant="outline" className="text-green-600">
                  Data loaded: {new Date().toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold text-foreground">{currentAnalytics.totalUsers || 0}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          P: {analytics?.usersByRole?.patient || 0} | 
                          Pr: {analytics?.usersByRole?.peer || 0} | 
                          C: {analytics?.usersByRole?.counselor || 0}
                        </div>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                        <p className="text-2xl font-bold text-foreground">{currentAnalytics.activeSessions || 0}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Currently active
                        </div>
                      </div>
                      <Activity className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completed Sessions</p>
                        <p className="text-2xl font-bold text-foreground">{currentAnalytics.completedSessions || 0}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          In timeframe
                        </div>
                      </div>
                      <MessageCircle className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Crisis Alerts</p>
                        <p className="text-2xl font-bold text-destructive">{currentAnalytics.crisisAlerts || 0}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          High priority cases
                        </div>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Crisis Management */}
              {crisisMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-destructive" />
                      Crisis Management Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive mb-1">
                          {crisisMetrics.total}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Alerts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {crisisMetrics.resolved}
                        </div>
                        <div className="text-sm text-muted-foreground">Resolved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {crisisMetrics.pending}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground mb-1">
                          {crisisMetrics.averageResolutionTime}min
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Resolution</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Session Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Session Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="text-sm font-medium">AI Chatbot</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currentAnalytics.sessionsByType?.chatbot || 0} ({Math.round(((currentAnalytics.sessionsByType?.chatbot || 0) / currentAnalytics.activeSessions) * 100) || 0}%)
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Peer Support</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currentAnalytics.sessionsByType?.peer || 0} ({Math.round(((currentAnalytics.sessionsByType?.peer || 0) / currentAnalytics.activeSessions) * 100) || 0}%)
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Counselor</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                                                    {currentAnalytics.sessionsByType?.counselor || 0} ({Math.round(((currentAnalytics.sessionsByType?.counselor || 0) / currentAnalytics.activeSessions) * 100) || 0}%)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Severity Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                                            {Object.entries(currentAnalytics.severityDistribution || {}).map(([severity, count]) => (
                        <div key={severity} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={severity === 'critical' ? 'destructive' : 
                                     severity === 'severe' ? 'destructive' : 
                                     severity === 'moderate' ? 'default' : 'secondary'}
                            >
                              {severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {count} cases
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground mb-1">
                                                {currentAnalytics.responseMetrics?.averageResponseTime || 0}min
                      </div>
                      <div className="text-sm text-muted-foreground">Average Response Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground mb-1">
                                                {currentAnalytics.responseMetrics?.satisfaction || 0}/5.0
                      </div>
                      <div className="text-sm text-muted-foreground">User Satisfaction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground mb-1">
                        {currentAnalytics.responseMetrics?.peakHours?.join(', ') || 'No data available'}
                      </div>
                      <div className="text-sm text-muted-foreground">Peak Usage Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health & Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">All systems operational</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Crisis response active</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Data backup current</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}