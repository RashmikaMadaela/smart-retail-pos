import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToolbarCardProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export function ToolbarCard({ title, description, actions, className }: ToolbarCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/45 p-4",
        "md:flex-row md:items-center md:justify-between md:p-5",
        className,
      )}
    >
      <div>
        <h2 className="m-0 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
