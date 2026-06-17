import { LandingSectionTitle } from "./landing-section-title";

export function AboutStudio() {
  return (
    <section id="sobre-nosotros" className="relative min-h-[480px] overflow-hidden py-24 md:flex md:items-center">
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/landing/about/about-bg.webp'),url('/landing/footer/footer-bg.webp')] bg-cover bg-center bg-no-repeat md:bg-fixed"
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,10,13,0.76),rgba(5,10,13,0.42),rgba(5,10,13,0.68))]" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <LandingSectionTitle align="left" eyebrow="Sobre nosotros" title="Más que un corte, una experiencia" />
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--text-muted)]">
          En La Bajadita Barber Studio combinamos técnica, detalle y autenticidad para que cada cliente salga con un estilo que lo represente. Cuidamos el ambiente, la atención y cada acabado como parte de una experiencia premium en Iquitos.
        </p>
      </div>
    </section>
  );
}
