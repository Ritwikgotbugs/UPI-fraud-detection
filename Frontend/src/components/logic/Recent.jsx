"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { collection, getDocs, query, where } from 'firebase/firestore'
import { AnimatePresence, motion } from "framer-motion"
import { ArrowDownLeft, ArrowUpRight, Calendar, ChevronDown, ChevronUp, Filter, Receipt, Search, TrendingDown, TrendingUp, User, X } from 'lucide-react'
import { useEffect, useState } from "react"
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
  const [expandedGroups, setExpandedGroups] = useState({})

  const toggleGroup = (upiId) => {
    setExpandedGroups(prev => ({ ...prev, [upiId]: !prev[upiId] }));
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userData?.upiId) {
        setLoading(false);
        return;
      }

      try {

        const transactionsCollection = collection(db, "transactions");


        const sentQuery = query(transactionsCollection, where("senderUPI", "==", userData.upiId), where("transactionType", "==", "sent"));
        const sentSnapshot = await getDocs(sentQuery);
        const sentTransactions = sentSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          transactionType: "sent"
        }));


        const receivedQuery = query(transactionsCollection, where("recipientUPI", "==", userData.upiId), where("transactionType", "==", "received"));
        const receivedSnapshot = await getDocs(receivedQuery);
        const receivedTransactions = receivedSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          transactionType: "received"
        }));


        const allTransactions = [...sentTransactions, ...receivedTransactions]
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setTransactions(allTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userData?.upiId]);

  const filteredTransactions = transactions.filter((transaction) => {

    if (filter === "sent" && transaction.transactionType !== "sent") return false;
    if (filter === "received" && transaction.transactionType !== "received") return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase()
    const senderUPI = (transaction.senderUPI || "").toLowerCase()
    const recipientUPI = (transaction.recipientUPI || "").toLowerCase()
    const remarks = (transaction.remarks || "").toLowerCase()
    const amountStr = transaction.amount != null ? transaction.amount.toString() : ""

    return (
      senderUPI.includes(term) ||
      recipientUPI.includes(term) ||
      amountStr.includes(searchTerm) ||
      remarks.includes(term)
    )
  })

  // Group transactions sequentially by counterparty (run-length grouping)
  const groupedSequences = [];
  filteredTransactions.forEach((transaction) => {
    const counterparty = transaction.transactionType === 'received'
      ? transaction.senderUPI
      : (transaction.recipientUPI || 'Unknown');

    const lastGroup = groupedSequences[groupedSequences.length - 1];

    // Check if the current transaction belongs to the same counterparty as the last group
    if (lastGroup && lastGroup.upiId === counterparty) {
      lastGroup.transactions.push(transaction);
    } else {
      // Start a new group
      groupedSequences.push({
        upiId: counterparty,
        transactions: [transaction],
        groupId: `${counterparty}-${groupedSequences.length}`
      });
    }
  });


  const totalSent = transactions.filter(t => t.transactionType === 'sent').reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalReceived = transactions.filter(t => t.transactionType === 'received').reduce((acc, t) => acc + (t.amount || 0), 0);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return '—';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();

    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navigation */}
        <MobileNav />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-8 md:pb-12 space-y-4 md:space-y-5">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
              <p className="text-slate-500 text-sm mt-0.5">View and search your past transactions</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 px-3 py-1">
                <Receipt className="h-3.5 w-3.5 mr-1.5" />
                {transactions.length} transactions
              </Badge>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-lg shadow-emerald-500/20 overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Received</p>
                      <p className="text-2xl font-bold text-white mt-1">₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-white" />
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
              <Card className="bg-gradient-to-br from-rose-500 to-pink-600 border-0 shadow-lg shadow-rose-500/20 overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">Total Sent</p>
                      <p className="text-2xl font-bold text-white mt-1">₹{totalSent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search and Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by UPI ID, amount, or remarks..."
                      className="pl-10 h-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 rounded-xl"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilter("all")}
                      className={`h-10 px-4 rounded-xl transition-all ${filter === "all"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      <Filter className="h-4 w-4 mr-1.5" />
                      All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilter("received")}
                      className={`h-10 px-4 rounded-xl transition-all ${filter === "received"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      <ArrowDownLeft className="h-4 w-4 mr-1.5" />
                      Received
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilter("sent")}
                      className={`h-10 px-4 rounded-xl transition-all ${filter === "sent"
                        ? "bg-rose-50 border-rose-300 text-rose-600"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1.5" />
                      Sent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transactions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500">Loading transactions...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Receipt className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">No transactions found</p>
                    <p className="text-slate-400 text-sm mt-1">
                      {searchTerm ? "Try a different search term" : "Your transactions will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 bg-slate-100">
                    {groupedSequences.map((group, groupIndex) => {
                      const groupTxs = group.transactions;
                      const latestTx = groupTxs[0];
                      const upiId = group.upiId;
                      const groupId = group.groupId;
                      const isExpanded = expandedGroups[groupId];
                      const txCount = groupTxs.length;

                      return (
                        <motion.div
                          key={groupId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIndex * 0.05 }}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
                        >
                          {/* Group Header */}
                          <div
                            onClick={() => toggleGroup(groupId)}
                            className="flex items-center justify-between p-4 cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-800 text-sm md:text-base">{upiId}</h3>
                                <p className="text-xs text-slate-500">
                                  Last active: {formatDate(latestTx.createdAt)} • {txCount} transaction{txCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </Button>
                          </div>

                          {/* Expanded List */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="divide-y divide-slate-100 border-t border-slate-100">
                                  {groupTxs.map((transaction) => (
                                    <div
                                      key={transaction.id}
                                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${transaction.transactionType === 'received'
                                          ? 'bg-emerald-50 text-emerald-600'
                                          : 'bg-rose-50 text-rose-600'
                                          }`}>
                                          {transaction.transactionType === 'received'
                                            ? <ArrowDownLeft className="h-4 w-4" />
                                            : <ArrowUpRight className="h-4 w-4" />
                                          }
                                        </div>

                                        <div>
                                          <p className="font-medium text-slate-700 text-sm">
                                            {transaction.transactionType === 'received' ? 'Received' : 'Sent'}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {formatDate(transaction.createdAt)}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-xs text-slate-400">{formatTime(transaction.createdAt)}</span>
                                            {transaction.remarks && (
                                              <>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-xs text-slate-500 capitalize">{transaction.remarks}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <p className={`font-bold text-sm ${transaction.transactionType === 'received'
                                          ? 'text-emerald-600'
                                          : 'text-rose-600'
                                          }`}>
                                          {transaction.transactionType === 'received' ? '+' : '-'}₹{transaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] mt-1 scale-90 origin-right ${transaction.status === "Completed"
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            : transaction.status === "Pending"
                                              ? "bg-amber-50 text-amber-600 border-amber-200"
                                              : "bg-red-50 text-red-600 border-red-200"
                                            }`}
                                        >
                                          {transaction.status || 'Completed'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main >
    </div >
  )
}

export default RecentTransactions

