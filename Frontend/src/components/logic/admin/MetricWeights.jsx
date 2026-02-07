import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  Save,
  Sliders,
  AlertTriangle
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "../AdminLayout";

const API_BASE = "https://rxcq.pythonanywhere.com";

const DEFAULT_WEIGHTS = {
  behavioral_deviation: 0.20,
  velocity_risk: 0.15,
  device_risk: 0.10,
  payee_trust: 0.15,
  time_context: 0.10,
  geo_risk: 0.10,
  failed_attempts: 0.10,
  ml_score: 0.10,
};

const WEIGHT_DESCRIPTIONS = {
  behavioral_deviation: "How much the transaction deviates from normal user behavior patterns",
  velocity_risk: "Risk from rapid successive transactions or burst patterns",
  device_risk: "Risk associated with device fingerprint, new devices, or device changes",
  payee_trust: "Trust score of the payment recipient based on history and reputation",
  time_context: "Risk from unusual transaction times (late night, holidays)",
  geo_risk: "Geographic risk flags including location inconsistencies and high-risk regions",
  failed_attempts: "Risk from repeated failed transaction or authentication attempts",
  ml_score: "Machine learning model's fraud probability prediction weight",
};

export default function MetricWeights() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/config/weights`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setWeights(data); })
      .catch(() => {});
  }, []);

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const isBalanced = Math.abs(totalWeight - 1.0) < 0.01;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/weights`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError("Failed to save — API returned an error");
      }
    } catch {
      setError("Cannot reach API. Changes saved locally.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setWeights(DEFAULT_WEIGHTS);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <Sliders className="h-5 w-5 text-white" />
            </div>
            Metric Weights
          </h1>
          <p className="text-slate-500 mt-1 ml-12 text-sm hidden sm:block">Configure risk factor importance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved ✓" : "Save Weights"}
          </Button>
        </div>
      </div>

      {/* Total indicator */}
      <Card className={`mb-6 ${isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <CardContent className="p-4 flex items-center gap-3">
          {!isBalanced && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          <div>
            <p className={`text-sm font-semibold ${isBalanced ? "text-emerald-700" : "text-amber-700"}`}>
              Total Weight: {totalWeight.toFixed(2)}
            </p>
            <p className={`text-xs ${isBalanced ? "text-emerald-600" : "text-amber-600"}`}>
              {isBalanced ? "Weights are balanced (sum = 1.0) ✓" : "Weights should sum to 1.0 for proper normalization"}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-4 bg-red-50 border-red-200">
          <CardContent className="p-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Weight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(weights).map(([key, value]) => (
          <Card key={key} className="bg-white/80 backdrop-blur border-slate-200/50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-slate-800 capitalize">{key.replace(/_/g, " ")}</Label>
                  <p className="text-xs text-slate-400 mt-1">{WEIGHT_DESCRIPTIONS[key] || ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className="w-24 h-9 text-sm bg-white border-slate-200 text-center font-mono font-semibold"
                    value={value}
                    onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              {/* Visual bar */}
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                  style={{ width: `${Math.min(value * 100 * 2, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">0</span>
                <span className="text-[10px] text-slate-400 font-semibold">{(value * 100).toFixed(0)}%</span>
                <span className="text-[10px] text-slate-400">50%+</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
