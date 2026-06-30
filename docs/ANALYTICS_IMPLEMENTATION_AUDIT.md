# Auditoria previa - Caja y Analisis

## EXISTING_CASH_FLOW
- Caja usa `src/components/cash/cash-dashboard.tsx`.
- La vista consume `GET /api/control/cash/summary`, `GET/POST /api/control/cash/closure` y `POST /api/control/cash/reopen`.
- El cierre guarda `cash_closures` y snapshots en `cash_closure_items`.

## EXISTING_PRODUCTION_RULES
- Produccion de barberos esta centralizada en `src/lib/production/calculate-barber-production.ts`.
- La insercion real de produccion usa `src/lib/production/server.ts`.
- Analisis solo lee y estima; no modifica liquidaciones ni snapshots.

## EXISTING_PAYMENT_METHODS
- Enum base: `efectivo`, `yape`, `plin`, `tarjeta`, `transferencia`, `mixto`.
- Migraciones posteriores agregan `reward`.
- Los pagos mixtos se leen desde `payment_details`; caja suma lo realmente cobrado por cada detalle.

## EXISTING_EXPORT_HELPERS
- XLSX: `src/lib/excel/create-workbook.ts` y `src/lib/excel/export-xlsx.ts`.
- PDF: existe `jspdf` y se usa en reportes de liquidacion/ticket.

## FILES_TO_TOUCH
- `src/components/cash/cash-dashboard.tsx`
- `app/api/control/cash/summary/route.ts`
- `src/lib/auth/permissions.ts`
- `src/components/control/control-shell.tsx`

## FILES_TO_CREATE
- `src/lib/analytics/analytics-calculations.ts`
- `src/components/analytics/analytics-dashboard.tsx`
- `app/app/control/analisis/page.tsx`
- `app/app/control/analisis/loading.tsx`
- `app/api/control/analytics/*`
- `app/api/control/analytics/export/xlsx/route.ts`
- `app/api/control/analytics/export/pdf/route.ts`

## RISK_POINTS
- No tratar `remanente operativo estimado` como utilidad neta.
- Excluir anulados de ventas validas y produccion.
- No duplicar logica de liquidaciones.
- No sumar creditos no cobrados a caja.
- Cliente generico `000000000` no debe entrar en rankings de clientes.
