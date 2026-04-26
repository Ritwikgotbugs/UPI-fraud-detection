import { collection, onSnapshot, orderBy, query, doc, updateDoc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, ChevronDown, ChevronRight, MessageSquare, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { seedCases } from "./seedFirestore";

const rel = (d) => { if (!d) return "-"; const s = (Date.now() - (d?.toDate?.() || new Date(d)).getTime()) / 1000; if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return (d?.toDate?.() || new Date(d)).toLocaleDateString(); };
const PRI = { critical: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", medium: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-emerald-100 text-emerald-700 border-emerald-200" };
const STAT = { open: "bg-blue-100 text-blue-700 border-blue-200", investigating: "bg-purple-100 text-purple-700 border-purple-200", resolved: "bg-emerald-100 text-emerald-700 border-emerald-200", closed: "bg-slate-100 text-slate-600 border-slate-200" };
const BORDER = { critical: "border-l-red-500", high: "border-l-orange-500", medium: "border-l-amber-500", low: "border-l-emerald-500" };

export default function CaseManagement() {
  const { userData } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [prioF, setPrioF] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", transactionId: "" });
  const [noteText, setNoteText] = useState("");
  const [assignText, setAssignText] = useState("");

  useEffect(() => {
    seedCases();
    const q = query(collection(db, "fraud_cases"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setCases(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    return unsub;
  }, []);

  const filtered = useMemo(() => cases.filter((c) => {
    if (statusF !== "all" && c.status !== statusF) return false;
    if (prioF !== "all" && c.priority !== prioF) return false;
    if (search && !JSON.stringify(c).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [cases, statusF, prioF, search]);

  const stats = useMemo(() => {
    const s = { open: 0, investigating: 0, resolved: 0, amount: 0 };
    cases.forEach((c) => { if (s[c.status] !== undefined) s[c.status]++; s.amount += Number(c.amountAtRisk) || 0; });
    return s;
  }, [cases]);

  const create = async () => {
    if (!form.title.trim()) return;
    await addDoc(collection(db, "fraud_cases"), { ...form, status: "open", assignedTo: "", amountAtRisk: 0, notes: [], createdAt: serverTimestamp() });
    setForm({ title: "", description: "", priority: "medium", transactionId: "" }); setShowCreate(false);
  };

  const updateStatus = async (id, status) => { await updateDoc(doc(db, "fraud_cases", id), { status }); };
  const assign = async (id) => { if (!assignText.trim()) return; await updateDoc(doc(db, "fraud_cases", id), { assignedTo: assignText }); setAssignText(""); };
  const addNote = async (id) => { if (!noteText.trim()) return; await updateDoc(doc(db, "fraud_cases", id), { notes: arrayUnion({ text: noteText, author: userData?.name || "Admin", timestamp: new Date().toISOString() }) }); setNoteText(""); };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center"><Briefcase className="h-5 w-5 text-white" /></div>
              Case Management
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Track and resolve fraud investigations</p>
          </div>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" /> Create Case</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-white/80 backdrop-blur border-blue-200/50"><CardContent className="p-4"><p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Open</p><p className="text-2xl font-bold text-blue-600 mt-1">{stats.open}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-purple-200/50"><CardContent className="p-4"><p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Investigating</p><p className="text-2xl font-bold text-purple-600 mt-1">{stats.investigating}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-emerald-200/50"><CardContent className="p-4"><p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Resolved</p><p className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-red-200/50"><CardContent className="p-4"><p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Amount at Risk</p><p className="text-2xl font-bold text-red-600 mt-1">Rs.{stats.amount.toLocaleString()}</p></CardContent></Card>
        </div>

        {showCreate && (
          <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between"><p className="font-semibold text-slate-800 text-sm">New Case</p><Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div><p className="text-xs text-slate-500 mb-1">Title</p><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Case title..." className="h-9 text-sm" /></div>
              <div><p className="text-xs text-slate-500 mb-1">Description</p><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." className="h-9 text-sm" /></div>
              <div><p className="text-xs text-slate-500 mb-1">Priority</p><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
              <div><p className="text-xs text-slate-500 mb-1">Transaction ID</p><Input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder="Optional..." className="h-9 text-sm" /></div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={create}><Plus className="h-4 w-4" /> Create</Button>
          </CardContent></Card>
        )}

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cases..." className="pl-9 h-9 text-sm" /></div>
            <Select value={statusF} onValueChange={setStatusF}><SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
            <Select value={prioF} onValueChange={setPrioF}><SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            {(search || statusF !== "all" || prioF !== "all") && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusF("all"); setPrioF("all"); }}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent></Card>

        <div className="space-y-2">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          {!loading && !filtered.length && <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-10 text-center text-slate-400">No cases yet. Create your first case to start tracking fraud investigations.</CardContent></Card>}
          {!loading && filtered.map((c) => (
            <Card key={c.id} className={`bg-white/80 backdrop-blur border-slate-200/50 shadow-sm border-l-4 ${BORDER[c.priority] || "border-l-slate-300"}`}>
              <div className="px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-all" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{c.title || "Untitled Case"}</span>
                      <Badge className={PRI[c.priority] || PRI.medium}>{c.priority}</Badge>
                      <Badge className={STAT[c.status] || STAT.open}>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned"} · {rel(c.createdAt)}{c.transactionId ? ` · TX: ${c.transactionId}` : ""}</p>
                  </div>
                  {expanded === c.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
              {expanded === c.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                  {c.description && <p className="text-sm text-slate-600">{c.description}</p>}
                  <div className="flex flex-wrap gap-3">
                    <div><p className="text-xs text-slate-500">Status</p><Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}><SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
                    <div className="flex-1 min-w-[200px]"><p className="text-xs text-slate-500">Assign To</p><div className="flex gap-1 mt-1"><Input value={assignText} onChange={(e) => setAssignText(e.target.value)} placeholder="Name..." className="h-8 text-xs" /><Button size="sm" className="h-8 text-xs" onClick={() => assign(c.id)}>Assign</Button></div></div>
                  </div>
                  {(c.notes || []).length > 0 && (
                    <div><p className="text-xs text-slate-500 mb-1">Notes</p><div className="space-y-1">{c.notes.map((n, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs bg-slate-50 rounded-lg p-2"><MessageSquare className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" /><div><span className="font-semibold text-slate-700">{n.author}</span><span className="text-slate-400 ml-2">{rel(n.timestamp)}</span><p className="text-slate-600">{n.text}</p></div></div>
                    ))}</div></div>
                  )}
                  <div className="flex gap-1"><Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." className="h-8 text-xs" /><Button size="sm" className="h-8 text-xs gap-1" onClick={() => addNote(c.id)}><MessageSquare className="h-3 w-3" /> Add</Button></div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
