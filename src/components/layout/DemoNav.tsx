"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, CalendarDays, Calendar, ClipboardList, Sparkles, Trophy, Megaphone, Settings, ShieldCheck, LogOut, X, Menu, HeartHandshake, DollarSign, FileText
} from "lucide-react";

const adminLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Roster", href: "/roster", icon: Users },
  { label: "Sessions", href: "/sessions", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Assessments", href: "/assessments", icon: ClipboardList },
  { label: "Practice Plans", href: "/practice-plans", icon: Sparkles },
  { label: "Pathway", href: "/pathway", icon: Trophy },
  { label: "Groups", href: "/groups", icon: Users },
  { label: "Reports", href: "/progress-reports", icon: FileText },
  { label: "Badges", href: "/badges", icon: ShieldCheck },
  { label: "Communication", href: "/communication", icon: Megaphone },
  { label: "Payments", href: "/payments", icon: DollarSign },
  { label: "Settings", href: "/settings", icon: Settings },
];

const parentLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Child", href: "/parent-portal", icon: HeartHandshake },
  { label: "Announcements", href: "/communication", icon: Megaphone },
];

export function DemoNav() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isParent = user?.role === "parent" || user?.role === "viewer";
  const links = isParent ? parentLinks : adminLinks;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-tennis-500 flex items-center justify-center text-white font-bold text-xs">PR</div>
              <span className="font-bold text-slate-800 text-sm hidden sm:inline">Tennis Manager</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {links.map(link => {
                const active = pathname?.startsWith(link.href) && link.href !== "/";
                return (
                  <Link key={link.href} href={link.href}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      active ? "bg-tennis-50 text-tennis-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-500 capitalize">{user?.role}</span>
              <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-slate-600">
                <Menu className="w-5 h-5" />
              </button>
              <button onClick={logout} className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto w-64 bg-white h-full shadow-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-800 text-sm">Menu</span>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="flex-1 space-y-1">
              {links.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname?.startsWith(link.href) ? "bg-tennis-50 text-tennis-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
            <button onClick={() => { setMobileOpen(false); logout(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}