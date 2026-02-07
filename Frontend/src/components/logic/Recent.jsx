"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { collection, getDocs, query, where } from 'firebase/firestore'
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Filter,
  Hash,
  MessageSquare,
  Receipt,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from "react"
import { useAuth } from '../../context/AuthContext'
import MobileNav from "./MobileNav"
import SidebarContent from "./SidebarContent"
import { db } from './firebase'

const RecentTransactions = () => {
  const { user, userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [expandedTx, setExpandedTx] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userData?.upiId) {
        setLoading(false);
        return;
      }
      try {
        const txCol = collection(db, "transactions");

        const sentSnap = await getDocs(query(txCol, where("senderUPI", "==", userData.upiId), where("transactionType", "==", "sent")));
        const sentList = sentSnap.docs.map(d => ({ id: d.id, ...d.data(), transactionType: "sent" }));

        const recvSnap = await getDocs(query(txCol, where("recipientUPI", "==", userData.upiId), where("transactionType", "==", "received")));
        const recvList = recvSnap.docs.map(d => ({ id: d.id, ...d.data(), transactionType: "received" }));

        setTransactions(
          [...sentList, ...recvList].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [userData?.upiId]);

  // Derived stats
  const stats = useMemo(() => {
    const sent = transactions.filter(t => t.transactionType === 'sent');
    const received = transactions.filter(t => t.transactionType === 'received');
    const highRisk = transactions.filter(t => t.riskLevel === 'high' || (Number(t.riskScore) || 0) >= 60);
    return {
      totalSent: sent.reduce((s, t) => s + (Number(t.amount) || 0), 0),
      totalReceived: received.reduce((s, t) => s + (Number(t.amount) || 0), 0),
      sentCount: sent.length,
      receivedCount: received.length,
      highRiskCount: highRisk.length,
      avgRisk: transactions.length
        ? Math.round(transactions.reduce((s, t) => s + (Number(t.riskScore) || 0), 0) / transactions.length)
        : 0,
    };
  }, [transactions]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filter === "sent") result = result.filter(t => t.transactionType === "sent");
    if (filter === "received") result = result.filter(t => t.transactionType === "received");
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.senderUPI || "").toLowerCase().includes(q) ||
        (t.recipientUPI || "").toLowerCase().includes(q) ||
        (t.remarks || "").toLowerCase().includes(q) ||
        (t.amount != null && t.amount.toString().includes(searchTerm)) ||
        (t.id || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, filter, searchTerm]);

  // Helpers
  const formatDate = (ts) => {
    if (!ts?.seconds) return '—';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (ts) => {
    if (!ts?.seconds) return '';
    return new Date(ts.seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const relativeDate = (ts) => {
    if (!ts?.seconds) return '—';
    const date = new Date(ts.seconds * 1000);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRiskColor = (score) => {
    const s = Number(score) || 0;
    if (s >= 60) return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100', border: 'border-red-200' };
    if (s >= 35) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100', border: 'border-amber-200' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100', border: 'border-emerald-200' };
  };

  const tabCounts = {
    all: transactions.length,
    received: stats.receivedCount,
    sent: stats.sentCount,
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <MobileNav />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-8 md:pb-12 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
              <p className="text-slate-500 text-sm mt-0.5">View detailed information about all your transactions</p>
            </div>
            <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 px-3 py-1.5 w-fit">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              {transactions.length} total transactions
            </Badge>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-lg shadow-emerald-500/15 overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                  <p className="text-emerald-100 text-[10px] font-semibold uppercase tracking-wider">Received</p>
                  <p className="text-xl font-bold text-white mt-1">₹{stats.totalReceived.toLocaleString('en-IN')}</p>
                  <p className="text-emerald-200 text-[10px] mt-0.5">{stats.receivedCount} transactions</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-rose-500 to-pink-600 border-0 shadow-lg shadow-rose-500/15 overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                  <p className="text-rose-100 text-[10px] font-semibold uppercase tracking-wider">Sent</p>
                  <p className="text-xl font-bold text-white mt-1">₹{stats.totalSent.toLocaleString('en-IN')}</p>
                  <p className="text-rose-200 text-[10px] mt-0.5">{stats.sentCount} transactions</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Avg Risk</p>
                    <Shield className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className={`text-xl font-bold mt-1 ${stats.avgRisk >= 60 ? 'text-red-600' : stats.avgRisk >= 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {stats.avgRisk}%
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5">across all transactions</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Flagged</p>
                    <ShieldAlert className="h-4 w-4 text-red-300" />
                  </div>
                  <p className="text-xl font-bold mt-1 text-red-600">{stats.highRiskCount}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">high risk transactions</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tab Bar + Search */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-sm">
              <CardContent className="p-3 space-y-3">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1">
                  {[
                    { key: 'all', label: 'All', icon: Filter },
                    { key: 'received', label: 'Received', icon: ArrowDownLeft },
                    { key: 'sent', label: 'Sent', icon: ArrowUpRight },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setFilter(tab.key); setExpandedTx(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        filter === tab.key
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${
                        filter === tab.key
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-200/80 text-slate-400'
                      }`}>
                        {tabCounts[tab.key]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by UPI ID, amount, transaction ID, or remarks..."
                    className="pl-10 h-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transaction List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm">Loading transactions...</p>
              </div>
            ) : filtered.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur border-slate-200/50">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Receipt className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-semibold">No transactions found</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {searchTerm ? "Try a different search term" : filter !== 'all' ? `No ${filter} transactions yet` : "Your transactions will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((tx, i) => {
                const isReceived = tx.transactionType === 'received';
                const counterparty = isReceived ? tx.senderUPI : tx.recipientUPI;
                const riskScore = Number(tx.riskScore) || 0;
                const riskLevel = tx.riskLevel || (riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low');
                const rc = getRiskColor(riskScore);
                const isOpen = expandedTx === tx.id;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  >
                    <Card className={`bg-white/90 backdrop-blur border-slate-200/50 shadow-sm hover:shadow-md transition-all overflow-hidden ${
                      isOpen ? 'ring-1 ring-blue-200' : ''
                    }`}>
                      {/* Main Row */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer"
                        onClick={() => setExpandedTx(isOpen ? null : tx.id)}
                      >
                        {/* Type Icon */}
                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${isReceived ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                          {isReceived
                            ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                            : <ArrowUpRight className="h-5 w-5 text-rose-600" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {isReceived ? 'From' : 'To'}: {counterparty || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400">{relativeDate(tx.createdAt)}</span>
                            {tx.remarks && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-[11px] text-slate-500 truncate max-w-[120px] capitalize">{tx.remarks}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {riskScore > 0 && (
                            <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg ${rc.light} ${rc.border} border`}>
                              {riskLevel === 'high' ? <ShieldAlert className={`h-3 w-3 ${rc.text}`} /> : <Shield className={`h-3 w-3 ${rc.text}`} />}
                              <span className={`text-[11px] font-bold ${rc.text}`}>{riskScore}%</span>
                            </div>
                          )}

                          <div className="text-right">
                            <p className={`text-base font-bold ${isReceived ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isReceived ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                              tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              tx.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {tx.status || 'Completed'}
                            </Badge>
                          </div>

                          <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 space-y-4">
                              {/* Detail Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {/* Transaction ID */}
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Hash className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Transaction ID</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-mono text-slate-700 truncate">{tx.id}</p>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyToClipboard(tx.id); }}
                                      className="p-0.5 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
                                    >
                                      {copiedId === tx.id
                                        ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        : <Copy className="h-3 w-3 text-slate-400" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Sender */}
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <User className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sender</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700 truncate">{tx.senderUPI || '—'}</p>
                                </div>

                                {/* Recipient */}
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <User className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Recipient</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700 truncate">{tx.recipientUPI || '—'}</p>
                                </div>

                                {/* Amount */}
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Receipt className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Amount</span>
                                  </div>
                                  <p className={`text-sm font-bold ${isReceived ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>

                                {/* Date & Time */}
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Date & Time</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700">{formatDate(tx.createdAt)}</p>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Clock className="h-2.5 w-2.5" />{formatTime(tx.createdAt)}
                                  </p>
                                </div>

                                {/* Status */}
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <CheckCircle2 className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                                  </div>
                                  <Badge variant="outline" className={`text-xs mt-0.5 ${
                                    tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    tx.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {tx.status || 'Completed'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Remarks */}
                              {tx.remarks && (
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <MessageSquare className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Remarks</span>
                                  </div>
                                  <p className="text-xs text-slate-700 capitalize">{tx.remarks}</p>
                                </div>
                              )}

                              {/* Risk Analysis Card */}
                              <div className={`rounded-xl border p-4 ${
                                riskLevel === 'high' ? 'bg-red-50/60 border-red-200' :
                                riskLevel === 'medium' ? 'bg-amber-50/60 border-amber-200' :
                                'bg-emerald-50/60 border-emerald-200'
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    {riskLevel === 'high'
                                      ? <ShieldAlert className="h-4 w-4 text-red-500" />
                                      : riskLevel === 'medium'
                                      ? <Shield className="h-4 w-4 text-amber-500" />
                                      : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Risk Analysis</span>
                                  </div>
                                  <Badge className={`text-xs font-bold border-0 ${
                                    riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                                    riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {riskLevel.toUpperCase()} RISK
                                  </Badge>
                                </div>

                                {/* Risk Score Bar */}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="w-full bg-white/70 rounded-full h-2.5">
                                      <div
                                        className={`h-2.5 rounded-full transition-all ${rc.bg}`}
                                        style={{ width: `${Math.max(riskScore, 3)}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className={`text-lg font-black ${rc.text} min-w-[48px] text-right`}>{riskScore}%</span>
                                </div>

                                {/* Risk Description */}
                                <p className="text-[11px] text-slate-500 mt-2.5">
                                  {isReceived
                                    ? riskLevel === 'high'
                                      ? 'This incoming transaction was flagged as high risk. The sender\'s profile or transaction pattern shows significant risk indicators. Exercise caution with future transactions from this party.'
                                      : riskLevel === 'medium'
                                      ? 'This incoming transaction has moderate risk indicators. Some factors in the sender\'s profile warrant attention. Monitor future activity from this party.'
                                      : 'This incoming transaction appears safe. No significant risk indicators were detected in the sender\'s profile.'
                                    : riskLevel === 'high'
                                      ? 'This outgoing transaction was flagged as high risk. The recipient\'s profile or transaction pattern shows significant risk indicators.'
                                      : riskLevel === 'medium'
                                      ? 'This outgoing transaction has moderate risk indicators. Some factors in the recipient\'s profile warrant attention.'
                                      : 'This outgoing transaction appears safe. No significant risk indicators were detected.'}
                                </p>

                                {/* Risk Factors Summary */}
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <div className="bg-white/60 rounded-lg px-2.5 py-1.5 text-center">
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase">Score</p>
                                    <p className={`text-sm font-bold ${rc.text}`}>{riskScore}/100</p>
                                  </div>
                                  <div className="bg-white/60 rounded-lg px-2.5 py-1.5 text-center">
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase">Level</p>
                                    <p className={`text-sm font-bold capitalize ${rc.text}`}>{riskLevel}</p>
                                  </div>
                                  <div className="bg-white/60 rounded-lg px-2.5 py-1.5 text-center">
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase">Type</p>
                                    <p className="text-sm font-bold text-slate-700 capitalize">{tx.transactionType}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Results summary */}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-xs text-slate-400 pt-2">
              Showing {filtered.length} of {transactions.length} transactions
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default RecentTransactions

