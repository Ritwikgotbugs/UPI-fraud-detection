import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  Activity,
  BarChart3,
  Clock,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";
import { Button } from "@/components/ui/button";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let txDone = false, usDone = false;
    const finish = () => { if (txDone && usDone) setLoading(false); };

    const unsub = onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      txDone = true;
      finish();
    }, () => { txDone = true; finish(); });

    getDocs(collection(db, "users")).then((snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).finally(() => { usDone = true; finish(); });

    return unsub;
  }, []);

  const parseDate = (tx) => {
    if (tx.createdAt?.toDate) return tx.createdAt.toDate();
    if (tx.createdAt?.seconds) return new Date(tx.createdAt.seconds * 1000);
    if (tx.createdAt) return new Date(tx.createdAt);
    return null;
  };

  // 7-day trends
  const trendsData = useMemo(() => {
    const now = new Date();
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), transactions: 0, highRisk: 0, amount: 0 };
    }
    transactions.forEach((tx) => {
      const d = parseDate(tx);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (days[key]) {
        days[key].transactions += 1;
        days[key].amount += Number(tx.amount) || 0;
        if ((tx.riskLevel || tx.risk_level) === "high") days[key].highRisk += 1;
      }
    });
    return Object.values(days);
  }, [transactions]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0, totalRisk: 0, avgRisk: 0 }));
    transactions.forEach((tx) => {
      const d = parseDate(tx);
      if (!d) return;
      const h = d.getHours();
      hours[h].count += 1;
      hours[h].totalRisk += Number(tx.riskScore || tx.risk_score || 0);
    });
    hours.forEach((h) => { h.avgRisk = h.count ? Math.round(h.totalRisk / h.count) : 0; });
    return hours;
  }, [transactions]);

  // Risk distribution pie
  const riskDistribution = useMemo(() => {
    const dist = { High: 0, Medium: 0, Low: 0 };
    transactions.forEach((tx) => {
      const r = (tx.riskLevel || tx.risk_level || "low").toLowerCase();
      if (r === "high") dist.High++;
      else if (r === "medium") dist.Medium++;
      else dist.Low++;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Trust distribution
  const trustDistribution = useMemo(() => {
    const dist = { High: 0, Medium: 0, Low: 0, Suspicious: 0 };
    users.forEach((u) => {
      const details = u.transactionDetails || {};
      if (details.recipientBlacklistStatus || details.pastFraudulentBehavior) {
        dist.Suspicious++;
      } else {
        const trust = Number(details.socialTrustScore || 50);
        if (trust >= 75) dist.High++;
        else if (trust >= 40) dist.Medium++;
        else dist.Low++;
      }
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [users]);

  // Amount distribution by ranges
  const amountDistribution = useMemo(() => {
    const ranges = [
      { name: "₹0-100", min: 0, max: 100, count: 0 },
      { name: "₹100-500", min: 100, max: 500, count: 0 },
      { name: "₹500-1K", min: 500, max: 1000, count: 0 },
      { name: "₹1K-5K", min: 1000, max: 5000, count: 0 },
      { name: "₹5K-10K", min: 5000, max: 10000, count: 0 },
      { name: "₹10K+", min: 10000, max: Infinity, count: 0 },
    ];
    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      const r = ranges.find((r) => amt >= r.min && amt < r.max);
      if (r) r.count++;
    });
    return ranges.map(({ name, count }) => ({ name, count }));
  }, [transactions]);

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let todayTx = 0, todayAmount = 0, highRisk = 0, weekTx = 0;
    const startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - 6);

    transactions.forEach((tx) => {
      const d = parseDate(tx);
      if (!d) return;
      if (d >= startToday) { todayTx++; todayAmount += Number(tx.amount) || 0; }
      if (d >= startWeek) weekTx++;
      if ((tx.riskLevel || tx.risk_level) === "high") highRisk++;
    });

    return { todayTx, todayAmount, highRisk, weekTx, totalTx: transactions.length };
  }, [transactions]);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Analytics
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Transaction trends & risk analysis</p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Today", value: stats.todayTx, sub: `₹${(stats.todayAmount / 1000).toFixed(1)}K`, icon: Activity, color: "text-blue-600" },
          { label: "This Week", value: stats.weekTx, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Total", value: stats.totalTx, icon: BarChart3, color: "text-slate-800" },
          { label: "High Risk", value: stats.highRisk, icon: ShieldAlert, color: "text-red-600" },
          { label: "Users", value: users.length, icon: Users, color: "text-violet-600" },
        ].map((s) => (
          <Card key={s.label} className="bg-white/80 backdrop-blur border-slate-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                <s.icon className="h-3.5 w-3.5 text-slate-300" />
              </div>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-xs text-slate-400">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-slate-800"><TrendingUp className="h-4 w-4 text-blue-500" /> 7-Day Transaction Trends</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trendsData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="transactions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Transactions" />
                  <Area type="monotone" dataKey="highRisk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="High Risk" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-slate-800"><Clock className="h-4 w-4 text-amber-500" /> Hourly Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Bar dataKey="avgRisk" fill="#8b5cf6" name="Avg Risk %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader><CardTitle className="text-base text-slate-800">Risk Level Distribution</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {riskDistribution.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v) => <span className="text-slate-600 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader><CardTitle className="text-base text-slate-800">Trust Score Distribution</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={trustDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {trustDistribution.map((_, i) => <Cell key={i} fill={COLORS[i + 2]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v) => <span className="text-slate-600 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader><CardTitle className="text-base text-slate-800">Amount Distribution</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={amountDistribution}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#3b82f6" name="Transactions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
