# Plan de Implementación (MVP → Producción)

Este documento guía el desarrollo del sistema de control de stock y ventas para kiosco escolar.

## Supuestos de alcance (para evitar ambigüedades)

- El “modo venta” existe por cada **sesión de recreo**.
- Al cerrar una sesión, se cierra el ticket interno y queda listo para reportes.
- Cada venta (línea) genera automáticamente un **movimiento de stock OUT** transaccional.
- “Registro de cobro” es informativo para el kiosco (no integra pasarela de pago).

## MVP: features priorizadas (por valor operativo)

### 1) Infraestructura mínima
1. Next.js (App Router) + TypeScript.
2. Postgres con Docker Compose.
3. Prisma (schema inicial + migración).
4. Esqueleto de arquitectura:
   - `src/domain`
   - `src/application`
   - `src/infrastructure`
   - `src/interface/http`

### 2) Catálogo de productos (ADMIN)
1. ABM productos:
   - `nombre`
   - `barcode` opcional
   - `precio_ref`
   - `activo`
2. Validaciones:
   - barcode con unicidad lógica (si está presente)
   - precios >= 0

### 3) Gestión de stock (ADMIN)
1. Registrar ingresos (`IN`):
   - razón (reposición / carga inicial)
   - qty
2. Registrar ajustes (`ADJUST`):
   - razón
   - qty (puede ser positivo/negativo según convención)
3. Registrar bajas por vencimiento (`EXPIRE`):
   - razón explícita + trazabilidad

### 4) Modo venta por recreo (OPERADOR) - flujo crítico
1. Abrir sesión de recreo:
   - identifica fecha/hora y genera `recess_session` en estado `OPEN`
2. Registrar líneas de venta:
   - escaneo por `barcode`
   - selección rápida de productos sin `barcode`
3. Reglas obligatorias (de dominio):
   - no aceptar items en sesión `CLOSED`
   - no permitir OUT que deje stock por debajo de 0 (o definir política alternativa)
   - idempotencia básica por “evento de escaneo” si aplica (para evitar dobles clicks)
4. Cerrar sesión:
   - calcula total del ticket (suma qty * precio_ref al momento de registrar)
   - pasa `recess_session` a `CLOSED`
   - registra `payment_summary` (informativo)

### 5) Reportes
1. Ventas por recreo
2. Ventas por día (con filtros de rangos)
3. Productos más vendidos
4. Stock actual por producto
5. Historial de movimientos (auditoría)

## Endpoint/API: contrato sugerido (REST)

Se recomienda prefijar `api/v1`.

- `POST /api/v1/recess-sessions` (open)
- `POST /api/v1/recess-sessions/:id/items` (add scanned/selected item)
- `POST /api/v1/recess-sessions/:id/close` (close)
- `POST /api/v1/inventory-movements` (admin IN/ADJUST/EXPIRE)
- `GET /api/v1/products`
- `POST /api/v1/products` / `PATCH /api/v1/products/:id` / `DELETE /api/v1/products/:id`
- `GET /api/v1/reports/sales-by-recess`
- `GET /api/v1/reports/sales-by-day`
- `GET /api/v1/reports/top-products`
- `GET /api/v1/reports/stock`

## Modelo de datos (mínimo, basado en el documento recibido)

- `users` (roles)
- `products`
- `inventory_movements` (IN/OUT/ADJUST/EXPIRE)
- `recess_sessions` (OPEN/CLOSED + totales)
- `sale_items` (líneas del ticket)
- (opcional para MVP pero recomendable) `payment_summaries` (informativo)

## Indices recomendados (Postgres)

Para reportes rápidos y operación estable:

- `products(barcode)` index/unique cuando aplica
- `recess_sessions(status, opened_at desc)`
- `sale_items(session_id)`
- `inventory_movements(product_id, created_at desc)`
- `inventory_movements(created_at)`

## Transacciones y consistencia (regla de oro)

- Registrar una línea de venta debe ser una transacción que:
  1) valide sesión OPEN
  2) valide stock disponible
  3) inserte `sale_item`
  4) inserte `inventory_movement OUT`
  5) actualice total de sesión (o lo derive)

## Secuencia de desarrollo sugerida (sprints)

1. Sprint 1 (Infra + salud API)
   - DB + Prisma
   - `GET /health`
2. Sprint 2 (Catálogo + auth mínima)
   - ABM de productos
3. Sprint 3 (Stock admin)
   - IN / ADJUST / EXPIRE
4. Sprint 4 (Modo venta end-to-end)
   - open → items → close
5. Sprint 5 (Reportes)
   - reportes + UI básica
6. Sprint 6 (Hardening)
   - índices extra, locks/concurrencia, tests, observabilidad

## Nota de implementación (marzo 2026)

- La estructura de carpetas `domain` / `application` / `interface/http` del plan se **dejó como guía opcional**; el código usa Route Handlers de Next.js + `src/lib` + Prisma, documentado en `docs/decisions/ADR-0003-plan-gaps-contract-idempotency.md`.
- Endpoints adicionales alineados al contrato sugerido: `GET /api/v1/reports/sales-by-recess`, `GET /api/v1/reports/sales-by-day`, `GET /api/v1/reports/stock`, `DELETE /api/v1/products/:id` (sin historial), idempotencia opcional en `POST .../items` con `idempotencyKey`.

## Checklist de verificación manual (MVP)

- En laboratorio: simular recreo con 30-50 escaneos seguidos.
- Intentar cerrar sesión y luego escanear (debe rechazar).
- Forzar stock insuficiente (debe impedir OUT o aplicar la política definida).
- Testear reporte del día y confirmar que cuadra con el ticket por recreo.

