import { useEffect, useMemo, useState, useRef } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import AdminLayout from "../AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Search, ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";

const gv = (d, c, s) => d?.[c] ?? d?.[s];
function calcRisk(tx) {
  const md = tx.modelData || {};
  let s = 10;
  if (gv(md, "recipientBlacklistStatus", "recipient_blacklist_status") == 1) s += 35;
  if (gv(md, "vpnProxyUsage", "vpn_proxy_usage") == 1) s += 20;
  if (gv(md, "geoLocationFlags", "geo_location_flags") === "high-risk") s += 20;
  if (gv(md, "highRiskTransactionTimes", "high_risk_transaction_times") == 1) s += 15;
  if (gv(md, "pastFraudulentBehavior", "past_fraudulent_behavior_flags") == 1) s += 25;
  if ((tx.amount || 0) > 5000) s += 10;
  return Math.min(s, 100);
}
function getTags(tx) {
  const md = tx.modelData || {};
  const tags = [];
  if (gv(md, "recipientBlacklistStatus", "recipient_blacklist_status") == 1) tags.push("blacklisted");
  if (gv(md, "vpnProxyUsage", "vpn_proxy_usage") == 1) tags.push("vpn");
  if (gv(md, "geoLocationFlags", "geo_location_flags") === "high-risk") tags.push("geo_risk");
  if (gv(md, "highRiskTransactionTimes", "high_risk_transaction_times") == 1) tags.push("night");
  if (gv(md, "pastFraudulentBehavior", "past_fraudulent_behavior_flags") == 1) tags.push("past_fraud");
  if ((tx.amount || 0) > 25000) tags.push("high_value");
  if (tx.status === "blocked") tags.push("blocked");
  return tags;
}

const NODE_R = 22;
const COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };

const GROUP_FILTERS = [
  { key: "all", label: "All Transactions", icon: "🔗" },
  { key: "blacklisted", label: "Blacklisted Recipients", icon: "⛔" },
  { key: "vpn", label: "VPN/Proxy Users", icon: "🔒" },
  { key: "geo_risk", label: "High-Risk Geo", icon: "🌍" },
  { key: "night", label: "Night Transactions", icon: "🌙" },
  { key: "past_fraud", label: "Past Fraud History", icon: "🚩" },
  { key: "high_value", label: "High Value (>25K)", icon: "💰" },
  { key: "blocked", label: "Blocked Only", icon: "🛑" },
];

// Group colors for visual clustering
const GROUP_COLORS = {
  blacklisted: "#dc2626", vpn: "#7c3aed", geo_risk: "#0891b2",
  night: "#4f46e5", past_fraud: "#be123c", high_value: "#ca8a04", blocked: "#991b1b",
};

