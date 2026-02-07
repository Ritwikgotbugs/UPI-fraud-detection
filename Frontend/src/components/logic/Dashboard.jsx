import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import MobileNav from "./MobileNav";
import SidebarContent from "./SidebarContent";
import { db } from "./firebase.js";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    markAllAsRead
  } = useAuth();

  const [upiId, setUpiId] = useState("");
  const [balance, setBalance] = useState(contextBalance);
  const [transactions, setTransactions] = useState(contextTransactions);
  const [riskTrendData, setRiskTrendData] = useState([]);
  const [totalSpending, setTotalSpending] = useState(contextTotalSpending);
  const [totalReceived, setTotalReceived] = useState(contextTotalReceived);
  const [accountRiskScore, setAccountRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('low');
  const [riskDistribution, setRiskDistribution] = useState([]);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    setBalance(contextBalance);
    setTransactions(contextTransactions);
    setTotalSpending(contextTotalSpending);
    setTotalReceived(contextTotalReceived);


    if (userData?.transactionDetails) {
      const params = userData.transactionDetails;
      let score = 10;

      if (params.recipientBlacklistStatus) score += 30;
      if (params.vpnProxyUsage) score += 15;
      if (params.geoLocationFlags === 'high-risk') score += 20;
      if (params.geoLocationFlags === 'unusual') score += 10;
      if (params.highRiskTransactionTimes) score += 10;
      if (params.fraudComplaintsCount > 0) score += params.fraudComplaintsCount * 5;
      if (params.pastFraudulentBehavior > 0) score += params.pastFraudulentBehavior * 8;
      if (params.deviceFingerprinting > 0.5) score += 10;
      if (params.behavioralBiometrics > 0.5) score += 10;
      if (params.locationInconsistentTransactions) score += 15;
      if (params.merchantCategoryMismatch) score += 10;
      if (params.userDailyLimitExceeded) score += 15;
      if (params.recipientVerificationStatus === 'unverified') score += 15;
      if (params.accountAge && params.accountAge < 30) score += 10;
      if (params.socialTrustScore && params.socialTrustScore < 50) score += 15;

      const finalScore = Math.min(100, score);
      setAccountRiskScore(finalScore);
      setRiskLevel(finalScore >= 60 ? 'high' : finalScore >= 35 ? 'medium' : 'low');
    }
  }, [contextBalance, contextTransactions, contextTotalSpending, contextTotalReceived, userData?.transactionDetails]);

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


      const lowRisk = contextTransactions.filter(tx => tx.riskLevel === 'low' || !tx.riskLevel).length;
      const mediumRisk = contextTransactions.filter(tx => tx.riskLevel === 'medium').length;
      const highRisk = contextTransactions.filter(tx => tx.riskLevel === 'high').length;

      setRiskDistribution([
        { name: 'Safe', value: lowRisk, color: '#10b981' },
        { name: 'Suspicious', value: mediumRisk, color: '#f59e0b' },
        { name: 'Flagged', value: highRisk, color: '#ef4444' },
      ].filter(item => item.value > 0));


      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyRisk = {};
      months.forEach(m => { monthlyRisk[m] = { safe: 0, suspicious: 0, flagged: 0 }; });

      contextTransactions.forEach(tx => {
        const timestamp = tx.createdAt || tx.timestamp;
        if (timestamp) {
          const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          const monthName = months[date.getMonth()];
          if (tx.riskLevel === 'high') {
            monthlyRisk[monthName].flagged += 1;
          } else if (tx.riskLevel === 'medium') {
            monthlyRisk[monthName].suspicious += 1;
          } else {
            monthlyRisk[monthName].safe += 1;
          }
        }
      });

      const currentMonth = new Date().getMonth();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const monthIdx = (currentMonth - i + 12) % 12;
        last6Months.push({
          name: months[monthIdx],
          safe: monthlyRisk[months[monthIdx]].safe,
          suspicious: monthlyRisk[months[monthIdx]].suspicious,
          flagged: monthlyRisk[months[monthIdx]].flagged
        });
      }
      setRiskTrendData(last6Months);
    }
  }, [userData?.upiId, contextTransactions]);

  const quickActions = [
    { icon: QrCode, label: "Send Money", color: "from-blue-500 to-blue-600", path: "/send-money" },
    { icon: FileWarning, label: "Report Fraud", color: "from-red-500 to-rose-600", path: "/report-fraud" },
    { icon: Settings, label: "ML Settings", color: "from-violet-500 to-purple-600", path: "/settings" },
    { icon: Shield, label: "View Reports", color: "from-emerald-500 to-green-600", path: "/admin" },
  ];


  const highRiskCount = contextTransactions.filter(tx => tx.riskLevel === 'high').length;
  const mediumRiskCount = contextTransactions.filter(tx => tx.riskLevel === 'medium').length;

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
            {/* Risk Detection Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      Fraud Detection Trend
                    </CardTitle>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Safe</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Suspicious</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Flagged</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={riskTrendData.length > 0 ? riskTrendData : [{ name: 'No Data', safe: 0, suspicious: 0, flagged: 0 }]}>
                      <defs>
                        <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg">
                                <p className="text-slate-500 text-xs mb-2 font-medium">{payload[0].payload.name}</p>
                                <div className="space-y-1">
                                  <p className="text-emerald-600 text-sm">Safe: {payload[0].payload.safe}</p>
                                  <p className="text-amber-600 text-sm">Suspicious: {payload[0].payload.suspicious}</p>
                                  <p className="text-red-600 text-sm">Flagged: {payload[0].payload.flagged}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="safe" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSafe)" stackId="1" />
                      <Area type="monotone" dataKey="suspicious" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSuspicious)" stackId="1" />
                      <Area type="monotone" dataKey="flagged" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" stackId="1" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Risk Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-violet-500" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={riskDistribution.length > 0 ? riskDistribution : [{ name: 'No Data', value: 1, color: '#94a3b8' }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(riskDistribution.length > 0 ? riskDistribution : [{ name: 'No Data', value: 1, color: '#94a3b8' }]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-lg">
                                <p className="text-slate-700 text-sm font-medium">{payload[0].name}</p>
                                <p className="text-slate-500 text-xs">{payload[0].value} transactions</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {riskDistribution.map((item) => (
                      <Badge key={item.name} variant="outline" className="text-xs" style={{ borderColor: item.color, color: item.color }}>
                        {item.name}: {item.value}
                      </Badge>
                    ))}
                  </div>
                  {riskDistribution.length === 0 && (
                    <p className="text-center text-slate-400 text-sm">No transaction data yet</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Frequent Contacts & Recent Transactions */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent High-Risk Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                      Fraud Alerts
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 -mr-2" onClick={() => navigate('/admin')}>
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transactions.filter(tx => tx.riskLevel === 'high' || tx.riskLevel === 'medium').length > 0 ? (
                    transactions
                      .filter(tx => tx.riskLevel === 'high' || tx.riskLevel === 'medium')
                      .slice(0, 4)
                      .map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border ${tx.riskLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                            }`}
                        >
                          <div className={`p-2 rounded-lg ${tx.riskLevel === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                            <AlertTriangle className={`h-4 w-4 ${tx.riskLevel === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {tx.transactionType === 'received' ? tx.senderUPI : tx.recipientUPI}
                            </p>
                            <p className="text-xs text-slate-500">
                              ₹{Number(tx.amount).toLocaleString('en-IN')} • {tx.riskLevel} risk
                            </p>
                          </div>
                          <Badge className={`${tx.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} border-0`}>
                            {tx.riskScore || '?'}%
                          </Badge>
                        </motion.div>
                      ))
                  ) : (
                    <div className="text-center py-8">
                      <ShieldCheck className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
                      <p className="text-sm font-medium text-emerald-600">All Clear!</p>
                      <p className="text-xs text-slate-500 mt-1">No high-risk transactions detected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-800">Recent Activity</CardTitle>
                    <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 -mr-2 h-7 text-xs" onClick={() => navigate('/transactions')}>
                      View All <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ScrollArea className="h-[185px] pr-2">
                    {transactions.length > 0 ? (
                      <div className="space-y-1">
                        {transactions.slice(0, 6).map((tx, i) => (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${tx.transactionType === 'received' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                {tx.transactionType === 'received'
                                  ? <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                                  : <ArrowUpRight className="h-3 w-3 text-rose-600" />
                                }
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-800 truncate max-w-[120px] md:max-w-[180px]">
                                  {tx.transactionType === 'received' ? tx.senderUPI : tx.recipientUPI}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {tx.createdAt ? (tx.createdAt.toDate ? tx.createdAt.toDate().toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString()) : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {tx.riskScore != null && tx.riskScore > 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  tx.riskLevel === 'high' ? 'bg-red-100 text-red-600' :
                                  tx.riskLevel === 'medium' ? 'bg-amber-100 text-amber-600' :
                                  'bg-emerald-100 text-emerald-600'
                                }`}>
                                  {tx.riskScore}%
                                </span>
                              )}
                              <p className={`text-xs font-semibold ${tx.transactionType === 'received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.transactionType === 'received' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                              </p>
                              {tx.transactionType === 'sent' && (
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Activity className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 font-medium text-sm">No transactions yet</p>
                        <Button size="sm" className="mt-3 bg-blue-500 hover:bg-blue-600 h-7 text-xs" onClick={() => navigate('/send-money')}>
                          <Send className="h-3 w-3 mr-1" /> Make a Payment
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
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

