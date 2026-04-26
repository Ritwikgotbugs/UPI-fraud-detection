import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import PredictForm from '../PredictForm';
import AdminDashboard from './components/logic/AdminDashboard';
import RiskEvents from './components/logic/admin/RiskEvents';
import Devices from './components/logic/admin/Devices';
import Customers from './components/logic/admin/Customers';
import AnalyticsPage from './components/logic/admin/Analytics';
import Reports from './components/logic/admin/Reports';
import MetricWeights from './components/logic/admin/MetricWeights';
import ScoringMetrics from './components/logic/admin/ScoringMetrics';
import BehavioralLearning from './components/logic/admin/BehavioralLearning';
import Alerts from './components/logic/admin/Alerts';
import RiskHeatmap from './components/logic/admin/RiskHeatmap';
import ComplaintsHeatmap from './components/logic/admin/ComplaintsHeatmap';
import IntelligencePage from './components/logic/admin/IntelligencePage';
import ReinforcementPage from './components/logic/admin/ReinforcementPage';
import LiveTransactions from './components/logic/admin/LiveTransactions';
import ROIDashboard from './components/logic/admin/ROIDashboard';
import CaseManagement from './components/logic/admin/CaseManagement';
import AuditTrail from './components/logic/admin/AuditTrail';
import AttackSimulator from './components/logic/admin/AttackSimulator';
import NetworkGraph from './components/logic/admin/NetworkGraph';
import BeforeAfter from './components/logic/admin/BeforeAfter';
import Dashboard from './components/logic/Dashboard';
import HelpCenter from './components/logic/HelpCenter';
import Homepage from './components/logic/homepage';
import LandingPage from './components/logic/LandingPage';
import NotFound from './components/logic/NotFound';
import Recent from './components/logic/Recent';
import ReportFraud from './components/logic/ReportFraud';
import Settings from './components/logic/Settings';
import SignIn from './components/logic/SignIn';
import { AuthProvider, useAuth } from './context/AuthContext';

const UserRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (isAdmin) return <Navigate to="/admin/overview" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const RouteTitleUpdater = () => {
  const location = useLocation();
  useEffect(() => {
    const titles = {
      '/': 'Fraudulent.ai - Home',
      '/dashboard': 'Fraudulent.ai - Dashboard',
      '/admin/overview': 'Fraudulent.ai - Admin Overview',
      '/admin/rules': 'Fraudulent.ai - Admin Rules',
      '/admin/simulation': 'Fraudulent.ai - Admin Simulation',
      '/admin/alerts': 'Fraudulent.ai - Admin Alerts',
      '/admin/settings': 'Fraudulent.ai - Admin Settings',
      '/admin/risk-events': 'Fraudulent.ai - Risk Events',
      '/admin/devices': 'Fraudulent.ai - Devices',
      '/admin/customers': 'Fraudulent.ai - Customers',
      '/admin/analytics': 'Fraudulent.ai - Analytics',
      '/admin/reports': 'Fraudulent.ai - Reports',
      '/admin/metric-weights': 'Fraudulent.ai - Metric Weights',
      '/admin/scoring-metrics': 'Fraudulent.ai - Scoring Metrics',
      '/admin/behavioral': 'Fraudulent.ai - Behavioral Learning',
      '/admin/risk-heatmap': 'Fraudulent.ai - India Risk Heatmap',
      '/admin/complaints-heatmap': 'Fraudulent.ai - Complaints Heatmap',
      '/admin/intelligence': 'Fraudulent.ai - Threat Intelligence',
      '/admin/reinforcement': 'Fraudulent.ai - Reinforcement Learning',
      '/settings': 'Fraudulent.ai - Settings',
      '/report-fraud': 'Fraudulent.ai - Report Fraud',
      '/help-support': 'Fraudulent.ai - Help & Support',
    };
    document.title = titles[location.pathname] || 'Fraudulent.ai';
  }, [location]);
  return null;
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-slate-800">Loading Fraudulent.ai...</h2>
      <p className="text-slate-500 mt-2">Please wait while we set things up</p>
    </div>
  </div>
);

