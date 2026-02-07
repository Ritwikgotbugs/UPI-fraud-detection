
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { Lock, Mail, Shield, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { auth } from "./firebase";
import { handleGoogleSignIn } from "./auth";

const SignIn = () => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loginMode, setLoginMode] = useState('user');
  const [adminMode, setAdminMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  
  useEffect(() => {
    if (user && !loading) {
      if (isAdmin) {
        navigate('/admin/overview', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, loading, navigate]);

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

  const startAdminSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid admin credentials. No account found with this email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.');
      } else {
        setError(err.message || 'Admin sign in failed');
      }
    }
  };

  const startAdminRegister = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      setStatus('error');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Email/Password → Enable.');
      } else {
        setError(err.message || 'Registration failed');
      }
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
          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              onClick={() => { setLoginMode('user'); setError(null); setStatus(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${loginMode === 'user' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Shield className="w-4 h-4" />
              User
            </button>
            <button
              onClick={() => { setLoginMode('admin'); setError(null); setStatus(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${loginMode === 'admin' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">
              {loginMode === 'user' ? 'Welcome back' : adminMode === 'login' ? 'Admin Access' : 'Create Admin Account'}
            </h2>
            <p className="text-sm text-slate-500">
              {loginMode === 'user' ? 'Sign in to continue to your account' : adminMode === 'login' ? 'Sign in with admin credentials' : 'Register a new admin account'}
            </p>
          </div>

          {loginMode === 'user' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@fraudulent.ai"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && (adminMode === 'login' ? startAdminSignIn() : null)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && (adminMode === 'login' ? startAdminSignIn() : null)}
                    />
                  </div>
                </div>
                {adminMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && startAdminRegister()}
                      />
                    </div>
                  </div>
                )}
                {adminMode === 'login' ? (
                  <button
                    onClick={startAdminSignIn}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    {status === 'loading' ? 'Authenticating...' : 'Sign in as Admin'}
                  </button>
                ) : (
                  <button
                    onClick={startAdminRegister}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-5 h-5" />
                    {status === 'loading' ? 'Creating Account...' : 'Create Admin Account'}
                  </button>
                )}
                <button
                  onClick={() => { setAdminMode(adminMode === 'login' ? 'register' : 'login'); setError(null); setStatus(null); setConfirmPassword(''); }}
                  className="w-full text-center text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
                >
                  {adminMode === 'login' ? "Don't have an admin account? Create one" : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
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
