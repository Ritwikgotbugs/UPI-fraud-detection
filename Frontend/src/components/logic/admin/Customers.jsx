import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Globe,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldBan,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";

// Helper: add a transaction to a user's entry in txMap
const addTxToEntry = (entry, tx, amt, risk, riskScore, date, counterparty) => {
  entry.count += 1;
  entry.total += amt;
  entry.amounts.push(amt);
  if (risk === "high") entry.highRisk += 1;
  else if (risk === "medium") entry.mediumRisk += 1;
  entry.riskScoreSum += riskScore;
  if (counterparty) entry.recipients.add(counterparty);
  if (tx.modelData?.["VPN or Proxy Usage"] === 1 || tx.modelData?.vpnProxyUsage === 1) entry.vpnCount += 1;
  const geo = tx.modelData?.["Geo-Location Flags"] || tx.modelData?.geoLocationFlags;
  if (geo && geo !== "normal") entry.geoFlags += 1;
  if (date) {
    if (!entry.lastTx || date > entry.lastTx) entry.lastTx = date;
    if (!entry.firstTx || date < entry.firstTx) entry.firstTx = date;
  }
  if (entry.recentTxs.length < 5) {
    entry.recentTxs.push({
      id: tx.id, amount: amt, risk, riskScore,
      recipient: counterparty || "—", date,
      status: tx.status || "completed",
    });
  }
};

