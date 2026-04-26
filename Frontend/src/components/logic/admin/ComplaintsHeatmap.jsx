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
import { MapPin, RefreshCw, Search, X, Locate } from "lucide-react";

const SEV = { high: "bg-red-100 text-red-700 border-red-200", medium: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-emerald-100 text-emerald-700 border-emerald-200" };
const STAT_B = { open: "bg-blue-50 text-blue-600 border-blue-200", investigating: "bg-purple-50 text-purple-600 border-purple-200", resolved: "bg-emerald-50 text-emerald-600 border-emerald-200", escalated: "bg-red-50 text-red-600 border-red-200" };

export default function ComplaintsHeatmap() {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layersRef = useRef([]);
  const [data, setData] = useState({ complaints: [], aggregated: [], total: 0, totalAll: 0 });
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); apiGet("/api/heatmap/complaints").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const cities = useMemo(() => [...new Set(data.aggregated.map((a) => a.city))].sort(), [data.aggregated]);

  // Filter complaints for the list
  const filtered = useMemo(() => data.complaints.filter((c) => {
    if (sevFilter !== "all" && c.severity !== sevFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (cityFilter !== "all" && c.city !== cityFilter) return false;
    if (search && !JSON.stringify(c).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [data.complaints, sevFilter, statusFilter, cityFilter, search]);

  // Re-aggregate based on filtered complaints for the MAP
  const filteredAgg = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      if (!map[c.city]) map[c.city] = { city: c.city, state: c.state, lat: 0, lng: 0, count: 0, totalAmount: 0, n: 0 };
      map[c.city].count++; map[c.city].totalAmount += c.amount; map[c.city].lat += c.lat; map[c.city].lng += c.lng; map[c.city].n++;
    });
    return Object.values(map).map((v) => ({ ...v, lat: v.lat / v.n, lng: v.lng / v.n, avgAmount: Math.round(v.totalAmount / v.count) }));
  }, [filtered]);

  // Draw/redraw map layers when filteredAgg changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletRef.current) {
      const map = L.map(mapRef.current, { scrollWheelZoom: true, zoomControl: false }).setView([22.5, 80], 5);
      leafletRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: '&copy; CARTO', maxZoom: 18 }).addTo(map);
      const style = document.createElement("style");
      style.id = "complaints-tooltip-css";
      style.textContent = `.leaflet-tooltip-custom{background:#fff!important;color:#1e293b!important;border:1px solid #e2e8f0!important;border-radius:8px!important;padding:8px 12px!important;font-size:12px!important;font-family:system-ui!important;box-shadow:0 8px 24px rgba(0,0,0,0.12)!important;line-height:1.5!important}.leaflet-tooltip-custom::before{border-top-color:#fff!important}`;
      document.head.appendChild(style);
    }

    const map = leafletRef.current;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    if (!filteredAgg.length) return;

    const maxCount = Math.max(...filteredAgg.map((a) => a.count), 1);

    filteredAgg.forEach((a) => {
      const intensity = a.count / maxCount;
      const r = 15000 + intensity * 55000;
      const color = intensity > 0.7 ? "#dc2626" : intensity > 0.4 ? "#f97316" : intensity > 0.2 ? "#eab308" : "#22c55e";

      const glow = L.circle([a.lat, a.lng], { radius: r * 1.5, color: "transparent", fillColor: color, fillOpacity: 0.06, weight: 0 }).addTo(map);
      const mid = L.circle([a.lat, a.lng], { radius: r, color: "transparent", fillColor: color, fillOpacity: 0.15, weight: 0 }).addTo(map);
      const core = L.circle([a.lat, a.lng], { radius: r * 0.5, color: color, fillColor: color, fillOpacity: 0.3, weight: 1 }).addTo(map);
      const dot = L.circleMarker([a.lat, a.lng], { radius: 5, color: "#fff", fillColor: color, fillOpacity: 1, weight: 1.5 })
        .addTo(map)
        .on("click", () => { setCityFilter(a.city); map.flyTo([a.lat, a.lng], 9, { duration: 0.8 }); })
        .bindTooltip(
          `<strong>${a.city}</strong>, ${a.state}<br/>` +
          `<span style="color:${color};font-weight:700">${a.count} complaints</span><br/>` +
          `Avg Rs.${a.avgAmount?.toLocaleString()}`,
          { direction: "top", className: "leaflet-tooltip-custom" }
        );
      layersRef.current.push(glow, mid, core, dot);
    });

    if (filteredAgg.length > 1) {
      map.flyToBounds(L.latLngBounds(filteredAgg.map((a) => [a.lat, a.lng])).pad(0.15), { duration: 0.8 });
    } else if (filteredAgg.length === 1) {
      map.flyTo([filteredAgg[0].lat, filteredAgg[0].lng], 9, { duration: 0.8 });
    }
  }, [filteredAgg]);

  useEffect(() => () => {
    if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    document.getElementById("complaints-tooltip-css")?.remove();
  }, []);

  const resetAll = () => { setSearch(""); setSevFilter("all"); setStatusFilter("all"); setCityFilter("all"); leafletRef.current?.flyTo([22.5, 80], 5, { duration: 0.8 }); };

  const byStatus = {};
  filtered.forEach((c) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center"><MapPin className="h-5 w-5 text-white" /></div>
              Complaints Heatmap
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">{filtered.length} of {data.totalAll || data.total} complaints</p>
          </div>
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search complaints..." className="pl-9 bg-white border-slate-200 h-9 text-sm" /></div>
            <Select value={sevFilter} onValueChange={setSevFilter}><SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Severity" /></SelectTrigger><SelectContent><SelectItem value="all">All Severity</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-40 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="escalated">Escalated</SelectItem></SelectContent></Select>
            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); if (v !== "all") { const a = data.aggregated.find((x) => x.city === v); if (a) leafletRef.current?.flyTo([a.lat, a.lng], 9, { duration: 0.8 }); } }}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {(search || sevFilter !== "all" || statusFilter !== "all" || cityFilter !== "all") && <Button variant="ghost" size="sm" onClick={resetAll}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent></Card>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Filtered</p><p className="text-2xl font-bold text-slate-800 mt-1">{filtered.length}</p></CardContent></Card>
          {Object.entries(byStatus).slice(0, 4).map(([k, v]) => (
            <Card key={k} className="bg-white/80 backdrop-blur border-slate-200/50"><CardContent className="p-4"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider capitalize">{k}</p><p className="text-2xl font-bold text-slate-800 mt-1">{v}</p></CardContent></Card>
          ))}
        </div>

        <div className="relative">
          {loading ? <div className="h-[520px] rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">Loading map...</div>
            : <div ref={mapRef} className="h-[520px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-200" />}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md px-4 py-3 flex gap-4 text-xs text-slate-700 z-[1000]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low</span>
          </div>
          <Button variant="outline" size="sm" className="absolute top-4 right-4 z-[1000] bg-white/90 shadow-md h-8 text-xs gap-1" onClick={resetAll}><Locate className="h-3.5 w-3.5" /> Reset</Button>
        </div>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm"><CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {filtered.slice(0, 60).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-all cursor-pointer"
                onClick={() => { setCityFilter(c.city); const a = data.aggregated.find((x) => x.city === c.city); if (a) leafletRef.current?.flyTo([a.lat, a.lng], 9, { duration: 0.8 }); }}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.severity === "high" ? "bg-red-500" : c.severity === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{c.type}</span>
                    <Badge className={SEV[c.severity]}>{c.severity}</Badge>
                    <Badge variant="outline" className={STAT_B[c.status]}>{c.status}</Badge>
                    <span className="text-[10px] text-slate-400">{c.city}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{c.complainant} · Rs.{c.amount?.toLocaleString()} · {c.date}</p>
                </div>
              </div>
            ))}
            {filtered.length > 60 && <p className="text-center text-xs text-slate-400 py-3">Showing 60 of {filtered.length}</p>}
            {!filtered.length && <p className="text-center text-slate-400 py-10">No complaints match filters</p>}
          </div>
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
