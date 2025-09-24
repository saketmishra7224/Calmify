import React, { useState, useEffect } from 'react';
import { Shield, Users, MessageCircle, Brain, Heart, ArrowRight, Clock, Lock, Phone, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NewHome() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI Mental Health Support",
      description: "24/7 AI chatbot that provides immediate crisis detection, personalized coping strategies, and guided support"
    },
    {
      icon: Users,
      title: "Peer Support Community",
      description: "Connect with trained peer volunteers who understand your experiences and provide empathetic support"
    },
    {
      icon: MessageCircle,
      title: "Professional Counseling",
      description: "Access licensed mental health professionals for comprehensive therapy and crisis intervention"
    },
    {
      icon: Shield,
      title: "Complete Privacy Protection",
      description: "Anonymous sessions with end-to-end encryption ensuring your identity and conversations remain confidential"
    }
  ];

  const stats = [
    { number: "24/7", label: "AI Support" },
    { number: "100%", label: "Anonymous" },
    { number: "Real-time", label: "Crisis Detection" },
    { number: "Secure", label: "Encrypted Chats" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white/90 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#2BD4BD] rounded-lg flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Calmify</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">How it Works</a>
              <a href="#support" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Support</a>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all hover:shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600 mb-8">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Trusted mental health support platform</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Your Mental Health,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2BD4BD] to-[#2BD4BD]">
                {' '}Supported
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              Anonymous, professional, and accessible mental health support available 24/7. 
              Connect with AI, peers, and licensed counselors in a safe, confidential environment.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-[#2BD4BD] text-white text-lg font-semibold rounded-xl hover:bg-[#25C1AB] transition-all hover:shadow-lg transform hover:scale-105 flex items-center space-x-2"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/crisis')}
                className="px-8 py-4 bg-red-50 border-2 border-red-200 text-red-600 text-lg font-semibold rounded-xl hover:bg-red-100 transition-all flex items-center space-x-2"
              >
                <Phone className="w-5 h-5" />
                <span>Crisis Support</span>
              </button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center bg-white rounded-2xl border border-gray-200 py-8 px-6 hover:shadow-lg transition-all">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-500 text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600 mb-6">
              <span>✨ Comprehensive Support</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need for Mental Wellness
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform combines cutting-edge AI technology with human expertise to provide 
              personalized, confidential mental health support tailored to your needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-xl hover:border-blue-300 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-[#2BD4BD] rounded-2xl flex items-center justify-center mb-6 group-hover:shadow-lg transition-all">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600 mb-6">
              <span>🚀 Simple Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Getting Support is Simple
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform guides you to the right level of support based on your needs, 
              whether you need immediate AI assistance, peer support, or professional counseling.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative">
                <div className="w-24 h-24 bg-[#2BD4BD] rounded-3xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white group-hover:shadow-xl transition-all">
                  1
                </div>
                {/* Connecting line */}
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gray-200 -z-10"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Anonymously</h3>
              <p className="text-gray-600 leading-relaxed">
                Begin with our AI chatbot that provides immediate support and assesses your needs while maintaining complete privacy.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative">
                <div className="w-24 h-24 bg-[#2BD4BD] rounded-3xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white group-hover:shadow-xl transition-all">
                  2
                </div>
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gray-200 -z-10"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Connected</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect with peer volunteers for empathetic support or licensed counselors for professional therapy and crisis intervention.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-24 h-24 bg-[#2BD4BD] rounded-3xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white group-hover:shadow-xl transition-all">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Continue Your Journey</h3>
              <p className="text-gray-600 leading-relaxed">
                Access ongoing support, meditation resources, assessments, and crisis intervention whenever you need it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 bg-[#2BD4BD]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full text-sm text-white mb-6">
                <Lock className="w-4 h-4" />
                <span>Military-grade encryption</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                Your Privacy is Our Promise
              </h2>
              <p className="text-xl text-white mb-8 leading-relaxed">
                Join thousands who have found support, guidance, and healing through our platform. 
                Your mental health and privacy are our top priorities.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-white">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-[#2BD4BD] rounded-full"></div>
                  </div>
                  <span>End-to-end encrypted conversations</span>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-[#2BD4BD] rounded-full"></div>
                  </div>
                  <span>HIPAA compliant security standards</span>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-[#2BD4BD] rounded-full"></div>
                  </div>
                  <span>Anonymous sessions available</span>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-[#2BD4BD] rounded-full"></div>
                  </div>
                  <span>Crisis detection and intervention</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-10 shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#2BD4BD] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Begin?</h3>
                <p className="text-gray-600">
                  Take the first step towards better mental health today.
                </p>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => navigate('/register')}
                  className="w-full px-8 py-4 bg-[#2BD4BD] text-white text-lg font-semibold rounded-xl hover:bg-[#25C1AB] transition-all hover:shadow-lg"
                >
                  Start Free Assessment
                </button>
                <button 
                  onClick={() => navigate('/crisis')}
                  className="w-full px-8 py-4 bg-red-50 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all"
                >
                  Emergency Support
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-6 text-center">
                ✨ Completely free • 🔒 100% confidential • ⚡ Available 24/7
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-[#2BD4BD] rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Calmify</span>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Professional mental health support for everyone. 
                Your wellbeing matters, and we're here to help every step of the way.
              </p>
              <div className="flex items-center space-x-2 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>24/7 Crisis Support Available</span>
              </div>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Platform</h4>
              <ul className="space-y-3 text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">AI Chatbot</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Peer Support</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Counselling</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Crisis Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Meditation Zone</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Self-Help Guides</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Mental Health Articles</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Support</h4>
              <ul className="space-y-3 text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Accessibility</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-200">
            <div className="text-gray-500 text-sm mb-4 md:mb-0">
              © 2025 Calmify. Dedicated to mental health and wellbeing for everyone.
            </div>
            <div className="flex items-center space-x-2 text-gray-500 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your data is protected and never shared</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}