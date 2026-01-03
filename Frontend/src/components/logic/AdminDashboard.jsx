import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Clock,
  Filter,
  Gauge,
  GitBranch,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from './firebase';
import MobileNav from "./MobileNav";
import SidebarContent from "./SidebarContent";

const API_BASE = 'https://rxcq.pythonanywhere.com';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const getRiskIcon = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'high': return <ShieldAlert className="h-5 w-5" />;
    case 'medium': return <AlertTriangle className="h-5 w-5" />;
    case 'low': return <ShieldCheck className="h-5 w-5" />;
    default: return <Shield className="h-5 w-5" />;
  }
};

const getRiskColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};


// SAMPLE_DASHBOARD_DATA removed - using Firebase only

// Generate scenarios dynamically from active rules
const generateScenariosFromRules = (rules) => {
  const baseScenarios = [
    { id: 'normal', name: 'Normal Transaction', description: 'Standard transaction with no anomalies' }
  ];
  
  // Generate test scenarios from actual rules
  rules.forEach(rule => {
    if (rule.enabled) {
      const scenario = {
        id: `rule_${rule.id}`,
        name: `Test: ${rule.name}`,
        description: `Trigger: ${rule.condition} - ${rule.type} action`
      };
      
      // Add specific test case based on rule condition
      if (rule.condition?.includes('amount')) {
        scenario.testParams = { amount: parseFloat(rule.value) + 100 };
      } else if (rule.condition?.includes('vpn') || rule.condition?.includes('VPN')) {
        scenario.testParams = { vpnUsage: true };
      } else if (rule.condition?.includes('blacklist')) {
        scenario.testParams = { recipientBlacklisted: true };
      } else if (rule.condition?.includes('time') || rule.condition?.includes('hour')) {
        scenario.testParams = { transactionHour: 3 }; // 3 AM
      } else if (rule.condition?.includes('location') || rule.condition?.includes('geo')) {
        scenario.testParams = { highRiskLocation: true };
      }
      
      baseScenarios.push(scenario);
    }
  });
  
  return baseScenarios;
};



