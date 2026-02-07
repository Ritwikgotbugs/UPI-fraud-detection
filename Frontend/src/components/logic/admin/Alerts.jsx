import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Clock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";

const API_BASE = "https://rxcq.pythonanywhere.com";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let initialLoaded = false;

    // Try API first, fallback to Firestore
    const fetchFromAPI = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alerts`);
        if (res.ok) {
          const data = await res.json();
          const apiAlerts = data.alerts || [];
          if (apiAlerts.length > 0) {
            setAlerts(apiAlerts.map((a, i) => ({ id: a.id || `api-${i}`, ...a })));
          }
        }
      } catch {
        // API unavailable, Firestore listener will handle it
      }
    };

    fetchFromAPI();

    // Real-time Firestore listener
    const alertsQuery = query(
      collection(db, "alerts"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const liveAlerts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAlerts(liveAlerts);
        }
        if (!initialLoaded) {
          initialLoaded = true;
          setLoading(false);
        }
      },
      (error) => {
        console.error("Alerts listener error:", error);
        if (!initialLoaded) {
          initialLoaded = true;
          setLoading(false);
        }
      }
    );

    // Also generate alerts from high-risk transactions if alerts collection is empty
    const txQuery = query(
      collection(db, "transactions"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const txUnsub = onSnapshot(txQuery, (snap) => {
      setAlerts((prev) => {
        if (prev.length > 0) return prev; // Already have real alerts
        const generated = [];
        snap.docs.forEach((doc) => {
          const tx = doc.data();
          const risk = (tx.riskLevel || tx.risk_level || "").toLowerCase();
          const riskScore = Number(tx.riskScore || tx.risk_score || 0);
          if (risk === "high" || riskScore >= 70) {
            const reasons = [];
            if (tx.modelData?.recipientBlacklistStatus === 1) reasons.push("Blacklisted recipient");
            if (tx.modelData?.vpnProxyUsage === 1) reasons.push("VPN/Proxy detected");
            if (Number(tx.amount) > 10000) reasons.push("High-value transaction");
            if (tx.modelData?.pastFraudulentBehavior === 1) reasons.push("Past fraud behavior");
            if (riskScore >= 85) reasons.push("Critical risk score");

            generated.push({
              id: `gen-${doc.id}`,
              title: riskScore >= 85 ? "Critical Risk Transaction Detected" : "High Risk Transaction Alert",
              message: reasons.length > 0 ? reasons.join(" • ") : "Multiple risk factors triggered",
              severity: riskScore >= 85 ? "high" : "medium",
              type: riskScore >= 85 ? "BLOCK" : "FLAG",
              sender_upi: tx.senderUPI || tx.sender_upi || "Unknown",
              recipient_upi: tx.recipientUPI || tx.recipient_upi || "Unknown",
              transaction_amount: Number(tx.amount) || 0,
              risk_score: riskScore,
              details: reasons.join(", ") || "System analysis",
              createdAt: tx.createdAt,
              transactionId: doc.id,
              generated: true,
            });
          }
        });
        if (generated.length > 0) {
          setLoading(false);
          return generated.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        }
        return prev;
      });
    });

    return () => {
      unsubscribe();
      txUnsub();
    };
  }, []);

  // Stats
  const stats = useMemo(() => {
    const s = { total: alerts.length, high: 0, medium: 0, low: 0, blocked: 0 };
    alerts.forEach((a) => {
      const sev = (a.severity || "").toLowerCase();
      if (sev === "high") s.high++;
      else if (sev === "medium") s.medium++;
      else s.low++;
      if (a.type === "BLOCK") s.blocked++;
    });
    return s;
  }, [alerts]);

  // Filtered & searched alerts
  const filtered = useMemo(() => {
    let result = [...alerts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(q) ||
          (a.message || "").toLowerCase().includes(q) ||
          (a.sender_upi || "").toLowerCase().includes(q) ||
          (a.recipient_upi || "").toLowerCase().includes(q)
      );
    }
    if (severityFilter !== "all") {
      result = result.filter((a) => (a.severity || "").toLowerCase() === severityFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter);
    }
    return result;
  }, [alerts, searchQuery, severityFilter, typeFilter]);

  const formatTime = (ts) => {
    try {
      if (ts?.toDate) return ts.toDate().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      if (typeof ts === "string" || typeof ts === "number") return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { /* ignore */ }
    return "Recently";
  };

  const getSeverityStyle = (severity) => {
    switch ((severity || "").toLowerCase()) {
      case "high": return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700 border-red-200", icon: "bg-red-100 text-red-600", dot: "bg-red-500" };
      case "medium": return { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700 border-amber-200", icon: "bg-amber-100 text-amber-600", dot: "bg-amber-500" };
      default: return { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700 border-blue-200", icon: "bg-blue-100 text-blue-600", dot: "bg-blue-500" };
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl shadow-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            Alerts
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Security alerts, fraud notifications & system events</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 400); }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Alerts", value: stats.total, color: "text-slate-800", icon: <Bell className="h-4 w-4 text-slate-400" /> },
          { label: "Critical", value: stats.high, color: "text-red-600", icon: <ShieldAlert className="h-4 w-4 text-red-400" /> },
          { label: "Warnings", value: stats.medium, color: "text-amber-600", icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
          { label: "Info", value: stats.low, color: "text-blue-600", icon: <ShieldCheck className="h-4 w-4 text-blue-400" /> },
          { label: "Blocked", value: stats.blocked, color: "text-red-700", icon: <Shield className="h-4 w-4 text-red-500" /> },
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

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search alerts by title, message, or UPI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 h-9 text-sm"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="high">Critical</SelectItem>
                <SelectItem value="medium">Warning</SelectItem>
                <SelectItem value="low">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BLOCK">Blocked</SelectItem>
                <SelectItem value="FLAG">Flagged</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || severityFilter !== "all" || typeFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSeverityFilter("all"); setTypeFilter("all"); }} className="text-slate-500 h-9 px-2">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white/80 backdrop-blur border-slate-200/50">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex gap-8">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            return (
              <Card key={alert.id} className={`${style.bg} border ${style.border} shadow-sm hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-xl ${style.icon} flex-shrink-0`}>
                      {(alert.severity || "").toLowerCase() === "high"
                        ? <ShieldAlert className="h-5 w-5" />
                        : (alert.severity || "").toLowerCase() === "medium"
                          ? <AlertTriangle className="h-5 w-5" />
                          : <ShieldCheck className="h-5 w-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-800">
                          {alert.title || alert.summary || "Security Alert"}
                        </h3>
                        {alert.type === "BLOCK" && (
                          <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0">BLOCKED</Badge>
                        )}
                        {alert.type === "FLAG" && (
                          <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">FLAGGED</Badge>
                        )}
                        {alert.generated && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200">AUTO</Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{alert.message || "—"}</p>

                      {/* Transaction details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 mt-3">
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Sender</span>
                          <p className="text-xs font-mono text-slate-700 truncate">{alert.sender_upi || alert.transaction?.sender || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Recipient</span>
                          <p className="text-xs font-mono text-slate-700 truncate">{alert.recipient_upi || alert.transaction?.recipient || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Amount</span>
                          <p className="text-xs font-bold text-slate-800">
                            ₹{Number(alert.transaction_amount || alert.transaction?.amount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Triggered By</span>
                          <p className="text-xs text-slate-600 truncate">{alert.details || "System Analysis"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Risk score & time */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`${style.badge} font-bold text-xs px-2`}>
                        {alert.risk_score != null ? `${Number(alert.risk_score).toFixed(0)}%` : "—"} Risk
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatTime(alert.createdAt || alert.timestamp)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-white/80 backdrop-blur border-slate-200/50">
            <CardContent className="py-20 text-center">
              <BellOff className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No alerts found</p>
              <p className="text-slate-300 text-sm mt-1">
                {alerts.length > 0
                  ? "Try adjusting your filters"
                  : "Alerts will appear when high-risk transactions are detected"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
