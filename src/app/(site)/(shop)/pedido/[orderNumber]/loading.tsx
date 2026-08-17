import {
  LoadingRegion,
  PageHeadingSkeleton,
  Skeleton,
  SummarySkeleton,
} from "@/components/ui/skeleton";

export default function OrderLoading() {
  return (
    <LoadingRegion label="Carregando os dados do pedido" className="container-x py-10">
      <div className="surface p-6">
        <PageHeadingSkeleton compact />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SummarySkeleton rows={1} key={index} />
          ))}
        </div>
        <div aria-hidden="true" className="mt-8 space-y-4">
          <Skeleton className="h-7 w-24" />
          {Array.from({ length: 3 }, (_, index) => (
            <div className="flex justify-between border-b border-[var(--line)] py-3" key={index}>
              <Skeleton className="h-5 w-52 max-w-[65%]" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
