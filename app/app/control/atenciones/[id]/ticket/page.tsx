import { ServiceOrderTicket } from "@/components/service-orders/service-order-ticket";

export default function ServiceOrderTicketPage({ params }: { params: { id: string } }) {
  return <ServiceOrderTicket id={params.id} />;
}
