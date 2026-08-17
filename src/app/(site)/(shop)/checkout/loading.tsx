import {
  FormPanelSkeleton,
  LoadingRegion,
  PageHeadingSkeleton,
  SummarySkeleton,
} from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <LoadingRegion label="Preparando seu checkout" className="container-x py-8 md:py-10">
      <PageHeadingSkeleton />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-5">
          <FormPanelSkeleton fields={4} />
          <FormPanelSkeleton fields={3} />
        </div>
        <aside className="order-first lg:order-none">
          <SummarySkeleton rows={5} />
        </aside>
      </div>
    </LoadingRegion>
  );
}
