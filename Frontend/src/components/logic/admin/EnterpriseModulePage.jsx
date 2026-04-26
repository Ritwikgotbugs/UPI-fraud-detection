import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, RefreshCw, Search, Trash2 } from "lucide-react";
import AdminLayout from "../AdminLayout";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/apiClient";
import { getSeedData } from "./seedData";
import {
  STATUS_STYLE, smartFormat, downloadCsv, inferCategory,
  CATEGORY_HEADER, CATEGORY_STAT_STYLE, CATEGORY_TABLE_HEADER,
  DashboardSection, InvestigationCharts, ConfigToggleGrid,
  HealthGrid, AdminUserCards, ComplianceTimeline,
} from "./EnterpriseHelpers";

const ensureArray = (v) => (Array.isArray(v) ? v : []);

const normalizeStats = (stats) => {
  if (Array.isArray(stats)) return stats;
  if (stats && typeof stats === "object") return Object.entries(stats).map(([label, value]) => ({ label: label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), value }));
  return [];
};

function WeightsSection() {
  const [weights, setWeights] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet("/api/config/weights").then((res) => setWeights(res || {})).catch(() => setWeights({}));
  }, []);

  const onSave = async () => {
    setSaving(true);
    try { await apiPut("/api/config/weights", weights); } finally { setSaving(false); }
  };

  return (
    <Card className="border-violet-200 shadow-sm">
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(weights).map((key) => (
          <div key={key} className="space-y-2">
            <Label className="text-xs text-violet-600 uppercase tracking-wide font-semibold">{key.replaceAll("_", " ")}</Label>
            <Input type="number" step="0.01" value={weights[key]} onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })} className="border-violet-200 focus:border-violet-400" />
          </div>
        ))}
        <div className="md:col-span-2">
          <Button onClick={onSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? "Saving..." : "Save Weights"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoringMetricsSection() {
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    apiGet("/api/admin/model-info").then(setModelInfo).catch(() => setModelInfo(null));
  }, []);

  return (
    <Card className="border-violet-200 shadow-sm">
      <CardContent className="p-6 space-y-2">
        {Object.entries(modelInfo || {}).map(([k, v]) => (
          <div key={k} className="flex justify-between py-2 border-b border-violet-100 text-sm">
            <span className="text-violet-600">{k}</span>
            <span className="text-slate-800 font-medium">{smartFormat(v)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Lazy-load the map only for fraudHeatMap
let FraudMapComponent = null;
const loadFraudMap = () => {
  if (!FraudMapComponent) {
    FraudMapComponent = import("./FraudMap").then((m) => m.default);
  }
  return FraudMapComponent;
};

function FraudMapWrapper({ points }) {
  const [MapComp, setMapComp] = useState(null);
  useEffect(() => { loadFraudMap().then((C) => setMapComp(() => C)); }, []);
  if (!MapComp) return <div className="w-full h-[500px] rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">Loading map...</div>;
  return <MapComp points={points} />;
}

export default function EnterpriseModulePage({ config, configKey }) {
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const category = inferCategory(config);
  const header = CATEGORY_HEADER[category] || CATEGORY_HEADER.generic;
  const statStyles = CATEGORY_STAT_STYLE[category] || CATEGORY_STAT_STYLE.generic;
  const tableHeaderStyle = CATEGORY_TABLE_HEADER[category] || CATEGORY_TABLE_HEADER.generic;

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet(config.endpoint, search ? { search } : {});
      setData(res);
      setItems(ensureArray(res?.items));
    } catch {
      // API failed — use seed data
      const seed = getSeedData(configKey);
      setData(seed);
      setItems(ensureArray(seed?.items));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [config.endpoint]);

  // If API returned empty, backfill with seed data
  useEffect(() => {
    if (!loading && items.length === 0 && configKey) {
      const seed = getSeedData(configKey);
      if (seed.items?.length) {
        setData(seed);
        setItems(seed.items);
      }
    }
  }, [loading, items.length, configKey]);

  const statCards = useMemo(() => normalizeStats(data?.stats), [data?.stats]);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => JSON.stringify(i).toLowerCase().includes(q));
  }, [items, search]);

  const pagedItems = useMemo(() => filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredItems, page]);
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);

  const columns = useMemo(() => {
    if (config.columns?.length) return config.columns;
    if (!filteredItems.length) return [];
    return Object.keys(filteredItems[0]).filter((k) => k !== "id" && k !== "lat" && k !== "lng").slice(0, 8);
  }, [config.columns, filteredItems]);

  const toggleSelected = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const runAction = async (action) => {
    if (action === "export") { downloadCsv(`${config.title.toLowerCase().replaceAll(" ", "-")}.csv`, filteredItems); return; }
    if (!selectedIds.length && action !== "manual-aggregate") return;
    try {
      if (action === "manual-aggregate") await apiPost("/api/analytics/fraud-heat-map/aggregate", {});
      else await apiPost(`${config.endpoint}/actions`, { action, ids: selectedIds });
      setSelectedIds([]);
      await load();
    } catch { /* no-op */ }
  };

  const deleteSelected = async () => {
    for (const id of selectedIds) await apiDelete(`${config.endpoint}/${id}`).catch(() => null);
    setSelectedIds([]);
    load();
  };

  const isFraudMap = configKey === "fraudHeatMap";
  const isHealth = configKey === "health";
  const isUsers = configKey === "users";
  const isTenants = configKey === "tenants";
  const isCompliance = configKey === "compliance";
  const isDashboard = config.mode === "dashboard";
  const isWeights = config.mode === "weights";
  const isScoringMetrics = config.mode === "scoring-metrics";
  const isConfigPage = category === "configuration" && !isDashboard && !isWeights && !isScoringMetrics;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* UNIQUE HEADER per category */}
        <div className={`rounded-2xl ${header.bg} p-6 shadow-lg`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{header.icon}</span>
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold ${header.text} tracking-tight`}>{config.title}</h1>
                  <p className={`${header.sub} mt-1 text-sm`}>{config.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={load} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button onClick={() => downloadCsv(`${config.title.toLowerCase().replaceAll(" ", "-")}.csv`, filteredItems)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              {selectedIds.length > 0 && (
                <Button onClick={deleteSelected} className="bg-red-500 hover:bg-red-600 text-white gap-2">
                  <Trash2 className="h-4 w-4" /> Delete ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* STAT CARDS with category-specific colors */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((s, idx) => (
              <Card key={idx} className={`border ${statStyles[idx % statStyles.length]} shadow-sm`}>
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{smartFormat(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CATEGORY-SPECIFIC CONTENT SECTIONS */}
        {isDashboard && <DashboardSection data={data} />}
        {isWeights && <WeightsSection />}
        {isScoringMetrics && <ScoringMetricsSection />}

        {isFraudMap && (
          <Card className="border-cyan-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <FraudMapWrapper points={filteredItems} />
            </CardContent>
          </Card>
        )}

        {category === "investigation" && !isDashboard && <InvestigationCharts items={filteredItems} />}
        {isHealth && <HealthGrid items={filteredItems} />}
        {isCompliance && <ComplianceTimeline items={filteredItems} />}
        {(isUsers || isTenants) && <AdminUserCards items={filteredItems} />}
        {isConfigPage && <ConfigToggleGrid items={filteredItems} columns={columns} />}

        {/* SEARCH + ACTION BAR — only for table pages */}
        {!isDashboard && !isWeights && !isScoringMetrics && (
          <>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={`Search ${config.title.toLowerCase()}...`} className="pl-9" />
                  </div>
                  {(config.actionButtons || []).map((action) => (
                    <Button key={action} variant="outline" className="capitalize border-slate-300 text-slate-700 hover:bg-slate-100 font-medium" onClick={() => runAction(action)}>
                      {action.replaceAll("-", " ")}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* DATA TABLE */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className={tableHeaderStyle}>
                        <TableHead className="w-[48px]">Sel</TableHead>
                        {columns.map((col) => (
                          <TableHead key={col} className="capitalize font-semibold">{col.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-slate-500 py-10">Loading data...</TableCell></TableRow>
                      )}
                      {!loading && pagedItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/80">
                          <TableCell>
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} className="rounded" />
                          </TableCell>
                          {columns.map((col) => {
                            const value = item[col];
                            const lower = String(value ?? "").toLowerCase();
                            const style = STATUS_STYLE[lower];
                            return (
                              <TableCell key={`${item.id}-${col}`}>
                                {style ? <Badge className={style}>{smartFormat(value)}</Badge> : smartFormat(value)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      {!loading && !pagedItems.length && (
                        <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-slate-500 py-10">No records found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                    <span className="text-sm text-slate-500">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="text-slate-700">Prev</Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                        return (
                          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}
                            className={p === page ? `${header.bg} text-white` : "text-slate-700"}>
                            {p + 1}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="text-slate-700">Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
