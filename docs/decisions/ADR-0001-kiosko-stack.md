# ADR-0001: Stack de Kiosco (Next.js + Postgres)

## Estado
Aceptado (propuesta inicial).

## Contexto
Se requiere una aplicación full-stack para controlar stock y ventas de un kiosco escolar durante los recreos, con:

- Frontend y backend en un mismo proyecto (Next.js).
- Base de datos PostgreSQL levantable con Docker.
- Arquitectura mantenible con principios SOLID/clean en backend (y separación adecuada en frontend).
- Operación crítica: registrar ítems durante el recreo con mínima fricción.

## Decisión
1. Usar **Next.js** (App Router) con **TypeScript**.
2. Usar **PostgreSQL** como base de datos, con **Docker Compose** para desarrollo.
3. Usar **Prisma** para modelado/ORM y migraciones.
4. Separar el “core de dominio” fuera de `app/`:
   - `src/domain/` (entidades, reglas puras, errores de dominio)
   - `src/application/` (casos de uso + puertos)
   - `src/infrastructure/` (Prisma/repositorios/implementaciones)
   - `src/interface/http/` (mappers DTO->casos de uso; respuestas)
5. Los endpoints HTTP vivirán en `app/api/.../route.ts` y serán “delgados”: validan input y llaman casos de uso.

## Consecuencias
- Ventaja: reglas de negocio testeables sin levantar Next.
- Ventaja: facilidad para agregar reportes o cambiar persistencia en el futuro.
- Costo: estructura inicial un poco más grande (pero clave para no crear un “monolito” difícil de sostener).

