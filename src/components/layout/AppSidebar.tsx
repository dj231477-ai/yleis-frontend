"use client";

import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/ui/components/Avatar";
import { IconButton } from "@/ui/components/IconButton";
import { ToggleGroup } from "@/ui/components/ToggleGroup";
import {
  FeatherBook,
  FeatherBriefcase,
  FeatherCalendar,
  FeatherCreditCard,
  FeatherGraduationCap,
  FeatherHelpCircle,
  FeatherHome,
  FeatherLogOut,
  FeatherMessageSquare,
  FeatherPackage,
  FeatherPanelLeftClose,
  FeatherSearch,
  FeatherSettings,
  FeatherUser,
  FeatherZap,
} from "@subframe/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

type FeatherIcon = React.ComponentType<React.HTMLAttributes<HTMLSpanElement>>;

type NavItem = {
  label: string;
  href: string;
  icon: FeatherIcon;
};

const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/app/student/dashboard", icon: FeatherHome },
  { label: "Clase Express", href: "/app/student/express", icon: FeatherZap },
  { label: "Buscar Profesor", href: "/app/student/search", icon: FeatherSearch },
  { label: "Mis Clases", href: "/app/student/classes", icon: FeatherBook },
  { label: "Calendario", href: "/app/calendar", icon: FeatherCalendar },
  { label: "Mensajes", href: "/app/messages", icon: FeatherMessageSquare },
  { label: "Planes", href: "/app/plans", icon: FeatherPackage },
  { label: "Pagos", href: "/app/payments", icon: FeatherCreditCard },
  { label: "Mi Perfil", href: "/app/profile", icon: FeatherUser },
];

const TEACHER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/app/teacher/dashboard", icon: FeatherHome },
  { label: "Solicitudes Express", href: "/app/teacher/express", icon: FeatherZap },
  { label: "Mis Clases", href: "/app/teacher/classes", icon: FeatherBook },
  { label: "Calendario", href: "/app/calendar", icon: FeatherCalendar },
  { label: "Mensajes", href: "/app/messages", icon: FeatherMessageSquare },
  { label: "Pagos", href: "/app/payments", icon: FeatherCreditCard },
  { label: "Mi Perfil", href: "/app/profile", icon: FeatherUser },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Configuración", href: "/app/settings", icon: FeatherSettings },
  { label: "Ayuda", href: "/app/help", icon: FeatherHelpCircle },
];

export type SidebarUser = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
};

type AppSidebarProps = {
  user: SidebarUser;
  isVerifiedTeacher: boolean;
};

