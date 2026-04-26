import { useEffect, useState } from "react";
import AdminLayout from "../AdminLayout";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Brain, RefreshCw } from "lucide-react";

export default function ReinforcementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet("/api/reinforcement").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const retrain = async () => {
    setRetraining(true);
    await apiPost("/api/reinforcement/retrain").catch(() => {});
    await load();
    setRetraining(false);
  };

  if (loading || !data) return (
    <AdminLayout>
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-80" />
      </div>
    </AdminLayout>
  );

  const { epochs, rulePerformance, confusionMatrix: cm, summary } = data;
  const latest = epochs[epochs.length - 1];
  const cmData = [
    { name: "True Pos", value: cm.tp, color: "#22c55e" },
    { name: "False Pos", value: cm.fp, color: "#f59e0b" },
    { name: "False Neg", value: cm.fn, color: "#ef4444" },
    { name: "True Neg", value: cm.tn, color: "#3b82f6" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center"><Brain className="h-5 w-5 text-white" /></div>
              Reinforcement Learning
            </h1>
            <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Model learns from {summary.totalSamplesProcessed?.toLocaleString()} samples across {summary.totalEpochs} epochs</p>
          </div>
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={retrain} disabled={retraining}>
            <RefreshCw className={`h-4 w-4 ${retraining ? "animate-spin" : ""}`} /> {retraining ? "Training..." : "Trigger Retrain"}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Card className="bg-white/80 backdrop-blur border-emerald-200/50"><CardContent className="p-4"><p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Accuracy</p><p className="text-2xl font-bold text-emerald-600 mt-1">{(latest.accuracy * 100).toFixed(1)}%</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-blue-200/50"><CardContent className="p-4"><p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Precision</p><p className="text-2xl font-bold text-blue-600 mt-1">{(latest.precision * 100).toFixed(1)}%</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-cyan-200/50"><CardContent className="p-4"><p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Recall</p><p className="text-2xl font-bold text-cyan-600 mt-1">{(latest.recall * 100).toFixed(1)}%</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-violet-200/50"><CardContent className="p-4"><p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">F1 Score</p><p className="text-2xl font-bold text-violet-600 mt-1">{(latest.f1Score * 100).toFixed(1)}%</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-amber-200/50"><CardContent className="p-4"><p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">False Pos</p><p className="text-2xl font-bold text-amber-600 mt-1">{(latest.falsePositiveRate * 100).toFixed(2)}%</p></CardContent></Card>
          <Card className="bg-white/80 backdrop-blur border-red-200/50"><CardContent className="p-4"><p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">False Neg</p><p className="text-2xl font-bold text-red-600 mt-1">{(latest.falseNegativeRate * 100).toFixed(2)}%</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Learning Curve (Accuracy & F1)</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={epochs}>
                  <defs>
                    <linearGradient id="accG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                    <linearGradient id="f1G" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0.6, 1]} stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                  <Legend />
                  <Area type="monotone" dataKey="accuracy" stroke="#22c55e" fill="url(#accG)" strokeWidth={2} name="Accuracy" />
                  <Area type="monotone" dataKey="f1Score" stroke="#3b82f6" fill="url(#f1G)" strokeWidth={2} name="F1 Score" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Error Rate Reduction</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={epochs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                  <Legend />
                  <Area type="monotone" dataKey="falsePositiveRate" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" name="False Positive" />
                  <Area type="monotone" dataKey="falseNegativeRate" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" name="False Negative" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Confusion Matrix</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200/50 p-3 text-center"><p className="text-[10px] text-emerald-500 font-semibold">True Pos</p><p className="text-xl font-bold text-emerald-700">{cm.tp}</p></div>
                <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3 text-center"><p className="text-[10px] text-amber-500 font-semibold">False Pos</p><p className="text-xl font-bold text-amber-700">{cm.fp}</p></div>
                <div className="rounded-lg bg-red-50 border border-red-200/50 p-3 text-center"><p className="text-[10px] text-red-500 font-semibold">False Neg</p><p className="text-xl font-bold text-red-700">{cm.fn}</p></div>
                <div className="rounded-lg bg-blue-50 border border-blue-200/50 p-3 text-center"><p className="text-[10px] text-blue-500 font-semibold">True Neg</p><p className="text-xl font-bold text-blue-700">{cm.tn}</p></div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={cmData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ value }) => value}>{cmData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2 bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Per-Rule Learning Performance</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rulePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="rule" width={120} stroke="#94a3b8" fontSize={10} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                  <Legend />
                  <Bar dataKey="initialAccuracy" fill="#cbd5e1" name="Initial" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="currentAccuracy" fill="#22c55e" name="Current" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Rule Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {rulePerformance.map((r) => (
                <div key={r.rule} className="rounded-lg border border-slate-200/50 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm capitalize">{r.rule.replace(/_/g, " ")}</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">+{(r.improvement * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Accuracy</span><span className="font-mono font-bold text-slate-700">{(r.currentAccuracy * 100).toFixed(1)}%</span></div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.currentAccuracy * 100}%` }} /></div>
                  <div className="flex gap-3 mt-2 text-xs text-slate-400"><span>{r.samplesProcessed.toLocaleString()} samples</span><span>{r.falsePositives} FP</span><span>{r.falseNegatives} FN</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Model Summary</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div><span className="text-slate-500">Version</span><p className="font-bold text-slate-800">{summary.modelVersion}</p></div>
              <div><span className="text-slate-500">Last Trained</span><p className="font-bold text-slate-800">{summary.lastTrainedAt}</p></div>
              <div><span className="text-slate-500">Improvement</span><p className="font-bold text-emerald-600">+{(summary.improvementFromBaseline * 100).toFixed(2)}%</p></div>
              <div><span className="text-slate-500">Total Samples</span><p className="font-bold text-slate-800">{summary.totalSamplesProcessed?.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
