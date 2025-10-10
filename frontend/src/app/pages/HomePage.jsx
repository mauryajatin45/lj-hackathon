import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Image,
  FileText,
  Video,
  MessageSquare,
  Mic,
  ArrowRight,
  Check,
  Menu,
  X,
  Zap,
  Lock,
  Eye,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext.jsx';


function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Mail,
      title: 'Email Fraud Detection',
      desc: 'Identify phishing and scam emails in real-time with advanced pattern recognition.',
    },
    {
      icon: MessageSquare,
      title: 'SMS Analysis',
      desc: 'Detect spam or fraudulent text messages instantly using AI-powered classification.',
    },
    {
      icon: Image,
      title: 'Image Verification',
      desc: 'Scan and verify images for authenticity or manipulation with deep learning.',
    },
    {
      icon: Video,
      title: 'Video Integrity Check',
      desc: 'Detect tampering or AI-generated deepfakes in videos frame by frame.',
    },
    {
      icon: Mic,
      title: 'Audio Fraud Detection',
      desc: 'Analyze audio for impersonation or synthetic voice clues with precision.',
    },
    {
      icon: FileText,
      title: 'Document Analysis',
      desc: 'Check files and PDFs for malicious or altered content automatically.',
    },
  ];

  const stats = [
    { value: '99.8%', label: 'Detection Accuracy' },
    { value: '<100ms', label: 'Analysis Time' },
    { value: '10M+', label: 'Threats Blocked' },
    { value: '24/7', label: 'Protection' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200'
          : 'bg-white/80 backdrop-blur-md border-b border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Sentinel
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Features
              </a>
              <a
                href="#about"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Contact
              </a>
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <>
                  <button onClick={() => navigate('/app')} className="px-5 py-2 rounded-lg font-medium text-gray-700 hover:text-gray-900 transition-colors">
                    Dashboard
                  </button>
                  <button onClick={logout} className="px-5 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg hover:scale-105 transition-all">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="px-5 py-2 rounded-lg font-medium text-gray-700 hover:text-gray-900 transition-colors">
                    Login
                  </button>
                  <button onClick={() => navigate('/register')} className="px-5 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg hover:scale-105 transition-all">
                    Sign Up
                  </button>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-6 py-4 space-y-3">
              <a
                href="#features"
                className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#about"
                className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>
              <a
                href="#contact"
                className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <div className="pt-3 space-y-2">
                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full px-5 py-2 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors">
                  Login
                </button>
                <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full px-5 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg transition-all">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 mb-6 shadow-sm hover:shadow-md transition-shadow">
              <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Next-Gen AI Security Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in">
              Protect Your Digital World with{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  AI-Powered
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 6C50 0, 150 0, 200 6" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>{' '}
              Fraud Detection
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Detect and prevent fraud across emails, messages, media, and documents using
              advanced AI and real-time analysis. Safeguard your digital presence with
              enterprise-grade security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button className="group relative px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-2xl hover:scale-105 transition-all overflow-hidden">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <span className="relative flex items-center space-x-2">
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button className="group px-8 py-4 rounded-xl font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all shadow-sm hover:shadow-md">
                <span className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Watch Demo</span>
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Check className="w-4 h-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="w-4 h-4 text-green-600" />
                <span>Free 14-day trial</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
              {stats.map((stat, index) => (
                <div key={index} className="group text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 px-6 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Trusted by Industry Leaders
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-8 opacity-60">
                <div className="font-bold text-2xl text-gray-400">ACME</div>
                <div className="font-bold text-2xl text-gray-400">TechCorp</div>
                <div className="font-bold text-2xl text-gray-400">SecureNet</div>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Lock className="w-5 h-5 text-green-600 mr-1" />
                  <span className="text-2xl font-bold text-gray-900">SOC 2</span>
                </div>
                <p className="text-xs text-gray-600">Certified</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mr-1" />
                  <span className="text-2xl font-bold text-gray-900">GDPR</span>
                </div>
                <p className="text-xs text-gray-600">Compliant</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Comprehensive Fraud Detection
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced AI technology protecting every aspect of your digital communications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((item, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4">{item.desc}</p>
                      <div className="flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Learn more</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How Sentinel Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to comprehensive fraud protection
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/3 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-300"></div>

            {[
              {
                step: '01',
                icon: Clock,
                title: 'Upload & Scan',
                desc: 'Submit any content type - emails, images, videos, or documents for instant analysis.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'AI Analysis',
                desc: 'Our advanced AI models process and analyze your content in real-time with multi-layered detection.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Get Results',
                desc: 'Receive detailed fraud reports with confidence scores and actionable recommendations.',
              },
            ].map((step, index) => (
              <div key={index} className="relative bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all">
                <div className="absolute -top-4 left-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                  {step.step}
                </div>
                <div className="mt-6 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 rounded-3xl p-12 md:p-16 text-white overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>

            <div className="relative grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Why Choose Sentinel?
                </h2>
                <p className="text-xl text-blue-50 mb-10 leading-relaxed">
                  Enterprise-grade security powered by cutting-edge AI, designed to keep you
                  safe from evolving digital threats.
                </p>

                <div className="space-y-4">
                  {[
                    { text: 'Real-time threat detection with 99.8% accuracy', icon: Zap },
                    { text: 'Multi-modal analysis across text, images, video, and audio', icon: Eye },
                    { text: 'Advanced deep learning models trained on billions of samples', icon: TrendingUp },
                    { text: 'Seamless integration with your existing tools', icon: Check },
                    { text: 'Enterprise-grade privacy and data protection', icon: Lock },
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-3 group">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mt-0.5 group-hover:bg-white/30 transition-colors">
                        <benefit.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-lg text-blue-50">{benefit.text}</span>
                    </div>
                  ))}
                </div>

                <button className="mt-10 px-8 py-4 rounded-xl font-semibold bg-white text-blue-600 hover:shadow-2xl hover:scale-105 transition-all">
                  Start Protecting Today
                </button>
              </div>

              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-2xl transform rotate-3"></div>
                  <div className="relative bg-white/20 backdrop-blur-lg rounded-2xl p-8 border border-white/30">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                        <span className="text-white font-medium">Threats Blocked Today</span>
                        <span className="text-2xl font-bold text-white">1,247</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                        <span className="text-white font-medium">Average Response Time</span>
                        <span className="text-2xl font-bold text-white">87ms</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                        <span className="text-white font-medium">Detection Accuracy</span>
                        <span className="text-2xl font-bold text-white">99.8%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">About Sentinel</h2>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            Sentinel is a next-generation AI platform built to detect and prevent digital
            fraud in every form. From phishing emails to deepfake videos, we provide an
            automated, secure, and intelligent solution for individuals and businesses to
            stay safe in the online world.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            Our mission is to create a safer digital environment where trust and security
            are never compromised. Using state-of-the-art machine learning and neural
            networks, we analyze billions of data points to protect what matters most.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by Security Teams
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our customers have to say about Sentinel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Chen',
                role: 'Security Director',
                company: 'TechCorp',
                text: 'Sentinel has transformed how we handle security threats. The AI detection is incredibly accurate and saves us hours every day.',
              },
              {
                name: 'Michael Rodriguez',
                role: 'IT Manager',
                company: 'SecureNet',
                text: 'The multi-modal analysis is a game-changer. We can now detect sophisticated attacks that we would have missed before.',
              },
              {
                name: 'Emily Taylor',
                role: 'Chief Information Officer',
                company: 'ACME Inc',
                text: 'Best investment we have made in cybersecurity. The ROI was clear within the first month of implementation.',
              },
            ].map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 md:p-16 border border-gray-200">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Secure Your Digital Life?
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              Join thousands of users who trust Sentinel to protect their digital presence.
            </p>
            <button className="group px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-2xl hover:scale-105 transition-all inline-flex items-center space-x-2">
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required • Free 14-day trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                  <ShieldCheck className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white">Sentinel</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                AI-powered fraud detection protecting your digital world from evolving
                threats with enterprise-grade security.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#about" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-center">
            <p>© {new Date().getFullYear()} Sentinel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
