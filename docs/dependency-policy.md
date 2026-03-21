# Políticas de Dependencias (Compatibilidad)

Este documento define un “gate” mínimo antes de agregar o actualizar librerías.

## Objetivo
Evitar problemas de compatibilidad entre:
- Next.js (App Router)
- Node.js (runtime local)
- TypeScript (tipado estricto)
- Ecosistema de lint/build (ESLint)

## Regla de compatibilidad (checklist)
Antes de agregar una dependencia nueva:

1. Confirmar soporte del stack
- Next.js version esperada: `16.x`
- TypeScript presente y se usa: `npm run typecheck` debe pasar
- ESLint usa config flat (`eslint.config.js`) en ESLint v9+

2. Validar TypeScript
- Si la librería no trae tipos, agregar el paquete `@types/<lib>` si existe.
- Evitar librerías “sin tipos” salvo justificación.

3. Validar engines/peerDependencies
- Revisar `peerDependencies` y `engines` del paquete.
- Si el paquete requiere Node >= 22.13.0, se sugiere actualizar Node local.

4. Validar lint/typecheck/build después del cambio
- `npm run lint`
- `npm run typecheck`
- `npm run build`

5. Seguridad mínima
- Correr `npm audit --omit=dev` y dejar el proyecto en “0 vulnerabilities” o justificar el desvío.

## En caso de conflicto
Si aparecen conflictos de peer deps o fallan checks:
- priorizar mantener versiones que ya pasan (`build` y `typecheck`)
- documentar una ADR en `docs/decisions/` describiendo el motivo del desvío y la solución adoptada.

