# ADR-0002: API de reportes de ventas (ADMIN)

## Estado

Aceptado

## Contexto

Los recreos cerrados guardan `totalAmount` y líneas en `SaleItem`. Se necesita visibilidad para el administrador sin exponer datos sensibles a operadores.

## Decisión

- Endpoints bajo `/api/v1/reports/*` con **solo rol ADMIN** (403 para OPERADOR).
- **Resumen** (`GET .../sales-summary`): agrega sesiones `CLOSED` filtradas por `closedAt` en rango `from`–`to` (fechas `YYYY-MM-DD`, interpretadas en **UTC**).
- **Top productos** (`GET .../top-products`): agregación SQL por `productId` sobre ítems cuya sesión está `CLOSED` y `closedAt` en el mismo rango; orden por importe total (`qty * unitPriceRef`).
- Si faltan `from`/`to`, default: **últimos 7 días calendario UTC** (mismo criterio en ambos endpoints).

## Consecuencias

- Operadores no pueden consultar reportes por API aunque estén autenticados.
- Zona horaria: MVP en UTC; si hace falta día “local” (ej. Argentina), habría que parametrizar offset o timezone en una iteración posterior.
