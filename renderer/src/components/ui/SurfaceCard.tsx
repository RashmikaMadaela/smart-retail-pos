import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function SurfaceCard({
  title,
  subtitle,
  className,
  contentClassName,
  children,
}: SurfaceCardProps) {
  return (
    <section className={cn("rounded-2xl border border-border/80 bg-background/45", className)}>
      {title || subtitle ? (
        <div className="border-b border-border/80 px-4 py-3">
          {title ? <h3 className="m-0 text-lg font-semibold text-foreground">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}
