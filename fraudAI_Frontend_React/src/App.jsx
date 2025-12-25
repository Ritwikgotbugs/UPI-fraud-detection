import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import PredictForm from '../PredictForm';
import AdminDashboard from './components/logic/AdminDashboard';
import Dashboard from './components/logic/Dashboard';
import Homepage from './components/logic/homepage';
import NotFound from './components/logic/NotFound';
import Recent from './components/logic/Recent';
import ReportFraud from './components/logic/ReportFraud';
import Settings from './components/logic/Settings';
import SignIn from './components/logic/SignIn';
import { AuthProvider, useAuth } from './context/AuthContext';
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

  return null; // This component does not render anything
};

// Loading screen component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-slate-800">Loading Fraudulent.ai...</h2>
      <p className="text-slate-500 mt-2">Please wait while we set things up</p>
    </div>
  </div>
);

// Wrapper component that uses the auth context
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <RouteTitleUpdater />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/send-money" element={<Homepage />} />
        <Route path="/transactions" element={<Recent />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/report-fraud" element={<ReportFraud />} />
        <Route path="/statements" element={<Homepage />} />
        <Route path="/beneficiaries" element={<Homepage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help-support" element={<Homepage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/predict" element={<PredictForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
