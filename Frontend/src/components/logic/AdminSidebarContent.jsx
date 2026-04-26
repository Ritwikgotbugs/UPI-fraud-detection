import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Briefcase,
  ClipboardList,
  Cpu,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Network,
  Play,
  Search,
  Settings,
  Shield,
  Sliders,
  Swords,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from "./firebase";

const navSections = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/overview" },
      { icon: Activity, label: "Live Transactions", path: "/admin/live" },
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
      { icon: TrendingUp, label: "ROI & Impact", path: "/admin/roi" },
    ]
  },
  {
    title: "Heatmaps",
    items: [
      { icon: Map, label: "India Risk Heatmap", path: "/admin/risk-heatmap" },
      { icon: MapPin, label: "Complaints Heatmap", path: "/admin/complaints-heatmap" },
      { icon: Network, label: "Network Graph", path: "/admin/network" },
    ]
  },
  {
    title: "Intelligence & Learning",
    items: [
      { icon: Shield, label: "Threat Intelligence", path: "/admin/intelligence" },
      { icon: Brain, label: "Reinforcement Learning", path: "/admin/reinforcement" },
    ]
  },
  {
    title: "Investigation",
    items: [
      { icon: Search, label: "Risk Events", path: "/admin/risk-events" },
      { icon: Briefcase, label: "Case Management", path: "/admin/cases" },
      { icon: Cpu, label: "Devices", path: "/admin/devices" },
      { icon: Users, label: "Customers", path: "/admin/customers" },
      { icon: Bell, label: "Alerts", path: "/admin/alerts" },
    ]
  },
  {
    title: "Demo & Simulation",
    items: [
      { icon: Play, label: "Simulation", path: "/admin/simulation" },
      { icon: Swords, label: "Attack Simulator", path: "/admin/attack-sim" },
      { icon: Zap, label: "Before vs After", path: "/admin/before-after" },
    ]
  },
  {
    title: "Configuration",
    items: [
      { icon: GitBranch, label: "Rule-based Scoring", path: "/admin/rules" },
      { icon: Sliders, label: "Metric Weights", path: "/admin/metric-weights" },
      { icon: Target, label: "Scoring Metrics", path: "/admin/scoring-metrics" },
      { icon: Brain, label: "Behavioral Learning", path: "/admin/behavioral" },
      { icon: Settings, label: "Settings", path: "/admin/settings" },
    ]
  },
  {
    title: "Reports & Compliance",
    items: [
      { icon: BookOpen, label: "Reports", path: "/admin/reports" },
      { icon: ClipboardList, label: "Audit Trail", path: "/admin/audit" },
    ]
  }
];

export default function AdminSidebarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/signin");
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-hidden">
      <div className="flex-shrink-0 p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
              <Zap className="h-1.5 w-1.5 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-0.5">
              <span className="text-sm font-bold text-slate-800">Fraudulent</span>
              <span className="text-sm font-bold text-violet-600">.ai</span>
            </div>
            <span className="text-[8px] text-slate-400 font-medium tracking-wider uppercase">Admin Console</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-2">
            <span className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </span>
            <nav className="mt-1 space-y-0.5">
              {section.items.map((item) => (
                <Link to={item.path} key={item.path}>
                  <div
                    className={cn(
                      "relative group flex items-center gap-2.5 px-3 py-[7px] rounded-lg cursor-pointer transition-all duration-200",
                      isActive(item.path)
                        ? "bg-violet-50 text-violet-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    {isActive(item.path) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-violet-500 rounded-full" />
                    )}
                    <item.icon className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      isActive(item.path) ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
                    )} />
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto p-3 border-t border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              userData?.name?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || "A"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {userData?.name || user?.displayName || user?.email || "Admin"}
            </p>
            <p className="text-[10px] text-violet-500 font-medium truncate">Administrator</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-center gap-2 h-8 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium text-xs transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
