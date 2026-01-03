import { getRedirectResult, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDefaultTransactionDetails } from "../../lib/riskCalculator";
import { auth, db } from "./firebase";


const generateUPIId = (name) => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); 
  const baseName = name.split(" ")[0].toLowerCase(); 
  return `${baseName}${randomSuffix}@upi`;
};


export const createOrUpdateUser = async (user) => {
  if (!user?.uid) {
    console.warn('createOrUpdateUser: No user UID provided');
    return null;
  }

  console.debug('createOrUpdateUser: Starting for UID', user.uid);

  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const upiId = generateUPIId(user.displayName || "user");
      
      // Use default transaction details for new users (100 trust, 0 risk)
      const defaultDetails = getDefaultTransactionDetails();
      
      console.debug('createOrUpdateUser: Creating new user with UPI', upiId, 'and 100 trust score');

      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        upiId: upiId,
        createdAt: serverTimestamp(),
        transactionDetails: defaultDetails,
        // Model data with safe defaults
        modelData: {
          amount: 0,
          transaction_frequency: 0,
          recipient_verification_status: 'verified',
          recipient_blacklist_status: 0,
          device_fingerprinting: 0.2,
          vpn_proxy_usage: 0,
          geo_location_flags: 'normal',
          behavioral_biometrics: 0.2,
          time_since_last_transaction: 60,
          social_trust_score: 100,
          account_age: 1,
          high_risk_transaction_times: 0,
          past_fraudulent_behavior_flags: 0,
          location_inconsistent_transactions: 0,
          normalized_transaction_amount: 0,
          transaction_context_anomalies: 0,
          fraud_complaints_count: 0,
          merchant_category_mismatch: 0,
          user_daily_limit_exceeded: 0,
          recent_high_value_transaction_flags: 0
        },
      });

      console.info("✅ New user created with UPI ID:", upiId, "Trust Score: 100");
      return upiId;
    } else {
      const upiId = userDoc.data().upiId;
      console.debug('createOrUpdateUser: User already exists with UPI', upiId);
      return upiId;
    }
  } catch (error) {
    console.error('❌ createOrUpdateUser failed:', error.code, error.message);
    console.error('  Full error:', error);
    throw error;
  }
};


export const handleGoogleSignIn = async ({ useRedirect = false, autoRedirect = false } = {}) => {
  const provider = new GoogleAuthProvider();

  console.debug('handleGoogleSignIn: Starting with useRedirect =', useRedirect, 'autoRedirect =', autoRedirect);

  
  try {
    if (!useRedirect && typeof window !== 'undefined' && window.crossOriginIsolated) {
      console.debug('handleGoogleSignIn: Page is cross-origin isolated, switching to redirect');
      useRedirect = true;
    }
  } catch (e) {
    
  }

  try {
    if (useRedirect) {
      console.debug('handleGoogleSignIn: Initiating redirect sign-in');
      await signInWithRedirect(auth, provider);
      
      return { redirected: true };
    }

    console.debug('handleGoogleSignIn: Initiating popup sign-in');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.debug('handleGoogleSignIn: Popup succeeded, user:', user?.uid);
    
    const upiId = await createOrUpdateUser(user);
    console.info('✅ handleGoogleSignIn successful, UPI:', upiId);
    return { success: true, user, upiId };
  } catch (error) {
    
    const msg = (error && (error.message || '')).toLowerCase();
    const isCoopPopupIssue = msg.includes('cross-origin-opener-policy') || msg.includes('window.closed') || msg.includes('popup blocked') || (error.code && error.code === 'auth/popup-blocked');

    if (isCoopPopupIssue) {
      console.warn('⚠️ Popup sign-in blocked (COOP/COEP or browser policy). Falling back to redirect sign-in.');
    } else {
      console.error('❌ handleGoogleSignIn error:', error.code, error.message);
    }

    
    const result = { success: false, error, fallbackToRedirect: true };

    if (autoRedirect) {
      try {
        console.debug('handleGoogleSignIn: Auto-redirecting to sign-in');
        await signInWithRedirect(auth, provider);
        return { redirected: true };
      } catch (redirError) {
        console.error('❌ Redirect sign-in failed:', redirError);
        return { success: false, error: redirError };
      }
    }

    return result;
  }
};


export const handleRedirectResult = async () => {
  try {
    console.debug('handleRedirectResult: Checking for redirect payload...');
    const result = await getRedirectResult(auth);
    
    if (!result) {
      console.debug('handleRedirectResult: No redirect result present');
      return null;
    }

    const user = result.user;
    console.debug('handleRedirectResult: Found user from redirect:', user?.uid);
    
    const upiId = await createOrUpdateUser(user);
    console.info('✅ handleRedirectResult: processed redirect for user', user?.uid, 'upi', upiId);
    return { user, upiId };
  } catch (error) {
    console.error("❌ handleRedirectResult error:", error.code, error.message);
    return null;
  }
};
