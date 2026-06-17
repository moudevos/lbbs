"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Package, Plus, PlusCircle, Save, Trash2 } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import type { BranchOption } from "@/lib/reservations/types";

type Product = Record<string, any>;

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<{ product: Product; stock: Product; mode: "ingreso" | "ajuste" } | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    const [productsRes, optionsRes, meRes] = await Promise.all([
      fetch(`/api/control/products?${params}`),
      fetch("/api/public/reservation-options"),
      fetch("/api/control/me")
    ]);
    const productsData = await productsRes.json();
    const optionsData = await optionsRes.json();
    const meData = await meRes.json();
    if (!productsRes.ok) {
      await showError("No se pudo cargar productos", productsData.error ?? "Sin permiso.");
      return;
    }
    setProducts(productsData.products ?? []);
    setBranches(optionsData.branches ?? []);
    setRole(meData.employee?.role ?? null);
  }

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function blank(): Product {
    return { name: "", description: "", category: "snack", salePrice: 0, cost: "", stockCurrent: 0, stockMinimum: 0, branchId: "", countsForSellerCredit: false, sellerCreditAmount: 0 };
  }

  function fromRow(row: Product): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      category: row.category ?? "",
      salePrice: row.sale_price ?? 0,
      cost: row.cost ?? "",
      stockCurrent: row.stock_current ?? 0,
      stockMinimum: row.stock_minimum ?? 0,
      branchId: row.branch_id ?? "",
      countsForSellerCredit: Boolean(row.counts_for_seller_credit),
      sellerCreditAmount: row.seller_credit_amount ?? 2
    };
  }

  async function save() {
    if (!editing) return;
    const response = await fetch(editing.id ? `/api/control/products/${editing.id}` : "/api/control/products", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo guardar", data.error ?? "Revisa los datos.");
    setEditing(null);
    await load();
    await showSuccess("Producto guardado");
  }

  async function deactivate(id: string) {
    if (!(await showConfirm("Desactivar producto", "El producto dejara de venderse."))) return;
    const response = await fetch(`/api/control/products/${id}/deactivate`, { method: "PATCH" });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo desactivar", data.error ?? "Intenta nuevamente.");
    await load();
  }

  const canMutate = role === "admin";

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Productos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Bebidas y productos disponibles para vender en una atención.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={load}>Buscar</button>
          {canMutate ? <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 font-semibold text-black" onClick={() => setEditing(blank())}><Plus size={16} /> Nuevo</button> : null}
        </div>
      </div>

      {editing ? (
        <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} />
            <label className="text-sm text-[var(--text-muted)]">Categoria
              <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={editing.category} onChange={(event) => {
                const category = event.target.value;
                setEditing({ ...editing, category, countsForSellerCredit: category === "barber_product", sellerCreditAmount: category === "barber_product" ? 2 : 0 });
              }}>
                <option value="snack">Snack / bebida</option>
                <option value="barber_product">Producto de barberia</option>
              </select>
            </label>
            <Input label="Descripcion" value={editing.description} onChange={(value) => setEditing({ ...editing, description: value })} />
            <Input label="Precio venta" type="number" value={editing.salePrice} onChange={(value) => setEditing({ ...editing, salePrice: value })} />
            <Input label="Costo opcional" type="number" value={editing.cost} onChange={(value) => setEditing({ ...editing, cost: value })} />
            <Input label="Stock actual" type="number" value={editing.stockCurrent} onChange={(value) => setEditing({ ...editing, stockCurrent: value })} />
            <Input label="Stock minimo" type="number" value={editing.stockMinimum} onChange={(value) => setEditing({ ...editing, stockMinimum: value })} />
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-black/25 px-3 py-2 text-sm text-[var(--text-muted)]">
              <input type="checkbox" checked={Boolean(editing.countsForSellerCredit)} onChange={(event) => setEditing({ ...editing, countsForSellerCredit: event.target.checked })} />
              Cuenta credito vendedor
            </label>
            <Input label="Credito vendedor por unidad" type="number" value={editing.sellerCreditAmount} onChange={(value) => setEditing({ ...editing, sellerCreditAmount: value })} />
            <label className="text-sm text-[var(--text-muted)]">Sede
              <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={editing.branchId} onChange={(event) => setEditing({ ...editing, branchId: event.target.value })}>
                <option value="">Global</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={save}><Save size={16} /> Guardar</button>
            <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {products.map((product) => {
          const branch = Array.isArray(product.branches) ? product.branches[0] : product.branches;
          const stocks = product.product_branch_stock?.length ? product.product_branch_stock : [{ branch_id: product.branch_id, stock_current: 0, stock_minimum: 0, branches: branch }];
          return stocks.map((stock: Product) => {
          const stockBranch = Array.isArray(stock.branches) ? stock.branches[0] : stock.branches;
          const lowStock = Number(stock.stock_current ?? 0) <= Number(stock.stock_minimum ?? 0);
          return (
            <article key={`${product.id}-${stock.branch_id ?? "global"}`} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1 text-xs text-[var(--gold-soft)]"><Package size={13} /> {product.sku}</p>
                  <h2 className="mt-1 font-semibold">{product.name}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{product.category ?? "Sin categoria"} - {stockBranch?.name ?? branch?.name ?? "Sin sede"}</p>
                </div>
                <strong className="text-[var(--gold)]">S/ {Number(product.sale_price ?? 0).toFixed(2)}</strong>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={lowStock ? "inline-flex items-center gap-1 rounded-md border border-red-300/40 px-2 py-1 text-red-200" : "rounded-md border border-[var(--border-soft)] px-2 py-1 text-[var(--text-muted)]"}>{lowStock ? <AlertTriangle size={12} /> : null} Stock: {stock.stock_current}</span>
                <span className="rounded-md border border-[var(--border-soft)] px-2 py-1 text-[var(--text-muted)]">Min: {stock.stock_minimum}</span>
                {product.counts_for_seller_credit ? <span className="rounded-md border border-[var(--gold-soft)] px-2 py-1 text-[var(--gold-soft)]">Credito S/ {Number(product.seller_credit_amount ?? 2).toFixed(2)}</span> : null}
              </div>
              {role !== "barbero" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canMutate ? <button className="rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs" onClick={() => setEditing(fromRow(product))}>Editar</button> : null}
                  <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs" onClick={() => setStockAction({ product, stock, mode: "ingreso" })}><PlusCircle size={14} /> Ingreso</button>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs" onClick={() => setStockAction({ product, stock, mode: "ajuste" })}><ClipboardList size={14} /> Ajuste</button>
                  {canMutate ? <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs text-red-200" onClick={() => deactivate(product.id)}><Trash2 size={14} /> Desactivar</button> : null}
                </div>
              ) : null}
            </article>
          );
          });
        })}
      </div>
      {stockAction ? <StockModal action={stockAction} branches={branches} onClose={() => setStockAction(null)} onSaved={async () => { setStockAction(null); await load(); }} /> : null}
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

function StockModal({
  action,
  branches,
  onClose,
  onSaved
}: {
  action: { product: Product; stock: Product; mode: "ingreso" | "ajuste" };
  branches: BranchOption[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [branchId, setBranchId] = useState(action.stock.branch_id ?? "");
  const [movementKind, setMovementKind] = useState<"ingreso" | "ajuste_positivo" | "ajuste_negativo">(action.mode === "ingreso" ? "ingreso" : "ajuste_positivo");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  async function save() {
    if (movementKind === "ajuste_negativo" && !(await showConfirm("Confirmar ajuste negativo", "Se reducirá stock de esta sede."))) return;
    const response = await fetch(`/api/control/products/${action.product.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, movementKind, quantity: Number(quantity), reason, reference })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo registrar movimiento", data.error ?? "Revisa los datos.");
    await showSuccess("Stock actualizado");
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5">
        <h2 className="text-xl font-semibold">{action.mode === "ingreso" ? "Registrar ingreso" : "Ajustar stock"}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{action.product.name}</p>
        <div className="mt-4 grid gap-3">
          <label className="text-sm text-[var(--text-muted)]">Sede
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">Seleccionar</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          {action.mode === "ajuste" ? (
            <label className="text-sm text-[var(--text-muted)]">Tipo
              <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={movementKind} onChange={(event) => setMovementKind(event.target.value as "ajuste_positivo" | "ajuste_negativo")}>
                <option value="ajuste_positivo">Ajuste positivo</option>
                <option value="ajuste_negativo">Ajuste negativo</option>
              </select>
            </label>
          ) : null}
          <Input label="Cantidad" type="number" value={quantity} onChange={setQuantity} />
          <Input label="Motivo" value={reason} onChange={setReason} />
          <Input label="Referencia opcional" value={reference} onChange={setReference} />
        </div>
        <div className="mt-5 flex gap-2">
          <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={save}>Guardar</button>
          <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
