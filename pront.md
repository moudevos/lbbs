Implementa reglas de producción, bonos y venta de productos por vendedor en “La Bajadita Barber Shop”.

No modificar `.data.local`.
No exponer credenciales.
No tocar landing.
Mantener `npm run lint`, `npm run build` y `npm run smoke:supabase` limpios.

## Objetivo

Agregar control de producción de barberos, cálculo de ganancia por porcentaje asignado, configuración de bonos y registro de vendedor en productos agregados dentro de una atención.

## 1. Reglas de producción de servicios

La producción del barbero se calcula SOLO con servicios.

No cuentan:

* snacks
* bebidas
* productos de consumo
* total general de venta
* pagos
* propinas si existieran

Sí cuentan:

* servicios de barbería
* servicios personalizados
* adicionales tipo servicio

Regla base:

Si el servicio tiene precio mayor a S/ 60:

```txt
producción calculada = precio del servicio - 10
```

Si el servicio tiene precio menor o igual a S/ 60:

```txt
producción calculada = precio del servicio - 2
```

Ejemplos:

```txt
Servicio S/ 70 → producción S/ 60
Servicio S/ 60 → producción S/ 58
Servicio S/ 35 → producción S/ 33
```

Si el resultado fuera negativo, usar 0.

## 2. Ganancia del barbero

El admin debe poder configurar el porcentaje asignado a cada barbero.

Ejemplo:

```txt
Producción calculada del barbero: S/ 1000
Porcentaje asignado: 50%
Ganancia del barbero: S/ 500
```

Fórmula:

```txt
ganancia_barbero = producción_calculada * porcentaje_asignado / 100
```

El porcentaje debe poder variar por barbero.

Campos sugeridos en `employees` o tabla separada:

* `production_percentage`
* `production_active`

Recomendación: usar tabla separada para histórico:

```txt
barber_production_settings
```

Campos:

* id
* barber_id
* percentage
* effective_from
* effective_to
* is_active
* created_by
* created_at

## 3. Productos vendidos por barbero o recepción

Cuando se agregue un producto dentro de una atención, el sistema debe preguntar:

```txt
¿Quién vendió este producto?
```

Opciones:

* Recepción
* Barbero específico de la sede

Regla:

Si el producto es de barbería/cuidado, suma S/ 2 a favor del vendedor.

Ejemplos:

* gel
* cera
* crema
* shampoo
* after shave
* productos de cuidado personal

No deben sumar S/ 2:

* agua
* gaseosa
* energizante
* snacks
* bebidas

Agregar campo al producto:

```txt
counts_for_seller_credit boolean
seller_credit_amount numeric default 2
```

Al agregar producto a la atención:

* seleccionar `sold_by_employee_id`
* guardar `seller_credit_amount`
* guardar si cuenta o no para crédito

Si producto cuenta para vendedor:

```txt
crédito vendedor = cantidad * seller_credit_amount
```

Ejemplo:

```txt
2 ceras vendidas por barbero
crédito = 2 * S/ 2 = S/ 4
```

## 4. Bonos configurables

Crear módulo:

```txt
/app/control/bonos
```

Solo admin puede configurar.

Debe permitir:

* crear bono
* editar bono
* activar/desactivar bono
* monto del bono
* periodo de evaluación:

  * diario
  * semanal
  * mensual
* seleccionar servicios que cuentan para el bono
* definir meta:

  * por monto producido
  * por cantidad de servicios
* seleccionar si aplica por sede o global
* seleccionar barberos incluidos o todos

Ejemplo de bono:

```txt
Bono mensual fade premium
Monto bono: S/ 150
Servicios que cuentan: Corte premium, Corte + barba
Meta: S/ 1200 de producción
Periodo: mensual
```

Tablas sugeridas:

```txt
bonus_configs
bonus_config_services
bonus_config_barbers
barber_bonus_results
```

## 5. Producción calculada por atención

Cuando una atención queda `pagado`:

* calcular producción por cada item de servicio
* calcular crédito por productos de barbería/cuidado
* guardar snapshot del cálculo
* evitar doble cálculo
* si la atención se anula, revertir o marcar cálculo como anulado

Crear tabla sugerida:

```txt
barber_production_entries
```

Campos:

* id
* service_order_id
* service_order_item_id
* reservation_id nullable
* branch_id
* barber_id
* customer_id
* entry_type:

  * service
  * product_credit
  * bonus
  * adjustment
  * reversal
