import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AdminLayout from "../AdminLayout";
import { apiGet } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, RefreshCw, Search, X, Locate } from "lucide-react";

const COLOR = (s) => s >= 70 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#22c55e";

export default function RiskHeatmap() {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layersRef = useRef([]);
  const [allPoints, setAllPoints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [sizeBy, setSizeBy] = useState("events");

  const load = () => { setLoading(true); apiGet("/api/heatmap/risk").then((d) => { setAllPoints(d.points || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const states = useMemo(() => [...new Set(allPoints.map((p) => p.state))].sort(), [allPoints]);

  const filtered = useMemo(() => allPoints.filter((p) => {
    if (riskFilter === "high" && p.riskScore < 70) return false;
    if (riskFilter === "medium" && (p.riskScore < 40 || p.riskScore >= 70)) return false;
    if (riskFilter === "low" && p.riskScore >= 40) return false;
    if (stateFilter !== "all" && p.state !== stateFilter) return false;
    if (searchQ && !p.city.toLowerCase().includes(searchQ.toLowerCase()) && !p.state.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [allPoints, riskFilter, stateFilter, searchQ]);

  // Redraw map markers whenever filters change
  useEffect(() => {
    if (!mapRef.current) return;

    // Init map once
    if (!leafletRef.current) {
      const map = L.map(mapRef.current, { scrollWheelZoom: true, zoomControl: false }).setView([22.5, 80], 5);
      leafletRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: '&copy; CARTO', maxZoom: 18 }).addTo(map);
      const style = document.createElement("style");
      style.id = "heatmap-tooltip-css";
      style.textContent = `.leaflet-tooltip-custom{background:#fff!important;color:#1e293b!important;border:1px solid #e2e8f0!important;border-radius:8px!important;padding:8px 12px!important;font-size:12px!important;font-family:system-ui!important;box-shadow:0 8px 24px rgba(0,0,0,0.12)!important;line-height:1.5!important}.leaflet-tooltip-custom::before{border-top-color:#fff!important}`;
      document.head.appendChild(style);
    }

    const map = leafletRef.current;

    // Clear old layers
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    if (!filtered.length) return;

    filtered.forEach((p) => {
      const c = COLOR(p.riskScore);
      const val = sizeBy === "events" ? (p.totalEvents || 50) : sizeBy === "fraud" ? (p.fraudEvents || 1) * 50 : p.riskScore * 10;
      const r = Math.min(15000 + val * 18, 70000);

      const glow = L.circle([p.lat, p.lng], { radius: r * 1.5, color: "transparent", fillColor: c, fillOpacity: 0.07, weight: 0 }).addTo(map);
      const main = L.circle([p.lat, p.lng], { radius: r, color: c, fillColor: c, fillOpacity: 0.22, weight: 1.5 }).addTo(map);
      const dot = L.circleMarker([p.lat, p.lng], { radius: 6, color: "#fff", fillColor: c, fillOpacity: 1, weight: 2 })
        .addTo(map)
        .on("click", () => { setSelected(p); map.flyTo([p.lat, p.lng], 8, { duration: 0.8 }); })
        .bindTooltip(
          `<strong>${p.city}</strong>, ${p.state}<br/>` +
          `<span style="color:${c};font-weight:700">Risk: ${p.riskScore}</span> · ${p.totalEvents?.toLocaleString()} events<br/>` +
          `Fraud: ${p.fraudEvents} · Blocked: ${p.blockedTransactions}`,
          { direction: "top", className: "leaflet-tooltip-custom" }
        );
      layersRef.current.push(glow, main, dot);
    });

    // Fit bounds to filtered points
    if (filtered.length > 1) {
      const bounds = L.latLngBounds(filtered.map((p) => [p.lat, p.lng]));
      map.flyToBounds(bounds.pad(0.15), { duration: 0.8 });
    } else if (filtered.length === 1) {
      map.flyTo([filtered[0].lat, filtered[0].lng], 8, { duration: 0.8 });
    }
  }, [filtered, sizeBy]);

  // Cleanup
  useEffect(() => () => {
    if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    document.getElementById("heatmap-tooltip-css")?.remove();
  }, []);

  const flyToCity = (p) => {
    setSelected(p);
    leafletRef.current?.flyTo([p.lat, p.lng], 9, { duration: 0.8 });
  };

  const resetView = () => {
    setRiskFilter("all"); setStateFilter("all"); setSearchQ(""); setSelected(null);
    leafletRef.current?.flyTo([22.5, 80], 5, { duration: 0.8 });
  };

  const high = filtered.filter((p) => p.riskScore >= 70).length;
  const med = filtered.filter((p) => p.riskScore >= 40 && p.riskScore < 70).length;
  const low = filtered.filter((p) => p.riskScore < 40).length;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center"><Map className="h-5 w-5 text-white" /></div>
              India Risk Heatmap
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Showing {filtered.length} of {allPoints.length} cities</p>
          </div>
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search city or state..." className="pl-9 bg-white border-slate-200 h-9 text-sm" /></div>
            <Select value={riskFilter} onValueChange={setRiskFilter}><SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Risk Level" /></SelectTrigger><SelectContent><SelectItem value="all">All Risk</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            <Select value={stateFilter} onValueChange={setStateFilter}><SelectTrigger className="w-full sm:w-44 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="State" /></SelectTrigger><SelectContent><SelectItem value="all">All States</SelectItem>{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={sizeBy} onValueChange={setSizeBy}><SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Size by" /></SelectTrigger><SelectContent><SelectItem value="events">Size: Events</SelectItem><SelectItem value="fraud">Size: Fraud</SelectItem><SelectItem value="risk">Size: Risk Score</SelectItem></SelectContent></Select>
            {(searchQ || riskFilter !== "all" || stateFilter !== "all") && <Button variant="ghost" size="sm" onClick={resetView}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent></Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Showing</p><p className="text-2xl font-bold text-slate-800 mt-1">{filtered.length}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-red-200/50"><CardContent className="p-4"><p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">High Risk</p><p className="text-2xl font-bold text-red-600 mt-1">{high}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-amber-200/50"><CardContent className="p-4"><p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Medium</p><p className="text-2xl font-bold text-amber-600 mt-1">{med}</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-emerald-200/50"><CardContent className="p-4"><p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Low Risk</p><p className="text-2xl font-bold text-emerald-600 mt-1">{low}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 relative">
            {loading ? <div className="h-[620px] rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">Loading map...</div>
              : <div ref={mapRef} className="h-[620px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-200" />}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md px-4 py-3 flex gap-4 text-xs text-slate-700 z-[1000]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High ≥70</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Med ≥40</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low</span>
            </div>
            <Button variant="outline" size="sm" className="absolute top-4 right-4 z-[1000] bg-white/90 shadow-md h-8 text-xs gap-1" onClick={resetView}><Locate className="h-3.5 w-3.5" /> Reset</Button>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto">
            {selected && (
              <Card className="bg-white border-2 border-orange-300 shadow-md"><CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div><h3 className="font-bold text-slate-900 text-lg">{selected.city}</h3><p className="text-xs text-slate-500">{selected.state}</p></div>
                  <div className="text-right"><p className="text-3xl font-black" style={{ color: COLOR(selected.riskScore) }}>{selected.riskScore}</p><p className="text-[10px] text-slate-400 uppercase">Risk</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-[10px] text-slate-400">Events</p><p className="font-bold text-slate-800">{selected.totalEvents?.toLocaleString()}</p></div>
                  <div className="bg-red-50 rounded-lg p-2 text-center"><p className="text-[10px] text-red-400">Fraud</p><p className="font-bold text-red-600">{selected.fraudEvents}</p></div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center"><p className="text-[10px] text-amber-400">Blocked</p><p className="font-bold text-amber-600">{selected.blockedTransactions}</p></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Avg amount: <strong>Rs.{selected.avgAmount?.toLocaleString()}</strong></p>
                <p className="text-xs text-slate-500">Top threat: <strong className="text-slate-700">{selected.topFraudType}</strong></p>
              </CardContent></Card>
            )}
            {!selected && <p className="text-xs text-slate-400 text-center py-3">Click a city on the map</p>}
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1 pt-1">Cities ({filtered.length})</p>
            {[...filtered].sort((a, b) => b.riskScore - a.riskScore).map((p) => (
              <div key={p.id} onClick={() => flyToCity(p)}
                className={`rounded-lg border p-2.5 cursor-pointer transition-all hover:shadow ${selected?.id === p.id ? "border-orange-300 bg-orange-50/50" : "border-slate-200/50 bg-white/80"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: COLOR(p.riskScore) }} /><span className="font-medium text-slate-800 text-sm">{p.city}</span><span className="text-[10px] text-slate-400">{p.state}</span></div>
                  <Badge className={`text-[10px] ${p.riskScore >= 70 ? "bg-red-100 text-red-700 border-red-200" : p.riskScore >= 40 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>{p.riskScore}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
