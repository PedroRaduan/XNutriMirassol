import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = ComponentPropsWithoutRef<"div">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-md bg-[#e8e6e2]", className)}
      {...props}
    />
  );
}

export function LoadingRegion({
  label = "Carregando conteúdo…",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} role="status" aria-label={label} aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PageHeadingSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden="true" className={compact ? "space-y-2" : "space-y-3 border-b border-[var(--line)] pb-6"}>
      <Skeleton className="h-8 w-48 max-w-[70%] md:h-10 md:w-72" />
      <Skeleton className="h-4 w-[min(100%,32rem)]" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-3 p-3 sm:p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-end justify-between gap-3 pt-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:gap-5 xl:grid-cols-3", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function FormPanelSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className="surface space-y-5 p-5 md:p-6">
      <Skeleton className="h-7 w-48 max-w-[70%]" />
      {Array.from({ length: fields }, (_, index) => (
        <div className="space-y-2" key={index}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function SummarySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="surface space-y-4 p-5">
      <Skeleton className="h-7 w-44" />
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex justify-between gap-5" key={index}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