* gross_amount
* deduction_amount
* production_amount
* percentage
* barber_earning
* sold_by_employee_id nullable
* product_id nullable
* quantity
* description
* counted_at
* voided_at
* created_by

Reglas:

Para servicio:

* `barber_id` = barbero que hizo el servicio.
* `gross_amount` = precio del servicio.
* `deduction_amount` = 10 o 2.
* `production_amount` = precio - descuento.
* `barber_earning` = production_amount * percentage / 100.

Para producto:

* `sold_by_employee_id` = quien vendió.
* `gross_amount` = total del producto.
* `deduction_amount` = 0.
* `production_amount` = quantity * seller_credit_amount.
* `barber_earning` puede ser igual al crédito si es incentivo fijo, o guardarse como `production_amount`.
* No mezclar producto con producción de servicio.

## 6. UI en atención

En `/app/control/atenciones/[id]` o nueva atención:

Cuando se agregue servicio:

* seleccionar barbero responsable si no viene de reserva.
* mostrar producción estimada:

  * precio servicio
  * descuento aplicado
  * producción calculada
  * porcentaje del barbero
  * ganancia estimada

Cuando se agregue producto:

* seleccionar producto
* cantidad
* validar stock por sede
* seleccionar vendedor:

  * recepción
  * barbero
* si producto cuenta para crédito, mostrar:
  “Este producto suma S/ 2 por unidad al vendedor.”

## 7. Reporte de producción

Crear ruta:

```txt
/app/control/produccion
```

Visible para:

* admin
* recepción si se decide solo lectura de su sede
* barbero solo sus propios datos

Debe mostrar:

Filtros:

* fecha desde
* fecha hasta
* sede
* barbero
* tipo: servicios / productos / bonos / todos

Cards:

* producción bruta de servicios
* descuentos aplicados
* producción calculada
* ganancia barbero
* créditos por productos
* bonos ganados
* total a pagar estimado

Tabla:

* fecha
* barbero/vendedor
* tipo
* descripción
* monto bruto
* descuento
* producción
* porcentaje
* ganancia
* sede
* atención vinculada

## 8. Dashboard

Agregar al dashboard:

* producción del día
* producción de la semana
* producción del mes
* ranking de barberos por producción calculada
* ranking de créditos por productos
* bonos alcanzados o próximos a alcanzar

Importante:
El dashboard debe diferenciar:

```txt
Ventas reales = caja
Producción barbero = cálculo interno
Ganancia barbero = producción * porcentaje
```

No mezclar esos conceptos.

## 9. Auditoría

Auditar:

* cambio de porcentaje de barbero
* creación/edición de bono
* asignación de servicios que cuentan para bono
* atención pagada y producción calculada
* producto vendido con vendedor asignado
* ajuste manual de producción
* anulación/reversión de producción
* cambio de producto para contar crédito vendedor

## 10. SQL

Crear archivo incremental:

```txt
supabase/sql/016_barber_production_bonuses.sql
```

Debe agregar:

* tablas nuevas
* columnas necesarias en productos/items
* índices
* RLS
* funciones si conviene

No modificar destructivamente SQL anteriores.

## 11. Validación

Ejecutar:

```bash
npm run lint
npm run build
npm run smoke:supabase
```

Probar:

1. Configurar porcentaje de barbero en 50%.
2. Registrar atención con servicio de S/ 70.
3. Confirmar producción = S/ 60.
4. Confirmar ganancia = S/ 30.
5. Registrar atención con servicio de S/ 35.
6. Confirmar producción = S/ 33.
7. Confirmar ganancia = S/ 16.50 si porcentaje es 50%.
8. Agregar producto tipo gel con vendedor barbero.
9. Confirmar que suma S/ 2 al vendedor.
10. Agregar bebida y confirmar que no suma crédito.
11. Crear bono con monto y servicios elegibles.
12. Confirmar que producción/reporte distingue ventas reales de producción.
13. Anular atención y confirmar reversión o no duplicación.
14. Revisar auditoría.
15. Validar permisos por rol.

Entregar:

* SQL nuevo.
* APIs nuevas/modificadas.
* rutas nuevas.
* componentes nuevos.
* confirmación de cálculo de producción.
* confirmación de crédito por producto vendido.
* confirmación de configuración de bonos.
* resultado lint/build/smoke.
