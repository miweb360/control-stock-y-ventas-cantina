# Runbook Local (Docker + Next + Prisma)

## 1) Requisitos

- Docker instalado y funcionando.
- Node.js 20+.

## 2) Levantar PostgreSQL

```powershell
docker compose up -d
```

## 3) Configurar variables de entorno

Copia `.env.example` a `.env` (y opcionalmente a `.env.local`):

```powershell
Copy-Item .env.example .env
```

## 4) Instalar dependencias

```powershell
npm install
```

## 5) Prisma (migraciones + generación + seed)

**Importante (Windows):** si tenés `DATABASE_URL` en variables de entorno del sistema (p. ej. apuntando a `5432`), `npx prisma migrate` puede ignorar el `.env` del proyecto. Este repo usa scripts que **fuerzan** `.env` / `.env.local`:

```powershell
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

Para un nombre de migración explícito:

```powershell
npm run prisma:exec -- migrate dev --name nombre_migracion
```

## 6) Levantar el servidor Next

```powershell
npm run dev
```

## 7) Verificación

Abrir en el navegador:

- `http://localhost:3000/api/v1/health` → `{ "status": "ok" }`
- `http://localhost:3000/login` → pantalla de login
- Login: `admin@kiosco.local` / `admin123` → redirige a `/admin`
- Login: `operador@kiosco.local` / `operador123` → redirige a `/sale`

## 8) Postman

Colecciones en `postman/`:
- `auth.postman_collection.json` — Login, Me, Logout (importar en Postman y usar `baseUrl` = `http://localhost:3000`)