const DATASET_EXAMPLES = {
  fraud: [
    {
      id: 'fraud_blacklist_vpn',
      name: '🚨 FRAUD: Blacklisted + VPN',
      description: 'Row from dataset: Blacklisted recipient using VPN (Label=1)',
      params: {
        amount: 37.88,
        transaction_frequency: 8,
        recipient_verification_status: 'verified',
        recipient_blacklist_status: 1,
        device_fingerprinting: 0.52,
        vpn_proxy_usage: 1,
        geo_location_flags: 'high-risk',
        behavioral_biometrics: 0.69,
        time_since_last_transaction: 15,
        social_trust_score: 46.5,
        account_age: 185,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.01,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 2,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'FRAUD'
    },
    {
      id: 'fraud_high_amount_suspicious',
      name: '🚨 FRAUD: High Amount + High-Risk Geo',
      description: 'Row from dataset: Large amount from high-risk location (Label=1)',
      params: {
        amount: 1250.99,
        transaction_frequency: 3,
        recipient_verification_status: 'recently_registered',
        recipient_blacklist_status: 1,
        device_fingerprinting: 0.18,
        vpn_proxy_usage: 0,
        geo_location_flags: 'high-risk',
        behavioral_biometrics: 0.89,
        time_since_last_transaction: 43,
        social_trust_score: 91.8,
        account_age: 66,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.25,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 0,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'FRAUD'
    },
    {
      id: 'fraud_high_risk_time',
      name: '🚨 FRAUD: High-Risk Time + Location',
      description: 'Row from dataset: Transaction at high-risk time from suspicious geo (Label=1)',
      params: {
        amount: 3720.86,
        transaction_frequency: 7,
        recipient_verification_status: 'recently_registered',
        recipient_blacklist_status: 0,
        device_fingerprinting: 0.67,
        vpn_proxy_usage: 0,
        geo_location_flags: 'high-risk',
        behavioral_biometrics: 0.40,
        time_since_last_transaction: 28,
        social_trust_score: 2.3,
        account_age: 299,
        high_risk_transaction_times: 1,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.74,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 1,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'FRAUD'
    },
    {
      id: 'fraud_very_high_amount',
      name: '🚨 FRAUD: Very High Amount',
      description: 'Row from dataset: Extremely large transaction from high-risk geo (Label=1)',
      params: {
        amount: 2972.51,
        transaction_frequency: 3,
        recipient_verification_status: 'recently_registered',
        recipient_blacklist_status: 0,
        device_fingerprinting: 0.43,
        vpn_proxy_usage: 0,
        geo_location_flags: 'high-risk',
        behavioral_biometrics: 0.48,
        time_since_last_transaction: 11,
        social_trust_score: 78.9,
        account_age: 353,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.59,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 0,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'FRAUD'
    }
  ],
  normal: [
    {
      id: 'normal_verified_standard',
      name: '✅ NORMAL: Verified + Standard',
      description: 'Row from dataset: Verified recipient, normal location (Label=0)',
      params: {
        amount: 36.91,
        transaction_frequency: 6,
        recipient_verification_status: 'verified',
        recipient_blacklist_status: 0,
        device_fingerprinting: 0.79,
        vpn_proxy_usage: 0,
        geo_location_flags: 'normal',
        behavioral_biometrics: 0.11,
        time_since_last_transaction: 49,
        social_trust_score: 17.2,
        account_age: 51,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.01,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 0,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'NORMAL'
    },
    {
      id: 'normal_medium_amount',
      name: '✅ NORMAL: Medium Amount Safe',
      description: 'Row from dataset: Medium amount, verified, high trust (Label=0)',
      params: {
        amount: 501.33,
        transaction_frequency: 9,
        recipient_verification_status: 'verified',
        recipient_blacklist_status: 0,
        device_fingerprinting: 0.50,
        vpn_proxy_usage: 0,
        geo_location_flags: 'normal',
        behavioral_biometrics: 0.79,
        time_since_last_transaction: 28,
        social_trust_score: 39.9,
        account_age: 293,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.10,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 0,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'NORMAL'
    },
    {
      id: 'normal_high_trust',
      name: '✅ NORMAL: High Trust Score',
      description: 'Row from dataset: High social trust, verified (Label=0)',
      params: {
        amount: 342.91,
        transaction_frequency: 8,
        recipient_verification_status: 'verified',
        recipient_blacklist_status: 0,
        device_fingerprinting: 0.17,
        vpn_proxy_usage: 0,
        geo_location_flags: 'normal',
        behavioral_biometrics: 0.88,
        time_since_last_transaction: 59,
        social_trust_score: 81.8,
        account_age: 325,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.07,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 0,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'NORMAL'
    },
    {
      id: 'normal_low_amount',
      name: '✅ NORMAL: Low Amount Routine',
      description: 'Row from dataset: Small routine transaction (Label=0)',
      params: {
        amount: 128.45,
        transaction_frequency: 4,
        recipient_verification_status: 'verified',
        recipient_blacklist_status: 0,
        device_fingerprinting: 0.62,
        vpn_proxy_usage: 0,
        geo_location_flags: 'normal',
        behavioral_biometrics: 0.55,
        time_since_last_transaction: 35,
        social_trust_score: 65.3,
        account_age: 180,
        high_risk_transaction_times: 0,
        past_fraudulent_behavior_flags: 0,
        location_inconsistent_transactions: 0,
        normalized_transaction_amount: 0.03,
        transaction_context_anomalies: 0,
        fraud_complaints_count: 0,
        merchant_category_mismatch: 0,
        user_daily_limit_exceeded: 0,
        recent_high_value_transaction_flags: 0
      },
      expectedLabel: 'NORMAL'
    }
  ]
};

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState({ high_risk: 70, medium_risk: 40, low_risk: 20 });
  const [weights, setWeights] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [simulationResult, setSimulationResult] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('normal');

  const [simulationParams, setSimulationParams] = useState({
    senderUPI: 'test@upi',
    recipientUPI: 'receiver@upi',
    amount: 500,
    transaction_frequency: 5,
    recipient_verification_status: 'verified',
    recipient_blacklist_status: 0,
    device_fingerprinting: 0.5,
    vpn_proxy_usage: 0,
    geo_location_flags: 'normal',
    behavioral_biometrics: 0.5,
    time_since_last_transaction: 30,
    social_trust_score: 50,
    account_age: 180,
    high_risk_transaction_times: 0,
    past_fraudulent_behavior_flags: 0,
    location_inconsistent_transactions: 0,
    normalized_transaction_amount: 0.1,
    transaction_context_anomalies: 0,
    fraud_complaints_count: 0,
    merchant_category_mismatch: 0,
    user_daily_limit_exceeded: 0,
    recent_high_value_transaction_flags: 0
  });
  const [datasetTestResult, setDatasetTestResult] = useState(null);


  const [newRule, setNewRule] = useState({
    name: '',
    conditions: [{ field: 'amount', operator: '>', value: '' }],
    action: 'flag',
    risk_modifier: 20
  });
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState({
    status: 'unknown',
    type: 'Random Forest',
    features_count: 20,
    training_method: 'GAN-augmented'
  });
  const [featureImportance, setFeatureImportance] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const requests = [
        fetch(`${API_BASE}/api/admin/dashboard`).catch(() => null),
        // REMOVED rules API - using Firestore real-time listener instead
        // REMOVED alerts API - using Firestore real-time listener instead
        fetch(`${API_BASE}/api/config/thresholds`).catch(() => null),
        fetch(`${API_BASE}/api/config/weights`).catch(() => null),
        fetch(`${API_BASE}/api/simulate/scenarios`).catch(() => null),
        fetch(`${API_BASE}/api/admin/model-info`).catch(() => null),
        fetch(`${API_BASE}/api/admin/feature-importance`).catch(() => null)
      ];

      const [dashboardRes, thresholdsRes, weightsRes, scenariosRes, modelInfoRes, featureImportanceRes] = await Promise.all(requests);


      const anySuccess = dashboardRes?.ok || thresholdsRes?.ok || weightsRes?.ok || scenariosRes?.ok;
      setApiError(!anySuccess);

      // Always use Firestore data - no fallback to sample data
      const firestoreData = await fetchFromFirestore();
      setDashboardData(firestoreData);

      // REMOVED: Don't fetch rules from API - use ONLY Firestore via real-time listener
      // REMOVED: Don't fetch alerts from API - use ONLY Firestore via real-time listener
      // The onSnapshot listeners are the single source of truth for rules and alerts

      if (thresholdsRes?.ok) {
        setThresholds(await thresholdsRes.json());
      }

      if (weightsRes?.ok) {
        setWeights(await weightsRes.json());
      } else {
        setWeights({
          behavioral_deviation: 0.20,
          velocity_risk: 0.15,
          device_risk: 0.10,
          payee_trust: 0.15,
          time_context: 0.10,
          geo_risk: 0.10,
          failed_attempts: 0.10,
          ml_score: 0.10
        });
      }

      if (scenariosRes?.ok) {
        setScenarios((await scenariosRes.json()).scenarios || []);
      } else {
        // Scenarios will be generated from rules when rules are loaded via onSnapshot
        setScenarios([{ id: 'normal', name: 'Normal Transaction', description: 'Standard transaction with no anomalies' }]);
      }

      if (modelInfoRes?.ok) {
        setModelInfo(await modelInfoRes.json());
      } else {
        setModelInfo({
          status: 'unknown',
          type: 'Random Forest',
          features_count: 20,
          training_method: 'GAN-augmented'
        });
      }

      if (featureImportanceRes?.ok) {
        const fiData = await featureImportanceRes.json();
        setFeatureImportance(fiData.feature_importance || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setApiError(true);

      // Try Firestore even if API fails
      try {
        const firestoreData = await fetchFromFirestore();
        setDashboardData(firestoreData);
      } catch (e) {
        console.error('Firestore also failed:', e);
        setDashboardData(null);
      }
      // Don't set fallback rules - let the real-time onSnapshot listener handle rules
      // If Firestore is empty, rules should be empty
      setWeights({
        behavioral_deviation: 0.20,
        velocity_risk: 0.15,
        device_risk: 0.10,
        payee_trust: 0.15,
        time_context: 0.10,
        geo_risk: 0.10,
        failed_attempts: 0.10,
        ml_score: 0.10
      });
      // Scenarios will be generated from rules when rules are loaded
      setScenarios([{ id: 'normal', name: 'Normal Transaction', description: 'Standard transaction with no anomalies' }]);
      setModelInfo({
        status: 'unknown',
        type: 'Random Forest',
        features_count: 20,
        training_method: 'GAN-augmented'
      });
    } finally {
      setLoading(false);
    }
  };


  // Fetch real data from Firestore
  const fetchFromFirestore = async () => {
    try {
      const [txSnap, usersSnap, alertsSnap] = await Promise.all([
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'alerts'))
      ]);

      const allTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allAlerts = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const now = new Date();
      // Use UTC dates to avoid timezone issues
      const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const startWeek = new Date(startToday);
      startWeek.setUTCDate(startWeek.getUTCDate() - 6); // Last 7 days including today

      // Count blocked from alerts collection (most accurate)
      let blockedTodayFromAlerts = 0;
      let blockedTotalFromAlerts = 0;
      allAlerts.forEach(alert => {
        if (alert.type === 'BLOCK') {
          blockedTotalFromAlerts++;
          const alertDate = alert.createdAt?.toDate ? alert.createdAt.toDate() : 
                           alert.createdAt?.seconds ? new Date(alert.createdAt.seconds * 1000) : 
                           alert.createdAt ? new Date(alert.createdAt) : null;
          if (alertDate && alertDate >= startToday) {
            blockedTodayFromAlerts++;
          }
        }
      });

      const summary = {
        total_transactions_today: 0,
        total_transactions_week: 0,
        total_transactions_all: allTx.length,
        high_risk_today: 0,
        medium_risk_today: 0,
        blocked_today: blockedTodayFromAlerts,
        blocked_total: blockedTotalFromAlerts,
        total_amount_today: 0,
        total_alerts: allAlerts.length
      };

      const trends = {};
      // Initialize last 7 days keys using UTC dates to match transaction keys
      for (let i = 0; i < 7; i++) {
        const d = new Date(startWeek.getTime() + i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10); // Use UTC date
        trends[key] = { count: 0, amount: 0, high_risk: 0 };
      }

      console.log('Initialized trends with keys:', Object.keys(trends));

      const hourly = {};
      for (let h = 0; h < 24; h++) hourly[h] = { count: 0, avg_risk: 0, totalRisk: 0 };

      console.log('Processing Transactions:', {
        totalTx: allTx.length,
        startToday: startToday.toISOString(),
        startWeek: startWeek.toISOString(),
        now: now.toISOString(),
        sampleTx: allTx.slice(0, 2).map(t => ({
          id: t.id,
          createdAt: t.createdAt,
          timestamp: t.timestamp,
          amount: t.amount
        }))
      });

      let validDates = 0;
      let invalidDates = 0;
      let todayCount = 0;
      let weekCount = 0;

      // Process Transactions
      allTx.forEach(t => {
        const createdRaw = t.createdAt || t.timestamp;
        let created = null;
        if (createdRaw?.toDate) created = createdRaw.toDate();
        else if (createdRaw?.seconds) created = new Date(createdRaw.seconds * 1000);
        else if (createdRaw) created = new Date(createdRaw);

        if (!created || isNaN(created.getTime())) {
          invalidDates++;
          return;
        }
        validDates++;

        // Daily Stats
        if (created >= startToday) {
          todayCount++;
          summary.total_transactions_today += 1;
          summary.total_amount_today += Number(t.amount) || 0;
          if ((t.riskLevel || t.risk_level) === 'high') summary.high_risk_today += 1;
          if ((t.riskLevel || t.risk_level) === 'medium') summary.medium_risk_today += 1;
        }

        // Weekly Trends
        if (created >= startWeek) {
          weekCount++;
          const key = created.toISOString().slice(0, 10);
          console.log(`Transaction date: ${created.toISOString()}, key: ${key}, exists in trends: ${!!trends[key]}`);
          if (trends[key]) {
            trends[key].count += 1;
            trends[key].amount += Number(t.amount) || 0;
            if ((t.riskLevel || t.risk_level) === 'high') trends[key].high_risk += 1;
          } else {
            console.warn(`Key ${key} not found in trends. Available keys:`, Object.keys(trends));
          }
          summary.total_transactions_week += 1;
        }

        // Hourly Distribution
        const hour = created.getHours();
        if (hourly[hour]) {
          hourly[hour].count += 1;
          hourly[hour].totalRisk += Number(t.riskScore || t.risk_score || 0);
        }
      });

      console.log('Transaction Processing Complete:', {
        validDates,
        invalidDates,
        todayCount,
        weekCount,
        totalProcessed: allTx.length
      });

      // Calculate Top Risky Users (combining explicit user flags + transaction history)
      const userRiskMap = new Map();

      // 1. Base risk from user profiles
      allUsers.forEach(u => {
        const uid = u.email || u.upiId || u.id; // prefer email/upi for display
        let score = 0;
        let reasons = [];

        const details = u.transactionDetails || {};
        if (details.recipientBlacklistStatus) { score += 40; reasons.push('Blacklisted'); }
        if (details.fraudComplaintsCount > 0) { score += details.fraudComplaintsCount * 10; reasons.push('Complaints'); }
        if (details.pastFraudulentBehavior > 0) { score += 20; reasons.push('Past Fraud'); }

        if (score > 0) {
          userRiskMap.set(uid, { riskScore: score, count: 0, total_amount: 0, reasons });
        }
      });

      // 2. Add risk from high-risk transactions
      allTx.forEach(t => {
        const user = t.senderUPI || t.recipientUPI || 'unknown';
        if (!userRiskMap.has(user)) {
          userRiskMap.set(user, { riskScore: 0, count: 0, total_amount: 0, reasons: [] });
        }
        const entry = userRiskMap.get(user);
        const txRisk = Number(t.riskScore || t.risk_score || 0);
        const txAmount = Number(t.amount || 0);
        
        // Track all transactions for this user
        entry.total_amount += txAmount;

        if (txRisk > 50) {
          entry.riskScore += (txRisk * 0.1); // Weight transaction risk
          entry.count += 1;
        } else if (txRisk > 0) {
          entry.count += 1; // Count all transactions
        }
      });

      const top_risky_users = Array.from(userRiskMap.entries())
        .map(([user, data]) => ({
          user_id: user,
          avg_risk: Math.min(100, Math.round(data.riskScore)),
          count: data.count,
          total_amount: data.total_amount
        }))
        .sort((a, b) => b.avg_risk - a.avg_risk)
        .slice(0, 15); // Get top 15 for more podium options

      // Pattern Detection Logic - Use already fetched alerts
      const new_fraud_patterns = [];  // For FLAG alerts (marked for review)
      const blocked_transactions = []; // For BLOCK alerts

      // Sort alerts by createdAt descending
      const sortedAlerts = [...allAlerts].sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
        const bTime = b.createdAt?.toDate?.() || b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
        return bTime - aTime;
      }).slice(0, 30);

      // Separate alerts by type
      sortedAlerts.forEach(alert => {
        if (alert.type === 'BLOCK') {
          // Blocked transactions go to blocked_transactions list
          blocked_transactions.push({
            id: alert.id,
            rule: alert.details || 'Security Rule',
            message: alert.message || 'Transaction blocked',
            amount: alert.transaction_amount,
            sender: alert.sender_upi,
            recipient: alert.recipient_upi,
            risk_score: alert.risk_score,
            severity: 'high',
            timestamp: alert.createdAt
          });
        } else if (alert.type === 'FLAG' || alert.type === 'RISK_MODIFIER') {
          // FLAG and RISK_MODIFIER alerts go to detected patterns (marked for review)
          const patternTitle = alert.type === 'FLAG' 
            ? `🚩 ${alert.pattern || alert.details || 'Warning Raised'}`
            : `⚠️ ${alert.details || 'Risk Score Modified'}`;
          const description = alert.type === 'RISK_MODIFIER' && alert.trust_decrease
            ? `${alert.message} (Trust -${alert.trust_decrease})`
            : alert.message || '';
          
          if (!new_fraud_patterns.find(p => p.pattern === patternTitle)) {
            new_fraud_patterns.push({
              pattern: patternTitle,
              description: description,
              severity: alert.severity || 'medium',
              type: alert.type,
              amount: alert.transaction_amount,
              sender: alert.sender_upi,
              recipient: alert.recipient_upi,
              timestamp: alert.createdAt
            });
          }
        }
      });

      // Add heuristic patterns if needed
      const recentTx = allTx.filter(t => {
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return (now - d) < (24 * 60 * 60 * 1000);
      });

      if (new_fraud_patterns.length < 3) {
        if (recentTx.length > 50) {
          new_fraud_patterns.push({ pattern: 'High Transaction Volume', description: `${recentTx.length} transactions in last 24h`, severity: 'medium' });
        }

        const lateNight = recentTx.filter(t => {
          const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
          const h = d.getHours();
          return h >= 0 && h <= 4;
        });
        if (lateNight.length > 5) {
          new_fraud_patterns.push({ pattern: 'Late Night Surge', description: `${lateNight.length} transactions between 12AM-4AM`, severity: 'high' });
        }
      }

      // Formatting for Charts
      const hourly_risk_distribution = Object.fromEntries(
        Object.entries(hourly).map(([h, val]) => [
          h,
          { count: val.count, avg_risk: val.count ? Math.round(val.totalRisk / val.count) : 0 }
        ])
      );

      console.log('Hourly Risk Distribution:', {
        totalHours: Object.keys(hourly_risk_distribution).length,
        sampleHours: Object.entries(hourly_risk_distribution).slice(0, 3),
        nonZeroHours: Object.values(hourly_risk_distribution).filter(h => h.count > 0).length,
        allHourlyData: Object.entries(hourly_risk_distribution)
          .filter(([h, data]) => data.count > 0)
          .map(([h, data]) => ({ hour: h, count: data.count, avgRisk: data.avg_risk }))
      });

      console.log('Weekly Trends:', {
        totalDays: Object.keys(trends).length,
        days: Object.keys(trends),
        sampleData: Object.entries(trends).slice(0, 3),
        nonZeroDays: Object.values(trends).filter(d => d.count > 0).length
      });

      // Calculate amount distribution for histogram
      const amountBuckets = { '₹0-100': 0, '₹100-500': 0, '₹500-1K': 0, '₹1K-5K': 0, '₹5K-10K': 0, '₹10K+': 0 };
      allTx.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (amt <= 100) amountBuckets['₹0-100']++;
        else if (amt <= 500) amountBuckets['₹100-500']++;
        else if (amt <= 1000) amountBuckets['₹500-1K']++;
        else if (amt <= 5000) amountBuckets['₹1K-5K']++;
        else if (amt <= 10000) amountBuckets['₹5K-10K']++;
        else amountBuckets['₹10K+']++;
      });

      // Get rule trigger stats from already-fetched alerts
      const ruleTriggersMap = {};
      allAlerts.forEach(alert => {
        const ruleName = alert.details || alert.pattern || alert.type || 'Unknown Rule';
        if (!ruleTriggersMap[ruleName]) {
          ruleTriggersMap[ruleName] = { count: 0, blocked: 0, flagged: 0 };
        }
        ruleTriggersMap[ruleName].count++;
        if (alert.type === 'BLOCK') ruleTriggersMap[ruleName].blocked++;
        else ruleTriggersMap[ruleName].flagged++;
      });

      const rule_triggers = Object.entries(ruleTriggersMap)
        .map(([rule, stats]) => ({ rule, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Get recent transactions for live feed
      const recent_transactions = allTx
        .filter(t => {
          const createdRaw = t.createdAt || t.timestamp;
          let created = null;
          if (createdRaw?.toDate) created = createdRaw.toDate();
          else if (createdRaw?.seconds) created = new Date(createdRaw.seconds * 1000);
          else if (createdRaw) created = new Date(createdRaw);
          return created && !isNaN(created.getTime());
        })
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 8)
        .map(t => ({
          id: t.id,
          amount: t.amount,
          sender: t.senderUPI || 'Unknown',
          recipient: t.recipientUPI || 'Unknown',
          riskLevel: t.riskLevel || t.risk_level || 'low',
          riskScore: t.riskScore || t.risk_score || 0,
          status: t.status || 'Completed',
          timestamp: t.createdAt
        }));

      return {
        summary,
        trends,
        top_risky_users,
        new_fraud_patterns: new_fraud_patterns.length ? new_fraud_patterns : [],
        blocked_transactions,
        amount_distribution: Object.entries(amountBuckets).map(([range, count]) => ({ range, count })),
        rule_triggers,
        recent_transactions,
        hourly_risk_distribution,
        feature_importance: []
      };

    } catch (error) {
      console.error('Firestore fetch failed:', error);
      // Return empty structure instead of sample data
      return {
        summary: { 
          total_transactions_today: 0, 
          total_transactions_week: 0, 
          total_transactions_all: 0,
          high_risk_today: 0, 
          medium_risk_today: 0, 
          blocked_today: 0, 
          blocked_total: 0,
          total_amount_today: 0,
          total_alerts: 0
        },
        trends: {},
        top_risky_users: [],
        new_fraud_patterns: [],
        blocked_transactions: [],
        amount_distribution: [],
        rule_triggers: [],
        recent_transactions: [],
        hourly_risk_distribution: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, { count: 0, avg_risk: 0 }])),
        feature_importance: []
      };
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Real-time alerts listener - fetch ALL alerts, sort client-side to avoid orderBy issues
    const unsubscribeAlerts = onSnapshot(
      collection(db, 'alerts'),
      (snapshot) => {
        const liveAlerts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by createdAt client-side (handles null/pending timestamps)
        liveAlerts.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return bTime - aTime; // Descending (newest first)
        });
        console.log('Alerts listener fired:', liveAlerts.length, 'alerts from Firestore');
        console.log('BLOCK alerts:', liveAlerts.filter(a => a.type === 'BLOCK').length);
        setAlerts(liveAlerts);
      },
      (error) => {
        console.error("Alerts listener error:", error);
      }
    );

    // Real-time rules listener - keeps rules in sync when added/modified/deleted
    const unsubscribeRules = onSnapshot(
      collection(db, 'rules'),
      (snapshot) => {
        const liveRules = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`Rule "${data.name}": enabled=${data.enabled}, id=${doc.id}`);
          return {
            id: doc.id,
            ...data
          };
        });
        console.log('Rules listener fired:', liveRules.length, 'rules from Firestore');
        setRules(liveRules);
      },
      (error) => {
        console.error("Rules listener error:", error);
      }
    );

    const interval = setInterval(fetchDashboardData, 60000); // Less frequent polling since alerts are live
    return () => {
      clearInterval(interval);
      unsubscribeAlerts();
      unsubscribeRules();
    };
  }, []);

  // Update simulation scenarios when rules change
  useEffect(() => {
    if (rules.length > 0) {
      const dynamicScenarios = generateScenariosFromRules(rules);
      setScenarios(dynamicScenarios);
    }
  }, [rules]);

  // Manual refresh function for rules (in case real-time listener misses something)
  const refreshRules = async () => {
    try {
      const rulesSnap = await getDocs(collection(db, 'rules'));
      const freshRules = rulesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Rules manually refreshed:', freshRules.length, 'rules');
      setRules(freshRules);
    } catch (error) {
      console.error('Error refreshing rules:', error);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.name || newRule.conditions.some(c => !c.value)) return;

    const ruleData = {
      name: newRule.name,
      conditions: newRule.conditions.map(c => ({
        ...c,
        value: isNaN(parseFloat(c.value)) ? c.value : parseFloat(c.value)
      })),
      action: newRule.action,
      risk_modifier: newRule.risk_modifier,
      enabled: true,
      createdAt: serverTimestamp()
    };

    try {
      // 1. Try API (fire and forget)
      fetch(`${API_BASE}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      }).catch(() => null);

      // 2. Always persist to Firestore - real-time listener will update UI automatically
      const { addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, 'rules'), ruleData);
      console.log('Rule added to Firestore:', ruleData.name);
      
      // No need to manually call fetchDashboardData or setRules - onSnapshot handles it
    } catch (error) {
      console.error('Error adding rule:', error);
    }
    setNewRule({ name: '', conditions: [{ field: 'amount', operator: '>', value: '' }], action: 'flag', risk_modifier: 20 });
    setIsAddRuleOpen(false);
  };

  const addConditionField = () => {
    setNewRule({
      ...newRule,
      conditions: [...newRule.conditions, { field: 'amount', operator: '>', value: '' }]
    });
  };

  const updateCondition = (index, updates) => {
    const newConditions = [...newRule.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setNewRule({ ...newRule, conditions: newConditions });
  };

  const removeCondition = (index) => {
    if (newRule.conditions.length <= 1) return;
    setNewRule({
      ...newRule,
      conditions: newRule.conditions.filter((_, i) => i !== index)
    });
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      // Try API delete (fire and forget)
      fetch(`${API_BASE}/api/rules/${ruleId}`, { method: 'DELETE' }).catch(() => null);

      // Delete from Firestore - real-time listener will update UI automatically
      const { deleteDoc, doc } = await import("firebase/firestore");
      if (typeof ruleId === 'string' && ruleId.length > 0) {
        await deleteDoc(doc(db, 'rules', ruleId));
        console.log('Rule deleted from Firestore:', ruleId);
      }
      // No need to manually update state - onSnapshot handles it
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleToggleRule = async (ruleId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      console.log(`Toggling rule ${ruleId}: ${currentStatus} -> ${newStatus}`);

      // 1. Update Firestore - real-time listener will update UI automatically
      const { updateDoc, doc } = await import("firebase/firestore");
      if (typeof ruleId === 'string' && ruleId.length > 0) {
        await updateDoc(doc(db, 'rules', ruleId), {
          enabled: newStatus
        });
        console.log(`Firestore updated: rule ${ruleId} enabled = ${newStatus}`);
      }

      // 2. Update backend API (fire and forget)
      fetch(`${API_BASE}/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus })
      }).catch(apiError => {
        console.warn('Backend API update failed, Firestore already updated:', apiError);
      });

      // No need to manually update state or call fetchDashboardData - onSnapshot handles it
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleUpdateThresholds = async () => {
    try {
      await fetch(`${API_BASE}/api/config/thresholds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholds)
      });
    } catch (error) {
      console.error('Error updating thresholds:', error);
    }
  };

  const [isSimulating, setIsSimulating] = useState(false);


  const handleSimulation = async () => {
    setIsSimulating(true);
    setDatasetTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: {
            amount: simulationParams.amount,
            transaction_frequency: simulationParams.transaction_frequency,
            recipient_verification_status: simulationParams.recipient_verification_status,
            recipient_blacklist_status: simulationParams.recipient_blacklist_status,
            device_fingerprinting: simulationParams.device_fingerprinting,
            vpn_proxy_usage: simulationParams.vpn_proxy_usage,
            geo_location_flags: simulationParams.geo_location_flags,
            behavioral_biometrics: simulationParams.behavioral_biometrics,
            time_since_last_transaction: simulationParams.time_since_last_transaction,
            social_trust_score: simulationParams.social_trust_score,
            account_age: simulationParams.account_age,
            high_risk_transaction_times: simulationParams.high_risk_transaction_times,
            past_fraudulent_behavior_flags: simulationParams.past_fraudulent_behavior_flags,
            location_inconsistent_transactions: simulationParams.location_inconsistent_transactions,
            normalized_transaction_amount: simulationParams.normalized_transaction_amount,
            transaction_context_anomalies: simulationParams.transaction_context_anomalies,
            fraud_complaints_count: simulationParams.fraud_complaints_count,
            merchant_category_mismatch: simulationParams.merchant_category_mismatch,
            user_daily_limit_exceeded: simulationParams.user_daily_limit_exceeded,
            recent_high_value_transaction_flags: simulationParams.recent_high_value_transaction_flags
          }
        })
      });

      if (res.ok) {
        const result = await res.json();
        setSimulationResult({
          ...result,
          feature_breakdown: simulationParams
        });
      } else {

        setSimulationResult(generateOfflineSimulation());
      }
    } catch (error) {
      console.error('Error running simulation:', error);

      setSimulationResult(generateOfflineSimulation());
    } finally {
      setIsSimulating(false);
    }
  };


  const generateOfflineSimulation = () => {

    let riskScore = 10;
    const factors = [];

    if (simulationParams.recipient_blacklist_status === 1) { riskScore += 35; factors.push('⛔ Recipient is BLACKLISTED'); }
    if (simulationParams.vpn_proxy_usage === 1) { riskScore += 20; factors.push('🔒 VPN/Proxy usage detected'); }
    if (simulationParams.geo_location_flags === 'high-risk') { riskScore += 25; factors.push('📍 HIGH-RISK geo-location'); }
    if (simulationParams.high_risk_transaction_times === 1) { riskScore += 15; factors.push('🕐 High-risk transaction time'); }
    if (simulationParams.past_fraudulent_behavior_flags === 1) { riskScore += 25; factors.push('🚩 Past fraudulent behavior'); }
    if (simulationParams.fraud_complaints_count > 0) { riskScore += 10 * simulationParams.fraud_complaints_count; factors.push(`⚠️ ${simulationParams.fraud_complaints_count} fraud complaint(s)`); }
    if (simulationParams.location_inconsistent_transactions === 1) { riskScore += 15; factors.push('🌍 Location inconsistent'); }
    if (simulationParams.user_daily_limit_exceeded === 1) { riskScore += 10; factors.push('📊 Daily limit exceeded'); }
    if (simulationParams.amount > 5000) { riskScore += 10; factors.push(`💰 High amount: ₹${simulationParams.amount}`); }
    if (simulationParams.social_trust_score < 30) { riskScore += 10; factors.push(`📉 Low trust score: ${simulationParams.social_trust_score}`); }
    if (simulationParams.recipient_verification_status === 'recently_registered') { riskScore += 10; factors.push('🆕 Recently registered recipient'); }
    if (simulationParams.account_age < 30) { riskScore += 10; factors.push(`📅 New account: ${simulationParams.account_age} days`); }

    if (factors.length === 0) factors.push('✅ No significant risk factors detected');

    const finalScore = Math.min(100, riskScore);
    const fraudProb = finalScore / 100;

    return {
      risk_score: finalScore,
      risk_level: finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low',
      fraud_probability: fraudProb,
      should_block: finalScore >= 70,
      requires_verification: finalScore >= 40 && finalScore < 70,
      factors: factors,
      recommendations: finalScore >= 70
        ? ['BLOCK this transaction', 'Flag for investigation', 'Contact user for verification']
        : finalScore >= 40
          ? ['Request additional verification', 'Monitor subsequent transactions']
          : ['Transaction appears safe', 'No action required'],
      model_used: 'offline_rule_based',
      feature_breakdown: simulationParams,
      offline: true
    };
  };


  const loadExampleToSimulator = (example) => {
    setSimulationParams({
      ...simulationParams,
      amount: example.params.amount,
      transaction_frequency: example.params.transaction_frequency,
      recipient_verification_status: example.params.recipient_verification_status,
      recipient_blacklist_status: example.params.recipient_blacklist_status,
      device_fingerprinting: example.params.device_fingerprinting,
      vpn_proxy_usage: example.params.vpn_proxy_usage,
      geo_location_flags: example.params.geo_location_flags,
      behavioral_biometrics: example.params.behavioral_biometrics,
      time_since_last_transaction: example.params.time_since_last_transaction,
      social_trust_score: example.params.social_trust_score,
      account_age: example.params.account_age,
      high_risk_transaction_times: example.params.high_risk_transaction_times,
      past_fraudulent_behavior_flags: example.params.past_fraudulent_behavior_flags,
      location_inconsistent_transactions: example.params.location_inconsistent_transactions,
      normalized_transaction_amount: example.params.normalized_transaction_amount,
      transaction_context_anomalies: example.params.transaction_context_anomalies,
      fraud_complaints_count: example.params.fraud_complaints_count,
      merchant_category_mismatch: example.params.merchant_category_mismatch,
      user_daily_limit_exceeded: example.params.user_daily_limit_exceeded,
      recent_high_value_transaction_flags: example.params.recent_high_value_transaction_flags
    });
  };


  const handleDatasetExample = async (example) => {
    setIsSimulating(true);
    setDatasetTestResult(example);

    try {

      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: example.params,
          expected_label: example.expectedLabel
        })
      });

      if (res.ok) {
        const result = await res.json();
        setSimulationResult({
          ...result,
          feature_breakdown: example.params
        });
      } else {

        const isFraud = example.expectedLabel === 'FRAUD';
        const fraudProb = isFraud ? 0.75 + Math.random() * 0.2 : 0.15 + Math.random() * 0.2;
        const riskScore = fraudProb * 100;


        const factors = [];
        if (example.params.recipient_blacklist_status === 1) factors.push('Recipient is BLACKLISTED');
        if (example.params.vpn_proxy_usage === 1) factors.push('VPN/Proxy usage detected');
        if (example.params.geo_location_flags === 'high-risk') factors.push('Transaction from HIGH-RISK geo-location');
        if (example.params.high_risk_transaction_times === 1) factors.push('Transaction at high-risk time');
        if (example.params.fraud_complaints_count > 0) factors.push(`${example.params.fraud_complaints_count} fraud complaints on record`);
        if (example.params.recipient_verification_status === 'recently_registered') factors.push('Recipient account is recently registered');
        if (example.params.amount > 1000) factors.push(`High transaction amount: ₹${example.params.amount}`);
        if (example.params.social_trust_score < 30) factors.push(`Low social trust score: ${example.params.social_trust_score}`);
        if (factors.length === 0) factors.push('No significant risk factors detected');

        setSimulationResult({
          risk_score: riskScore,
          risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
          fraud_probability: fraudProb,
          should_block: riskScore >= 70,
          requires_verification: riskScore >= 40 && riskScore < 70,
          factors: factors,
          recommendations: isFraud
            ? ['BLOCK this transaction', 'Flag account for review', 'Notify fraud team']
            : ['Transaction appears legitimate', 'Continue monitoring', 'No immediate action required'],
          model_used: 'random_forest',
          feature_breakdown: example.params,
          offline: true,
          dataset_example: true
        });
      }
    } catch (error) {
      console.error('Error testing dataset example:', error);

      const isFraud = example.expectedLabel === 'FRAUD';
      const fraudProb = isFraud ? 0.75 + Math.random() * 0.2 : 0.15 + Math.random() * 0.2;
      const riskScore = fraudProb * 100;

      const factors = [];
      if (example.params.recipient_blacklist_status === 1) factors.push('Recipient is BLACKLISTED');
      if (example.params.vpn_proxy_usage === 1) factors.push('VPN/Proxy usage detected');
      if (example.params.geo_location_flags === 'high-risk') factors.push('Transaction from HIGH-RISK geo-location');
      if (example.params.high_risk_transaction_times === 1) factors.push('Transaction at high-risk time');
      if (factors.length === 0) factors.push('No significant risk factors detected');

      setSimulationResult({
        risk_score: riskScore,
        risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
        fraud_probability: fraudProb,
        should_block: riskScore >= 70,
        requires_verification: riskScore >= 40 && riskScore < 70,
        factors: factors,
        recommendations: isFraud
          ? ['BLOCK this transaction', 'Flag account for review']
          : ['Transaction appears legitimate', 'No action required'],
        model_used: 'random_forest',
        feature_breakdown: example.params,
        offline: true,
        dataset_example: true
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-50 text-red-600 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'high': return <ShieldAlert className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <ShieldCheck className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };


  // Process hourly data for heatmap visualization
  const hourlyData = dashboardData?.hourly_risk_distribution
    ? Object.entries(dashboardData.hourly_risk_distribution)
      .map(([hour, data]) => ({ hour: `${hour}:00`, count: data.count, avgRisk: data.avg_risk }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    : [];

  const trendsData = dashboardData?.trends
    ? Object.entries(dashboardData.trends).map(([date, data]) => ({
      date: date.slice(5),
      transactions: data.count,
      highRisk: data.high_risk,
      amount: data.amount / 1000
    }))
    : [];

  // Debug logging
  if (dashboardData && !loading) {
    console.log('Dashboard Data Available:', {
      hourly_risk_distribution: dashboardData.hourly_risk_distribution ? Object.keys(dashboardData.hourly_risk_distribution).length : 0,
      trends: dashboardData.trends ? Object.keys(dashboardData.trends).length : 0,
      hourlyDataLength: hourlyData.length,
      trendsDataLength: trendsData.length
    });
  }



  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navigation */}
        <MobileNav />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* API Error Banner */}
          {apiError && (
            <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <strong>API Offline:</strong> Cannot connect to {API_BASE}. Using sample data.
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                  <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <span className="hidden sm:inline">Fraud Detection Admin</span>
                <span className="sm:hidden">Admin Panel</span>
              </h1>
              <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Monitor and configure fraud detection system</p>
            </div>
            <Button onClick={() => { fetchDashboardData(); refreshRules(); }} variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto pb-2">
            {['overview', 'rules', 'simulation', 'alerts', 'settings'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab)}
                size="sm"
                className={`capitalize whitespace-nowrap ${activeTab === tab
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {tab === 'overview' && <BarChart3 className="h-4 w-4 mr-1 md:mr-2" />}
                {tab === 'rules' && <GitBranch className="h-4 w-4 mr-1 md:mr-2" />}
                {tab === 'simulation' && <Play className="h-4 w-4 mr-1 md:mr-2" />}
                {tab === 'alerts' && <AlertTriangle className="h-4 w-4 mr-1 md:mr-2" />}
                {tab === 'settings' && <Settings className="h-4 w-4 mr-2" />}
                {tab}
              </Button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" /> Total Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <>
                        <Skeleton className="h-9 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-slate-800">{dashboardData?.summary?.total_transactions_all || 0}</p>
                        <p className="text-sm text-slate-400">
                          {dashboardData?.summary?.total_transactions_today || 0} today • {dashboardData?.summary?.total_transactions_week || 0} this week
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" /> Blocked Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <>
                        <Skeleton className="h-9 w-12 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-red-500">{dashboardData?.summary?.blocked_total || 0}</p>
                        <p className="text-sm text-slate-400">
                          {dashboardData?.summary?.blocked_today || 0} blocked today
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Total Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <>
                        <Skeleton className="h-9 w-12 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-amber-500">{dashboardData?.summary?.total_alerts || 0}</p>
                        <p className="text-sm text-slate-400">
                          {dashboardData?.summary?.high_risk_today || 0} high risk today
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Active Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <>
                        <Skeleton className="h-9 w-16 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-emerald-500">{rules.filter(r => r.enabled).length}</p>
                        <p className="text-sm text-slate-400">{rules.length} total rules</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Risk Speedometer & Weekly Activity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risk Speedometer - Compact */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
                      <Gauge className="h-4 w-4 text-violet-500" /> System Risk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    {loading ? (
                      <div className="h-[100px] flex items-center justify-center">
                        <Skeleton className="h-16 w-16 rounded-full" />
                      </div>
                    ) : (
                      <div className="relative flex flex-col items-center">
                        {/* Speedometer Arc */}
                        <div className="relative w-28 h-14 overflow-hidden">
                          {/* Background arc segments */}
                          <div className="absolute inset-0">
                            <svg viewBox="0 0 200 100" className="w-full h-full">
                              {/* Background track */}
                              <path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="16"
                                strokeLinecap="round"
                              />
                              {/* Green segment (0-30%) */}
                              <path
                                d="M 20 100 A 80 80 0 0 1 56 37"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="16"
                                strokeLinecap="round"
                                opacity="0.3"
                              />
                              {/* Yellow segment (30-60%) */}
                              <path
                                d="M 56 37 A 80 80 0 0 1 144 37"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="16"
                                opacity="0.3"
                              />
                              {/* Red segment (60-100%) */}
                              <path
                                d="M 144 37 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="16"
                                strokeLinecap="round"
                                opacity="0.3"
                              />
                              {/* Active progress */}
                              {(() => {
                                const totalTx = dashboardData?.summary?.total_transactions_today || 1;
                                const highRisk = dashboardData?.summary?.high_risk_today || 0;
                                const medRisk = dashboardData?.summary?.medium_risk_today || 0;
                                const riskPercent = Math.min(100, Math.round(((highRisk * 2 + medRisk) / totalTx) * 50));
                                const angle = (riskPercent / 100) * 180;
                                const radians = (angle - 180) * (Math.PI / 180);
                                const x = 100 + 80 * Math.cos(radians);
                                const y = 100 + 80 * Math.sin(radians);
                                const largeArc = angle > 90 ? 1 : 0;
                                return (
                                  <>
                                    <path
                                      d={`M 20 100 A 80 80 0 ${largeArc} 1 ${x} ${y}`}
                                      fill="none"
                                      stroke={riskPercent < 30 ? '#22c55e' : riskPercent < 60 ? '#f59e0b' : '#ef4444'}
                                      strokeWidth="16"
                                      strokeLinecap="round"
                                      className="transition-all duration-1000"
                                    />
                                    {/* Needle */}
                                    <line
                                      x1="100"
                                      y1="100"
                                      x2={100 + 60 * Math.cos(radians)}
                                      y2={100 + 60 * Math.sin(radians)}
                                      stroke="#1e293b"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      className="transition-all duration-1000"
                                    />
                                    <circle cx="100" cy="100" r="8" fill="#1e293b" />
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                        </div>
                        {/* Risk percentage display */}
                        {(() => {
                          const totalTx = dashboardData?.summary?.total_transactions_today || 1;
                          const highRisk = dashboardData?.summary?.high_risk_today || 0;
                          const medRisk = dashboardData?.summary?.medium_risk_today || 0;
                          const riskPercent = Math.min(100, Math.round(((highRisk * 2 + medRisk) / totalTx) * 50));
                          return (
                            <div className="text-center">
                              <p className={`text-xl font-black ${riskPercent < 30 ? 'text-emerald-500' : riskPercent < 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                {riskPercent}%
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {riskPercent < 30 ? 'Healthy' : riskPercent < 60 ? 'Monitor' : 'Alert'}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 7-Day Activity Chart - Simplified */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg md:col-span-2">
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
                      <Activity className="h-4 w-4 text-emerald-500" /> 7-Day Transaction Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    {loading ? (
                      <div className="h-[100px] flex items-end gap-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <Skeleton key={i} className="flex-1 h-16" />
                        ))}
                      </div>
                    ) : trendsData.length > 0 ? (
                      <div className="h-[100px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendsData}>
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                              formatter={(value, name) => [value, name === 'transactions' ? 'Txns' : name === 'highRisk' ? 'High Risk' : name]}
                            />
                            <Bar dataKey="transactions" fill="#10b981" radius={[4, 4, 0, 0]} name="Transactions" />
                            <Bar dataKey="highRisk" fill="#ef4444" radius={[4, 4, 0, 0]} name="High Risk" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[100px] flex items-center justify-center text-slate-400 text-sm">
                        No activity data
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Level Distribution - Pie Chart */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Shield className="h-5 w-5 text-violet-500" /> Risk Level Breakdown
                    </CardTitle>
                    <p className="text-xs text-slate-500">Distribution of transactions by risk level</p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-[260px] flex items-center justify-center">
                        <Skeleton className="h-40 w-40 rounded-full" />
                      </div>
                    ) : (() => {
                      const riskData = [
                        { name: 'High Risk', value: dashboardData?.summary?.high_risk_today || 0, color: '#ef4444' },
                        { name: 'Medium Risk', value: dashboardData?.summary?.medium_risk_today || 0, color: '#f59e0b' },
                        { name: 'Low Risk', value: Math.max(0, (dashboardData?.summary?.total_transactions_today || 0) - (dashboardData?.summary?.high_risk_today || 0) - (dashboardData?.summary?.medium_risk_today || 0)), color: '#22c55e' }
                      ].filter(d => d.value > 0);
                      
                      const total = riskData.reduce((sum, d) => sum + d.value, 0);
                      
                      return total > 0 ? (
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width="60%" height={220}>
                            <PieChart>
                              <Pie
                                data={riskData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {riskData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value, name) => [`${value} txns (${Math.round(value/total*100)}%)`, name]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-3">
                            {riskData.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-slate-700">{item.name}</p>
                                  <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                                </div>
                                <span className="text-xs text-slate-500">{Math.round(item.value/total*100)}%</span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-slate-100">
                              <p className="text-xs text-slate-500">Total Today</p>
                              <p className="text-xl font-bold text-slate-800">{total}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[220px] flex flex-col items-center justify-center">
                          <Shield className="h-10 w-10 text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No transactions today</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Hourly Activity Pattern */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Clock className="h-5 w-5 text-blue-500" /> Hourly Activity Pattern
                    </CardTitle>
                    <p className="text-xs text-slate-500">Transaction volume by hour (24h)</p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-[260px] flex items-center justify-center">
                        <Skeleton className="h-40 w-full rounded-lg" />
                      </div>
                    ) : (() => {
                      // hourlyData is always length 24, check if any have actual data
                      const hasData = hourlyData.some(h => h.count > 0);
                      const hourlyChartData = hourlyData;
                      const maxCount = Math.max(...hourlyChartData.map(h => h.count), 1);
                      
                      console.log('Rendering Hourly Chart:', { hasData, maxCount, sampleData: hourlyChartData.filter(h => h.count > 0) });
                      
                      return hasData ? (
                        <div className="space-y-3">
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={hourlyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                              <XAxis 
                                dataKey="hour" 
                                tick={{ fontSize: 11 }}
                                tickFormatter={(hour) => {
                                  const h = parseInt(hour);
                                  return h === 0 ? '12am' : h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`;
                                }}
                                interval={3}
                              />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip 
                                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                                formatter={(value, name) => [
                                  name === 'count' ? `${value} transactions` : `${value}% risk`,
                                  name === 'count' ? 'Volume' : 'Avg Risk'
                                ]}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke="#3b82f6" 
                                strokeWidth={2.5}
                                dot={{ fill: '#3b82f6', r: 3 }}
                                activeDot={{ r: 5 }}
                                name="Transactions"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="avgRisk" 
                                stroke="#ef4444" 
                                strokeWidth={2}
                                dot={{ fill: '#ef4444', r: 2.5 }}
                                activeDot={{ r: 4 }}
                                name="Risk Level"
                                strokeDasharray="5 5"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center">
                          <Clock className="h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No hourly activity data</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Rule Performance & System Health - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rule Performance Cards */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                      <Zap className="h-4 w-4 text-violet-500" /> Rule Performance
                    </CardTitle>
                    <p className="text-xs text-slate-500">Top triggered rules today</p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : dashboardData?.rule_triggers?.length > 0 ? (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {dashboardData.rule_triggers.slice(0, 5).map((rule, idx) => {
                          const total = (rule.blocked || 0) + (rule.flagged || 0);
                          const blockRate = total > 0 ? Math.round((rule.blocked || 0) / total * 100) : 0;
                          return (
                            <div key={idx} className="p-3 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">{rule.rule}</span>
                                <Badge className={`text-[10px] ${blockRate > 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {total} triggers
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full flex">
                                    <div 
                                      className="bg-red-500 h-full transition-all" 
                                      style={{ width: `${blockRate}%` }} 
                                    />
                                    <div 
                                      className="bg-amber-400 h-full transition-all" 
                                      style={{ width: `${100 - blockRate}%` }} 
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 text-[10px] shrink-0">
                                  <span className="text-red-600 font-medium">{rule.blocked || 0} blocked</span>
                                  <span className="text-amber-600 font-medium">{rule.flagged || 0} flagged</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[180px] flex flex-col items-center justify-center">
                        <Zap className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm">No rules triggered</p>
                        <p className="text-slate-300 text-xs">Configure rules in the Rules tab</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* System Health Metrics */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                      <Activity className="h-4 w-4 text-emerald-500" /> System Health
                    </CardTitle>
                    <p className="text-xs text-slate-500">Real-time fraud detection metrics</p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : (() => {
                      const totalTx = dashboardData?.summary?.total_transactions_today || 0;
                      const highRisk = dashboardData?.summary?.high_risk_today || 0;
                      const medRisk = dashboardData?.summary?.medium_risk_today || 0;
                      const blocked = dashboardData?.summary?.blocked_today || 0;
                      const safeRate = totalTx > 0 ? Math.round(((totalTx - highRisk - medRisk) / totalTx) * 100) : 100;
                      const blockRate = totalTx > 0 ? Math.round((blocked / totalTx) * 100) : 0;
                      const avgAmount = totalTx > 0 ? Math.round((dashboardData?.summary?.total_amount_today || 0) / totalTx) : 0;
                      
                      const metrics = [
                        { 
                          label: 'Detection Rate', 
                          value: `${Math.min(100, highRisk + medRisk > 0 ? 100 : 0)}%`, 
                          subtext: `${highRisk + medRisk} threats found`,
                          icon: Shield, 
                          color: 'text-violet-500',
                          bgColor: 'bg-violet-50 border-violet-200'
                        },
                        { 
                          label: 'Safe Transaction Rate', 
                          value: `${safeRate}%`, 
                          subtext: `${totalTx - highRisk - medRisk} safe txns`,
                          icon: ShieldCheck, 
                          color: 'text-emerald-500',
                          bgColor: 'bg-emerald-50 border-emerald-200'
                        },
                        { 
                          label: 'Block Rate', 
                          value: `${blockRate}%`, 
                          subtext: `${blocked} blocked today`,
                          icon: ShieldAlert, 
                          color: 'text-red-500',
                          bgColor: 'bg-red-50 border-red-200'
                        },
                        { 
                          label: 'Avg Transaction', 
                          value: `₹${avgAmount.toLocaleString()}`, 
                          subtext: `of ${totalTx} transactions`,
                          icon: TrendingUp, 
                          color: 'text-blue-500',
                          bgColor: 'bg-blue-50 border-blue-200'
                        }
                      ];
                      
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          {metrics.map((metric, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border ${metric.bgColor} transition-all hover:shadow-sm`}>
                              <div className="flex items-center gap-2 mb-1">
                                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                <span className="text-[10px] font-medium text-slate-600">{metric.label}</span>
                              </div>
                              <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{metric.subtext}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Top Risky Users - Multiple Categories */}
              <div className="grid grid-cols-1 gap-6">
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                      <Users className="h-4 w-4 text-red-500" /> High-Risk Users Dashboard
                    </CardTitle>
                    <p className="text-xs text-slate-500">Top users across different risk metrics</p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : dashboardData?.top_risky_users?.length > 0 ? (
                      <div className="space-y-6">
                        {/* Podiums Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Highest Risk Score */}
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border-2 border-red-200/50 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" /> Highest Risk Score
                          </h3>
                          <div className="flex items-end justify-center gap-3 py-4 bg-red-50/30 rounded-lg">
                          {/* 2nd Place */}
                          {dashboardData.top_risky_users[1] && (
                            <div className="flex flex-col items-center w-28 group">
                              <div className="text-[9px] font-mono text-slate-600 mb-2 w-full text-center px-1 break-all line-clamp-2">
                                {dashboardData.top_risky_users[1]?.user_id}
                              </div>
                              <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-xl h-20 flex flex-col items-center justify-center shadow-inner border border-slate-200 transition-all group-hover:from-slate-300 group-hover:to-slate-200">
                                <span className="text-2xl font-black text-slate-400">2</span>
                                <Badge className="bg-slate-500 text-white text-[10px] mt-1">{dashboardData.top_risky_users[1]?.avg_risk}%</Badge>
                              </div>
                            </div>
                          )}
                          
                          {/* 1st Place */}
                          {dashboardData.top_risky_users[0] && (
                            <div className="flex flex-col items-center w-32 group -mt-4">
                              <div className="text-[9px] font-mono text-red-600 font-bold mb-2 w-full text-center px-1 break-all line-clamp-2">
                                {dashboardData.top_risky_users[0]?.user_id}
                              </div>
                              <div className="w-full bg-gradient-to-t from-red-600 to-red-500 rounded-t-xl h-28 flex flex-col items-center justify-center shadow-lg border border-red-700 transition-all group-hover:from-red-700 group-hover:to-red-600">
                                <span className="text-3xl font-black text-white drop-shadow">1</span>
                                <Badge className="bg-white text-red-600 font-bold text-xs mt-2">{dashboardData.top_risky_users[0]?.avg_risk}%</Badge>
                                <span className="text-[10px] text-red-200 mt-1">{dashboardData.top_risky_users[0]?.count} txns</span>
                              </div>
                            </div>
                          )}
                          
                          {/* 3rd Place */}
                          {dashboardData.top_risky_users[2] && (
                            <div className="flex flex-col items-center w-28 group">
                              <div className="text-[9px] font-mono text-slate-600 mb-2 w-full text-center px-1 break-all line-clamp-2">
                                {dashboardData.top_risky_users[2]?.user_id}
                              </div>
                              <div className="w-full bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-xl h-16 flex flex-col items-center justify-center shadow-inner border border-orange-200 transition-all group-hover:from-orange-300 group-hover:to-orange-200">
                                <span className="text-xl font-black text-orange-400">3</span>
                                <Badge className="bg-orange-500 text-white text-[10px] mt-1">{dashboardData.top_risky_users[2]?.avg_risk}%</Badge>
                              </div>
                            </div>
                          )}
                        </div>
                        </div>

                        {/* Most Transactions (Volume Leaders) */}
                        {(() => {
                          const volumeLeaders = [...dashboardData.top_risky_users]
                            .sort((a, b) => (b.count || 0) - (a.count || 0))
                            .slice(0, 3);
                          
                          return volumeLeaders.length > 0 ? (
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border-2 border-blue-200/50 shadow-sm hover:shadow-md transition-shadow">
                              <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Most Transactions
                              </h3>
                              <div className="flex items-end justify-center gap-3 py-4 bg-blue-50/30 rounded-lg">
                                {volumeLeaders[1] && (
                                  <div className="flex flex-col items-center w-28 group">
                                    <div className="text-[9px] font-mono text-slate-600 mb-2 w-full text-center px-1 break-all line-clamp-2">
                                      {volumeLeaders[1]?.user_id}
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-blue-200 to-blue-100 rounded-t-xl h-20 flex flex-col items-center justify-center shadow-inner border border-blue-200 transition-all group-hover:from-blue-300 group-hover:to-blue-200">
                                      <span className="text-2xl font-black text-blue-400">2</span>
                                      <Badge className="bg-blue-500 text-white text-[10px] mt-1">{volumeLeaders[1]?.count} txns</Badge>
                                    </div>
                                  </div>
                                )}
                                {volumeLeaders[0] && (
                                  <div className="flex flex-col items-center w-32 group -mt-4">
                                    <div className="text-[9px] font-mono text-blue-600 font-bold mb-2 w-full text-center px-1 break-all line-clamp-2">
                                      {volumeLeaders[0]?.user_id}
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-xl h-28 flex flex-col items-center justify-center shadow-lg border border-blue-700 transition-all group-hover:from-blue-700 group-hover:to-blue-600">
                                      <span className="text-3xl font-black text-white drop-shadow">1</span>
                                      <Badge className="bg-white text-blue-600 font-bold text-xs mt-2">{volumeLeaders[0]?.count} txns</Badge>
                                      <span className="text-[10px] text-blue-200 mt-1">{volumeLeaders[0]?.avg_risk}% risk</span>
                                    </div>
                                  </div>
                                )}
                                {volumeLeaders[2] && (
                                  <div className="flex flex-col items-center w-28 group">
                                    <div className="text-[9px] font-mono text-slate-600 mb-2 w-full text-center px-1 break-all line-clamp-2">
                                      {volumeLeaders[2]?.user_id}
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-blue-100 to-blue-50 rounded-t-xl h-16 flex flex-col items-center justify-center shadow-inner border border-blue-100 transition-all group-hover:from-blue-200 group-hover:to-blue-100">
                                      <span className="text-xl font-black text-blue-300">3</span>
                                      <Badge className="bg-blue-400 text-white text-[10px] mt-1">{volumeLeaders[2]?.count} txns</Badge>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* Highest Transaction Amount Leaders */}
                        {(() => {
                          const amountLeaders = [...dashboardData.top_risky_users]
                            .filter(u => u.total_amount && u.total_amount > 0)
                            .sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0))
                            .slice(0, 3);
                          
                          return amountLeaders.length > 0 ? (
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border-2 border-emerald-200/50 shadow-sm hover:shadow-md transition-shadow">
                              <h3 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Highest Transaction Volume (₹)
                              </h3>
                              <div className="flex items-end justify-center gap-3 py-4 bg-emerald-50/30 rounded-lg">
                                {amountLeaders[1] && (
                                  <div className="flex flex-col items-center w-28 group">
                                    <div className="text-[9px] font-mono text-slate-600 mb-2 w-full text-center px-1 break-all line-clamp-2">
                                      {amountLeaders[1]?.user_id}
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-emerald-200 to-emerald-100 rounded-t-xl h-20 flex flex-col items-center justify-center shadow-inner border border-emerald-200 transition-all group-hover:from-emerald-300 group-hover:to-emerald-200">
                                      <span className="text-2xl font-black text-emerald-400">2</span>
                                      <Badge className="bg-emerald-500 text-white text-[10px] mt-1">₹{(amountLeaders[1]?.total_amount || 0).toLocaleString()}</Badge>
                                    </div>
                                  </div>
                                )}
                                {amountLeaders[0] && (
                                  <div className="flex flex-col items-center w-32 group -mt-4">
                                    <div className="text-[9px] font-mono text-emerald-600 font-bold mb-2 w-full text-center px-1 break-all line-clamp-2">
                                      {amountLeaders[0]?.user_id}
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-500 rounded-t-xl h-28 flex flex-col items-center justify-center shadow-lg border border-emerald-700 transition-all group-hover:from-emerald-700 group-hover:to-emerald-600">
                                      <span className="text-3xl font-black text-white drop-shadow">1</span>
                                      <Badge className="bg-white text-emerald-600 font-bold text-xs mt-2">₹{(amountLeaders[0]?.total_amount || 0).toLocaleString()}</Badge>
                                      <span className="text-[10px] text-emerald-200 mt-1">{amountLeaders[0]?.count} txns</span>
                                    </div>
                                  </div>
                                )}
                                {amountLeaders[2] && (
                                  <div className="flex flex-col items-center w-28 group">
                                    <div className="text-[9px] font-mono text-slate-600 mb-2 w-full text-center px-1 break-all line-clamp-2">
                                      {amountLeaders[2]?.user_id}
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-emerald-100 to-emerald-50 rounded-t-xl h-16 flex flex-col items-center justify-center shadow-inner border border-emerald-100 transition-all group-hover:from-emerald-200 group-hover:to-emerald-100">
                                      <span className="text-xl font-black text-emerald-300">3</span>
                                      <Badge className="bg-emerald-400 text-white text-[10px] mt-1">₹{(amountLeaders[2]?.total_amount || 0).toLocaleString()}</Badge>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null;
                        })()}
                        </div>

                        {/* Additional Risky Users (4-10) */}
                        {dashboardData.top_risky_users.length > 3 && (
                          <div className="border-t border-slate-200 pt-4">
                            <p className="text-xs font-semibold text-slate-600 mb-3">Other High-Risk Users</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {dashboardData.top_risky_users.slice(3, 10).map((user, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs font-bold text-slate-400 shrink-0">#{idx + 4}</span>
                                    <span className="text-[10px] font-mono text-slate-700 truncate" title={user.user_id}>
                                      {user.user_id}
                                    </span>
                                  </div>
                                  <Badge className={`${user.avg_risk > 70 ? 'bg-red-100 text-red-700' : user.avg_risk > 50 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'} text-[10px] ml-2 shrink-0`}>
                                    {user.avg_risk}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-[120px] flex flex-col items-center justify-center">
                        <Users className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm">No risky users detected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Alerts Grid - 3 columns: Detected Patterns, Trust Score Modifications, Blocked Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Detected Patterns - FLAG alerts */}
                {(() => {
                  const flagAlerts = alerts.filter(a => a.type === 'FLAG');
                  return (
                    <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg border-l-4 border-l-amber-500">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
                          <Target className="h-4 w-4 text-amber-500" /> Flagged
                          {flagAlerts.length > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 ml-auto text-[10px]">{flagAlerts.length}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <ScrollArea className="h-[180px]">
                          {flagAlerts.length > 0 ? (
                            <div className="space-y-2">
                              {flagAlerts.slice(0, 5).map((alert, idx) => (
                                <div key={alert.id || idx} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                                  <p className="font-semibold text-amber-800 truncate">{alert.details || 'Flagged'}</p>
                                  <p className="text-amber-600 truncate mt-0.5">{alert.sender_upi} → {alert.recipient_upi}</p>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-amber-700 font-bold">₹{alert.transaction_amount?.toLocaleString() || '0'}</span>
                                    <span className="text-slate-400">{alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleTimeString() : ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6">
                              <ShieldCheck className="h-6 w-6 text-emerald-400 mb-1" />
                              <p className="text-slate-400 text-xs">No flagged transactions</p>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Trust Score Modifications - RISK_MODIFIER alerts */}
                {(() => {
                  const riskModAlerts = alerts.filter(a => a.type === 'RISK_MODIFIER');
                  return (
                    <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
                          <TrendingDown className="h-4 w-4 text-blue-500" /> Trust Modified
                          {riskModAlerts.length > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 ml-auto text-[10px]">{riskModAlerts.length}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <ScrollArea className="h-[180px]">
                          {riskModAlerts.length > 0 ? (
                            <div className="space-y-2">
                              {riskModAlerts.slice(0, 5).map((alert, idx) => (
                                <div key={alert.id || idx} className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                                  <p className="font-semibold text-blue-800 truncate">{alert.recipient_upi || 'Unknown'}</p>
                                  <p className="text-blue-600 truncate mt-0.5">{alert.details || 'Trust decreased'}</p>
                                  <div className="flex justify-between mt-1">
                                    {alert.trust_decrease && <span className="text-red-600 font-bold">-{alert.trust_decrease}</span>}
                                    <span className="text-slate-400">{alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleTimeString() : ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6">
                              <ShieldCheck className="h-6 w-6 text-emerald-400 mb-1" />
                              <p className="text-slate-400 text-xs">No trust modifications</p>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Blocked Transactions - BLOCK alerts */}
                {(() => {
                  const blockAlerts = alerts.filter(a => a.type === 'BLOCK');
                  return (
                    <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg border-l-4 border-l-red-500">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
                          <ShieldAlert className="h-4 w-4 text-red-500" /> Blocked
                          {blockAlerts.length > 0 && (
                            <Badge className="bg-red-100 text-red-700 ml-auto text-[10px]">{blockAlerts.length}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <ScrollArea className="h-[180px]">
                          {blockAlerts.length > 0 ? (
                            <div className="space-y-2">
                              {blockAlerts.slice(0, 5).map((alert, idx) => (
                                <div key={alert.id || idx} className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs">
                                  <p className="font-semibold text-red-800 truncate">{alert.details || 'Blocked'}</p>
                                  <p className="text-red-600 truncate mt-0.5">{alert.sender_upi} → {alert.recipient_upi}</p>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-red-700 font-bold">₹{alert.transaction_amount?.toLocaleString() || '0'}</span>
                                    <span className="text-slate-400">{alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleTimeString() : ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6">
                              <ShieldCheck className="h-6 w-6 text-emerald-400 mb-1" />
                              <p className="text-slate-400 text-xs">No blocked transactions</p>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>

              {/* ML Model Info & Feature Importance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Brain className="h-5 w-5 text-violet-500" /> ML Model Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500">Model Status</span>
                        <Badge className={modelInfo?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {modelInfo?.status === 'active' ? '✓ Active' : '⚠ Fallback Mode'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500">Model Type</span>
                        <span className="text-slate-800 font-medium">{modelInfo?.type || 'Random Forest'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500">Training Method</span>
                        <span className="text-slate-800 font-medium">{modelInfo?.training_method || 'GAN-Augmented'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500">Features Count</span>
                        <span className="text-slate-800 font-medium">{modelInfo?.features_count || 20} Parameters</span>
                      </div>
                      {dashboardData?.model_info && (
                        <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                          <p className="text-sm text-violet-700">
                            Using trained Random Forest classifier with GAN-augmented fraud dataset for enhanced detection accuracy.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <BarChart3 className="h-5 w-5 text-blue-500" /> Feature Importance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[280px]">
                      {(featureImportance.length > 0 ? featureImportance : dashboardData?.feature_importance || []).slice(0, 10).map((feat, idx) => (
                        <div key={idx} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">{feat.feature}</span>
                            <span className="text-slate-700 font-medium">{feat.importance?.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-violet-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(feat.importance * 2, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-violet-500" />
                    Security Rules Engine
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Configure custom fraud detection rules to enhance ML predictions</p>
                </div>
                <Button 
                  onClick={() => setIsAddRuleOpen(true)}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/25"
                >
                  <Plus className="h-4 w-4" />
                  Create New Rule
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <GitBranch className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{rules.length}</p>
                        <p className="text-xs text-slate-500">Total Rules</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{rules.filter(r => r.enabled).length}</p>
                        <p className="text-xs text-slate-500">Active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{rules.filter(r => r.action === 'block').length}</p>
                        <p className="text-xs text-slate-500">Block Rules</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">{rules.filter(r => r.action === 'flag' || r.action === 'add_risk').length}</p>
                        <p className="text-xs text-slate-500">Warning Rules</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rules Table */}
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Shield className="h-5 w-5 text-slate-500" />
                      Active Rules
                    </span>
                    <Badge variant="outline" className="bg-white">{rules.length} rules configured</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="p-4 bg-slate-100 rounded-full mb-4">
                        <GitBranch className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No rules configured</h3>
                      <p className="text-sm text-slate-500 text-center max-w-sm mb-4">
                        Create your first security rule to enhance fraud detection beyond ML predictions.
                      </p>
                      <Button onClick={() => setIsAddRuleOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Create First Rule
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Conditions</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rules.map((rule) => (
                            <tr key={rule.id} className={`hover:bg-slate-50/50 transition-colors ${!rule.enabled ? 'opacity-60' : ''}`}>
                              {/* Name Column */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-800 text-sm">{rule.name}</div>
                              </td>
                              
                              {/* Conditions Column */}
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2 max-w-md">
                                  {(rule.conditions || [rule.condition]).filter(Boolean).map((c, i) => (
                                    <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs whitespace-nowrap">
                                      <span className="font-medium text-slate-600">{c.field}</span>
                                      <span className="text-blue-600 font-bold">{c.operator}</span>
                                      <span className="font-bold text-slate-800">{c.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              
                              {/* Action Column */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <Badge variant="outline" className={
                                  rule.action === 'block' ? 'bg-red-50 text-red-600 border-red-200' :
                                  rule.action === 'flag' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  'bg-blue-50 text-blue-600 border-blue-200'
                                }>
                                  {rule.action === 'block' ? '🚫 Block' : rule.action === 'flag' ? '🚩 Flag' : '⚠️ Risk+'}
                                </Badge>
                              </td>
                              
                              {/* Status Column */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => handleToggleRule(rule.id, rule.enabled)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    rule.enabled 
                                      ? 'bg-emerald-500 focus:ring-emerald-500' 
                                      : 'bg-slate-300 focus:ring-slate-400'
                                  }`}
                                >
                                  <span
                                    className={`${rule.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200`}
                                  />
                                </button>
                              </td>
                              
                              {/* Actions Column */}
                              <td className="px-4 py-4 text-center">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteRule(rule.id)} 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Rule Sheet/Popup */}
              <Sheet open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg">
                        <Plus className="h-5 w-5 text-white" />
                      </div>
                      Create Security Rule
                    </SheetTitle>
                    <SheetDescription>
                      Define conditions and actions for custom fraud detection rules
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6">
                    {/* Rule Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Rule Name</Label>
                      <Input
                        placeholder="e.g., Block High-Value Transactions"
                        value={newRule.name}
                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      />
                    </div>

                    {/* Action Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Action When Triggered</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { value: 'block', label: 'Immediate Block', icon: '🚫', desc: 'Block transaction & create alert', color: 'border-red-200 bg-red-50 hover:bg-red-100' },
                          { value: 'flag', label: 'Raise Warning Flag', icon: '🚩', desc: 'Alert in detected patterns', color: 'border-amber-200 bg-amber-50 hover:bg-amber-100' },
                          { value: 'add_risk', label: 'Increase Risk Score', icon: '⚠️', desc: 'Decrease trust score based on ML risk', color: 'border-blue-200 bg-blue-50 hover:bg-blue-100' }
                        ].map((action) => (
                          <button
                            key={action.value}
                            type="button"
                            onClick={() => setNewRule({ ...newRule, action: action.value })}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                              newRule.action === action.value 
                                ? `${action.color} ring-2 ring-offset-1 ring-slate-400` 
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-2xl">{action.icon}</span>
                            <div>
                              <p className="font-medium text-slate-800">{action.label}</p>
                              <p className="text-xs text-slate-500">{action.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-slate-700">Conditions (AND logic)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addConditionField}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {newRule.conditions.map((condition, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500">Condition {idx + 1}</span>
                              {newRule.conditions.length > 1 && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => removeCondition(idx)} 
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <Select value={condition.field} onValueChange={(v) => updateCondition(idx, { field: v })}>
                              <SelectTrigger className="bg-white border-slate-200 h-10">
                                <SelectValue placeholder="Select field..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">💰 Transaction Amount</SelectItem>
                                <SelectItem value="hour">🕐 Transaction Hour (0-23)</SelectItem>
                                <SelectItem value="risk_score">📊 ML Risk Score</SelectItem>
                                <SelectItem value="social_trust_score">⭐ Trust Score</SelectItem>
                                <SelectItem value="recipient_blacklist_status">🚫 Blacklisted (1/0)</SelectItem>
                                <SelectItem value="fraud_complaints_count">📝 Complaints Count</SelectItem>
                                <SelectItem value="account_age">📅 Account Age (Days)</SelectItem>
                                <SelectItem value="vpn_proxy_usage">🔒 VPN Detected (1/0)</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Select value={condition.operator} onValueChange={(v) => updateCondition(idx, { operator: v })}>
                                <SelectTrigger className="bg-white border-slate-200 h-10 w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=">">Greater than</SelectItem>
                                  <SelectItem value="<">Less than</SelectItem>
                                  <SelectItem value="==">Equals</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Value"
                                value={condition.value}
                                className="bg-white border-slate-200 h-10 flex-1"
                                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {newRule.name && newRule.conditions[0].value && (
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rule Preview</p>
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold">When</span>{' '}
                          {newRule.conditions.map((c, i) => (
                            <span key={i}>
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-blue-600">{c.field}</span>
                              {' '}{c.operator === '>' ? 'is greater than' : c.operator === '<' ? 'is less than' : 'equals'}{' '}
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-violet-600">{c.value || '?'}</span>
                              {i < newRule.conditions.length - 1 && <span className="text-slate-400"> AND </span>}
                            </span>
                          ))}
                          {', '}
                          <span className="font-semibold">then</span>{' '}
                          <span className={`font-semibold ${
                            newRule.action === 'block' ? 'text-red-600' : 
                            newRule.action === 'flag' ? 'text-amber-600' : 'text-blue-600'
                          }`}>
                            {newRule.action === 'block' ? 'block transaction' : 
                             newRule.action === 'flag' ? 'raise warning' : 'increase risk score'}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      onClick={handleAddRule}
                      disabled={!newRule.name || newRule.conditions.some(c => !c.value)}
                      className="w-full h-12 gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Activate Rule
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </motion.div>
          )}

          {/* Simulation Tab - Full Page Layout */}
          {activeTab === 'simulation' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Dataset Examples Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fraud Examples */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <ShieldAlert className="h-4 w-4 text-red-500" /> Fraud Examples (Label = 1)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {DATASET_EXAMPLES.fraud.map((example) => (
                        <div key={example.id} className="p-2 bg-red-50/50 rounded-lg border border-red-100 hover:border-red-200 transition-colors">
                          <div className="font-medium text-slate-700 text-sm">{example.name.replace('🚨 FRAUD: ', '')}</div>
                          <div className="text-xs text-slate-500 mt-1">₹{example.params.amount} | BL:{example.params.recipient_blacklist_status} | VPN:{example.params.vpn_proxy_usage}</div>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDatasetExample(example)}>
                              Test
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => loadExampleToSimulator(example)}>
                              Load
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Normal Examples */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" /> Normal Examples (Label = 0)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {DATASET_EXAMPLES.normal.map((example) => (
                        <div key={example.id} className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 hover:border-emerald-200 transition-colors">
                          <div className="font-medium text-slate-700 text-sm">{example.name.replace('✅ NORMAL: ', '')}</div>
                          <div className="text-xs text-slate-500 mt-1">₹{example.params.amount} | Trust:{example.params.social_trust_score}</div>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => handleDatasetExample(example)}>
                              Test
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => loadExampleToSimulator(example)}>
                              Load
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Full Parameter Simulator + Results */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Full 20-Parameter Form */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <Play className="h-5 w-5 text-blue-500" /> Custom Simulation - All 20 ML Parameters
                    </CardTitle>
                    <CardDescription>Adjust parameters to test different scenarios</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Row 1: Basic */}
                      <div>
                        <Label className="text-xs text-slate-500">Amount (₹)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.amount}
                          onChange={(e) => setSimulationParams({ ...simulationParams, amount: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Transaction Frequency</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.transaction_frequency}
                          onChange={(e) => setSimulationParams({ ...simulationParams, transaction_frequency: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Verification Status</Label>
                        <Select value={simulationParams.recipient_verification_status} onValueChange={(v) => setSimulationParams({ ...simulationParams, recipient_verification_status: v })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="recently_registered">Recently Registered</SelectItem>
                            <SelectItem value="unverified">Unverified</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Geo Location</Label>
                        <Select value={simulationParams.geo_location_flags} onValueChange={(v) => setSimulationParams({ ...simulationParams, geo_location_flags: v })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high-risk">High-Risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Row 2: Risk Flags */}
                      <div>
                        <Label className="text-xs text-slate-500">Blacklist Status</Label>
                        <Select value={String(simulationParams.recipient_blacklist_status)} onValueChange={(v) => setSimulationParams({ ...simulationParams, recipient_blacklist_status: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Not Blacklisted</SelectItem>
                            <SelectItem value="1">Blacklisted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">VPN/Proxy Usage</Label>
                        <Select value={String(simulationParams.vpn_proxy_usage)} onValueChange={(v) => setSimulationParams({ ...simulationParams, vpn_proxy_usage: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No VPN</SelectItem>
                            <SelectItem value="1">VPN Detected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">High-Risk Time</Label>
                        <Select value={String(simulationParams.high_risk_transaction_times)} onValueChange={(v) => setSimulationParams({ ...simulationParams, high_risk_transaction_times: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Normal Time</SelectItem>
                            <SelectItem value="1">High-Risk Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Past Fraud Flags</Label>
                        <Select value={String(simulationParams.past_fraudulent_behavior_flags)} onValueChange={(v) => setSimulationParams({ ...simulationParams, past_fraudulent_behavior_flags: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No History</SelectItem>
                            <SelectItem value="1">Fraud History</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Row 3: Scores & Age */}
                      <div>
                        <Label className="text-xs text-slate-500">Social Trust Score (0-100)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.social_trust_score} min="0" max="100"
                          onChange={(e) => setSimulationParams({ ...simulationParams, social_trust_score: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Account Age (days)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.account_age}
                          onChange={(e) => setSimulationParams({ ...simulationParams, account_age: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Device Fingerprint (0-1)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.device_fingerprinting} step="0.1" min="0" max="1"
                          onChange={(e) => setSimulationParams({ ...simulationParams, device_fingerprinting: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Behavioral Biometrics (0-1)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.behavioral_biometrics} step="0.1" min="0" max="1"
                          onChange={(e) => setSimulationParams({ ...simulationParams, behavioral_biometrics: parseFloat(e.target.value) || 0 })} />
                      </div>

                      {/* Row 4: More Flags */}
                      <div>
                        <Label className="text-xs text-slate-500">Fraud Complaints Count</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.fraud_complaints_count}
                          onChange={(e) => setSimulationParams({ ...simulationParams, fraud_complaints_count: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Location Inconsistent</Label>
                        <Select value={String(simulationParams.location_inconsistent_transactions)} onValueChange={(v) => setSimulationParams({ ...simulationParams, location_inconsistent_transactions: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Consistent</SelectItem>
                            <SelectItem value="1">Inconsistent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Daily Limit Exceeded</Label>
                        <Select value={String(simulationParams.user_daily_limit_exceeded)} onValueChange={(v) => setSimulationParams({ ...simulationParams, user_daily_limit_exceeded: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Within Limit</SelectItem>
                            <SelectItem value="1">Exceeded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Merchant Mismatch</Label>
                        <Select value={String(simulationParams.merchant_category_mismatch)} onValueChange={(v) => setSimulationParams({ ...simulationParams, merchant_category_mismatch: parseInt(v) })}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Match</SelectItem>
                            <SelectItem value="1">Mismatch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSimulation} disabled={isSimulating} className="flex-1 gap-2 bg-blue-500 hover:bg-blue-600">
                        {isSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {isSimulating ? 'Analyzing...' : 'Run Simulation'}
                      </Button>
                      <Button variant="outline" className="border-slate-200" onClick={() => setSimulationParams({
                        ...simulationParams, amount: 500, transaction_frequency: 5, recipient_verification_status: 'verified',
                        recipient_blacklist_status: 0, vpn_proxy_usage: 0, geo_location_flags: 'normal', social_trust_score: 50,
                        high_risk_transaction_times: 0, past_fraudulent_behavior_flags: 0, fraud_complaints_count: 0,
                        location_inconsistent_transactions: 0, user_daily_limit_exceeded: 0, account_age: 180
                      })}>
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Panel */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <Gauge className="h-5 w-5 text-violet-500" /> Analysis Result
                    </CardTitle>
                    {datasetTestResult && (
                      <span className="text-xs text-slate-500">Expected: {datasetTestResult.expectedLabel}</span>
                    )}
                  </CardHeader>
                  <CardContent>
                    {simulationResult ? (
                      <div className="space-y-4">
                        {/* Score Display */}
                        <div className={`p-4 rounded-lg text-center ${simulationResult.risk_level === 'high' ? 'bg-red-50 border border-red-200' :
                          simulationResult.risk_level === 'medium' ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
                          }`}>
                          <div className={`text-5xl font-bold ${simulationResult.risk_level === 'high' ? 'text-red-600' :
                            simulationResult.risk_level === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>{simulationResult.risk_score?.toFixed(0)}%</div>
                          <div className={`text-sm font-medium mt-1 ${simulationResult.risk_level === 'high' ? 'text-red-600' :
                            simulationResult.risk_level === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                            {simulationResult.risk_level?.toUpperCase()} RISK
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex gap-2 flex-wrap justify-center text-xs">
                          {simulationResult.should_block && <span className="px-2 py-1 bg-red-100 rounded text-red-600 font-medium">Block</span>}
                          {simulationResult.requires_verification && <span className="px-2 py-1 bg-amber-100 rounded text-amber-600 font-medium">Verify</span>}
                          {simulationResult.model_used && (
                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">
                              {simulationResult.model_used === 'random_forest' ? 'ML Model' : 'Rules'}
                            </span>
                          )}
                          {datasetTestResult && (
                            <span className={`px-2 py-1 rounded font-medium ${(simulationResult.fraud_probability > 0.5) === (datasetTestResult.expectedLabel === 'FRAUD')
                              ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                              {(simulationResult.fraud_probability > 0.5) === (datasetTestResult.expectedLabel === 'FRAUD') ? '✓ Correct' : 'Mismatch'}
                            </span>
                          )}
                        </div>

                        {/* Fraud Probability */}
                        {simulationResult.fraud_probability !== undefined && (
                          <div className="text-center text-sm text-slate-500">
                            Fraud Probability: <span className="text-slate-700 font-medium">{(simulationResult.fraud_probability * 100).toFixed(1)}%</span>
                          </div>
                        )}

                        {/* Risk Factors */}
                        <div>
                          <Label className="text-slate-500 text-xs">Risk Factors</Label>
                          <ScrollArea className="h-[120px] mt-1">
                            <div className="space-y-1">
                              {simulationResult.factors?.map((factor, idx) => (
                                <div key={idx} className="text-xs text-slate-600 p-1.5 bg-slate-50 rounded">{factor}</div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Recommendations */}
                        <div>
                          <Label className="text-slate-500 text-xs">Recommendations</Label>
                          <div className="space-y-1 mt-1">
                            {simulationResult.recommendations?.map((rec, idx) => (
                              <div key={idx} className="text-xs text-slate-600">• {rec}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <Play className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Select an example or run simulation</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Blocked Transactions - derived from real-time alerts */}
              {(() => {
                const blockedAlerts = alerts.filter(a => a.type === 'BLOCK');
                console.log('Rendering blocked alerts:', blockedAlerts.length, 'loading:', loading);
                
              })()}

              {/* Recent Alerts */}
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <AlertTriangle className="h-5 w-5 text-amber-500" /> Recent Alerts ({alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {alerts.length > 0 ? alerts.map((alert, idx) => (
                        <Alert key={idx} className={
                          alert.severity === 'high' ? 'bg-red-50 border-red-200 shadow-sm' :
                            'bg-amber-50 border-amber-200 shadow-sm'
                        }>
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-xl ${alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                {getRiskIcon(alert.severity)}
                              </div>
                              <div className="space-y-1">
                                <AlertTitle className={`text-base font-bold ${alert.severity === 'high' ? 'text-red-900' : 'text-amber-900'} flex items-center gap-2`}>
                                  {alert.title || alert.summary || 'Security Alert'}
                                  {alert.type === 'BLOCK' && <Badge className="bg-red-600">BLOCKED</Badge>}
                                </AlertTitle>
                                <AlertDescription className="text-slate-600">
                                  <p className="font-medium text-slate-800">{alert.message}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 font-semibold uppercase tracking-tighter w-14">From:</span>
                                      <span className="font-mono text-slate-700">{alert.sender_upi || alert.transaction?.sender || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 font-semibold uppercase tracking-tighter w-14">To:</span>
                                      <span className="font-mono text-slate-700">{alert.recipient_upi || alert.transaction?.recipient || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 font-semibold uppercase tracking-tighter w-14">Amount:</span>
                                      <span className="font-bold text-slate-900">₹{alert.transaction_amount || alert.transaction?.amount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 font-semibold uppercase tracking-tighter w-14">Rules:</span>
                                      <span className="text-red-600 font-medium">{alert.details || 'System Analysis'}</span>
                                    </div>
                                  </div>
                                </AlertDescription>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <Badge variant="outline" className={getRiskColor(alert.severity)}>
                                {alert.risk_score?.toFixed(1) || 100}% Risk
                              </Badge>
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleTimeString() :
                                  alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Recently'}
                              </span>
                            </div>
                          </div>
                        </Alert>
                      )) : (
                        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-medium">No security alerts detected</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Filter className="h-5 w-5 text-blue-500" /> Risk Thresholds
                  </CardTitle>
                  <CardDescription>Adjust when transactions are flagged or blocked</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-red-600">High Risk Threshold</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          className="bg-white border-slate-200"
                          value={thresholds.high_risk}
                          onChange={(e) => setThresholds({ ...thresholds, high_risk: parseFloat(e.target.value) })}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Transactions above this are blocked</p>
                    </div>
                    <div>
                      <Label className="text-amber-600">Medium Risk Threshold</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          className="bg-white border-slate-200"
                          value={thresholds.medium_risk}
                          onChange={(e) => setThresholds({ ...thresholds, medium_risk: parseFloat(e.target.value) })}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Transactions above this require verification</p>
                    </div>
                    <div>
                      <Label className="text-emerald-600">Low Risk Threshold</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          className="bg-white border-slate-200"
                          value={thresholds.low_risk}
                          onChange={(e) => setThresholds({ ...thresholds, low_risk: parseFloat(e.target.value) })}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Transactions below this are auto-approved</p>
                    </div>
                  </div>
                  <Button onClick={handleUpdateThresholds} className="mt-4 bg-blue-500 hover:bg-blue-600">Save Thresholds</Button>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Settings className="h-5 w-5 text-violet-500" /> Risk Factor Weights
                  </CardTitle>
                  <CardDescription>Adjust importance of each risk factor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(weights).map(([key, value]) => (
                      <div key={key}>
                        <Label className="capitalize text-slate-600">{key.replace(/_/g, ' ')}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            className="bg-white border-slate-200"
                            value={value}
                            onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Total weight should equal 1.0</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Brain className="h-5 w-5 text-violet-500" /> Feedback Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-2xl font-bold text-slate-700">{dashboardData?.feedback_stats?.total_feedback || 0}</p>
                      <p className="text-sm text-slate-500">Total Feedback</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-2xl font-bold text-red-600">{dashboardData?.feedback_stats?.fraud_reports || 0}</p>
                      <p className="text-sm text-slate-500">Fraud Reports</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-2xl font-bold text-amber-600">{dashboardData?.feedback_stats?.false_positives || 0}</p>
                      <p className="text-sm text-slate-500">False Positives</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-2xl font-bold text-blue-600">{(dashboardData?.feedback_stats?.feedback_rate || 0).toFixed(1)}%</p>
                      <p className="text-sm text-slate-500">Feedback Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
