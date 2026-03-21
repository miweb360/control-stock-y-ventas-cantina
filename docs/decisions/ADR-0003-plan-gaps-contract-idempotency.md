# ADR-0003: Cierre de gaps del IMPLEMENTATION_PLAN (sin capas domain/application)

## Estado

Aceptado

## Contexto

El `IMPLEMENTATION_PLAN.md` sugería endpoints y reglas (DELETE producto, reportes por nombre, idempotencia en líneas de venta). Se acordó **no** forzar arquitectura en capas (`domain` / `application` / `interface/http`) y mantener el estilo actual (Next.js Route Handlers + `lib` + Prisma).

## Decisiones

1. **`DELETE /api/v1/products/:id`**  
   Solo si el producto **no** tiene `sale_items` ni `inventory_movements`. Si tiene historial → **409** y se indica usar `PATCH` con `INACTIVO`.

2. **Idempotencia en `POST .../recess-sessions/:id/items`**  
   - Body opcional `idempotencyKey` (8–128 caracteres, típ. UUID).  
   - Tabla `RecessAddItemIdempotency` con `@@unique([recessSessionId, key])`.  
   - Con clave presente: `pg_advisory_xact_lock(hashtext(sessionId), hashtext(key))` dentro de la transacción para evitar carreras.  
   - Replays: misma respuesta JSON y header `Idempotent-Replayed: true`.  
   - UI `/sale`: `crypto.randomUUID()` por operación + `useRef` para bloquear doble envío mientras hay request en curso.

3. **Endpoints de reporte alineados al plan**  
   - `GET /api/v1/reports/sales-by-recess` — recreos cerrados en rango.  
   - `GET /api/v1/reports/sales-by-day` — agregación por día (UTC).  
   - `GET /api/v1/reports/stock` — alias de la lógica de `GET /api/v1/stock`.  
   - Se mantienen `sales-summary` y `top-products` existentes.

4. **Stock compartido**  
   Lógica extraída a `src/lib/stock-report.ts` para `/stock` y `/reports/stock`.

## Consecuencias

- Migración DB obligatoria: `RecessAddItemIdempotency`.  
- Clientes que no envíen `idempotencyKey` no cambian de comportamiento.  
- El plan original de carpetas `domain`/`application` queda explícitamente fuera de alcance.
