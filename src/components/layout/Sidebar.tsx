"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Calendar,
  BookOpen,
  Settings,
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Languages,
  Mic2,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { UserProfile } from "@/types/user.types";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "translator", "interpreter", "admin"] },
  { label: "Mi Perfil", href: "/dashboard/profile", icon: User, roles: ["student", "teacher", "translator", "interpreter", "admin"] },
  { label: "Aprende", href: "/dashboard/learn", icon: GraduationCap, roles: ["student"] },
  { label: "Enseña", href: "/dashboard/teach", icon: BookOpen, roles: ["teacher"] },
  { label: "Traduce", href: "/dashboard/translate", icon: Languages, roles: ["translator"] },
  { label: "Interpreta", href: "/dashboard/interpret", icon: Mic2, roles: ["interpreter"] },
  { label: "Mis Solicitudes", href: "/dashboard/requests", icon: FileText, roles: ["student", "admin"] },
  { label: "Mis Clases", href: "/dashboard/classes", icon: BookOpen, roles: ["student", "teacher"] },
  { label: "Calendario", href: "/dashboard/calendar", icon: Calendar, roles: ["student", "teacher", "translator", "interpreter", "admin"] },
  { label: "Mensajes", href: "/dashboard/messages", icon: MessageSquare, roles: ["student", "teacher", "translator", "interpreter", "admin"] },
  { label: "Pagos", href: "/dashboard/billing", icon: CreditCard, roles: ["student", "teacher", "translator", "interpreter", "admin"] },
] as const;

const BOTTOM_ITEMS = [
  { label: "Configuración", href: "/dashboard/settings", icon: Settings },
  { label: "Ayuda", href: "/dashboard/help", icon: HelpCircle },
];

type SidebarProps = { user: UserProfile };

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(user.role)
  );

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Yleis */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-black text-primary-foreground">Y</span>
          </div>
          {!collapsed && (
            <div>
              <span className="block text-lg font-black tracking-tight text-foreground">Yleis</span>
              <span className="block text-[10px] text-muted-foreground leading-none">Palabras que conectan</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleNav.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {isActive && !collapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Nav inferior */}
      <nav className="px-3 py-3">
        <ul className="space-y-1">
          {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* User footer */}
      <div className={cn("flex items-center gap-3 p-4", collapsed && "justify-center p-3")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {getInitials(user.firstName, user.lastName)}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
        {!collapsed && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
