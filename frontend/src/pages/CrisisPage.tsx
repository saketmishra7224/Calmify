import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, ExternalLink, MapPin, Clock, AlertTriangle, Heart, Shield, Users, Stethoscope, Sparkles } from "lucide-react";
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
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-orange-50/30 p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Emergency Alert - Enhanced */}
          <Alert className="border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg animate-in fade-in duration-500">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500 p-2 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <AlertDescription className="text-red-900 font-medium text-base flex-1">
                <strong className="block text-lg mb-1">Crisis Support Resources Available Now</strong>
                <p className="text-red-800">If you're having thoughts of hurting yourself or others, please reach out for immediate help. You are not alone, and support is available 24/7.</p>
              </AlertDescription>
            </div>
          </Alert>

          {/* Header - Enhanced */}
          <div className="text-center space-y-4 animate-in slide-in-from-top duration-700">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 p-3 shadow-lg">
                <Heart className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Crisis Support
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              You matter. Your life has value. Help is available 24/7, and trained professionals are ready to support you right now.
            </p>
          </div>

          {/* Immediate Actions - Enhanced */}
          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom duration-700">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="flex items-center gap-2 text-2xl text-red-700">
                <div className="rounded-lg bg-red-500 p-2">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                Immediate Actions
              </CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                If you're in crisis, here are your immediate options for getting help
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {EMERGENCY_ACTIONS.map((action, index) => (
                  <Card 
                    key={index} 
                    className={`
                      ${action.urgent 
                        ? 'border-2 border-red-400 bg-gradient-to-br from-red-50 to-orange-50 shadow-md hover:shadow-xl' 
                        : 'border border-gray-200 hover:border-[#2BD4BD] hover:shadow-lg bg-white'
                      }
                      transition-all duration-300 transform hover:-translate-y-1 cursor-pointer
                    `}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg mb-2 ${action.urgent ? 'text-red-700' : 'text-gray-800'}`}>
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {action.description}
                          </p>
                        </div>
                        {action.urgent && (
                          <Badge variant="destructive" className="ml-2 px-3 py-1 text-xs font-semibold animate-pulse">
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

          {/* Crisis Hotlines - Enhanced */}
          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom delay-150 duration-700">
            <CardHeader className="bg-gradient-to-r from-[#2BD4BD]/10 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="rounded-lg bg-[#2BD4BD] p-2">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                Crisis Hotlines
              </CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                Free, confidential support available now - you can call or text anytime
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {CRISIS_HOTLINES.map((hotline, index) => (
                <div 
                  key={index} 
                  className="border-2 border-gray-200 hover:border-[#2BD4BD] rounded-xl p-5 space-y-4 bg-white hover:bg-gradient-to-r hover:from-[#2BD4BD]/5 hover:to-blue-50/30 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-bold text-lg text-gray-900">{hotline.name}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{hotline.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Clock className="h-4 w-4 text-[#2BD4BD]" />
                        <span className="text-sm font-medium text-gray-700">{hotline.available}</span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${hotline.available.includes('24/7') 
                          ? 'bg-green-50 text-green-700 border-green-300' 
                          : 'bg-blue-50 text-blue-700 border-blue-300'
                        } px-3 py-1 font-semibold
                      `}
                    >
                      {hotline.available.includes('24/7') ? '24/7 Available' : 'Limited Hours'}
                    </Badge>
                  </div>
                  <div className="flex gap-3 pt-2">
                    {hotline.number.includes('Text') ? (
                      <Button 
                        onClick={handleTextCrisis} 
                        className="bg-[#2BD4BD] hover:bg-[#25BFB0] text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        {hotline.number}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleCallNumber(hotline.number)} 
                        className="bg-[#2BD4BD] hover:bg-[#25BFB0] text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        Call {hotline.number}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Immediate Resources - Enhanced */}
          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom delay-300 duration-700">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                Immediate Resources
              </CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                Tools and resources to help you right now
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {IMMEDIATE_RESOURCES.map((resource, index) => (
                  <Card 
                    key={index} 
                    className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border-2 border-gray-200 hover:border-purple-400 bg-gradient-to-br from-white to-purple-50/30 overflow-hidden"
                  >
                    <CardContent className="p-6 text-center relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/0 via-pink-100/0 to-purple-100/0 group-hover:from-purple-100/30 group-hover:via-pink-100/20 group-hover:to-purple-100/30 transition-all duration-500"></div>
                      <div className="relative">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <ExternalLink className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-3">{resource.title}</h3>
                        <p className="text-sm text-gray-600 mb-5 leading-relaxed">{resource.description}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all duration-300 font-semibold"
                        >
                          {resource.action}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Local Resources - Enhanced */}
          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom delay-500 duration-700">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="rounded-lg bg-blue-600 p-2">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                Find Local Help
              </CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                Locate mental health services and emergency resources near you
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-5 justify-start border-2 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
                >
                  <div className="text-left flex items-center gap-4 w-full">
                    <div className="rounded-lg bg-blue-100 p-3 group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-300">
                      <AlertTriangle className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-base text-gray-900 mb-1">Emergency Rooms</div>
                      <div className="text-sm text-gray-600">Find the nearest hospital</div>
                    </div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-5 justify-start border-2 hover:border-[#2BD4BD] hover:bg-[#2BD4BD]/10 transition-all duration-300 group"
                >
                  <div className="text-left flex items-center gap-4 w-full">
                    <div className="rounded-lg bg-[#2BD4BD]/20 p-3 group-hover:bg-[#2BD4BD] group-hover:scale-110 transition-all duration-300">
                      <Stethoscope className="h-6 w-6 text-[#2BD4BD] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-base text-gray-900 mb-1">Mental Health Centers</div>
                      <div className="text-sm text-gray-600">Community mental health services</div>
                    </div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-5 justify-start border-2 hover:border-red-500 hover:bg-red-50 transition-all duration-300 group"
                >
                  <div className="text-left flex items-center gap-4 w-full">
                    <div className="rounded-lg bg-red-100 p-3 group-hover:bg-red-500 group-hover:scale-110 transition-all duration-300">
                      <Shield className="h-6 w-6 text-red-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-base text-gray-900 mb-1">Crisis Centers</div>
                      <div className="text-sm text-gray-600">Local crisis intervention</div>
                    </div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-5 justify-start border-2 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 group"
                >
                  <div className="text-left flex items-center gap-4 w-full">
                    <div className="rounded-lg bg-purple-100 p-3 group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-300">
                      <Users className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-base text-gray-900 mb-1">Support Groups</div>
                      <div className="text-sm text-gray-600">Peer support meetings</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Return to Safety - Enhanced */}
          <div className="text-center space-y-6 p-8 bg-gradient-to-br from-[#2BD4BD]/10 via-blue-50/50 to-purple-50/30 rounded-2xl border-2 border-[#2BD4BD]/30 shadow-lg animate-in fade-in delay-700 duration-700">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-gradient-to-br from-[#2BD4BD] to-blue-500 p-4 shadow-lg">
                <Heart className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#2BD4BD] to-blue-600 bg-clip-text text-transparent">
              Remember: This Will Pass
            </h2>
            <p className="text-gray-700 max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
              Crisis feelings are temporary. With support and time, things can and do get better. 
              You've taken a brave step by seeking help. We're here for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                onClick={() => navigate('/chatbot')} 
                variant="outline"
                className="border-2 hover:border-[#2BD4BD] hover:bg-[#2BD4BD]/10 transition-all duration-300 px-6 py-3 text-base font-semibold group"
              >
                <MessageCircle className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Continue AI Support
              </Button>
              <Button 
                onClick={() => navigate('/peer/available')}
                className="bg-gradient-to-r from-[#2BD4BD] to-blue-500 hover:from-[#25BFB0] hover:to-blue-600 text-white shadow-md hover:shadow-xl transition-all duration-300 px-6 py-3 text-base font-semibold"
              >
                <Users className="h-5 w-5 mr-2" />
                Talk to Peer Support
              </Button>
              <Button 
                onClick={() => navigate('/counselor/request')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-xl transition-all duration-300 px-6 py-3 text-base font-semibold"
              >
                <Stethoscope className="h-5 w-5 mr-2" />
                Find Professional Help
              </Button>
            </div>
          </div>

          {/* Footer Message - Enhanced */}
          <div className="text-center text-sm text-gray-600 p-6 border-t-2 border-gray-200 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-gray-500" />
              <p className="font-semibold text-gray-700">Important Safety Information</p>
            </div>
            <p className="max-w-3xl mx-auto leading-relaxed">
              If you're experiencing a medical emergency, call <strong className="text-red-600">911</strong> immediately. 
              This platform provides support but is not a substitute for professional emergency services.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}