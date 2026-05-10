import Link from "next/link";
import { GraduationCap, Languages, Mic2, BookOpen, ArrowRight, Users } from "lucide-react";
import type { UserRole } from "@/types/user.types";

type ServiceDef = {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ElementType;
  href: string;
  activeRoles: UserRole[];
};

const SECTION_A: ServiceDef[] = [
  {
    id: "learn",
    title: "Aprende",
    description: "Reserva clases en vivo con docentes nativos y certificados. Todos los niveles e idiomas.",
    cta: "Explorar clases",
    icon: GraduationCap,
    href: "/dashboard/learn",
    activeRoles: ["student", "admin"],
  },
  {
    id: "request",
    title: "Solicita una traducción o un intérprete",
    description: "Conecta con traductores e intérpretes profesionales para documentos, eventos y reuniones.",
    cta: "Hacer una solicitud",
    icon: Languages,
    href: "/dashboard/requests",
    activeRoles: ["student", "admin"],
  },
];

const SECTION_B: ServiceDef[] = [
  {
    id: "translate",
    title: "Ofrece tus servicios como traductor o intérprete",
    description: "Publica tu perfil, recibe solicitudes y gestiona tus proyectos de traducción e interpretación.",
    cta: "Ofrecer servicios",
    icon: Mic2,
    href: "/dashboard/translate",
    activeRoles: ["translator", "interpreter", "admin"],
  },
  {
    id: "teach",
    title: "Ofrece tus servicios de enseñanza",
    description: "Crea tu perfil de docente, define tus horarios y empieza a recibir estudiantes.",
    cta: "Ofrecer clases",
    icon: BookOpen,
    href: "/dashboard/teach",
    activeRoles: ["teacher", "admin"],
  },
];

type Props = { role: UserRole };

export function ServicesOverviewSection({ role }: Props) {
  return (
    <div className="space-y-6">

      {/* ── Sección A: Soy cliente ── */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-foreground">Quiero contratar un servicio</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTION_A.map((s) => (
            <Card key={s.id} service={s} active={s.activeRoles.includes(role)} color="blue" />
          ))}
        </div>
      </div>

      {/* ── Sección B: Soy profesional ── */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Quiero ofrecer mis servicios</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTION_B.map((s) => (
            <Card key={s.id} service={s} active={s.activeRoles.includes(role)} color="red" />
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Card interna ─────────────────────────────────────────────────────────────

const COLOR = {
  blue: {
    active:     "border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/10",
    inactive:   "border-border bg-card hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800/40 dark:hover:bg-blue-900/5",
    icon:       "bg-blue-100 dark:bg-blue-900/30",
    iconColor:  "text-blue-600 dark:text-blue-400",
    title:      "text-blue-700 dark:text-blue-400",
    cta:        "text-blue-600 dark:text-blue-400",
    bar:        "bg-blue-500",
    badge:      "bg-blue-600",
  },
  red: {
    active:     "border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10",
    inactive:   "border-border bg-card hover:border-primary/20 hover:bg-primary/5",
    icon:       "bg-primary/10",
    iconColor:  "text-primary",
    title:      "text-primary",
    cta:        "text-primary",
    bar:        "bg-primary",
    badge:      "bg-primary",
  },
};

type CardProps = {
  service: ServiceDef;
  active: boolean;
  color: "blue" | "red";
};

function Card({ service, active, color }: CardProps) {
  const { title, description, cta, icon: Icon, href } = service;
  const c = COLOR[color];

  return (
    <Link
      href={href}
      className={`
        group relative flex flex-col overflow-hidden rounded-xl border p-5
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${active ? c.active : c.inactive}
      `}
    >
      {/* Barra superior de color */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${c.bar} ${active ? "opacity-70" : "opacity-0 group-hover:opacity-40"} transition-opacity`} />

      {/* Badge "Tu servicio" */}
      {active && (
        <span className={`absolute right-3 top-3 rounded-full ${c.badge} px-2 py-0.5 text-[10px] font-bold text-white`}>
          Tu servicio
        </span>
      )}

      {/* Icono */}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.icon} transition-transform group-hover:scale-110`}>
        <Icon className={`h-5 w-5 ${c.iconColor}`} />
      </div>

      {/* Texto */}
      <div className="mt-4 flex-1">
        <p className={`text-sm font-bold leading-snug ${active ? c.title : "text-foreground"}`}>
          {title}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {/* CTA */}
      <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${c.cta} transition-all group-hover:gap-2`}>
        {cta}
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
