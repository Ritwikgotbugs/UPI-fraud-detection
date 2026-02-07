import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from "react";
import { db } from '../firebase';
import AdminLayout from "../AdminLayout";

const ITEMS_PER_PAGE = 15;

const getRiskBadge = (level) => {
  switch (level?.toLowerCase()) {
    case 'high':
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 font-semibold text-xs px-2.5">HIGH</Badge>;
    case 'medium':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold text-xs px-2.5">MEDIUM</Badge>;
    case 'low':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold text-xs px-2.5">LOW</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 font-semibold text-xs px-2.5">-</Badge>;
  }
};

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'blocked':
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px]">Blocked</Badge>;
    case 'flagged':
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">Flagged</Badge>;
    case 'approved':
    case 'completed':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Approved</Badge>;
    default:
      return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">{status || 'Pending'}</Badge>;
  }
};

export default function RiskEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0, blocked: 0 });
  const [users, setUsers] = useState([]);

  // Fetch users for profile data lookup (modelData + transactionDetails live on user docs, not transactions)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Build user profile map (upiId/email/uid → { modelData, details })
  const userProfileMap = useMemo(() => {
    const map = new Map();
    users.forEach(u => {
      const profile = { modelData: u.modelData || {}, details: u.transactionDetails || {} };
      if (u.upiId) map.set(u.upiId, profile);
      if (u.email) map.set(u.email, profile);
      if (u.id) map.set(u.id, profile);
    });
    return map;
  }, [users]);

  // Generate pseudo-random IP from sender UPI or transaction ID for display
  const generateIP = (seed) => {
    if (!seed) return '192.168.1.1';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const a = Math.abs(hash % 223) + 1;
    const b = Math.abs((hash >> 8) % 255);
    const c = Math.abs((hash >> 16) % 255);
    const d = Math.abs((hash >> 24) % 255);
    return `${a}.${b}.${c}.${d}`;
  };

  // Generate device ID from transaction data
  const generateDeviceId = (tx) => {
    const deviceFP = tx.deviceFingerprinting || tx.device_fingerprinting;
    if (deviceFP && typeof deviceFP === 'string' && deviceFP.length > 5) return deviceFP;
    
    const base = tx.senderUPI || tx.id || 'unknown';
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = ((hash << 5) - hash) + base.charCodeAt(i);
      hash |= 0;
    }
    const isNewDevice = (tx.modelData?.deviceFingerprinting < 0.3) || (tx.device_fingerprinting < 0.3);
    const prefix = isNewDevice ? 'NEW-DEVICE' : 'DEVICE';
    return `UAT-${prefix}-${Math.abs(hash).toString().slice(0, 13)}`;
  };

  // Compute risk score from transaction data
  const computeRiskScore = (tx) => {
    if (tx.riskScore !== undefined) return Math.round(Number(tx.riskScore));
    if (tx.risk_score !== undefined) return Math.round(Number(tx.risk_score));
    
    let score = 10;
    const model = tx.modelData || {};
    
    if (model.recipientBlacklistStatus === 1 || tx.recipient_blacklist_status === 1) score += 35;
    if (model.vpnProxyUsage === 1 || tx.vpn_proxy_usage === 1) score += 20;
    if (model.geoLocationFlags === 'high-risk' || tx.geo_location_flags === 'high-risk') score += 20;
    if (model.highRiskTransactionTimes === 1 || tx.high_risk_transaction_times === 1) score += 15;
    if (model.pastFraudulentBehavior === 1 || tx.past_fraudulent_behavior_flags === 1) score += 25;
    if ((model.fraudComplaintsCount || 0) > 0) score += (model.fraudComplaintsCount * 8);
    if ((model.socialTrustScore || 100) < 30) score += 10;
    if ((Number(tx.amount) || 0) > 5000) score += 10;
    
    return Math.min(100, score);
  };

  const computeRiskLevel = (score) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  // Fetch all transactions from Firestore and convert to risk events
  useEffect(() => {
    setLoading(true);
    
    const txRef = collection(db, 'transactions');
    const q = query(txRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const riskEvents = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const riskScore = computeRiskScore(data);
        const riskLevel = data.riskLevel || data.risk_level || computeRiskLevel(riskScore);
        
        let createdAt = null;
        if (data.createdAt?.toDate) createdAt = data.createdAt.toDate();
        else if (data.createdAt?.seconds) createdAt = new Date(data.createdAt.seconds * 1000);
        else if (data.timestamp?.toDate) createdAt = data.timestamp.toDate();
        else if (data.createdAt) createdAt = new Date(data.createdAt);
        
        return {
          id: docSnap.id,
          transactionId: docSnap.id,
          senderUPI: data.senderUPI || 'Unknown',
          recipientUPI: data.recipientUPI || 'Unknown',
          amount: Number(data.amount) || 0,
          riskScore,
          riskLevel,
          status: data.status || (riskScore >= 70 ? 'Blocked' : riskScore >= 40 ? 'Flagged' : 'Approved'),
          ipAddress: data.ipAddress || generateIP(data.senderUPI || docSnap.id),
          deviceId: data.deviceId || generateDeviceId(data),
          createdAt,
          geoLocation: data.modelData?.geoLocationFlags || data.geo_location_flags || 'normal',
          vpnUsage: data.modelData?.vpnProxyUsage || data.vpn_proxy_usage || 0,
          blacklisted: data.modelData?.recipientBlacklistStatus || data.recipient_blacklist_status || 0,
          verificationStatus: data.modelData?.recipientVerificationStatus || data.recipient_verification_status || 'verified',
          transactionType: data.transactionType || 'sent',
          recipientName: data.recipientName || data.recipientUPI || 'Unknown',
          senderName: data.senderName || data.senderUPI || 'Unknown',
          rawData: data
        };
      });
      
      setEvents(riskEvents);
      
      // Compute stats
      const s = { total: riskEvents.length, high: 0, medium: 0, low: 0, blocked: 0 };
      riskEvents.forEach(e => {
        if (e.riskLevel === 'high') s.high++;
        else if (e.riskLevel === 'medium') s.medium++;
        else s.low++;
        if (e.status?.toLowerCase() === 'blocked') s.blocked++;
      });
      setStats(s);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to transactions:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Filter + sort + paginate
  const filteredEvents = useMemo(() => {
    let result = [...events];
    
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.transactionId.toLowerCase().includes(q) ||
        e.senderUPI.toLowerCase().includes(q) ||
        e.recipientUPI.toLowerCase().includes(q) ||
        e.ipAddress.includes(q) ||
        e.deviceId.toLowerCase().includes(q)
      );
    }
    
    // Risk filter
    if (riskFilter !== 'all') {
      result = result.filter(e => e.riskLevel === riskFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Sort
    result.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'riskScore': valA = a.riskScore; valB = b.riskScore; break;
        case 'amount': valA = a.amount; valB = b.amount; break;
        case 'createdAt':
        default:
          valA = a.createdAt?.getTime() || 0;
          valB = b.createdAt?.getTime() || 0;
          break;
      }
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });
    
    return result;
  }, [events, searchQuery, riskFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ArrowDown className="h-3 w-3 inline ml-1" /> : <ArrowUp className="h-3 w-3 inline ml-1" />;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Mark event as reviewed
  const handleMarkReviewed = async (eventId) => {
    try {
      await updateDoc(doc(db, 'transactions', eventId), {
        status: 'Reviewed',
        reviewedAt: new Date()
      });
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  // Derive the selected event's sender profile for the detail drawer
  // User docs store modelData/transactionDetails with title-cased keys; transactions don't have modelData
  const selectedProfile = useMemo(() => {
    if (!selectedEvent) return { normalized: {} };
    const p = userProfileMap.get(selectedEvent.senderUPI);
    const pd = p?.details || {};
    const pm = p?.modelData || {};
    const raw = selectedEvent?.rawData || {};
    return {
      normalized: {
        recipientBlacklistStatus: pd["Recipient Blacklist Status"] ?? pm["Recipient Blacklist Status"] ?? raw.recipient_blacklist_status,
        vpnProxyUsage: pd["VPN or Proxy Usage"] ?? pm["VPN or Proxy Usage"] ?? raw.vpn_proxy_usage,
        geoLocationFlags: pd["Geo-Location Flags"] ?? pm["Geo-Location Flags"] ?? raw.geo_location_flags,
        highRiskTransactionTimes: pd["High-Risk Transaction Times"] ?? pm["High-Risk Transaction Times"] ?? raw.high_risk_transaction_times,
        pastFraudulentBehavior: pd["Past Fraudulent Behavior Flags"] ?? pm["Past Fraudulent Behavior Flags"] ?? raw.past_fraudulent_behavior_flags,
        fraudComplaintsCount: pd["Fraud Complaints Count"] ?? pm["Fraud Complaints Count"] ?? raw.fraud_complaints_count,
        socialTrustScore: pd["Social Trust Score"] ?? pm["Social Trust Score"] ?? raw.social_trust_score,
        deviceFingerprinting: pd["Device Fingerprinting"] ?? pm["Device Fingerprinting"] ?? raw.device_fingerprinting,
        behavioralBiometrics: pd["Behavioral Biometrics"] ?? pm["Behavioral Biometrics"] ?? raw.behavioral_biometrics,
        locationInconsistentTransactions: pd["Location-Inconsistent Transactions"] ?? pm["Location-Inconsistent Transactions"] ?? raw.location_inconsistent_transactions,
        userDailyLimitExceeded: pd["User Daily Limit Exceeded"] ?? pm["User Daily Limit Exceeded"] ?? raw.user_daily_limit_exceeded,
        merchantCategoryMismatch: pd["Merchant Category Mismatch"] ?? pm["Merchant Category Mismatch"] ?? raw.merchant_category_mismatch,
        transactionContextAnomalies: pd["Transaction Context Anomalies"] ?? pm["Transaction Context Anomalies"] ?? raw.transaction_context_anomalies,
        recentHighValueTransactionFlags: pd["Recent High-Value Transaction Flags"] ?? pm["Recent High-Value Transaction Flags"] ?? raw.recent_high_value_transaction_flags,
        accountAge: pd["Account Age"] ?? pm["Account Age"] ?? raw.account_age,
        transactionFrequency: pd["Transaction Frequency"] ?? pm["Transaction Frequency"] ?? raw.transaction_frequency,
        normalizedTransactionAmount: pd["Normalized Transaction Amount"] ?? pm["Normalized Transaction Amount"] ?? raw.normalized_transaction_amount,
        recipientVerificationStatus: pd["Recipient Verification Status"] ?? pm["Recipient Verification Status"] ?? raw.recipient_verification_status,
      }
    };
  }, [selectedEvent, userProfileMap]);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
              <Search className="h-5 w-5 text-white" />
            </div>
            Risk Events
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">
            Real-time transaction risk monitoring
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card className="bg-white/80 backdrop-blur border-slate-200/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Events</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-red-200/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">High Risk</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.high}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-amber-200/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Medium Risk</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.medium}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-emerald-200/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Low Risk</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.low}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-slate-200/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Blocked</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{stats.blocked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by Transaction ID, UPI ID, IP, or Device..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 bg-white border-slate-200 h-9 text-sm"
                />
              </div>
            </div>
            <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || riskFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(''); setRiskFilter('all'); setStatusFilter('all'); setCurrentPage(1); }}
                className="text-slate-500 hover:text-slate-700 h-9 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead
                    className="text-slate-500 text-xs cursor-pointer hover:text-slate-700 w-44"
                    onClick={() => toggleSort('createdAt')}
                  >
                    Date/Time <SortIcon field="createdAt" />
                  </TableHead>
                  <TableHead className="text-slate-500 text-xs">Transaction ID</TableHead>
                  <TableHead className="text-slate-500 text-xs">Device</TableHead>
                  <TableHead className="text-slate-500 text-xs">IP Address</TableHead>
                  <TableHead className="text-slate-500 text-xs">Sender</TableHead>
                  <TableHead className="text-slate-500 text-xs">Recipient</TableHead>
                  <TableHead
                    className="text-slate-500 text-xs cursor-pointer hover:text-slate-700 text-right"
                    onClick={() => toggleSort('amount')}
                  >
                    Amount <SortIcon field="amount" />
                  </TableHead>
                  <TableHead
                    className="text-slate-500 text-xs cursor-pointer hover:text-slate-700 text-center"
                    onClick={() => toggleSort('riskScore')}
                  >
                    Risk Score <SortIcon field="riskScore" />
                  </TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Risk Level</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Status</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedEvents.length > 0 ? (
                  paginatedEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(event.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {event.transactionId.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500 max-w-[180px] truncate">
                        {event.deviceId}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {event.ipAddress}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[120px] truncate">
                        {event.senderUPI}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[120px] truncate">
                        {event.recipientUPI}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 text-right">
                        ₹{event.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${
                          event.riskScore >= 70 ? 'text-red-600' :
                          event.riskScore >= 40 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {event.riskScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getRiskBadge(event.riskLevel)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(event.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600"
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-16">
                      <Shield className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No risk events found</p>
                      <p className="text-slate-300 text-sm mt-1">Try adjusting your filters</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredEvents.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="h-7 w-7 p-0 border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 p-0 text-xs ${currentPage === page ? 'bg-violet-500 hover:bg-violet-600 text-white' : 'border-slate-200'}`}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="h-7 w-7 p-0 border-slate-200"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedEvent(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Risk Event Details</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedEvent.transactionId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Risk Indicator */}
              <div className={`p-5 rounded-xl text-center ${
                selectedEvent.riskScore >= 70 ? 'bg-red-50 border border-red-200' :
                selectedEvent.riskScore >= 40 ? 'bg-amber-50 border border-amber-200' :
                'bg-emerald-50 border border-emerald-200'
              }`}>
                <div className={`text-4xl font-black ${
                  selectedEvent.riskScore >= 70 ? 'text-red-600' :
                  selectedEvent.riskScore >= 40 ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {selectedEvent.riskScore}
                </div>
                <div className="text-sm font-semibold mt-1 flex items-center justify-center gap-2">
                  {selectedEvent.riskScore >= 70 ? <ShieldAlert className="h-4 w-4 text-red-500" /> :
                   selectedEvent.riskScore >= 40 ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                   <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                  <span className="uppercase">{selectedEvent.riskLevel} Risk</span>
                </div>
                <div className="mt-2">{getStatusBadge(selectedEvent.status)}</div>
              </div>

              {/* Transaction Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Transaction Info</h3>
                <div className="space-y-2">
                  {[
                    ['Date & Time', formatDate(selectedEvent.createdAt)],
                    ['Amount', `₹${selectedEvent.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
                    ['Sender UPI', selectedEvent.senderUPI],
                    ['Recipient UPI', selectedEvent.recipientUPI],
                    ['Type', selectedEvent.transactionType],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-xs font-medium text-slate-800 text-right max-w-[200px] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device & Network */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Device & Network</h3>
                <div className="space-y-2">
                  {[
                    ['IP Address', selectedEvent.ipAddress],
                    ['Device ID', selectedEvent.deviceId],
                    ['Geo Location', selectedProfile.normalized.geoLocationFlags || selectedEvent.geoLocation || 'normal'],
                    ['VPN/Proxy', (selectedProfile.normalized.vpnProxyUsage ?? selectedEvent.vpnUsage) ? '⚠️ Detected' : '✅ Not detected'],
                    ['Verification', selectedProfile.normalized.recipientVerificationStatus || selectedEvent.verificationStatus || 'verified'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-xs font-medium text-slate-800 text-right max-w-[220px] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Risk Factors</h3>
                <div className="space-y-2">
                  {(() => {
                    const factors = [];
                    const raw = selectedEvent.rawData || {};
                    const model = selectedProfile.normalized;

                    if (model.recipientBlacklistStatus === 1 || selectedEvent.blacklisted === 1 || raw.recipient_blacklist_status === 1) {
                      factors.push({ text: 'Recipient is BLACKLISTED', bg: 'bg-red-50', border: 'border-red-100', textColor: 'text-red-700', icon: <ShieldAlert className="h-4 w-4 text-red-500" /> });
                    }
                    if (selectedEvent.vpnUsage === 1 || model.vpnProxyUsage === 1 || raw.vpn_proxy_usage === 1) {
                      factors.push({ text: 'VPN/Proxy usage detected', bg: 'bg-red-50', border: 'border-red-100', textColor: 'text-red-700', icon: <ShieldAlert className="h-4 w-4 text-red-500" /> });
                    }
                    if (model.geoLocationFlags === 'high-risk' || selectedEvent.geoLocation === 'high-risk' || raw.geo_location_flags === 'high-risk') {
                      factors.push({ text: 'High-risk geo-location flagged', bg: 'bg-red-50', border: 'border-red-100', textColor: 'text-red-700', icon: <ShieldAlert className="h-4 w-4 text-red-500" /> });
                    } else if (model.geoLocationFlags === 'unusual' || selectedEvent.geoLocation === 'unusual') {
                      factors.push({ text: 'Unusual geo-location activity detected', bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.highRiskTransactionTimes === 1 || raw.high_risk_transaction_times === 1) {
                      factors.push({ text: 'Transaction at high-risk time (late night)', bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.pastFraudulentBehavior === 1 || raw.past_fraudulent_behavior_flags === 1) {
                      factors.push({ text: 'Past fraudulent behavior on record', bg: 'bg-red-50', border: 'border-red-100', textColor: 'text-red-700', icon: <ShieldAlert className="h-4 w-4 text-red-500" /> });
                    }
                    const complaints = model.fraudComplaintsCount || raw.fraud_complaints_count || 0;
                    if (complaints > 0) {
                      factors.push({ text: `${complaints} fraud complaint(s) filed`, bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    const trust = model.socialTrustScore ?? raw.social_trust_score;
                    if (trust !== undefined && trust !== null && trust < 30) {
                      factors.push({ text: `Low social trust score: ${Number(trust).toFixed(1)}`, bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    const deviceFP = model.deviceFingerprinting ?? raw.device_fingerprinting;
                    if (deviceFP !== undefined && deviceFP !== null && deviceFP < 0.3) {
                      factors.push({ text: `Suspicious device fingerprint (${(Number(deviceFP) * 100).toFixed(0)}% match)`, bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    const bio = model.behavioralBiometrics ?? raw.behavioral_biometrics;
                    if (bio !== undefined && bio !== null && bio < 0.3) {
                      factors.push({ text: `Unusual behavioral biometrics (${(Number(bio) * 100).toFixed(0)}%)`, bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.locationInconsistentTransactions === 1 || raw.location_inconsistent_transactions === 1) {
                      factors.push({ text: 'Location inconsistent with user history', bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.userDailyLimitExceeded === 1 || raw.user_daily_limit_exceeded === 1) {
                      factors.push({ text: 'User daily transaction limit exceeded', bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.merchantCategoryMismatch === 1 || raw.merchant_category_mismatch === 1) {
                      factors.push({ text: 'Merchant category mismatch detected', bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.transactionContextAnomalies === 1 || raw.transaction_context_anomalies === 1) {
                      factors.push({ text: 'Transaction context anomalies detected', bg: 'bg-amber-50', border: 'border-amber-100', textColor: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> });
                    }
                    if (model.recentHighValueTransactionFlags === 1 || raw.recent_high_value_transaction_flags === 1) {
                      factors.push({ text: 'Recent high-value transaction pattern', bg: 'bg-blue-50', border: 'border-blue-100', textColor: 'text-blue-700', icon: <AlertTriangle className="h-4 w-4 text-blue-500" /> });
                    }
                    const accountAge = model.accountAge ?? raw.account_age;
                    if (accountAge !== undefined && accountAge !== null && accountAge < 30) {
                      factors.push({ text: `New account (${accountAge} days old)`, bg: 'bg-blue-50', border: 'border-blue-100', textColor: 'text-blue-700', icon: <AlertTriangle className="h-4 w-4 text-blue-500" /> });
                    }
                    if (selectedEvent.amount > 5000) {
                      factors.push({ text: `High-value transaction (₹${selectedEvent.amount.toLocaleString()})`, bg: 'bg-blue-50', border: 'border-blue-100', textColor: 'text-blue-700', icon: <AlertTriangle className="h-4 w-4 text-blue-500" /> });
                    }

                    if (factors.length === 0) {
                      factors.push({ text: 'No significant risk factors detected', bg: 'bg-emerald-50', border: 'border-emerald-100', textColor: 'text-emerald-700', icon: <ShieldCheck className="h-4 w-4 text-emerald-500" /> });
                    }

                    return factors.map((f, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 ${f.bg} rounded-lg border ${f.border}`}>
                        {f.icon}
                        <span className={`text-xs ${f.textColor} font-medium`}>{f.text}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Model Scores */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameters</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const raw = selectedEvent.rawData || {};
                    const model = selectedProfile.normalized;
                    const params = [
                      { label: 'Device Fingerprint', value: model.deviceFingerprinting ?? raw.device_fingerprinting, format: 'pct' },
                      { label: 'Behavioral Biometrics', value: model.behavioralBiometrics ?? raw.behavioral_biometrics, format: 'pct' },
                      { label: 'Social Trust Score', value: model.socialTrustScore ?? raw.social_trust_score, format: 'score' },
                      { label: 'Account Age', value: model.accountAge ?? raw.account_age, format: 'days' },
                      { label: 'Tx Frequency', value: model.transactionFrequency ?? raw.transaction_frequency, format: 'num' },
                      { label: 'Normalized Amount', value: model.normalizedTransactionAmount ?? raw.normalized_transaction_amount, format: 'pct' },
                      { label: 'VPN/Proxy', value: model.vpnProxyUsage ?? raw.vpn_proxy_usage, format: 'bool' },
                      { label: 'Blacklisted', value: model.recipientBlacklistStatus ?? raw.recipient_blacklist_status, format: 'bool' },
                      { label: 'Geo Flags', value: model.geoLocationFlags ?? raw.geo_location_flags, format: 'text' },
                      { label: 'Verification', value: model.recipientVerificationStatus ?? raw.recipient_verification_status, format: 'text' },
                      { label: 'Fraud Complaints', value: model.fraudComplaintsCount ?? raw.fraud_complaints_count, format: 'num' },
                      { label: 'Past Fraud', value: model.pastFraudulentBehavior ?? raw.past_fraudulent_behavior_flags, format: 'bool' },
                    ];
                    return params.filter(p => p.value !== undefined && p.value !== null).map((p, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 px-2 bg-slate-50 rounded border border-slate-100">
                        <span className="text-[10px] text-slate-500">{p.label}</span>
                        <span className={`text-[11px] font-semibold ${
                          p.format === 'bool' ? (Number(p.value) === 1 ? 'text-red-600' : 'text-emerald-600') :
                          p.format === 'pct' ? (Number(p.value) < 0.3 ? 'text-amber-600' : 'text-slate-700') :
                          p.format === 'score' ? (Number(p.value) < 30 ? 'text-red-600' : Number(p.value) < 50 ? 'text-amber-600' : 'text-emerald-600') :
                          'text-slate-700'
                        }`}>
                          {p.format === 'bool' ? (Number(p.value) === 1 ? '⚠ Yes' : '✓ No') :
                           p.format === 'pct' ? `${(Number(p.value) * 100).toFixed(0)}%` :
                           p.format === 'days' ? `${p.value} days` :
                           p.format === 'score' ? Number(p.value).toFixed(1) :
                           p.format === 'num' ? p.value :
                           String(p.value)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-slate-200 text-sm"
                  onClick={() => handleMarkReviewed(selectedEvent.id)}
                >
                  <Eye className="h-4 w-4" /> Mark Reviewed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
