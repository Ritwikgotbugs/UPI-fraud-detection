import { auth, db } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Load the mapped transactions JSON
import mappedTransactions from "./mapped_transactions.json" // Ensure this path is correct

// Helper function to generate unique UPI ID
const generateUPIId = (name) => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  const baseName = name.split(" ")[0].toLowerCase(); // First name in lowercase
  return `${baseName}${randomSuffix}@expressbank`;
};

// Function to randomly assign a transaction to a user
const getRandomTransaction = () => {
  const randomIndex = Math.floor(Math.random() * mappedTransactions.length);
  return mappedTransactions[randomIndex];
};

// Ensure user record exists for a given Firebase user
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
      const { user_friendly, model_processed } = getRandomTransaction();

      console.debug('createOrUpdateUser: Creating new user with UPI', upiId);

      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        upiId: upiId,
        createdAt: serverTimestamp(),
        transactionDetails: user_friendly,
        modelData: model_processed,
      });

      console.info("✅ New user created with UPI ID:", upiId);
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

// Try popup sign-in, fallback to redirect for environments where popups are blocked
export const handleGoogleSignIn = async ({ useRedirect = false, autoRedirect = false } = {}) => {
  const provider = new GoogleAuthProvider();

  console.debug('handleGoogleSignIn: Starting with useRedirect =', useRedirect, 'autoRedirect =', autoRedirect);

  // If the page is cross-origin isolated (COOP/COEP), popups are likely to be blocked — prefer redirect
  try {
    if (!useRedirect && typeof window !== 'undefined' && window.crossOriginIsolated) {
      console.debug('handleGoogleSignIn: Page is cross-origin isolated, switching to redirect');
      useRedirect = true;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (useRedirect) {
      console.debug('handleGoogleSignIn: Initiating redirect sign-in');
      await signInWithRedirect(auth, provider);
      // signInWithRedirect does not return here (redirects the page)
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
    // If this is a COOP/COEP / popup-blocking related error, log a short warning instead of a noisy error
    const msg = (error && (error.message || '')).toLowerCase();
    const isCoopPopupIssue = msg.includes('cross-origin-opener-policy') || msg.includes('window.closed') || msg.includes('popup blocked') || (error.code && error.code === 'auth/popup-blocked');

    if (isCoopPopupIssue) {
      console.warn('⚠️ Popup sign-in blocked (COOP/COEP or browser policy). Falling back to redirect sign-in.');
    } else {
      console.error('❌ handleGoogleSignIn error:', error.code, error.message);
    }

    // Fallback: suggest redirect
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

// Handle redirect result on app load (call from app init)
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
