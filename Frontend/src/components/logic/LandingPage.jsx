import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Eye,
  Github,
  Globe,
  Linkedin,
  Lock,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signin');
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Detection',
      description: 'Advanced Random Forest ML model trained on GAN-augmented datasets for superior fraud detection accuracy.',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      icon: Zap,
      title: 'Real-Time Analysis',
      description: '20+ risk parameters analyzed instantly including behavioral biometrics and device fingerprinting.',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      icon: Shield,
      title: 'Multi-Layer Security',
      description: 'Comprehensive protection with blacklist management, geo-location analysis, and VPN detection.',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Activity,
      title: 'Behavioral Analysis',
      description: 'Monitors transaction patterns, velocity anomalies, and user behavior for proactive fraud prevention.',
      gradient: 'from-blue-500 to-cyan-600'
    }
  ];

  const stats = [
    { value: '>95%', label: 'Detection Accuracy', icon: Target },
    { value: '<2s', label: 'Response Time', icon: Zap },
    { value: '20', label: 'Risk Parameters', icon: BarChart3 },
    { value: '24/7', label: 'Active Monitoring', icon: Eye }
  ];

  const founders = [
    {
      name: 'Ritwik Sharma',
      role: 'Software Developer',
      image: '/assets/ritwik.png',
      bio: 'Full-stack developer passionate about AI/ML and building secure financial systems.',
      linkedin: 'https://linkedin.com/in/ritwik-sharma-8714b4221/',
      github: 'https://github.com/Ritwikgotbugs'
    },
    {
      name: 'Samyak Tripathi',
      role: 'Decision Analyst Associate',
      image: '/assets/samyak.png',
      bio: 'Decision analyst focused on developing intelligent fraud detection algorithms and data-driven solutions.',
      linkedin: 'https://www.linkedin.com/in/samyak-tripathi-97bab3251/',
      github: 'https://github.com/sammy-314'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50" />
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.08), transparent 40%)`
          }}
        />
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-300/15 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-4 md:px-6 py-3 md:py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Fraudulent.ai
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
              Features
            </button>
            <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
              How It Works
            </button>
            <button onClick={() => document.getElementById('founders').scrollIntoView({ behavior: 'smooth' })} className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
              Team
            </button>
            {/* <button onClick={() => document.getElementById('faq').scrollIntoView({ behavior: 'smooth' })} className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
              FAQ
            </button> */}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <Button 
                onClick={() => navigate('/dashboard')}
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Go</span>
                <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/signin')}
                  className="text-slate-700 hover:text-violet-600 hover:bg-violet-50 hidden sm:inline-flex"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={handleGetStarted}
                  size="sm"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25"
                >
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                  <Sparkles className="w-4 h-4 ml-1 md:ml-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Combined Hero, Stats & Features Section */}
      <section id="features" className="relative z-10 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-start">
            
            {/* Left Column - Expanded Hero (swapped) */}
            <div className="space-y-4 md:space-y-6">
              <Badge className="mb-3 bg-violet-100 text-violet-700 border-violet-200 text-xs md:text-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered UPI Fraud Detection
              </Badge>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
                <span className="block text-slate-800">Protect Every</span>
                <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">Transaction</span>
              </h1>

              <p className="text-base md:text-lg text-slate-700 mb-6 max-w-xl">
                Advanced machine learning meets real-time fraud prevention. Our AI analyzes 20+ risk parameters to protect UPI transactions with unprecedented accuracy.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button 
                  size="lg"
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-xl shadow-violet-500/25 px-6 py-3"
                >
                  Get Started Free
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                  className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 px-6 py-3"
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Right Column - Stats on top + Params below (swapped) */}
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {stats.map((stat, index) => (
                  <Card key={index} className="bg-white/95 border-slate-200 p-4 text-center group hover:border-violet-300 hover:shadow-lg transition-all duration-300">
                    <stat.icon className="w-5 h-5 text-violet-600 mx-auto mb-2" />
                    <div className="text-lg md:text-xl font-bold text-slate-800">{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { icon: Lock, text: 'End-to-end encryption' },
                  { icon: Globe, text: 'Geo-location analysis' },
                  { icon: Users, text: 'Behavioral profiling' },
                  { icon: TrendingUp, text: 'Adaptive learning' },
                  { icon: CheckCircle2, text: 'Blacklist management' },
                  { icon: Eye, text: 'VPN/Proxy detection' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-slate-600 p-3 bg-white/70 border border-slate-100 rounded-lg">
                    <div className="w-8 h-8 rounded bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 px-4 md:px-6 py-6 md:py-8 bg-gradient-to-b from-white/50 to-slate-50/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4 md:mb-6">
            <Badge className="mb-2 md:mb-3 bg-amber-100 text-amber-700 border-amber-200 text-xs md:text-sm">
              <Workflow className="w-3 h-3 mr-1" />
              Process
            </Badge>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { step: '01', title: 'Transaction Initiated', desc: 'User initiates a UPI payment', color: 'from-violet-500 to-indigo-600' },
              { step: '02', title: 'Feature Extraction', desc: '20 risk parameters analyzed', color: 'from-emerald-500 to-teal-600' },
              { step: '03', title: 'ML Prediction', desc: 'Random Forest model predicts risk', color: 'from-amber-500 to-orange-600' },
              { step: '04', title: 'Action Taken', desc: 'Allow, verify, or block transaction', color: 'from-blue-500 to-cyan-600' }
            ].map((item, index) => (
              <Card key={index} className="bg-white/90 border-slate-200 p-3 md:p-4 text-center hover:shadow-lg transition-all">
                <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3 text-xs md:text-sm font-bold text-white shadow-md`}>
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-800 text-xs md:text-sm mb-1">{item.title}</h3>
                <p className="text-[10px] md:text-xs text-slate-500 leading-snug">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {/* <section id="faq" className="relative z-10 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <Badge className="mb-3 bg-rose-100 text-rose-700 border-rose-200">
              <HelpCircle className="w-3 h-3 mr-1" />
              FAQ
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                question: 'How accurate is the fraud detection system?',
                answer: 'Our Random Forest ML model achieves > 95% accuracy. The model was trained on GAN-augmented data to handle class imbalance and improve detection of rare fraud patterns.'
              },
              {
                question: 'What happens when fraud is detected?',
                answer: 'When potential fraud is detected (risk score > 70%), the transaction is automatically blocked. For medium-risk transactions (40-70%), additional verification is required.'
              },
              {
                question: 'How does the 20-parameter analysis work?',
                answer: 'Each transaction is analyzed across 20 distinct risk parameters including behavioral biometrics, device fingerprinting, geo-location analysis, and historical patterns.'
              },
              {
                question: 'How is my data protected?',
                answer: 'All data is encrypted in transit and at rest. We use Firebase Authentication for secure user management, and personal data is never shared with third parties.'
              }
            ].map((faq, index) => (
              <Card key={index} className="bg-white border-slate-200 overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-800 text-sm">{faq.question}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Founders Section */}
      <section id="founders" className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <Badge className="mb-3 bg-blue-100 text-blue-700 border-blue-200">
              <Users className="w-3 h-3 mr-1" />
              Meet The Team
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Our Founders
              </span>
            </h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto">
              Passionate developers committed to making digital payments safer through innovative AI solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {founders.map((founder, index) => (
              <Card 
                key={index}
                className="bg-white border-slate-200 overflow-hidden group hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-500"
              >
                <div className={`relative h-52 bg-gradient-to-br ${index === 0 ? 'from-violet-100 to-indigo-100' : 'from-blue-100 to-cyan-100'} overflow-hidden`}>
                  {/* Profile Image */}
                  <img 
                    src={founder.image} 
                    alt={founder.name}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${index === 0 ? 'from-violet-900/20 to-transparent' : 'from-blue-900/20 to-transparent'}`} />
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-20 h-20 bg-white/30 rounded-full blur-xl" />
                  <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/30 rounded-full blur-xl" />
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-0.5">{founder.name}</h3>
                  <p className={`text-xs font-medium mb-2 ${index === 0 ? 'text-violet-600' : 'text-blue-600'}`}>
                    {founder.role}
                  </p>
                  <p className="text-slate-600 text-xs leading-relaxed mb-3">
                    {founder.bio}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open(founder.github, '_blank')}
                      className="border-slate-300 text-slate-600 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      GitHub
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open(founder.linkedin, '_blank')}
                      className="border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                    >
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* <section className="relative z-10 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 border-0 p-6 text-center relative overflow-hidden shadow-2xl shadow-violet-500/25">
            <div className="absolute inset-0 opacity-10">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '32px 32px'
                }}
              />
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-3 ring-2 ring-white/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Ready to Secure Your Transactions?
              </h2>
              <p className="text-white/80 text-sm mb-4 max-w-xl mx-auto">
                Join thousands of users who trust Fraudulent.ai for their UPI fraud protection needs.
              </p>
              <Button 
                size="default"
                onClick={handleGetStarted}
                className="bg-white text-violet-600 hover:bg-slate-100 border-0 shadow-xl px-6 font-semibold"
              >
                Start Protecting Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 bg-white/50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-600" />
            <span className="text-slate-600 text-sm">© 2025 Fraudulent.ai. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => document.getElementById('faq').scrollIntoView({ behavior: 'smooth' })} className="text-slate-500 hover:text-violet-600 transition-colors text-xs font-medium">
              FAQ
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 text-xs">Built with ❤️ by Ritwik & Samyak</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
