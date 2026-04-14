# NitroGroups — Frontend Architecture

> **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · TanStack React Query · Axios · Auth0

---

## Estructura de carpetas

```
src/
├── app/                    # Next.js App Router (páginas y API routes)
│   ├── api/auth/           # Rutas de servidor para autenticación
│   ├── dashboard/          # Páginas de dashboard
│   ├── groups/             # Páginas públicas de grupos
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── onboarding/         # Wizard de onboarding (musician / manager)
│   ├── layout.tsx          # Layout raíz (Providers + Header)
│   ├── providers.tsx       # AuthProvider + QueryClientProvider
│   └── page.tsx            # Landing page
│
├── features/               # ⭐ Módulos de funcionalidad (Feature Modules)
│   ├── auth/               # Autenticación
│   │   ├── components/     # LoginButton, LogoutButton, UserProfile, Protector
│   │   ├── hooks/          # Hooks específicos de auth
│   │   ├── services/       # auth.service, users.service, session, auth0-config
│   │   └── types/          # Tipos de auth
│   ├── groups/             # Grupos musicales
│   │   ├── components/     # GroupProfile, GroupCalendar
│   │   ├── hooks/
│   │   ├── services/       # groups.service
│   │   └── types/
│   └── musicians/          # Músicos
│       └── services/       # musicians.service
│
├── components/             # Componentes compartidos
│   ├── ui/                 # UI Kit: Button, Card, Input, Alert, Badge, etc.
│   ├── shared/             # Componentes de layout (header, navigation)
│   ├── icons/              # Íconos SVG
│   └── Header.tsx          # Header principal
│
├── hooks/                  # Hooks globales
│   ├── useAuth.tsx         # AuthProvider + useAuth (sesión custom)
│   └── useCurrentUser.ts   # Combina sesión + datos de DB con React Query
│
├── lib/                    # Librerías y configuración
│   └── api-client.ts       # Instancia Axios configurada
│
├── config/                 # Configuración de la app
│   └── routes.ts           # Constantes de rutas (ROUTES.AUTH.LOGIN, etc.)
│
├── types/                  # Tipos globales (modelos de dominio)
│   ├── User.ts             # User, CreateUserDto, UpdateUserDto
│   ├── Musician.ts         # Musician types
│   └── MusicGroup.ts       # MusicGroup types
│
├── utils/                  # Utilidades (helpers puros)
│
└── proxy.ts                # Middleware: custom session + Auth0 + API routing
```

---

## Patrones principales

### 1. Feature Module

Cada funcionalidad se organiza en `src/features/<nombre>/` con la siguiente estructura:

```
features/<feature>/
├── components/     # Componentes React específicos del feature
│   └── index.ts    # Barrel export
├── hooks/          # Custom hooks del feature
├── services/       # Llamadas a API (CRUD)
└── types/          # Interfaces y tipos específicos
```

**Regla**: Un feature NUNCA importa de otro feature directamente. Si necesitas compartir, mueve a `components/ui/`, `hooks/`, o `types/`.

### 2. Service Pattern

Todos los servicios siguen el mismo patrón. Ejemplo de `groups.service.ts`:

```typescript
import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/features/auth/services/auth.service";

// 1. Definir interfaces de Request y Response
export interface CreateGroupRequest {
    slug: string;
    groupName: string;
    description: string;
    // ...
}

export interface GroupResponse {
    id: number;
    slug: string;
    groupName: string;
    // ...
}

// 2. Exportar un objeto con métodos CRUD
export const groupsService = {
    create: async (request: CreateGroupRequest): Promise<GroupResponse> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<GroupResponse>(
            "/groups",
            request,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        return data;
    },

    getBySlug: async (slug: string): Promise<GroupResponse> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<GroupResponse>(`/groups/${slug}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data;
    },
    // ...más métodos
};
```

**Patrón clave en cada método:**
1. Obtener token con `await getApiAccessToken()`
2. Usar `apiClient.get/post/put/delete` con typing genérico
3. Pasar `Authorization: Bearer` en headers
4. Retornar `data` directamente (Axios lo desenvuelve)

### 3. Autenticación

```
Browser → /api/auth/login (ROPG) → Auth0 → access_token
                                            ↓
                            Guarda en cookie "nitro_session" (JWT firmado)
                                            ↓
          getApiAccessToken() → /api/auth/token → lee cookie → retorna token
                                            ↓
          apiClient.post("/groups", ..., { Authorization: Bearer <token> })
                                            ↓
          next.config.ts rewrite → Backend .NET (localhost:5144)
