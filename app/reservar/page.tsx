import { PublicReservationForm } from "@/components/reservations/public-reservation-form";
import { getMainContact } from "@/lib/public-contact/get-main-contact";

export default async function ReservarPage() {
  const mainContact = await getMainContact();
  return (
    <main className="landing-public min-h-screen bg-[radial-gradient(circle_at_top,rgba(234,157,77,0.12),transparent_30%),#050A0D]">
      <PublicReservationForm initialMainContact={mainContact} />
    </main>
  );
}
