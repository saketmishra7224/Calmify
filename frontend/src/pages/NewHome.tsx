import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, MessageCircle, Brain, Heart, ArrowRight, Clock, Lock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ──────────────────────────────────────────────────────────────
   Intersection-observer hook for gentle scroll-triggered fades
   ────────────────────────────────────────────────────────────── */
function useFadeInOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ──────────────────────────────────────────────────────────────
   Design tokens used inline (Tailwind arbitrary values)
   ────────────────────────────────────────────────────────────── */
const sage   = '#A398C9';
const dusty  = '#7A9BB0';
const cream  = '#FAF7F2';
const warmGray = '#4A4A4A';
const coral   = '#E08E6D';
const coralHover = '#D57A57';

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

  // Scroll-triggered sections
  const features_fade = useFadeInOnScroll();
  const howItWorks_fade = useFadeInOnScroll();
  const trust_fade = useFadeInOnScroll();

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
    <div className="min-h-screen" style={{ backgroundColor: cream, color: warmGray }}>

      {/* ───────── Navigation ───────── */}
      <nav
        className={`fixed w-full z-50 transition-all duration-500 ease-out ${
          isScrolled
            ? 'shadow-md backdrop-blur-xl'
            : 'backdrop-blur-md'
        }`}
        style={{
          backgroundColor: isScrolled ? 'rgba(250,247,242,0.92)' : 'rgba(250,247,242,0.8)',
          borderBottom: isScrolled ? '1px solid rgba(143,174,155,0.15)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/calmifylogo.png" alt="Calmify Logo" className="h-8 w-auto object-contain" />
              <span className="text-xl font-heading font-bold" style={{ color: '#3A3A3A' }}>
                Calmify
              </span>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'How it Works', 'Support'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm font-medium transition-colors duration-300 hover:opacity-100"
                  style={{ color: warmGray, opacity: 0.7 }}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Auth buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 text-sm font-medium transition-colors duration-300 rounded-full"
                style={{ color: warmGray }}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2.5 text-sm font-semibold text-white rounded-full transition-all duration-300 hover:shadow-lg active:scale-[0.97]"
                style={{ backgroundColor: coral }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = coralHover}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = coral}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ───────── Hero Section ───────── */}
      <section className="min-h-screen px-6 relative overflow-hidden flex flex-col justify-center">
        {/* Soft organic background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.12] animate-gentle-float"
            style={{ backgroundColor: sage }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full opacity-[0.08]"
            style={{ backgroundColor: dusty, animationDelay: '3s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ backgroundColor: coral }}
          />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10 w-full pt-28 pb-12 flex-1 flex flex-col justify-center">
          <div className="max-w-4xl mx-auto">
            {/* Headline */}
            <h1
              className="text-5xl md:text-7xl font-heading font-extrabold mb-8 leading-[1.1] animate-fade-in-up"
              style={{ color: '#3A3A3A', animationDelay: '0.15s' }}
            >
              Your Mental Health,
              <span style={{ color: sage }}> Supported</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl mb-14 leading-relaxed max-w-3xl mx-auto animate-fade-in-up"
              style={{ color: '#6B6B6B', animationDelay: '0.3s', lineHeight: '1.8' }}
            >
              Anonymous, professional, and accessible mental health support available 24/7.
              Connect with AI, peers, and licensed counselors in a safe, confidential environment.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-5 animate-fade-in-up"
              style={{ animationDelay: '0.45s' }}
            >
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 text-white text-base font-semibold rounded-full transition-all duration-300 hover:shadow-xl active:scale-[0.97] flex items-center space-x-2"
                style={{ backgroundColor: coral }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = coralHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = coral; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/crisis')}
                className="px-8 py-4 text-base font-semibold rounded-full transition-all duration-300 flex items-center space-x-2"
                style={{
                  backgroundColor: 'rgba(220,78,65,0.06)',
                  border: '2px solid rgba(220,78,65,0.2)',
                  color: '#C0554A',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220,78,65,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(220,78,65,0.06)'}
              >
                <Phone className="w-5 h-5" />
                <span>Crisis Support</span>
              </button>
            </div>
          </div>

          {/* Stats — anchored near the bottom of the viewport */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-auto pt-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center rounded-2xl py-8 px-6 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 animate-fade-in-up"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(143,174,155,0.15)',
                  backdropFilter: 'blur(10px)',
                  animationDelay: `${0.6 + index * 0.1}s`,
                }}
              >
                <div className="text-3xl md:text-4xl font-heading font-extrabold mb-2" style={{ color: sage }}>
                  {stat.number}
                </div>
                <div className="text-xs uppercase tracking-widest font-medium" style={{ color: '#8A8A8A' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Features Section ───────── */}
      <section id="features" className="py-24 px-6" ref={features_fade.ref}>
        <div
          className={`max-w-7xl mx-auto transition-all duration-1000 ease-out ${
            features_fade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Section header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6" style={{ color: '#3A3A3A' }}>
              Everything You Need for Mental Wellness
            </h2>
            <p className="text-lg max-w-3xl mx-auto" style={{ color: '#6B6B6B', lineHeight: '1.8' }}>
              Our platform combines cutting-edge AI technology with human expertise to provide
              personalized, confidential mental health support tailored to your needs.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-7">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-3xl p-8 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(143,174,155,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Icon container */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:shadow-md"
                  style={{ backgroundColor: `${sage}20` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: sage }} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-heading font-bold mb-3" style={{ color: '#3A3A3A' }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6B6B', lineHeight: '1.7' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── How It Works Section ───────── */}
      <section
        id="how-it-works"
        className="py-24 px-6"
        style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
        ref={howItWorks_fade.ref}
      >
        <div
          className={`max-w-7xl mx-auto transition-all duration-1000 ease-out ${
            howItWorks_fade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6" style={{ color: '#3A3A3A' }}>
              Getting Support is Simple
            </h2>
            <p className="text-lg max-w-3xl mx-auto" style={{ color: '#6B6B6B', lineHeight: '1.8' }}>
              Our platform guides you to the right level of support based on your needs,
              whether you need immediate AI assistance, peer support, or professional counseling.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {[
              {
                num: '1',
                title: 'Start Anonymously',
                desc: 'Begin with our AI chatbot that provides immediate support and assesses your needs while maintaining complete privacy.',
              },
              {
                num: '2',
                title: 'Get Connected',
                desc: 'Connect with peer volunteers for empathetic support or licensed counselors for professional therapy and crisis intervention.',
              },
              {
                num: '3',
                title: 'Continue Your Journey',
                desc: 'Access ongoing support, meditation resources, assessments, and crisis intervention whenever you need it.',
              },
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-8">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-2xl font-heading font-extrabold text-white transition-all duration-500 group-hover:shadow-lg group-hover:-translate-y-1"
                    style={{ backgroundColor: sage }}
                  >
                    {step.num}
                  </div>
                  {/* Connecting line */}
                  {index < 2 && (
                    <div
                      className="hidden md:block absolute top-10 left-[calc(50%+48px)] h-[2px]"
                      style={{
                        width: 'calc(100% - 48px)',
                        background: `linear-gradient(to right, ${sage}40, ${sage}10)`,
                      }}
                    />
                  )}
                </div>
                <h3 className="text-xl font-heading font-bold mb-4" style={{ color: '#3A3A3A' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6B6B', lineHeight: '1.7' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Trust / CTA Section ───────── */}
      <section
        className="py-24 px-6 relative overflow-hidden"
        style={{ backgroundColor: sage }}
        ref={trust_fade.ref}
      >
        {/* Subtle organic shapes */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-20 -right-20 w-[350px] h-[350px] rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-[280px] h-[280px] rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
          />
        </div>

        <div
          className={`max-w-7xl mx-auto relative z-10 transition-all duration-1000 ease-out ${
            trust_fade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left column — trust points */}
            <div>
              <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-8 leading-tight">
                Your Privacy is Our Promise
              </h2>
              <p className="text-lg text-white/85 mb-10" style={{ lineHeight: '1.8' }}>
                Join thousands who have found support, guidance, and healing through our platform.
                Your mental health and privacy are our top priorities.
              </p>
              <div className="space-y-5">
                {[
                  'End-to-end encrypted conversations',
                  'HIPAA compliant security standards',
                  'Anonymous sessions available',
                  'Crisis detection and intervention',
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-3 text-white/90">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — CTA card */}
            <div
              className="rounded-3xl p-10 shadow-2xl"
              style={{ backgroundColor: cream }}
            >
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: `${sage}20` }}
                >
                  <Heart className="w-8 h-8" style={{ color: sage }} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-2" style={{ color: '#3A3A3A' }}>
                  Ready to Begin?
                </h3>
                <p className="text-sm" style={{ color: '#6B6B6B' }}>
                  Take the first step towards better mental health today.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full px-8 py-4 text-white text-base font-semibold rounded-full transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: coral }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = coralHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = coral}
                >
                  Start Free Assessment
                </button>
                <button
                  onClick={() => navigate('/crisis')}
                  className="w-full px-8 py-4 font-semibold rounded-full transition-all duration-300 active:scale-[0.98]"
                  style={{
                    backgroundColor: 'rgba(220,78,65,0.06)',
                    border: '2px solid rgba(220,78,65,0.2)',
                    color: '#C0554A',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220,78,65,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(220,78,65,0.06)'}
                >
                  Emergency Support
                </button>
              </div>

              <p className="text-xs mt-6 text-center" style={{ color: '#8A8A8A' }}>
                ✨ Completely free • 🔒 100% confidential • ⚡ Available 24/7
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer
        className="pt-20 pb-10 px-6"
        style={{ backgroundColor: cream, borderTop: `1px solid rgba(143,174,155,0.12)` }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Brand + tagline — centered, breathing room */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: sage }}
              >
                <Heart className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-heading font-bold" style={{ color: '#3A3A3A' }}>
                Calmify
              </span>
            </div>
            <p className="text-sm max-w-md mx-auto" style={{ color: '#8A8A8A', lineHeight: '1.7' }}>
              Professional mental health support for everyone.
              Your wellbeing matters.
            </p>
          </div>

          {/* Link groups — horizontal, spacious */}
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 mb-16">
            {[
              {
                title: 'Platform',
                links: ['AI Chatbot', 'Peer Support', 'Counselling', 'Crisis Support'],
              },
              {
                title: 'Resources',
                links: ['Meditation Zone', 'Self-Help Guides', 'Articles', 'FAQ'],
              },
              {
                title: 'Support',
                links: ['Contact Us', 'Privacy Policy', 'Terms', 'Accessibility'],
              },
            ].map((col) => (
              <div key={col.title} className="min-w-[140px]">
                <h4 className="text-xs font-heading font-bold uppercase tracking-wider mb-4" style={{ color: '#3A3A3A' }}>
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm transition-colors duration-300"
                        style={{ color: '#8A8A8A' }}
                        onMouseEnter={e => e.currentTarget.style.color = sage}
                        onMouseLeave={e => e.currentTarget.style.color = '#8A8A8A'}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom strip — minimal */}
          <div
            className="flex flex-col sm:flex-row justify-between items-center pt-6 gap-3"
            style={{ borderTop: '1px solid rgba(143,174,155,0.1)' }}
          >
            <span className="text-xs" style={{ color: '#ACACAC' }}>
              © 2025 Calmify
            </span>
            <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#ACACAC' }}>
              <Lock className="w-3 h-3" strokeWidth={1.5} />
              <span>Your data is protected and never shared</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}