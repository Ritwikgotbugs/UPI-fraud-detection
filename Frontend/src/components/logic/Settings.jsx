"use client"

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Fingerprint,
  Flag,
  Gauge,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  TrendingDown,
  TrendingUp,
  User,
  UserX,
  Wallet,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from "react";
import { useAuth } from '../../context/AuthContext';
import { calculateTrustScore } from '../../lib/riskCalculator';
import MobileNav from "./MobileNav";
import SidebarContent from "./SidebarContent";
import { db } from "./firebase.js";


const AUTO_CALCULATED_PARAMS = ['transactionFrequency', 'accountAge', 'timeSinceLastTransaction', 'socialTrustScore'];


const ML_PARAMETERS = [
  {
    id: 'transactionAmount',
    name: 'Transaction Amount',
    description: 'Your typical transaction amount in rupees.',
    helpText: 'This represents the average amount you usually transact. Higher amounts may trigger additional verification during fraud analysis.',
    type: 'number',
    min: 0,
    max: 100000,
    defaultValue: 5000,
    unit: '₹',
    category: 'financial',
    modelKey: 'Transaction_Amount'
  },
  {
    id: 'transactionFrequency',
    name: 'Transaction Frequency',
    description: 'Number of transactions you make per hour.',
    helpText: 'Auto-calculated from your transaction history. Shows your average transactions per hour based on recent activity.',
    type: 'number',
    min: 0,
    max: 50,
    defaultValue: 5,
    unit: 'txns/hr',
    category: 'behavioral',
    modelKey: 'Transaction_Frequency',
    autoCalculated: true
  },
  {
    id: 'recipientVerificationStatus',
    name: 'Verification Status',
    description: 'Your current account verification level.',
    helpText: 'Verified accounts have completed KYC. Recently registered accounts are new. Unverified accounts have pending verification.',
    type: 'select',
    options: ['verified', 'recently_registered', 'unverified'],
    defaultValue: 'verified',
    category: 'recipient',
    modelKey: 'Recipient_Verification_Status'
  },
  {
    id: 'recipientBlacklistStatus',
    name: 'Blacklist Status',
    description: 'Whether your account is on any blacklist.',
    helpText: 'Blacklisted accounts have been flagged for previous fraudulent activities. This significantly impacts fraud detection scores.',
    type: 'toggle',
    defaultValue: false,
    category: 'recipient',
    modelKey: 'Recipient_Blacklist_Status'
  },
  {
    id: 'deviceFingerprinting',
    name: 'Device Trust Score',
    description: 'How trusted is your current device (0-1).',
    helpText: '0 means fully trusted device used regularly. 1 means new/unknown device. New devices may trigger additional security checks.',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.2,
    category: 'device',
    modelKey: 'Device_Fingerprinting'
  },
  {
    id: 'vpnProxyUsage',
    name: 'VPN/Proxy Usage',
    description: 'Do you typically use VPN or Proxy services?',
    helpText: 'VPN/Proxy usage can mask your real location. While legitimate, it may raise flags if combined with other suspicious indicators.',
    type: 'toggle',
    defaultValue: false,
    category: 'device',
    modelKey: 'VPN_Proxy_Usage'
  },
  {
    id: 'geoLocationFlags',
    name: 'Geo-Location Risk',
    description: 'Risk level based on your geographic location.',
    helpText: 'Normal means consistent location. Unusual means some variation. High-risk indicates transactions from flagged regions.',
    type: 'select',
    options: ['normal', 'unusual', 'high-risk'],
    defaultValue: 'normal',
    category: 'location',
    modelKey: 'Geo_Location_Flags'
  },
  {
    id: 'behavioralBiometrics',
    name: 'Behavioral Biometrics',
    description: 'Deviation from your normal behavior pattern (0-1).',
    helpText: '0 means behavior matches your usual pattern. 1 means significant deviation. Includes typing speed, swipe patterns, etc.',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.3,
    category: 'behavioral',
    modelKey: 'Behavioral_Biometrics'
  },
  {
    id: 'timeSinceLastTransaction',
    name: 'Time Since Last Txn',
    description: 'Hours since your last transaction.',
    helpText: 'Auto-calculated from your most recent transaction. Updates automatically based on your transaction history.',
    type: 'number',
    min: 0,
    max: 168,
    defaultValue: 24,
    unit: 'hours',
    category: 'temporal',
    modelKey: 'Time_Since_Last_Transaction',
    autoCalculated: true
  },
  {
    id: 'socialTrustScore',
    name: 'Risk Score',
    description: 'Overall risk score calculated from all parameters.',
    helpText: 'Auto-calculated based on all your risk factors. Lower scores indicate a more trustworthy profile. You cannot edit this directly - improve other parameters to decrease your risk.',
    type: 'number',
    min: 0,
    max: 100,
    defaultValue: 0,
    category: 'social',
    modelKey: 'Social_Trust_Score',
    autoCalculated: true
  },
  {
    id: 'accountAge',
    name: 'Account Age',
    description: 'How old is your account in days.',
    helpText: 'Auto-calculated from your account creation date. Older accounts are generally more trusted by the ML model.',
    type: 'number',
    min: 0,
    max: 3650,
    defaultValue: 365,
    unit: 'days',
    category: 'account',
    modelKey: 'Account_Age',
    autoCalculated: true
  },
  {
    id: 'highRiskTransactionTimes',
    name: 'High-Risk Transaction Times',
    description: 'Do you often transact during unusual hours?',
    helpText: 'Transactions between 12 AM - 5 AM are considered high-risk hours. Enabling this indicates you regularly transact at night.',
    type: 'toggle',
    defaultValue: false,
    category: 'temporal',
    modelKey: 'High_Risk_Transaction_Times'
  },
  {
    id: 'pastFraudulentBehavior',
    name: 'Past Fraud Flags',
    description: 'Number of fraud flags on your account history.',
    helpText: 'Each flag represents a previous incident flagged by the system. More flags significantly increase your risk score.',
    type: 'number',
    min: 0,
    max: 10,
    defaultValue: 0,
    unit: 'flags',
    category: 'history',
    modelKey: 'Past_Fraudulent_Behavior'
  },
  {
    id: 'locationInconsistentTransactions',
    name: 'Location Inconsistency',
    description: 'Are your transaction locations inconsistent?',
    helpText: 'Indicates if you frequently transact from different cities/countries in short time spans, which may suggest account compromise.',
    type: 'toggle',
    defaultValue: false,
    category: 'location',
    modelKey: 'Location_Inconsistent_Transactions'
  },
  {
    id: 'normalizedTransactionAmount',
    name: 'Normalized Txn Amount',
    description: 'Your typical amount relative to your average (0-1).',
    helpText: '0.5 is your average transaction. Values near 1 indicate transactions much higher than your usual pattern.',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.5,
    category: 'financial',
    modelKey: 'Normalized_Transaction_Amount'
  },
  {
    id: 'transactionContextAnomalies',
    name: 'Context Anomalies',
    description: 'Anomaly score for transaction context (0-1).',
    helpText: '0 means normal context. Higher values indicate unusual patterns like new recipient types, categories, or transaction purposes.',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.2,
    category: 'behavioral',
    modelKey: 'Transaction_Context_Anomalies'
  },
  {
    id: 'fraudComplaintsCount',
    name: 'Fraud Complaints',
    description: 'Number of fraud complaints filed against you.',
    helpText: 'Counts how many other users have reported your account. Even one complaint significantly impacts your trust score.',
    type: 'number',
    min: 0,
    max: 100,
    defaultValue: 0,
    unit: 'complaints',
    category: 'history',
    modelKey: 'Fraud_Complaints_Count'
  },
  {
    id: 'merchantCategoryMismatch',
    name: 'Category Mismatch',
    description: 'Do your transactions have category mismatches?',
    helpText: 'Indicates if transaction descriptions don\'t match merchant categories, which can be a sign of money laundering.',
    type: 'toggle',
    defaultValue: false,
    category: 'merchant',
    modelKey: 'Merchant_Category_Mismatch'
  },
  {
    id: 'userDailyLimitExceeded',
    name: 'Daily Limit Exceeded',
    description: 'Do you frequently exceed daily transaction limits?',
    helpText: 'Tracks if you regularly hit or exceed your daily transaction limits. Frequent limit-hitting may indicate suspicious activity.',
    type: 'toggle',
    defaultValue: false,
    category: 'financial',
    modelKey: 'User_Daily_Limit_Exceeded'
  },
  {
    id: 'recentHighValueFlags',
    name: 'Recent High-Value Flags',
    description: 'Flags from recent high-value transactions.',
    helpText: 'Counts alerts triggered by large transactions in the past 30 days. More flags indicate recent suspicious high-value activity.',
    type: 'number',
    min: 0,
    max: 10,
    defaultValue: 0,
    unit: 'flags',
    category: 'financial',
    modelKey: 'Recent_High_Value_Flags'
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All Parameters', icon: Sliders },
  { id: 'financial', name: 'Financial', icon: Gauge },
  { id: 'behavioral', name: 'Behavioral', icon: Zap },
  { id: 'recipient', name: 'Account Status', icon: User },
  { id: 'device', name: 'Device', icon: Shield },
  { id: 'location', name: 'Location', icon: Flag },
  { id: 'temporal', name: 'Temporal', icon: Info },
  { id: 'history', name: 'History', icon: AlertTriangle },
  { id: 'social', name: 'Social', icon: UserX },
  { id: 'account', name: 'Account', icon: ShieldCheck },
  { id: 'merchant', name: 'Merchant', icon: ShieldAlert }
];


const PROFILE_PRESETS = {
  lowRisk: {
    name: 'Low Risk Profile',
    description: 'A trusted user with verified account, consistent behavior, and clean history',
    icon: ShieldCheck,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    params: {
      transactionAmount: 2000,
      transactionFrequency: 3,
      recipientVerificationStatus: 'verified',
      recipientBlacklistStatus: false,
      deviceFingerprinting: 0.1,
      vpnProxyUsage: false,
      geoLocationFlags: 'normal',
      behavioralBiometrics: 0.1,
      timeSinceLastTransaction: 12,
      accountAge: 730,
      highRiskTransactionTimes: false,
      pastFraudulentBehavior: 0,
      locationInconsistentTransactions: false,
      normalizedTransactionAmount: 0.4,
      transactionContextAnomalies: 0.1,
      fraudComplaintsCount: 0,
      merchantCategoryMismatch: false,
      userDailyLimitExceeded: false,
      recentHighValueFlags: 0
    }
  },
  highRisk: {
    name: 'High Risk Profile',
    description: 'A suspicious user with multiple red flags and inconsistent patterns',
    icon: ShieldAlert,
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    params: {
      transactionAmount: 75000,
      transactionFrequency: 25,
      recipientVerificationStatus: 'unverified',
      recipientBlacklistStatus: true,
      deviceFingerprinting: 0.9,
      vpnProxyUsage: true,
      geoLocationFlags: 'high-risk',
      behavioralBiometrics: 0.8,
      timeSinceLastTransaction: 2,
      accountAge: 30,
      highRiskTransactionTimes: true,
      pastFraudulentBehavior: 5,
      locationInconsistentTransactions: true,
      normalizedTransactionAmount: 0.95,
      transactionContextAnomalies: 0.85,
      fraudComplaintsCount: 8,
      merchantCategoryMismatch: true,
      userDailyLimitExceeded: true,
      recentHighValueFlags: 7
    }
  }
};

const Settings = () => {
  const { userData, user, transactions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [notification, setNotification] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);


  const [parameters, setParameters] = useState(
    ML_PARAMETERS.reduce((acc, param) => {
      acc[param.id] = param.defaultValue;
      return acc;
    }, {})
  );


  const [originalParameters, setOriginalParameters] = useState({});


  const calculateAutoParameters = () => {
    const autoParams = {};


    if (userData?.createdAt) {
      const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      autoParams.accountAge = diffDays;
    }


    if (transactions && transactions.length > 0) {
      const lastTx = transactions[0];
      const lastTxDate = lastTx.createdAt?.toDate?.() || lastTx.timestamp?.toDate?.() || new Date();
      const now = new Date();
      const diffTime = Math.abs(now - lastTxDate);
      const diffHours = Math.round(diffTime / (1000 * 60 * 60));
      autoParams.timeSinceLastTransaction = Math.min(diffHours, 168);
    }


    if (transactions && transactions.length > 0) {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentTxs = transactions.filter(tx => {
        const txDate = tx.createdAt?.toDate?.() || tx.timestamp?.toDate?.() || new Date(0);
        return txDate >= last24Hours;
      });
      const frequency = Math.round((recentTxs.length / 24) * 10) / 10;
      autoParams.transactionFrequency = frequency;
    }

    // Social Trust Score is always 100 - Risk Score (calculated dynamically)
    // We'll set a placeholder here; the actual display uses risk.trustScore
    autoParams.socialTrustScore = 100; // Will be overridden by calculated value in display

    return autoParams;
  };


  useEffect(() => {
    const loadUserParameters = () => {
      if (!userData) {
        setLoading(false);
        return;
      }

      try {

        const autoParams = calculateAutoParameters();


        const loadedParams = {};
        ML_PARAMETERS.forEach(param => {

          if (AUTO_CALCULATED_PARAMS.includes(param.id)) {
            // Always prefer auto-calculated values for dynamic metrics
            // accountAge, timeSinceLastTransaction, transactionFrequency
            loadedParams[param.id] = autoParams[param.id] !== undefined
              ? autoParams[param.id]
              : (userData.transactionDetails?.[param.id] ?? param.defaultValue);
          } else if (userData.transactionDetails?.[param.id] !== undefined) {
            loadedParams[param.id] = userData.transactionDetails[param.id];
          } else {
            loadedParams[param.id] = param.defaultValue;
          }
        });
        setParameters(loadedParams);
        setOriginalParameters(loadedParams);
      } catch (error) {
        console.error("Error loading user parameters:", error);
        showNotification('error', 'Failed to load your settings');
      } finally {
        setLoading(false);
      }
    };

    loadUserParameters();
  }, [userData, transactions]);


  useEffect(() => {
    const changed = JSON.stringify(parameters) !== JSON.stringify(originalParameters);
    setHasChanges(changed);
  }, [parameters, originalParameters]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };


  const convertToModelFormat = (params) => {
    const modelData = {};
    ML_PARAMETERS.forEach(param => {
      const value = params[param.id];

      if (param.type === 'toggle') {
        modelData[param.modelKey] = value ? 1 : 0;
      } else if (param.type === 'select') {

        if (param.id === 'recipientVerificationStatus') {
          modelData[param.modelKey] = value === 'verified' ? 0 : value === 'recently_registered' ? 1 : 2;
        } else if (param.id === 'geoLocationFlags') {
          modelData[param.modelKey] = value === 'normal' ? 0 : value === 'unusual' ? 1 : 2;
        } else {
          modelData[param.modelKey] = value;
        }
      } else {
        modelData[param.modelKey] = value;
      }
    });
    return modelData;
  };

  const handleSaveParameters = async () => {
    if (!user?.uid) {
      showNotification('error', 'You must be logged in');
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);

      const paramsToSave = { ...parameters };
      if (paramsToSave.socialTrustScore === undefined) {
        paramsToSave.socialTrustScore = 100;
      }

      await updateDoc(userRef, {
        transactionDetails: paramsToSave,
        modelData: convertToModelFormat(paramsToSave),
        updatedAt: new Date()
      });

      setOriginalParameters({ ...parameters });
      setIsEditing(false);
      showNotification('success', 'Your fraud detection settings have been saved');
    } catch (error) {
      console.error("Error saving parameters:", error);
      showNotification('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const defaults = ML_PARAMETERS.reduce((acc, param) => {
      acc[param.id] = param.defaultValue;
      return acc;
    }, {});
    setParameters(defaults);
    showNotification('info', 'Parameters reset to defaults. Click Save to apply.');
  };


  const handleRecalculateSuggested = () => {
    const autoParams = calculateAutoParameters();
    setParameters(prev => ({
      ...prev,
      ...autoParams
    }));
    showNotification('info', 'Suggested values recalculated from your activity. Click Save to apply.');
  };


  const handleImportPreset = (presetKey) => {
    const preset = PROFILE_PRESETS[presetKey];
    if (preset) {
      setParameters({ ...preset.params });
      setIsEditing(true);
      showNotification('info', `${preset.name} imported. Review and click Save to apply.`);
    }
  };

  const handleCancelEdit = () => {
    setParameters({ ...originalParameters });
    setIsEditing(false);
  };

  const updateParameter = (paramId, value) => {
    setParameters(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  const filteredParameters = ML_PARAMETERS.filter(param =>
    selectedCategory === 'all' || param.category === selectedCategory
  );

  const getRiskProfile = () => {
    // Use centralized risk calculator for consistent scoring
    // IMPORTANT: Exclude socialTrustScore from parameters to avoid circular dependency
    const paramsForCalc = { ...parameters };
    delete paramsForCalc.socialTrustScore; // Don't use stored value
    
    const result = calculateTrustScore(paramsForCalc, transactions || []);
    const riskScore = result.riskScore;
    // Trust Score is ALWAYS 100 - Risk Score
    const trustScore = 100 - riskScore;

    if (riskScore >= 60) return { 
      level: 'High Risk', 
      color: 'bg-red-500', 
      textColor: 'text-red-700', 
      bgColor: 'bg-red-50', 
      description: 'Your profile may be flagged by the ML model',
      riskScore,
      trustScore,
      breakdown: result.breakdown
    };
    if (riskScore >= 35) return { 
      level: 'Medium Risk', 
      color: 'bg-orange-500', 
      textColor: 'text-orange-700', 
      bgColor: 'bg-orange-50', 
      description: 'Some parameters may raise alerts',
      riskScore,
      trustScore,
      breakdown: result.breakdown
    };
    if (riskScore >= 10) return { 
      level: 'Low Risk', 
      color: 'bg-yellow-500', 
      textColor: 'text-yellow-700', 
      bgColor: 'bg-yellow-50', 
      description: 'Minor risk factors detected',
      riskScore,
      trustScore,
      breakdown: result.breakdown
    };
    return { 
      level: 'Trusted', 
      color: 'bg-green-500', 
      textColor: 'text-green-700', 
      bgColor: 'bg-green-50', 
      description: 'Your profile appears trustworthy',
      riskScore,
      trustScore,
      breakdown: result.breakdown
    };
  };

  const renderParameterInput = (param, currentValue, onChange, disabled = false) => {
    switch (param.type) {
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={param.min}
              max={param.max}
              value={currentValue}
              onChange={(e) => onChange(param.id, parseFloat(e.target.value) || 0)}
              className="w-24 h-8 text-sm"
              disabled={disabled}
            />
            {param.unit && (
              <span className="text-xs text-slate-500">{param.unit}</span>
            )}
          </div>
        );

      case 'slider':
        return (
          <div className="flex items-center gap-3 w-full max-w-xs">
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={currentValue}
              onChange={(e) => onChange(param.id, parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
              disabled={disabled}
            />
            <span className="text-sm font-medium text-slate-700 w-12 text-right">
              {currentValue?.toFixed(1)}
            </span>
          </div>
        );

      case 'select':
        return (
          <Select value={currentValue} onValueChange={(value) => onChange(param.id, value)} disabled={disabled}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {param.options.map(option => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'toggle':
        return (
          <button
            onClick={() => !disabled && onChange(param.id, !currentValue)}
            disabled={disabled}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${currentValue ? 'bg-blue-500' : 'bg-slate-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out ${currentValue ? 'translate-x-7' : 'translate-x-0'
                }`}
            />
          </button>
        );

      default:
        return null;
    }
  };

  const risk = getRiskProfile();

  // Group parameters by category for organized display
  const parametersByCategory = {
    financial: ML_PARAMETERS.filter(p => p.category === 'financial'),
    device: ML_PARAMETERS.filter(p => p.category === 'device'),
    behavioral: ML_PARAMETERS.filter(p => p.category === 'behavioral'),
    location: ML_PARAMETERS.filter(p => p.category === 'location'),
    history: ML_PARAMETERS.filter(p => p.category === 'history'),
    recipient: ML_PARAMETERS.filter(p => p.category === 'recipient'),
    temporal: ML_PARAMETERS.filter(p => p.category === 'temporal'),
    social: ML_PARAMETERS.filter(p => p.category === 'social'),
    account: ML_PARAMETERS.filter(p => p.category === 'account'),
    merchant: ML_PARAMETERS.filter(p => p.category === 'merchant'),
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      financial: Wallet,
      device: Smartphone,
      behavioral: Fingerprint,
      location: MapPin,
      history: Clock,
      recipient: User,
      temporal: Clock,
      social: UserX,
      account: ShieldCheck,
      merchant: ShieldAlert,
    };
    return icons[cat] || Sliders;
  };

  const getCategoryColor = (cat) => {
    const colors = {
      financial: 'from-emerald-500 to-green-600',
      device: 'from-blue-500 to-indigo-600',
      behavioral: 'from-orange-500 to-amber-600',
      location: 'from-rose-500 to-pink-600',
      history: 'from-slate-500 to-gray-600',
      recipient: 'from-violet-500 to-purple-600',
      temporal: 'from-cyan-500 to-teal-600',
      social: 'from-red-500 to-rose-600',
      account: 'from-indigo-500 to-blue-600',
      merchant: 'from-amber-500 to-yellow-600',
    };
    return colors[cat] || 'from-slate-500 to-gray-600';
  };

  const getCategoryName = (cat) => {
    const names = {
      financial: 'Financial',
      device: 'Device & Security',
      behavioral: 'Behavioral Patterns',
      location: 'Location & Geography',
      history: 'History & Flags',
      recipient: 'Recipient Status',
      temporal: 'Time & Frequency',
      social: 'Social Trust',
      account: 'Account Details',
      merchant: 'Merchant Info',
    };
    return names[cat] || cat;
  };

  const renderCompactInput = (param, currentValue, onChange, disabled = false) => {
    switch (param.type) {
      case 'number':
        return (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={param.min}
              max={param.max}
              value={currentValue}
              onChange={(e) => onChange(param.id, parseFloat(e.target.value) || 0)}
              className="w-16 h-7 text-xs px-2 text-center font-medium"
              disabled={disabled}
            />
            {param.unit && <span className="text-[10px] text-slate-400">{param.unit}</span>}
          </div>
        );
      case 'slider':
        return (
          <div className="flex items-center gap-2 w-full">
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={currentValue}
              onChange={(e) => onChange(param.id, parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
              disabled={disabled}
            />
            <span className="text-xs font-bold text-slate-700 w-8 text-right">{currentValue}</span>
          </div>
        );
      case 'select':
        return (
          <Select value={currentValue} onValueChange={(value) => onChange(param.id, value)} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {param.options.map(option => (
                <SelectItem key={option} value={option} className="text-xs">
                  {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'toggle':
        return (
          <button
            onClick={() => !disabled && onChange(param.id, !currentValue)}
            disabled={disabled}
            className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
              currentValue ? 'bg-blue-500' : 'bg-slate-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              currentValue ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden md:block w-64 h-screen sticky top-0 border-r border-slate-200 bg-white">
        <SidebarContent />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
            
            {/* Notification */}
            <AnimatePresence>
              {notification && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Alert className={`py-2 ${
                    notification.type === 'success' ? 'border-green-200 bg-green-50' :
                    notification.type === 'info' ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'
                  }`}>
                    {notification.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     notification.type === 'info' ? <Info className="h-4 w-4 text-blue-600" /> :
                     <AlertTriangle className="h-4 w-4 text-red-600" />}
                    <AlertDescription className={`text-sm ${
                      notification.type === 'success' ? 'text-green-700' :
                      notification.type === 'info' ? 'text-blue-700' : 'text-red-700'
                    }`}>{notification.message}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header with Profile Summary */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm overflow-hidden bg-white">
                <div className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: User Info */}
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                        risk.level === 'Trusted' ? 'from-emerald-400 to-green-500' :
                        risk.level === 'Low Risk' ? 'from-yellow-400 to-amber-500' :
                        risk.level === 'Medium Risk' ? 'from-orange-400 to-red-500' :
                        'from-red-500 to-rose-600'
                      } flex items-center justify-center text-white shadow-lg`}>
                        {userData?.photoURL ? (
                          <img src={userData.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                        ) : (
                          <User className="h-7 w-7" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-lg font-bold text-slate-800">{userData?.name || 'Your Profile'}</h1>
                          <Badge className={`text-[10px] px-2 py-0.5 ${
                            risk.level === 'Trusted' ? 'bg-emerald-100 text-emerald-700' :
                            risk.level === 'Low Risk' ? 'bg-yellow-100 text-yellow-700' :
                            risk.level === 'Medium Risk' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {risk.level === 'Trusted' ? <ShieldCheck className="h-3 w-3 mr-1" /> : 
                             risk.level === 'High Risk' ? <ShieldAlert className="h-3 w-3 mr-1" /> : null}
                            {risk.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">{userData?.upiId || 'Fraud Detection Settings'}</p>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2">
                      {hasChanges && <Badge className="bg-orange-100 text-orange-600 text-[10px]">Unsaved</Badge>}
                      {!isEditing ? (
                        <Button size="sm" onClick={() => setIsEditing(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-3 text-xs">
                          <Sliders className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 px-2 text-xs">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleRecalculateSuggested} className="h-8 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" onClick={handleSaveParameters} disabled={saving || !hasChanges} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`bg-gradient-to-br rounded-xl p-3 border ${risk.riskScore <= 30 ? 'from-emerald-50 to-green-50 border-emerald-100' : risk.riskScore <= 60 ? 'from-yellow-50 to-amber-50 border-yellow-100' : 'from-red-50 to-rose-50 border-red-100'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-[10px] font-medium uppercase tracking-wide ${risk.riskScore <= 30 ? 'text-emerald-600' : risk.riskScore <= 60 ? 'text-yellow-600' : 'text-red-600'}`}>Risk Score</p>
                          <p className={`text-2xl font-bold ${risk.riskScore <= 30 ? 'text-emerald-700' : risk.riskScore <= 60 ? 'text-yellow-700' : 'text-red-700'}`}>{risk.riskScore}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${risk.riskScore <= 30 ? 'bg-emerald-100' : risk.riskScore <= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                          {risk.riskScore <= 30 ? <TrendingDown className="h-4 w-4 text-emerald-600" /> : <TrendingUp className="h-4 w-4 text-red-600" />}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Account Age</p>
                          <p className="text-2xl font-bold text-blue-700">{parameters.accountAge}<span className="text-sm font-normal ml-0.5">d</span></p>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-violet-600 font-medium uppercase tracking-wide">Complaints</p>
                          <p className="text-2xl font-bold text-violet-700">{parameters.fraudComplaintsCount}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${parameters.fraudComplaintsCount === 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {parameters.fraudComplaintsCount === 0 ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">Status</p>
                          <p className="text-sm font-bold text-slate-700 capitalize">{parameters.recipientVerificationStatus?.replace('_', ' ')}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${parameters.recipientVerificationStatus === 'verified' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                          {parameters.recipientVerificationStatus === 'verified' ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <Shield className="h-4 w-4 text-orange-600" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Quick Presets */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Object.entries(PROFILE_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleImportPreset(key)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                      key === 'lowRisk' 
                        ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400' 
                        : 'bg-red-50 border-red-200 hover:border-red-400'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${preset.color} flex items-center justify-center`}>
                      <preset.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-semibold ${key === 'lowRisk' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {key === 'lowRisk' ? 'Load Trusted' : 'Load Risky'}
                      </p>
                      <p className="text-[10px] text-slate-500">Test profile</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${key === 'lowRisk' ? 'text-emerald-400' : 'text-red-400'}`} />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Parameters - Compact Single Card */}
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-slate-500">Loading your settings...</p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-white" />
                      <span className="text-sm font-semibold text-white">All Parameters</span>
                    </div>
                    <Badge className="bg-white/20 text-white text-[10px]">{ML_PARAMETERS.length} total</Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {Object.entries(parametersByCategory).map(([categoryKey, params]) => {
                        if (params.length === 0) return null;
                        const CategoryIcon = getCategoryIcon(categoryKey);
                        return (
                          <div key={categoryKey} className="space-y-2">
                            {/* Category Header */}
                            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r ${getCategoryColor(categoryKey)}`}>
                              <CategoryIcon className="h-3.5 w-3.5 text-white" />
                              <span className="text-[11px] font-semibold text-white truncate">{getCategoryName(categoryKey)}</span>
                              <span className="text-[10px] text-white/70 ml-auto">{params.length}</span>
                            </div>
                            {/* Parameters List */}
                            <div className="space-y-1.5">
                              {params.map(param => {
                                // For socialTrustScore, always use calculated risk score
                                const displayValue = param.id === 'socialTrustScore' 
                                  ? risk.riskScore 
                                  : parameters[param.id];
                                return (
                                <div key={param.id} className={`p-2 rounded-lg border transition-all ${
                                  param.autoCalculated ? 'bg-emerald-50/50 border-emerald-200' :
                                  isEditing ? 'bg-blue-50/30 border-blue-200' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-medium text-slate-600 truncate pr-1 leading-tight">{param.name}</span>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      {param.autoCalculated && <span className="text-[7px] px-1 py-0.5 bg-emerald-100 text-emerald-600 rounded">A</span>}
                                      <div className="group relative">
                                        <HelpCircle className="h-2.5 w-2.5 text-slate-300 hover:text-blue-500 cursor-help" />
                                        <div className="absolute right-0 bottom-full mb-1 w-44 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                          {param.helpText}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {renderCompactInput(param, displayValue, updateParameter, !isEditing || param.id === 'socialTrustScore')}
                                </div>
                              )})}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Info Footer */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  These parameters are used by the ML fraud detection model to calculate risk scores during transactions. 
                  Keep your profile accurate for fewer false alerts.
                </p>
              </div>
            </motion.div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Settings;
