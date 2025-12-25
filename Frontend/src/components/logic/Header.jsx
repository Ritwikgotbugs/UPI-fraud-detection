import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Menu,
  Search,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import SidebarContent from './SidebarContent';

const Header = ({ user, onSignIn }) => {
  const { userData, notifications, unreadCount, markAsRead, markAllAsRead } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    
    if (query.length > 0) {
      const mockResults = [
        { id: 1, type: "UPI", value: `${query}@upi` },
        { id: 2, type: "Transaction", value: `Recent transaction with ${query}` },
        { id: 3, type: "Contact", value: query },
      ].filter(r => r.value.toLowerCase().includes(query));
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-white border-r border-slate-200">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center md:hidden gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Fraudulent<span className="text-blue-600">AI</span></span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9 w-56 h-9 bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-blue-300 rounded-lg"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {searchResults.map(r => (
                  <div key={r.id} className="px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                    <span className="text-blue-600 text-xs font-medium">{r.type}</span>
                    <p className="text-slate-700">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div ref={notificationRef} className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-blue-600' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-slate-800 font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-72">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`px-4 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${notif.type === 'received' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {notif.type === 'received' ? (
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.read ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {notif.type === 'received' ? 'From: ' : 'To: '}{notif.otherPartyUPI}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatTime(notif.createdAt)}</p>
                        </div>
                        {!notif.read && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          {user ? (
            <Avatar className="h-9 w-9 ring-2 ring-white shadow-md">
              <AvatarImage src={user?.photoURL} alt="User" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium">
                {user?.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Button onClick={onSignIn} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
