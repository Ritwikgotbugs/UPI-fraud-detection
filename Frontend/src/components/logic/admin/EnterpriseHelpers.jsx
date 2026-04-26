import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

export const STATUS_STYLE = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-emerald-100 text-emerald-800 border-emerald-300",
  active: "bg-emerald-100 text-emerald-800 border-emerald-300",
  warning: "bg-amber-100 text-amber-800 border-amber-300",
  degraded: "bg-orange-100 text-orange-800 border-orange-300",
  disabled: "bg-slate-200 text-slate-700 border-slate-300",
  enabled: "bg-blue-100 text-blue-800 border-blue-300",
  investigating: "bg-purple-100 text-purple-800 border-purple-300",
  resolved: "bg-teal-100 text-teal-800 border-teal-300",
  escalated: "bg-rose-100 text-rose-800 border-rose-300",
  flagged: "bg-orange-100 text-orange-800 border-orange-300",
  blocked: "bg-red-200 text-red-900 border-red-400",
  under_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  acknowledged: "bg-sky-100 text-sky-800 border-sky-300",
  dismissed: "bg-gray-100 text-gray-700 border-gray-300",
  open: "bg-blue-100 text-blue-800 border-blue-300",
  triaged: "bg-indigo-100 text-indigo-800 border-indigo-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  running: "bg-blue-100 text-blue-800 border-blue-300",
  queued: "bg-slate-100 text-slate-700 border-slate-300",
  paused: "bg-amber-100 text-amber-800 border-amber-300",
  draft: "bg-slate-100 text-slate-600 border-slate-300",
  trial: "bg-violet-100 text-violet-800 border-violet-300",
  suspended: "bg-red-100 text-red-800 border-red-300",
  enterprise: "bg-indigo-100 text-indigo-800 border-indigo-300",
  professional: "bg-cyan-100 text-cyan-800 border-cyan-300",
  starter: "bg-slate-100 text-slate-700 border-slate-300",
  revoked: "bg-red-100 text-red-800 border-red-300",
  expired: "bg-gray-200 text-gray-700 border-gray-300",
  locked: "bg-red-200 text-red-900 border-red-400",
  overdue: "bg-red-100 text-red-800 border-red-300",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300",
};

export const smartFormat = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toFixed(2);
  return String(value);
};

export const toCsv = (rows) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escaped = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escaped(row[h])).join(","))].join("\n");
};

export const downloadCsv = (filename, rows) => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const inferCategory = (config) => {
  const t = String(config?.title || "").toLowerCase();
  if (["risk events", "devices", "customers", "alerts"].some((k) => t.includes(k))) return "investigation";
  if (["analytics", "reports", "learning", "heat map", "experiments", "challenge analytics"].some((k) => t.includes(k))) return "analytics";
  if (["scoring", "weights", "rules", "settings", "providers", "keys", "secret questions", "intelligence", "tools", "retention", "signatures"].some((k) => t.includes(k))) return "configuration";
  if (["users", "tenants", "audit"].some((k) => t.includes(k))) return "administration";
  if (["hub", "health", "import"].some((k) => t.includes(k))) return "operations";
  if (t.includes("compliance")) return "compliance";
  return config?.mode === "dashboard" ? "analytics" : "generic";
};

// Each category gets a COMPLETELY different header style
export const CATEGORY_HEADER = {
  investigation: { bg: "bg-gradient-to-r from-red-600 via-rose-600 to-pink-600", text: "text-white", sub: "text-red-100", icon: "🔍", accent: "border-red-400" },
  analytics: { bg: "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600", text: "text-white", sub: "text-cyan-100", icon: "📊", accent: "border-cyan-400" },
  configuration: { bg: "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600", text: "text-white", sub: "text-violet-100", icon: "⚙️", accent: "border-violet-400" },
  administration: { bg: "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600", text: "text-white", sub: "text-emerald-100", icon: "👥", accent: "border-emerald-400" },
  operations: { bg: "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500", text: "text-white", sub: "text-amber-100", icon: "🔧", accent: "border-amber-400" },
  compliance: { bg: "bg-gradient-to-r from-indigo-600 via-blue-700 to-slate-700", text: "text-white", sub: "text-indigo-100", icon: "🛡️", accent: "border-indigo-400" },
  generic: { bg: "bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600", text: "text-white", sub: "text-slate-200", icon: "📋", accent: "border-slate-400" },
};

// Each category gets different stat card colors
export const CATEGORY_STAT_STYLE = {
  investigation: ["bg-red-50 border-red-200", "bg-orange-50 border-orange-200", "bg-amber-50 border-amber-200", "bg-rose-50 border-rose-200"],
  analytics: ["bg-cyan-50 border-cyan-200", "bg-blue-50 border-blue-200", "bg-indigo-50 border-indigo-200", "bg-sky-50 border-sky-200"],
  configuration: ["bg-violet-50 border-violet-200", "bg-purple-50 border-purple-200", "bg-fuchsia-50 border-fuchsia-200", "bg-pink-50 border-pink-200"],
  administration: ["bg-emerald-50 border-emerald-200", "bg-green-50 border-green-200", "bg-teal-50 border-teal-200", "bg-lime-50 border-lime-200"],
  operations: ["bg-amber-50 border-amber-200", "bg-orange-50 border-orange-200", "bg-yellow-50 border-yellow-200", "bg-red-50 border-red-200"],
  compliance: ["bg-indigo-50 border-indigo-200", "bg-blue-50 border-blue-200", "bg-slate-50 border-slate-200", "bg-sky-50 border-sky-200"],
  generic: ["bg-slate-50 border-slate-200", "bg-gray-50 border-gray-200", "bg-zinc-50 border-zinc-200", "bg-neutral-50 border-neutral-200"],
};

