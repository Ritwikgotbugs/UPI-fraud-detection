"use client"

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDoc, collection, doc, getDocs, increment, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle,
    FileWarning,
    Loader2,
    Search,
    Send,
    Shield,
    ShieldAlert,
    UserX,
    X
} from 'lucide-react';
import { useState } from "react";
import { useAuth } from '../../context/AuthContext';
import Header from "./Header.jsx";
import SidebarContent from "./SidebarContent";
import { db } from "./firebase.js";

const FRAUD_TYPES = [
  { id: 'scam', label: 'Scam/Fraud', description: 'User attempted to deceive or steal money' },
  { id: 'impersonation', label: 'Impersonation', description: 'User pretending to be someone else' },
  { id: 'phishing', label: 'Phishing', description: 'Attempted to steal personal information' },
  { id: 'unauthorized', label: 'Unauthorized Transaction', description: 'Transaction made without consent' },
  { id: 'fake_business', label: 'Fake Business', description: 'Fraudulent business or merchant' },
  { id: 'money_laundering', label: 'Suspicious Activity', description: 'Potential money laundering or illegal activity' },
  { id: 'other', label: 'Other', description: 'Other type of fraudulent behavior' },
];

const ReportFraud = () => {
  const { userData, user } = useAuth();
  const [upiToReport, setUpiToReport] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [fraudType, setFraudType] = useState("");
  const [description, setDescription] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const searchUser = async () => {
    if (!upiToReport.trim()) {
      showNotification('error', 'Please enter a UPI ID to search');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("upiId", "==", upiToReport.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        setSearchResult({
          id: userDoc.id,
          upiId: userData.upiId,
          name: userData.name || 'Unknown',
          email: userData.email,
          photoURL: userData.photoURL,
          accountAge: userData.createdAt ? Math.floor((Date.now() - userData.createdAt.toDate()) / (1000 * 60 * 60 * 24)) : null,
          transactionDetails: userData.transactionDetails || {},
          existingComplaints: userData.transactionDetails?.fraudComplaintsCount || 0
        });
      } else {
        setSearchResult({ notFound: true, upiId: upiToReport });
      }
    } catch (error) {
      console.error("Error searching user:", error);
      showNotification('error', 'Failed to search for user');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!searchResult || searchResult.notFound) {
      showNotification('error', 'Please search for a valid user first');
      return;
    }

    if (!fraudType) {
      showNotification('error', 'Please select a fraud type');
      return;
    }

    if (!description.trim()) {
      showNotification('error', 'Please provide a description of the incident');
      return;
    }

    if (searchResult.upiId === userData?.upiId) {
      showNotification('error', 'You cannot report yourself');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the fraud report
      await addDoc(collection(db, "fraudReports"), {
        reportedUpiId: searchResult.upiId,
        reportedUserId: searchResult.id,
        reportedByUpiId: userData?.upiId,
        reportedByUserId: user?.uid,
        reportedByName: userData?.name || user?.displayName,
        fraudType,
        description: description.trim(),
        transactionId: transactionId.trim() || null,
        amount: amount ? parseFloat(amount) : null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Increment the fraud complaints count in the reported user's profile
      if (searchResult.id) {
        const reportedUserRef = doc(db, "users", searchResult.id);
        await updateDoc(reportedUserRef, {
          'transactionDetails.fraudComplaintsCount': increment(1),
          'modelData.Fraud_Complaints_Count': increment(1),
        });
      }

      setReportSubmitted(true);
      showNotification('success', 'Fraud report submitted successfully. The user\'s fraud complaints count has been updated.');
      
      // Reset form
      setUpiToReport("");
      setSearchResult(null);
      setFraudType("");
      setDescription("");
      setTransactionId("");
      setAmount("");
    } catch (error) {
      console.error("Error submitting report:", error);
      showNotification('error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskIndicator = (params) => {
    if (!params) return { level: 'Unknown', color: 'bg-slate-100 text-slate-600', score: 0 };
    
    // Use same risk calculation as Dashboard for consistency
    let score = 10; // Base score
    
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
    
    // Use same thresholds as Dashboard: >=60 high, >=35 medium, else low
    if (finalScore >= 60) return { level: 'High Risk', color: 'bg-red-100 text-red-700', score: finalScore };
    if (finalScore >= 35) return { level: 'Medium Risk', color: 'bg-amber-100 text-amber-700', score: finalScore };
    return { level: 'Low Risk', color: 'bg-emerald-100 text-emerald-700', score: finalScore };
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100">
      {/* Sidebar */}
      <div className="hidden lg:block w-64 border-r border-slate-200 bg-white">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* <Header /> */}

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileWarning className="h-7 w-7 text-red-500" />
                Report Fraudulent Activity
              </h1>
              <p className="text-slate-500 mt-1">
                Help protect the community by reporting suspicious users or transactions
              </p>
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
                    notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }>
                    {notification.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={
                      notification.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }>
                      {notification.message}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success State */}
            {reportSubmitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-800 mb-2">Report Submitted Successfully</h2>
                    <p className="text-emerald-600 mb-4">
                      Thank you for helping keep our platform safe. Our team will review your report.
                    </p>
                    <Button onClick={() => setReportSubmitted(false)} className="bg-emerald-600 hover:bg-emerald-700">
                      Submit Another Report
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {!reportSubmitted && (
              <>
                {/* Search User Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-500" />
                        Search User to Report
                      </CardTitle>
                      <CardDescription>
                        Enter the UPI ID of the user you want to report
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        <Input
                          placeholder="e.g., frauduser@upi"
                          value={upiToReport}
                          onChange={(e) => setUpiToReport(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                        />
                        <Button onClick={searchUser} disabled={isSearching}>
                          {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Search Result */}
                      <AnimatePresence>
                        {searchResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-4"
                          >
                            {searchResult.notFound ? (
                              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <div className="flex items-center gap-3">
                                  <UserX className="h-5 w-5 text-amber-600" />
                                  <div>
                                    <p className="font-medium text-amber-800">User Not Found</p>
                                    <p className="text-sm text-amber-600">
                                      No user with UPI ID "{searchResult.upiId}" exists in our system. 
                                      You can still file a report for external users.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                                    {searchResult.name?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-slate-800">{searchResult.name}</p>
                                      <Badge className={getRiskIndicator(searchResult.transactionDetails).color}>
                                        {getRiskIndicator(searchResult.transactionDetails).level}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-slate-600">{searchResult.upiId}</p>
                                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                      {searchResult.accountAge !== null && (
                                        <span>Account Age: {searchResult.accountAge} days</span>
                                      )}
                                      {searchResult.existingComplaints > 0 && (
                                        <span className="text-red-600 font-medium">
                                          {searchResult.existingComplaints} existing complaints
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setSearchResult(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Report Details Card */}
                {searchResult && !searchResult.notFound && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-red-500" />
                          Report Details
                        </CardTitle>
                        <CardDescription>
                          Provide details about the fraudulent activity
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Fraud Type */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Type of Fraud *</Label>
                          <Select value={fraudType} onValueChange={setFraudType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fraud type" />
                            </SelectTrigger>
                            <SelectContent>
                              {FRAUD_TYPES.map(type => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div>
                                    <p className="font-medium">{type.label}</p>
                                    <p className="text-xs text-slate-500">{type.description}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Description *</Label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what happened in detail..."
                            className="w-full min-h-[120px] p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Optional Fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Transaction ID (optional)</Label>
                            <Input
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="e.g., TXN123456"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Amount Lost (optional)</Label>
                            <Input
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="₹0.00"
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                          <Button
                            onClick={handleSubmitReport}
                            disabled={isSubmitting}
                            className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-semibold"
                          >
                            {isSubmitting ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Submitting Report...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Submit Fraud Report
                              </div>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-700 mb-1">How Reports Help</h3>
                          <p className="text-sm text-slate-600">
                            Your reports contribute to our ML fraud detection model. When multiple users 
                            report the same account, it increases their risk score and triggers additional 
                            verification for their transactions. False reports may result in account restrictions.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ReportFraud;
