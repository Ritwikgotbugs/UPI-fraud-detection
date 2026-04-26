import { useState, useEffect, useRef } from "react";
import { collection, addDoc, onSnapshot, orderBy, query, limit, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

const SCENARIOS = [
  { id: "burst", name: "Burst Attack", desc: "20 rapid transactions from one sender to many recipients", icon: "⚡", count: 20, color: "from-red-600 to-rose-600" },
  { id: "sim_swap", name: "SIM Swap Ring", desc: "Device changes + immediate high-value transfers", icon: "📱", count: 12, color: "from-purple-600 to-fuchsia-600" },
  { id: "mule_network", name: "Money Mule Network", desc: "Chain of small transfers across 15 accounts", icon: "🕸️", count: 15, color: "from-amber-600 to-orange-600" },
  { id: "geo_anomaly", name: "Geo Anomaly Blitz", desc: "Transactions from 10 cities in 5 minutes", icon: "🌍", count: 10, color: "from-cyan-600 to-blue-600" },
  { id: "night_raid", name: "Late Night Raid", desc: "High-value transactions between 1AM-4AM", icon: "🌙", count: 8, color: "from-indigo-600 to-violet-600" },
];

const NAMES = ["Aarav Sharma","Vivaan Patel","Aditya Singh","Arjun Reddy","Sai Krishnan","Ananya Mishra","Diya Banerjee","Myra Kapoor","Rohan Bhatt","Karan Naidu","Priya Verma","Neha Agarwal","Rahul Prasad","Amit Dubey","Sneha Rao"];
const UPIS = ["aarav99@oksbi","vivaan12@okaxis","aditya45@okhdfcbank","arjun78@paytm","sai33@ybl","ananya56@oksbi","diya88@okaxis","myra21@okicici","rohan67@paytm","karan44@ybl","priya11@oksbi","neha90@okaxis","rahul55@okhdfcbank","amit32@paytm","sneha77@ybl"];
const pick = (a, i) => a[i % a.length];

function buildTx(scenario, i) {
  const base = { transactionType: "sent", createdAt: Timestamp.now() };
  const s = scenario.id;
  if (s === "burst") return { ...base, senderUPI: UPIS[0], recipientUPI: pick(UPIS, i + 3), senderName: NAMES[0], recipientName: pick(NAMES, i + 3), amount: 5000 + i * 2000, remarks: "Burst transfer", status: "blocked", riskLevel: "high", modelData: { recipientBlacklistStatus: i % 3 === 0 ? 1 : 0, vpnProxyUsage: 1, geoLocationFlags: "normal", highRiskTransactionTimes: 0, pastFraudulentBehavior: i < 5 ? 1 : 0, deviceFingerprinting: 0.2, socialTrustScore: 15, behavioralBiometrics: 0.1, recipientVerificationStatus: "recently_registered", fraudComplaintsCount: 2 } };
  if (s === "sim_swap") return { ...base, senderUPI: pick(UPIS, i), recipientUPI: pick(UPIS, i + 7), senderName: pick(NAMES, i), recipientName: pick(NAMES, i + 7), amount: 15000 + i * 5000, remarks: "Post SIM swap", status: "blocked", riskLevel: "high", modelData: { recipientBlacklistStatus: 0, vpnProxyUsage: 0, geoLocationFlags: "high-risk", highRiskTransactionTimes: 1, pastFraudulentBehavior: 1, deviceFingerprinting: 0.05, socialTrustScore: 10, behavioralBiometrics: 0.05, recipientVerificationStatus: "recently_registered", fraudComplaintsCount: 1 } };
  if (s === "mule_network") return { ...base, senderUPI: pick(UPIS, i), recipientUPI: pick(UPIS, i + 1), senderName: pick(NAMES, i), recipientName: pick(NAMES, i + 1), amount: 1000 + i * 300, remarks: "Chain transfer", status: i % 3 === 0 ? "blocked" : "flagged", riskLevel: i % 3 === 0 ? "high" : "medium", modelData: { recipientBlacklistStatus: 0, vpnProxyUsage: i % 4 === 0 ? 1 : 0, geoLocationFlags: "normal", highRiskTransactionTimes: 0, pastFraudulentBehavior: 0, deviceFingerprinting: 0.3, socialTrustScore: 25, behavioralBiometrics: 0.3, recipientVerificationStatus: "verified", fraudComplaintsCount: 0 } };
  if (s === "geo_anomaly") return { ...base, senderUPI: UPIS[2], recipientUPI: pick(UPIS, i + 5), senderName: NAMES[2], recipientName: pick(NAMES, i + 5), amount: 8000 + i * 3000, remarks: "Geo anomaly", status: "blocked", riskLevel: "high", modelData: { recipientBlacklistStatus: 0, vpnProxyUsage: 1, geoLocationFlags: "high-risk", highRiskTransactionTimes: 1, pastFraudulentBehavior: 0, deviceFingerprinting: 0.15, socialTrustScore: 20, behavioralBiometrics: 0.2, recipientVerificationStatus: "recently_registered", fraudComplaintsCount: 0 } };
  return { ...base, senderUPI: pick(UPIS, i + 2), recipientUPI: pick(UPIS, i + 8), senderName: pick(NAMES, i + 2), recipientName: pick(NAMES, i + 8), amount: 20000 + i * 8000, remarks: "Night transfer", status: "blocked", riskLevel: "high", modelData: { recipientBlacklistStatus: i % 2 === 0 ? 1 : 0, vpnProxyUsage: 0, geoLocationFlags: "normal", highRiskTransactionTimes: 1, pastFraudulentBehavior: 1, deviceFingerprinting: 0.4, socialTrustScore: 12, behavioralBiometrics: 0.15, recipientVerificationStatus: "verified", fraudComplaintsCount: 3 } };
}

export default function AttackSimulator() {
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState(null);
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState({ sent: 0, blocked: 0, flagged: 0, passed: 0, totalAmount: 0 });
  const [liveTxs, setLiveTxs] = useState([]);
  const intervalRef = useRef(null);

  // Listen to latest transactions for the live ticker
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(5));
    return onSnapshot(q, (snap) => setLiveTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  const launch = async (sc) => {
    setScenario(sc);
    setRunning(true);
    setFeed([]);
    setStats({ sent: 0, blocked: 0, flagged: 0, passed: 0, totalAmount: 0 });

    let i = 0;
    intervalRef.current = setInterval(async () => {
      if (i >= sc.count) {
        clearInterval(intervalRef.current);
        setRunning(false);
        return;
      }
      const tx = buildTx(sc, i);
      await addDoc(collection(db, "transactions"), tx);
      const result = tx.status === "blocked" ? "BLOCKED" : tx.riskLevel === "medium" ? "FLAGGED" : "PASSED";
      setFeed((prev) => [{ ...tx, result, idx: i, time: new Date() }, ...prev]);
      setStats((prev) => ({
        sent: prev.sent + 1,
        blocked: prev.blocked + (result === "BLOCKED" ? 1 : 0),
        flagged: prev.flagged + (result === "FLAGGED" ? 1 : 0),
        passed: prev.passed + (result === "PASSED" ? 1 : 0),
        totalAmount: prev.totalAmount + tx.amount,
      }));
      i++;
    }, 600);
  };

  const stop = () => { clearInterval(intervalRef.current); setRunning(false); };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl flex items-center justify-center"><Zap className="h-5 w-5 text-white" /></div>
              Attack Simulator
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Launch fraud scenarios and watch the system defend in real-time</p>
          </div>
          {running && <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={stop}><Loader2 className="h-4 w-4 animate-spin" /> Stop Attack</Button>}
        </div>

        {/* Scenario cards */}
        {!running && !feed.length && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCENARIOS.map((sc) => (
              <Card key={sc.id} className="bg-white/80 backdrop-blur border-slate-200/50 hover:shadow-lg transition-all cursor-pointer group" onClick={() => launch(sc)}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{sc.icon}</span>
                    <div><p className="font-bold text-slate-800">{sc.name}</p><p className="text-xs text-slate-500">{sc.count} transactions</p></div>
                  </div>
                  <p className="text-sm text-slate-600">{sc.desc}</p>
                  <div className={`mt-3 rounded-lg bg-gradient-to-r ${sc.color} text-white text-center py-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity`}>Launch Attack</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Live battle view */}
        {(running || feed.length > 0) && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sent</p><p className="text-2xl font-bold text-slate-800 mt-1">{stats.sent}</p></CardContent></Card>
              <Card className="bg-white/80 backdrop-blur border-red-200/50"><CardContent className="p-4"><p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Blocked</p><p className="text-2xl font-bold text-red-600 mt-1">{stats.blocked}</p></CardContent></Card>
              <Card className="bg-white/80 backdrop-blur border-amber-200/50"><CardContent className="p-4"><p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Flagged</p><p className="text-2xl font-bold text-amber-600 mt-1">{stats.flagged}</p></CardContent></Card>
              <Card className="bg-white/80 backdrop-blur border-emerald-200/50"><CardContent className="p-4"><p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Passed</p><p className="text-2xl font-bold text-emerald-600 mt-1">{stats.passed}</p></CardContent></Card>
              <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Amount</p><p className="text-2xl font-bold text-slate-800 mt-1">Rs.{stats.totalAmount.toLocaleString()}</p></CardContent></Card>
            </div>

            {/* Progress bar */}
            {running && scenario && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500"><span>{scenario.name} in progress...</span><span>{stats.sent}/{scenario.count}</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-300" style={{ width: `${(stats.sent / scenario.count) * 100}%` }} /></div>
              </div>
            )}

            {/* Feed */}
            <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-0">
              <div className="max-h-[450px] overflow-y-auto divide-y divide-slate-100">
                {feed.map((tx, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 transition-all ${tx.result === "BLOCKED" ? "bg-red-50/50" : tx.result === "FLAGGED" ? "bg-amber-50/50" : ""}`}
                    style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                    {tx.result === "BLOCKED" ? <Shield className="h-5 w-5 text-red-500 flex-shrink-0" /> : tx.result === "FLAGGED" ? <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" /> : <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{tx.senderUPI}</span>
                        <span className="text-xs text-slate-400">→</span>
                        <span className="text-sm text-slate-600">{tx.recipientUPI}</span>
                        <span className="text-sm font-bold text-slate-800">Rs.{tx.amount?.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500">{tx.remarks}</p>
                    </div>
                    <Badge className={tx.result === "BLOCKED" ? "bg-red-100 text-red-700 border-red-200" : tx.result === "FLAGGED" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>{tx.result}</Badge>
                  </div>
                ))}
              </div>
            </CardContent></Card>

            {!running && feed.length > 0 && (
              <div className="flex gap-3">
                <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={() => { setFeed([]); setStats({ sent: 0, blocked: 0, flagged: 0, passed: 0, totalAmount: 0 }); setScenario(null); }}><Zap className="h-4 w-4" /> New Scenario</Button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </AdminLayout>
  );
}
