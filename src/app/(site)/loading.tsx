import {
  LoadingRegion,
  ProductGridSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <LoadingRegion label="Carregando a página inicial da XNutri" className="bg-white">
      <section className="border-b border-[var(--line)]">
        <div className="container-x grid gap-5 py-5 md:grid-cols-[1fr_0.82fr] md:items-center md:gap-12 md:py-10">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-full max-w-xl md:h-12" />
            <Skeleton className="h-5 w-[min(100%,34rem)]" />
            <Skeleton className="h-5 w-[min(82%,26rem)]" />
            <div className="grid grid-cols-2 gap-2 pt-1 sm:flex">
              <Skeleton className="h-11 sm:w-36" />
              <Skeleton className="h-11 sm:w-44" />
            </div>
          </div>
          <Skeleton className="hidden aspect-[16/10] w-full md:block" />
        </div>
      </section>

      <section className="container-x py-7 md:py-10">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <ProductGridSkeleton count={4} className="lg:grid-cols-4 xl:grid-cols-4" />
      </section>
    </LoadingRegion>
  );
}
