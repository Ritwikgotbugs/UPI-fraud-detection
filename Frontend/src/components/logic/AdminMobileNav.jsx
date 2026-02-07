import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield, Zap } from "lucide-react";
import { useState } from "react";
import AdminSidebarContent from './AdminSidebarContent';

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-violet-200/50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-white border-r border-slate-200">
            <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
            <div onClick={() => setOpen(false)}>
              <AdminSidebarContent />
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-md">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
              <Zap className="h-1.5 w-1.5 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-base font-bold text-slate-800">Fraudulent</span>
            <span className="text-base font-bold text-violet-600">.ai</span>
          </div>
          <span className="text-[10px] bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">ADMIN</span>
        </div>
        
        <div className="w-10" />
      </div>
    </div>
  );
}
