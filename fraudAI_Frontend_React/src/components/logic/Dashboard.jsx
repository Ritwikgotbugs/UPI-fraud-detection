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
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  Gift,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import Header from "./Header.jsx";
import SidebarContent from "./SidebarContent";
import { handleGoogleSignIn } from "./auth";
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
    refreshData
  } = useAuth();
  
  const [upiId, setUpiId] = useState("");
  const [balance, setBalance] = useState(contextBalance);
  const [transactions, setTransactions] = useState(contextTransactions);
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [totalSpending, setTotalSpending] = useState(contextTotalSpending);
  const [totalReceived, setTotalReceived] = useState(contextTotalReceived);
  const [cashbackEarned, setCashbackEarned] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState([]);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setBalance(contextBalance);
    setTransactions(contextTransactions);
    setTotalSpending(contextTotalSpending);
    setTotalReceived(contextTotalReceived);
    setCashbackEarned(contextTotalSpending * 0.01);
  }, [contextBalance, contextTransactions, contextTotalSpending, contextTotalReceived]);

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
      const sentList = contextTransactions.filter(tx => tx.transactionType === 'sent');
      
      const categoryMap = {};
      sentList.forEach(tx => {
        const category = tx.remarks ? tx.remarks.charAt(0).toUpperCase() + tx.remarks.slice(1).toLowerCase() : 'Other';
        categoryMap[category] = (categoryMap[category] || 0) + (parseFloat(tx.amount) || 0);
      });
      const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      setSpendingByCategory(categoryData.length > 0 ? categoryData : [{ name: 'No Data', value: 0 }]);

      const monthlyMap = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => { monthlyMap[m] = 0; });
      
      sentList.forEach(tx => {
        const timestamp = tx.createdAt || tx.timestamp;
        if (timestamp) {
          const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          const monthName = months[date.getMonth()];
          monthlyMap[monthName] += parseFloat(tx.amount) || 0;
        }
      });
      
      const currentMonth = new Date().getMonth();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const monthIdx = (currentMonth - i + 12) % 12;
        last6Months.push({ name: months[monthIdx], value: monthlyMap[months[monthIdx]] });
      }
      setMonthlySpending(last6Months);
    }
  }, [userData?.upiId, contextTransactions]);

  const quickActions = [
    { icon: Send, label: "Send", color: "from-blue-500 to-blue-600", path: "/send-money" },
    { icon: QrCode, label: "Scan & Pay", color: "from-violet-500 to-purple-600", path: "/send-money" },
    { icon: Receipt, label: "Bills", color: "from-emerald-500 to-green-600", path: "/send-money" },
    { icon: Gift, label: "Rewards", color: "from-amber-500 to-orange-600", path: "/dashboard" },
  ];

  const frequentContacts = contextTransactions
    .filter(tx => tx.transactionType === 'sent')
    .reduce((acc, tx) => {
      const existing = acc.find(c => c.upi === tx.recipientUPI);
      if (existing) {
        existing.count += 1;
        existing.total += Number(tx.amount);
      } else {
        acc.push({ upi: tx.recipientUPI, count: 1, total: Number(tx.amount) });
      }
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>
      
      <div className="flex-1 overflow-y-auto">
        <Header user={user} onSignIn={handleGoogleSignIn} />
        
        <div className="p-4 md:p-6 space-y-6">
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
                    <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                      <Bell className="h-5 w-5" />
                    </Button>
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

            {/* Security & Rewards Cards */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">AI Protection</p>
                      <p className="text-lg font-bold text-emerald-800">Active</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600/70 mt-3">All transactions monitored by ML fraud detection</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 rounded-xl">
                        <Zap className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-600 font-medium">Cashback</p>
                        <p className="text-lg font-bold text-amber-800">₹{cashbackEarned.toFixed(0)}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">1% back</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-violet-100 rounded-xl">
                      <Target className="h-6 w-6 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm text-violet-600 font-medium">Monthly Goal</p>
                      <p className="text-lg font-bold text-violet-800">₹10,000</p>
                    </div>
                  </div>
                  <div className="w-full bg-violet-100 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((totalReceived / 10000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-violet-600/70 mt-2">{((totalReceived / 10000) * 100).toFixed(0)}% achieved</p>
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
            {/* Spending Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800">Spending Overview</CardTitle>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                      {['week', 'month', 'year'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setSelectedTimeframe(tf)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            selectedTimeframe === tf 
                              ? 'bg-white text-slate-800 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlySpending.length > 0 ? monthlySpending : [{ name: 'No Data', value: 0 }]}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg">
                                <p className="text-slate-500 text-xs mb-1">{payload[0].payload.name}</p>
                                <p className="text-blue-600 font-semibold">₹{payload[0].value.toLocaleString('en-IN')}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-800">By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {spendingByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-lg">
                                <p className="text-slate-700 text-sm font-medium">{payload[0].name}</p>
                                <p className="text-slate-500 text-xs">₹{payload[0].value.toLocaleString('en-IN')}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {spendingByCategory.slice(0, 4).map((cat, i) => (
                      <Badge key={cat.name} variant="outline" className="text-xs" style={{ borderColor: COLORS[i], color: COLORS[i] }}>
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Frequent Contacts & Recent Transactions */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Frequent Contacts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800">People</CardTitle>
                    <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 -mr-2">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {frequentContacts.length > 0 ? (
                    frequentContacts.map((contact, i) => (
                      <motion.button
                        key={contact.upi}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        onClick={() => navigate('/send-money')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                            {contact.upi.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-slate-800 truncate">{contact.upi}</p>
                          <p className="text-xs text-slate-500">{contact.count} transactions</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </motion.button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No frequent contacts yet</p>
                      <Button variant="ghost" size="sm" className="text-blue-500 mt-2" onClick={() => navigate('/send-money')}>
                        Send your first payment
                      </Button>
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
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800">Recent Activity</CardTitle>
                    <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 -mr-2" onClick={() => navigate('/transactions')}>
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[320px] pr-4">
                    {transactions.length > 0 ? (
                      <div className="space-y-2">
                        {transactions.slice(0, 8).map((tx, i) => (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${tx.transactionType === 'received' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                {tx.transactionType === 'received' 
                                  ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                                  : <ArrowUpRight className="h-4 w-4 text-rose-600" />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {tx.transactionType === 'received' ? tx.senderUPI : tx.recipientUPI}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {tx.createdAt ? (tx.createdAt.toDate ? tx.createdAt.toDate().toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString()) : 'N/A'}
                                  {tx.remarks && ` • ${tx.remarks}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className={`text-sm font-semibold ${tx.transactionType === 'received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.transactionType === 'received' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                              </p>
                              {tx.transactionType === 'sent' && (
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No transactions yet</p>
                        <p className="text-sm text-slate-400 mt-1">Your activity will appear here</p>
                        <Button className="mt-4 bg-blue-500 hover:bg-blue-600" onClick={() => navigate('/send-money')}>
                          <Send className="h-4 w-4 mr-2" /> Make a Payment
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

