import { LandingSectionTitle } from "./landing-section-title";

export function AboutStudio() {
  return (
    <section id="sobre-nosotros" className="relative overflow-hidden bg-[#071013] py-14 md:py-16">
      <div aria-hidden className="absolute inset-0 bg-[url('/landing/footer/footer-bg.webp')] bg-cover bg-center opacity-35" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,10,13,0.96),rgba(5,10,13,0.72),rgba(5,10,13,0.92))]" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <LandingSectionTitle align="left" eyebrow="Sobre nosotros" title="Más que un corte, una experiencia" />
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--text-muted)]">
          En La Bajadita Barber Studio combinamos técnica, detalle y autenticidad para que cada cliente salga con un estilo que lo represente. Cuidamos el ambiente, la atención y cada acabado como parte de una experiencia premium en Iquitos.
        </p>
      </div>
    </section>
  );
}
