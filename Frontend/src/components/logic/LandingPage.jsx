import { ArrowRight, BarChart3, Brain, CheckCircle2, ChevronRight, Eye, Github, Globe, Linkedin, Lock, Shield, Sparkles, Target, TrendingUp, Users, Zap } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

// Animated counter
function Counter({ end, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.max(1, Math.floor(end / 40));
        const id = setInterval(() => { start += step; if (start >= end) { setVal(end); clearInterval(id); } else setVal(start); }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// Animated risk score bar for the hero visual
function RiskBar({ label, score, delay }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score), delay); return () => clearTimeout(t); }, [score, delay]);
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 text-right truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${w}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold w-8 ${score >= 70 ? 'text-red-500' : score >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>{score}</span>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const go = () => navigate(user ? '/dashboard' : '/signin');

  const founders = [
    { name: 'Ritwik Sharma', role: 'Software Developer', image: '/assets/ritwik.png', bio: 'Full-stack developer passionate about AI/ML and building secure financial systems.', linkedin: 'https://linkedin.com/in/ritwik-sharma-8714b4221/', github: 'https://github.com/Ritwikgotbugs' },
    { name: 'Samyak Tripathi', role: 'Decision Analyst Associate', image: '/assets/samyak.png', bio: 'Decision analyst focused on developing intelligent fraud detection algorithms and data-driven solutions.', linkedin: 'https://www.linkedin.com/in/samyak-tripathi-97bab3251/', github: 'https://github.com/sammy-314' },
  ];

  // Floating bubbles background
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize();
    window.addEventListener('resize', resize);

    const bubbles = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 80 + 30,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.3 - 0.1,
      color: ['rgba(139,92,246,', 'rgba(99,102,241,', 'rgba(59,130,246,', 'rgba(236,72,153,', 'rgba(20,184,166,'][Math.floor(Math.random() * 5)],
      opacity: Math.random() * 0.12 + 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bubbles.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.y + b.r < 0) { b.y = canvas.height + b.r; b.x = Math.random() * canvas.width; }
        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color + b.opacity + ')';
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Animated bubbles bg */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-50 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Fraudulent<span className="text-violet-600">.ai</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-500 hover:text-slate-800 transition-colors">Features</button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-500 hover:text-slate-800 transition-colors">How It Works</button>
            <button onClick={() => document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-500 hover:text-slate-800 transition-colors">Team</button>
          </div>
          <Button onClick={go} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5">
            {user ? 'Dashboard' : 'Get Started'} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </nav>

      {/* Live threat ticker — full width, white */}
      <div className="relative z-40 w-full bg-white border-b border-slate-100 py-2.5 overflow-hidden">
        <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center gap-1.5 pl-4 pr-4 border-r border-slate-200">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-600 font-bold uppercase whitespace-nowrap">Live Threats Blocked</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-4 pl-4 animate-[scroll_25s_linear_infinite]">
              {['SIM Swap attempt blocked — Mumbai','VPN fraud intercepted — Rs.49,999','Blacklisted UPI rejected — Delhi','Burst attack stopped — 12 txns in 30s','Geo anomaly flagged — Bangalore→Chennai','Night raid blocked — Rs.75,000 at 2AM','Money mule chain detected — 8 accounts','Phishing UPI blocked — fake merchant','Account takeover prevented — OTP intercept','High-value transfer blocked — Rs.1,20,000','SIM Swap attempt blocked — Mumbai','VPN fraud intercepted — Rs.49,999','Blacklisted UPI rejected — Delhi','Burst attack stopped — 12 txns in 30s','Geo anomaly flagged — Bangalore→Chennai'].map((t, i) => (
                <div key={i} className="flex-shrink-0 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-slate-600 whitespace-nowrap">{t}</span>
                  <span className="text-slate-300 mx-1">·</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-12 pb-14">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-medium mb-4">
              <Sparkles className="w-3 h-3" /> AI-Powered Fraud Detection for UPI
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-4">
              Stop fraud<br />
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">before it happens</span>
            </h1>
            <p className="text-base text-slate-500 leading-relaxed mb-5 max-w-lg">
              Real-time ML analysis of 20 risk parameters. Detect, block, and learn from every fraudulent transaction — in under 200ms.
            </p>
            <div className="flex items-center gap-4 mb-5">
              <Button onClick={go} size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full px-8 shadow-xl shadow-violet-500/20">
                Start Free <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="ghost" size="lg" className="text-slate-600 rounded-full" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                See how it works
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 200ms response</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 95%+ accuracy</span>
            </div>
          </div>

          {/* Hero visual — live risk analysis mockup */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-violet-100/50 to-indigo-100/50 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-amber-500" /><div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-3 text-xs text-slate-400 font-mono">fraud_analysis.live</span>
                <div className="ml-auto flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-emerald-500">LIVE</span></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Transaction: <span className="text-slate-800 font-mono">aarav99@oksbi → unknown78@paytm</span></span>
                  <span className="text-red-500 font-bold">Rs.49,999</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Risk Score</p><p className="text-xl font-black text-red-500">87</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Confidence</p><p className="text-xl font-black text-amber-500">94%</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Action</p><p className="text-sm font-black text-red-500 mt-1">BLOCKED</p></div>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Feature Analysis</p>
                  <RiskBar label="Blacklist Match" score={95} delay={300} />
                  <RiskBar label="VPN Detected" score={82} delay={500} />
                  <RiskBar label="Geo Anomaly" score={78} delay={700} />
                  <RiskBar label="Device Trust" score={15} delay={900} />
                  <RiskBar label="Behavioral" score={23} delay={1100} />
                  <RiskBar label="Amount Risk" score={68} delay={1300} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="relative z-10 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: 95, suffix: '%+', label: 'Detection Accuracy', icon: Target, color: 'text-violet-600' },
            { value: 200, suffix: 'ms', prefix: '<', label: 'Response Time', icon: Zap, color: 'text-amber-600' },
            { value: 20, suffix: '+', label: 'Risk Parameters', icon: BarChart3, color: 'text-blue-600' },
            { value: 50, suffix: 'K+', label: 'Transactions Secured', icon: Shield, color: 'text-emerald-600' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
              <p className="text-3xl md:text-4xl font-extrabold text-slate-800"><Counter end={s.value} suffix={s.suffix} prefix={s.prefix} /></p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-12">

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-violet-600 mb-2">FEATURES</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">Everything you need to fight fraud</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: 'ML-Powered Detection', desc: 'Random Forest model trained on GAN-augmented data for superior accuracy on rare fraud patterns.', color: 'from-violet-500 to-purple-600' },
              { icon: Zap, title: 'Real-Time Scoring', desc: '20 risk parameters analyzed in under 200ms — behavioral biometrics, device fingerprinting, and more.', color: 'from-amber-500 to-orange-600' },
              { icon: Shield, title: 'Multi-Layer Defense', desc: 'Blacklist management, geo-fencing, VPN detection, and velocity checks working in concert.', color: 'from-emerald-500 to-teal-600' },
              { icon: Globe, title: 'Geo Intelligence', desc: 'Real-time heatmaps of fraud hotspots across India with city-level risk scoring.', color: 'from-blue-500 to-cyan-600' },
              { icon: TrendingUp, title: 'Reinforcement Learning', desc: 'Model continuously improves from production feedback — accuracy increases with every transaction.', color: 'from-rose-500 to-pink-600' },
              { icon: Eye, title: 'Network Analysis', desc: 'Visual graph of sender-recipient connections reveals fraud rings and money mule networks.', color: 'from-indigo-500 to-violet-600' },
            ].map((f, i) => (
              <div key={i} className="group p-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 bg-white">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-rose-600 mb-2">IMPACT</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">The Fraudulent.ai difference</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-4">❌ Without Fraudulent.ai</p>
              <div className="space-y-3">
                {[
                  ['Fraud Detection Rate', '22%'],
                  ['Response Time', '4.2 hours'],
                  ['False Positive Rate', '18%'],
                  ['Manual Reviews/month', '3,500+'],
                  ['Annual Fraud Loss', 'Rs.4.5 Crore'],
                  ['Customer Complaints', '850/month'],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-red-100 last:border-0">
                    <span className="text-sm text-red-800">{k}</span>
                    <span className="text-sm font-bold text-red-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">✅ With Fraudulent.ai</p>
              <div className="space-y-3">
                {[
                  ['Fraud Detection Rate', '95%+'],
                  ['Response Time', '<200ms'],
                  ['False Positive Rate', '3.2%'],
                  ['Manual Reviews/month', '120'],
                  ['Annual Fraud Loss', 'Rs.18 Lakh'],
                  ['Customer Complaints', '45/month'],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-emerald-100 last:border-0">
                    <span className="text-sm text-emerald-800">{k}</span>
                    <span className="text-sm font-bold text-emerald-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 p-4 text-center text-white">
              <p className="text-2xl font-extrabold">96%</p><p className="text-xs opacity-80">Less fraud loss</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-center text-white">
              <p className="text-2xl font-extrabold">75,000x</p><p className="text-xs opacity-80">Faster detection</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 p-4 text-center text-white">
              <p className="text-2xl font-extrabold">97%</p><p className="text-xs opacity-80">Fewer reviews</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-6 py-12 bg-slate-50/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-amber-600 mb-2">HOW IT WORKS</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">Four steps to secure every payment</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { n: '01', title: 'Transaction Initiated', desc: 'User sends a UPI payment through any app', color: 'from-violet-600 to-indigo-600' },
              { n: '02', title: 'Feature Extraction', desc: '20 risk signals extracted in real-time', color: 'from-emerald-600 to-teal-600' },
              { n: '03', title: 'ML Prediction', desc: 'Random Forest model scores fraud probability', color: 'from-amber-600 to-orange-600' },
              { n: '04', title: 'Instant Action', desc: 'Allow, challenge, or block — under 200ms', color: 'from-blue-600 to-cyan-600' },
            ].map((s, i) => (
              <div key={i} className="relative text-center">
                {i < 3 && <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-slate-200" />}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-3 text-white font-bold text-base shadow-lg relative z-10`}>{s.n}</div>
                <h3 className="font-bold text-slate-800 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Use case */}
      <section className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-8">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-sm font-semibold text-violet-600 mb-2">USE CASE</p>
                <h3 className="text-xl font-extrabold text-slate-800 mb-3">How a mid-size bank would use Fraudulent.ai</h3>
                <div className="space-y-2">
                  {[
                    'Integrate via REST API — single endpoint, 20-feature analysis',
                    'Deploy heatmaps for regional fraud monitoring',
                    'Set up threat intelligence feeds for known bad actors',
                    'Enable reinforcement learning for continuous improvement',
                    'Use attack simulator to stress-test before going live',
                    'Track ROI with real-time savings dashboard',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-white border border-violet-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">Projected Annual Savings</p>
                  <p className="text-3xl font-extrabold text-emerald-600">Rs.3.8 Crore</p>
                  <p className="text-xs text-slate-400 mt-1">Based on 10L monthly transactions</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-violet-200 p-3 text-center">
                    <p className="text-lg font-extrabold text-slate-800">45 days</p>
                    <p className="text-[10px] text-slate-500">Integration time</p>
                  </div>
                  <div className="rounded-xl bg-white border border-violet-200 p-3 text-center">
                    <p className="text-lg font-extrabold text-slate-800">340x</p>
                    <p className="text-[10px] text-slate-500">ROI in Year 1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-blue-600 mb-2">TEAM</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">Built by</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {founders.map((f, i) => (
              <div key={i} className="group rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-slate-200 transition-all duration-300 bg-white">
                <div className={`h-40 bg-gradient-to-br ${i === 0 ? 'from-violet-100 to-indigo-100' : 'from-blue-100 to-cyan-100'} relative overflow-hidden`}>
                  <img src={f.image} alt={f.name} className="absolute inset-0 w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-slate-800">{f.name}</h3>
                  <p className={`text-xs font-medium mb-2 ${i === 0 ? 'text-violet-600' : 'text-blue-600'}`}>{f.role}</p>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{f.bio}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.open(f.github, '_blank')} className="rounded-full text-xs h-8 px-3 border-slate-200 text-slate-600 hover:text-slate-800">
                      <Github className="w-3.5 h-3.5 mr-1.5" /> GitHub
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(f.linkedin, '_blank')} className="rounded-full text-xs h-8 px-3 border-slate-200 text-slate-600 hover:text-slate-800">
                      <Linkedin className="w-3.5 h-3.5 mr-1.5" /> LinkedIn
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem — urgency */}
      <section className="relative z-10 px-6 py-12 bg-red-50/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold text-red-600 mb-2">THE PROBLEM IS REAL</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">UPI fraud is exploding in India</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { val: 'Rs.1,087 Cr', label: 'Lost to UPI fraud in 2023', sub: 'RBI Annual Report' },
              { val: '95,000+', label: 'Fraud cases reported', sub: 'NPCI Data 2023' },
              { val: '300%', label: 'Increase in 3 years', sub: 'Year-over-year growth' },
              { val: '78%', label: 'Go undetected', sub: 'Industry estimate' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-white border border-red-100 p-4 text-center">
                <p className="text-xl md:text-2xl font-extrabold text-red-600">{s.val}</p>
                <p className="text-xs text-slate-700 font-medium mt-1">{s.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-red-200 bg-white p-5">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-700">Every <strong className="text-red-600">6 minutes</strong></p>
                <p className="text-xs text-slate-500">a UPI fraud is reported in India</p>
              </div>
              <div>
                <p className="text-sm text-slate-700">Average loss per victim</p>
                <p className="text-xl font-extrabold text-red-600">Rs.11,400</p>
              </div>
              <div>
                <p className="text-sm text-slate-700">Recovery rate without AI</p>
                <p className="text-xl font-extrabold text-red-600">{"< 15%"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — clean, no dark gradient */}
      <section className="relative z-10 px-6 py-14">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-10 h-10 text-violet-600 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3">Don't wait for the next fraud to hit</h2>
          <p className="text-slate-500 mb-6 max-w-lg mx-auto">Every minute without AI-powered detection is a minute your users are vulnerable. Start protecting them now — it takes 5 minutes.</p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <Button onClick={go} size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full px-10 shadow-xl shadow-violet-500/20 text-base">
              Start Free — No Credit Card <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Free forever for startups</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 5-minute setup</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> REST API ready</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 pt-16 pb-8 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-800">Fraudulent<span className="text-violet-600">.ai</span></span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">AI-powered fraud detection for India's UPI ecosystem. Protecting every transaction in real-time.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">How It Works</a></li>
                <li><span className="text-sm text-slate-500">Admin Dashboard</span></li>
                <li><span className="text-sm text-slate-500">API Access</span></li>
              </ul>
            </div>

            {/* Technology */}
            <div>
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3">Technology</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-slate-500">GAN-Augmented ML</span></li>
                <li><span className="text-sm text-slate-500">20 Risk Parameters</span></li>
                <li><span className="text-sm text-slate-500">Real-Time Scoring</span></li>
                <li><span className="text-sm text-slate-500">Behavioral Analysis</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3">Contact</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-slate-500">hello@fraudulent.ai</span></li>
                <li><span className="text-sm text-slate-500">Mumbai, India</span></li>
              </ul>
              <div className="flex gap-3 mt-4">
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-violet-100 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-violet-100 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-slate-400 text-xs">© 2025 Fraudulent.ai · All rights reserved</span>
            <span className="text-slate-400 text-xs">Built with ❤️ by Ritwik & Samyak</span>
          </div>
        </div>
      </footer>
      <style>{`@keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