function getInitials(fullName: string | null): string {
  if (!fullName?.trim()) return "U";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function AppSidebar({ user, isVerifiedTeacher }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = user.role === "teacher" ? TEACHER_NAV : STUDENT_NAV;

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleRoleSwitch(value: string) {
    const newRole = value === "profesor" ? "teacher" : "student";
    if (newRole === user.role) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", user.id);
      if (error) throw error;
      router.push(newRole === "teacher" ? "/app/teacher/dashboard" : "/app/student/dashboard");
    } catch {
      // silencioso — el pathname no cambia, el toggle queda en su posición original
    }
  }

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className={`flex h-full flex-none flex-col border-r border-solid border-neutral-200 bg-default-background transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex w-full flex-col items-center gap-2 px-2 py-4">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-[#9b1c2e]">
            <span className="font-['Inter'] text-[18px] font-[700] leading-[18px] text-white">
              Y
            </span>
          </div>
          <IconButton
            size="small"
            icon={<FeatherPanelLeftClose className="rotate-180" />}
            onClick={() => setCollapsed(false)}
          />
        </div>
      ) : (
        <div className="flex w-full items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-[#9b1c2e]">
            <span className="font-['Inter'] text-[18px] font-[700] leading-[18px] text-white">
              Y
            </span>
          </div>
          <div className="flex grow shrink-0 basis-0 flex-col items-start">
            <span className="w-full text-body-bold font-body-bold text-default-font">Yleis</span>
            <span className="line-clamp-1 w-full text-caption font-caption text-subtext-color">
              Palabras que conectan
            </span>
          </div>
          <IconButton
            size="small"
            icon={<FeatherPanelLeftClose />}
            onClick={() => setCollapsed(true)}
          />
        </div>
      )}

      <div className="flex h-px w-full flex-none bg-neutral-200" />

      {/* Nav */}
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start justify-between overflow-auto px-3 py-4">
        {/* Main nav items */}
        <div className="flex w-full flex-col items-start gap-1">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex w-full items-center rounded-md px-3 py-2 transition-colors ${
                collapsed ? "justify-center" : "gap-3"
              } ${isActive(href) ? "bg-[#9b1c2e]" : "hover:bg-neutral-100"}`}
            >
              <Icon
                className={`text-body font-body flex-none ${
                  isActive(href) ? "text-white" : "text-neutral-600"
                }`}
              />
              {!collapsed && (
                <span
                  className={`grow shrink-0 basis-0 ${
                    isActive(href)
                      ? "text-body-bold font-body-bold text-white"
                      : "text-body font-body text-default-font"
                  }`}
                >
                  {label}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Bottom nav items */}
        <div className="flex w-full flex-col items-start gap-1">
          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex w-full items-center rounded-md px-3 py-2 hover:bg-neutral-100 transition-colors ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <Icon
                className={`text-body font-body flex-none ${
                  isActive(href) ? "text-[#9b1c2e]" : "text-neutral-600"
                }`}
              />
              {!collapsed && (
                <span
                  className={`grow shrink-0 basis-0 text-body font-body ${
                    isActive(href) ? "text-[#9b1c2e]" : "text-default-font"
                  }`}
                >
                  {label}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Role toggle — hidden when collapsed */}
      {!collapsed && (
        <div className="flex w-full flex-col items-start gap-2 px-3 pb-3">
          {isVerifiedTeacher ? (
            <ToggleGroup
              className="h-auto w-full flex-none"
              value={pathname.includes("/teacher/") ? "profesor" : "estudiante"}
              onValueChange={(value: string) => {
                void handleRoleSwitch(value);
              }}
            >
              <ToggleGroup.Item icon={<FeatherGraduationCap />} value="estudiante">
                Estudiante
              </ToggleGroup.Item>
              <ToggleGroup.Item icon={<FeatherBriefcase />} value="profesor">
                Profesor
              </ToggleGroup.Item>
            </ToggleGroup>
          ) : (
            user.role !== "teacher" && (
              <Link
                href="/app/teacher/onboarding"
                className="flex w-full items-center gap-2 rounded-md border border-[#9b1c2e]/30 bg-[#9b1c2e]/5 px-3 py-2 hover:bg-[#9b1c2e]/10 transition-colors"
              >
                <FeatherBriefcase className="h-4 w-4 flex-none text-[#9b1c2e]" />
                <span className="text-caption font-caption text-[#9b1c2e]">
                  Conviértete en profesor
                </span>
              </Link>
            )
          )}
        </div>
      )}

      <div className="flex h-px w-full flex-none bg-neutral-200" />

      {/* User footer */}
      <div
        className={`flex w-full items-center px-4 py-4 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <Avatar size="small" image={user.avatar_url ?? undefined}>
          {getInitials(user.full_name)}
        </Avatar>
        {!collapsed && (
          <>
            <div className="flex grow shrink-0 basis-0 flex-col items-start min-w-0">
              <span className="line-clamp-1 w-full text-caption-bold font-caption-bold text-default-font">
                {user.full_name ?? "Usuario"}
              </span>
              <span className="line-clamp-1 w-full text-caption font-caption text-subtext-color">
                {user.email}
              </span>
            </div>
            <IconButton
              size="small"
              icon={<FeatherLogOut />}
              onClick={() => {
                void handleLogout();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
