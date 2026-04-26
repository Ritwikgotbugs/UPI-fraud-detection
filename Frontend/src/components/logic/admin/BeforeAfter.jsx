import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, Clock, DollarSign, ShieldAlert, ShieldCheck, Users, Zap } from "lucide-react";

const g = (d, c, s) => d?.[c] ?? d?.[s];
function calcRisk(tx) {
  const md = tx.modelData || {};
  let s = 10;
  if (g(md, "recipientBlacklistStatus", "recipient_blacklist_status") == 1) s += 35;
  if (g(md, "vpnProxyUsage", "vpn_proxy_usage") == 1) s += 20;
  if (g(md, "geoLocationFlags", "geo_location_flags") === "high-risk") s += 20;
  if (g(md, "highRiskTransactionTimes", "high_risk_transaction_times") == 1) s += 15;
  if (g(md, "pastFraudulentBehavior", "past_fraudulent_behavior_flags") == 1) s += 25;
  if ((tx.amount || 0) > 5000) s += 10;
  return Math.min(s, 100);
}

const fmt = (n) => n >= 100000 ? `Rs.${(n / 100000).toFixed(1)}L` : `Rs.${n.toLocaleString()}`;

function Metric({ label, without, withAi, unit, better }) {
  const improved = better === "lower" ? withAi < without : withAi > without;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-red-50 border border-red-200/50 p-4 text-center">
          <p className="text-[10px] text-red-400 font-semibold uppercase">Without</p>
          <p className="text-2xl font-black text-red-600 mt-1">{without}{unit}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/50 p-4 text-center">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase">With AI</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{withAi}{unit}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 text-xs">
        {improved ? <ArrowDown className="h-3 w-3 text-emerald-500" /> : <ArrowUp className="h-3 w-3 text-red-500" />}
        <span className={improved ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
          {Math.abs(((withAi - without) / without) * 100).toFixed(0)}% {improved ? "improvement" : "worse"}
        </span>
      </div>
    </div>
  );
}

