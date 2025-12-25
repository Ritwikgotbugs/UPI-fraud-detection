import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code,
  Database,
  Eye,
  FileText,
  Fingerprint,
  Globe,
  HelpCircle,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  PieChart,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import MobileNav from './MobileNav';
import SidebarContent from './SidebarContent';

export default function HelpCenter() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const sections = [
    { id: 'overview', title: 'Overview', icon: BookOpen },
    { id: 'ml-model', title: 'ML Model', icon: Brain },
    { id: 'features', title: '20 Risk Parameters', icon: Layers },
    { id: 'api', title: 'API Reference', icon: Code },
    { id: 'frontend', title: 'Frontend Features', icon: Smartphone },
    { id: 'security', title: 'Security', icon: ShieldCheck },
    { id: 'faq', title: 'FAQ', icon: HelpCircle }
  ];

  const riskParameters = [
    { name: 'Transaction Amount', description: 'Monitors the monetary value of transactions to detect unusually high or suspicious amounts.', icon: BarChart3, category: 'Financial' },
    { name: 'Transaction Frequency', description: 'Tracks how often a user makes transactions to identify burst attacks or velocity anomalies.', icon: Activity, category: 'Behavioral' },
    { name: 'Recipient Blacklist Status', description: 'Checks if the recipient UPI ID is on known fraud blacklists.', icon: Ban, category: 'Trust' },
    { name: 'Device Fingerprinting', description: 'Creates unique device signatures to detect new or suspicious devices.', icon: Fingerprint, category: 'Device' },
    { name: 'VPN/Proxy Usage', description: 'Detects if the transaction is being made through VPN or proxy services.', icon: Globe, category: 'Network' },
    { name: 'Behavioral Biometrics', description: 'Analyzes typing patterns, touch dynamics, and interaction behaviors.', icon: Users, category: 'Behavioral' },
    { name: 'Time Since Last Transaction', description: 'Measures the gap between transactions to detect unusual patterns.', icon: Clock, category: 'Temporal' },
    { name: 'Social Trust Score', description: 'Evaluates the trustworthiness based on social connections and history.', icon: UserCheck, category: 'Trust' },
    { name: 'Account Age', description: 'Considers how long the account has been active - newer accounts are higher risk.', icon: Clock, category: 'Account' },
    { name: 'High-Risk Transaction Times', description: 'Flags transactions made during unusual hours (late night/early morning).', icon: AlertTriangle, category: 'Temporal' },
    { name: 'Past Fraudulent Behavior Flags', description: 'Historical record of any previous fraud incidents or suspicious activities.', icon: FileText, category: 'History' },
    { name: 'Location-Inconsistent Transactions', description: 'Detects transactions from locations inconsistent with user history.', icon: MapPin, category: 'Location' },
    { name: 'Normalized Transaction Amount', description: 'Compares transaction amount to user\'s typical spending patterns.', icon: TrendingUp, category: 'Financial' },
    { name: 'Transaction Context Anomalies', description: 'Identifies unusual patterns in transaction context and metadata.', icon: Search, category: 'Context' },
    { name: 'Fraud Complaints Count', description: 'Number of fraud complaints filed against the account or recipient.', icon: MessageSquare, category: 'History' },
    { name: 'Merchant Category Mismatch', description: 'Detects when transaction type doesn\'t match the merchant category.', icon: Layers, category: 'Context' },
    { name: 'User Daily Limit Exceeded', description: 'Flags when users exceed their typical daily transaction limits.', icon: AlertTriangle, category: 'Financial' },
    { name: 'Recent High-Value Transaction Flags', description: 'Monitors for multiple high-value transactions in a short period.', icon: BarChart3, category: 'Financial' },
    { name: 'Recipient Verification Status', description: 'Checks if the recipient is verified, suspicious, or recently registered.', icon: CheckCircle2, category: 'Trust' },
    { name: 'Geo-Location Flags', description: 'Analyzes geographic patterns and flags high-risk or unusual locations.', icon: Globe, category: 'Location' }
  ];

  const frontendFeatures = [
    {
      title: 'Real-Time Dashboard',
      description: 'Monitor your account activity, balance, and recent transactions in real-time with intuitive visualizations.',
      icon: PieChart,
      capabilities: ['Live balance updates', 'Transaction history', 'Spending analytics', 'Quick actions']
    },
    {
      title: 'Send Money with AI Protection',
      description: 'Transfer funds securely with automatic fraud detection scanning every transaction.',
      icon: Shield,
      capabilities: ['UPI verification', 'Fraud risk assessment', 'Transaction blocking', 'Alert notifications']
    },
    {
      title: 'Admin Dashboard',
      description: 'Comprehensive admin panel for monitoring system-wide fraud patterns and managing rules.',
      icon: Settings,
      capabilities: ['System analytics', 'Rule management', 'User monitoring', 'Trend analysis']
    },
    {
      title: 'Transaction History',
      description: 'Detailed view of all your transactions with fraud analysis results and risk scores.',
      icon: FileText,
      capabilities: ['Filterable history', 'Risk indicators', 'Export options', 'Search functionality']
    },
    {
      title: 'Report Fraud',
      description: 'Easy-to-use interface for reporting suspicious transactions and flagging fraudulent accounts.',
      icon: AlertTriangle,
      capabilities: ['Quick reporting', 'Evidence upload', 'Status tracking', 'Community protection']
    },
    {
      title: 'Settings & Preferences',
      description: 'Customize your security preferences, notification settings, and account details.',
      icon: Settings,
      capabilities: ['Security settings', 'Notification preferences', 'Account management', 'Privacy controls']
    }
  ];

  const faqs = [
    {
      question: 'How accurate is the fraud detection system?',
      answer: 'Our Random Forest ML model achieves > 95% accuracy on test datasets. The model was trained on GAN-augmented data to handle class imbalance and improve detection of rare fraud patterns. We continuously update the model with new fraud patterns through our feedback loop system.'
    },
    {
      question: 'What happens when fraud is detected?',
      answer: 'When our system detects potential fraud (risk score > 70%), the transaction is automatically blocked. For medium-risk transactions (40-70%), additional verification is required. Users receive real-time alerts explaining why a transaction was flagged, along with specific risk factors.'
    },
    {
      question: 'How does the 20-parameter analysis work?',
      answer: 'Each transaction is analyzed across 20 distinct risk parameters including behavioral biometrics, device fingerprinting, geo-location analysis, and historical patterns. These features are fed into our ML model which outputs a fraud probability score. The system also provides explainable AI factors so users understand why a transaction was flagged.'
    },
    {
      question: 'Can I customize the fraud detection rules?',
      answer: 'Yes! The admin dashboard allows you to create custom rules based on amount thresholds, time windows, recipient characteristics, and more. You can also adjust the sensitivity of the risk score thresholds to balance security with user convenience.'
    },
    {
      question: 'How is my data protected?',
      answer: 'All data is encrypted in transit and at rest. We use Firebase Authentication for secure user management, and all API calls are authenticated. Personal data is never shared with third parties, and our fraud detection operates on anonymized transaction patterns.'
    },
    {
      question: 'What makes this different from traditional fraud detection?',
      answer: 'Traditional systems rely on static rules. Our AI-powered approach learns from patterns, adapts to new fraud techniques, and considers 20+ parameters simultaneously. The GAN-augmented training data helps us detect novel fraud patterns that rule-based systems would miss.'
    }
  ];

  const apiEndpoints = [
    { method: 'POST', endpoint: '/api/predict', description: 'Direct ML model prediction with raw features or transaction data' },
    { method: 'POST', endpoint: '/api/analyze', description: 'Full transaction analysis with all 20 features extracted' },
    { method: 'POST', endpoint: '/api/risk-score', description: 'Quick risk assessment without storing transaction' },
    { method: 'GET', endpoint: '/api/admin/dashboard', description: 'Comprehensive admin dashboard insights' },
    { method: 'POST', endpoint: '/api/feedback', description: 'Submit fraud/not-fraud feedback for model improvement' },
    { method: 'GET', endpoint: '/api/rules', description: 'Get all custom fraud detection rules' },
    { method: 'POST', endpoint: '/api/simulate', description: 'Simulate transactions with different scenarios' }
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navigation */}
        <MobileNav />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Mobile Section Selector */}
          <div className="lg:hidden mb-4">
            <select 
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-6">
            {/* Section Navigation - Desktop Only */}
            <div className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-6">
                <nav className="space-y-1">
              {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    <span className="font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              <div>
                <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200">
                  Documentation
                </Badge>
                <h1 className="text-2xl md:text-4xl font-bold text-slate-800 mb-4">Welcome to Fraudulent.ai</h1>
                <p className="text-slate-600 text-base md:text-lg leading-relaxed">
                  Fraudulent.ai is an advanced UPI fraud detection system powered by machine learning. 
                  Our platform analyzes 20+ risk parameters in real-time to protect digital payments 
                  from fraudulent activities.
                </p>
              </div>

              <Card className="bg-white border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-violet-600" />
                  How It Works
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { step: '01', title: 'Transaction Initiated', desc: 'User initiates a UPI payment' },
                    { step: '02', title: 'Feature Extraction', desc: '20 risk parameters analyzed' },
                    { step: '03', title: 'ML Prediction', desc: 'Random Forest model predicts risk' },
                    { step: '04', title: 'Action Taken', desc: 'Allow, verify, or block transaction' }
                  ].map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                        {item.step}
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-200 p-6">
                  <Target className="w-8 h-8 text-violet-600 mb-4" />
                  <h3 className="font-semibold text-slate-800 mb-2">95% Accuracy</h3>
                  <p className="text-sm text-slate-600">Industry-leading fraud detection accuracy powered by GAN-augmented training.</p>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 p-6">
                  <Zap className="w-8 h-8 text-emerald-600 mb-4" />
                  <h3 className="font-semibold text-slate-800 mb-2">&lt;2s Response</h3>
                  <p className="text-sm text-slate-600">Real-time fraud detection without impacting transaction speed.</p>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 p-6">
                  <Layers className="w-8 h-8 text-blue-600 mb-4" />
                  <h3 className="font-semibold text-slate-800 mb-2">20+ Parameters</h3>
                  <p className="text-sm text-slate-600">Comprehensive multi-dimensional risk analysis for every transaction.</p>
                </Card>
              </div>
            </div>
          )}

          {/* ML Model Section */}
          {activeSection === 'ml-model' && (
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
                  <Brain className="w-3 h-3 mr-1" />
                  Machine Learning
                </Badge>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">ML Model Architecture</h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Our fraud detection engine uses a Random Forest classifier trained on synthetic 
                  data generated using Generative Adversarial Networks (GANs) to handle class imbalance.
                </p>
              </div>

              <Card className="bg-white border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-6">Model Specifications</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Algorithm</span>
                      <span className="font-mono text-violet-600 font-medium">Random Forest Classifier</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Input Features</span>
                      <span className="font-mono text-violet-600 font-medium">22 (after encoding)</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Training Data</span>
                      <span className="font-mono text-violet-600 font-medium">GAN-Augmented Dataset</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Accuracy</span>
                      <span className="font-mono text-emerald-600 font-medium">95%</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Output</span>
                      <span className="font-mono text-violet-600 font-medium">Binary (Fraud/Not Fraud)</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Probability Score</span>
                      <span className="font-mono text-violet-600 font-medium">0.0 - 1.0</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">High Risk Threshold</span>
                      <span className="font-mono text-red-600 font-medium">&gt; 0.70</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-200">
                      <span className="text-slate-600">Medium Risk Threshold</span>
                      <span className="font-mono text-amber-600 font-medium">0.40 - 0.70</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-white border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">GAN Data Augmentation</h2>
                <p className="text-slate-600 mb-4">
                  Fraud detection suffers from severe class imbalance (fraud cases are rare). We use 
                  Generative Adversarial Networks to synthesize realistic fraud patterns, improving 
                  model performance on minority class detection.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-2">Generator Network</h4>
                    <p className="text-sm text-slate-600">Creates synthetic fraud transactions that match real fraud patterns.</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-2">Discriminator Network</h4>
                    <p className="text-sm text-slate-600">Learns to distinguish between real and synthetic data, improving quality.</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-2">Balanced Dataset</h4>
                    <p className="text-sm text-slate-600">Final training data has balanced fraud/non-fraud examples for better learning.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 20 Features Section */}
          {activeSection === 'features' && (
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                  <Layers className="w-3 h-3 mr-1" />
                  Risk Analysis
                </Badge>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">20 Risk Parameters</h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Every transaction is analyzed across 20 carefully selected features that capture 
                  financial, behavioral, temporal, and contextual risk signals.
                </p>
              </div>

              <div className="grid gap-4">
                {riskParameters.map((param, index) => (
                  <Card key={index} className="bg-white border-slate-200 p-4 hover:border-violet-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <param.icon className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-800">{param.name}</h3>
                          <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                            {param.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{param.description}</p>
                      </div>
                      <div className="text-slate-400 font-mono text-sm">#{String(index + 1).padStart(2, '0')}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* API Reference Section */}
          {activeSection === 'api' && (
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">
                  <Code className="w-3 h-3 mr-1" />
                  Developer Docs
                </Badge>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">API Reference</h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  RESTful API endpoints for integrating fraud detection into your applications.
                </p>
              </div>

              <Card className="bg-white border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Base URL</h2>
                <code className="block bg-slate-100 rounded-lg px-4 py-3 text-violet-600 font-mono border border-slate-200">
                  https://rxcq.pythonanywhere.com
                </code>
              </Card>

              <div className="space-y-4">
                {apiEndpoints.map((endpoint, index) => (
                  <Card key={index} className="bg-white border-slate-200 p-4 hover:border-violet-300 transition-colors">
                    <div className="flex items-center gap-4 mb-2">
                      <Badge className={`font-mono ${endpoint.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-slate-800 font-mono font-medium">{endpoint.endpoint}</code>
                    </div>
                    <p className="text-sm text-slate-600">{endpoint.description}</p>
                  </Card>
                ))}
              </div>

              <Card className="bg-white border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Example Request</h2>
                <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm">
                  <code className="text-slate-300">{`POST /api/predict
Content-Type: application/json

{
  "features": {
    "amount": 5000,
    "transaction_frequency": 3,
    "recipient_blacklist_status": 0,
    "vpn_proxy_usage": 0,
    "account_age": 365,
    "social_trust_score": 75
    // ... other features
  }
}`}</code>
                </pre>
              </Card>
            </div>
          )}

          {/* Frontend Features Section */}
          {activeSection === 'frontend' && (
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
                  <Smartphone className="w-3 h-3 mr-1" />
                  User Interface
                </Badge>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">Frontend Features</h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Modern, responsive interface built with React and Tailwind CSS, 
                  featuring real-time updates and intuitive fraud visualization.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {frontendFeatures.map((feature, index) => (
                  <Card key={index} className="bg-white border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all">
                    <feature.icon className="w-10 h-10 text-violet-600 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 text-sm mb-4">{feature.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {feature.capabilities.map((cap, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-slate-300 text-slate-600">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-white border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Tech Stack</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'React', desc: 'UI Framework' },
                    { name: 'Tailwind CSS', desc: 'Styling' },
                    { name: 'Firebase', desc: 'Auth & Database' },
                    { name: 'Vite', desc: 'Build Tool' },
                    { name: 'Flask', desc: 'Backend API' },
                    { name: 'scikit-learn', desc: 'ML Model' },
                    { name: 'NumPy', desc: 'Data Processing' },
                    { name: 'Lucide', desc: 'Icons' }
                  ].map((tech, index) => (
                    <div key={index} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                      <div className="font-semibold text-slate-800">{tech.name}</div>
                      <div className="text-xs text-slate-500">{tech.desc}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-red-100 text-red-700 border-red-200">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Security
                </Badge>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">Security & Privacy</h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Built with security-first principles to protect user data and ensure 
                  safe financial transactions.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Lock, title: 'End-to-End Encryption', desc: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256.' },
                  { icon: UserCheck, title: 'Firebase Authentication', desc: 'Secure user authentication with Google Sign-In and email/password options.' },
                  { icon: Shield, title: 'API Security', desc: 'All API endpoints are authenticated and rate-limited to prevent abuse.' },
                  { icon: Eye, title: 'Privacy First', desc: 'Fraud detection operates on anonymized patterns. Personal data is never shared.' },
                  { icon: Database, title: 'Secure Storage', desc: 'User data stored in Firebase with strict access rules and encryption.' },
                  { icon: Bell, title: 'Real-time Alerts', desc: 'Instant notifications for suspicious activities and security events.' }
                ].map((item, index) => (
                  <Card key={index} className="bg-white border-slate-200 p-6 hover:border-emerald-300 transition-colors">
                    <item.icon className="w-8 h-8 text-emerald-600 mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Section */}
          {activeSection === 'faq' && (
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Support
                </Badge>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Common questions about Fraudulent.ai and how our fraud detection system works.
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card 
                    key={index} 
                    className={`bg-white border-slate-200 overflow-hidden transition-all cursor-pointer ${expandedFaq === index ? 'border-violet-300 shadow-md' : 'hover:border-slate-300'}`}
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 pr-4">{faq.question}</h3>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`} />
                      </div>
                      {expandedFaq === index && (
                        <p className="text-slate-600 mt-4 leading-relaxed">{faq.answer}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>  </div>
</div>  );
}
