import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  FileWarning,
  Gauge,
  QrCode,
  RefreshCw,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  UserX,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import MobileNav from "./MobileNav";
import SidebarContent from "./SidebarContent";
import { db } from "./firebase.js";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    userData,
    balance: contextBalance,
    transactions: contextTransactions,
    totalSpending: contextTotalSpending,
    totalReceived: contextTotalReceived,
    refreshData,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    // Use centralized trust/risk scores
    trustScore: contextTrustScore,
    riskScore: contextRiskScore,
    riskLevel: contextRiskLevel,
    riskBreakdown: contextRiskBreakdown
  } = useAuth();

  const [upiId, setUpiId] = useState("");
  const [balance, setBalance] = useState(contextBalance);
  const [transactions, setTransactions] = useState(contextTransactions);
  const [weeklySpendingData, setWeeklySpendingData] = useState([]);
  const [securityFactors, setSecurityFactors] = useState([]);
  const [topPartners, setTopPartners] = useState([]);
  const [totalSpending, setTotalSpending] = useState(contextTotalSpending);
  const [totalReceived, setTotalReceived] = useState(contextTotalReceived);
  const [accountRiskScore, setAccountRiskScore] = useState(contextRiskScore);
  const [riskLevel, setRiskLevel] = useState(contextRiskLevel);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Update risk score from context
  useEffect(() => {
    setAccountRiskScore(contextRiskScore);
    setRiskLevel(contextRiskLevel);
  }, [contextRiskScore, contextRiskLevel]);

  useEffect(() => {
    setBalance(contextBalance);
    setTransactions(contextTransactions);
    setTotalSpending(contextTotalSpending);
    setTotalReceived(contextTotalReceived);
  }, [contextBalance, contextTransactions, contextTotalSpending, contextTotalReceived]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleUpdateUpiId = async () => {
    if (!newUpiId.trim() || !user?.uid) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { upiId: newUpiId.trim() });
      setUpiId(newUpiId.trim());
      setIsEditingUpi(false);
    } catch (error) {
      console.error("Error updating UPI ID:", error);
    }
  };

  const handleCancelEdit = () => {
    setNewUpiId(upiId);
    setIsEditingUpi(false);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, "transactions", transactionId));
      await refreshData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  useEffect(() => {
    if (userData?.upiId) {
      setUpiId(userData.upiId);


      // Calculate weekly spending data (last 7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const weekData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        const dayName = days[date.getDay()];
        
        const daySpending = contextTransactions
          .filter(tx => {
            if (tx.transactionType !== 'sent') return false;
            const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
            return txDate.toISOString().slice(0, 10) === dateStr;
          })
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        
        weekData.push({ day: dayName, amount: daySpending });
      }
      setWeeklySpendingData(weekData);

      // Calculate security factors breakdown
      const params = userData?.transactionDetails || {};
      const factors = [];
      
      if (params.recipientBlacklistStatus) factors.push({ 
        factor: 'Blacklisted Contact', 
        impact: 30, 
        color: '#ef4444',
        description: 'You\'ve transacted with a flagged or blacklisted UPI ID. Avoid sending money to unverified contacts.',
        severity: 'high'
      });
      if (params.vpnProxyUsage) factors.push({ 
        factor: 'VPN/Proxy Detected', 
        impact: 15, 
        color: '#f59e0b',
        description: 'Your connection is masked. While VPNs are legal, they can indicate suspicious activity to fraud systems.',
        severity: 'medium'
      });
      if (params.geoLocationFlags === 'high-risk') factors.push({ 
        factor: 'High-Risk Location', 
        impact: 20, 
        color: '#ef4444',
        description: 'Transactions from your current location are flagged due to high fraud rates in this region.',
        severity: 'high'
      });
      if (params.highRiskTransactionTimes) factors.push({ 
        factor: 'Unusual Hours', 
        impact: 10, 
        color: '#f59e0b',
        description: 'You\'re transacting during unusual hours (late night/early morning) when fraud attempts are more common.',
        severity: 'medium'
      });
      if (params.fraudComplaintsCount > 0) factors.push({ 
        factor: 'Fraud Reports', 
        impact: params.fraudComplaintsCount * 5, 
        color: '#ef4444',
        description: `${params.fraudComplaintsCount} fraud complaint(s) have been filed against your account. Resolve disputes promptly.`,
        severity: 'high'
      });
      if (params.deviceFingerprinting > 0.5) factors.push({ 
        factor: 'Device Anomaly', 
        impact: 10, 
        color: '#f59e0b',
        description: 'Your device fingerprint has changed or appears suspicious. Using consistent devices builds trust.',
        severity: 'medium'
      });
      if (params.locationInconsistentTransactions) factors.push({ 
        factor: 'Location Mismatch', 
        impact: 15, 
        color: '#ef4444',
        description: 'Your transaction locations are inconsistent with your usual patterns. This triggers fraud alerts.',
        severity: 'high'
      });
      if (params.userDailyLimitExceeded) factors.push({ 
        factor: 'Limit Exceeded', 
        impact: 15, 
        color: '#f59e0b',
        description: 'You\'ve exceeded your daily transaction limit. High volume transactions attract extra scrutiny.',
        severity: 'medium'
      });
      if (params.accountAge && params.accountAge < 30) factors.push({ 
        factor: 'New Account', 
        impact: 10, 
        color: '#3b82f6',
        description: 'Your account is less than 30 days old. Trust score improves as your account ages with good behavior.',
        severity: 'low'
      });
      if (params.socialTrustScore && params.socialTrustScore < 50) factors.push({ 
        factor: 'Low Trust Score', 
        impact: 15, 
        color: '#f59e0b',
        description: 'Your trust score is below average. Build it by transacting with verified users and avoiding flagged contacts.',
        severity: 'medium'
      });
      
      if (factors.length === 0) factors.push({ factor: 'All Clear', impact: 0, color: '#10b981', description: '', severity: 'safe' });
      setSecurityFactors(factors.sort((a, b) => b.impact - a.impact).slice(0, 5));

      // Calculate top transaction partners
      const partnerMap = new Map();
      contextTransactions.forEach(tx => {
        const partner = tx.transactionType === 'sent' ? tx.recipientUPI : tx.senderUPI;
        if (!partner) return;
        if (!partnerMap.has(partner)) {
          partnerMap.set(partner, { upi: partner, sent: 0, received: 0, count: 0 });
        }
        const data = partnerMap.get(partner);
        data.count++;
        if (tx.transactionType === 'sent') data.sent += Number(tx.amount || 0);
        else data.received += Number(tx.amount || 0);
      });
      
      const partners = Array.from(partnerMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopPartners(partners);
    }
  }, [userData?.upiId, contextTransactions]);

  const quickActions = [
    { icon: QrCode, label: "Send Money", color: "from-blue-500 to-blue-600", path: "/send-money" },
    { icon: FileWarning, label: "Report Fraud", color: "from-red-500 to-rose-600", path: "/report-fraud" },
    { icon: Settings, label: "ML Settings", color: "from-violet-500 to-purple-600", path: "/settings" },
    { icon: Shield, label: "View Reports", color: "from-emerald-500 to-green-600", path: "/admin" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navigation */}
        <MobileNav />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Welcome Section with Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Main Balance Card */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border-0 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-4 ring-white/20 shadow-xl">
                      <AvatarImage src={user?.photoURL} />
                      <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                        {user?.displayName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-blue-100 text-sm">Welcome back,</p>
                      <h2 className="text-xl font-bold">{user?.displayName?.split(' ')[0]}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <div ref={notificationRef} className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10 relative"
                        onClick={() => setShowNotifications(!showNotifications)}
                      >
                        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-yellow-200' : ''}`} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-lg">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Button>

                      {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-white/95 border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-slate-800 font-semibold">Notifications</h3>
                            {unreadCount > 0 && (
                              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Mark all read</button>
                            )}
                          </div>
                          <div className="overflow-y-auto max-h-72">
                            {notifications.length > 0 ? (
                              notifications.slice(0, 10).map((notif) => (
                                <div
                                  key={notif.id}
                                  onClick={() => markAsRead(notif.id)}
                                  className={`px-4 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full ${notif.type === 'received' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                      {notif.type === 'received' ? (
                                        <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                                      ) : (
                                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${!notif.read ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>{notif.message}</p>
                                      <p className="text-xs text-slate-400 mt-1 truncate">{notif.type === 'received' ? 'From: ' : 'To: '}{notif.otherPartyUPI}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">{formatTime(notif.createdAt)}</p>
                                    </div>
                                    {!notif.read && (<div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>)}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center text-slate-400">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No notifications yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-blue-100 text-sm mb-1">Total Balance</p>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                      {showBalance ? `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹••••••'}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                {/* UPI ID */}
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 w-fit">
                  <CreditCard className="h-4 w-4 text-blue-200" />
                  {isEditingUpi ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newUpiId}
                        onChange={(e) => setNewUpiId(e.target.value)}
                        className="h-7 w-40 bg-white/20 border-0 text-white placeholder:text-white/50 text-sm"
                        placeholder="Enter UPI ID"
                      />
                      <button onClick={handleUpdateUpiId} className="p-1 hover:bg-white/10 rounded">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={handleCancelEdit} className="p-1 hover:bg-white/10 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-blue-100">{upiId || 'No UPI ID set'}</span>
                      <button onClick={() => { setNewUpiId(upiId); setIsEditingUpi(true); }} className="p-1 hover:bg-white/10 rounded">
                        <Edit2 className="h-3 w-3 text-blue-200" />
                      </button>
                    </>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="h-4 w-4 text-rose-300" />
                      <span className="text-xs text-blue-200">Spent</span>
                    </div>
                    <p className="text-xl font-bold">₹{totalSpending.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownLeft className="h-4 w-4 text-emerald-300" />
                      <span className="text-xs text-blue-200">Received</span>
                    </div>
                    <p className="text-xl font-bold">₹{totalReceived.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security & Risk Cards */}
            <div className="space-y-4">
              <Card className={`border-0 shadow-lg ${riskLevel === 'low' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                  riskLevel === 'medium' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                    'bg-gradient-to-br from-red-500 to-rose-600'
                } text-white`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Gauge className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">Your Risk Score</p>
                        <p className="text-3xl font-bold">{accountRiskScore}</p>
                      </div>
                    </div>
                    <Badge className={`${riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' :
                        riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                      } border-0`}>
                      {riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${accountRiskScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/70">
                    {riskLevel === 'low' ? 'Your profile appears trustworthy' :
                      riskLevel === 'medium' ? 'Some risk factors detected' :
                        'Multiple risk factors - review your settings'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-white hover:bg-white/20 p-0 h-auto"
                    onClick={() => navigate('/settings')}
                  >
                    Configure ML Parameters <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br border-2 border-red-500 text-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                      <UserX className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-slate-800 text-sm font-medium">Report Fraud</p>
                      <p className="text-lg font-bold text-slate-800">File a Complaint</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mb-3">Report suspicious users or fraudulent transactions to help protect the community</p>
                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => navigate('/report-fraud')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Suspicious Activity
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => navigate(action.path)}
                  className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 hover:border-slate-200"
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-3`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{action.label}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Analytics & Transactions Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Transaction Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-violet-500" />
                    Transaction Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Average Transaction */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-500 rounded-lg">
                            <CreditCard className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px] text-blue-600 font-medium">Avg. Amount</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">
                          ₹{Math.round(transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) / transactions.length).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Unique Contacts */}
                      <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-3 border border-violet-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-violet-500 rounded-lg">
                            <Activity className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px] text-violet-600 font-medium">Contacts</span>
                        </div>
                        <p className="text-lg font-bold text-violet-700">
                          {new Set(transactions.map(tx => tx.transactionType === 'sent' ? tx.recipientUPI : tx.senderUPI)).size}
                        </p>
                      </div>

                      {/* Largest Transaction */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-amber-500 rounded-lg">
                            <AlertTriangle className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px] text-amber-600 font-medium">Largest Txn</span>
                        </div>
                        <p className="text-lg font-bold text-amber-700">
                          ₹{Math.max(...transactions.map(tx => Number(tx.amount || 0))).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Received Count */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-emerald-500 rounded-lg">
                            <ArrowDownLeft className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium">Received</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-700">
                          {transactions.filter(tx => tx.transactionType === 'received').length}
                        </p>
                      </div>

                      {/* Sent Count */}
                      <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-3 border border-rose-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-rose-500 rounded-lg">
                            <ArrowUpRight className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px] text-rose-600 font-medium">Sent</span>
                        </div>
                        <p className="text-lg font-bold text-rose-700">
                          {transactions.filter(tx => tx.transactionType === 'sent').length}
                        </p>
                      </div>

                      {/* Most Active Day */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-slate-600 rounded-lg">
                            <Activity className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px] text-slate-600 font-medium">Active Day</span>
                        </div>
                        <p className="text-lg font-bold text-slate-700">
                          {(() => {
                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const dayCounts = transactions.reduce((acc, tx) => {
                              const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
                              const day = date.getDay();
                              acc[day] = (acc[day] || 0) + 1;
                              return acc;
                            }, {});
                            const maxDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
                            return maxDay ? days[maxDay[0]] : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Gauge className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium text-sm">No insights yet</p>
                      <p className="text-slate-400 text-xs mt-1">Make transactions to see your insights</p>
                      <Button size="sm" className="mt-4 bg-blue-500 hover:bg-blue-600 h-8 text-xs" onClick={() => navigate('/send-money')}>
                        <Send className="h-3 w-3 mr-1" /> Make a Payment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Frequent Contacts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Frequent Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topPartners.length > 0 ? (
                    topPartners.map((partner, i) => (
                      <motion.div
                        key={partner.upi}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-bold">
                            {partner.upi.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{partner.upi}</p>
                          <p className="text-xs text-slate-500">{partner.count} transactions</p>
                        </div>
                        <div className="text-right">
                          {partner.sent > 0 && (
                            <p className="text-xs text-rose-600">-₹{partner.sent.toLocaleString('en-IN')}</p>
                          )}
                          {partner.received > 0 && (
                            <p className="text-xs text-emerald-600">+₹{partner.received.toLocaleString('en-IN')}</p>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-500">No contacts yet</p>
                      <p className="text-xs text-slate-400 mt-1">Start transacting to see contacts</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Security Factors & Weekly Spending */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Security Score Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-violet-500" />
                    Security Factors
                  </CardTitle>
                  <p className="text-xs text-slate-500">Factors affecting your risk score</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {securityFactors.length > 0 && securityFactors[0].factor !== 'All Clear' ? (
                      securityFactors.map((item, idx) => (
                        <div key={idx} className={`p-2.5 rounded-lg border transition-all ${
                          item.severity === 'high' ? 'bg-red-50/50 border-red-200' :
                          item.severity === 'medium' ? 'bg-amber-50/50 border-amber-200' :
                          'bg-blue-50/50 border-blue-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <div className={`p-1 rounded flex-shrink-0 ${
                              item.severity === 'high' ? 'bg-red-100' :
                              item.severity === 'medium' ? 'bg-amber-100' :
                              'bg-blue-100'
                            }`}>
                              {item.severity === 'high' ? (
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                              ) : item.severity === 'medium' ? (
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                              ) : (
                                <Shield className="h-3 w-3 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-slate-800">{item.factor}</span>
                                <Badge className={`text-[9px] px-1 py-0 h-4 ${
                                  item.severity === 'high' ? 'bg-red-100 text-red-700' :
                                  item.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  +{item.impact}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{item.description}</p>
                              <div className="mt-1.5 w-full bg-slate-200/50 rounded-full h-0.5">
                                <div
                                  className="h-0.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(item.impact * 3, 100)}%`, backgroundColor: item.color }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-emerald-50/50 rounded-xl border border-emerald-200">
                        <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                        <p className="text-emerald-700 font-semibold text-sm">All Clear!</p>
                        <p className="text-slate-500 text-[10px] mt-1 px-2">No security concerns detected</p>
                      </div>
                    )}
                  </div>
                  {securityFactors.length > 0 && securityFactors[0].factor !== 'All Clear' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 h-8 text-xs"
                      onClick={() => navigate('/settings')}
                    >
                      Improve Security <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Weekly Spending Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      Weekly Spending
                    </CardTitle>
                    <Badge variant="outline" className="text-xs text-slate-500">
                      Last 7 days
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {weeklySpendingData.some(d => d.amount > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={weeklySpendingData}>
                        <defs>
                          <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg">
                                  <p className="text-slate-500 text-xs mb-1 font-medium">{payload[0].payload.day}</p>
                                  <p className="text-blue-600 text-lg font-bold">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="amount" fill="url(#spendingGradient)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center">
                      <CreditCard className="h-12 w-12 text-slate-200 mb-3" />
                      <p className="text-slate-500 font-medium">No spending this week</p>
                      <p className="text-slate-400 text-sm">Your spending will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

