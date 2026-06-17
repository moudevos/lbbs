import { ServiceOrderDetail } from "@/components/service-orders/service-order-detail";

export default function AtencionDetallePage({ params }: { params: { id: string } }) {
  return <ServiceOrderDetail id={params.id} />;
}
