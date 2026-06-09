import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/user.types";

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; variant: "default" | "success" | "info" | "warning" | "secondary" }
> = {
  student: { label: "Estudiante", variant: "info" },
  teacher: { label: "Docente", variant: "success" },
  admin: { label: "Admin", variant: "secondary" },
};

type RoleBadgeProps = { role: UserRole };

export function RoleBadge({ role }: RoleBadgeProps) {
  const { label, variant } = ROLE_CONFIG[role];
  return <Badge variant={variant}>{label}</Badge>;
}
