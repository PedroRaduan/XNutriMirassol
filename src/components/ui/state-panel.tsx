import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

type StatePanelProps = {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "empty" | "error";
  className?: string;
};

export function StatePanel({
  title,
  description,
  action,
  variant = "empty",
  className,
}: StatePanelProps) {
  const Icon = variant === "error" ? AlertTriangle : SearchX;

  return (
    <section
      className={cn("surface mx-auto w-full max-w-xl p-6 text-center sm:p-8", className)}
      role={variant === "error" ? "alert" : "status"}
    >
      <span
        className={cn(
          "mx-auto grid size-12 place-items-center rounded-full",
          variant === "error" ? "bg-red-50 text-[var(--brand)]" : "bg-[#f1efeb] text-[var(--muted)]",
        )}
      >
        <Icon size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)] sm:text-base">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </section>
  );
}
