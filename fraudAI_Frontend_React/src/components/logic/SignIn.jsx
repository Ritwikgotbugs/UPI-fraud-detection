
import React, { useState } from "react";
import { handleGoogleSignIn } from "./auth";

const SignIn = () => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const startSignIn = async (useRedirect = false) => {
    setStatus('loading');
    setError(null);
    const res = await handleGoogleSignIn({ useRedirect, autoRedirect: true });

    if (res?.success) {
      setStatus('done');
    } else if (res?.redirected) {
      setStatus('redirecting');
    } else if (res?.fallbackToRedirect) {
      // Popup blocked by policy — ask user to use redirect (shouldn't happen because autoRedirect attempted)
      setStatus('popup-blocked');
    } else {
      setStatus('error');
      setError(res?.error?.message || 'Sign in failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Welcome to SafePay AI</h1>

      <button
        onClick={() => startSignIn(false)}
        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-600"
        disabled={status === 'loading' || status === 'redirecting'}
      >
        {status === 'loading' ? 'Opening popup...' : 'Sign in with Google'}
      </button>

      {status === 'popup-blocked' && (
        <div className="mt-4 text-center">
          <p className="text-yellow-500 mb-2">Popup blocked by browser policy (COOP/COEP). Please use redirect sign-in instead.</p>
          <button onClick={() => startSignIn(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Sign in with Redirect</button>
        </div>
      )}

      {status === 'redirecting' && (
        <p className="mt-4 text-gray-600">Redirecting to Google for sign-in…</p>
      )}

      {status === 'done' && (
        <p className="mt-4 text-green-600">Sign-in successful — you will be redirected back or the app will update automatically.</p>
      )}

      {status === 'error' && (
        <p className="mt-4 text-red-500">{error}</p>
      )}
    </div>
  );
};

export default SignIn;
