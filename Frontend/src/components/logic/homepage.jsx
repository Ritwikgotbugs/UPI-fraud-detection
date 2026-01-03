import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Camera, Check, ChevronRight, CreditCard, FileText, History, IndianRupee, QrCode, ShieldAlert, ShieldCheck, User, Wallet, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { QrReader } from "react-qr-reader";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import TransactionSimulation from '../logic/TransactionSimulation';
import MobileNav from './MobileNav';
import SidebarContent from './SidebarContent';
import { db } from "./firebase.js";

const SafeQrReader = (props) => {
  useEffect(() => {
    return () => {
      const stopAllTracks = () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.srcObject instanceof MediaStream) {
            video.srcObject.getTracks().forEach(track => {
              track.stop();
            });
            video.srcObject = null;
          }
          video.pause();
          video.removeAttribute('src');
          video.load();
        });
      };
      stopAllTracks();
      setTimeout(stopAllTracks, 100);
    };
  }, []);
  return <QrReader {...props} />;
};


export default function Homepage() {
  const [showPopup, setShowPopup] = useState(false);
  const [transactionData, setTransactionData] = useState([]);
  const [verificationTrust, setVerificationTrust] = useState(null);
  const [verificationRisk, setVerificationRisk] = useState(null);
  const [recipientProfileForSimulation, setRecipientProfileForSimulation] = useState(null);
  const [selfTransferError, setSelfTransferError] = useState(false);
  const [remarks, setRemarks] = useState()
  const [showSimulation, setShowSimulation] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [camActive, setCamActive] = useState(false);

  useEffect(() => {
    if (showScanner) {
      setCamActive(true);
    } else {
      setCamActive(false);
    }
  }, [showScanner]);

  useEffect(() => {
    return () => {
      if (window._activeStreams) {
        window._activeStreams.forEach(stream => {
          stream.getTracks().forEach(t => t.stop());
        });
        window._activeStreams.clear();
      }
    };
  }, []);

  const handleCloseScanner = () => {
    setCamActive(false);
    setShowScanner(false);

    // Nuclear option: stop ALL captured streams
    if (window._activeStreams) {
      window._activeStreams.forEach(stream => {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log("Explicitly stopped track:", track.label);
        });
      });
      window._activeStreams.clear();
    }
  };


  useEffect(() => {
    if (showPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPopup]);

  const remarkOptions = [
    { value: "shopping", label: "🛒 Shopping & Retail" },
    { value: "emergency", label: "🚨 Emergency / Medical" },
    { value: "salary", label: "💰 Salary / Professional" },
    { value: "rent", label: "🏠 Home Rent / Utilities" },
    { value: "charity", label: "🤝 Charity & Donations" },
    { value: "recurring", label: "🔄 Subscriptions / SIP" },
    { value: "family", label: "👨‍👩‍👧 Family & Friends" },
    { value: "business", label: "🏢 Business Payment" },
    { value: "loan", label: "🏦 Loan Repayment / EMI" },
    { value: "high_value", label: "💎 High-End Purchase" },
    { value: "investment", label: "📈 Stocks & Mutual Funds" },
    { value: "travel", label: "✈️ Travel & Vacation" },
  ];

  // const recentTransactions = [
  //   { id: 1, name: "Rahul Kumar", upi: "rahul@upi", date: "2 hours ago", avatarInt: "RK" },
  //   { id: 2, name: "Priya Sharma", upi: "priya@paytm", date: "Yesterday", avatarInt: "PS" },
  //   { id: 3, name: "Local Grocery", upi: "shop@oksbi", date: "2 days ago", avatarInt: "LG" },
  // ];


  const generateUPIId = (name) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const baseName = name.split(" ")[0].toLowerCase();

    return `${baseName}${randomSuffix}@upi`;
  };

  const navigate = useNavigate();

  const handleAcknowledgeBlock = async () => {
    if (!blockedRuleData) return;

    try {
      await addDoc(collection(db, 'alerts'), {
        type: 'BLOCK',
        severity: 'high',
        title: 'User Acknowledged Block',
        message: `User attempted to send ₹${amount} but was stopped by rule "${blockedRuleData.name}".`,
        details: blockedRuleData.conditions ?
          blockedRuleData.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ') :
          `${blockedRuleData.condition?.field} ${blockedRuleData.condition?.operator} ${blockedRuleData.condition?.value}`,
        transaction_amount: Number(amount),
        sender_upi: userData?.upiId || upiId || 'Unknown',
        recipient_upi: recipientUpiId || 'Unknown',
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (e) {
      console.error("Failed to log acknowledgment:", e);
    }

    setBlockedRuleData(null);
  };
  const handleSendMoney = () => {

    if (Number(amount) > balance) {
      setInsufficientFunds(true);
      return;
    }
    setInsufficientFunds(false);


    const normalizedRecipient = (recipientUpiId || '').trim().toLowerCase();
    const currentUpi = (userData?.upiId || upiId || '').toLowerCase();
    if (normalizedRecipient && currentUpi && normalizedRecipient === currentUpi) {
      setSelfTransferError(true);
      return;
    }
    setSelfTransferError(false);

    // Unified Rules Check
    const context = {
      amount: Number(amount),
      hour: new Date().getHours(),
    };

    const blockingRule = activeRules.find(rule => {
      if (rule.action !== 'block' || rule.enabled === false) return false;

      // New multi-condition support
      if (rule.conditions && Array.isArray(rule.conditions)) {
        // Only evaluate if ALL fields in the rule are available in the basic homepage context
        // Otherwise, skip pre-check and let the full simulation handle it
        const canEvaluate = rule.conditions.every(c => context[c.field] !== undefined);
        if (!canEvaluate) return false;

        return rule.conditions.every(cond => {
          const val = context[cond.field];
          const target = cond.value;
          const op = cond.operator;
          if (op === '>') return val > target;
          if (op === '<') return val < target;
          if (op === '==') return val == target;
          return false;
        });
      }

      // Legacy single condition support
      const val = context[rule.condition?.field];
      if (typeof val === 'undefined') return false;

      const target = rule.condition.value;
      const op = rule.condition.operator;
      if (op === '>') return val > target;
      if (op === '<') return val < target;
      if (op === '==') return val == target;
      return false;
    });

    if (blockingRule) {
      setBlockedRuleData(blockingRule);
      return;
    }

    setShowSimulation(true);
  };
  const getRandomTransaction = () => {
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex];
  };
  const [user, setUser] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [recipientUpiId, setRecipientUpiId] = useState('')
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false)

  const [amount, setAmount] = useState(100);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [sendStep, setSendStep] = useState('recipient'); // 'recipient' | 'amount'
  const [showMyQr, setShowMyQr] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [activeRules, setActiveRules] = useState([]);
  const [blockedRuleData, setBlockedRuleData] = useState(null);
  const scanLockRef = useRef(false);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const rulesSnap = await getDocs(collection(db, 'rules'));
        setActiveRules(rulesSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.enabled));
      } catch (e) { }
    };
    fetchRules();
  }, []);

  // Manual camera cleanup failsafe
  useEffect(() => {
    if (!showScanner) {
      const stopCamera = () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.srcObject instanceof MediaStream) {
            video.srcObject.getTracks().forEach(track => {
              track.stop();
              console.log("Forced stop track:", track.label);
            });
            video.srcObject = null;
          }
        });
      };

      // Run immediately and also after a short delay to catch any late initializations
      stopCamera();
      const timer = setTimeout(stopCamera, 500);
      return () => clearTimeout(timer);
    }
  }, [showScanner]);


  const startScanning = () => {
    // Clear any leftover tracks before starting
    try {
      document.querySelectorAll('video').forEach(v => {
        if (v.srcObject instanceof MediaStream) {
          v.srcObject.getTracks().forEach(t => t.stop());
          v.srcObject = null;
        }
      });
    } catch (e) { }

    scanLockRef.current = false;
    setShowScanner(true);
    setCamActive(true);
  };


  const { user: authUser, userData, balance, refreshData } = useAuth();

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!userData?.upiId) return;

      try {
        const q = query(
          collection(db, "transactions"),
          where("senderUPI", "==", userData.upiId),
          where("transactionType", "==", "sent")
        );

        const querySnapshot = await getDocs(q);
        let transactions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Client-side sort and limit to avoid composite index requirement
        transactions.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        transactions = transactions.slice(0, 5);

        // Get unique recipients to fetch their names
        const uniqueRecipients = [...new Set(transactions.map(t => t.recipientUPI))];
        const recipientDetails = {};

        // Fetch user details for each unique recipient
        for (const recipientUPI of uniqueRecipients) {
          // Skip if we already have a name (e.g. from local cache logic if we had one, but we don't)
          try {
            const userQ = query(collection(db, "users"), where("upiId", "==", recipientUPI));
            const userSnap = await getDocs(userQ);
            if (!userSnap.empty) {
              recipientDetails[recipientUPI] = userSnap.docs[0].data().name;
            }
          } catch (e) {
            console.warn("Could not fetch details for", recipientUPI, e);
          }
        }

        const formatted = transactions.map(t => {
          const name = recipientDetails[t.recipientUPI] || t.recipientUPI;
          const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();

          const now = new Date();
          const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const isYesterday = date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();

          let dateStr = "";
          if (isToday) {
            const diffMs = now - date;
            const diffMins = Math.round(diffMs / 60000);
            const diffHours = Math.round(diffMs / 3600000);
            if (diffMins < 60) dateStr = `${diffMins}m ago`;
            else dateStr = `${diffHours}h ago`;
          } else if (isYesterday) {
            dateStr = "Yesterday";
          } else {
            dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          }

          // Initials
          const initials = name.split(' ').map(n => n.slice(0, 1)).join('').slice(0, 2).toUpperCase();

          return {
            id: t.id,
            name: name,
            upi: t.recipientUPI,
            date: dateStr,
            avatarInt: initials
          };
        });

        // Deduplicate by UPI ID, keeping most recent
        const seen = new Set();
        const uniqueRecents = formatted.filter(item => {
          if (seen.has(item.upi)) return false;
          seen.add(item.upi);
          return true;
        });

        setRecentTransactions(uniqueRecents.slice(0, 3));

      } catch (error) {
        console.error("Error fetching recent transactions:", error);
      }
    };

    fetchRecentTransactions();
  }, [userData?.upiId]);


  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
    if (userData?.upiId) {
      setUpiId(userData.upiId);
    }
  }, [authUser, userData]);


  const handleSeeWhy = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("upiId", "==", upiId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data().transactionDetails || {};
        setTransactionData(Object.entries(data));
      } else {
        setTransactionData([]);
      }

      setShowPopup(true);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
    }
  };


  const handleVerifyUPI = async (overrideUpi) => {

    const normalizedUpi = (overrideUpi && typeof overrideUpi === 'string' ? overrideUpi : recipientUpiId || "").trim().toLowerCase();
    if (!normalizedUpi) {
      setVerificationStatus("invalid");
      return;
    }

    const currentUpi = (userData?.upiId || upiId || '').toLowerCase();
    if (normalizedUpi === currentUpi) {
      setSelfTransferError(true);
      setVerificationStatus(null);
      return;
    }
    setSelfTransferError(false);

    setVerificationStatus("loading");

    try {

      const usersRef = collection(db, "users");


      const q = query(usersRef, where("upiId", "==", normalizedUpi));
      const querySnapshot = await getDocs(q);


      if (querySnapshot.empty) {
        setVerificationStatus("invalid");
        setVerificationTrust(null);
        return;
      }


      const userDoc = querySnapshot.docs[0];
      const modelData = userDoc.data().modelData;

      if (!modelData) {
        setVerificationStatus("invalid");
        setVerificationTrust(null);
        return;
      }


      const features = [
        modelData["Transaction Amount"] || 0,
        modelData["Transaction Frequency"] || 0,
        modelData["Recipient Blacklist Status"] || 0,
        modelData["Device Fingerprinting"] || 0,
        modelData["VPN or Proxy Usage"] || 0,
        modelData["Behavioral Biometrics"] || 0,
        modelData["Time Since Last Transaction"] || 0,
        modelData["Social Trust Score"] || 0,
        modelData["Account Age"] || 0,
        modelData["High-Risk Transaction Times"] || 0,
        modelData["Past Fraudulent Behavior Flags"] || 0,
        modelData["Location-Inconsistent Transactions"] || 0,
        modelData["Normalized Transaction Amount"] || 0,
        modelData["Transaction Context Anomalies"] || 0,
        modelData["Fraud Complaints Count"] || 0,
        modelData["Merchant Category Mismatch"] || 0,
        modelData["User Daily Limit Exceeded"] || 0,
        modelData["Recent High-Value Transaction Flags"] || 0,
        modelData["Recipient Verification Status_suspicious"] || 0,
        modelData["Recipient Verification Status_verified"] || 0,
        modelData["Geo-Location Flags_normal"] || 0,
        modelData["Geo-Location Flags_unusual"] || 0,
      ];

      console.debug("Features sent to Flask:", features);


      const apiBase = import.meta.env.VITE_API_BASE || 'https://rxcq.pythonanywhere.com';
      const response = await fetch(`${apiBase}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.prediction || result.prediction.length === 0) {
        throw new Error("Invalid response from backend");
      }


      const userFriendly = userDoc.data().transactionDetails || {};
      const rawTrust = userFriendly["Social Trust Score"] ?? modelData["Social Trust Score"];
      const trustDisplay = rawTrust == null ? null : (rawTrust > 1 ? Math.round(rawTrust) : Math.round(rawTrust * 100));
      setVerificationTrust(trustDisplay);


      const recipientProfile = {
        ...userDoc.data(),
        params: userDoc.data().transactionDetails || userDoc.data().params || {},
        modelData: modelData || {}
      };
      setRecipientProfileForSimulation(recipientProfile);


      const params = recipientProfile.params || {};
      let vr = 'low';
      if (params.recipientBlacklistStatus || (params.fraudComplaintsCount || 0) > 0 || (params.pastFraudulentBehavior || 0) > 0 || (trustDisplay != null && trustDisplay < 30)) {
        vr = 'high';
      } else if ((trustDisplay != null && trustDisplay < 50) || params.recipientVerificationStatus === 'recently_registered' || (params.accountAge && params.accountAge < 90)) {
        vr = 'medium';
      }
      setVerificationRisk(vr);

      if (result.prediction[0] === 1) {
        setVerificationStatus("fraud");
      } else {
        setVerificationStatus("valid");
      }
    } catch (error) {
      console.error("Error verifying UPI ID:", error);
      setVerificationStatus("error");
    }
  };

  const handleScanResult = async (result, error) => {
    if (result && !scanLockRef.current) {
      scanLockRef.current = true; // Lock immediately
      const text = result?.text || result;
      if (text) {
        handleCloseScanner();
        // If email, try to find associated UPI
        if (text.includes('@') && !text.includes('@upi')) {
          try {
            // We need to query by email
            // Note: This relies on email being queryable
            const q = query(collection(db, 'users'), where('email', '==', text));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const u = snap.docs[0].data();
              if (u.upiId) {
                setRecipientUpiId(u.upiId);
                handleVerifyUPI(u.upiId);
              } else {
                console.warn("User found but no UPI ID");
                setRecipientUpiId(text); // Fallback
              }
            } else {
              setRecipientUpiId(text);
            }
          } catch (e) {
            console.error("QR Email lookup failed", e);
            setRecipientUpiId(text);
          }
        } else {
          // Assume valid UPI ID
          setRecipientUpiId(text);
          handleVerifyUPI(text);
        }
      }
    }
  };





  import('./auth').then(({ handleGoogleSignIn: signInWithGoogle }) => {
    window.__signInWithGoogle = signInWithGoogle;
  }).catch(() => { });

  const handleGoogleSignIn = async (opts = { useRedirect: false }) => {
    try {
      const signIn = window.__signInWithGoogle;
      if (!signIn) {
        console.warn('Auth helper not loaded yet. Trying direct import...');
        const mod = await import('./auth');
        return mod.handleGoogleSignIn(opts);
      }

      const res = await signIn(opts);
      if (res?.success) {
        setUser(res.user);
        setUpiId(res.upiId);
      } else if (res?.fallbackToRedirect) {

        await signIn({ useRedirect: true });
      } else if (res?.error) {
        console.error('Sign in failed:', res.error);
      }

      return res;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    }
  };



  useEffect(() => {

    (async () => {
      try {
        const { handleRedirectResult } = await import('./auth');
        await handleRedirectResult();
      } catch (e) {
        console.warn('Redirect handling:', e);
      }
    })();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100"
    >
      {!user ? (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center min-h-screen px-4"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-60 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-60 blur-3xl" />
          </div>

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl shadow-blue-500/30 mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Fraudulent AI</h1>
            <p className="text-lg text-slate-500 mb-8 max-w-md">ML-powered UPI fraud detection platform with real-time risk analysis</p>
            <Button
              onClick={handleGoogleSignIn}
              className="px-8 py-4 h-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300"
            >
              Get Started
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
          {/* My QR Code Modal */}
          <AnimatePresence>
            {showMyQr && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowMyQr(false)}>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">My QR Code</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowMyQr(false)} className="hover:bg-slate-100 rounded-full">
                      <X className="h-5 w-5 text-slate-500" />
                    </Button>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-100">
                      <QRCode
                        value={userData?.email || user?.email || ""}
                        size={200}
                        level="H"
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800">{userData?.name || "User"}</p>
                      <p className="text-sm text-slate-500">{userData?.email || user?.email}</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">{userData?.upiId || "UPI ID Loading..."}</p>
                    </div>
                    <p className="text-xs text-center text-slate-400 max-w-[80%]">
                      Scan this QR code to quickly fetch account details and send money safely.
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {showScanner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={handleCloseScanner}>
              <div className="w-full max-w-md h-full flex flex-col relative" onClick={e => e.stopPropagation()}>
                <div className="absolute top-4 right-4 z-10">
                  <Button variant="ghost" size="icon" onClick={handleCloseScanner} className="text-white hover:bg-white/20 rounded-full">
                    <X className="h-6 w-6" />
                  </Button>
                </div>
                <div className="flex-1 flex flex-col justify-center items-center p-4">
                  <h3 className="text-white font-semibold text-lg mb-8 flex items-center gap-2">
                    <Camera className="h-5 w-5" /> Scan QR Code
                  </h3>
                  <div className="w-full aspect-square max-w-sm rounded-3xl overflow-hidden border-2 border-white/20 relative shadow-2xl bg-black">
                    {camActive && (
                      <SafeQrReader
                        constraints={{ video: { facingMode: 'environment' } }}
                        onResult={(result, error) => {
                          if (result) handleScanResult(result);
                        }}
                        containerStyle={{ width: '100%', height: '100%' }}
                        videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {/* Overlay Frame */}
                    <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none">
                      <div className="w-full h-full border-2 border-green-500/50 relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-8 text-center px-8">
                    Align the recipient's QR code within the frame to automatically fetch their UPI details.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
            <SidebarContent />
          </aside>

          <main className="flex-1 flex flex-col min-w-0">
            {/* Mobile Navigation */}
            <MobileNav />

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5">
              {/* Page Title */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Simulate Transaction</h1>
                  <p className="text-slate-500 text-sm mt-0.5">Test fraud detection with ML-powered risk analysis</p>
                </div>
                {/* Desktop Header Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMyQr(true)}
                    className="gap-2 text-slate-600 hover:bg-white/50 px-2 md:px-4"
                  >
                    <QrCode className="h-4 w-4" />
                    <span className="hidden md:inline">Show QR</span>
                    <span className="md:hidden">QR</span>
                  </Button>
                  <div className="hidden md:flex items-center gap-3 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{user?.displayName || user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {/* Main Send Form - Takes 2 columns */}
                <div className="lg:col-span-3 space-y-5">
                  {/* Transfer Form */}
                  <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                      <AnimatePresence mode="wait">
                        {sendStep === 'recipient' ? (
                          <motion.div
                            key="recipient"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6 space-y-6"
                          >
                            {/* Payment Method Selection */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/50 cursor-pointer transition-all relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-blue-500">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                </div>
                                <div className="p-2 bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                  <CreditCard className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm">Enter UPI ID</h3>
                                <p className="text-xs text-slate-500 mt-1">Pay to any UPI app</p>
                              </div>

                              <div
                                onClick={startScanning}
                                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                              >
                                <div className="p-2 bg-purple-50 group-hover:bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors">
                                  <QrCode className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm">Scan QR</h3>
                                <p className="text-xs text-slate-500 mt-1">Scan to pay instantly</p>
                              </div>
                            </div>

                            {/* Step 1: Recipient Verification */}
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">
                                  Recipient Details
                                </label>
                                <div className="flex gap-2">
                                  <div className="relative flex-grow">
                                    <Input
                                      value={recipientUpiId}
                                      onChange={(e) => {
                                        setRecipientUpiId(e.target.value);
                                        setVerificationStatus(null);
                                        setSelfTransferError(false);
                                      }}
                                      placeholder="Ex: mobileNumber@upi or username@bank"
                                      className="pl-4 pr-10 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all shadow-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleVerifyUPI();
                                        }
                                      }}
                                    />
                                    {recipientUpiId && (
                                      <button
                                        onClick={() => { setRecipientUpiId(''); setVerificationStatus(null); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  <Button
                                    onClick={handleVerifyUPI}
                                    disabled={verificationStatus === "loading" || !recipientUpiId}
                                    className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 rounded-xl font-medium transition-all"
                                  >
                                    {verificationStatus === "loading" ? (
                                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                      "Verify"
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {/* Verification Status Display */}
                              <AnimatePresence mode="wait">
                                {selfTransferError && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-4 rounded-xl border bg-orange-50 border-orange-200">
                                      <div className="flex items-center gap-3 text-orange-700">
                                        <User className="h-5 w-5" />
                                        <span className="font-medium">You cannot send money to yourself</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                                {verificationStatus && verificationStatus !== "idle" && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className={cn(
                                      "p-4 rounded-xl border",
                                      verificationStatus === "valid" ? "bg-emerald-50 border-emerald-100" :
                                        verificationStatus === "fraud" ? "bg-red-50 border-red-100" :
                                          verificationStatus === "loading" ? "bg-blue-50 border-blue-100" :
                                            "bg-slate-50 border-slate-100"
                                    )}>
                                      {verificationStatus === "valid" && (
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 bg-emerald-100 rounded-full flex-shrink-0">
                                            <Check className="h-5 w-5 text-emerald-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-emerald-900">Verified Recipient</h4>

                                            <div className="mt-1 mb-2 space-y-0.5">
                                              <p className="text-sm text-slate-700 font-medium truncate">
                                                {recipientProfileForSimulation?.name || "Unknown Name"}
                                              </p>
                                              <p className="text-xs text-slate-500 truncate">
                                                {recipientProfileForSimulation?.email || "No email available"}
                                              </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              {verificationTrust != null && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/50 rounded-lg">
                                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                  <span className="text-xs font-medium text-emerald-800">Trust: {verificationTrust}%</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex-shrink-0">
                                            <Button
                                              onClick={() => setSendStep('amount')}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                            >
                                              Next <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {verificationStatus === "fraud" && (
                                        <div className="space-y-3">
                                          <div className="flex items-start gap-3">
                                            <div className="p-2 bg-red-100 rounded-lg">
                                              <AlertTriangle className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                              <h4 className="font-semibold text-red-900">High Risk Detected</h4>
                                              <p className="text-sm text-red-700 mt-1">This UPI ID is associated with suspicious activity.</p>
                                            </div>
                                          </div>
                                          <div className="flex gap-2 pl-12">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={handleSeeWhy}
                                              className="border-red-200 text-red-700 hover:bg-red-50 text-xs h-8"
                                            >
                                              View Analysis
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => setSendStep('amount')}
                                              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                                            >
                                              Proceed Anyway
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {verificationStatus === "invalid" && (
                                        <div className="flex items-center gap-3 text-red-700">
                                          <XCircle className="h-5 w-5" />
                                          <span className="font-medium">Invalid UPI ID</span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Recent Transactions */}
                            {!verificationStatus && recentTransactions.length > 0 && (
                              <div className="mt-2 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                  <History className="h-4 w-4 text-slate-500" />
                                  Recent Transactions
                                </h3>
                                <div className="space-y-3">
                                  {recentTransactions.map((tx) => (
                                    <div
                                      key={tx.id}
                                      onClick={() => {
                                        setRecipientUpiId(tx.upi);
                                        handleVerifyUPI(tx.upi);
                                      }}
                                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all group"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                                        {tx.avatarInt}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                          <p className="font-semibold text-slate-800 text-sm truncate">{tx.name}</p>
                                          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{tx.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate group-hover:text-blue-600 transition-colors">{tx.upi}</p>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          </motion.div>
                        ) : (
                          <motion.div
                            key="amount"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-6 space-y-6"
                          >
                            {/* Header with Back Button */}
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setSendStep('recipient')}
                                className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                Back to UPI
                              </button>
                              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-xs font-semibold text-slate-700">{recipientUpiId}</span>
                              </div>
                            </div>

                            {/* Available Balance Display */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Available Balance</p>
                                  <p className="text-2xl font-bold">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <Wallet className="w-8 h-8 text-slate-600" />
                              </div>
                            </div>

                            {/* Amount Input Section */}
                            <div className="space-y-4">
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-bold">₹</span>
                                <Input
                                  type="number"
                                  value={amount}
                                  onChange={(e) => {
                                    setAmount(e.target.value);
                                    setInsufficientFunds(Number(e.target.value) > balance);
                                  }}
                                  placeholder="0"
                                  className={cn(
                                    "pl-12 text-3xl font-bold h-16 bg-slate-50/80 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:bg-white rounded-xl",
                                    insufficientFunds && "border-red-300 bg-red-50/50 focus:border-red-400"
                                  )}
                                  autoFocus
                                />
                              </div>


                              {/* Quick Amounts */}
                              <div className="grid grid-cols-4 gap-2">
                                {[100, 500, 1000, 2000].map((quickAmount) => (
                                  <button
                                    key={quickAmount}
                                    onClick={() => setAmount(quickAmount.toString())}
                                    className="py-2 px-1 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:text-blue-600 text-xs font-semibold text-slate-600 transition-all"
                                  >
                                    ₹{quickAmount}
                                  </button>
                                ))}
                              </div>

                              {insufficientFunds && (
                                <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Insufficient funds for this transaction
                                </p>
                              )}

                            </div>

                            {/* Transaction Context */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium text-slate-700">Payment For</label>
                              <div className="flex flex-wrap gap-2">
                                {remarkOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    className={cn(
                                      "px-3 py-1.5 border rounded-lg text-xs font-medium transition-all",
                                      remarks === option.value
                                        ? "bg-blue-50 border-blue-500 text-blue-700"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                                    )}
                                    onClick={() => setRemarks(option.value)}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Note */}
                            <div className="space-y-2">
                              <Input
                                placeholder="Add a note (optional)"
                                className="bg-slate-50 border-slate-200"
                              />
                            </div>

                            {/* Send Button */}
                            <Button
                              onClick={handleSendMoney}
                              disabled={insufficientFunds || !amount || Number(amount) <= 0}
                              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 rounded-xl font-semibold text-lg"
                            >
                              Pay ₹{Number(amount || 0).toLocaleString('en-IN')}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </div>

                {/* Side Panel - Right Column (No longer needed for balance) */}
                {/* We can potentially add transaction history or other quick actions here later */}

                {/* Transaction Simulation */}
                {showSimulation && user && (
                  <TransactionSimulation
                    upiId={recipientUpiId}
                    amount={amount}
                    remarks={remarks}
                    senderUPI={upiId}
                    initialRecipientProfile={recipientProfileForSimulation}
                    onClose={() => setShowSimulation(false)}
                  />
                )}
              </div>
            </div>
          </main>
        </div >
      )
      }

      {/* Transaction Details Popup - Using Portal to render to body */}
      {
        createPortal(
          <AnimatePresence>
            {showPopup && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xl"
                style={{ zIndex: 9999 }}
                onClick={() => setShowPopup(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white rounded-2xl shadow-2xl max-w-lg w-full m-4 overflow-hidden border border-slate-200/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPopup(false)}
                        className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 max-h-[50vh] overflow-y-auto">
                    {transactionData.length > 0 ? (
                      <div className="space-y-3">
                        {transactionData.map(([key, value], index) => (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-start justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            <span className="text-sm font-medium text-slate-500">{key}</span>
                            <span className="text-sm font-semibold text-slate-800 text-right max-w-[60%]">{String(value)}</span>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                          <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">No data found</p>
                        <p className="text-slate-400 text-sm mt-1">Transaction details unavailable</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <Button
                      onClick={() => setShowPopup(false)}
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25"
                    >
                      Close
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      }

      {/* Blocked Rule Popup */}
      {createPortal(
        <AnimatePresence>
          {blockedRuleData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xl z-[10000] p-4"
              onClick={() => setBlockedRuleData(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 flex flex-col items-center justify-center text-white relative">
                  <div className="absolute top-4 right-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setBlockedRuleData(null)}
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/30 animate-pulse">
                    <ShieldAlert className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-center uppercase tracking-tight">Security Block</h2>
                  <p className="text-red-100 text-sm font-medium mt-1">Safety First Policy Applied</p>
                </div>

                <div className="p-8">
                  <div className="bg-red-50 rounded-2xl p-6 border border-red-100 mb-6">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1 opacity-60">Violated Policy</p>
                    <p className="text-lg font-bold text-red-900 leading-tight">{blockedRuleData.name}</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Transaction Amount</p>
                        <p className="text-sm font-bold text-slate-700">₹{amount}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-slate-600">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Restriction Reason</p>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          This transaction exceeds the administrative safety limits set for your current account profile.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleAcknowledgeBlock}
                    className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200"
                  >
                    I Understand
                  </Button>

                  <p className="text-center text-[10px] text-slate-400 mt-4 font-medium px-4">
                    If you believe this is an error, please contact your administrative security officer.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div >
  );
}
