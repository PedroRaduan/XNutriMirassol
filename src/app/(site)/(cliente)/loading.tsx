import {
  LoadingRegion,
  PageHeadingSkeleton,
  Skeleton,
  SummarySkeleton,
} from "@/components/ui/skeleton";

export default function CustomerAreaLoading() {
  return (
    <LoadingRegion label="Carregando sua conta" className="container-x grid gap-6 py-10 lg:grid-cols-[240px_1fr]">
      <aside aria-hidden="true" className="surface hidden space-y-3 self-start p-4 lg:block">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-11 w-full" key={index} />
        ))}
      </aside>
      <div>
        <PageHeadingSkeleton compact />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SummarySkeleton rows={1} key={index} />
          ))}
        </div>
        <div className="mt-6">
          <SummarySkeleton rows={5} />
        </div>
      </div>
    </LoadingRegion>
  );
}
