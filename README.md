# ALETH·IA — Frontend

> *"Las noticias del día, mapeadas por su veracidad."*

ALETH·IA no es un agregador de noticias más. Es una **newsletter visual**: en lugar de listar artículos, mostramos el paisaje narrativo del día como un **mapa de embeddings (t-SNE)**. Cada nodo es un evento (cluster de artículos sobre un mismo hecho); su **tamaño** indica cuántos medios lo cubrieron y su **color** revela el grado de discrepancia entre las versiones que dan los distintos medios.

Mensaje implícito: leer un solo medio te deja con la mitad de la película.

---

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** estricto
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Zustand** para el estado de filtros (search + topic + medios)
- **Canvas 2D + D3** (`d3-scale`) para el mapa t-SNE
- **lucide-react** para íconos
- **next/font** con **Fraunces** (serif editorial) + **Inter** (sans)
- **pnpm** como package manager

---

## Setup local

```bash
cd front_end
pnpm install
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000).

Otros scripts:

```bash
pnpm build   # build de producción (genera estáticos para cada /event/[id])
pnpm start   # servir el build
pnpm lint    # eslint
```

> **Nota sobre `pnpm-workspace.yaml`**: contiene `allowBuilds` para `sharp` (optimización de imágenes) y `unrs-resolver` (resolver interno de Next.js). pnpm 11 lo necesita para no abortar el install. No lo borres.

---

## Estructura de carpetas

```
front_end/
├── app/
│   ├── layout.tsx                    # Fuentes + metadata + body global
│   ├── page.tsx                      # Home: wordmark, search, mapa, paneles
│   ├── globals.css                   # Tokens (--color-*) + base oscura
│   └── event/[id]/page.tsx           # Detalle del evento (3 bloques)
├── components/
│   ├── Wordmark.tsx                  # ALETH · IA en serif
│   ├── SearchBar.tsx                 # Búsqueda fuzzy
│   ├── EmbeddingMap.tsx              # Canvas + D3 (corazón del producto)
│   ├── MapLegend.tsx                 # Popover ⓘ con leyenda
│   ├── TrendingTopicsPanel.tsx       # Chips single-select
│   ├── MediaFilterPanel.tsx          # Checkboxes multi-select
│   ├── ConsensusBlock.tsx            # 🟢 Verdad consensuada
│   ├── IsolatedDataBlock.tsx         # 🟡 Datos aislados
│   ├── DiscrepanciesBlock.tsx        # 🔴 Discrepancias entre medios
│   └── ui/                           # Primitivos shadcn (popover, checkbox)
├── lib/
│   ├── types.ts                      # Event, EventDetail, Filters
│   ├── colors.ts                     # divergence → token
│   ├── filterStore.ts                # Zustand: search/topic/media
│   ├── mockData.ts                   # Loaders + filtro AND
│   └── cn.ts                         # clsx + tailwind-merge
└── public/data/
    ├── events.json                   # Lista de eventos (12 mock)
    └── event-{id}.json               # Detalle por evento (4 ricos)
```

---

## Cómo conectar datos reales (cuando exista el backend)

Toda la entrada de datos está aislada en **`lib/mockData.ts`**. Hay solo dos funciones que reemplazar:

```ts
// lib/mockData.ts

export async function loadEvents(): Promise<EventsPayload> {
  // ANTES (mock):
  // const data = (await import("@/public/data/events.json")).default;

  // DESPUÉS (backend real):
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
    next: { revalidate: 300 }, // ISR cada 5 min
  });
  return res.json();
}

export async function loadEventDetail(id: string): Promise<EventDetail> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${id}`, {
    next: { revalidate: 300 },
  });
  return res.json();
}
```

Los tipos (`EventsPayload`, `EventDetail`) ya están definidos en `lib/types.ts` y son el contrato que tu backend debe respetar:

```ts
EventsPayload {
  generated_at: string;
  events: Event[];
  trending_topics: string[];
  media_sources: string[];
}

EventDetail {
  verdad_consensuada: string[];
  datos_aislados: { hecho, fuente }[];
  contradicciones: { punto_de_choque, versiones }[];
}
```

> El resto del código (filtros, mapa, detalle) **no necesita cambiar** — ese es el punto de aislar la data en `mockData.ts`.

---

## 🚀 Despliegue en Vercel — paso a paso

Asumimos que nunca usaste Vercel. Es gratis para proyectos personales y el deploy automático desde Git viene activado por default.

### 1) Subir el repo a GitHub (o GitLab/Bitbucket)

Si todavía no está en un repo remoto, desde la **raíz del monorepo** (no desde `front_end/`):

```bash
# desde la raíz del proyecto, no desde front_end/
git init -b main
git add .
git commit -m "feat: initial ALETH.IA frontend"
```

