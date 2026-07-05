import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, ExternalLink, MapPin, Clock, AlertTriangle, Heart, Shield, Users, Stethoscope, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sage = '#8FAE9B';
const dusty = '#7A9BB0';
const cream = '#FAF7F2';
const warmGray = '#4A4A4A';
const coral = '#E08E6D';

const CRISIS_HOTLINES = [
  {
    name: "Tele-MANAS Helpline (Govt of India)",
    number: "1800-891-4416",
    description: "Free, 24/7 mental health counseling and support",
    available: "24/7"
  },
  {
    name: "KIRAN Mental Health Helpline (Govt of India)",
    number: "1800-599-0019",
    description: "Professional rehabilitation & cognitive support",
    available: "24/7"
  },
  {
    name: "Vandrevala Foundation Helpline",
    number: "+91 9999 666 555",
    description: "Free and confidential emotional support for distress",
    available: "24/7"
  },
  {
    name: "AASRA Helpline",
    number: "+91 98204 66726",
    description: "Confidential suicide prevention support",
    available: "24/7"
  }
];

const EMERGENCY_ACTIONS = [
  {
    title: "Call 112 / 100",
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

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 transition-colors duration-500" style={{ backgroundColor: cream, color: warmGray }}>
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Emergency Alert - Softened & Calm */}
          <Alert 
            className="border shadow-md duration-500 rounded-3xl"
            style={{ 
              backgroundColor: 'rgba(224,142,109,0.08)', 
              borderColor: 'rgba(224,142,109,0.25)', 
            }}
          >
            <div className="flex items-start gap-4 p-2">
              <div className="rounded-full p-2.5 flex-shrink-0" style={{ backgroundColor: coral }}>
                <AlertTriangle className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <AlertDescription className="font-medium text-base flex-1" style={{ color: '#4A4A4A' }}>
                <strong className="block text-lg mb-1 font-heading" style={{ color: '#3A3A3A' }}>Crisis Support Resources Available Now</strong>
                <p style={{ color: '#5A5A5A', lineHeight: '1.6' }}>If you're having thoughts of hurting yourself or others, please reach out for immediate help. You are not alone, and support is available 24/7.</p>
              </AlertDescription>
            </div>
          </Alert>

          {/* Header - Centered & Calm */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="rounded-2xl p-3 shadow-md" style={{ backgroundColor: `${sage}20` }}>
                <Heart className="h-9 w-9" style={{ color: sage }} strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold" style={{ color: '#3A3A3A' }}>
              Crisis Support
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: '#6B6B6B' }}>
              You matter. Your life has value. Help is available 24/7, and trained professionals are ready to support you right now.
            </p>
          </div>

          {/* Immediate Actions */}
          <Card className="rounded-3xl shadow-lg border-0" style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)' }}>
            <CardHeader className="border-b" style={{ borderColor: 'rgba(143,174,155,0.12)', backgroundColor: 'rgba(143,174,155,0.03)' }}>
              <CardTitle className="flex items-center gap-3 text-xl font-heading font-bold" style={{ color: '#3A3A3A' }}>
                <div className="rounded-xl p-2.5" style={{ backgroundColor: `${coral}18` }}>
                  <AlertTriangle className="h-5 w-5" style={{ color: coral }} strokeWidth={1.5} />
                </div>
                Immediate Actions
              </CardTitle>
              <CardDescription className="text-sm mt-1" style={{ color: '#8A8A8A' }}>
                If you're in crisis, here are your immediate options for getting help
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {EMERGENCY_ACTIONS.map((action, index) => (
                  <Card 
                    key={index} 
                    className="transition-all duration-300 rounded-2xl hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-white/60"
                    style={{ 
                      borderColor: action.urgent ? 'rgba(224,142,109,0.3)' : 'rgba(143,174,155,0.15)',
                      borderWidth: action.urgent ? '2px' : '1px',
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-heading font-bold text-base mb-2" style={{ color: action.urgent ? '#C0554A' : '#3A3A3A' }}>
                            {action.title}
                          </h3>
                          <p className="text-sm leading-relaxed" style={{ color: '#6B6B6B' }}>
                            {action.description}
                          </p>
                        </div>
                        {action.urgent && (
                          <Badge className="ml-2 px-2.5 py-0.5 text-xs font-semibold rounded-full border-0 bg-red-100 text-red-700 animate-pulse">
                            URGENT
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
          <Card className="rounded-3xl shadow-lg border-0" style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)' }}>
            <CardHeader className="border-b" style={{ borderColor: 'rgba(143,174,155,0.12)', backgroundColor: 'rgba(122,155,176,0.03)' }}>
              <CardTitle className="flex items-center gap-3 text-xl font-heading font-bold" style={{ color: '#3A3A3A' }}>
                <div className="rounded-xl p-2.5" style={{ backgroundColor: `${dusty}18` }}>
                  <Phone className="h-5 w-5" style={{ color: dusty }} strokeWidth={1.5} />
                </div>
                Crisis Hotlines
              </CardTitle>
              <CardDescription className="text-sm mt-1" style={{ color: '#8A8A8A' }}>
                Free, confidential support available now - you can call or text anytime
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {CRISIS_HOTLINES.map((hotline, index) => (
                <div 
                  key={index} 
                  className="border rounded-2xl p-5 space-y-4 bg-white/60 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md"
                  style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <h3 className="font-heading font-bold text-base" style={{ color: '#3A3A3A' }}>{hotline.name}</h3>
                      <p className="text-sm" style={{ color: '#6B6B6B', lineHeight: '1.6' }}>{hotline.description}</p>
                      <div className="flex items-center gap-2 pt-1 text-[#8A8A8A]">
                        <Clock className="h-4 w-4" strokeWidth={1.5} />
                        <span className="text-xs font-medium">{hotline.available}</span>
                      </div>
                    </div>
                    <div>
                      <Badge 
                        variant="outline" 
                        className="px-3 py-1 font-semibold rounded-full border-0 text-xs"
                        style={{
                          backgroundColor: hotline.available.includes('24/7') ? 'rgba(143,174,155,0.12)' : 'rgba(122,155,176,0.12)',
                          color: hotline.available.includes('24/7') ? '#6B8775' : '#5E798B',
                        }}
                      >
                        {hotline.available.includes('24/7') ? '24/7 Available' : 'Limited Hours'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => handleCallNumber(hotline.number)} 
                      className="text-white shadow-sm transition-all duration-300 rounded-full px-6 py-2 h-auto text-sm font-semibold"
                      style={{ backgroundColor: coral }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D57A57'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = coral}
                    >
                      <Phone className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Call {hotline.number}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Immediate Resources */}
          <Card className="rounded-3xl shadow-lg border-0" style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)' }}>
            <CardHeader className="border-b" style={{ borderColor: 'rgba(143,174,155,0.12)', backgroundColor: 'rgba(143,174,155,0.03)' }}>
              <CardTitle className="text-xl font-heading font-bold flex items-center gap-3" style={{ color: '#3A3A3A' }}>
                <div className="rounded-xl p-2.5" style={{ backgroundColor: `${sage}18` }}>
                  <Sparkles className="h-5 w-5" style={{ color: sage }} strokeWidth={1.5} />
                </div>
                Immediate Resources
              </CardTitle>
              <CardDescription className="text-sm mt-1" style={{ color: '#8A8A8A' }}>
                Tools and resources to help you right now
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {IMMEDIATE_RESOURCES.map((resource, index) => (
                  <Card 
                    key={index} 
                    className="group transition-all duration-300 rounded-2xl hover:shadow-md bg-white/60 hover:bg-white"
                    style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                  >
                    <CardContent className="p-6 text-center relative flex flex-col justify-between h-full min-h-[220px]">
                      <div>
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: `${sage}15` }}>
                          <ExternalLink className="h-5 w-5" style={{ color: sage }} strokeWidth={1.5} />
                        </div>
                        <h3 className="font-heading font-bold text-base mb-2" style={{ color: '#3A3A3A' }}>{resource.title}</h3>
                        <p className="text-xs mb-5 leading-relaxed" style={{ color: '#6B6B6B' }}>{resource.description}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full transition-all duration-300 font-semibold rounded-full border"
                        style={{ 
                          borderColor: 'rgba(143,174,155,0.3)',
                          color: '#4A4A4A',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(143,174,155,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {resource.action}
                        <ExternalLink className="h-3 w-3 ml-1.5" strokeWidth={1.5} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Local Resources */}
          <Card className="rounded-3xl shadow-lg border-0" style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)' }}>
            <CardHeader className="border-b" style={{ borderColor: 'rgba(143,174,155,0.12)', backgroundColor: 'rgba(122,155,176,0.03)' }}>
              <CardTitle className="flex items-center gap-3 text-xl font-heading font-bold" style={{ color: '#3A3A3A' }}>
                <div className="rounded-xl p-2.5" style={{ backgroundColor: `${dusty}18` }}>
                  <MapPin className="h-5 w-5" style={{ color: dusty }} strokeWidth={1.5} />
                </div>
                Find Local Help
              </CardTitle>
              <CardDescription className="text-sm mt-1" style={{ color: '#8A8A8A' }}>
                Locate mental health services and emergency resources near you
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: "Emergency Rooms", text: "Find the nearest hospital", icon: AlertTriangle, color: coral },
                  { title: "Mental Health Centers", text: "Community mental health services", icon: Stethoscope, color: sage },
                  { title: "Crisis Centers", text: "Local crisis intervention", icon: Shield, color: '#C0554A' },
                  { title: "Support Groups", text: "Peer support meetings", icon: Users, color: dusty },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Button 
                      key={idx}
                      variant="outline" 
                      className="h-auto p-5 justify-start border transition-all duration-300 group rounded-2xl bg-white/60 hover:bg-white"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = sage; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(143,174,155,0.15)'; }}
                    >
                      <div className="text-left flex items-center gap-4 w-full">
                        <div className="rounded-xl p-3 transition-all duration-300" style={{ backgroundColor: 'rgba(143,174,155,0.08)' }}>
                          <Icon className="h-5 w-5" style={{ color: item.color }} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-heading font-bold text-sm mb-0.5" style={{ color: '#3A3A3A' }}>{item.title}</div>
                          <div className="text-xs truncate" style={{ color: '#8A8A8A' }}>{item.text}</div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Return to Safety - Soft & Beautiful */}
          <div 
            className="text-center space-y-6 p-8 rounded-3xl border shadow-md"
            style={{ 
              backgroundColor: 'rgba(143,174,155,0.08)',
              borderColor: 'rgba(143,174,155,0.2)',
            }}
          >
            <div className="flex justify-center">
              <div className="rounded-full p-4 shadow-sm bg-white">
                <Heart className="h-8 w-8" style={{ color: sage }} strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold" style={{ color: '#3A3A3A' }}>
              Remember: This Will Pass
            </h2>
            <p className="max-w-2xl mx-auto text-sm md:text-base leading-relaxed" style={{ color: '#6B6B6B' }}>
              Crisis feelings are temporary. With support and time, things can and do get better. 
              You've taken a brave step by seeking help. We're here for you.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <Button 
                onClick={() => navigate('/chatbot')} 
                variant="outline"
                className="transition-all duration-300 px-6 py-2.5 h-auto text-sm font-semibold rounded-full border"
                style={{ borderColor: 'rgba(143,174,155,0.3)', backgroundColor: 'transparent', color: '#4A4A4A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <MessageCircle className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Continue AI Support
              </Button>
              <Button 
                onClick={() => navigate('/peer/request')}
                className="text-white shadow-sm transition-all duration-300 px-6 py-2.5 h-auto text-sm font-semibold rounded-full border-0"
                style={{ backgroundColor: sage }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#7D9C89'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = sage}
              >
                <Users className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Talk to Peer Support
              </Button>
              <Button 
                onClick={() => navigate('/counselor/request')}
                className="text-white shadow-sm transition-all duration-300 px-6 py-2.5 h-auto text-sm font-semibold rounded-full border-0"
                style={{ backgroundColor: coral }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D57A57'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = coral}
              >
                <Stethoscope className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Find Professional Help
              </Button>
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center text-xs p-6 border rounded-2xl" style={{ borderColor: 'rgba(143,174,155,0.12)', backgroundColor: 'rgba(143,174,155,0.03)' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-4 w-4" style={{ color: '#8A8A8A' }} strokeWidth={1.5} />
              <p className="font-semibold" style={{ color: '#3A3A3A' }}>Important Safety Information</p>
            </div>
            <p className="max-w-2xl mx-auto leading-relaxed" style={{ color: '#8A8A8A' }}>
              If you're experiencing a medical emergency, call <strong style={{ color: '#C0554A' }}>112</strong> immediately. 
              This platform provides support but is not a substitute for professional emergency services.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}