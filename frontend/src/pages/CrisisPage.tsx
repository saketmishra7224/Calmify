import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, ExternalLink, MapPin, Clock, AlertTriangle, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CRISIS_HOTLINES = [
  {
    name: "National Suicide Prevention Lifeline",
    number: "988",
    description: "Free and confidential emotional support 24/7",
    available: "24/7"
  },
  {
    name: "Crisis Text Line",
    number: "Text HOME to 741741",
    description: "Free, 24/7 crisis support via text",
    available: "24/7"
  },
  {
    name: "National Alliance on Mental Illness",
    number: "1-800-950-NAMI (6264)",
    description: "Information, referrals and support",
    available: "M-F 10am-8pm ET"
  },
  {
    name: "SAMHSA National Helpline",
    number: "1-800-662-4357",
    description: "Treatment referral and information service",
    available: "24/7"
  }
];

const EMERGENCY_ACTIONS = [
  {
    title: "Call 911",
    description: "If you are in immediate physical danger",
    urgent: true
  },
  {
    title: "Go to Emergency Room",
    description: "For immediate medical attention",
    urgent: true
  },
  {
    title: "Call Crisis Hotline",
    description: "Speak with a trained crisis counselor",
    urgent: false
  },
  {
    title: "Reach Out to Support",
    description: "Contact a trusted friend, family member, or counselor",
    urgent: false
  }
];

const IMMEDIATE_RESOURCES = [
  {
    title: "Safety Planning",
    description: "Create a personalized safety plan",
    action: "Create Plan"
  },
  {
    title: "Coping Strategies",
    description: "Immediate techniques to manage distress",
    action: "View Strategies"
  },
  {
    title: "Find Local Help",
    description: "Locate mental health services near you",
    action: "Find Services"
  }
];

export default function CrisisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Log crisis page access for monitoring
    console.log('Crisis page accessed by user:', user?._id || 'anonymous');
  }, [user]);

  const handleCallNumber = (number: string) => {
    // For mobile devices, this will open the phone dialer
    window.location.href = `tel:${number.replace(/\D/g, '')}`;
  };

  const handleTextCrisis = () => {
    // For mobile devices with messaging apps
    window.location.href = 'sms:741741?body=HOME';
  };

  return (
    <Layout currentRole={user?.role || "student"}>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Emergency Alert */}
          <Alert className="border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              <strong>Crisis Support Resources</strong> - If you're having thoughts of hurting yourself or others, 
              please reach out for immediate help. You are not alone.
            </AlertDescription>
          </Alert>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="h-8 w-8 text-destructive" />
              <h1 className="text-3xl font-bold text-foreground">Crisis Support</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              You matter. Your life has value. Help is available 24/7, and trained professionals are ready to support you.
            </p>
          </div>

          {/* Immediate Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Immediate Actions
              </CardTitle>
              <CardDescription>
                If you're in crisis, here are your immediate options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {EMERGENCY_ACTIONS.map((action, index) => (
                  <Card key={index} className={`${action.urgent ? 'border-destructive bg-destructive/5' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-semibold ${action.urgent ? 'text-destructive' : 'text-foreground'}`}>
                            {action.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        </div>
                        {action.urgent && (
                          <Badge variant="destructive" className="ml-2">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Crisis Hotlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Crisis Hotlines
              </CardTitle>
              <CardDescription>
                Free, confidential support available now
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {CRISIS_HOTLINES.map((hotline, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{hotline.name}</h3>
                      <p className="text-sm text-muted-foreground">{hotline.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{hotline.available}</span>
                      </div>
                    </div>
                    <Badge variant="outline">{hotline.available.includes('24/7') ? '24/7' : 'Limited Hours'}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {hotline.number.includes('Text') ? (
                      <Button onClick={handleTextCrisis} className="bg-primary">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {hotline.number}
                      </Button>
                    ) : (
                      <Button onClick={() => handleCallNumber(hotline.number)} className="bg-primary">
                        <Phone className="h-4 w-4 mr-2" />
                        {hotline.number}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Immediate Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Immediate Resources</CardTitle>
              <CardDescription>
                Tools and resources to help you right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {IMMEDIATE_RESOURCES.map((resource, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold text-foreground mb-2">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
                      <Button variant="outline" size="sm" className="w-full">
                        {resource.action}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Local Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Find Local Help
              </CardTitle>
              <CardDescription>
                Locate mental health services and emergency resources near you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="text-left">
                    <div className="font-semibold">Emergency Rooms</div>
                    <div className="text-sm text-muted-foreground">Find the nearest hospital</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="text-left">
                    <div className="font-semibold">Mental Health Centers</div>
                    <div className="text-sm text-muted-foreground">Community mental health services</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="text-left">
                    <div className="font-semibold">Crisis Centers</div>
                    <div className="text-sm text-muted-foreground">Local crisis intervention</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="text-left">
                    <div className="font-semibold">Support Groups</div>
                    <div className="text-sm text-muted-foreground">Peer support meetings</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Return to Safety */}
          <div className="text-center space-y-4 p-6 bg-muted/50 rounded-lg">
            <h2 className="text-xl font-semibold text-foreground">Remember: This Will Pass</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Crisis feelings are temporary. With support and time, things can and do get better. 
              You've taken a brave step by seeking help.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/chatbot')} variant="outline">
                Continue AI Support
              </Button>
              <Button onClick={() => navigate('/peer/chats')}>
                Talk to Peer Support
              </Button>
              <Button onClick={() => navigate('/counselor/request')}>
                Find Professional Help
              </Button>
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center text-sm text-muted-foreground p-4 border-t border-border">
            <p>
              If you're experiencing a medical emergency, call 911 immediately. 
              This platform provides support but is not a substitute for professional emergency services.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}