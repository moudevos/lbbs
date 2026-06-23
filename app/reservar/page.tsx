import { PublicReservationForm } from "@/components/reservations/public-reservation-form";
import { getMainContact } from "@/lib/public-contact/get-main-contact";

export default async function ReservarPage() {
  const mainContact = await getMainContact();
  return (
    <main className="landing-public min-h-screen overflow-x-hidden bg-[#050A0D] px-4 py-6 sm:px-6 lg:px-8">
      <PublicReservationForm initialMainContact={mainContact} />
    </main>
  );
}
