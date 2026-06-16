"use client";

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg border border-[var(--border-soft)] bg-[linear-gradient(110deg,rgba(212,175,55,0.06),rgba(255,255,255,0.04),rgba(212,175,55,0.08))] ${className}`} />;
}

function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-72" />
      </div>
      <div className="flex gap-2">
        <Block className="h-10 w-40" />
        <Block className="h-10 w-24" />
      </div>
    </div>
  );
}

function TableRows({ rows = 5 }: { rows?: number }) {
  return <div className="grid gap-2">{Array.from({ length: rows }).map((_, index) => <Block key={index} className="h-20" />)}</div>;
}

function Cards({ count = 4 }: { count?: number }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: count }).map((_, index) => <Block key={index} className="h-28" />)}</div>;
}

export function ModuleRouteSkeleton({ pathname }: { pathname: string | null }) {
  const route = pathname ?? "/app/control";

  if (route === "/app/control") {
    return (
      <section className="grid gap-5 opacity-100 transition duration-200">
        <ToolbarSkeleton />
        <Cards />
        <div className="grid gap-3 md:grid-cols-2"><Block className="h-48" /><Block className="h-48" /></div>
      </section>
    );
  }

  if (route.includes("/agenda")) {
    return (
      <section className="grid gap-5">
        <ToolbarSkeleton />
        <Cards count={5} />
        <TableRows rows={4} />
      </section>
    );
  }

  if (route.includes("/configuracion")) {
    return (
      <section className="grid gap-5">
        <ToolbarSkeleton />
        <Block className="h-44" />
        <div className="grid gap-3"><Block className="h-32" /><Block className="h-32" /><Block className="h-32" /></div>
      </section>
    );
  }

  if (route.includes("/auditoria")) {
    return (
      <section className="grid gap-5">
        <ToolbarSkeleton />
        <div className="grid gap-2 md:grid-cols-4"><Block className="h-10" /><Block className="h-10" /><Block className="h-10" /><Block className="h-10" /></div>
        <TableRows rows={6} />
      </section>
    );
  }

  if (route.includes("/mis-servicios")) {
    return (
      <section className="grid gap-5">
        <ToolbarSkeleton />
        <Cards count={3} />
        <TableRows rows={3} />
      </section>
    );
  }

  if (route.includes("/sedes")) {
    return (
      <section className="grid gap-5">
        <ToolbarSkeleton />
        <Cards count={2} />
        <TableRows rows={4} />
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <ToolbarSkeleton />
      <TableRows rows={6} />
    </section>
  );
}
