"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";
import type { UserProfile } from "@/types/user.types";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const STUDENT_NAV = [
  { label: "Dashboard", href: "/app/student/dashboard", icon: LayoutDashboard },
  { label: "Buscar Profesor", href: "/app/student/search", icon: Search },
  { label: "Mis Clases", href: "/app/student/classes", icon: BookOpen },
  { label: "Calendario", href: "/app/calendar", icon: Calendar },
  { label: "Mensajes", href: "/app/messages", icon: MessageSquare },
  { label: "Pagos", href: "/app/payments", icon: CreditCard },
  { label: "Mi Perfil", href: "/app/profile", icon: User },
];

const TEACHER_NAV = [
  { label: "Dashboard", href: "/app/teacher/dashboard", icon: LayoutDashboard },
  { label: "Mis Estudiantes", href: "/app/teacher/students", icon: GraduationCap },
  { label: "Mis Clases", href: "/app/teacher/classes", icon: BookOpen },
  { label: "Calendario", href: "/app/calendar", icon: Calendar },
  { label: "Mensajes", href: "/app/messages", icon: MessageSquare },
  { label: "Pagos", href: "/app/payments", icon: CreditCard },
  { label: "Mi Perfil", href: "/app/profile", icon: User },
];

const BOTTOM_NAV = [
  { label: "Configuración", href: "/app/settings", icon: Settings },
  { label: "Ayuda", href: "/app/help", icon: HelpCircle },
];

type SidebarProps = {
  user: UserProfile;
  isVerifiedTeacher: boolean;
};

export function Sidebar({ user, isVerifiedTeacher }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switching, setSwitching] = useState(false);

  const navItems = user.role === "teacher" ? TEACHER_NAV : STUDENT_NAV;

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleRoleSwitch() {
    setSwitching(true);
    const supabase = createClient();
    const newRole = user.role === "teacher" ? "student" : "teacher";
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", user.id);
    if (error) {
      setSwitching(false);
      return;
    }
    router.push(newRole === "teacher" ? "/app/teacher/dashboard" : "/app/student/dashboard");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-black text-primary-foreground">Y</span>
          </div>
          {!collapsed && (
            <div>
              <span className="block text-lg font-black tracking-tight text-foreground">Yleis</span>
              <span className="block text-[10px] text-muted-foreground leading-none">
                Palabras que conectan
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
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
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
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
          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-foreground",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Toggle de rol */}
      {!collapsed && (
        <div className="px-3 py-3">
          {isVerifiedTeacher ? (
            <button
              type="button"
              onClick={handleRoleSwitch}
              disabled={switching}
              className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {switching
                ? "Cambiando modo..."
                : user.role === "teacher"
                  ? "← Cambiar a modo estudiante"
                  : "Cambiar a modo profesor →"}
            </button>
          ) : (
            user.role !== "teacher" && (
              <Link
                href="/app/teacher/onboarding"
                className="block rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Ofrece tus clases →
              </Link>
            )
          )}
        </div>
      )}

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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
