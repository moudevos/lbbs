import { Scissors } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";

type Row = {
  id: string;
  direction: "left" | "right";
  duration: string;
  size: "md" | "sm";
  labels: string[];
};

const rows: Row[] = [
  {
    id: "row-1",
    direction: "left",
    duration: "42s",
    size: "md",
    labels: ["Degradado clásico", "Perfilado de barba", "Corte texturizado", "Acabado a navaja", "Diseño lateral"]
  },
  {
    id: "row-2",
    direction: "right",
    duration: "32s",
    size: "sm",
    labels: ["Fade alto", "Línea limpia", "Mid fade", "Barba perfilada", "Corte tijera", "Detalle nuca"]
  },
  {
    id: "row-3",
    direction: "left",
    duration: "54s",
    size: "md",
    labels: ["Pompadour", "Buzz cut", "Crew cut", "Undercut", "Texturizado superior"]
  }
];

function PhotoCard({ label, size }: { label: string; size: "md" | "sm" }) {
  return (
    <figure
      className={
        "relative shrink-0 overflow-hidden rounded-2xl border border-[var(--border-soft)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] " +
        (size === "md" ? "h-56 w-44 md:h-64 md:w-52" : "h-40 w-32 md:h-44 md:w-36")
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,_rgba(212,175,55,0.28),_transparent_60%),linear-gradient(160deg,#1c1c1c,#070707)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.75))]" />
      <span
        aria-hidden
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-[var(--gold-soft)] backdrop-blur"
      >
        <Scissors size={14} />
      </span>
      <figcaption className="absolute inset-x-3 bottom-3 text-sm font-medium text-white">
        {label}
      </figcaption>
    </figure>
  );
}

export function WorkMarquee() {
  return (
    <section id="trabajo" className="relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto mb-12 max-w-6xl px-6">
        <LandingSectionTitle
          eyebrow="Galería"
          title="Nuestro trabajo"
          description="Cortes, perfiles y acabados realizados con detalle."
        />
      </div>

      <div className="flex flex-col gap-5">
        {rows.map((row) => (
          <div
            key={row.id}
            className="marquee group flex w-max gap-5"
            style={{
              animationName: row.direction === "left" ? "marquee-left" : "marquee-right",
              animationDuration: row.duration
            }}
          >
            {[...row.labels, ...row.labels].map((label, index) => (
              <PhotoCard key={`${row.id}-${index}`} label={label} size={row.size} />
            ))}
          </div>
        ))}
      </div>

      {/* Difuminado lateral */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent md:w-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent md:w-28"
      />
    </section>
  );
}