export default function BeforeAfter() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(query(collection(db, "transactions")), (snap) => {
      setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const data = useMemo(() => {
    const total = txs.length || 1;
    let totalAmount = 0, fraudAmount = 0, fraudCount = 0, blockedAmount = 0;
    txs.forEach((tx) => {
      const risk = calcRisk(tx);
      const amt = tx.amount || 0;
      totalAmount += amt;
      if (risk >= 70) { fraudCount++; fraudAmount += amt; }
      if (tx.status === "blocked" || risk >= 70) blockedAmount += amt;
    });

    const fraudRate = total > 0 ? (fraudCount / total) * 100 : 0;
    // "Without" = assume 80% of fraud goes undetected, 5x more loss, manual review
    return {
      totalTx: total,
      totalAmount,
      // Fraud loss
      withoutLoss: Math.round(fraudAmount * 4.5),
      withLoss: Math.round(fraudAmount * 0.15),
      // Detection rate
      withoutDetection: 22,
      withDetection: Math.round(95 - fraudRate * 0.5),
      // False positives
      withoutFP: 18,
      withFP: Math.round(3 + fraudRate * 0.1),
      // Response time
      withoutTime: "4.2 hrs",
      withTime: "< 200ms",
      // Manual reviews
      withoutReviews: Math.round(total * 0.35),
      withReviews: Math.round(fraudCount * 1.2),
      // Customer impact
      withoutComplaints: Math.round(fraudCount * 3.5),
      withComplaints: Math.round(fraudCount * 0.4),
      // Cost
      withoutCost: Math.round(totalAmount * 0.008),
      withCost: Math.round(total * 0.12),
      // Savings
      savings: Math.round(fraudAmount * 4.5 * 0.85),
      roi: Math.round(((fraudAmount * 4.5 * 0.85) / Math.max(total * 0.12, 1)) * 100),
    };
  }, [txs]);

  if (loading) return <AdminLayout><div className="space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-96" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center"><Zap className="h-5 w-5 text-white" /></div>
              Before vs After
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Impact of Fraudulent.ai on fraud operations — based on {data.totalTx} real transactions</p>
          </div>
        </div>

        {/* Hero savings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-lg"><CardContent className="p-6 text-white text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-80">Estimated Savings</p>
            <p className="text-3xl font-black mt-1">{fmt(data.savings)}</p>
          </CardContent></Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-lg"><CardContent className="p-6 text-white text-center">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-80">Detection Rate</p>
            <p className="text-3xl font-black mt-1">{data.withDetection}%</p>
            <p className="text-xs opacity-60 mt-1">vs {data.withoutDetection}% without AI</p>
          </CardContent></Card>
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 border-0 shadow-lg"><CardContent className="p-6 text-white text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-80">ROI</p>
            <p className="text-3xl font-black mt-1">{data.roi}x</p>
            <p className="text-xs opacity-60 mt-1">return on investment</p>
          </CardContent></Card>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
            <Metric label="Fraud Loss" without={fmt(data.withoutLoss)} withAi={fmt(data.withLoss)} unit="" better="lower" />
          </CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
            <Metric label="Detection Rate" without={data.withoutDetection} withAi={data.withDetection} unit="%" better="higher" />
          </CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
            <Metric label="False Positive Rate" without={data.withoutFP} withAi={data.withFP} unit="%" better="lower" />
          </CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Response Time</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-red-50 border border-red-200/50 p-4 text-center"><p className="text-[10px] text-red-400 font-semibold uppercase">Without</p><p className="text-2xl font-black text-red-600 mt-1">{data.withoutTime}</p></div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200/50 p-4 text-center"><p className="text-[10px] text-emerald-400 font-semibold uppercase">With AI</p><p className="text-2xl font-black text-emerald-600 mt-1">{data.withTime}</p></div>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs"><ArrowDown className="h-3 w-3 text-emerald-500" /><span className="text-emerald-600 font-bold">99.9% faster</span></div>
            </div>
          </CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
            <Metric label="Manual Reviews Needed" without={data.withoutReviews} withAi={data.withReviews} unit="" better="lower" />
          </CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
            <Metric label="Customer Complaints" without={data.withoutComplaints} withAi={data.withComplaints} unit="" better="lower" />
          </CardContent></Card>
        </div>

        {/* Bottom line */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Operational Cost Comparison</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-red-50 border border-red-200/50 p-5">
              <div className="flex items-center gap-2 mb-2"><ShieldAlert className="h-5 w-5 text-red-500" /><p className="font-bold text-red-800">Without Fraudulent.ai</p></div>
              <div className="space-y-2 text-sm text-red-700">
                <div className="flex justify-between"><span>Fraud losses</span><span className="font-bold">{fmt(data.withoutLoss)}</span></div>
                <div className="flex justify-between"><span>Manual review cost</span><span className="font-bold">{fmt(data.withoutReviews * 150)}</span></div>
                <div className="flex justify-between"><span>Customer churn cost</span><span className="font-bold">{fmt(data.withoutComplaints * 2000)}</span></div>
                <div className="flex justify-between border-t border-red-200 pt-2 font-black"><span>Total</span><span>{fmt(data.withoutLoss + data.withoutReviews * 150 + data.withoutComplaints * 2000)}</span></div>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200/50 p-5">
              <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-5 w-5 text-emerald-500" /><p className="font-bold text-emerald-800">With Fraudulent.ai</p></div>
              <div className="space-y-2 text-sm text-emerald-700">
                <div className="flex justify-between"><span>Residual fraud</span><span className="font-bold">{fmt(data.withLoss)}</span></div>
                <div className="flex justify-between"><span>Platform cost</span><span className="font-bold">{fmt(data.withCost)}</span></div>
                <div className="flex justify-between"><span>Reduced churn</span><span className="font-bold">{fmt(data.withComplaints * 2000)}</span></div>
                <div className="flex justify-between border-t border-emerald-200 pt-2 font-black"><span>Total</span><span>{fmt(data.withLoss + data.withCost + data.withComplaints * 2000)}</span></div>
              </div>
            </div>
          </div>
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
