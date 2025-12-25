import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MobileNav from "./MobileNav";
import SidebarContent from "./SidebarContent";

const API_BASE = 'https://rxcq.pythonanywhere.com';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];


const SAMPLE_DASHBOARD_DATA = {
  summary: {
    total_transactions_today: 47,
    total_transactions_week: 312,
    high_risk_today: 3,
    medium_risk_today: 8,
    blocked_today: 2,
    total_amount_today: 125000
  },
  trends: {
    '2025-12-18': { count: 45, amount: 89000, high_risk: 2 },
    '2025-12-19': { count: 52, amount: 112000, high_risk: 4 },
    '2025-12-20': { count: 38, amount: 76000, high_risk: 1 },
    '2025-12-21': { count: 61, amount: 145000, high_risk: 5 },
    '2025-12-22': { count: 44, amount: 95000, high_risk: 3 },
    '2025-12-23': { count: 55, amount: 132000, high_risk: 2 },
    '2025-12-24': { count: 47, amount: 125000, high_risk: 3 }
  },
  top_risky_users: [
    { user_id: 'suspicious@upi', avg_risk: 72.5, count: 8 },
    { user_id: 'user123@oksbi', avg_risk: 58.3, count: 5 },
    { user_id: 'test@paytm', avg_risk: 45.2, count: 12 }
  ],
  new_fraud_patterns: [
    { pattern: 'Late Night High Value', description: 'Increased late-night transactions above ₹10,000', severity: 'medium' },
    { pattern: 'New Device Logins', description: '15% increase in transactions from new devices', severity: 'low' }
  ],
  payee_trust_distribution: { high: 45, medium: 32, low: 18, unknown: 5 },
  hourly_risk_distribution: Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => [
      i.toString(),
      { count: Math.floor(Math.random() * 10) + 1, avg_risk: Math.random() * 40 + 10 }
    ])
  ),
  feedback_stats: { total_feedback: 25, fraud_reports: 8, false_positives: 17, feedback_rate: 5.2 }
};