export const CATEGORY_TABLE_HEADER = {
  investigation: "bg-red-50 text-red-900",
  analytics: "bg-cyan-50 text-cyan-900",
  configuration: "bg-violet-50 text-violet-900",
  administration: "bg-emerald-50 text-emerald-900",
  operations: "bg-amber-50 text-amber-900",
  compliance: "bg-indigo-50 text-indigo-900",
  generic: "bg-slate-50 text-slate-900",
};

const PIE_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export function DashboardSection({ data }) {
  const trendData = Array.isArray(data?.trend) ? data.trend : [];
  const riskData = Array.isArray(data?.risk_distribution) ? data.risk_distribution : [];
  const systemConnections = Array.isArray(data?.system_connections) ? data.system_connections : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-base">Assessment Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bucket" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="assessments" stroke="#3b82f6" fill="url(#areaGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="latencyMs" stroke="#14b8a6" fill="none" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>
                  {riskData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-base">System Connections</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {systemConnections.map((conn, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-600">{conn.name}</span>
                  <Badge className={STATUS_STYLE[conn.status] || "bg-slate-100 text-slate-700 border-slate-200"}>{conn.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function InvestigationCharts({ items }) {
  const riskDist = items.reduce((acc, r) => { const k = r.riskLevel || "unknown"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const pieData = Object.entries(riskDist).map(([name, value]) => ({ name, value }));
  const statusDist = items.reduce((acc, r) => { const k = r.status || "unknown"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const barData = Object.entries(statusDist).map(([name, count]) => ({ name, count }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="border-red-200 shadow-sm">
        <CardHeader><CardTitle className="text-base text-red-900">Risk Level Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="border-red-200 shadow-sm">
        <CardHeader><CardTitle className="text-base text-red-900">Status Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" />
              <XAxis dataKey="name" stroke="#991b1b" fontSize={11} />
              <YAxis stroke="#991b1b" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function ConfigToggleGrid({ items, columns }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.slice(0, 30).map((item) => {
        const isOn = item.enabled === true || item.active === true;
        return (
          <div key={item.id} className={`rounded-lg border-2 p-4 transition-all ${isOn ? "border-violet-300 bg-violet-50/50" : "border-slate-200 bg-slate-50/50"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800 truncate">{item[columns[0]] || item.id}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOn ? "bg-violet-200 text-violet-800" : "bg-slate-200 text-slate-600"}`}>
                {isOn ? "ON" : "OFF"}
              </span>
            </div>
            <div className="space-y-1">
              {columns.slice(1, 4).map((col) => (
                <div key={col} className="flex justify-between text-xs">
                  <span className="text-slate-500 capitalize">{col.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-slate-700 font-medium">{smartFormat(item[col])}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HealthGrid({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((svc) => {
        const statusColor = svc.status === "active" ? "border-emerald-400 bg-emerald-50" : svc.status === "degraded" ? "border-orange-400 bg-orange-50" : "border-amber-400 bg-amber-50";
        return (
          <Card key={svc.id} className={`border-2 ${statusColor} shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-800">{svc.service}</span>
                <Badge className={STATUS_STYLE[svc.status] || "bg-slate-100 text-slate-700"}>{svc.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-slate-500">Latency</p><p className="text-sm font-bold text-slate-800">{svc.latencyMs}ms</p></div>
                <div><p className="text-[10px] text-slate-500">CPU</p><p className="text-sm font-bold text-slate-800">{svc.cpu}</p></div>
                <div><p className="text-[10px] text-slate-500">Memory</p><p className="text-sm font-bold text-slate-800">{svc.memory}</p></div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function AdminUserCards({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.slice(0, 30).map((u) => (
        <div key={u.id} className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              {(u.name || "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            <Badge className={STATUS_STYLE[u.status] || "bg-slate-100 text-slate-700"}>{u.status}</Badge>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{u.role}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{u.tenant}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComplianceTimeline({ items }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 20).map((req) => (
        <div key={req.id} className="flex items-start gap-4 p-4 rounded-lg border border-indigo-200 bg-white shadow-sm">
          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${req.status === "overdue" ? "bg-red-500" : req.status === "completed" ? "bg-emerald-500" : req.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{req.requestType}</span>
              <Badge className={STATUS_STYLE[req.status] || "bg-slate-100 text-slate-700"}>{req.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">Subject: {req.subjectRef} · Due: {req.dueDate}</p>
          </div>
          <Badge className={STATUS_STYLE[req.priority] || "bg-slate-100 text-slate-700"}>{req.priority}</Badge>
        </div>
      ))}
    </div>
  );
}
