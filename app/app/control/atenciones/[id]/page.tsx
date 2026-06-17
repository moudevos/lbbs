import { Suspense } from "react";
import { ServiceOrderDetail } from "@/components/service-orders/service-order-detail";
import { ModuleRouteSkeleton } from "@/components/navigation/module-route-skeleton";

export default function AtencionDetallePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<ModuleRouteSkeleton pathname={`/app/control/atenciones/${params.id}`} />}>
      <ServiceOrderDetail id={params.id} />
    </Suspense>
  );
}
