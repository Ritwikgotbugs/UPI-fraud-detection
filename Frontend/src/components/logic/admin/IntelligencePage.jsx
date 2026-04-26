import { useEffect, useState } from "react";
import AdminLayout from "../AdminLayout";
import { apiGet, apiPost, apiDelete, apiPut } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Shield, X, RefreshCw, ChevronDown, ChevronRight, Globe, MapPin, Phone, CreditCard, AlertTriangle, Eye, EyeOff, Filter } from "lucide-react";

const TABS = [
  { key: "all", label: "All Threats", icon: Shield, color: "from-slate-700 to-zinc-800" },
  { key: "ips", label: "IP Addresses", icon: Globe, color: "from-blue-600 to-indigo-600" },
  { key: "pincodes", label: "Pincodes", icon: MapPin, color: "from-amber-500 to-orange-500" },
  { key: "phones", label: "Phone Numbers", icon: Phone, color: "from-green-600 to-emerald-600" },
  { key: "upis", label: "UPI IDs", icon: CreditCard, color: "from-purple-600 to-fuchsia-600" },
];

const SEV_BADGE = {
  critical: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  high: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  medium: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
};

const TYPE_META = {
  ip: {
    icon: Globe, label: "IP Address", color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    fields: (i) => [
      { label: "IP Address", value: i.value, mono: true },
      { label: "Threat Type", value: i.reason },
      { label: "Severity", value: i.severity, badge: true },
      { label: "Total Hits", value: i.hits?.toLocaleString() || "0" },
      { label: "Status", value: i.active ? "Active" : "Disabled" },
      { label: "Added By", value: i.addedBy || "system" },
      { label: "Date Added", value: i.addedAt },
      { label: "Geo Region", value: i.value?.startsWith("10.") ? "Private Range" : i.value?.startsWith("103.") ? "Asia-Pacific" : i.value?.startsWith("185.") ? "Europe" : i.value?.startsWith("45.") ? "North America" : "Global" },
    ],
  },
  pincode: {
    icon: MapPin, label: "Pincode", color: "text-amber-600", bg: "bg-amber-50 border-amber-200",
    fields: (i) => [
      { label: "Pincode", value: i.value, mono: true },
      { label: "City", value: i.city || "Unknown" },
      { label: "Threat Type", value: i.reason },
      { label: "Severity", value: i.severity, badge: true },
      { label: "Fraud Cases", value: i.fraudCount?.toLocaleString() || "0" },
      { label: "Date Added", value: i.addedAt },
    ],
  },
  phone: {
    icon: Phone, label: "Phone Number", color: "text-green-600", bg: "bg-green-50 border-green-200",
    fields: (i) => [
      { label: "Number", value: i.value, mono: true },
      { label: "Threat Type", value: i.reason },
      { label: "Severity", value: i.severity, badge: true },
      { label: "Reports Filed", value: i.reports?.toLocaleString() || "0" },
      { label: "Added By", value: i.addedBy || "system" },
      { label: "Date Added", value: i.addedAt },
    ],
  },
  upi: {
    icon: CreditCard, label: "UPI ID", color: "text-purple-600", bg: "bg-purple-50 border-purple-200",
    fields: (i) => [
      { label: "UPI ID", value: i.value, mono: true },
      { label: "Threat Type", value: i.reason },
      { label: "Severity", value: i.severity, badge: true },
      { label: "Fraud Amount", value: `Rs.${i.fraudAmount?.toLocaleString() || "0"}` },
      { label: "Victims", value: i.victims?.toLocaleString() || "0" },
      { label: "Added By", value: i.addedBy || "system" },
      { label: "Date Added", value: i.addedAt },
    ],
  },
};

const REASONS = {
  ip: ["Brute force attack", "Bot traffic", "Known proxy", "Tor exit node", "VPN endpoint", "Spam source", "DDoS origin"],
  pincode: ["High fraud density", "Synthetic ID cluster", "Money mule hub", "SIM swap hotspot", "Phishing origin"],
  phone: ["SIM swap fraud", "OTP interception", "Phishing calls", "Vishing attack", "Spam caller", "Fake KYC"],
  upi: ["Confirmed fraud recipient", "Money mule account", "Fake merchant", "Phishing UPI", "Impersonation", "Lottery scam"],
};

