type LandingSectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function LandingSectionTitle({
  eyebrow,
  title,
  description,
  align = "center"
}: LandingSectionTitleProps) {
  const isCenter = align === "center";
  return (
    <div
      className={
        isCenter
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl text-left"
      }
    >
      {eyebrow ? (
        <p
          className={
            "mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(212,175,55,0.1)] px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--gold-soft)]" +
            (isCenter ? " justify-center" : "")
          }
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base text-[var(--text-muted)] md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