export default function NetworkGraph() {
  const canvasRef = useRef(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  useEffect(() => onSnapshot(query(collection(db, "transactions")), (snap) => {
    setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false);
  }), []);

  // Compute group counts for the filter chips
  const groupCounts = useMemo(() => {
    const c = {};
    GROUP_FILTERS.forEach((g) => { c[g.key] = 0; });
    txs.forEach((tx) => { const tags = getTags(tx); tags.forEach((t) => { if (c[t] !== undefined) c[t]++; }); c.all++; });
    return c;
  }, [txs]);

  const { nodes, edges, stats } = useMemo(() => {
    const nodeMap = {};
    const edgeList = [];
    let highE = 0, medE = 0, lowE = 0;

    txs.forEach((tx) => {
      const s = tx.senderUPI || tx.senderName;
      const r = tx.recipientUPI || tx.recipientName;
      if (!s || !r || s === r) return;
      const risk = calcRisk(tx);
      const level = risk >= 70 ? "high" : risk >= 40 ? "medium" : "low";
      const tags = getTags(tx);

      if (riskFilter !== "all" && level !== riskFilter) return;
      if (groupFilter !== "all" && !tags.includes(groupFilter)) return;
      if (search && !s.toLowerCase().includes(search.toLowerCase()) && !r.toLowerCase().includes(search.toLowerCase())) return;

      if (!nodeMap[s]) nodeMap[s] = { id: s, label: s.split("@")[0], txCount: 0, totalAmount: 0, maxRisk: 0, tags: new Set() };
      if (!nodeMap[r]) nodeMap[r] = { id: r, label: r.split("@")[0], txCount: 0, totalAmount: 0, maxRisk: 0, tags: new Set() };
      nodeMap[s].txCount++; nodeMap[s].totalAmount += tx.amount || 0; nodeMap[s].maxRisk = Math.max(nodeMap[s].maxRisk, risk);
      nodeMap[r].txCount++; nodeMap[r].totalAmount += tx.amount || 0; nodeMap[r].maxRisk = Math.max(nodeMap[r].maxRisk, risk);
      tags.forEach((t) => { nodeMap[s].tags.add(t); nodeMap[r].tags.add(t); });
      edgeList.push({ from: s, to: r, amount: tx.amount || 0, risk, level, tags });
      if (level === "high") highE++; else if (level === "medium") medE++; else lowE++;
    });

    const nodesArr = Object.values(nodeMap).map((n) => ({ ...n, tags: [...n.tags] }));
    const cx = 400, cy = 300;

    // Random initial positions (NOT circular)
    nodesArr.forEach((n) => {
      n.x = cx + (Math.random() - 0.5) * 400;
      n.y = cy + (Math.random() - 0.5) * 300;
      n.vx = 0; n.vy = 0;
    });

    // Build adjacency for attraction
    const adj = {};
    edgeList.forEach((e) => {
      if (!adj[e.from]) adj[e.from] = [];
      if (!adj[e.to]) adj[e.to] = [];
      adj[e.from].push(e.to);
      adj[e.to].push(e.from);
    });

    // Proper force-directed: 150 iterations with cooling
    for (let iter = 0; iter < 150; iter++) {
      const temp = 1 - iter / 150; // cooling
      const repStr = 2500 * temp + 500;

      // Repulsion between ALL node pairs
      for (let i = 0; i < nodesArr.length; i++) {
        for (let j = i + 1; j < nodesArr.length; j++) {
          const dx = nodesArr[j].x - nodesArr[i].x;
          const dy = nodesArr[j].y - nodesArr[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 5);
          const f = repStr / (dist * dist);
          const fx = (dx / dist) * f, fy = (dy / dist) * f;
          nodesArr[i].vx -= fx; nodesArr[i].vy -= fy;
          nodesArr[j].vx += fx; nodesArr[j].vy += fy;
        }
      }

      // Attraction along edges — connected nodes pull together
      edgeList.forEach((e) => {
        const a = nodeMap[e.from], b = nodeMap[e.to];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 5);
        const idealDist = 100;
        const f = (dist - idealDist) * 0.04 * temp;
        const fx = (dx / dist) * f, fy = (dy / dist) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });

      // Strong gravity toward center
      nodesArr.forEach((n) => {
        n.vx += (cx - n.x) * 0.004;
        n.vy += (cy - n.y) * 0.004;
      });

      // Apply velocity with damping
      nodesArr.forEach((n) => {
        n.vx *= 0.6; n.vy *= 0.6;
        n.x += n.vx; n.y += n.vy;
      });
    }

    return { nodes: nodesArr, edges: edgeList, stats: { nodes: nodesArr.length, edges: edgeList.length, high: highE, medium: medE, low: lowE } };
  }, [txs, riskFilter, groupFilter, search]);

  // Auto-fit: compute transform to show all nodes
  const autoFit = useMemo(() => {
    if (!nodes.length) return { ox: 0, oy: 0, scale: 1 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const r = 18 + Math.min(n.txCount, 8) * 1.5 + 15;
      minX = Math.min(minX, n.x - r); maxX = Math.max(maxX, n.x + r);
      minY = Math.min(minY, n.y - r); maxY = Math.max(maxY, n.y + r);
    });
    const gw = maxX - minX || 1, gh = maxY - minY || 1;
    // Target canvas area (approx 800x550 logical pixels)
    const scale = Math.min(750 / gw, 500 / gh, 2.5) * 0.88;
    const ox = (800 - gw * scale) / 2 - minX * scale;
    const oy = (550 - gh * scale) / 2 - minY * scale;
    return { ox, oy, scale };
  }, [nodes]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2, ch = h / 2;

    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);

    const totalScale = autoFit.scale * zoom;
    const totalOx = autoFit.ox + pan.x;
    const totalOy = autoFit.oy + pan.y;
    ctx.save(); ctx.translate(totalOx, totalOy); ctx.scale(totalScale, totalScale);

    if (!nodes.length) {
      ctx.restore();
      ctx.fillStyle = "#475569"; ctx.font = "14px system-ui"; ctx.textAlign = "center";
      ctx.fillText("No transactions match current filters", cw / 2, ch / 2);
      return;
    }

    // Edges
    edges.forEach((e) => {
      const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to);
      if (!a || !b) return;
      const lw = Math.max(1, Math.min(e.amount / 8000, 4));
      const edgeColor = groupFilter !== "all" && GROUP_COLORS[groupFilter] ? GROUP_COLORS[groupFilter] : COLORS[e.level];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = edgeColor + "50"; ctx.lineWidth = lw; ctx.stroke();
      // Arrow
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;
      const ux = dx / dist, uy = dy / dist;
      const rB = 18 + Math.min(b.txCount, 8) * 1.5 + 4;
      const ex = b.x - ux * rB, ey = b.y - uy * rB;
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex - ux * 7 + uy * 3, ey - uy * 7 - ux * 3);
      ctx.lineTo(ex - ux * 7 - uy * 3, ey - uy * 7 + ux * 3);
      ctx.closePath(); ctx.fillStyle = edgeColor + "80"; ctx.fill();
    });

    // Nodes
    nodes.forEach((n) => {
      const nodeColor = groupFilter !== "all" && GROUP_COLORS[groupFilter] ? GROUP_COLORS[groupFilter] : COLORS[n.maxRisk >= 70 ? "high" : n.maxRisk >= 40 ? "medium" : "low"];
      const r = 18 + Math.min(n.txCount, 8) * 1.5;
      const isHov = n.id === hovered;

      // Shadow
      if (isHov) {
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor + "20"; ctx.fill();
      }

      // Main circle
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = nodeColor; ctx.lineWidth = isHov ? 2.5 : 1.5; ctx.fill(); ctx.stroke();

      // Colored left-half fill to show risk intensity
      ctx.save(); ctx.beginPath(); ctx.arc(n.x, n.y, r - 1.5, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = nodeColor + (n.maxRisk >= 70 ? "18" : n.maxRisk >= 40 ? "10" : "08");
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
      ctx.restore();

      // Name inside
      ctx.fillStyle = "#1e293b"; ctx.font = "bold 7px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const name = n.label.length > 9 ? n.label.slice(0, 8) + "…" : n.label;
      ctx.fillText(name, n.x, n.y - 3);

      // Amount below name
      const amt = n.totalAmount >= 1000 ? `₹${(n.totalAmount / 1000).toFixed(0)}K` : `₹${n.totalAmount}`;
      ctx.fillStyle = "#64748b"; ctx.font = "6px system-ui";
      ctx.fillText(amt, n.x, n.y + 5);

      // Risk score at bottom
      ctx.fillStyle = nodeColor; ctx.font = "bold 6px system-ui";
      ctx.fillText(`Risk ${n.maxRisk}`, n.x, n.y + 12);
    });

    ctx.restore();
  }, [nodes, edges, zoom, pan, hovered, groupFilter, autoFit]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const totalScale = autoFit.scale * zoom;
    const totalOx = autoFit.ox + pan.x;
    const totalOy = autoFit.oy + pan.y;
    const mx = (e.clientX - rect.left - totalOx) / totalScale;
    const my = (e.clientY - rect.top - totalOy) / totalScale;
    setHovered(nodes.find((n) => {
      const r = 18 + Math.min(n.txCount, 8) * 1.5;
      return Math.hypot(n.x - mx, n.y - my) < r + 4;
    })?.id || null);
    if (dragRef.current) setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); setSearch(""); setRiskFilter("all"); setGroupFilter("all"); };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center"><GitBranch className="h-5 w-5 text-white" /></div>
              Network Graph
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Fraud network visualization — {stats.nodes} accounts, {stats.edges} links</p>
          </div>
        </div>

        {/* Group filter chips */}
        <div className="flex flex-wrap gap-2">
          {GROUP_FILTERS.map((gf) => (
            <button key={gf.key} onClick={() => setGroupFilter(gf.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${groupFilter === gf.key ? "bg-slate-800 text-white border-slate-700 shadow-md" : "bg-white/80 text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              <span>{gf.icon}</span> {gf.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${groupFilter === gf.key ? "bg-white/20" : "bg-slate-100"}`}>{groupCounts[gf.key] || 0}</span>
            </button>
          ))}
        </div>

        {/* Search + risk + zoom */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search UPI ID..." className="pl-9 bg-white border-slate-200 h-9 text-sm" /></div>
            <Select value={riskFilter} onValueChange={setRiskFilter}><SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Risk" /></SelectTrigger><SelectContent><SelectItem value="all">All Risk</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}><ZoomIn className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}><ZoomOut className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={reset}><Maximize2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent></Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Accounts</p><p className="text-2xl font-bold text-slate-800 mt-1">{stats.nodes}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-red-200/50"><CardContent className="p-4"><p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">High Risk</p><p className="text-2xl font-bold text-red-600 mt-1">{stats.high}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-amber-200/50"><CardContent className="p-4"><p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Medium</p><p className="text-2xl font-bold text-amber-600 mt-1">{stats.medium}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-emerald-200/50"><CardContent className="p-4"><p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Low Risk</p><p className="text-2xl font-bold text-emerald-600 mt-1">{stats.low}</p></CardContent></Card>
        </div>

        <div className="relative">
          {loading ? <Skeleton className="h-[550px] w-full rounded-2xl" /> : (
            <canvas ref={canvasRef} className="w-full h-[550px] rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 cursor-grab active:cursor-grabbing"
              onMouseMove={handleMouseMove} onMouseDown={() => { dragRef.current = true; }} onMouseUp={() => { dragRef.current = false; }} onMouseLeave={() => { dragRef.current = false; setHovered(null); }} />
          )}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 z-10 text-xs text-slate-700 space-y-1">
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> High</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Med</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
            </div>
            <p className="text-slate-400 text-[10px]">→ Arrow = flow · Line width = amount · Node size = tx count</p>
          </div>
          {hovered && (() => {
            const n = nodes.find((x) => x.id === hovered);
            if (!n) return null;
            const nc = COLORS[n.maxRisk >= 70 ? "high" : n.maxRisk >= 40 ? "medium" : "low"];
            return (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg px-4 py-3 z-10 min-w-[220px]">
                <p className="font-bold text-sm text-slate-800">{hovered}</p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Transactions</span><span className="text-slate-800 font-semibold">{n.txCount}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><span className="text-slate-800 font-semibold">Rs.{n.totalAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Max Risk</span><span style={{ color: nc }} className="font-bold">{n.maxRisk}/100</span></div>
                  {n.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200">
                      {n.tags.map((t) => <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: (GROUP_COLORS[t] || "#475569") + "15", color: GROUP_COLORS[t] || "#64748b" }}>{t.replace("_", " ")}</span>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </AdminLayout>
  );
}
