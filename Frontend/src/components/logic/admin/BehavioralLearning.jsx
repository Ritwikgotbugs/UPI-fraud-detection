import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  Brain,
  Clock,
  Fingerprint,
  MapPin,
  RefreshCw,
  Shield,
  Smartphone,
  TrendingUp,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";
import { Button } from "@/components/ui/button";

export default function BehavioralLearning() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    getDocs(query(collection(db, "transactions"), orderBy("createdAt", "desc")))
      .then((snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const parseDate = (tx) => {
    if (tx.createdAt?.toDate) return tx.createdAt.toDate();
    if (tx.createdAt?.seconds) return new Date(tx.createdAt.seconds * 1000);
    if (tx.createdAt) return new Date(tx.createdAt);
    return null;
  };

  // Analyze behavioral patterns
  const patterns = useMemo(() => {
    const userMap = new Map();

    transactions.forEach((tx) => {
      const user = tx.senderUPI || "unknown";
      if (!userMap.has(user)) {
        userMap.set(user, {
          user,
          txCount: 0,
          amounts: [],
          hours: [],
          geoFlags: new Set(),
          devices: new Set(),
          vpnCount: 0,
          biometricScores: [],
        });
      }
      const u = userMap.get(user);
      u.txCount++;
      u.amounts.push(Number(tx.amount) || 0);

      const d = parseDate(tx);
      if (d) u.hours.push(d.getHours());

      const geo = tx.modelData?.geoLocationFlags || tx.geo_location_flags;
      if (geo) u.geoFlags.add(geo);

      const fp = tx.modelData?.deviceFingerprinting ?? tx.device_fingerprinting;
      if (fp !== undefined) u.devices.add(fp < 0.3 ? "new" : "known");

      if (tx.modelData?.vpnProxyUsage === 1 || tx.vpn_proxy_usage === 1) u.vpnCount++;

      const bio = tx.modelData?.behavioralBiometrics ?? tx.behavioral_biometrics;
      if (bio !== undefined) u.biometricScores.push(bio);
    });

    return Array.from(userMap.values())
      .filter((u) => u.txCount >= 2)
      .map((u) => {
        const avgAmount = u.amounts.reduce((s, v) => s + v, 0) / u.amounts.length;
        const maxAmount = Math.max(...u.amounts);
        const amountStdDev = Math.sqrt(u.amounts.reduce((s, v) => s + (v - avgAmount) ** 2, 0) / u.amounts.length);
        const avgHour = u.hours.reduce((s, v) => s + v, 0) / u.hours.length;
        const lateNightPct = u.hours.filter((h) => h >= 0 && h <= 4).length / u.hours.length;
        const avgBio = u.biometricScores.length ? u.biometricScores.reduce((s, v) => s + v, 0) / u.biometricScores.length : 0.5;
        const hasNewDevices = u.devices.has("new");
        const hasHighRiskGeo = u.geoFlags.has("high-risk");

        // Calculate anomaly score
        let anomalyScore = 0;
        if (amountStdDev > avgAmount * 0.8) anomalyScore += 20;
        if (lateNightPct > 0.3) anomalyScore += 20;
        if (u.vpnCount > 0) anomalyScore += 15;
        if (hasNewDevices) anomalyScore += 10;
        if (hasHighRiskGeo) anomalyScore += 20;
        if (avgBio < 0.3) anomalyScore += 15;

        return {
          user: u.user,
          txCount: u.txCount,
          avgAmount,
          maxAmount,
          amountVariance: amountStdDev,
          avgHour: avgHour.toFixed(1),
          lateNightPct: (lateNightPct * 100).toFixed(0),
          vpnUsage: u.vpnCount,
          hasNewDevices,
          hasHighRiskGeo,
          avgBiometrics: avgBio.toFixed(2),
          anomalyScore: Math.min(100, anomalyScore),
          riskLevel: anomalyScore >= 50 ? "high" : anomalyScore >= 25 ? "medium" : "low",
        };
      })
      .sort((a, b) => b.anomalyScore - a.anomalyScore);
  }, [transactions]);

  // Global insights
  const insights = useMemo(() => {
    const total = transactions.length;
    if (!total) return [];

    const items = [];
    const lateNight = transactions.filter((tx) => {
      const d = parseDate(tx);
      return d && d.getHours() >= 0 && d.getHours() <= 4;
    });
    if (lateNight.length > 0) {
      items.push({
        icon: Clock,
        title: "Late Night Activity",
        desc: `${lateNight.length} transactions (${((lateNight.length / total) * 100).toFixed(1)}%) between 12AM-4AM`,
        severity: lateNight.length > total * 0.1 ? "high" : "medium",
      });
    }

    const vpnTx = transactions.filter((tx) => tx.modelData?.vpnProxyUsage === 1 || tx.vpn_proxy_usage === 1);
    if (vpnTx.length > 0) {
      items.push({
        icon: Shield,
        title: "VPN/Proxy Usage",
        desc: `${vpnTx.length} transactions with VPN detected`,
        severity: "high",
      });
    }

    const newDeviceTx = transactions.filter((tx) => {
      const fp = tx.modelData?.deviceFingerprinting ?? tx.device_fingerprinting;
      return fp !== undefined && fp < 0.3;
    });
    if (newDeviceTx.length > 0) {
      items.push({
        icon: Smartphone,
        title: "New Device Transactions",
        desc: `${newDeviceTx.length} transactions from unrecognized devices`,
        severity: newDeviceTx.length > total * 0.15 ? "high" : "medium",
      });
    }

    const highGeo = transactions.filter((tx) => (tx.modelData?.geoLocationFlags || tx.geo_location_flags) === "high-risk");
    if (highGeo.length > 0) {
      items.push({
        icon: MapPin,
        title: "High-Risk Locations",
        desc: `${highGeo.length} transactions from flagged geographic regions`,
        severity: "high",
      });
    }

    const amounts = transactions.map((tx) => Number(tx.amount) || 0);
    const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const outliers = amounts.filter((a) => a > avg * 3);
    if (outliers.length > 0) {
      items.push({
        icon: TrendingUp,
        title: "Amount Outliers",
        desc: `${outliers.length} transactions exceeding 3x average (₹${avg.toFixed(0)})`,
        severity: "medium",
      });
    }

    return items;
  }, [transactions]);

  const RiskBadge = ({ level }) => {
    const cfg = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return <Badge className={`${cfg[level] || cfg.low} hover:${cfg[level] || cfg.low} font-semibold text-xs px-2`}>{level?.toUpperCase()}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl shadow-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            Behavioral Learning
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">User behavior patterns & anomaly detection</p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Global Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-white/80 border-slate-200/50">
                <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
              </Card>
            ))
          : insights.map((insight, idx) => (
              <Card key={idx} className={`border ${insight.severity === "high" ? "bg-red-50/50 border-red-200" : "bg-amber-50/50 border-amber-200"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${insight.severity === "high" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                      <insight.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{insight.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        {!loading && insights.length === 0 && (
          <Card className="col-span-full bg-emerald-50/50 border-emerald-200">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-emerald-700 font-medium">No behavioral anomalies detected</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Behavioral Profiles */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <Fingerprint className="h-4 w-4 text-violet-500" /> User Behavioral Profiles ({patterns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-xs">User</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Txns</TableHead>
                  <TableHead className="text-slate-500 text-xs text-right">Avg Amount</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Variance</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Avg Hour</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Late Night %</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">VPN</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Biometrics</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Anomaly Score</TableHead>
                  <TableHead className="text-slate-500 text-xs text-center">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-slate-100">
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : patterns.length > 0
                  ? patterns.slice(0, 30).map((p) => (
                      <TableRow key={p.user} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs font-mono text-slate-600 max-w-[140px] truncate">{p.user}</TableCell>
                        <TableCell className="text-center text-sm font-semibold text-slate-700">{p.txCount}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-800">₹{p.avgAmount.toFixed(0)}</TableCell>
                        <TableCell className="text-center text-xs text-slate-500">₹{p.amountVariance.toFixed(0)}</TableCell>
                        <TableCell className="text-center text-xs text-slate-600">{p.avgHour}h</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-semibold ${Number(p.lateNightPct) > 30 ? "text-red-600" : "text-slate-500"}`}>
                            {p.lateNightPct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.vpnUsage > 0 ? (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[9px]">{p.vpnUsage}</Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-semibold ${Number(p.avgBiometrics) < 0.3 ? "text-amber-600" : "text-slate-500"}`}>
                            {p.avgBiometrics}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold ${p.anomalyScore >= 50 ? "text-red-600" : p.anomalyScore >= 25 ? "text-amber-600" : "text-emerald-600"}`}>
                            {p.anomalyScore}
                          </span>
                        </TableCell>
                        <TableCell className="text-center"><RiskBadge level={p.riskLevel} /></TableCell>
                      </TableRow>
                    ))
                  : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16">
                        <Brain className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">Not enough data for behavioral analysis</p>
                        <p className="text-slate-300 text-sm mt-1">Requires users with 2+ transactions</p>
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