const AppContent = () => {
  const { loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;

  const pt = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' } }
  };

  return (
    <>
      <RouteTitleUpdater />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<motion.div {...pt}><LandingPage /></motion.div>} />
          {/* User Routes */}
          <Route path="/dashboard" element={<motion.div {...pt}><UserRoute><Dashboard /></UserRoute></motion.div>} />
          <Route path="/send-money" element={<motion.div {...pt}><UserRoute><Homepage /></UserRoute></motion.div>} />
          <Route path="/transactions" element={<motion.div {...pt}><UserRoute><Recent /></UserRoute></motion.div>} />
          <Route path="/report-fraud" element={<motion.div {...pt}><UserRoute><ReportFraud /></UserRoute></motion.div>} />
          <Route path="/statements" element={<motion.div {...pt}><UserRoute><Homepage /></UserRoute></motion.div>} />
          <Route path="/beneficiaries" element={<motion.div {...pt}><UserRoute><Homepage /></UserRoute></motion.div>} />
          <Route path="/settings" element={<motion.div {...pt}><UserRoute><Settings /></UserRoute></motion.div>} />
          <Route path="/help-support" element={<motion.div {...pt}><UserRoute><HelpCenter /></UserRoute></motion.div>} />
          {/* Admin Routes - existing */}
          <Route path="/admin" element={<motion.div {...pt}><AdminRoute><Navigate to="/admin/overview" replace /></AdminRoute></motion.div>} />
          <Route path="/admin/overview" element={<motion.div {...pt}><AdminRoute><AdminDashboard tab="overview" /></AdminRoute></motion.div>} />
          <Route path="/admin/rules" element={<motion.div {...pt}><AdminRoute><AdminDashboard tab="rules" /></AdminRoute></motion.div>} />
          <Route path="/admin/simulation" element={<motion.div {...pt}><AdminRoute><AdminDashboard tab="simulation" /></AdminRoute></motion.div>} />
          <Route path="/admin/alerts" element={<motion.div {...pt}><AdminRoute><Alerts /></AdminRoute></motion.div>} />
          <Route path="/admin/settings" element={<motion.div {...pt}><AdminRoute><AdminDashboard tab="settings" /></AdminRoute></motion.div>} />
          <Route path="/admin/risk-events" element={<motion.div {...pt}><AdminRoute><RiskEvents /></AdminRoute></motion.div>} />
          <Route path="/admin/devices" element={<motion.div {...pt}><AdminRoute><Devices /></AdminRoute></motion.div>} />
          <Route path="/admin/customers" element={<motion.div {...pt}><AdminRoute><Customers /></AdminRoute></motion.div>} />
          <Route path="/admin/analytics" element={<motion.div {...pt}><AdminRoute><AnalyticsPage /></AdminRoute></motion.div>} />
          <Route path="/admin/reports" element={<motion.div {...pt}><AdminRoute><Reports /></AdminRoute></motion.div>} />
          <Route path="/admin/metric-weights" element={<motion.div {...pt}><AdminRoute><MetricWeights /></AdminRoute></motion.div>} />
          <Route path="/admin/scoring-metrics" element={<motion.div {...pt}><AdminRoute><ScoringMetrics /></AdminRoute></motion.div>} />
          <Route path="/admin/behavioral" element={<motion.div {...pt}><AdminRoute><BehavioralLearning /></AdminRoute></motion.div>} />
          {/* Admin Routes - NEW 4 pages */}
          <Route path="/admin/risk-heatmap" element={<motion.div {...pt}><AdminRoute><RiskHeatmap /></AdminRoute></motion.div>} />
          <Route path="/admin/complaints-heatmap" element={<motion.div {...pt}><AdminRoute><ComplaintsHeatmap /></AdminRoute></motion.div>} />
          <Route path="/admin/intelligence" element={<motion.div {...pt}><AdminRoute><IntelligencePage /></AdminRoute></motion.div>} />
          <Route path="/admin/reinforcement" element={<motion.div {...pt}><AdminRoute><ReinforcementPage /></AdminRoute></motion.div>} />
          <Route path="/admin/live" element={<motion.div {...pt}><AdminRoute><LiveTransactions /></AdminRoute></motion.div>} />
          <Route path="/admin/roi" element={<motion.div {...pt}><AdminRoute><ROIDashboard /></AdminRoute></motion.div>} />
          <Route path="/admin/cases" element={<motion.div {...pt}><AdminRoute><CaseManagement /></AdminRoute></motion.div>} />
          <Route path="/admin/audit" element={<motion.div {...pt}><AdminRoute><AuditTrail /></AdminRoute></motion.div>} />
          <Route path="/admin/attack-sim" element={<motion.div {...pt}><AdminRoute><AttackSimulator /></AdminRoute></motion.div>} />
          <Route path="/admin/network" element={<motion.div {...pt}><AdminRoute><NetworkGraph /></AdminRoute></motion.div>} />
          <Route path="/admin/before-after" element={<motion.div {...pt}><AdminRoute><BeforeAfter /></AdminRoute></motion.div>} />
          {/* Common */}
          <Route path="/signin" element={<motion.div {...pt}><SignIn /></motion.div>} />
          <Route path="/predict" element={<motion.div {...pt}><PredictForm /></motion.div>} />
          <Route path="*" element={<motion.div {...pt}><NotFound /></motion.div>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <Router>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </Router>
);

export default App;
