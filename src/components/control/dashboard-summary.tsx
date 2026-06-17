"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { BarChart3, Clock3, Scissors, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { showError } from "@/lib/ui/swal";

type DashboardData = {
  today: { totalSales: number; serviceOrders: number; productsSold: number; paymentsByMethod: { method: string; total: number }[] };
  week: { totalSales: number; serviceOrders: number; averageDailySales: number; bestDay: { date: string; total: number } | null };
  month: { totalSales: number; serviceOrders: number; averageTicket: number };
  production: {
    today: number;
    week: number;
    month: number;
    earningsMonth: number;
    ranking: { barberId: string; production: number; earning: number }[];
    productCredits: { sellerId: string; credit: number }[];
  };
  barberRanking: { barber: string; serviceOrders: number; totalSales: number; averageTicket: number }[];
  peakHours: { hour: string; count: number; percentage: number }[];
};

export function DashboardSummary() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const branchId = localStorage.getItem("lbbs:branchScope") ?? "all";
    const response = await fetch(`/api/control/dashboard/summary?branch_id=${branchId}`);
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      await showError("No se pudo cargar dashboard", body.error ?? "Intenta nuevamente.");
      return;
    }
    setData(body);
  }

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
  }, []);

  if (loading) {
    return <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg border border-[var(--border-soft)] bg-black/35" />)}</div>;
  }

  if (!data) return null;

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric icon={TrendingUp} label="Ventas hoy" value={`S/ ${data.today.totalSales.toFixed(2)}`} />
        <Metric icon={BarChart3} label="Ventas semana" value={`S/ ${data.week.totalSales.toFixed(2)}`} />
        <Metric icon={BarChart3} label="Ventas mes" value={`S/ ${data.month.totalSales.toFixed(2)}`} />
        <Metric icon={Users} label="Atenciones hoy" value={String(data.today.serviceOrders)} />
        <Metric icon={ShoppingBag} label="Productos vendidos" value={String(data.today.productsSold)} />
        <Metric icon={Scissors} label="Ticket promedio" value={`S/ ${data.month.averageTicket.toFixed(2)}`} />
        <Metric icon={BarChart3} label="Produccion hoy" value={`S/ ${data.production.today.toFixed(2)}`} />
        <Metric icon={BarChart3} label="Produccion semana" value={`S/ ${data.production.week.toFixed(2)}`} />
        <Metric icon={BarChart3} label="Produccion mes" value={`S/ ${data.production.month.toFixed(2)}`} />
        <Metric icon={TrendingUp} label="Ganancia mes" value={`S/ ${data.production.earningsMonth.toFixed(2)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Ranking de barberos">
          {data.barberRanking.slice(0, 8).map((barber) => (
            <div key={barber.barber} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-black/25 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(212,175,55,0.14)] text-xs text-[var(--gold-soft)]">{initials(barber.barber)}</span>
                <span>{barber.barber}</span>
              </div>
              <span>{barber.serviceOrders} atenciones - S/ {barber.totalSales.toFixed(2)}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Ranking por produccion calculada">
          {data.production.ranking.slice(0, 8).map((barber) => (
            <div key={barber.barberId} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-black/25 px-3 py-2 text-sm">
              <span>{barber.barberId.slice(0, 8)}</span>
              <span>S/ {barber.production.toFixed(2)} - gana S/ {barber.earning.toFixed(2)}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Creditos por productos">
          {data.production.productCredits.slice(0, 8).map((seller) => (
            <div key={seller.sellerId} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-black/25 px-3 py-2 text-sm">
              <span>{seller.sellerId.slice(0, 8)}</span>
              <span>S/ {seller.credit.toFixed(2)}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Horas pico">
          {data.peakHours.slice(0, 8).map((hour) => (
            <div key={hour.hour} className="grid gap-1">
              <div className="flex justify-between text-sm"><span>{hour.hour}</span><span>{hour.count}</span></div>
              <div className="h-2 rounded-full bg-black/60">
                <div className="h-2 rounded-full bg-[var(--gold)]" style={{ width: `${hour.percentage}%` }} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3"><Icon size={17} className="text-[var(--gold)]" /><p className="mt-2 text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4"><div className="mb-3 flex items-center gap-2"><Clock3 size={16} className="text-[var(--gold)]" /><h2 className="font-semibold">{title}</h2></div><div className="grid gap-2">{children}</div></section>;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LB";
}
