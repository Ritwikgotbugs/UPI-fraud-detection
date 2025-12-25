
import { Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { handleGoogleSignIn } from "./auth";

const SignIn = () => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const startSignIn = async (useRedirect = false) => {
    setStatus('loading');
    setError(null);
    const res = await handleGoogleSignIn({ useRedirect, autoRedirect: true });

    if (res?.success) {
      setStatus('done');
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);
    } else if (res?.redirected) {
      setStatus('redirecting');
    } else if (res?.fallbackToRedirect) {
      setStatus('popup-blocked');
    } else {
      setStatus('error');
      setError(res?.error?.message || 'Sign in failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
      </div>
      
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Fraudulent.ai</h1>
          <p className="text-slate-500">Secure UPI payments powered by AI</p>
        </div>
        
        {/* Sign In Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-500">Sign in to continue to your account</p>
          </div>

          <button
            onClick={() => startSignIn(false)}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={status === 'loading' || status === 'redirecting'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {status === 'loading' ? 'Signing in...' : 'Continue with Google'}
          </button>

          {status === 'popup-blocked' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-amber-700 text-sm mb-3">Popup blocked. Please use redirect sign-in.</p>
              <button 
                onClick={() => startSignIn(true)} 
                className="w-full px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                Sign in with Redirect
              </button>
            </div>
          )}

          {status === 'redirecting' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Redirecting to Google...</span>
            </div>
          )}

          {status === 'done' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Sign-in successful!</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'AI Protection', icon: '🛡️' },
            { label: 'Instant Payments', icon: '⚡' },
            { label: '100% Secure', icon: '🔒' }
          ].map((feature) => (
            <div key={feature.label} className="p-3 bg-white/50 rounded-xl">
              <span className="text-2xl mb-1 block">{feature.icon}</span>
              <span className="text-xs text-slate-500">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SignIn;
