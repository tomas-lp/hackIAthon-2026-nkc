# Estructura Frontend — Inú (Next.js 16 + src/)

> Guía general para agentes y contribuidores. Define **dónde crear cada tipo de cosa** y **principios** para mantener el frontend limpio. Los archivos cambian, las carpetas no.

## 1. Principios

- **App Router con `src/`**: todo el código vive en `src/`. Alias `@/*` → `src/*` (`tsconfig.json`).
- **Sin feature slicing**: no crear `src/features/`. La UI se agrupa por reutilización, no por feature vertical.
- **Server por defecto**: `src/app/` son Server Components. `"use client"` solo si hay `useState`/`useEffect`/`window`/`leaflet`.
- **Separación responsabilidades**: páginas orquestan, componentes presentan, hooks contienen lógica con estado, `lib` es puro sin React, `services` solo dentro de hooks.
- **Componentes pequeños**: evitar god components. Si un componente pasa de ~300 LOC, extraer hooks y subcomponentes en `_parts/`.

## 2. Mapa de carpetas (solo directorios)

```
src/
├── app/                 # Ruteo Next.js (cada carpeta = segmento URL)
│   ├── api/             # Route Handlers (route.ts)
│   └── auth/            # Server actions / helpers de auth
├── components/
│   ├── ui/              # Genérico puro, reutilizable en cualquier página
│   ├── common/          # Compartido entre varias páginas
│   ├── home/            # Exclusivo de la página "/"
│   │   └── _parts/      # Subcomponentes presentacionales de home
│   ├── map/             # Mapa Leaflet (domínio mapa)
│   └── regions/         # Exclusivo de "/regiones-personalizadas"
├── hooks/
│   ├── (hooks globales) # Lógica compartida entre páginas
│   └── home/            # Hooks exclusivos de home
├── lib/
│   ├── supabase/        # clients server/browser/middleware (única fuente)
│   └── (helpers puros)  # ej: cn, format, constants, geocode, heatmap, routing
├── services/            # Acceso a datos (Supabase), siempre vía hooks
└── types/               # Tipos compartidos
```

## 3. Dónde crear cada tipo de cosa

| Qué                      | Dónde                                    | Nota                                                       |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------- |
| Nueva página `/foo`      | `src/app/foo/page.tsx`                   | Server Component. Fetch + auth aquí.                       |
| API endpoint             | `src/app/api/foo/route.ts`               | `export async function GET/POST`                           |
| Componente genérico      | `src/components/ui/Foo.tsx`              | Sin lógica de negocio, props puras                         |
| Compartido entre páginas | `src/components/common/Foo.tsx`          | Si lo usan ≥2 páginas                                      |
| Exclusivo de una página  | `src/components/{pagina}/Foo.tsx`        | Ej: `home`, `map`, `regions`                               |
| Subparte de un dashboard | `src/components/{pagina}/_parts/Foo.tsx` | Solo usado por su padre                                    |
| Hook global              | `src/hooks/useFoo.ts`                    | Reutilizable                                               |
| Hook exclusivo de página | `src/hooks/{pagina}/useFoo.ts`           | No importar desde fuera de esa página                      |
| Lógica pura              | `src/lib/foo.ts`                         | Sin React, testeable                                       |
| Acceso a datos           | `src/services/fooService.ts`             | Nunca importado directo en componente, solo dentro de hook |
| Tipos                    | `src/types/foo.ts`                       | Interfaces compartidas                                     |

## 4. Convenciones

- **Nombres:** `PascalCase` para componentes, `camelCase` para hooks (`useX`), archivos `*.tsx` si hay JSX, `*.ts` si no.
- **Imports:** `@/*` para cruzar carpetas, relativo `./` solo para hermanos en misma carpeta. Nunca `@/features` ni `@/utils`.
- **Client/Server:** si usas `useState`/`window`/`leaflet` → `"use client"` arriba. Si usas `cookies()` → `server-only` y `src/lib/supabase/server`.
- **Estilo:** `cn()` para clases, `formatDate`/`TYPE_CONFIG` desde `lib` puro.

## 5. Ejemplos genéricos

**Página protegida:**

```tsx
// src/app/ejemplo/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function EjemploPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return (
    <main>
      <EjemploView user={user} />
    </main>
  );
}
```

**Hook pequeño con servicio dentro:**

```tsx
// src/hooks/home/useFoo.ts
"use client";
import { useSafeZones } from "@/hooks/useSafeZones";
export function useFoo() {
  const { safeZones } = useSafeZones();
  // lógica acotada
  return { safeZones };
}
```

**Componente Switch genérico:**

```tsx
import { Switch } from "@/components/ui/Switch";
<Switch value={active} onValueChange={setActive}>
  <Switch.Option value="a">A</Switch.Option>
  <Switch.Option value="b">B</Switch.Option>
</Switch>;
```

## 6. Checklist PR

- [ ] Estructura respeta carpetas de §2 (no `features`, no `utils`)
- [ ] Componente < ~300 LOC y sin servicios directos (vía hook)
- [ ] `npm run build` y `npx eslint` pasan

## 7. Principios Clean Code

- Mantener los archivos pequeños
- Usar nombres de variables claros
- Evitar anidación profunda de código
- Separar la lógica de negocio de la UI

> Agentes: leer `AGENTS.md` y este doc antes de crear páginas/componentes/hooks.
