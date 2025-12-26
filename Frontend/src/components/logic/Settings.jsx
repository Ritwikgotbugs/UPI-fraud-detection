"use client"

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Flag,
  Gauge,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  User,
  UserX,
  Zap
} from 'lucide-react';
import { useEffect, useState } from "react";
import { useAuth } from '../../context/AuthContext';
import MobileNav from "./MobileNav";
import SidebarContent from "./SidebarContent";
import { db } from "./firebase.js";


const AUTO_CALCULATED_PARAMS = ['transactionFrequency', 'accountAge', 'timeSinceLastTransaction'];


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
    name: 'Social Trust Score',
    description: 'Trust score based on your transaction network (0-100).',
    helpText: 'Higher scores indicate you transact with verified, trusted users. Lower scores mean transactions with unknown or flagged accounts.',
    type: 'slider',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 75,
    category: 'social',
    modelKey: 'Social_Trust_Score'
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
      socialTrustScore: 90,
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
      socialTrustScore: 15,
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


      await updateDoc(userRef, {
        transactionDetails: parameters,
        modelData: convertToModelFormat(parameters),
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
    let riskScore = 0;
    if (parameters.recipientBlacklistStatus) riskScore += 30;
    if (parameters.vpnProxyUsage) riskScore += 15;
    if (parameters.geoLocationFlags === 'high-risk') riskScore += 20;
    if (parameters.geoLocationFlags === 'unusual') riskScore += 10;
    if (parameters.highRiskTransactionTimes) riskScore += 10;
    if (parameters.fraudComplaintsCount > 0) riskScore += parameters.fraudComplaintsCount * 5;
    if (parameters.pastFraudulentBehavior > 0) riskScore += parameters.pastFraudulentBehavior * 8;
    if (parameters.deviceFingerprinting > 0.5) riskScore += 10;
    if (parameters.behavioralBiometrics > 0.5) riskScore += 10;
    if (parameters.locationInconsistentTransactions) riskScore += 15;
    if (parameters.merchantCategoryMismatch) riskScore += 10;
    if (parameters.userDailyLimitExceeded) riskScore += 15;

    if (riskScore >= 60) return { level: 'High Risk', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', description: 'Your profile may be flagged by the ML model' };
    if (riskScore >= 30) return { level: 'Medium Risk', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', description: 'Some parameters may raise alerts' };
    if (riskScore >= 10) return { level: 'Low Risk', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', description: 'Minor risk factors detected' };
    return { level: 'Trusted', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', description: 'Your profile appears trustworthy' };
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 h-screen sticky top-0 border-r border-slate-200 bg-white">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navigation */}
        <MobileNav />

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <SettingsIcon className="h-7 w-7 text-blue-500" />
                  My Fraud Profile Settings
                </h1>
                <p className="text-slate-500 mt-1">
                  Configure your ML parameters that are used when analyzing transactions
                </p>
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                  >
                    <Sliders className="h-4 w-4 mr-2" />
                    Edit Settings
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className=" text-black"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResetToDefaults}
                      className=" text-black"
                    >
                      <RefreshCw className="h-4 w-4 mr-2 text-black" />
                      Reset Defaults
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRecalculateSuggested}
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Recalculate
                    </Button>
                    <Button
                      onClick={handleSaveParameters}
                      disabled={saving || !hasChanges}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-black"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            {/* Notification */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert className={
                    notification.type === 'success' ? 'border-green-200 bg-green-50' :
                      notification.type === 'info' ? 'border-blue-200 bg-blue-50' :
                        'border-red-200 bg-red-50'
                  }>
                    {notification.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : notification.type === 'info' ? (
                      <Info className="h-4 w-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={
                      notification.type === 'success' ? 'text-green-700' :
                        notification.type === 'info' ? 'text-blue-700' :
                          'text-red-700'
                    }>
                      {notification.message}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className={`p-5 ${risk.bgColor}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl ${risk.color} flex items-center justify-center text-white shadow-lg`}>
                      {userData?.photoURL ? (
                        <img src={userData.photoURL} alt="Profile" className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <User className="h-8 w-8" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3">
                        {userData?.name || 'Your Profile'}
                        <Badge className={`${risk.bgColor} ${risk.textColor} border-0`}>
                          {risk.level}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1 text-slate-600">
                        {userData?.upiId || userData?.email || 'No UPI ID set'}
                      </CardDescription>
                      <p className="text-sm text-slate-500 mt-1">{risk.description}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Parameters</p>
                        <p className="text-3xl font-bold mt-1">{ML_PARAMETERS.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Sliders className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Trust Score</p>
                        <p className="text-3xl font-bold mt-1">{parameters.socialTrustScore}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Account Age</p>
                        <p className="text-3xl font-bold mt-1">{parameters.accountAge} <span className="text-lg">days</span></p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Shield className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Example Profile Presets */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              <Card className="border-0 shadow-md">
                <CardHeader className="p-5 border-b border-slate-200 bg-slate-50">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Download className="h-5 w-5 text-purple-600" />
                    Import Example Profiles
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 mt-1">
                    Load example configurations to understand how different profiles affect fraud detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(PROFILE_PRESETS).map(([key, preset]) => (
                      <motion.div
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-xl border-2 ${preset.borderColor} ${preset.bgColor} transition-all duration-200 cursor-pointer`}
                        onClick={() => handleImportPreset(key)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                            <preset.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                              {preset.name}
                              <Badge className={`${key === 'lowRisk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-0 text-[10px]`}>
                                {key === 'lowRisk' ? 'Trusted' : 'Flagged'}
                              </Badge>
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">{preset.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {key === 'lowRisk' ? (
                                <>
                                  <span className="text-[10px] px-2 py-0.5 bg-green-200 text-green-800 rounded-full">✓ Verified</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-green-200 text-green-800 rounded-full">✓ 2yr old account</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-green-200 text-green-800 rounded-full">✓ No complaints</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-green-200 text-green-800 rounded-full">✓ Trusted device</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] px-2 py-0.5 bg-red-200 text-red-800 rounded-full">✗ Blacklisted</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-red-200 text-red-800 rounded-full">✗ VPN usage</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-red-200 text-red-800 rounded-full">✗ 8 complaints</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-red-200 text-red-800 rounded-full">✗ New account</span>
                                </>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`mt-3 ${key === 'lowRisk' ? 'border-green-400 text-green-700 hover:bg-green-100' : 'border-red-400 text-red-700 hover:bg-red-100'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImportPreset(key);
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Import Profile
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Filter */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <span className="text-sm font-medium text-slate-600">Filter by category:</span>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-56">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasChanges && (
                    <Badge className="bg-orange-100 text-orange-700 border-0">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Parameters List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-md">
                <CardHeader className="p-5 border-b border-slate-200 bg-slate-50">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Sliders className="h-6 w-6 text-blue-600" />
                    ML Model Parameters
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 mt-1">
                    These parameters are used by the ML model to analyze your transactions. Hover over the <HelpCircle className="h-3 w-3 inline text-slate-400" /> icon for detailed explanations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {loading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-slate-500">Loading your settings...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      {filteredParameters.map((param, index) => (
                        <motion.div
                          key={param.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`p-4 rounded-xl transition-all duration-200 ${param.autoCalculated
                            ? 'bg-emerald-50 border-2 border-emerald-200 shadow-sm'
                            : isEditing
                              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                              : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Label className="text-sm font-semibold text-slate-800 flex-1">
                              {param.name}
                            </Label>
                            {param.autoCalculated && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5" title="Can be auto-calculated if not set">
                                Suggested
                              </Badge>
                            )}
                            <div className="group relative">
                              <HelpCircle className="h-4 w-4 text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                              <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="font-medium mb-1">{param.name}</div>
                                <div className="text-slate-300 leading-relaxed mb-2">{param.description}</div>
                                <div className="text-slate-400 leading-relaxed text-[11px]">{param.helpText}</div>
                                {param.autoCalculated && (
                                  <div className="mt-2 pt-2 border-t border-slate-600 text-emerald-400 text-[10px]">
                                    💡 Suggested value calculated from your activity. You can override it.
                                  </div>
                                )}
                                <div className="absolute right-3 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center">
                            {renderParameterInput(
                              param,
                              parameters[param.id],
                              updateParameter,
                              !isEditing
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-1">How your settings are used</h3>
                      <p className="text-sm text-slate-600">
                        When you send or receive money, the ML fraud detection model uses these parameters
                        along with real-time transaction data to calculate a risk score. Lower risk scores
                        indicate safer transactions. Keep your profile accurate to ensure smooth transactions
                        and reduce false fraud alerts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Settings;