function ThreatRow({ item, onToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[item.type] || TYPE_META.ip;
  const Icon = meta.icon;
  const fields = meta.fields(item);

  return (
    <div className={`border-b border-slate-100 last:border-0 ${!item.active ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-all" onClick={() => setOpen(!open)}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
          <Icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-slate-900 text-sm">{item.value}</span>
            <Badge className={SEV_BADGE[item.severity] || SEV_BADGE.medium}>{item.severity}</Badge>
            {!item.active && <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[10px]">disabled</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex gap-3 text-xs text-slate-400 mr-2">
            {item.hits != null && <span>{item.hits} hits</span>}
            {item.fraudCount != null && <span>{item.fraudCount} cases</span>}
            {item.reports != null && <span>{item.reports} reports</span>}
            {item.victims != null && <span>{item.victims} victims</span>}
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className={`mx-4 mb-3 rounded-lg border p-4 ${meta.bg}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{f.label}</p>
                {f.badge ? (
                  <Badge className={`mt-1 ${SEV_BADGE[f.value] || SEV_BADGE.medium}`}>{f.value}</Badge>
                ) : (
                  <p className={`text-sm font-semibold text-slate-800 mt-0.5 ${f.mono ? "font-mono" : ""}`}>{f.value}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}>
              {item.active ? <><EyeOff className="h-3.5 w-3.5" /> Disable</> : <><Eye className="h-3.5 w-3.5" /> Enable</>}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("ip");
  const [addValue, setAddValue] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addSeverity, setAddSeverity] = useState("medium");
  const [addCity, setAddCity] = useState("");

  const load = () => {
    setLoading(true);
    apiGet("/api/intelligence", { tab }).then((d) => {
      setItems(d.items || []);
      if (d.counts) setCounts(d.counts);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [tab]);

  const filtered = items.filter((i) => {
    if (sevFilter !== "all" && i.severity !== sevFilter) return false;
    if (search && !JSON.stringify(i).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by reason for the current tab
  const byReason = {};
  const bySeverity = { critical: 0, high: 0, medium: 0 };
  items.forEach((i) => {
    byReason[i.reason] = (byReason[i.reason] || 0) + 1;
    if (bySeverity[i.severity] !== undefined) bySeverity[i.severity]++;
  });

  const handleAdd = async () => {
    if (!addValue.trim()) return;
    const payload = { type: addType, value: addValue.trim(), reason: addReason || "Manual entry", severity: addSeverity };
    if (addType === "pincode" && addCity) payload.city = addCity;
    await apiPost("/api/intelligence", payload);
    setAddValue(""); setAddReason(""); setShowAdd(false); load();
  };

  const handleDelete = async (id) => { await apiDelete(`/api/intelligence/${id}`); load(); };
  const handleToggle = async (id) => { await apiPut(`/api/intelligence/${id}/toggle`); load(); };

  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className={`w-9 h-9 bg-gradient-to-br ${activeTab?.color || "from-slate-700 to-zinc-800"} rounded-xl flex items-center justify-center`}>
                <Shield className="h-5 w-5 text-white" />
              </div>
              Threat Intelligence
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Blacklisted IPs, Pincodes, Phone Numbers & UPI IDs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
            <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4" /> Add Entry</Button>
          </div>
        </div>

        {/* Tab cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = t.key === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) || items.length : counts[t.key] || 0;
            return (
              <Card key={t.key} onClick={() => setTab(t.key)}
                className={`cursor-pointer transition-all ${tab === t.key ? "bg-white border-violet-300 shadow-md ring-1 ring-violet-200" : "bg-white/80 backdrop-blur border-slate-200/50 hover:border-slate-300"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Threat breakdown for current tab */}
        {Object.keys(byReason).length > 0 && (
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-3">Threat Breakdown</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(byReason).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between rounded-lg border border-slate-200/50 bg-white px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span className="text-xs text-slate-700 truncate">{reason}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 ml-2">{count}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                {Object.entries(bySeverity).map(([sev, count]) => (
                  <div key={sev} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${sev === "critical" ? "bg-red-500" : sev === "high" ? "bg-orange-500" : "bg-amber-500"}`} />
                    <span className="text-xs text-slate-500 capitalize">{sev}: <strong>{count}</strong></span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add form */}
        {showAdd && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm">Add to Blacklist</p>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Type</p>
                  <Select value={addType} onValueChange={setAddType}>
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ip">IP Address</SelectItem><SelectItem value="pincode">Pincode</SelectItem><SelectItem value="phone">Phone Number</SelectItem><SelectItem value="upi">UPI ID</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Value</p>
                  <Input value={addValue} onChange={(e) => setAddValue(e.target.value)} placeholder={addType === "ip" ? "e.g. 103.21.58.1" : addType === "pincode" ? "e.g. 400001" : addType === "phone" ? "e.g. +919876543210" : "e.g. scammer@okaxis"} className="h-9 text-sm bg-white border-slate-200" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Reason</p>
                  <Select value={addReason} onValueChange={setAddReason}>
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                    <SelectContent>{(REASONS[addType] || []).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Severity</p>
                  <Select value={addSeverity} onValueChange={setAddSeverity}>
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              {addType === "pincode" && <Input value={addCity} onChange={(e) => setAddCity(e.target.value)} placeholder="City name" className="h-9 text-sm bg-white border-slate-200 max-w-xs" />}
              <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleAdd}><Shield className="h-4 w-4" /> Add to Blacklist</Button>
            </CardContent>
          </Card>
        )}

        {/* Search + severity filter */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by value, reason, source..." className="pl-9 bg-white border-slate-200 h-9 text-sm" />
              </div>
              <Select value={sevFilter} onValueChange={setSevFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-sm bg-white border-slate-200">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" /><SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent><SelectItem value="all">All Severity</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem></SelectContent>
              </Select>
              {(search || sevFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSevFilter("all"); }}><X className="h-4 w-4" /></Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expandable threat list */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4 border-b border-slate-100"><Skeleton className="h-12 w-full" /></div>)}
              {!loading && filtered.map((item) => (
                <ThreatRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
              {!loading && !filtered.length && <p className="text-center text-slate-400 py-10">No entries found</p>}
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{filtered.length} entries</span>
                <span>{items.filter((i) => i.active).length} active &middot; {items.filter((i) => !i.active).length} disabled</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
