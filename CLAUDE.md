# CLAUDE.md — Yleis Frontend

## Proyecto

**Yleis** es una plataforma colombiana de idiomas y servicios lingüísticos.
Slogan: *"Palabras que conectan al mundo."*

Cuatro servicios principales:
- **Aprende** — clases en vivo con docentes certificados
- **Enseña** — docentes gestionan su perfil y clases
- **Traduce o Interpreta** — profesionales ofrecen servicios lingüísticos
- **Solicita un traductor o intérprete** — clientes contratan servicios

El backend lo desarrolla otro equipo en **Django REST Framework**.
Este repositorio es únicamente el **frontend**.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 — App Router |
| Lenguaje | TypeScript (strict) |
| Estilos | TailwindCSS + CSS variables |
| Componentes | shadcn/ui (manual, sin CLI) |
| Formularios | React Hook Form + Zod |
| Fechas | date-fns |
| Iconos | lucide-react |
| Estado local | useState / useReducer |
| HTTP | fetch nativo (apiClient en `src/services/api.ts`) |

---

## Estructura de carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — Server Component
│   ├── page.tsx                  # Redirect → /dashboard/profile
│   └── dashboard/
│       ├── layout.tsx            # Layout con Sidebar — Server Component
│       ├── page.tsx              # Redirect → /dashboard/profile
│       └── profile/
│           ├── page.tsx          # Página de perfil — Server Component
│           └── loading.tsx       # Skeleton automático
│
├── components/
│   ├── ui/                       # Primitivos shadcn/ui (button, card, input…)
│   ├── layout/                   # Sidebar, TopBar
│   ├── profile/                  # Secciones de la vista de perfil
│   └── shared/                   # RoleBadge, SectionCard, StarRating
│
├── services/
│   ├── api.ts                    # Cliente HTTP base — único punto de cambio
│   └── profile.service.ts        # Todas las llamadas relacionadas al perfil
│
├── mocks/                        # Datos falsos — se eliminan al conectar backend
│   ├── user.mock.ts
│   └── bookings.mock.ts
│
├── types/                        # Tipos TypeScript puros — sin lógica
│   ├── user.types.ts
│   ├── booking.types.ts
│   └── global.d.ts
│
└── lib/
    ├── utils.ts                  # cn(), formatDate(), formatCurrency(), getInitials()
    └── validations/
        └── profile.ts            # Schemas Zod
```

---

## Roles de usuario

```typescript
type UserRole = "student" | "teacher" | "translator" | "interpreter" | "admin";
```

| Rol | Servicio | Sidebar muestra |
|---|---|---|
| `student` | Aprende | Aprende, Mis Clases, Solicitudes |
| `teacher` | Enseña | Enseña, Mis Clases |
| `translator` | Traduce | Traduce |
| `interpreter` | Interpreta | Interpreta |
| `admin` | Todos | Todo |

---

## Reglas de arquitectura

### Server vs Client Components

**Server Component** cuando el archivo:
- Hace fetch de datos (`await service.get...()`)
- No usa hooks (`useState`, `useEffect`, `useRouter`, etc.)
- No usa eventos del DOM (`onClick`, `onChange`, etc.)
- Es un layout o página que solo pasa datos a hijos

**Client Component** (`"use client"`) cuando el archivo:
- Usa hooks de React
- Maneja formularios o estado interactivo
- Usa `usePathname`, `useRouter`, `useSearchParams`
- Necesita acceso al browser (localStorage, window, etc.)

### Patrón de datos

```
Server Component (page.tsx)
  → fetches data en paralelo con Promise.all()
  → pasa initialData como props al Client Component raíz
    → Client Component gestiona estado local con useState
      → llama al service para mutaciones (POST/PATCH)
```

Nunca hacer fetch dentro de un Client Component al montar —
los datos iniciales siempre vienen del Server Component padre.

---

## Desacoplamiento del backend

### Variable de control

```bash
# .env.local
NEXT_PUBLIC_USE_MOCKS=true       # datos falsos (desarrollo sin backend)
NEXT_PUBLIC_USE_MOCKS=false      # API real (producción)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Cómo funciona

Cada método del service tiene esta estructura:

```typescript
async getProfile(): Promise<UserProfile> {
  if (USE_MOCKS) {
    await delay();           // simula latencia de red
    return CURRENT_USER;     // devuelve mock
  }
  return apiClient.get<UserProfile>("/v1/profile/me/");  // API real
}
```

