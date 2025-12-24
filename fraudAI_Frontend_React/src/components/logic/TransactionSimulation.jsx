import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle, Clock, FileText, Loader2, Send, Shield, ShieldAlert, ShieldCheck, Sparkles, User, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from './firebase';

const API_BASE = 'http://localhost:5000';

// Circular progress ring component for risk score
const RiskProgressRing = ({ score, level }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const getColor = () => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  const getBgColor = () => {
    switch (level) {
      case 'high': return '#fef2f2';
      case 'medium': return '#fffbeb';
      case 'low': return '#ecfdf5';
      default: return '#f8fafc';
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="10"
          fill={getBgColor()}
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          stroke={getColor()}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-800">{score?.toFixed(0)}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Risk Score</span>
      </div>
    </div>
  );
};

const TransactionSimulation = ({ upiId, amount, remarks, senderUPI, onClose }) => {
  const [currentStep, setCurrentStep] = useState('details')
  const [isLoading, setIsLoading] = useState(false)
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { refreshData } = useAuth();

  // Prevent background scrolling when popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Generate offline risk analysis based on basic rules
  const generateOfflineRiskAnalysis = () => {
    let riskScore = 10; // Base score
    const factors = [];
    
    // Check amount
    const numAmount = Number(amount);
    if (numAmount > 50000) {
      riskScore += 30;
      factors.push('Very high transaction amount');
    } else if (numAmount > 20000) {
      riskScore += 15;
      factors.push('High transaction amount');
    }
    
    // Check time
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) {
      riskScore += 20;
      factors.push('Late night transaction');
    }
    
    // Basic check passed
    if (factors.length === 0) {
      factors.push('Basic checks passed (offline mode)');
    }
    
    return {
      risk_score: Math.min(100, riskScore),
      risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      should_block: riskScore >= 70,
      requires_verification: riskScore >= 40 && riskScore < 70,
      factors,
      recommendations: riskScore >= 40 ? ['Verify transaction details carefully'] : ['Transaction appears safe'],
      offline: true
    };
  };

  // Analyze transaction risk before confirming
  const analyzeRisk = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUPI,
          recipientUPI: upiId,
          amount: Number(amount),
          remarks,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenRes: `${window.screen.width}x${window.screen.height}`
          },
          location: {} // Could be populated with geolocation API
        })
      });

      if (response.ok) {
        const result = await response.json();
        setRiskAnalysis(result.risk_assessment);
        setCurrentStep('risk_review');
      } else {
        // If API fails, use offline analysis
        const offlineAnalysis = generateOfflineRiskAnalysis();
        setRiskAnalysis(offlineAnalysis);
        setCurrentStep('risk_review');
      }
    } catch (error) {
      console.error('Risk analysis failed:', error);
      // Use offline analysis if API is unavailable
      const offlineAnalysis = generateOfflineRiskAnalysis();
      setRiskAnalysis(offlineAnalysis);
      setCurrentStep('risk_review');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    // First analyze the transaction
    if (!riskAnalysis) {
      await analyzeRisk();
      return;
    }

    // If high risk, require additional confirmation
    if (riskAnalysis?.should_block) {
      setCurrentStep('blocked');
      return;
    }

    setIsLoading(true);
    setCurrentStep("processing");
    try {
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      // Prepare transaction data
      const transactionData = {
        amount: Number(amount) || 0,
        recipientUPI: upiId || "",
        senderUPI: senderUPI || "",
        transactionType: "sent",
        status: "Completed",
        createdAt: serverTimestamp(),
        riskScore: riskAnalysis?.risk_score || 0,
        riskLevel: riskAnalysis?.risk_level || 'low'
      };
      
      if (remarks && remarks.trim()) {
        transactionData.remarks = remarks;
      }

      // Create transaction records
      await addDoc(collection(db, "transactions"), transactionData);
      await addDoc(collection(db, "transactions"), {
        ...transactionData,
        transactionType: "received",
      });

      // Create notifications
      await addDoc(collection(db, "notifications"), {
        recipientUPI: senderUPI,
        type: "sent",
        message: `You sent ₹${amount} to ${upiId}`,
        amount: Number(amount),
        otherPartyUPI: upiId,
        read: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        recipientUPI: upiId,
        type: "received",
        message: `You received ₹${amount} from ${senderUPI}`,
        amount: Number(amount),
        otherPartyUPI: senderUPI,
        read: false,
        createdAt: serverTimestamp(),
      });

      await refreshData();
      setCurrentStep("success");
    } catch (error) {
      console.error("Error processing transaction:", error);
      setCurrentStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const proceedAnyway = async () => {
    // Allow user to proceed even with high risk (with warning)
    setIsLoading(true);
    setCurrentStep("processing");
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      const transactionData = {
        amount: Number(amount) || 0,
        recipientUPI: upiId || "",
        senderUPI: senderUPI || "",
        transactionType: "sent",
        status: "Completed",
        createdAt: serverTimestamp(),
        riskScore: riskAnalysis?.risk_score || 0,
        riskLevel: riskAnalysis?.risk_level || 'low',
        userOverride: true // Mark that user overrode the warning
      };
      
      if (remarks && remarks.trim()) {
        transactionData.remarks = remarks;
      }

      await addDoc(collection(db, "transactions"), transactionData);
      await addDoc(collection(db, "transactions"), {
        ...transactionData,
        transactionType: "received",
      });

      await addDoc(collection(db, "notifications"), {
        recipientUPI: senderUPI,
        type: "sent",
        message: `You sent ₹${amount} to ${upiId}`,
        amount: Number(amount),
        otherPartyUPI: upiId,
        read: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        recipientUPI: upiId,
        type: "received",
        message: `You received ₹${amount} from ${senderUPI}`,
        amount: Number(amount),
        otherPartyUPI: senderUPI,
        read: false,
        createdAt: serverTimestamp(),
      });

      await refreshData();
      setCurrentStep("success");
    } catch (error) {
      console.error("Error processing transaction:", error);
      setCurrentStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-50';
      case 'medium': return 'bg-amber-50';
      case 'low': return 'bg-emerald-50';
      default: return 'bg-slate-50';
    }
  };

  const getRiskBadgeColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'high': return <ShieldAlert className="w-12 h-12 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'low': return <ShieldCheck className="w-12 h-12 text-emerald-500" />;
      default: return <Shield className="w-12 h-12 text-slate-500" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { when: "beforeChildren", staggerChildren: 0.08 }
    },
    exit: { 
      opacity: 0,
      transition: { when: "afterChildren", staggerChildren: 0.03, staggerDirection: -1 }
    }
  }

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { 
      y: 0, opacity: 1,
      transition: { type: 'spring', damping: 20, stiffness: 300 }
    },
    exit: { 
      y: -10, opacity: 0,
      transition: { type: 'spring', damping: 20, stiffness: 300 }
    }
  }

  const DetailItem = ({ icon: Icon, label, value, highlight }) => (
    <motion.div 
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
        highlight 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' 
          : 'bg-slate-50/80 border-slate-100 hover:border-slate-200'
      }`}
      variants={itemVariants}
    >
      <div className={`p-2.5 rounded-lg ${highlight ? 'bg-blue-100' : 'bg-white'} shadow-sm`}>
        <Icon className={`w-5 h-5 ${highlight ? 'text-blue-600' : 'text-slate-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-base font-semibold truncate ${highlight ? 'text-blue-700' : 'text-slate-700'}`}>{value}</p>
      </div>
    </motion.div>
  )

  const renderContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <motion.div className="space-y-5" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            {/* Amount Display - Prominent */}
            <motion.div 
              className="text-center py-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl border border-blue-100"
              variants={itemVariants}
            >
              <p className="text-sm text-slate-500 mb-1">You're sending</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold text-slate-800">₹{Number(amount).toLocaleString('en-IN')}</span>
              </div>
            </motion.div>

            {/* Transaction Details */}
            <div className="space-y-3">
              <DetailItem icon={User} label="To" value={upiId} highlight />
              <DetailItem icon={ArrowUpRight} label="From" value={senderUPI} />
              <DetailItem icon={FileText} label="Category" value={remarks || 'General'} />
              <DetailItem icon={Clock} label="Time" value={new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} />
            </div>

            {/* AI Protection Badge */}
            <motion.div 
              className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100"
              variants={itemVariants}
            >
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-emerald-700">AI-Powered Security</p>
                <p className="text-[11px] text-emerald-600">Transaction will be analyzed for fraud</p>
              </div>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </motion.div>

            {/* Action Button */}
            <motion.div variants={itemVariants}>
              <Button
                onClick={handleConfirm}
                disabled={isAnalyzing}
                className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-blue-500/25 transition-all duration-300"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing Transaction...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Confirm & Pay</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )

      case 'risk_review':
        return (
          <motion.div 
            className="space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Risk Score Display with Ring */}
            <div className="flex flex-col items-center py-4">
              <RiskProgressRing score={riskAnalysis?.risk_score} level={riskAnalysis?.risk_level} />
              <Badge 
                variant="outline" 
                className={`mt-4 px-4 py-1.5 text-sm font-semibold ${getRiskBadgeColor(riskAnalysis?.risk_level)}`}
              >
                {riskAnalysis?.risk_level === 'low' && <ShieldCheck className="w-4 h-4 mr-1.5" />}
                {riskAnalysis?.risk_level === 'medium' && <AlertTriangle className="w-4 h-4 mr-1.5" />}
                {riskAnalysis?.risk_level === 'high' && <ShieldAlert className="w-4 h-4 mr-1.5" />}
                {riskAnalysis?.risk_level?.toUpperCase()} RISK
              </Badge>
            </div>

            {/* Transaction Summary */}
            <div className={`p-4 rounded-xl border ${getRiskBgColor(riskAnalysis?.risk_level)} ${
              riskAnalysis?.risk_level === 'high' ? 'border-red-200' : 
              riskAnalysis?.risk_level === 'medium' ? 'border-amber-200' : 'border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-xl font-bold text-slate-800">₹{Number(amount).toLocaleString('en-IN')}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="text-right">
                  <p className="text-sm text-slate-500">To</p>
                  <p className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">{upiId}</p>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {riskAnalysis?.factors?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  Analysis Details
                </p>
                <div className="space-y-2 max-h-[100px] overflow-y-auto pr-2">
                  {riskAnalysis.factors.map((factor, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                        riskAnalysis?.risk_level === 'high' ? 'bg-red-500' : 
                        riskAnalysis?.risk_level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <p className="text-sm text-slate-600">{factor}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {riskAnalysis?.risk_level !== 'high' ? (
                <Button
                  onClick={handleConfirm}
                  className={`w-full h-12 rounded-xl font-semibold shadow-lg transition-all ${
                    riskAnalysis?.risk_level === 'low' 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  {riskAnalysis?.risk_level === 'low' ? 'Proceed Safely' : 'Proceed with Caution'}
                </Button>
              ) : (
                <>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-700 text-sm">High Risk Transaction</p>
                        <p className="text-xs text-red-600 mt-0.5">This transaction has been flagged as potentially fraudulent.</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={proceedAnyway}
                    variant="outline"
                    className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-medium"
                  >
                    I understand the risks, proceed anyway
                  </Button>
                </>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full h-10 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                Cancel Transaction
              </Button>
            </div>
          </motion.div>
        )

      case 'blocked':
        return (
          <motion.div 
            className="flex flex-col items-center py-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Transaction Blocked</h3>
            <p className="text-slate-500 text-center text-sm mb-4">
              For your protection, this transaction has been blocked
            </p>
            
            <div className="w-full p-4 bg-red-50 rounded-xl border border-red-100 mb-4">
              <p className="text-xs font-medium text-red-700 mb-2">Reasons:</p>
              <div className="space-y-1">
                {riskAnalysis?.factors?.map((factor, idx) => (
                  <p key={idx} className="text-sm text-red-600 flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-400 rounded-full" />
                    {factor}
                  </p>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 w-full">
              <Button
                onClick={proceedAnyway}
                variant="outline"
                className="flex-1 h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              >
                Override
              </Button>
              <Button 
                onClick={onClose} 
                className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-900"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )

      case 'processing':
        return (
          <motion.div 
            className="flex flex-col items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-blue-100 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Send className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Processing Payment</h3>
            <p className="text-slate-500 text-center text-sm">Securing your transaction...</p>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected by AI Fraud Detection</span>
            </div>
          </motion.div>
        )

      case 'success':
        return (
          <motion.div 
            className="flex flex-col items-center py-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div 
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.1 }}
            >
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Payment Successful!</h3>
            <p className="text-slate-500 text-sm mb-4">Your money has been sent</p>
            
            <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
              <div className="text-center mb-3">
                <p className="text-3xl font-bold text-slate-800">₹{Number(amount).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Sent to</span>
                <span className="font-medium text-slate-700">{upiId}</span>
              </div>
            </div>
            
            <Button
              onClick={onClose}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25"
            >
              Done
            </Button>
          </motion.div>
        )

      case 'error':
        return (
          <motion.div 
            className="flex flex-col items-center py-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div 
              className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            >
              <XCircle className="w-10 h-10 text-red-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Payment Failed</h3>
            <p className="text-slate-500 text-sm text-center mb-4">
              Something went wrong. Please try again.
            </p>
            
            <div className="w-full p-4 bg-red-50 rounded-xl border border-red-100 mb-4">
              <p className="text-sm text-red-600 text-center">
                Your account was not charged
              </p>
            </div>
            
            <Button
              onClick={onClose}
              className="w-full h-12 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-xl font-semibold"
            >
              Close
            </Button>
          </motion.div>
        )
    }
  }

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={`relative overflow-hidden ${
            currentStep === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
            currentStep === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' :
            currentStep === 'blocked' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
            currentStep === 'risk_review' && riskAnalysis?.risk_level === 'high' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 
            currentStep === 'risk_review' && riskAnalysis?.risk_level === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
            currentStep === 'risk_review' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
            'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {currentStep === 'success' ? <CheckCircle className="w-5 h-5 text-white" /> :
                   currentStep === 'error' || currentStep === 'blocked' ? <XCircle className="w-5 h-5 text-white" /> :
                   currentStep === 'risk_review' ? <Shield className="w-5 h-5 text-white" /> :
                   currentStep === 'processing' ? <Loader2 className="w-5 h-5 text-white animate-spin" /> :
                   <Send className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {currentStep === 'details' && 'Confirm Payment'}
                    {currentStep === 'risk_review' && 'Security Check'}
                    {currentStep === 'blocked' && 'Transaction Blocked'}
                    {currentStep === 'processing' && 'Processing'}
                    {currentStep === 'success' && 'Success!'}
                    {currentStep === 'error' && 'Failed'}
                  </h2>
                  <p className="text-white/70 text-xs">
                    {currentStep === 'details' && 'Review your transaction'}
                    {currentStep === 'risk_review' && 'AI analysis complete'}
                    {currentStep === 'blocked' && 'Security alert'}
                    {currentStep === 'processing' && 'Please wait...'}
                    {currentStep === 'success' && 'Payment complete'}
                    {currentStep === 'error' && 'Please try again'}
                  </p>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl h-9 w-9"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default TransactionSimulation

