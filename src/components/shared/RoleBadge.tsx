import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/user.types";

const ROLE_CONFIG: Record<UserRole, { label: string; variant: "default" | "success" | "info" | "warning" | "secondary" }> = {
  student:      { label: "Aprende",              variant: "info" },
  teacher:      { label: "Enseña",               variant: "success" },
  translator:   { label: "Traduce",              variant: "warning" },
  interpreter:  { label: "Interpreta",           variant: "default" },
  admin:        { label: "Administrador",        variant: "secondary" },
};

type RoleBadgeProps = { role: UserRole };

export function RoleBadge({ role }: RoleBadgeProps) {
  const { label, variant } = ROLE_CONFIG[role];
  return <Badge variant={variant}>{label}</Badge>;
}
