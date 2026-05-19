import type { LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function ComingSoonPage({ title, description, icon: Icon = Wrench }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
        Próximamente
      </span>
    </div>
  );
}
