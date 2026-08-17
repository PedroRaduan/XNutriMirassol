import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function AdminLoadingSkeleton() {
  return (
    <LoadingRegion label="Carregando conteúdo do painel">
      <div className="surface mb-6 p-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-4 h-9 w-52 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[32rem] max-w-full" />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11 w-full md:w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="surface p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-4 h-6 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-5 h-10 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
