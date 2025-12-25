import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import PredictForm from '../PredictForm';
import AdminDashboard from './components/logic/AdminDashboard';
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


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; 
  }
  
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  return children;
};

const RouteTitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const routeToTitle = {
      '/': 'Fraudulent.ai - Home',
      '/dashboard': 'Fraudulent.ai - Dashboard',
      '/send-money': 'Fraudulent.ai - Send Money',
      '/transactions': 'Fraudulent.ai - Transactions',
      '/admin': 'Fraudulent.ai - Admin Dashboard',
      '/settings': 'Fraudulent.ai - Settings',
      '/report-fraud': 'Fraudulent.ai - Report Fraud',
      '/help-support': 'Fraudulent.ai - Help & Support',
    };

    const title = routeToTitle[location.pathname] || 'Fraudulent.ai';
    document.title = title;
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

  if (loading) {
    return <LoadingScreen />;
  }

  const pageTransition = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' } }
  };

  return (
    <>
      <RouteTitleUpdater />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<motion.div {...pageTransition}><LandingPage /></motion.div>} />
          <Route path="/dashboard" element={<motion.div {...pageTransition}><ProtectedRoute><Dashboard /></ProtectedRoute></motion.div>} />
          <Route path="/send-money" element={<motion.div {...pageTransition}><ProtectedRoute><Homepage /></ProtectedRoute></motion.div>} />
          <Route path="/transactions" element={<motion.div {...pageTransition}><ProtectedRoute><Recent /></ProtectedRoute></motion.div>} />
          <Route path="/admin" element={<motion.div {...pageTransition}><ProtectedRoute><AdminDashboard /></ProtectedRoute></motion.div>} />
          <Route path="/report-fraud" element={<motion.div {...pageTransition}><ProtectedRoute><ReportFraud /></ProtectedRoute></motion.div>} />
          <Route path="/statements" element={<motion.div {...pageTransition}><ProtectedRoute><Homepage /></ProtectedRoute></motion.div>} />
          <Route path="/beneficiaries" element={<motion.div {...pageTransition}><ProtectedRoute><Homepage /></ProtectedRoute></motion.div>} />
          <Route path="/settings" element={<motion.div {...pageTransition}><ProtectedRoute><Settings /></ProtectedRoute></motion.div>} />
          <Route path="/help-support" element={<motion.div {...pageTransition}><ProtectedRoute><HelpCenter /></ProtectedRoute></motion.div>} />
          <Route path="/signin" element={<motion.div {...pageTransition}><SignIn /></motion.div>} />
          <Route path="/predict" element={<motion.div {...pageTransition}><PredictForm /></motion.div>} />
          <Route path="*" element={<motion.div {...pageTransition}><NotFound /></motion.div>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
