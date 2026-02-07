import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  BookOpen,
  Download,
  FileText,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, "transactions"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "alerts"), orderBy("createdAt", "desc"))),
    ])
      .then(([txSnap, alertSnap]) => {
        setTransactions(txSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setAlerts(alertSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const parseDate = (tx) => {
    if (tx.createdAt?.toDate) return tx.createdAt.toDate();
    if (tx.createdAt?.seconds) return new Date(tx.createdAt.seconds * 1000);
    if (tx.createdAt) return new Date(tx.createdAt);
    return null;
  };

  // Generate summary report
  const summary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    let todayTx = 0, weekTx = 0, monthTx = 0;
    let todayAmt = 0, weekAmt = 0, monthAmt = 0;
    let highRisk = 0, medRisk = 0, blocked = 0;

    transactions.forEach((tx) => {
      const d = parseDate(tx);
      const amt = Number(tx.amount) || 0;
      const risk = (tx.riskLevel || tx.risk_level || "low").toLowerCase();

      if (risk === "high") highRisk++;
      if (risk === "medium") medRisk++;
      if (tx.status?.toLowerCase() === "blocked") blocked++;

      if (d) {
        if (d >= today) { todayTx++; todayAmt += amt; }
        if (d >= weekAgo) { weekTx++; weekAmt += amt; }
        if (d >= monthAgo) { monthTx++; monthAmt += amt; }
      }
    });

    return { todayTx, weekTx, monthTx, todayAmt, weekAmt, monthAmt, highRisk, medRisk, blocked, totalTx: transactions.length, totalAlerts: alerts.length };
  }, [transactions, alerts]);

  // Top risky senders
  const topRisky = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const user = tx.senderUPI || "unknown";
      if (!map.has(user)) map.set(user, { user, count: 0, amount: 0, highRisk: 0 });
      const e = map.get(user);
      e.count++;
      e.amount += Number(tx.amount) || 0;
      if ((tx.riskLevel || tx.risk_level) === "high") e.highRisk++;
    });
    return Array.from(map.values()).sort((a, b) => b.highRisk - a.highRisk).slice(0, 10);
  }, [transactions]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Transaction ID", "Date", "Sender", "Recipient", "Amount", "Risk Level", "Status"];
    const rows = transactions.map((tx) => {
      const d = parseDate(tx);
      return [
        tx.id,
        d ? d.toISOString() : "",
        tx.senderUPI || "",
        tx.recipientUPI || "",
        tx.amount || 0,
        tx.riskLevel || tx.risk_level || "low",
        tx.status || "pending",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fraud-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) => `₹${(n / 1000).toFixed(1)}K`;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            Reports
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Summary reports & data export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleExportCSV} disabled={loading}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today", txs: summary.todayTx, amt: summary.todayAmt },
          { label: "This Week", txs: summary.weekTx, amt: summary.weekAmt },
          { label: "This Month", txs: summary.monthTx, amt: summary.monthAmt },
          { label: "All Time", txs: summary.totalTx, amt: summary.todayAmt + summary.weekAmt + summary.monthAmt },
        ].map((s) => (
          <Card key={s.label} className="bg-white/80 backdrop-blur border-slate-200/50">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{s.txs}</p>
              <p className="text-xs text-slate-500">{fmt(s.amt)} volume</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Summary & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <ShieldAlert className="h-4 w-4 text-red-500" /> Risk Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "High Risk Transactions", value: summary.highRisk, color: "text-red-600", bg: "bg-red-50 border-red-100" },
                  { label: "Medium Risk Transactions", value: summary.medRisk, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
                  { label: "Blocked Transactions", value: summary.blocked, color: "text-red-700", bg: "bg-red-50 border-red-100" },
                  { label: "Total Security Alerts", value: summary.totalAlerts, color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg border ${item.bg}`}>
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <FileText className="h-4 w-4 text-blue-500" /> Top Risky Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs text-slate-500">User</TableHead>
                      <TableHead className="text-xs text-slate-500 text-center">Txns</TableHead>
                      <TableHead className="text-xs text-slate-500 text-center">High Risk</TableHead>
                      <TableHead className="text-xs text-slate-500 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRisky.slice(0, 8).map((u) => (
                      <TableRow key={u.user} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="text-xs font-mono text-slate-600 max-w-[120px] truncate">{u.user}</TableCell>
                        <TableCell className="text-center text-xs text-slate-700">{u.count}</TableCell>
                        <TableCell className="text-center">
                          {u.highRisk > 0 ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">{u.highRisk}</Badge>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-800">₹{u.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
