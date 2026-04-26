import { collection, onSnapshot, orderBy, query, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Download, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ACTIONS = ["login", "config_change", "rule_update", "threshold_change", "case_update", "export_data", "user_create", "alert_resolve"];
const USERS = ["Admin", "Aarav Sharma", "Priya Verma", "Rohan Bhatt", "Neha Agarwal"];
const RESOURCES = ["scoring_config", "challenge_rules", "threshold:high_risk", "threshold:medium_risk", "case:CASE-1042", "case:CASE-1087", "transactions_export", "user:new_analyst", "alert:ALT-2891", "alert:ALT-3012", "platform_config", "metric_weights"];
const DETAILS = ["Changed high_risk threshold from 70 to 75", "Updated velocity check rule weight to 0.8", "Exported 500 transactions as CSV", "Created new analyst account", "Resolved alert for suspicious pattern", "Modified geo-fence radius to 50km", "Login from new device", "Closed case after investigation", "Enabled behavioral scoring module", "Updated SIM swap detection rule", "Changed medium_risk threshold from 40 to 45", "Exported monthly fraud report"];
const DOT = { login: "bg-blue-500", config_change: "bg-violet-500", rule_update: "bg-amber-500", threshold_change: "bg-orange-500", case_update: "bg-green-500", export_data: "bg-slate-500", user_create: "bg-cyan-500", alert_resolve: "bg-emerald-500" };
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

const rel = (d) => { if (!d) return "-"; const t = typeof d === "string" ? new Date(d) : d?.toDate?.() ? d.toDate() : new Date(d); const s = (Date.now() - t.getTime()) / 1000; if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return t.toLocaleDateString(); };

async function seedLogs() {
  const ref = collection(db, "audit_logs");
  for (let i = 0; i < 30; i++) {
    const hoursAgo = Math.floor(Math.random() * 168);
    await addDoc(ref, {
      action: pick(ACTIONS, i * 7),
      user: pick(USERS, i * 13),
      resource: pick(RESOURCES, i * 17),
      details: pick(DETAILS, i * 23),
      time: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
      timestamp: serverTimestamp(),
    });
  }
}

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionF, setActionF] = useState("all");
  const [timeF, setTimeF] = useState("all");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty && !seeded) {
        setSeeded(true);
        await seedLogs();
        return;
      }
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [seeded]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return logs.filter((l) => {
      if (actionF !== "all" && l.action !== actionF) return false;
      if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
      if (timeF !== "all") {
        const t = l.time ? new Date(l.time).getTime() : l.timestamp?.toDate?.()?.getTime() || 0;
        if (timeF === "today" && now - t > 86400000) return false;
        if (timeF === "week" && now - t > 604800000) return false;
        if (timeF === "month" && now - t > 2592000000) return false;
      }
      return true;
    });
  }, [logs, actionF, search, timeF]);

  const stats = useMemo(() => {
    const now = Date.now();
    let today = 0, config = 0, user = 0;
    logs.forEach((l) => {
      const t = l.time ? new Date(l.time).getTime() : l.timestamp?.toDate?.()?.getTime() || 0;
      if (now - t < 86400000) today++;
      if (["config_change", "rule_update", "threshold_change"].includes(l.action)) config++;
      if (["login", "user_create"].includes(l.action)) user++;
    });
    return { total: logs.length, today, config, user };
  }, [logs]);

  const exportCsv = () => {
    const rows = filtered.map((l) => `"${l.action}","${l.user}","${l.resource}","${l.details}","${l.time || ""}"`);
    const csv = "Action,User,Resource,Details,Time\n" + rows.join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "audit_logs.csv"; a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-zinc-700 rounded-xl flex items-center justify-center"><ClipboardList className="h-5 w-5 text-white" /></div>
              Audit Trail
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">System activity and compliance logs</p>
          </div>
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Logs</p><p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-blue-200/50"><CardContent className="p-4"><p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Today</p><p className="text-2xl font-bold text-blue-600 mt-1">{stats.today}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-violet-200/50"><CardContent className="p-4"><p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Config Changes</p><p className="text-2xl font-bold text-violet-600 mt-1">{stats.config}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-cyan-200/50"><CardContent className="p-4"><p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">User Actions</p><p className="text-2xl font-bold text-cyan-600 mt-1">{stats.user}</p></CardContent></Card>
        </div>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="pl-9 h-9 text-sm" /></div>
            <Select value={actionF} onValueChange={setActionF}><SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="Action" /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            <Select value={timeF} onValueChange={setTimeF}><SelectTrigger className="w-full sm:w-32 h-9 text-sm"><SelectValue placeholder="Time" /></SelectTrigger><SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="week">This Week</SelectItem><SelectItem value="month">This Month</SelectItem></SelectContent></Select>
            {(search || actionF !== "all" || timeF !== "all") && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setActionF("all"); setTimeF("all"); }}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent></Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>)}
            {!loading && filtered.map((l) => (
              <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 transition-all">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${DOT[l.action] || "bg-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 capitalize">{(l.action || "").replace(/_/g, " ")}</span>
                    <span className="text-xs text-slate-500">by <strong>{l.user}</strong></span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{l.resource}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{l.details}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{rel(l.time || l.timestamp)}</span>
              </div>
            ))}
            {!loading && !filtered.length && <p className="text-center text-slate-400 py-10">No logs found</p>}
          </div>
          {filtered.length > 0 && <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">{filtered.length} entries</div>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