export default function Customers() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("riskLevel");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    let usersLoaded = false, txLoaded = false;
    const done = () => { if (usersLoaded && txLoaded) setLoading(false); };

    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      usersLoaded = true;
      done();
    }, () => { usersLoaded = true; done(); });

    const unsub2 = onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      txLoaded = true;
      done();
    }, () => { txLoaded = true; done(); });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Enrich users with comprehensive transaction analytics
  const enrichedUsers = useMemo(() => {
    const txMap = new Map();
    const emptyEntry = () => ({
      count: 0, total: 0, highRisk: 0, mediumRisk: 0,
      riskScoreSum: 0, lastTx: null, firstTx: null,
      recipients: new Set(), vpnCount: 0, geoFlags: 0,
      amounts: [], recentTxs: [],
    });

    // Only process "sent" type transactions to avoid double-counting
    // (each payment creates both a "sent" and "received" doc with same senderUPI/recipientUPI)
    transactions.forEach((tx) => {
      const txType = (tx.transactionType || tx.type || "").toLowerCase();
      const sender = tx.senderUPI;
      const recipient = tx.recipientUPI;
      if (!sender && !recipient) return;

      const amt = Number(tx.amount) || 0;
      const risk = (tx.riskLevel || tx.risk_level || "low").toLowerCase();
      const riskScore = Number(tx.riskScore || tx.risk_score || 0);

      let date = null;
      if (tx.createdAt?.toDate) date = tx.createdAt.toDate();
      else if (tx.createdAt?.seconds) date = new Date(tx.createdAt.seconds * 1000);

      if (txType === "sent" || txType === "") {
        // Attribute to sender
        if (sender) {
          if (!txMap.has(sender)) txMap.set(sender, emptyEntry());
          addTxToEntry(txMap.get(sender), tx, amt, risk, riskScore, date, recipient);
        }
        // Also track received side for recipient
        if (recipient && recipient !== sender) {
          if (!txMap.has(recipient)) txMap.set(recipient, emptyEntry());
          const rEntry = txMap.get(recipient);
          // Just track date and count for "last seen" / activity, don't double volume
          if (date) {
            if (!rEntry.lastTx || date > rEntry.lastTx) rEntry.lastTx = date;
            if (!rEntry.firstTx || date < rEntry.firstTx) rEntry.firstTx = date;
          }
        }
      } else if (txType === "received") {
        // Skip "received" docs — they mirror "sent" docs to avoid double counting
        // But use them for recipient's last-activity timestamp
        if (recipient) {
          if (!txMap.has(recipient)) txMap.set(recipient, emptyEntry());
          const rEntry = txMap.get(recipient);
          if (date) {
            if (!rEntry.lastTx || date > rEntry.lastTx) rEntry.lastTx = date;
          }
        }
      }
    });

    return users.map((u) => {
      const upiId = u.upiId || u.email || u.id;
      const txData = txMap.get(upiId) || emptyEntry();

      // transactionDetails from Firebase uses title-cased keys like "Social Trust Score"
      const details = u.transactionDetails || {};
      const modelData = u.modelData || {};

      // Trust score — read from actual Firebase title-cased keys
      const rawTrust = details["Social Trust Score"]
        ?? modelData["Social Trust Score"]
        ?? details.socialTrustScore
        ?? details.social_trust_score;
      const trustScore = rawTrust != null
        ? Number(rawTrust)
        : txData.count > 0
          ? Math.max(10, Math.round(80 - txData.highRisk * 15 - (txData.riskScoreSum / Math.max(txData.count, 1)) * 0.5))
          : 50;

      // Blacklisted — title-cased key
      const blacklisted = details["Recipient Blacklist Status"] === 1
        || modelData["Recipient Blacklist Status"] === 1
        || details.recipientBlacklistStatus === 1;

      // Fraud complaints — title-cased key
      const complaints = Number(
        details["Fraud Complaints Count"]
        || modelData["Fraud Complaints Count"]
        || details.fraudComplaintsCount
        || 0
      );

      // VPN usage from user profile
      const profileVpn = details["VPN or Proxy Usage"] === 1 || modelData["VPN or Proxy Usage"] === 1;
      // Geo flags from user profile
      const profileGeo = details["Geo-Location Flags"];
      const hasGeoFlag = profileGeo && profileGeo !== "normal";
      // Past fraud
      const pastFraud = details["Past Fraudulent Behavior Flags"] === 1 || modelData["Past Fraudulent Behavior Flags"] === 1;
      // Account age from profile
      const profileAccountAge = Number(details["Account Age"] || modelData["Account Age"] || 0);

      const avgAmount = txData.count > 0 ? txData.total / txData.count : 0;
      const avgRiskScore = txData.count > 0 ? txData.riskScoreSum / txData.count : 0;
      const highRiskPct = txData.count > 0 ? (txData.highRisk / txData.count) * 100 : 0;
      const uniqueRecipients = txData.recipients.size;
      const maxAmount = txData.amounts.length > 0 ? Math.max(...txData.amounts) : 0;

      let riskLevel = "low";
      if (blacklisted || pastFraud || complaints > 3 || txData.highRisk > 3 || avgRiskScore > 70) riskLevel = "high";
      else if (complaints > 0 || txData.highRisk > 0 || trustScore < 30 || avgRiskScore > 40 || profileVpn) riskLevel = "medium";

      const flags = [];
      if (blacklisted) flags.push("blacklisted");
      if (profileVpn || txData.vpnCount > 0) flags.push("vpn");
      if (hasGeoFlag || txData.geoFlags > 0) flags.push("geo");
      if (complaints > 0) flags.push("complaints");
      if (pastFraud) flags.push("past-fraud");
      if (highRiskPct > 50) flags.push("high-risk-heavy");

      // Account creation from Firestore
      let createdAt = null;
      if (u.createdAt?.toDate) createdAt = u.createdAt.toDate();
      else if (u.createdAt?.seconds) createdAt = new Date(u.createdAt.seconds * 1000);
      else if (u.metadata?.creationTime) createdAt = new Date(u.metadata.creationTime);

      // Last seen: prefer actual transaction activity, then auth metadata
      let lastSeen = txData.lastTx;
      if (!lastSeen) {
        if (u.lastLoginAt?.toDate) lastSeen = u.lastLoginAt.toDate();
        else if (u.lastLoginAt?.seconds) lastSeen = new Date(u.lastLoginAt.seconds * 1000);
        else if (u.lastSignInTime) lastSeen = new Date(u.lastSignInTime);
        else if (u.metadata?.lastSignInTime) lastSeen = new Date(u.metadata.lastSignInTime);
        // Fallback: if no activity at all, use createdAt as last seen
        else lastSeen = createdAt;
      }

      return {
        ...u,
        upiId,
        txCount: txData.count,
        txTotal: txData.total,
        highRiskTx: txData.highRisk,
        mediumRiskTx: txData.mediumRisk,
        lastTransaction: txData.lastTx,
        firstTransaction: txData.firstTx,
        lastSeen,
        trustScore,
        blacklisted,
        complaints,
        riskLevel,
        avgAmount,
        avgRiskScore,
        highRiskPct,
        uniqueRecipients,
        maxAmount,
        vpnCount: (profileVpn ? 1 : 0) + txData.vpnCount,
        geoFlags: (hasGeoFlag ? 1 : 0) + txData.geoFlags,
        pastFraud,
        profileAccountAge,
        flags,
        recentTxs: txData.recentTxs,
        accountCreated: createdAt,
        role: u.role || "user",
        // Expose raw profile data for expanded detail
        profileDetails: details,
        profileModelData: modelData,
      };
    });
  }, [users, transactions]);

  // Split into user/admin lists
  const userList = useMemo(() => enrichedUsers.filter((u) => u.role !== "admin"), [enrichedUsers]);
  const adminList = useMemo(() => enrichedUsers.filter((u) => u.role === "admin"), [enrichedUsers]);
  const currentList = activeTab === "admins" ? adminList : userList;

  // Sorting
  const sortedList = useMemo(() => {
    const riskOrder = { high: 3, medium: 2, low: 1 };
    return [...currentList].sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "riskLevel": valA = riskOrder[a.riskLevel] || 0; valB = riskOrder[b.riskLevel] || 0; break;
        case "txCount": valA = a.txCount; valB = b.txCount; break;
        case "txTotal": valA = a.txTotal; valB = b.txTotal; break;
        case "avgRiskScore": valA = a.avgRiskScore; valB = b.avgRiskScore; break;
        case "trustScore": valA = a.trustScore; valB = b.trustScore; break;
        default: valA = a.txCount; valB = b.txCount;
      }
      return sortDir === "desc" ? valB - valA : valA - valB;
    });
  }, [currentList, sortBy, sortDir]);

  const filtered = useMemo(() => {
    let result = [...sortedList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.upiId || "").toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q)
      );
    }
    if (riskFilter !== "all") {
      result = result.filter((u) => u.riskLevel === riskFilter);
    }
    return result;
  }, [sortedList, searchQuery, riskFilter]);

  const userStats = useMemo(() => {
    const s = { total: userList.length, active: 0, flagged: 0, blacklisted: 0, vpnUsers: 0 };
    userList.forEach((u) => {
      if (u.txCount > 0) s.active++;
      if (u.riskLevel === "high") s.flagged++;
      if (u.blacklisted) s.blacklisted++;
      if (u.vpnCount > 0) s.vpnUsers++;
    });
    return s;
  }, [userList]);

  const adminStats = useMemo(() => {
    const s = { total: adminList.length, active: 0 };
    adminList.forEach((u) => { if (u.txCount > 0 || u.lastSeen) s.active++; });
    return s;
  }, [adminList]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 text-slate-300" />;
    return sortDir === "desc"
      ? <ChevronDown className="h-3 w-3 ml-1 text-blue-500" />
      : <ChevronUp className="h-3 w-3 ml-1 text-blue-500" />;
  };

  const RiskBadge = ({ level }) => {
    const cfg = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return <Badge className={`${cfg[level] || cfg.low} hover:${cfg[level] || cfg.low} font-semibold text-xs px-2`}>{level?.toUpperCase()}</Badge>;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    if (typeof d === "string") {
      const parsed = new Date(d);
      if (isNaN(parsed)) return d;
      d = parsed;
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            Customers
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">User accounts, risk profiles & admin management</p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 400); }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100/80 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setActiveTab("users"); setSearchQuery(""); setRiskFilter("all"); setExpandedRow(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "users"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          }`}
        >
          <Users className="h-4 w-4" />
          Users
          <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-slate-200">{userList.length}</Badge>
        </button>
        <button
          onClick={() => { setActiveTab("admins"); setSearchQuery(""); setRiskFilter("all"); setExpandedRow(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "admins"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          }`}
        >
          <UserCog className="h-4 w-4" />
          Admins
          <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-violet-200 text-violet-600">{adminList.length}</Badge>
        </button>
      </div>

      {/* Stats - Different per tab */}
      {activeTab === "users" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Users", value: userStats.total, color: "text-slate-800", icon: <Users className="h-4 w-4 text-slate-400" /> },
            { label: "Active Users", value: userStats.active, color: "text-blue-600", icon: <Wallet className="h-4 w-4 text-blue-400" /> },
            { label: "High Risk", value: userStats.flagged, color: "text-red-600", icon: <ShieldAlert className="h-4 w-4 text-red-400" /> },
            { label: "Blacklisted", value: userStats.blacklisted, color: "text-red-700", icon: <ShieldBan className="h-4 w-4 text-red-500" /> },
            { label: "VPN Detected", value: userStats.vpnUsers, color: "text-amber-600", icon: <Globe className="h-4 w-4 text-amber-400" /> },
          ].map((s) => (
            <Card key={s.label} className="bg-white/80 backdrop-blur border-slate-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                  {s.icon}
                </div>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Admins", value: adminStats.total, color: "text-violet-700", icon: <UserCog className="h-4 w-4 text-violet-400" /> },
            { label: "Active Admins", value: adminStats.active, color: "text-blue-600", icon: <Wallet className="h-4 w-4 text-blue-400" /> },
            { label: "All Users", value: enrichedUsers.length, color: "text-slate-600", icon: <Users className="h-4 w-4 text-slate-400" /> },
          ].map((s) => (
            <Card key={s.label} className="bg-white/80 backdrop-blur border-slate-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                  {s.icon}
                </div>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={activeTab === "admins" ? "Search admins by name or email..." : "Search by name, email, or UPI ID..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 h-9 text-sm"
              />
            </div>
            {activeTab === "users" && (
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            )}
            {(searchQuery || riskFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setRiskFilter("all"); }} className="text-slate-500 h-9 px-2">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {activeTab === "users" ? (
              /* ───────── USERS TABLE ───────── */
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-500 text-xs">User</TableHead>
                    <TableHead className="text-slate-500 text-xs cursor-pointer select-none" onClick={() => toggleSort("txCount")}>
                      <span className="flex items-center">Txns<SortIcon col="txCount" /></span>
                    </TableHead>
                    <TableHead className="text-slate-500 text-xs cursor-pointer select-none text-right" onClick={() => toggleSort("txTotal")}>
                      <span className="flex items-center justify-end">Volume<SortIcon col="txTotal" /></span>
                    </TableHead>
                    <TableHead className="text-slate-500 text-xs text-right">Avg Txn</TableHead>
                    <TableHead className="text-slate-500 text-xs cursor-pointer select-none text-center" onClick={() => toggleSort("avgRiskScore")}>
                      <span className="flex items-center justify-center">Avg Risk<SortIcon col="avgRiskScore" /></span>
                    </TableHead>
                    <TableHead className="text-slate-500 text-xs cursor-pointer select-none text-center" onClick={() => toggleSort("trustScore")}>
                      <span className="flex items-center justify-center">Trust<SortIcon col="trustScore" /></span>
                    </TableHead>
                    <TableHead className="text-slate-500 text-xs text-center">Flags</TableHead>
                    <TableHead className="text-slate-500 text-xs cursor-pointer select-none text-center" onClick={() => toggleSort("riskLevel")}>
                      <span className="flex items-center justify-center">Risk<SortIcon col="riskLevel" /></span>
                    </TableHead>
                    <TableHead className="text-slate-500 text-xs">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i} className="border-slate-100">
                          {Array.from({ length: 9 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : filtered.length > 0
                    ? filtered.map((u) => (
                        <UserRow key={u.id} u={u} expandedRow={expandedRow} setExpandedRow={setExpandedRow} RiskBadge={RiskBadge} formatDate={formatDate} />
                      ))
                    : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16">
                          <Shield className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-medium">No users found</p>
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            ) : (
              /* ───────── ADMINS TABLE ───────── */
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-500 text-xs">Admin</TableHead>
                    <TableHead className="text-slate-500 text-xs">Email</TableHead>
                    <TableHead className="text-slate-500 text-xs text-center">Transactions</TableHead>
                    <TableHead className="text-slate-500 text-xs text-right">Total Volume</TableHead>
                    <TableHead className="text-slate-500 text-xs text-center">Trust Score</TableHead>
                    <TableHead className="text-slate-500 text-xs">Account Created</TableHead>
                    <TableHead className="text-slate-500 text-xs">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i} className="border-slate-100">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : filtered.length > 0
                    ? filtered.map((u) => (
                        <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.photoURL
                                  ? <img src={u.photoURL} alt="" className="w-full h-full rounded-lg object-cover" />
                                  : (u.name || u.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{u.name || u.displayName || "—"}</p>
                                  <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-200 text-[8px] px-1 py-0">ADMIN</Badge>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono">{u.upiId || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">{u.email || "—"}</TableCell>
                          <TableCell className="text-center font-semibold text-sm text-slate-700">{u.txCount}</TableCell>
                          <TableCell className="text-right text-xs font-semibold text-slate-800">
                            {u.txTotal > 0 ? `₹${u.txTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-bold ${u.trustScore >= 70 ? "text-emerald-600" : u.trustScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                              {Math.round(u.trustScore)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(u.accountCreated)}</TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(u.lastSeen)}</TableCell>
                        </TableRow>
                      ))
                    : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <UserCog className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-medium">No admin accounts found</p>
                          <p className="text-slate-300 text-sm mt-1">Admin accounts are created via email/password sign-in</p>
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

/* ─── User Row with Expandable Details ─── */
function UserRow({ u, expandedRow, setExpandedRow, RiskBadge, formatDate }) {
  const isExpanded = expandedRow === u.id;
  return (
    <>
      <TableRow
        className={`border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50/80" : ""}`}
        onClick={() => setExpandedRow(isExpanded ? null : u.id)}
      >
        {/* User */}
        <TableCell>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
              u.riskLevel === "high" ? "bg-gradient-to-br from-red-400 to-red-600" :
              u.riskLevel === "medium" ? "bg-gradient-to-br from-amber-400 to-orange-500" :
              "bg-gradient-to-br from-violet-400 to-indigo-500"
            }`}>
              {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full rounded-lg object-cover" /> : (u.name || u.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{u.name || u.displayName || "—"}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{u.email || u.upiId || "—"}</p>
            </div>
          </div>
        </TableCell>
        {/* Transactions */}
        <TableCell className="text-center">
          <div className="flex flex-col items-center">
            <span className="font-semibold text-sm text-slate-700">{u.txCount}</span>
            {u.highRiskTx > 0 && <span className="text-[9px] text-red-500 font-medium">{u.highRiskTx} high</span>}
          </div>
        </TableCell>
        {/* Volume */}
        <TableCell className="text-right text-xs font-semibold text-slate-800">
          ₹{u.txTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </TableCell>
        {/* Avg Amount */}
        <TableCell className="text-right text-xs text-slate-600">
          {u.txCount > 0 ? `₹${u.avgAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
        </TableCell>
        {/* Avg Risk Score */}
        <TableCell className="text-center">
          {u.txCount > 0 ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-sm font-bold ${u.avgRiskScore >= 70 ? "text-red-600" : u.avgRiskScore >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
                {u.avgRiskScore.toFixed(0)}
              </span>
              <div className="w-10 bg-slate-100 rounded-full h-1">
                <div className={`h-1 rounded-full ${u.avgRiskScore >= 70 ? "bg-red-500" : u.avgRiskScore >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(u.avgRiskScore, 100)}%` }} />
              </div>
            </div>
          ) : <span className="text-slate-300 text-xs">—</span>}
        </TableCell>
        {/* Trust Score */}
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-sm font-bold ${u.trustScore >= 70 ? "text-emerald-600" : u.trustScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
              {Math.round(u.trustScore)}
            </span>
            <div className="w-10 bg-slate-100 rounded-full h-1">
              <div className={`h-1 rounded-full ${u.trustScore >= 70 ? "bg-emerald-500" : u.trustScore >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(u.trustScore, 100)}%` }} />
            </div>
          </div>
        </TableCell>
        {/* Flags */}
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {u.blacklisted && (
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[8px] px-1.5 py-0">
                <ShieldBan className="h-2.5 w-2.5 mr-0.5" />BAN
              </Badge>
            )}
            {u.vpnCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] px-1.5 py-0">
                <Globe className="h-2.5 w-2.5 mr-0.5" />VPN
              </Badge>
            )}
            {u.complaints > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[8px] px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{u.complaints}
              </Badge>
            )}
            {u.flags.length === 0 && <span className="text-slate-300 text-xs">—</span>}
          </div>
        </TableCell>
        {/* Risk */}
        <TableCell className="text-center"><RiskBadge level={u.riskLevel} /></TableCell>
        {/* Last Seen */}
        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(u.lastSeen)}</TableCell>
      </TableRow>
      {/* Expandable Detail Row */}
      {isExpanded && (
        <TableRow className="bg-slate-50/60 border-slate-100">
          <TableCell colSpan={9} className="p-0">
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <DetailCard label="UPI ID" value={u.upiId} mono />
                <DetailCard label="Email" value={u.email || "—"} icon={<Mail className="h-3 w-3" />} />
                <DetailCard label="Trust Score" value={`${Math.round(u.trustScore)} / 100`} danger={u.trustScore < 30} />
                <DetailCard label="Account Age" value={u.profileAccountAge ? `${Math.round(u.profileAccountAge)} days` : "—"} />
                <DetailCard label="Unique Recipients" value={u.uniqueRecipients} />
                <DetailCard label="Max Transaction" value={u.maxAmount > 0 ? `₹${u.maxAmount.toLocaleString("en-IN")}` : "—"} />
                <DetailCard label="High Risk %" value={u.txCount > 0 ? `${u.highRiskPct.toFixed(1)}%` : "—"} danger={u.highRiskPct > 50} />
                <DetailCard label="VPN Flagged" value={u.vpnCount > 0 ? `Yes (${u.vpnCount})` : "No"} danger={u.vpnCount > 0} />
                <DetailCard label="Geo Flags" value={u.geoFlags > 0 ? `Yes (${u.geoFlags})` : "No"} danger={u.geoFlags > 0} />
                <DetailCard label="Fraud Complaints" value={u.complaints} danger={u.complaints > 0} />
                <DetailCard label="Blacklisted" value={u.blacklisted ? "Yes" : "No"} danger={u.blacklisted} />
                <DetailCard label="Past Fraud" value={u.pastFraud ? "Yes" : "No"} danger={u.pastFraud} />
                <DetailCard label="Account Created" value={formatDate(u.accountCreated)} />
                <DetailCard label="First Transaction" value={formatDate(u.firstTransaction)} />
                <DetailCard label="Last Transaction" value={formatDate(u.lastTransaction)} />
                <DetailCard label="Last Seen" value={formatDate(u.lastSeen)} />
              </div>
              {u.recentTxs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Recent Transactions</p>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100/80">
                          <th className="text-left px-3 py-1.5 text-slate-500 font-medium">ID</th>
                          <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Recipient</th>
                          <th className="text-right px-3 py-1.5 text-slate-500 font-medium">Amount</th>
                          <th className="text-center px-3 py-1.5 text-slate-500 font-medium">Risk Score</th>
                          <th className="text-center px-3 py-1.5 text-slate-500 font-medium">Risk</th>
                          <th className="text-center px-3 py-1.5 text-slate-500 font-medium">Status</th>
                          <th className="text-right px-3 py-1.5 text-slate-500 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {u.recentTxs.map((tx) => (
                          <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-mono text-slate-500">{tx.id.slice(0, 8)}…</td>
                            <td className="px-3 py-1.5 text-slate-600">{tx.recipient}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-slate-800">₹{tx.amount.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`font-bold ${tx.riskScore >= 70 ? "text-red-600" : tx.riskScore >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
                                {tx.riskScore.toFixed(0)}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center"><RiskBadge level={tx.risk} /></td>
                            <td className="px-3 py-1.5 text-center">
                              <Badge variant="outline" className={`text-[9px] ${
                                tx.status === "blocked" ? "bg-red-50 text-red-500 border-red-200" :
                                tx.status === "flagged" ? "bg-amber-50 text-amber-500 border-amber-200" :
                                "bg-emerald-50 text-emerald-600 border-emerald-200"
                              }`}>{tx.status}</Badge>
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-500">
                              {tx.date ? tx.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/* Small detail card for expanded row */
function DetailCard({ label, value, mono, icon, danger }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200/80 px-3 py-2">
      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
        {icon}{label}
      </p>
      <p className={`text-sm font-semibold mt-0.5 truncate ${mono ? "font-mono text-xs" : ""} ${danger ? "text-red-600" : "text-slate-700"}`}>
        {value}
      </p>
    </div>
  );
}