```

| Archivo | Propósito |
|---|---|
| `app/api/auth/login/route.ts` | Login con ROPG grant → guarda sesión en cookie |
| `app/api/auth/token/route.ts` | Retorna el access token de la sesión |
| `app/api/auth/profile/route.ts` | (via `proxy.ts`) Retorna datos del usuario |
| `features/auth/services/session.ts` | Lee/valida la cookie `nitro_session` (server-side) |
| `features/auth/services/auth.service.ts` | `getApiAccessToken()` (client-side) |
| `hooks/useAuth.tsx` | `AuthProvider` + `useAuth()` hook (estado global) |
| `hooks/useCurrentUser.ts` | Combina sesión + datos de PostgreSQL via React Query |

### 4. Proxy y Rewrites

`src/proxy.ts` es el middleware de Next.js. Decide qué hacer con cada request:

| Ruta | Acción |
|---|---|
| `/api/auth/profile` | Responde directo con datos de la cookie |
| `/api/users/*`, `/api/musicians/*`, `/api/groups/*` | `NextResponse.next()` → Rewrite al backend |
| `/api/auth/sync` | `NextResponse.next()` → Rewrite al backend |
| Todo lo demás | `auth0.middleware()` |

`next.config.ts` define los rewrites que redirigen al backend .NET:

```typescript
{
  source: "/api/users/:path*",
  destination: "http://localhost:5144/api/users/:path*",
}
```

### 5. UI Kit

Componentes reutilizables en `src/components/ui/`. Todos se exportan desde `index.ts`:

```typescript
import { Button, Input, Card, Alert, Badge, Loader, ProgressSteps } from "@/components/ui";
```

| Componente | Uso |
|---|---|
| `Button` | Botón con variantes (primary, secondary, ghost, danger) |
| `Input` | Input con label, error, ícono |
| `Card` | Contenedor con sombra |
| `Alert` | Mensaje de info/error/warning |
| `Badge` | Etiqueta de estado |
| `Loader` | Spinner animado |
| `ProgressSteps` | Barra de progreso para wizards |
| `PhoneInput` | Input de teléfono con país (LATAM) |
| `TabbedSection` | Tabs navegables |

### 6. Routing

Usa constantes en lugar de strings:

```typescript
import { ROUTES } from "@/config/routes";

// ✅ Correcto
router.push(ROUTES.AUTH.LOGIN);
router.push(ROUTES.GROUPS.PUBLIC_PROFILE("los-rockers"));

// ❌ Incorrecto
router.push("/login");
```

---

## Guía: Crear una nueva funcionalidad

Ejemplo: crear el módulo **"Reviews"** (reseñas de grupos).

### Paso 1 — Crear la estructura del feature

```
src/features/reviews/
├── components/
│   ├── ReviewCard.tsx
│   ├── ReviewForm.tsx
│   └── index.ts
├── hooks/
│   └── useGroupReviews.ts
├── services/
│   └── reviews.service.ts
└── types/
    └── index.ts
```

### Paso 2 — Definir los tipos

```typescript
// src/features/reviews/types/index.ts
export interface Review {
    id: number;
    contractId: number;
    reviewerUserId: number;
    reviewedGroupId: number;
    rating: number;
    comment?: string;
    reviewDate: string;
}

export interface CreateReviewRequest {
    contractId: number;
    reviewedGroupId: number;
    rating: number;
    punctualityRating?: number;
    qualityRating?: number;
    professionalismRating?: number;
    valueRating?: number;
    comment?: string;
}
```

### Paso 3 — Crear el servicio

```typescript
// src/features/reviews/services/reviews.service.ts
import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/features/auth/services/auth.service";
import type { Review, CreateReviewRequest } from "../types";

export const reviewsService = {
    getByGroupId: async (groupId: number): Promise<Review[]> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<Review[]>(
            `/groups/${groupId}/reviews`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        return data;
    },

    create: async (request: CreateReviewRequest): Promise<Review> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<Review>(
            "/reviews",
            request,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        return data;
    },
};
```

### Paso 4 — Crear un hook con React Query

```typescript
// src/features/reviews/hooks/useGroupReviews.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { reviewsService } from "../services/reviews.service";

export function useGroupReviews(groupId: number) {
    return useQuery({
        queryKey: ["reviews", groupId],
        queryFn: () => reviewsService.getByGroupId(groupId),
        enabled: groupId > 0,
        staleTime: 1000 * 60 * 5, // 5 min cache
    });
}
```

### Paso 5 — Crear componentes

```tsx
// src/features/reviews/components/ReviewCard.tsx
import { Card, Badge } from "@/components/ui";
import type { Review } from "../types";

export function ReviewCard({ review }: { review: Review }) {
    return (
        <Card>
            <div className="flex items-center gap-2">
                <Badge variant="outline">⭐ {review.rating}/5</Badge>
            </div>
            {review.comment && <p>{review.comment}</p>}
        </Card>
    );
}
```

```typescript
// src/features/reviews/components/index.ts
export { ReviewCard } from "./ReviewCard";
export { ReviewForm } from "./ReviewForm";
```

### Paso 6 — Registrar la ruta del API

Si el backend tiene `POST /api/reviews`, agrega el rewrite en `next.config.ts`:

```typescript
{
    source: "/api/reviews/:path*",
    destination: `${backendUrl}/reviews/:path*`,
},
```

Y en `proxy.ts`, agrega el prefijo:

```typescript
const BACKEND_API_PREFIXES = [
    "/api/musicians",
    "/api/groups",
    "/api/users",
    "/api/auth/sync",
    "/api/reviews",  // ← nuevo
];
```

### Paso 7 — Agregar la ruta de la página

```typescript
// src/config/routes.ts
export const ROUTES = {
    // ...existentes
    REVIEWS: {
        GROUP: (groupId: number) => `/groups/${groupId}/reviews`,
    },
} as const;
```

### Paso 8 — Usar en una página

```tsx
// src/app/groups/[slug]/reviews/page.tsx
"use client";

import { useGroupReviews } from "@/features/reviews/hooks/useGroupReviews";
import { ReviewCard } from "@/features/reviews/components";
import { Loader } from "@/components/ui";

export default function GroupReviewsPage({ params }: { params: { slug: string } }) {
    const { data: reviews, isLoading } = useGroupReviews(/* groupId */);

    if (isLoading) return <Loader />;

    return (
        <div>
            <h1>Reseñas</h1>
            {reviews?.map(review => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );
}
```

---

## Checklist para nueva funcionalidad

- [ ] Crear carpeta en `src/features/<nombre>/`
- [ ] Definir tipos en `types/index.ts`
- [ ] Crear servicio con el patrón `apiClient` + `getApiAccessToken()`
- [ ] Crear hook con React Query (si el componente necesita data fetching)
- [ ] Crear componentes en `components/` con barrel export en `index.ts`
- [ ] Agregar rewrite en `next.config.ts` (si es ruta nueva del backend)
- [ ] Agregar prefijo en `proxy.ts` → `BACKEND_API_PREFIXES`
- [ ] Agregar constante de ruta en `config/routes.ts`
- [ ] Crear la página en `app/`


---

## Variables de entorno

| Variable | Dónde | Propósito |
|---|---|---|
| `AUTH0_DOMAIN` | Server | Dominio Auth0 |
| `AUTH0_CLIENT_ID` | Server | Client ID de Auth0 |
| `AUTH0_CLIENT_SECRET` | Server | Client Secret (ROPG) |
| `AUTH0_AUDIENCE` | Server | Audience del API |
| `AUTH0_SECRET` | Server | Secret para firmar cookie de sesión |
| `AUTH0_DB_CONNECTION` | Server | Nombre de la DB connection en Auth0 |
| `APP_BASE_URL` | Server | URL base de la app |
| `NEXT_PUBLIC_API_BASE_URL` | Client | Base URL de Axios (default: `/api`) |
| `BACKEND_API_URL` | Server | URL del backend .NET para rewrites |

---

## Convenciones

| Concepto | Convención |
|---|---|
| Nombres de archivo | `PascalCase.tsx` para componentes, `camelCase.ts` para servicios/hooks |
| Servicios | Objeto exportado con métodos async (`xxxService = { ... }`) |
| Hooks | Función exportada `useXxx()` |
| Tipos | En `types/` del feature, o en `src/types/` si es global |
| Imports | Usar alias `@/` en lugar de rutas relativas largas |
| Rutas | Usar `ROUTES` de `config/routes.ts` |
| Estado del servidor | React Query (`useQuery`, `useMutation`) |
| Estado del cliente | React `useState` / `useReducer` (sin Redux) |
| CSS | Vanilla CSS en `globals.css`, clases utilitarias custom |
