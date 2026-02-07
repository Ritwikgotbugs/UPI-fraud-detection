import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle, Clock, FileText, Loader2, Send, Shield, ShieldAlert, ShieldCheck, Sparkles, User, UserX, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { calculateTrustScore, RISK_WEIGHTS } from '../../lib/riskCalculator';
import { db } from './firebase';

const API_BASE = 'https://rxcq.pythonanywhere.com';


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

const TransactionSimulation = ({ upiId, amount, remarks, senderUPI, onClose, initialRecipientProfile = null }) => {
  const isSelfTransfer = (upiId || '').trim().toLowerCase() === (senderUPI || '').trim().toLowerCase();
  const [currentStep, setCurrentStep] = useState('details')
  const [isLoading, setIsLoading] = useState(false)
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [recipientProfileData, setRecipientProfileData] = useState(null)
  const [checkingRecipient, setCheckingRecipient] = useState(true)
  const [activeRules, setActiveRules] = useState([]);
  const [isAdminBlocked, setIsAdminBlocked] = useState(false);
  const [alertsCreatedForTransaction, setAlertsCreatedForTransaction] = useState(false);
  const { refreshData, userData } = useAuth();

  // Real-time rules listener - always gets latest enabled rules
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'rules'),
      (snapshot) => {
        const rules = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.enabled === true); // Only include explicitly enabled rules
        console.log('Active rules updated:', rules.length, 'enabled rules');
        setActiveRules(rules);
      },
      (error) => {
        console.error("Error listening to rules:", error);
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Create alerts immediately when rules trigger on risk analysis
  useEffect(() => {
    const createAlertsForTriggeredRules = async () => {
      // Only run once per transaction, when we have risk analysis and active rules
      if (!riskAnalysis || !activeRules.length || alertsCreatedForTransaction) return;
      
      console.log('🔔 Evaluating rules for immediate alert creation...');
      
      const params = recipientProfileData?.params || {};
      const context = {
        amount: Number(amount),
        hour: new Date().getHours(),
        risk_score: riskAnalysis?.risk_score || 0,
        social_trust_score: Number(params.socialTrustScore || 0),
        recipient_blacklist_status: Number(params.recipientBlacklistStatus || 0),
        fraud_complaints_count: Number(params.fraudComplaintsCount || 0),
        account_age: Number(params.accountAge || 0),
        vpn_proxy_usage: Number(params.vpnProxyUsage || 0)
      };
      
      const triggeredFlags = [];
      const triggeredBlocks = [];
      const triggeredRiskMods = [];
      
      activeRules.forEach(rule => {
        if (rule.enabled !== true) return;
        
        let isTriggered = false;
        
        if (rule.conditions && Array.isArray(rule.conditions)) {
          isTriggered = rule.conditions.every(cond => {
            const val = context[cond.field];
            const target = Number(cond.value);
            const op = cond.operator;
            if (op === '>') return val > target;
            if (op === '<') return val < target;
            if (op === '>=') return val >= target;
            if (op === '<=') return val <= target;
            if (op === '==') return val == target;
            if (op === '!=') return val != target;
            return false;
          });
        } else if (rule.condition) {
          const val = context[rule.condition.field];
          const target = Number(rule.condition.value);
          const op = rule.condition.operator;
          if (op === '>') isTriggered = val > target;
          else if (op === '<') isTriggered = val < target;
          else if (op === '>=') isTriggered = val >= target;
          else if (op === '<=') isTriggered = val <= target;
          else if (op === '==') isTriggered = val == target;
          else if (op === '!=') isTriggered = val != target;
        }
        
        if (isTriggered) {
          console.log(`🎯 Rule "${rule.name}" (action: ${rule.action}) TRIGGERED`);
          if (rule.action === 'flag') triggeredFlags.push(rule);
          else if (rule.action === 'block') triggeredBlocks.push(rule);
          else if (rule.action === 'add_risk') triggeredRiskMods.push(rule);
        }
      });
      
      // Create FLAG alerts immediately
      if (triggeredFlags.length > 0) {
        console.log('🚩 Creating FLAG alert in Firestore for', triggeredFlags.length, 'flag rules');
        try {
          const docRef = await addDoc(collection(db, 'alerts'), {
            type: 'FLAG',
            severity: 'medium',
            title: 'Security Pattern Detected',
            message: `Warning flag raised for ₹${amount} transaction - ${triggeredFlags.length} pattern(s) matched.`,
            details: triggeredFlags.map(f => f.name).join(', '),
            pattern: triggeredFlags.map(f => f.name).join('; '),
            transaction_amount: Number(amount),
            sender_upi: senderUPI,
            recipient_upi: upiId,
            risk_score: riskAnalysis?.risk_score || 0,
            triggered_rules: triggeredFlags.map(f => ({ id: f.id, name: f.name })),
            createdAt: serverTimestamp(),
            read: false
          });
          console.log('✅ FLAG alert created in Firestore:', docRef.id);
        } catch (e) {
          console.error('❌ Failed to create FLAG alert:', e);
        }
      }
      
      // Handle BLOCK - set blocked state
      if (triggeredBlocks.length > 0) {
        console.log('🚫 BLOCK rule triggered - blocking transaction');
        setIsAdminBlocked(true);
        try {
          const docRef = await addDoc(collection(db, 'alerts'), {
            type: 'BLOCK',
            severity: 'high',
            title: 'Transaction Blocked',
            message: `Transaction of ₹${amount} blocked by security rules.`,
            details: triggeredBlocks.map(b => b.name).join(', '),
            transaction_amount: Number(amount),
            sender_upi: senderUPI,
            recipient_upi: upiId,
            risk_score: riskAnalysis?.risk_score || 0,
            triggered_rules: triggeredBlocks.map(b => ({ id: b.id, name: b.name })),
            createdAt: serverTimestamp(),
            read: false
          });
          console.log('✅ BLOCK alert created in Firestore:', docRef.id);
        } catch (e) {
          console.error('❌ Failed to create BLOCK alert:', e);
        }
        setCurrentStep('blocked');
      }
      
      // Create RISK_MODIFIER alerts and ACTUALLY update trust score in Firestore
      if (triggeredRiskMods.length > 0) {
        console.log('⚠️ RISK_MODIFIER rules triggered:', triggeredRiskMods.length);
        
        // Calculate trust score decrease based on risk score
        // Formula: Higher risk = more trust decrease
        const mlRiskScore = riskAnalysis?.risk_score || 50;
        const trustDecrease = Math.min(30, Math.max(5, Math.round(mlRiskScore / 3))); // 5-30 decrease based on risk
        
        try {
          // 1. Find and update the recipient's trust score in Firestore
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("upiId", "==", upiId.toLowerCase()));
          const snapshot = await getDocs(q);
          
          let oldTrustScore = 100;
          let newTrustScore = 100;
          
          if (!snapshot.empty) {
            const { updateDoc } = await import("firebase/firestore");
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            oldTrustScore = userData?.transactionDetails?.socialTrustScore || 100;
            newTrustScore = Math.max(0, oldTrustScore - trustDecrease);
            
            // Actually update the user's trust score in Firestore
            await updateDoc(userDoc.ref, {
              'transactionDetails.socialTrustScore': newTrustScore
            });
            console.log(`✅ Trust score updated in Firestore: ${oldTrustScore} → ${newTrustScore} (-${trustDecrease})`);
          } else {
            console.log('⚠️ Recipient user not found in Firestore, cannot update trust score');
          }
          
          // 2. Create the RISK_MODIFIER alert with full details
          const docRef = await addDoc(collection(db, 'alerts'), {
            type: 'RISK_MODIFIER',
            severity: 'medium',
            title: 'Trust Score Decreased',
            message: `Trust score decreased from ${oldTrustScore} to ${newTrustScore} (-${trustDecrease}) for suspicious activity.`,
            details: triggeredRiskMods.map(r => r.name).join(', '),
            transaction_amount: Number(amount),
            sender_upi: senderUPI,
            recipient_upi: upiId,
            risk_score: mlRiskScore,
            old_trust_score: oldTrustScore,
            new_trust_score: newTrustScore,
            trust_decrease: trustDecrease,
            triggered_rules: triggeredRiskMods.map(r => ({ id: r.id, name: r.name })),
            createdAt: serverTimestamp(),
            read: false
          });
          console.log('✅ RISK_MODIFIER alert created in Firestore:', docRef.id);
        } catch (e) {
          console.error('❌ Failed to update trust score or create alert:', e);
        }
      }
      
      setAlertsCreatedForTransaction(true);
    };
    
    createAlertsForTriggeredRules();
  }, [riskAnalysis, activeRules, alertsCreatedForTransaction, amount, senderUPI, upiId, recipientProfileData]);


  useEffect(() => {
    const fetchRecipientProfile = async () => {
      if (initialRecipientProfile) {
        setRecipientProfileData(initialRecipientProfile);
        setCheckingRecipient(false);
        try {
          const offline = generateOfflineRiskAnalysis(initialRecipientProfile);
          setRiskAnalysis(offline);
          setCurrentStep('risk_review');
        } catch (e) { }
        return;
      }
      if (!upiId) {
        setCheckingRecipient(false);
        return;
      }

      try {

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("upiId", "==", upiId.toLowerCase()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const recipientData = snapshot.docs[0].data();
          const formattedData = {
            ...recipientData,
            params: recipientData.transactionDetails || recipientData.params || {},
            modelData: recipientData.modelData || {}
          };

          setRecipientProfileData(formattedData);

          setTimeout(() => {
            try {
              setRiskAnalysis(generateOfflineRiskAnalysis(formattedData));
            } catch (e) {
              console.error("Error generating risk analysis:", e);
            }
          }, 0);
        }
      } catch (error) {
        console.error("Error fetching recipient profile:", error);
      } finally {
        setCheckingRecipient(false);
      }
    };

    fetchRecipientProfile();
  }, [upiId]);


  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);


  const generateOfflineRiskAnalysis = (profileData = recipientProfileData) => {
    // Use the centralized risk calculator
    const params = profileData?.params || profileData?.transactionDetails || {};
    
    // Calculate trust score from recipient's profile
    const { trustScore, riskScore: calculatedRisk, breakdown } = calculateTrustScore(params, []);
    
    // Risk score shown to sender = 100 - recipient's trust score
    let riskScore = calculatedRisk;
    const factors = [];

    // Add factors from the breakdown
    breakdown.forEach(item => {
      if (item.impact < 0) {
        factors.push(`${item.factor} (${Math.abs(item.impact).toFixed(1)}% weight)`);
      }
    });

    // Add amount-based risk
    const txAmount = Number(amount || 0);
    if (txAmount > 50000) {
      riskScore += RISK_WEIGHTS.transactionAmount;
      factors.push(`Very high transaction amount ₹${txAmount.toLocaleString()} (${RISK_WEIGHTS.transactionAmount}% weight)`);
    } else if (txAmount > 10000) {
      const impact = RISK_WEIGHTS.transactionAmount * 0.6;
      riskScore += impact;
      factors.push(`High transaction amount ₹${txAmount.toLocaleString()} (${impact.toFixed(1)}% weight)`);
    } else if (txAmount > 5000) {
      const impact = RISK_WEIGHTS.transactionAmount * 0.3;
      riskScore += impact;
      factors.push(`Moderate transaction amount ₹${txAmount.toLocaleString()} (${impact.toFixed(1)}% weight)`);
    }

    // Additional profile-specific factors for display
    if (params.recipientBlacklistStatus) {
      if (!factors.some(f => f.includes('Blacklist'))) {
        factors.unshift('⚠️ Recipient is on a blacklist');
      }
    }

    if ((params.fraudComplaintsCount || 0) > 0 && !factors.some(f => f.includes('complaint'))) {
      factors.push(`${params.fraudComplaintsCount} fraud complaints filed against recipient`);
    }

    if (params.vpnProxyUsage && !factors.some(f => f.includes('VPN'))) {
      factors.push('Recipient uses VPN/Proxy services');
    }

    if (params.accountAge && params.accountAge < 30 && !factors.some(f => f.includes('days old'))) {
      factors.push(`Recipient account is only ${params.accountAge} days old`);
    }

    // Show recipient's trust score as a factor
    const recipientTrust = params.socialTrustScore || trustScore;
    if (recipientTrust < 50) {
      factors.push(`Recipient trust score: ${Math.round(recipientTrust)}/100`);
    }

    // If no risk factors, add a positive note
    if (factors.length === 0) {
      factors.push('✅ No risk factors detected');
    }

    // Time-based risk
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) {
      riskScore += RISK_WEIGHTS.highRiskTransactionTimes || 5;
      factors.push('Late night transaction (high-risk hours)');
    }

    // Cap at 100
    const finalScore = Math.min(100, Math.max(0, Math.round(riskScore)));
    const isHighRisk = finalScore >= 60;
    const isMediumRisk = finalScore >= 35 && finalScore < 60;

    return {
      risk_score: finalScore,
      risk_level: isHighRisk ? 'high' : isMediumRisk ? 'medium' : 'low',
      should_block: isHighRisk,
      requires_verification: isMediumRisk,
      factors,
      recommendations: isHighRisk
        ? ['Transaction is high risk - proceed with extreme caution', 'Verify recipient identity before proceeding']
        : isMediumRisk
          ? ['Verify transaction details carefully', 'Confirm you know this recipient']
          : ['Transaction appears safe'],
      offline: true,
      recipientProfile: profileData?.params || profileData?.transactionDetails || null,
      trustScore: trustScore,
      breakdown: breakdown
    };
  };


  const evaluateRules = (analysisResults = riskAnalysis) => {
    console.log('Evaluating rules. Active rules count:', activeRules.length);
    
    if (!activeRules.length) {
      console.log('No active rules to evaluate');
      return { block: false, blockReasons: [], flags: [], riskModifiers: [] };
    }

    const triggeredBlocks = [];
    const triggeredFlags = [];  // For 'flag' action - goes to detected patterns
    const triggeredRiskModifiers = [];  // For 'add_risk' action - affects trust score

    const params = recipientProfileData?.params || {};
    const mlRiskScore = analysisResults?.risk_score || 0;
    const context = {
      amount: Number(amount),
      hour: new Date().getHours(),
      risk_score: mlRiskScore,
      social_trust_score: Number(params.socialTrustScore || 0),
      recipient_blacklist_status: Number(params.recipientBlacklistStatus || 0),
      fraud_complaints_count: Number(params.fraudComplaintsCount || 0),
      account_age: Number(params.accountAge || 0),
      vpn_proxy_usage: Number(params.vpnProxyUsage || 0)
    };
    
    console.log('Rule evaluation context:', context);

    activeRules.forEach(rule => {
      // Skip disabled rules - triple check (should already be filtered, but safety first)
      if (rule.enabled !== true) {
        console.log(`Skipping rule "${rule.name}" - not enabled (enabled=${rule.enabled})`);
        return;
      }

      let isTriggered = false;

      // New multi-condition support (LOGICAL AND)
      if (rule.conditions && Array.isArray(rule.conditions)) {
        isTriggered = rule.conditions.every(cond => {
          const val = context[cond.field];
          const target = Number(cond.value);
          const op = cond.operator;
          if (op === '>') return val > target;
          if (op === '<') return val < target;
          if (op === '>=') return val >= target;
          if (op === '<=') return val <= target;
          if (op === '==') return val == target;
          if (op === '!=') return val != target;
          return false;
        });
      }
      // Legacy single condition support
      else if (rule.condition) {
        const val = context[rule.condition.field];
        const target = Number(rule.condition.value);
        const op = rule.condition.operator;
        if (op === '>') isTriggered = val > target;
        else if (op === '<') isTriggered = val < target;
        else if (op === '>=') isTriggered = val >= target;
        else if (op === '<=') isTriggered = val <= target;
        else if (op === '==') isTriggered = val == target;
        else if (op === '!=') isTriggered = val != target;
      }

      console.log(`Rule "${rule.name}" (action: ${rule.action}, enabled: ${rule.enabled}): triggered = ${isTriggered}`);

      if (isTriggered) {
        switch (rule.action) {
          case 'block':
            // Immediate Block: Block transaction + raise alert in alerts panel
            console.log(`🚫 BLOCK triggered by rule: ${rule.name}`);
            triggeredBlocks.push(rule.name);
            break;
          case 'flag':
            // Raise Warning Flag: Create alert for detected patterns in overview
            console.log(`🚩 FLAG triggered by rule: ${rule.name}`);
            triggeredFlags.push({ 
              name: rule.name, 
              modifier: rule.risk_modifier || 20,
              severity: 'medium'
            });
            break;
          case 'add_risk':
            // Increase Risk Score: Decrease trust score based on ML risk
            // Formula: trustScoreDecrease = 100 - mlRiskScore (so 90% risk = -10 trust)
            const trustDecrease = 100 - mlRiskScore;
            console.log(`⚠️ RISK MODIFIER triggered by rule: ${rule.name}, trust decrease: ${trustDecrease}`);
            triggeredRiskModifiers.push({ 
              name: rule.name, 
              riskModifier: rule.risk_modifier || 20,
              trustScoreDecrease: Math.max(0, trustDecrease),
              mlRiskScore: mlRiskScore
            });
            break;
          default:
            console.log(`Unknown action "${rule.action}" for rule: ${rule.name}, treating as flag`);
            triggeredFlags.push({ name: rule.name, modifier: rule.risk_modifier || 20 });
        }
      }
    });

    const result = {
      block: triggeredBlocks.length > 0,
      blockReasons: triggeredBlocks,
      flags: triggeredFlags,  // Warning flags for detected patterns
      riskModifiers: triggeredRiskModifiers  // Risk score modifiers for trust score
    };
    
    console.log('Rule evaluation result:', result);
    return result;
  };

  const analyzeRisk = async () => {
    setIsAnalyzing(true);
    try {

      const recipientParams = recipientProfileData?.params || {};
      const recipientModelData = recipientProfileData?.modelData || {};

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
          location: {},

          recipientProfile: recipientProfileData ? {
            isBlacklisted: recipientParams.recipientBlacklistStatus,
            verificationStatus: recipientParams.recipientVerificationStatus,
            fraudComplaints: recipientParams.fraudComplaintsCount,
            pastFraudFlags: recipientParams.pastFraudulentBehavior,
            geoLocation: recipientParams.geoLocationFlags,
            vpnUsage: recipientParams.vpnProxyUsage,
            accountAge: recipientParams.accountAge,
            socialTrustScore: recipientParams.socialTrustScore,
            deviceTrust: recipientParams.deviceFingerprinting,
            behavioralBiometrics: recipientParams.behavioralBiometrics,
            modelData: recipientModelData
          } : null
        })
      });

      console.log('API response status:', response.status, 'ok:', response.ok);

      if (response.ok) {
        console.log('✅ API SUCCESS PATH - will evaluate rules and create alerts');
        const result = await response.json();
        let analysis = result.risk_assessment;


        if (recipientProfileData?.params) {
          const additionalFactors = [];

          if (recipientParams.recipientBlacklistStatus) {
            additionalFactors.push('⚠️ Recipient is on a blacklist');
          }
          if (recipientParams.fraudComplaintsCount > 0) {
            additionalFactors.push(`${recipientParams.fraudComplaintsCount} fraud complaints against recipient`);
          }
          if (recipientParams.pastFraudulentBehavior > 0) {
            additionalFactors.push(`${recipientParams.pastFraudulentBehavior} past fraud flags on recipient`);
          }
          if (recipientParams.recipientVerificationStatus === 'unverified') {
            additionalFactors.push('Recipient account is unverified');
          }
          if (recipientParams.accountAge && recipientParams.accountAge < 30) {
            additionalFactors.push(`Recipient account is only ${recipientParams.accountAge} days old`);
          }
          if (recipientParams.socialTrustScore && recipientParams.socialTrustScore < 30) {
            additionalFactors.push(`Recipient has low trust score (${recipientParams.socialTrustScore})`);
          }


          let additionalRisk = 0;
          if (recipientParams.recipientBlacklistStatus) additionalRisk += 30;
          if (recipientParams.fraudComplaintsCount > 0) additionalRisk += recipientParams.fraudComplaintsCount * 5;
          if (recipientParams.recipientVerificationStatus === 'unverified') additionalRisk += 15;

          analysis = {
            ...analysis,
            risk_score: Math.min(100, (analysis.risk_score || 0) + additionalRisk),
            factors: [...additionalFactors, ...(analysis.factors || [])],
            recipientProfile: recipientParams
          };


          if (analysis.risk_score >= 60) {
            analysis.risk_level = 'high';
            analysis.should_block = true;
          } else if (analysis.risk_score >= 35) {
            analysis.risk_level = 'medium';
            analysis.requires_verification = true;
          }
        }

        const ruleCheck = evaluateRules(analysis);
        const totalModifier = ruleCheck.flags.reduce((sum, f) => sum + f.modifier, 0);
        const riskModifierTotal = ruleCheck.riskModifiers.reduce((sum, m) => sum + m.riskModifier, 0);

        analysis = {
          ...analysis,
          risk_score: Math.min(100, (analysis.risk_score || 0) + totalModifier + riskModifierTotal),
          factors: [
            ...ruleCheck.flags.map(f => `🚩 WARNING FLAG: ${f.name}`),
            ...ruleCheck.riskModifiers.map(m => `⚠️ RISK INCREASED: ${m.name} (Trust -${m.trustScoreDecrease})`),
            ...(analysis.factors || [])
          ],
        };

        if (ruleCheck.block) {
          analysis.should_block = true;
          analysis.factors = [`🚫 BLOCKED BY ADMIN RULE: ${ruleCheck.blockReasons[0]}`, ...analysis.factors];
        }

        // Handle alerts based on rule action types
        console.log('📢 About to create alerts. Block:', ruleCheck.block, 'Flags:', ruleCheck.flags.length, 'RiskMods:', ruleCheck.riskModifiers.length);
        try {
          // 1. IMMEDIATE BLOCK - Alert in Alerts Panel
          if (ruleCheck.block) {
            await addDoc(collection(db, 'alerts'), {
              type: 'BLOCK',
              severity: 'high',
              title: 'Transaction Blocked',
              message: `Transaction of ₹${amount} was blocked by security rules.`,
              details: ruleCheck.blockReasons.join(', '),
              transaction_amount: Number(amount),
              sender_upi: senderUPI,
              recipient_upi: upiId,
              risk_score: analysis.risk_score,
              createdAt: serverTimestamp(),
              read: false
            });
          }
          
          // 2. RAISE WARNING FLAG - Alert in Detected Patterns (Overview)
          if (ruleCheck.flags.length > 0) {
            console.log('🚩 [analyzeRisk] Creating FLAG alert for', ruleCheck.flags.length, 'flags');
            const flagAlertData = {
              type: 'FLAG',
              severity: 'medium',
              title: 'Security Pattern Detected',
              message: `Warning flag raised for ₹${amount} transaction - matches ${ruleCheck.flags.length} rule pattern(s).`,
              details: ruleCheck.flags.map(f => f.name).join(', '),
              pattern: ruleCheck.flags.map(f => f.name).join('; '),
              transaction_amount: Number(amount),
              sender_upi: senderUPI,
              recipient_upi: upiId,
              risk_score: analysis.risk_score,
              createdAt: serverTimestamp(),
              read: false
            };
            console.log('FLAG alert data:', flagAlertData);
            const docRef = await addDoc(collection(db, 'alerts'), flagAlertData);
            console.log('✅ [analyzeRisk] FLAG alert created with ID:', docRef.id);
          } else {
            console.log('No flags triggered in analyzeRisk');
          }
          
          // 3. INCREASE RISK SCORE - Decrease Trust Score in recipient's profile
          if (ruleCheck.riskModifiers.length > 0) {
            // Update recipient's trust score in Firestore
            const totalTrustDecrease = ruleCheck.riskModifiers.reduce((sum, m) => sum + m.trustScoreDecrease, 0);
            
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("upiId", "==", upiId.toLowerCase()));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              const { updateDoc } = await import("firebase/firestore");
              const userDoc = snapshot.docs[0];
              const currentTrust = userDoc.data()?.transactionDetails?.socialTrustScore || 100;
              const newTrustScore = Math.max(0, currentTrust - totalTrustDecrease);
              
              await updateDoc(userDoc.ref, {
                'transactionDetails.socialTrustScore': newTrustScore
              });
            }
            
            // Create alert for the risk modification
            await addDoc(collection(db, 'alerts'), {
              type: 'RISK_MODIFIER',
              severity: 'medium',
              title: 'Trust Score Modified',
              message: `Trust score decreased by ${totalTrustDecrease} for ${upiId} due to risk rules.`,
              details: ruleCheck.riskModifiers.map(m => `${m.name} (Risk: ${m.mlRiskScore}%)`).join(', '),
              transaction_amount: Number(amount),
              sender_upi: senderUPI,
              recipient_upi: upiId,
              trust_decrease: totalTrustDecrease,
              risk_score: analysis.risk_score,
              createdAt: serverTimestamp(),
              read: false
            });
          }
        } catch (alertError) {
          console.error('Error creating alerts:', alertError);
        }

        setRiskAnalysis(analysis);
        setCurrentStep('risk_review');
      } else {
        // API failed - use offline analysis but still evaluate rules
        console.log('API failed, using offline analysis');
        let offlineAnalysis = generateOfflineRiskAnalysis();
        
        // Still evaluate rules even in offline mode
        const ruleCheck = evaluateRules(offlineAnalysis);
        console.log('Offline mode - Rule check result:', ruleCheck);
        
        // Apply rule modifiers to analysis
        const totalModifier = ruleCheck.flags.reduce((sum, f) => sum + f.modifier, 0);
        const riskModifierTotal = ruleCheck.riskModifiers.reduce((sum, m) => sum + m.riskModifier, 0);
        
        offlineAnalysis = {
          ...offlineAnalysis,
          risk_score: Math.min(100, (offlineAnalysis.risk_score || 0) + totalModifier + riskModifierTotal),
          factors: [
            ...ruleCheck.flags.map(f => `🚩 WARNING FLAG: ${f.name}`),
            ...ruleCheck.riskModifiers.map(m => `⚠️ RISK INCREASED: ${m.name}`),
            ...(offlineAnalysis.factors || [])
          ],
        };
        
        if (ruleCheck.block) {
          offlineAnalysis.should_block = true;
          offlineAnalysis.factors = [`🚫 BLOCKED BY ADMIN RULE: ${ruleCheck.blockReasons[0]}`, ...offlineAnalysis.factors];
        }
        
        // Create alerts for triggered rules
        try {
          if (ruleCheck.block) {
            console.log('🚫 [offline] Creating BLOCK alert');
            await addDoc(collection(db, 'alerts'), {
              type: 'BLOCK',
              severity: 'high',
              title: 'Transaction Blocked',
              message: `Transaction of ₹${amount} was blocked by security rules.`,
              details: ruleCheck.blockReasons.join(', '),
              transaction_amount: Number(amount),
              sender_upi: senderUPI,
              recipient_upi: upiId,
              risk_score: offlineAnalysis.risk_score,
              createdAt: serverTimestamp(),
              read: false
            });
          }
          
          if (ruleCheck.flags.length > 0) {
            console.log('🚩 [offline] Creating FLAG alert for', ruleCheck.flags.length, 'flags');
            const docRef = await addDoc(collection(db, 'alerts'), {
              type: 'FLAG',
              severity: 'medium',
              title: 'Security Pattern Detected',
              message: `Warning flag raised for ₹${amount} transaction.`,
              details: ruleCheck.flags.map(f => f.name).join(', '),
              pattern: ruleCheck.flags.map(f => f.name).join('; '),
              transaction_amount: Number(amount),
              sender_upi: senderUPI,
              recipient_upi: upiId,
              risk_score: offlineAnalysis.risk_score,
              createdAt: serverTimestamp(),
              read: false
            });
            console.log('✅ [offline] FLAG alert created:', docRef.id);
          }
          
          if (ruleCheck.riskModifiers.length > 0) {
            const totalTrustDecrease = ruleCheck.riskModifiers.reduce((sum, m) => sum + m.trustScoreDecrease, 0);
            await addDoc(collection(db, 'alerts'), {
              type: 'RISK_MODIFIER',
              severity: 'medium',
              title: 'Trust Score Modified',
              message: `Trust score impact for ${upiId} due to risk rules.`,
              details: ruleCheck.riskModifiers.map(m => m.name).join(', '),
              transaction_amount: Number(amount),
              sender_upi: senderUPI,
              recipient_upi: upiId,
              trust_decrease: totalTrustDecrease,
              risk_score: offlineAnalysis.risk_score,
              createdAt: serverTimestamp(),
              read: false
            });
          }
        } catch (alertError) {
          console.error('Error creating alerts in offline mode:', alertError);
        }
        
        setRiskAnalysis(offlineAnalysis);
        setCurrentStep('risk_review');
      }
    } catch (error) {
      console.error('Risk analysis failed:', error);
      
      // Error case - still evaluate rules
      let offlineAnalysis = generateOfflineRiskAnalysis();
      
      const ruleCheck = evaluateRules(offlineAnalysis);
      console.log('Error fallback - Rule check result:', ruleCheck);
      
      // Apply rule modifiers
      const totalModifier = ruleCheck.flags.reduce((sum, f) => sum + f.modifier, 0);
      offlineAnalysis = {
        ...offlineAnalysis,
        risk_score: Math.min(100, (offlineAnalysis.risk_score || 0) + totalModifier),
        factors: [
          ...ruleCheck.flags.map(f => `🚩 WARNING FLAG: ${f.name}`),
          ...(offlineAnalysis.factors || [])
        ],
      };
      
      if (ruleCheck.block) {
        offlineAnalysis.should_block = true;
        offlineAnalysis.factors = [`🚫 BLOCKED BY ADMIN RULE: ${ruleCheck.blockReasons[0]}`, ...offlineAnalysis.factors];
      }
      
      // Create alerts even on error
      try {
        if (ruleCheck.block) {
          await addDoc(collection(db, 'alerts'), {
            type: 'BLOCK',
            severity: 'high',
            title: 'Transaction Blocked',
            message: `Transaction of ₹${amount} was blocked by security rules.`,
            details: ruleCheck.blockReasons.join(', '),
            transaction_amount: Number(amount),
            sender_upi: senderUPI,
            recipient_upi: upiId,
            risk_score: offlineAnalysis.risk_score,
            createdAt: serverTimestamp(),
            read: false
          });
        }
        
        if (ruleCheck.flags.length > 0) {
          console.log('🚩 [error fallback] Creating FLAG alert');
          await addDoc(collection(db, 'alerts'), {
            type: 'FLAG',
            severity: 'medium',
            title: 'Security Pattern Detected',
            message: `Warning flag raised for ₹${amount} transaction.`,
            details: ruleCheck.flags.map(f => f.name).join(', '),
            pattern: ruleCheck.flags.map(f => f.name).join('; '),
            transaction_amount: Number(amount),
            sender_upi: senderUPI,
            recipient_upi: upiId,
            risk_score: offlineAnalysis.risk_score,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      } catch (alertError) {
        console.error('Error creating alerts in error fallback:', alertError);
      }

      setRiskAnalysis(offlineAnalysis);
      setCurrentStep('risk_review');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    console.log('🔵 handleConfirm called - will evaluate rules and create alerts');

    // 0. CHECK RULES FIRST - REAL TIME ENFORCEMENT
    const ruleCheck = evaluateRules();
    console.log('🔵 handleConfirm rule check:', ruleCheck);
    
    // Handle IMMEDIATE BLOCK action
    if (ruleCheck.block) {
      setIsAdminBlocked(true);

      // Create Admin Alert for BLOCK
      try {
        await addDoc(collection(db, 'alerts'), {
          type: 'BLOCK',
          severity: 'high',
          title: 'Transaction Blocked',
          message: `Transaction of ₹${amount} from ${senderUPI} was blocked by security rules.`,
          details: ruleCheck.blockReasons.join(', '),
          transaction_amount: Number(amount),
          sender_upi: senderUPI,
          recipient_upi: upiId,
          createdAt: serverTimestamp(),
          read: false
        });
      } catch (e) {
        console.error("Alert generation failed:", e);
      }

      setRiskAnalysis(prev => ({
        ...prev,
        should_block: true,
        factors: [...(prev?.factors || []), ...ruleCheck.blockReasons.map(r => `🚫 BLOCKED BY ADMIN RULE: ${r}`)]
      }));
      setCurrentStep('blocked');
      return;
    }

    // Handle WARNING FLAG action - Create alert in detected patterns
    if (ruleCheck.flags.length > 0) {
      console.log('🚩 Creating FLAG alert for', ruleCheck.flags.length, 'flags:', ruleCheck.flags.map(f => f.name));
      try {
        const flagAlert = {
          type: 'FLAG',
          severity: 'medium',
          title: 'Security Pattern Detected',
          message: `Warning flag raised for ₹${amount} transaction from ${senderUPI}.`,
          details: ruleCheck.flags.map(f => f.name).join(', '),
          pattern: ruleCheck.flags.map(f => f.name).join('; '),
          transaction_amount: Number(amount),
          sender_upi: senderUPI,
          recipient_upi: upiId,
          risk_score: riskAnalysis?.risk_score || 0,
          createdAt: serverTimestamp(),
          read: false
        };
        console.log('FLAG alert data:', flagAlert);
        const docRef = await addDoc(collection(db, 'alerts'), flagAlert);
        console.log('✅ FLAG alert created with ID:', docRef.id);
      } catch (e) {
        console.error("❌ Warning flag alert failed:", e);
      }
    } else {
      console.log('No flags triggered, skipping FLAG alert creation');
    }

    // Handle INCREASE RISK SCORE action - Decrease trust score
    if (ruleCheck.riskModifiers.length > 0) {
      try {
        const totalTrustDecrease = ruleCheck.riskModifiers.reduce((sum, m) => sum + m.trustScoreDecrease, 0);
        
        // Update recipient's trust score in Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("upiId", "==", upiId.toLowerCase()));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const { updateDoc } = await import("firebase/firestore");
          const userDoc = snapshot.docs[0];
          const currentTrust = userDoc.data()?.transactionDetails?.socialTrustScore || 100;
          const newTrustScore = Math.max(0, currentTrust - totalTrustDecrease);
          
          await updateDoc(userDoc.ref, {
            'transactionDetails.socialTrustScore': newTrustScore
          });
        }
        
        // Create alert for trust score modification
        await addDoc(collection(db, 'alerts'), {
          type: 'RISK_MODIFIER',
          severity: 'medium',
          title: 'Trust Score Modified',
          message: `Trust score decreased by ${totalTrustDecrease} for ${upiId} due to risk rules.`,
          details: ruleCheck.riskModifiers.map(m => `${m.name} (Risk: ${m.mlRiskScore}%)`).join(', '),
          transaction_amount: Number(amount),
          sender_upi: senderUPI,
          recipient_upi: upiId,
          trust_decrease: totalTrustDecrease,
          risk_score: riskAnalysis?.risk_score || 0,
          createdAt: serverTimestamp(),
          read: false
        });
      } catch (e) {
        console.error("Risk modifier processing failed:", e);
      }
    }

    if (!riskAnalysis) {
      await analyzeRisk();
      return;
    }


    if (riskAnalysis?.should_block) {
      setCurrentStep('blocked');
      return;
    }

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
        riskLevel: riskAnalysis?.risk_level || 'low'
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

  const proceedAnyway = async () => {
    // Safety check: Don't allow override if an admin rule blocks it
    const ruleCheck = evaluateRules();
    if (ruleCheck.block) {
      setIsAdminBlocked(true);
      setCurrentStep('blocked');
      return;
    }

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
        userOverride: true
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
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${highlight
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
            {/* Recipient Risk Warning based on their actual profile */}
            {recipientProfileData?.params && (recipientProfileData.params.recipientBlacklistStatus ||
              recipientProfileData.params.fraudComplaintsCount > 0 ||
              recipientProfileData.params.pastFraudulentBehavior > 0 ||
              recipientProfileData.params.recipientVerificationStatus === 'unverified' ||
              (recipientProfileData.params.socialTrustScore && recipientProfileData.params.socialTrustScore < 30)) && (
                <motion.div
                  className="p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200"
                  variants={itemVariants}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                      <ShieldAlert className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <UserX className="w-4 h-4" />
                        High Risk Recipient Detected
                      </p>
                      <div className="text-xs text-red-600 mt-1 space-y-0.5">
                        {recipientProfileData.params.recipientBlacklistStatus && (
                          <p>• Recipient is on a blacklist</p>
                        )}
                        {recipientProfileData.params.fraudComplaintsCount > 0 && (
                          <p>• {recipientProfileData.params.fraudComplaintsCount} fraud complaints filed against recipient</p>
                        )}
                        {recipientProfileData.params.pastFraudulentBehavior > 0 && (
                          <p>• {recipientProfileData.params.pastFraudulentBehavior} past fraud flags on account</p>
                        )}
                        {recipientProfileData.params.recipientVerificationStatus === 'unverified' && (
                          <p>• Recipient account is unverified</p>
                        )}
                        {recipientProfileData.params.socialTrustScore && recipientProfileData.params.socialTrustScore < 30 && (
                          <p>• Low trust score ({recipientProfileData.params.socialTrustScore}/100)</p>
                        )}
                        {recipientProfileData.params.accountAge && recipientProfileData.params.accountAge < 30 && (
                          <p>• Account is only {recipientProfileData.params.accountAge} days old</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            {/* Loading state while checking recipient profile */}
            {checkingRecipient && (
              <motion.div
                className="flex items-center justify-center gap-2 py-2"
                variants={itemVariants}
              >
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Checking recipient profile...</span>
              </motion.div>
            )}

            {/* Recipient Profile Summary (if available and safe) */}
            {!checkingRecipient && recipientProfileData?.params &&
              !recipientProfileData.params.recipientBlacklistStatus &&
              recipientProfileData.params.fraudComplaintsCount === 0 &&
              recipientProfileData.params.socialTrustScore >= 50 && (
                <motion.div
                  className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-700">Verified Recipient</p>
                      <p className="text-xs text-emerald-600">
                        Trust Score: {recipientProfileData.params.socialTrustScore}/100 •
                        Account Age: {recipientProfileData.params.accountAge || '?'} days
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

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
            {isSelfTransfer && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-red-600 text-sm font-medium">Recipient UPI matches sender UPI — transfers to self are not allowed.</p>
              </div>
            )}
            <motion.div variants={itemVariants}>
              <Button
                onClick={handleConfirm}
                disabled={isAnalyzing || isSelfTransfer}
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
            {/* High Risk Recipient Alert at Top */}
            {riskAnalysis?.risk_level === 'high' && recipientProfileData?.params && (
              <div className="p-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl text-white">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="font-semibold text-sm">High Risk Recipient</span>
                </div>
                <p className="text-xs text-red-100 mt-1">
                  This recipient's profile indicates potential fraud risk
                </p>
              </div>
            )}

            {/* Risk Score Display with Ring */}
            <div className="flex flex-col items-center py-4">
              <RiskProgressRing score={riskAnalysis?.risk_score} level={riskAnalysis?.risk_level} />
              <div className="flex items-center gap-2 mt-4">
                <Badge
                  variant="outline"
                  className={`px-4 py-1.5 text-sm font-semibold ${getRiskBadgeColor(riskAnalysis?.risk_level)}`}
                >
                  {riskAnalysis?.risk_level === 'low' && <ShieldCheck className="w-4 h-4 mr-1.5" />}
                  {riskAnalysis?.risk_level === 'medium' && <AlertTriangle className="w-4 h-4 mr-1.5" />}
                  {riskAnalysis?.risk_level === 'high' && <ShieldAlert className="w-4 h-4 mr-1.5" />}
                  {riskAnalysis?.risk_level?.toUpperCase()} RISK
                </Badge>
                {recipientProfileData?.params?.recipientBlacklistStatus && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 px-2 py-1">
                    <UserX className="w-3 h-3 mr-1" />
                    Blacklisted
                  </Badge>
                )}
              </div>
            </div>

            {/* Recipient Profile Summary */}
            {recipientProfileData && (
              (() => {
                const rawModelTrust = recipientProfileData?.modelData?.['Social Trust Score'];
                const modelTrust = typeof rawModelTrust !== 'undefined' ? (rawModelTrust > 1 ? rawModelTrust : Math.round(rawModelTrust * 100)) : null;
                const displayedTrust = recipientProfileData?.params?.socialTrustScore ?? modelTrust ?? (riskAnalysis ? Math.max(0, 100 - Math.round(riskAnalysis.risk_score || 0)) : null);
                const accountAge = recipientProfileData?.params?.accountAge ?? '?';
                const verificationStatus = recipientProfileData?.params?.recipientVerificationStatus ?? 'Unknown';
                const complaints = recipientProfileData?.params?.fraudComplaintsCount ?? 0;

                const trustClass = displayedTrust >= 70 ? 'text-emerald-600' : displayedTrust >= 40 ? 'text-amber-600' : 'text-red-600';

                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">Recipient Profile</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Trust Score:</span>
                        <span className={`font-semibold ${displayedTrust != null ? trustClass : 'text-slate-400'}`}>
                          {displayedTrust != null ? `${displayedTrust}/100` : '?/100'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Account Age:</span>
                        <span className="font-semibold text-slate-700">{accountAge} days</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Status:</span>
                        <span className={`font-semibold ${verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>{verificationStatus}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Complaints:</span>
                        <span className={`font-semibold ${complaints > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{complaints}</span>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}

            {/* Transaction Summary */}
            <div className={`p-4 rounded-xl border ${getRiskBgColor(riskAnalysis?.risk_level)} ${riskAnalysis?.risk_level === 'high' ? 'border-red-200' :
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
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${riskAnalysis?.risk_level === 'high' ? 'bg-red-500' :
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
                  className={`w-full h-12 rounded-xl font-semibold shadow-lg transition-all ${riskAnalysis?.risk_level === 'low'
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
              {!isAdminBlocked && (
                <Button
                  onClick={proceedAnyway}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  Override
                </Button>
              )}
              <Button
                onClick={async () => {
                  if (isAdminBlocked) {
                    // Create detailed BLOCK alert in Firebase when user acknowledges
                    try {
                      await addDoc(collection(db, 'alerts'), {
                        type: 'BLOCK',
                        severity: 'high',
                        title: 'Transaction Blocked - User Acknowledged',
                        message: `Transaction of ₹${amount} from ${senderUPI} to ${upiId} was blocked and acknowledged by user.`,
                        details: riskAnalysis?.factors?.filter(f => f.includes('BLOCKED')).map(f => f.replace('🚫 BLOCKED BY ADMIN RULE: ', '')).join(', ') || 'Security Rule',
                        transaction_amount: Number(amount),
                        sender_upi: senderUPI,
                        recipient_upi: upiId,
                        remarks: remarks || '',
                        risk_score: riskAnalysis?.risk_score || 0,
                        risk_level: riskAnalysis?.risk_level || 'high',
                        all_factors: riskAnalysis?.factors || [],
                        recipient_profile: recipientProfileData ? {
                          blacklist_status: recipientProfileData.params?.recipientBlacklistStatus,
                          verification_status: recipientProfileData.params?.recipientVerificationStatus,
                          fraud_complaints: recipientProfileData.params?.fraudComplaintsCount,
                          account_age: recipientProfileData.params?.accountAge,
                          social_trust_score: recipientProfileData.params?.socialTrustScore,
                          vpn_usage: recipientProfileData.params?.vpnProxyUsage,
                          geo_location: recipientProfileData.params?.geoLocationFlags
                        } : null,
                        user_device: {
                          userAgent: navigator.userAgent,
                          platform: navigator.platform,
                          screen: `${window.screen.width}x${window.screen.height}`,
                          language: navigator.language
                        },
                        blocked_at: serverTimestamp(),
                        acknowledged_at: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        read: false,
                        status: 'acknowledged'
                      });
                      console.log('Block alert created successfully');
                    } catch (error) {
                      console.error('Failed to create block alert:', error);
                    }
                  }
                  onClose();
                }}
                className={`h-11 rounded-xl ${isAdminBlocked ? 'w-full bg-red-600 hover:bg-red-700' : 'flex-1 bg-slate-800 hover:bg-slate-900'}`}
              >
                {isAdminBlocked ? 'Understood' : 'Cancel'}
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
          className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className={`relative overflow-hidden flex-shrink-0 ${currentStep === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
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
          <div className="p-6 overflow-y-auto flex-1">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default TransactionSimulation

