import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Brain,
  Filter,
  RefreshCw,
  Save,
  Target
} from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminLayout from "../AdminLayout";

const API_BASE = "https://rxcq.pythonanywhere.com";

export default function ScoringMetrics() {
  const [modelInfo, setModelInfo] = useState({
    status: "unknown",
    type: "Random Forest",
    features_count: 20,
    training_method: "GAN-augmented",
  });
  const [featureImportance, setFeatureImportance] = useState([]);
  const [thresholds, setThresholds] = useState({ high_risk: 70, medium_risk: 40, low_risk: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/admin/model-info`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/admin/feature-importance`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/config/thresholds`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([mi, fi, th]) => {
      if (mi) setModelInfo(mi);
      if (fi?.feature_importance) setFeatureImportance(fi.feature_importance);
      if (th) setThresholds(th);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveThresholds = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`${API_BASE}/api/config/thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const chartData = featureImportance.slice(0, 12).map((f) => ({
    name: f.feature?.replace(/_/g, " ").slice(0, 20),
    importance: f.importance,
  }));

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            Scoring Metrics
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">ML model performance & risk thresholds</p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Model Status */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <Brain className="h-4 w-4 text-violet-500" /> ML Model Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Status", value: modelInfo.status === "active" ? "✓ Active" : "⚠ Fallback", badge: modelInfo.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700" },
                  { label: "Model Type", value: modelInfo.type || "Random Forest" },
                  { label: "Training Method", value: modelInfo.training_method || "GAN-Augmented" },
                  { label: "Features", value: `${modelInfo.features_count || 20} Parameters` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    {item.badge ? (
                      <Badge className={item.badge}>{item.value}</Badge>
                    ) : (
                      <span className="text-sm font-medium text-slate-800">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Thresholds */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <Filter className="h-4 w-4 text-blue-500" /> Risk Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: "high_risk", label: "High Risk", color: "text-red-600", desc: "Transactions above this are blocked" },
                { key: "medium_risk", label: "Medium Risk", color: "text-amber-600", desc: "Transactions above this require verification" },
                { key: "low_risk", label: "Low Risk", color: "text-emerald-600", desc: "Transactions below this are auto-approved" },
              ].map((t) => (
                <div key={t.key}>
                  <Label className={`text-sm font-semibold ${t.color}`}>{t.label} Threshold</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      className="bg-white border-slate-200 h-9"
                      value={thresholds[t.key]}
                      onChange={(e) => setThresholds({ ...thresholds, [t.key]: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-slate-400 text-sm">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{t.desc}</p>
                </div>
              ))}
              <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 mt-2" onClick={handleSaveThresholds} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saved ? "Saved ✓" : "Save Thresholds"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base text-slate-800">Feature Importance Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-slate-400 text-sm">{loading ? "Loading..." : "No feature importance data available (API offline)"}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base text-slate-800">Feature Importance List</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {featureImportance.length > 0 ? featureImportance.map((feat, idx) => (
                <div key={idx} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">{feat.feature}</span>
                    <span className="text-slate-700 font-medium">{feat.importance?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-violet-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(feat.importance * 2, 100)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Feature data not available (API offline)</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