Crear el repo vacío en GitHub (sin README, sin .gitignore — esos los traés vos):

```bash
# reemplazá <user>/<repo> por el tuyo
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

### 2) Importar el repo en Vercel

1. Andá a **[vercel.com/new](https://vercel.com/new)** y logueate (con GitHub es lo más fácil — autoriza la app de Vercel).
2. **"Import Git Repository"** → elegí el repo que subiste.
3. Vercel arranca un wizard. **Acá viene lo crítico**: como `front_end/` no es la raíz del repo, hay que decírselo.

### 3) Configuración del proyecto en el wizard

| Campo                | Valor                                      | Por qué                                                                                  |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Project name**     | `aleth-ia` (o lo que quieras)              | Define la URL: `aleth-ia.vercel.app`                                                     |
| **Framework Preset** | `Next.js`                                  | Se autodetecta. Si no, elegilo a mano.                                                   |
| **Root Directory**   | `front_end`                                | **¡Importantísimo!** Click en "Edit" y poné esta carpeta. Si no, Vercel buildea la raíz. |
| **Build Command**    | `next build` (default)                     | Lo deja Vercel solo.                                                                     |
| **Output Directory** | `.next` (default)                          | Lo deja Vercel solo.                                                                     |
| **Install Command**  | `pnpm install` (autodetectado por el lock) | Si no lo detecta, ponelo manual.                                                         |
| **Node version**     | 20.x o superior                            | Lo configura solo a partir del lockfile.                                                 |

### 4) Variables de entorno

En el MVP **no hace falta ninguna** — los datos vienen de JSONs estáticos en `public/data/`.

Cuando conectes el backend real:

| Key                   | Value                              | Environments                  |
| --------------------- | ---------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api.aleth.ia` (tu backend)| Production, Preview, Development |

Se cargan desde **Settings → Environment Variables** del proyecto. Al cambiarlas, redeployá manualmente desde la pestaña **Deployments**.

### 5) Click en "Deploy"

- Tarda ~1-2 minutos.
- Cuando termina, te tira la URL pública: `https://aleth-ia.vercel.app` (o el nombre que hayas elegido).
- Cada **push a `main`** dispara un deploy a producción automáticamente.
- Cada **push a otra rama / PR** crea una **preview** con su propia URL temporal — perfecto para review.

### 6) Dominio custom (opcional)

Cuando tengas un dominio:

1. **Settings → Domains → Add**.
2. Pegá tu dominio (`aleth.ia` o el que sea).
3. Vercel te muestra los registros DNS a configurar en tu registrar (un `A` o `CNAME`).
4. Cargalos en tu proveedor (Cloudflare, GoDaddy, NIC.ar, etc).
5. Vercel emite el certificado SSL solo. Listo en minutos a horas, según propagación DNS.

### 7) Deploy manual desde la CLI (opcional)

Si querés deployar sin pasar por Git:

```bash
pnpm dlx vercel        # primera vez: link interactivo (elegí Root Directory = .)
pnpm dlx vercel --prod # forzar production
```

> Corré la CLI **desde dentro de `front_end/`**, no desde la raíz.

### Troubleshooting rápido

| Síntoma                              | Causa probable                                          | Fix                                                                  |
| ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------- |
| `Module not found: ./public/data/…`  | Root Directory mal seteado                              | Settings → General → Root Directory = `front_end`                    |
| Build falla en `pnpm install`        | pnpm 11 pide aprobar builds                             | Verificá que `pnpm-workspace.yaml` esté commiteado al repo           |
| Fonts en blanco / 404                | Bloqueo de red al descargar fuentes Google              | No suele pasar en Vercel. Verificá `next/font` config en `layout.tsx`|
| `Hydration failed`                   | Diff entre SSR y client                                 | Mirá `useFilters` — todos los componentes con hooks tienen `"use client"` |

---

## Próximos pasos / Backlog

Visualizaciones diferidas para post-MVP (mencionadas en el brief original):

- **V-01** — Línea temporal de cobertura por evento.
- **V-03 a V-12** — Otras visualizaciones complementarias (matriz de medios, heatmap por horario, sankey de migración de narrativa, etc).

Otros pendientes:

- Cableado al backend real (reemplazo de `lib/mockData.ts`, ver sección anterior).
- Pan & zoom en el mapa (drag + wheel).
- Vista mobile más rica para el detalle (swipe entre bloques).
- Tests (Playwright para flujos end-to-end, Vitest para `lib/*`).

Lo que **queda fuera de scope** y no se va a implementar en este frontend:

- Login / autenticación / perfiles.
- Header global con navegación interna.
- Sidebar persistente.
- Selector temporal o histórico (el MVP solo muestra las últimas 24h).