const SAMPLE_SCENARIOS = [
  { id: 'normal', name: 'Normal Transaction', description: 'Standard transaction with no anomalies' },
  { id: 'burst_attack', name: 'Burst Attack', description: 'Multiple rapid transactions' },
  { id: 'new_device', name: 'New Device', description: 'Transaction from unknown device' },
  { id: 'late_night_high', name: 'Late Night High Value', description: 'Large amount at 2 AM' },
  { id: 'new_payee_high', name: 'New Payee High Value', description: 'First-time payee with high amount' },
  { id: 'location_anomaly', name: 'Location Anomaly', description: 'Transaction from unusual location' },
  { id: 'vpn_detected', name: 'VPN Detected', description: 'Transaction with VPN/proxy detected' },
  { id: 'blacklisted_recipient', name: 'Blacklisted Recipient', description: 'Payment to blacklisted payee' }
];



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
    field: 'amount',
    operator: '>',
    value: '',
    action: 'flag',
    risk_modifier: 20
  });
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
        fetch(`${API_BASE}/api/rules`).catch(() => null),
        fetch(`${API_BASE}/api/alerts`).catch(() => null),
        fetch(`${API_BASE}/api/config/thresholds`).catch(() => null),
        fetch(`${API_BASE}/api/config/weights`).catch(() => null),
        fetch(`${API_BASE}/api/simulate/scenarios`).catch(() => null),
        fetch(`${API_BASE}/api/admin/model-info`).catch(() => null),
        fetch(`${API_BASE}/api/admin/feature-importance`).catch(() => null)
      ];

      const [dashboardRes, rulesRes, alertsRes, thresholdsRes, weightsRes, scenariosRes, modelInfoRes, featureImportanceRes] = await Promise.all(requests);

      
      const anySuccess = dashboardRes?.ok || rulesRes?.ok || alertsRes?.ok || thresholdsRes?.ok || weightsRes?.ok || scenariosRes?.ok;
      setApiError(!anySuccess);

      
      if (dashboardRes?.ok) {
        setDashboardData(await dashboardRes.json());
      } else {
        setDashboardData(SAMPLE_DASHBOARD_DATA);
      }
      
      if (rulesRes?.ok) {
        setRules((await rulesRes.json()).rules || []);
      } else {
        setRules([
          { id: 1, name: 'Block very high value', condition: { field: 'amount', operator: '>', value: 100000 }, action: 'block', enabled: true },
          { id: 2, name: 'Flag late night high value', condition: { field: 'amount', operator: '>', value: 10000 }, action: 'flag', enabled: true }
        ]);
      }
      
      if (alertsRes?.ok) {
        setAlerts((await alertsRes.json()).alerts || []);
      }
      
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
        setScenarios(SAMPLE_SCENARIOS);
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
      
      setDashboardData(SAMPLE_DASHBOARD_DATA);
      setRules([
        { id: 1, name: 'Block very high value', condition: { field: 'amount', operator: '>', value: 100000 }, action: 'block', enabled: true },
        { id: 2, name: 'Flag late night high value', condition: { field: 'amount', operator: '>', value: 10000 }, action: 'flag', enabled: true }
      ]);
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
      setScenarios(SAMPLE_SCENARIOS);
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

  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddRule = async () => {
    if (!newRule.name || !newRule.value) return;

    const ruleData = {
      name: newRule.name,
      condition: {
        field: newRule.field,
        operator: newRule.operator,
        value: parseFloat(newRule.value)
      },
      action: newRule.action,
      risk_modifier: newRule.risk_modifier,
      enabled: true
    };

    try {
      const res = await fetch(`${API_BASE}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });

      if (res.ok) {
        await fetchDashboardData();
      } else {
        
        setRules(prev => [...prev, { ...ruleData, id: Date.now() }]);
      }
    } catch (error) {
      console.error('Error adding rule:', error);
      
      setRules(prev => [...prev, { ...ruleData, id: Date.now() }]);
    }
    setNewRule({ name: '', field: 'amount', operator: '>', value: '', action: 'flag', risk_modifier: 20 });
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await fetch(`${API_BASE}/api/rules/${ruleId}`, { method: 'DELETE' });
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      
      setRules(prev => prev.filter(r => r.id !== ruleId));
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

  
  const trustDistribution = dashboardData?.payee_trust_distribution 
    ? Object.entries(dashboardData.payee_trust_distribution).map(([name, value]) => ({ name, value }))
    : [];

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
            <Button onClick={fetchDashboardData} variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 w-full sm:w-auto">
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
                      <Activity className="h-4 w-4 text-blue-500" /> Transactions Today
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
                        <p className="text-3xl font-bold text-slate-800">{dashboardData?.summary?.total_transactions_today || 0}</p>
                        <p className="text-sm text-slate-400">
                          ₹{((dashboardData?.summary?.total_amount_today || 0) / 1000).toFixed(1)}K total
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" /> High Risk
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
                        <p className="text-3xl font-bold text-red-500">{dashboardData?.summary?.high_risk_today || 0}</p>
                        <p className="text-sm text-slate-400">
                          {dashboardData?.summary?.blocked_today || 0} blocked
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Medium Risk
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
                        <p className="text-3xl font-bold text-amber-500">{dashboardData?.summary?.medium_risk_today || 0}</p>
                        <p className="text-sm text-slate-400">Require review</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Weekly Total
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
                        <p className="text-3xl font-bold text-emerald-500">{dashboardData?.summary?.total_transactions_week || 0}</p>
                        <p className="text-sm text-slate-400">Last 7 days</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Trends */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <TrendingUp className="h-5 w-5 text-blue-500" /> Transaction Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-[250px] flex flex-col justify-end gap-2">
                        <div className="flex items-end gap-2 h-full">
                          {[60, 80, 45, 90, 70, 85, 55].map((h, i) => (
                            <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                        <div className="flex justify-between">
                          {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                            <Skeleton key={i} className="h-3 w-8" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={trendsData}>
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            labelStyle={{ color: '#475569' }}
                          />
                          <Area type="monotone" dataKey="transactions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Transactions" />
                          <Area type="monotone" dataKey="highRisk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="High Risk" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Payee Trust Distribution */}
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Users className="h-5 w-5 text-violet-500" /> Payee Trust Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-[250px] flex items-center justify-center">
                        <Skeleton className="h-40 w-40 rounded-full" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={trustDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {trustDistribution.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                          <Legend formatter={(value) => <span className="text-slate-600">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Hourly Distribution */}
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <Clock className="h-5 w-5 text-amber-500" /> Hourly Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[200px] flex flex-col justify-end gap-2">
                      <div className="flex items-end gap-1 h-full">
                        {Array.from({ length: 24 }, (_, i) => (
                          <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 20}%` }} />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        {[0, 6, 12, 18, 23].map((h) => (
                          <Skeleton key={h} className="h-3 w-6" />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={hourlyData}>
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                        <Bar dataKey="avgRisk" fill="#8b5cf6" name="Avg Risk %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Risky Users & Patterns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Users className="h-5 w-5 text-red-500" /> Top Risky Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {loading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-5 w-12 rounded-full" />
                            </div>
                          ))}
                        </div>
                      ) : dashboardData?.top_risky_users?.length > 0 ? (
                        <div className="space-y-2">
                          {dashboardData.top_risky_users.map((user, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-sm font-mono text-slate-600">{user.user_id?.slice(0, 20)}...</span>
                              <Badge variant="outline" className={getRiskColor(user.avg_risk >= 70 ? 'high' : user.avg_risk >= 40 ? 'medium' : 'low')}>
                                {user.avg_risk?.toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">No risky users detected</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Target className="h-5 w-5 text-amber-500" /> Detected Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {loading ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-3 w-full" />
                            </div>
                          ))}
                        </div>
                      ) : dashboardData?.new_fraud_patterns?.length > 0 ? (
                        <div className="space-y-2">
                          {dashboardData.new_fraud_patterns.map((pattern, idx) => (
                            <Alert key={idx} className="bg-amber-50 border-amber-200">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <AlertTitle className="text-amber-800">{pattern.pattern}</AlertTitle>
                              <AlertDescription className="text-amber-700">{pattern.description}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">No new patterns detected</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
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
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Plus className="h-5 w-5 text-blue-500" /> Add Custom Rule
                  </CardTitle>
                  <CardDescription>Create rules to customize fraud detection on top of ML</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-slate-600">Rule Name</Label>
                      <Input
                        placeholder="e.g., Block high value"
                        value={newRule.name}
                        className="bg-white border-slate-200"
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-600">Field</Label>
                      <Select value={newRule.field} onValueChange={(v) => setNewRule({ ...newRule, field: v })}>
                        <SelectTrigger className="bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="hour">Hour</SelectItem>
                          <SelectItem value="risk_score">Risk Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-600">Operator</Label>
                      <Select value={newRule.operator} onValueChange={(v) => setNewRule({ ...newRule, operator: v })}>
                        <SelectTrigger className="bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">Greater than</SelectItem>
                          <SelectItem value="<">Less than</SelectItem>
                          <SelectItem value="==">Equals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-600">Value</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={newRule.value}
                        className="bg-white border-slate-200"
                        onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-600">Action</Label>
                      <Select value={newRule.action} onValueChange={(v) => setNewRule({ ...newRule, action: v })}>
                        <SelectTrigger className="bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="block">Block</SelectItem>
                          <SelectItem value="flag">Flag for Review</SelectItem>
                          <SelectItem value="add_risk">Add Risk Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAddRule} className="mt-4 gap-2 bg-blue-500 hover:bg-blue-600">
                    <Plus className="h-4 w-4" /> Add Rule
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <GitBranch className="h-5 w-5 text-violet-500" /> Active Rules ({rules.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-500">Name</TableHead>
                        <TableHead className="text-slate-500">Condition</TableHead>
                        <TableHead className="text-slate-500">Action</TableHead>
                        <TableHead className="text-slate-500">Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">{rule.name}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">
                            {rule.condition?.field} {rule.condition?.operator} {rule.condition?.value}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              rule.action === 'block' ? 'bg-red-50 text-red-600 border-red-200' :
                              rule.action === 'flag' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-blue-50 text-blue-600 border-blue-200'
                            }>
                              {rule.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={rule.enabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                              {rule.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)} className="hover:bg-red-50">
                              <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
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
                          onChange={(e) => setSimulationParams({...simulationParams, amount: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Transaction Frequency</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.transaction_frequency}
                          onChange={(e) => setSimulationParams({...simulationParams, transaction_frequency: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Verification Status</Label>
                        <Select value={simulationParams.recipient_verification_status} onValueChange={(v) => setSimulationParams({...simulationParams, recipient_verification_status: v})}>
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
                        <Select value={simulationParams.geo_location_flags} onValueChange={(v) => setSimulationParams({...simulationParams, geo_location_flags: v})}>
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
                        <Select value={String(simulationParams.recipient_blacklist_status)} onValueChange={(v) => setSimulationParams({...simulationParams, recipient_blacklist_status: parseInt(v)})}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Not Blacklisted</SelectItem>
                            <SelectItem value="1">Blacklisted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">VPN/Proxy Usage</Label>
                        <Select value={String(simulationParams.vpn_proxy_usage)} onValueChange={(v) => setSimulationParams({...simulationParams, vpn_proxy_usage: parseInt(v)})}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No VPN</SelectItem>
                            <SelectItem value="1">VPN Detected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">High-Risk Time</Label>
                        <Select value={String(simulationParams.high_risk_transaction_times)} onValueChange={(v) => setSimulationParams({...simulationParams, high_risk_transaction_times: parseInt(v)})}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Normal Time</SelectItem>
                            <SelectItem value="1">High-Risk Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Past Fraud Flags</Label>
                        <Select value={String(simulationParams.past_fraudulent_behavior_flags)} onValueChange={(v) => setSimulationParams({...simulationParams, past_fraudulent_behavior_flags: parseInt(v)})}>
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
                          onChange={(e) => setSimulationParams({...simulationParams, social_trust_score: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Account Age (days)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.account_age}
                          onChange={(e) => setSimulationParams({...simulationParams, account_age: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Device Fingerprint (0-1)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.device_fingerprinting} step="0.1" min="0" max="1"
                          onChange={(e) => setSimulationParams({...simulationParams, device_fingerprinting: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Behavioral Biometrics (0-1)</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.behavioral_biometrics} step="0.1" min="0" max="1"
                          onChange={(e) => setSimulationParams({...simulationParams, behavioral_biometrics: parseFloat(e.target.value) || 0})} />
                      </div>

                      {/* Row 4: More Flags */}
                      <div>
                        <Label className="text-xs text-slate-500">Fraud Complaints Count</Label>
                        <Input type="number" className="h-8 text-sm bg-white border-slate-200" value={simulationParams.fraud_complaints_count}
                          onChange={(e) => setSimulationParams({...simulationParams, fraud_complaints_count: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Location Inconsistent</Label>
                        <Select value={String(simulationParams.location_inconsistent_transactions)} onValueChange={(v) => setSimulationParams({...simulationParams, location_inconsistent_transactions: parseInt(v)})}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Consistent</SelectItem>
                            <SelectItem value="1">Inconsistent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Daily Limit Exceeded</Label>
                        <Select value={String(simulationParams.user_daily_limit_exceeded)} onValueChange={(v) => setSimulationParams({...simulationParams, user_daily_limit_exceeded: parseInt(v)})}>
                          <SelectTrigger className="h-8 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Within Limit</SelectItem>
                            <SelectItem value="1">Exceeded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Merchant Mismatch</Label>
                        <Select value={String(simulationParams.merchant_category_mismatch)} onValueChange={(v) => setSimulationParams({...simulationParams, merchant_category_mismatch: parseInt(v)})}>
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
                        <div className={`p-4 rounded-lg text-center ${
                          simulationResult.risk_level === 'high' ? 'bg-red-50 border border-red-200' :
                          simulationResult.risk_level === 'medium' ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
                        }`}>
                          <div className={`text-5xl font-bold ${
                            simulationResult.risk_level === 'high' ? 'text-red-600' :
                            simulationResult.risk_level === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>{simulationResult.risk_score?.toFixed(0)}%</div>
                          <div className={`text-sm font-medium mt-1 ${
                            simulationResult.risk_level === 'high' ? 'text-red-600' :
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
                            <span className={`px-2 py-1 rounded font-medium ${
                              (simulationResult.fraud_probability > 0.5) === (datasetTestResult.expectedLabel === 'FRAUD')
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                          alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                          'bg-amber-50 border-amber-200'
                        }>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {getRiskIcon(alert.severity)}
                              <div>
                                <AlertTitle className={alert.severity === 'high' ? 'text-red-700' : 'text-amber-700'}>
                                  {alert.summary}
                                </AlertTitle>
                                <AlertDescription className="text-slate-600 mt-1">
                                  <div>From: {alert.transaction?.sender}</div>
                                  <div>To: {alert.transaction?.recipient}</div>
                                  <div>Amount: ₹{alert.transaction?.amount}</div>
                                </AlertDescription>
                              </div>
                            </div>
                            <Badge className={getRiskColor(alert.severity)}>
                              {alert.risk_score?.toFixed(1)}%
                            </Badge>
                          </div>
                        </Alert>
                      )) : (
                        <p className="text-center text-slate-400 py-8">No recent alerts</p>
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
