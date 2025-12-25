"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { collection, getDocs, query, where } from 'firebase/firestore'
import { motion } from "framer-motion"
import { ArrowDownLeft, ArrowUpRight, Calendar, Filter, Receipt, Search, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from "react"
import { useAuth } from '../../context/AuthContext'
import Header from "./Header"
import SidebarContent from "./SidebarContent"
import { db } from './firebase'

const RecentTransactions = () => {
  const { user, userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, sent, received

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userData?.upiId) {
        console.log("No UPI ID available");
        setLoading(false);
        return;
      }

      try {
        console.log("📊 Fetching transactions for UPI:", userData.upiId);
        
        const transactionsCollection = collection(db, "transactions");
        
        // Query for sent transactions (where user is sender AND type is sent)
        const sentQuery = query(transactionsCollection, where("senderUPI", "==", userData.upiId), where("transactionType", "==", "sent"));
        const sentSnapshot = await getDocs(sentQuery);
        const sentTransactions = sentSnapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          transactionType: "sent"
        }));
        console.log("📤 Sent transactions:", sentTransactions.length);

        // Query for received transactions (where user is recipient AND type is received)
        const receivedQuery = query(transactionsCollection, where("recipientUPI", "==", userData.upiId), where("transactionType", "==", "received"));
        const receivedSnapshot = await getDocs(receivedQuery);
        const receivedTransactions = receivedSnapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          transactionType: "received"
        }));
        console.log("📥 Received transactions:", receivedTransactions.length);

        // Combine and sort by date
        const allTransactions = [...sentTransactions, ...receivedTransactions]
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        console.log("✅ Total transactions for user:", allTransactions.length);
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
    // Filter by type
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

  // Calculate stats
  const totalSent = transactions.filter(t => t.transactionType === 'sent').reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalReceived = transactions.filter(t => t.transactionType === 'received').reduce((acc, t) => acc + (t.amount || 0), 0);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return '—';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* <Header user={user} /> */}

        <div className="p-6 space-y-5">
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
                      className={`h-10 px-4 rounded-xl transition-all ${
                        filter === "all" 
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
                      className={`h-10 px-4 rounded-xl transition-all ${
                        filter === "received" 
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
                      className={`h-10 px-4 rounded-xl transition-all ${
                        filter === "sent" 
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
                  <div className="divide-y divide-slate-100">
                    {filteredTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${
                            transaction.transactionType === 'received' 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : 'bg-rose-100 text-rose-600'
                          }`}>
                            {transaction.transactionType === 'received' 
                              ? <ArrowDownLeft className="h-5 w-5" /> 
                              : <ArrowUpRight className="h-5 w-5" />
                            }
                          </div>
                          
                          {/* Details */}
                          <div>
                            <p className="font-semibold text-slate-800">
                              {transaction.transactionType === 'received' 
                                ? transaction.senderUPI 
                                : transaction.recipientUPI || '—'
                              }
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
                        
                        {/* Amount & Status */}
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            transaction.transactionType === 'received' 
                              ? 'text-emerald-600' 
                              : 'text-rose-600'
                          }`}>
                            {transaction.transactionType === 'received' ? '+' : '-'}₹{transaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] mt-1 ${
                              transaction.status === "Completed"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : transaction.status === "Pending"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-red-50 text-red-600 border-red-200"
                            }`}
                          >
                            {transaction.status || 'Completed'}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export default RecentTransactions

