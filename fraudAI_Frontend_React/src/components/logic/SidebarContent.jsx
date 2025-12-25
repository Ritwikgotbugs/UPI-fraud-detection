import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import {
  HelpCircle as Help,
  History,
  LayoutDashboard,
  LogOut,
  Send,
  Settings,
  Shield,
  Wallet,
  Zap
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from "./firebase";

export default function SidebarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };
  
  const mainNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", badge: null },
    { icon: Send, label: "Pay", path: "/send-money", badge: null },
    { icon: History, label: "Activity", path: "/transactions", badge: null },
  ];

  const toolsNavItems = [
    { icon: Settings, label: "Fraud Settings", path: "/settings", badge: null },
    { icon: Shield, label: "Admin Panel", path: "/admin", badge: null },
    { icon: Help, label: "Help Center", path: "/help-support", badge: null },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Logo Section - Fixed at top */}
      <div className="flex-shrink-0 p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
              <Zap className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-0.5">
              <span className="text-base font-bold text-slate-800">Fraudulent</span>
              <span className="text-base font-bold text-blue-600">.ai</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium tracking-wider uppercase">UPI fraud detection</span>
          </div>
        </div>
      </div>

      {/* Navigation Area - No scroll */}
      <div className="flex-1 px-3">
        <div className="mb-3">
          <span className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Main Menu</span>
          <nav className="mt-2 space-y-1">
            {mainNavItems.map((item) => (
              <Link to={item.path} key={item.label}>
                <div
                  className={cn(
                    "relative group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200",
                    isActive(item.path) 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {isActive(item.path) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full" />
                  )}
                  
                  <div className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    isActive(item.path) 
                      ? "bg-white/20" 
                      : "bg-slate-100 group-hover:bg-blue-100"
                  )}>
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-200",
                      isActive(item.path) ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                    )} />
                  </div>
                  
                  <span className={cn(
                    "flex-1 font-medium text-sm",
                    isActive(item.path) ? "text-white" : "text-slate-700"
                  )}>
                    {item.label}
                  </span>
                  
                  {item.badge && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 font-semibold",
                        isActive(item.path) 
                          ? "bg-white/20 text-white border-white/30" 
                          : "bg-blue-100 text-blue-600 border-blue-200"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <span className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tools</span>
          <nav className="mt-2 space-y-1">
            {toolsNavItems.map((item) => (
              <Link to={item.path} key={item.label}>
                <div
                  className={cn(
                    "relative group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200",
                    isActive(item.path) 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {isActive(item.path) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full" />
                  )}
                  
                  <div className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    isActive(item.path) 
                      ? "bg-white/20" 
                      : "bg-slate-100 group-hover:bg-blue-100"
                  )}>
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-200",
                      isActive(item.path) ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                    )} />
                  </div>
                  
                  <span className={cn(
                    "flex-1 font-medium text-sm",
                    isActive(item.path) ? "text-white" : "text-slate-700"
                  )}>
                    {item.label}
                  </span>
                  
                  {item.badge && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 font-semibold",
                        isActive(item.path) 
                          ? "bg-white/20 text-white border-white/30" 
                          : "bg-blue-100 text-blue-600 border-blue-200"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* User Profile & Logout - Fixed at bottom */}
      <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 mb-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              userData?.name?.charAt(0) || user?.displayName?.charAt(0) || "U"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {userData?.name || user?.displayName || "User"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {userData?.email || user?.email || "user@email.com"}
            </p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full justify-center gap-2 h-9 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
