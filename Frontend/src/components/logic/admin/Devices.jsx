import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  Cpu,
  Monitor,
  RefreshCw,
  Search,
  Shield,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";

export default function Devices() {
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  const generateDeviceId = (tx) => {
    const base = tx.senderUPI || tx.userId || tx.id || "unknown";
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = ((hash << 5) - hash) + base.charCodeAt(i);
      hash |= 0;
    }
    const lowFP = (tx.modelData?.deviceFingerprinting < 0.3) || (tx.device_fingerprinting < 0.3);
    const prefix = lowFP ? "NEW" : "DEV";
    return `${prefix}-${Math.abs(hash).toString(16).toUpperCase().slice(0, 8)}`;
  };

  const generateIP = (seed) => {
    if (!seed) return "192.168.1.1";
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return `${Math.abs(hash % 223) + 1}.${Math.abs((hash >> 8) % 255)}.${Math.abs((hash >> 16) % 255)}.${Math.abs((hash >> 24) % 255)}`;
  };

  useEffect(() => {
    let txLoaded = false, usersLoaded = false;
    const done = () => { if (txLoaded && usersLoaded) setLoading(false); };

    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsub1 = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      txLoaded = true;
      done();
    }, () => { txLoaded = true; done(); });

    const unsub2 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      usersLoaded = true;
      done();
    }, () => { usersLoaded = true; done(); });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Build lookups from email/upiId/uid → display name & profile data
  const userNameMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const displayName = u.name || u.displayName || u.email || "User";
      if (u.email) map.set(u.email, displayName);
      if (u.upiId) map.set(u.upiId, displayName);
      if (u.id) map.set(u.id, displayName);
    });
    return map;
  }, [users]);

  // Build lookup from upiId/email/uid → user profile (modelData + transactionDetails)
  const userProfileMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const profile = {
        modelData: u.modelData || {},
        details: u.transactionDetails || {},
      };
      if (u.upiId) map.set(u.upiId, profile);
      if (u.email) map.set(u.email, profile);
      if (u.id) map.set(u.id, profile);
    });
    return map;
  }, [users]);

  // Aggregate devices from transactions
  const devices = useMemo(() => {
    const map = new Map();

    transactions.forEach((tx) => {
      const deviceId = tx.deviceId || generateDeviceId(tx);
      const senderKey = tx.senderUPI || tx.userId || tx.senderEmail || tx.id;

      // Look up sender's user profile for fingerprint/VPN/geo data
      const profile = userProfileMap.get(senderKey);
      const pModel = profile?.modelData || {};
      const pDetails = profile?.details || {};

      // Device fingerprint from user profile (title-cased keys)
      const fp = pModel["Device Fingerprinting"]
        ?? pDetails["Device Fingerprinting"]
        ?? pModel.deviceFingerprinting
        ?? tx.device_fingerprinting;
      const fpValue = fp != null ? Number(fp) : null;

      if (!map.has(deviceId)) {
        map.set(deviceId, {
          deviceId,
          fingerprint: fpValue,
          ip: tx.ipAddress || generateIP(senderKey),
          users: new Set(),
          rawUserIds: new Set(),
          txCount: 0,
          totalAmount: 0,
          highRiskCount: 0,
          lastSeen: null,
          vpnDetected: false,
          geoFlags: new Set(),
        });
      }

      const dev = map.get(deviceId);
      // Update fingerprint if we got a real value and current is null
      if (dev.fingerprint == null && fpValue != null) dev.fingerprint = fpValue;

      if (senderKey) {
        dev.rawUserIds.add(senderKey);
        const resolvedName = userNameMap.get(senderKey) || senderKey;
        dev.users.add(resolvedName);
      }
      dev.txCount += 1;
      dev.totalAmount += Number(tx.amount) || 0;

      const risk = tx.riskLevel || tx.risk_level || "low";
      if (risk === "high") dev.highRiskCount += 1;

      // VPN from user profile (title-cased keys)
      const vpn = pModel["VPN or Proxy Usage"] ?? pDetails["VPN or Proxy Usage"] ?? pModel.vpnProxyUsage;
      if (vpn === 1 || vpn === true) dev.vpnDetected = true;

      // Geo flags from user profile (title-cased keys)
      const geo = pDetails["Geo-Location Flags"] ?? pModel["Geo-Location Flags"] ?? pModel.geoLocationFlags;
      if (geo && geo !== "normal") dev.geoFlags.add(geo);

      let date = null;
      if (tx.createdAt?.toDate) date = tx.createdAt.toDate();
      else if (tx.createdAt?.seconds) date = new Date(tx.createdAt.seconds * 1000);
      else if (tx.createdAt) date = new Date(tx.createdAt);
      if (date && (!dev.lastSeen || date > dev.lastSeen)) dev.lastSeen = date;
    });

    return Array.from(map.values())
      .map((d) => ({
        ...d,
        users: Array.from(d.users),
        geoFlags: Array.from(d.geoFlags),
        riskLevel:
          d.highRiskCount > 2 || d.vpnDetected
            ? "high"
            : d.highRiskCount > 0
            ? "medium"
            : "low",
      }))
      .sort((a, b) => b.txCount - a.txCount);
  }, [transactions, userNameMap, userProfileMap]);

  const filtered = useMemo(() => {
    let result = [...devices];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.deviceId.toLowerCase().includes(q) ||
          d.ip.includes(q) ||
          d.users.some((u) => u.toLowerCase().includes(q))
      );
    }
    if (riskFilter !== "all") {
      result = result.filter((d) => d.riskLevel === riskFilter);
    }
    return result;
  }, [devices, searchQuery, riskFilter]);

  const stats = useMemo(() => {
    const s = { total: devices.length, high: 0, vpn: 0, newDevices: 0 };
    devices.forEach((d) => {
      if (d.riskLevel === "high") s.high++;
      if (d.vpnDetected) s.vpn++;
      if (d.fingerprint != null && d.fingerprint < 0.3) s.newDevices++;
    });
    return s;
  }, [devices]);

  const RiskBadge = ({ level }) => {
    const cfg = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return (
      <Badge className={`${cfg[level] || cfg.low} hover:${cfg[level] || cfg.low} font-semibold text-xs px-2`}>
        {level?.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            Devices
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Device fingerprinting & risk analysis</p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 400); }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Devices", value: stats.total, color: "text-slate-800" },
          { label: "High Risk", value: stats.high, color: "text-red-600" },
          { label: "VPN Detected", value: stats.vpn, color: "text-amber-600" },
          { label: "New Devices", value: stats.newDevices, color: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label} className="bg-white/80 backdrop-blur border-slate-200/50">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
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
              <Input placeholder="Search by Device ID, IP, or User..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-slate-200 h-9 text-sm" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
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
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-xs">Device ID</TableHead>
                  <TableHead className="text-slate-500 text-xs">IP Address</TableHead>
                  <TableHead className="text-slate-500 text-xs">Users</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Transactions</TableHead>
                  <TableHead className="text-slate-500 text-xs text-right">Total Amount</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Risk</TableHead>
                  <TableHead className="text-slate-500 text-xs">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-slate-100">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.length > 0
                  ? filtered.map((d) => (
                      <TableRow key={d.deviceId} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-600 flex items-center gap-2">
                          <Monitor className="h-3.5 w-3.5 text-slate-400" />
                          {d.deviceId}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{d.ip}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            {d.users.slice(0, 2).map((u) => (
                              <span key={u} className="truncate max-w-[120px]">{u}</span>
                            ))}
                            {d.users.length > 2 && <span className="text-slate-400">+{d.users.length - 2} more</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm text-slate-700">{d.txCount}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-800">₹{d.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-center"><RiskBadge level={d.riskLevel} /></TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {d.lastSeen
                            ? d.lastSeen.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <Shield className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No devices found</p>
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
