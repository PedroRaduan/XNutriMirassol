import {
  LoadingRegion,
  PageHeadingSkeleton,
  Skeleton,
  SummarySkeleton,
} from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <LoadingRegion label="Carregando seu carrinho" className="container-x py-8 md:py-10">
      <PageHeadingSkeleton />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-hidden="true" className="surface divide-y divide-[var(--line)] px-4 md:px-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="flex gap-4 py-5" key={index}>
              <Skeleton className="size-20 shrink-0 sm:size-24" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-32" />
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          ))}
        </section>
        <aside className="space-y-4">
          <SummarySkeleton rows={3} />
          <Skeleton className="h-32 w-full" />
        </aside>
      </div>
    </LoadingRegion>
  );
}
