# HackIAthon Devlights 2026 - Grupo 11 ⭐️ — Inu

Repositorio oficial del Grupo 11. Plataforma de reportes ciudadanos e inundaciones para Corrientes/Resistencia (Next.js 16 + Supabase + Bots Telegram/WhatsApp).

## Estructura del proyecto

```
/
├── src/
│   ├── app/              # App Router (src/app)
│   ├── components/       # ui/ common/ home/ map/ regions/
│   ├── hooks/            # hooks + hooks/home/
│   ├── lib/              # cn, format, constants, supabase, geocode, heatmap, routing, zones
│   ├── services/         # supabase data access
│   └── types/
├── docs/                 # Documentación de dominio (ver abajo)
├── supabase/             # migrations + Edge Functions
├── public/
└── AGENTS.md             # Reglas para agentes (Next.js)
```

Alias `@/*` → `src/*` (ver `tsconfig.json`).

## Documentación

| Doc                                  | Descripción                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [Arquitectura](docs/architecture.md) | Visión general, DB Supabase (user_sessions, reports), Edge Functions `_shared`                            |
| [Bot](docs/bot.md)                   | Extracción calles RAG/Fuzzy, máquina estados, catálogo respuestas, lecciones IA (incluye diagrama FLUJOS) |
| [Scoring](docs/scoring.md)           | Sistema puntos v2.1, gravedad, foto, clima, decay temporal, heatmap config                                |
| [Rutas seguras](docs/routing.md)     | GraphHopper/OSRM, costo por riesgo, mapa calor                                                            |
| [Supabase CLI](docs/supabase.md)     | `supabase login/start/stop/db pull/push/functions serve/deploy`                                           |
| `AGENTS.md`                          | Reglas Next.js para agentes                                                                               |

## Scripts

```bash
npm run dev      # next dev
npm run build    # next build
npm run lint
npm run format
npx supabase functions serve --no-verify-jwt
```
