"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import Header from "./Header"
import SidebarContent from "./SidebarContent"
import { db } from './firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'

const RecentTransactions = () => {
  const { user, userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

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
        
        // Query for sent transactions (where user is sender)
        const sentQuery = query(transactionsCollection, where("senderUPI", "==", userData.upiId));
        const sentSnapshot = await getDocs(sentQuery);
        const sentTransactions = sentSnapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          transactionType: "sent"
        }));
        console.log("📤 Sent transactions:", sentTransactions.length);

        // Query for received transactions (where user is recipient)
        const receivedQuery = query(transactionsCollection, where("recipientUPI", "==", userData.upiId));
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
    if (!searchTerm.trim()) return true; // Show all if no search term
    
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

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 min-h-screen border-r border-gray-800 bg-gray-900">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <Header user={user} />

        {/* Recent Transactions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6 space-y-6"
        >
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold text-gray-100">Recent Transactions</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  className="pl-8 bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading transactions...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No transactions found</div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <Card key={transaction.id} className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors duration-200">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${transaction.transactionType === 'received' ? 'bg-green-500' : 'bg-red-500'}`}>
                            {transaction.transactionType === 'received' ? <ArrowDownLeft className="h-5 w-5 text-white" /> : <ArrowUpRight className="h-5 w-5 text-white" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-100">
                              {transaction.transactionType === 'received' ? transaction.senderUPI : transaction.recipientUPI || '—'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {transaction.createdAt?.seconds
                                ? new Date(transaction.createdAt.seconds * 1000).toLocaleDateString()
                                : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${transaction.transactionType === 'received' ? 'text-green-400' : 'text-red-400'}`}>
                            {transaction.transactionType === 'received' ? '+' : '-'}₹{transaction.amount ? transaction.amount.toFixed(2) : '0.00'}
                          </p>
                          <Badge
                            variant={
                              transaction.status === "Completed"
                                ? "success"
                                : transaction.status === "Pending"
                                ? "warning"
                                : "destructive"
                            }
                            className="mt-1"
                          >
                            {transaction.status || 'Completed'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}

export default RecentTransactions

