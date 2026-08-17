import {
  LoadingRegion,
  ProductGridSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <LoadingRegion label="Carregando detalhes do produto" className="container-x py-6 md:py-10">
      <Skeleton className="h-4 w-44" />
      <div className="mt-4 grid gap-6 md:mt-6 lg:grid-cols-[1fr_460px] lg:gap-10">
        <div aria-hidden="true" className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="aspect-square" key={index} />
            ))}
          </div>
        </div>

        <div aria-hidden="true" className="space-y-5">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-[90%]" />
          <Skeleton className="h-10 w-48" />
          <div className="surface space-y-4 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      <section className="mt-10 md:mt-14">
        <Skeleton className="mb-5 h-8 w-64" />
        <ProductGridSkeleton count={4} className="lg:grid-cols-4 xl:grid-cols-4" />
      </section>
    </LoadingRegion>
  );
}
