import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import AdminLayout from '../AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, RefreshCw, Search, Shield, Zap } from 'lucide-react';
import { seedTransactions } from './seedFirestore';

const g = (d, camel, snake) => d?.[camel] ?? d?.[snake];

function calcRisk(tx) {
  const md = tx.modelData || {};
  let s = 10;
  if (g(md, 'recipientBlacklistStatus', 'recipient_blacklist_status') == 1) s += 35;
  if (g(md, 'vpnProxyUsage', 'vpn_proxy_usage') == 1) s += 20;
  if ((g(md, 'geoLocationFlags', 'geo_location_flags')) === 'high-risk') s += 20;
  if (g(md, 'highRiskTransactionTimes', 'high_risk_transaction_times') == 1) s += 15;
  if (g(md, 'pastFraudulentBehavior', 'past_fraudulent_behavior_flags') == 1) s += 25;
  if ((tx.amount || tx.amount_inr) > 5000) s += 10;
  return Math.min(s, 100);
}

function riskLevel(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

const riskColors = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-emerald-500' };
const badgeStyles = {
  high: 'bg-red-100 text-red-700 hover:bg-red-100',
  medium: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  low: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
};

function relTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function LiveTransactions() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    seedTransactions();
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const enriched = useMemo(() => txs.map((tx) => {
    const score = calcRisk(tx);
    return { ...tx, riskScore: score, riskLevel: riskLevel(score) };
  }), [txs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter((tx) =>
      (tx.senderUPI || tx.sender_upi || '').toLowerCase().includes(q) ||
      (tx.recipientUPI || tx.recipient_upi || '').toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const stats = useMemo(() => {
    const high = enriched.filter((t) => t.riskLevel === 'high').length;
    const blocked = enriched.filter((t) => (t.status || t.transaction_status) === 'blocked' || t.riskScore >= 70).length;
    const volume = enriched.reduce((s, t) => s + (t.amount || t.amount_inr || 0), 0);
    return { total: enriched.length, high, blocked, volume };
  }, [enriched]);

  const statCards = [
    { label: 'Total Transactions', value: stats.total, icon: Activity, color: 'text-blue-600 bg-blue-100' },
    { label: 'High Risk', value: stats.high, icon: Zap, color: 'text-red-600 bg-red-100' },
    { label: 'Blocked', value: stats.blocked, icon: Shield, color: 'text-amber-600 bg-amber-100' },
    { label: 'Volume', value: `₹${stats.volume.toLocaleString('en-IN')}`, icon: Activity, color: 'text-emerald-600 bg-emerald-100' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Live Transactions</h1>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>
              <p className="text-sm text-slate-500">Real-time UPI transaction monitoring</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => setLoading(true)}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="bg-white/80 backdrop-blur border-slate-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search UPI ID..."
            className="pl-9 border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Feed */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-10">No transactions found</p>
          ) : (
            filtered.map((tx) => (
              <Card key={tx.id} className={`bg-white/80 backdrop-blur border-slate-200/50 border-l-4 ${riskColors[tx.riskLevel]}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">
                      {tx.senderUPI || tx.sender_upi || '—'} → {tx.recipientUPI || tx.recipient_upi || '—'}
                    </p>
                    <p className="text-xs text-slate-400">{relTime(tx.createdAt || tx.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-slate-800">₹{(tx.amount || tx.amount_inr || 0).toLocaleString('en-IN')}</p>
                    <div className="text-right">
                      <Badge className={`${badgeStyles[tx.riskLevel]} text-xs`}>{tx.riskLevel.toUpperCase()}</Badge>
                      <p className="text-[10px] text-slate-400 mt-1">Score: {tx.riskScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
