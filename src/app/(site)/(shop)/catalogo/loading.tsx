import {
  LoadingRegion,
  PageHeadingSkeleton,
  ProductGridSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <LoadingRegion label="Carregando produtos do catálogo" className="container-x py-8 md:py-10">
      <PageHeadingSkeleton />
      <div className="mt-4 lg:hidden">
        <Skeleton className="h-14 w-full" />
      </div>
      <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[290px_1fr]">
        <aside aria-hidden="true" className="surface hidden space-y-5 self-start p-5 lg:block">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 5 }, (_, index) => (
            <div className="space-y-2" key={index}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </aside>
        <ProductGridSkeleton count={6} />
      </div>
    </LoadingRegion>
  );
}