Para conectar el backend real: cambiar `.env.local` únicamente.
Los componentes no cambian.

### Endpoints Django esperados

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/profile/me/` | Perfil del usuario autenticado |
| PATCH | `/api/v1/profile/me/` | Actualizar perfil |
| POST | `/api/v1/profile/avatar/` | Subir foto de perfil |
| GET | `/api/v1/bookings/` | Historial de reservas |
| GET | `/api/v1/classes/upcoming/` | Próximas clases |
| POST | `/api/v1/auth/change-password/` | Cambiar contraseña |
| POST | `/api/v1/integrations/google-calendar/connect/` | Conectar Google Calendar |
| DELETE | `/api/v1/integrations/google-calendar/disconnect/` | Desconectar |

---

## Convenciones de código

### Nombres de archivos

```
PascalCase      → componentes: ProfileHeader.tsx, SectionCard.tsx
camelCase       → servicios, utils, hooks: profile.service.ts, utils.ts
kebab-case      → no se usa en este proyecto
*.mock.ts       → datos falsos temporales
*.types.ts      → solo tipos TypeScript, cero lógica
*.schema.ts     → schemas Zod (alternativa: validations/)
```

### Componentes

- Un componente por archivo
- Props tipadas con `type`, no `interface` (consistencia)
- Subcomponentes pequeños de uso exclusivo van al final del mismo archivo
- Subcomponentes reutilizables van a `components/shared/`

```typescript
// ✅ Correcto
type Props = { user: UserProfile; onUpdate: (u: UserProfile) => void };
export function PersonalInfoSection({ user, onUpdate }: Props) { ... }

// ❌ Evitar
export default function PersonalInfoSection(props: any) { ... }
```

### Estilos

- Usar `cn()` de `src/lib/utils.ts` para clases condicionales
- No usar `style={{}}` inline salvo casos extremos
- Colores semánticos de Tailwind: `bg-primary`, `text-muted-foreground`, `border-border`
- Nunca hardcodear colores: `bg-[#8B1A2E]` — usar variables CSS

```typescript
// ✅ Correcto
className={cn("rounded-lg px-4", isActive && "bg-primary text-primary-foreground")}

// ❌ Evitar
className={`rounded-lg px-4 ${isActive ? "bg-[#8B0000] text-white" : ""}`}
```

### Formularios

Todos los formularios usan React Hook Form + Zod:

```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

Los schemas Zod viven en `src/lib/validations/`.
Nunca validar manualmente con `if (!value)` en formularios.

### Servicios

- Todo acceso a datos pasa por un service — nunca `fetch()` directo en componentes
- Los services devuelven tipos limpios — nunca `any`
- Los errores se propagan con `throw` — el componente decide cómo mostrarlos

---

## Mocks temporales

Los mocks en `src/mocks/` son **temporales** y se eliminarán al integrar el backend.

Para simular un rol diferente en desarrollo, editar la última línea de `src/mocks/user.mock.ts`:

```typescript
export const CURRENT_USER = MOCK_STUDENT;     // estudiante
export const CURRENT_USER = MOCK_TEACHER;     // docente
export const CURRENT_USER = MOCK_TRANSLATOR;  // traductor
export const CURRENT_USER = MOCK_INTERPRETER; // intérprete
export const CURRENT_USER = MOCK_ADMIN;       // admin
```

---

## Comandos

```bash
npm run dev      # servidor de desarrollo en localhost:3000
npm run build    # build de producción
npm run lint     # linter ESLint
```

---

## Git

```bash
git add .
git commit -m "tipo: descripción corta en español"
git push
```

Tipos de commit: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`

Repositorio: `github.com/dj231477-ai/yleis-frontend`
Rama principal: `master`

---

## Lo que falta por construir

- [ ] Páginas internas: `/dashboard/learn`, `/dashboard/teach`, `/dashboard/translate`, `/dashboard/interpret`, `/dashboard/requests`
- [ ] Sistema de autenticación (login, registro, recuperar contraseña)
- [ ] Middleware de protección de rutas (verificar JWT antes de renderizar)
- [ ] Dark mode toggle con persistencia
- [ ] Sistema de reservas y pagos
- [ ] Conexión real con Django REST Framework
- [ ] React Query para cache y refetch automático
- [ ] Tests con Vitest + Testing Library
