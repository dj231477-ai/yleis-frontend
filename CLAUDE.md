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

## Ecosistema de terceros

Yleis no puede construir todo desde cero. Estas son las integraciones externas necesarias,
por qué se eligieron y cómo se conectan al frontend.

---

### 1. Pasarela de pagos — Stripe

**Por qué Stripe sobre Wompi/Mercado Pago:**
- Documentación superior y SDKs de React oficiales (`@stripe/react-stripe-js`)
- **Stripe Connect** es el estándar de la industria para marketplaces (Uber, Airbnb, Fiverr)
- Soporte nativo para Split Payments, Pre-autorizaciones y Tokenización
- Dashboard de administración muy completo para ver transacciones, disputas y reembolsos

**⚠️ Advertencia importante para Colombia:**
Stripe opera en Colombia pero **no soporta PSE** (débito bancario), que es
el método de pago más usado por los colombianos. Para el MVP con tarjetas
de crédito/débito Stripe es perfecto. Si necesitas PSE en el futuro,
se puede agregar Wompi solo para ese método específico.

**Flujo tipo Uber con Stripe Connect:**
1. Profesional se registra → crea cuenta Stripe Connect (Express Account)
2. Cliente ingresa tarjeta → **Stripe Elements** tokeniza (nunca pasa por nuestro servidor)
3. Al iniciar sesión → **Pre-autorización** (`payment_intent` con `capture_method: manual`)
4. Al finalizar → **Captura** del monto final
5. Stripe divide automáticamente → comisión a Yleis + pago al profesional

**Paquetes necesarios:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Integración en el frontend:**
```typescript
// src/components/payments/CheckoutForm.tsx  (a construir)
// "use client" — Stripe Elements necesita el navegador
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
// El frontend NUNCA maneja datos de tarjeta en crudo — Stripe los tokeniza
```

```typescript
// src/services/payment.service.ts
async createPaymentIntent(amount: number, sessionId: string): Promise<{ clientSecret: string }> {
  // Django crea el PaymentIntent y devuelve el clientSecret
  // El frontend usa el clientSecret para confirmar con Stripe directamente
  return apiClient.post("/v1/payments/create-intent/", { amount, sessionId });
}
```

**Variables de entorno:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx   # pública, segura en frontend
# STRIPE_SECRET_KEY va SOLO en Django — nunca en el frontend
```

**Documentación:**
- Stripe React: `https://stripe.com/docs/stripe-js/react`
- Stripe Connect (marketplaces): `https://stripe.com/docs/connect`
- Stripe en Colombia: `https://stripe.com/global`

---

### 2. Video en vivo — Agora.io o Daily.co

**Problema crítico:** transmitir video a través de Django destruye el proyecto
en costos de ancho de banda y latencia. El video debe ir peer-to-peer (WebRTC)
a través de servidores especializados.

**Cómo funciona en Yleis:**

```
Cliente (Next.js)  ←── WebRTC ──→  Agora / Daily servers  ←── WebRTC ──→  Profesor (Next.js)
                                           ↓
                                   Cloud Recording (S3)
                                   (activado por Django)
```

**Integración en el frontend:**

```typescript
// src/services/video.service.ts
// Django genera el token de sala — el frontend solo lo consume
async joinSession(sessionId: string): Promise<{ token: string; channel: string }> {
  return apiClient.post("/v1/sessions/join/", { sessionId });
}
```

```typescript
// src/components/session/VideoRoom.tsx  (a construir)
// "use client" — necesita acceso al navegador (cámara, micrófono)
import AgoraRTC from "agora-rtc-sdk-ng";   // npm install agora-rtc-sdk-ng
```

**Grabación:** Django llama a la API de Agora al iniciar la sesión.
Agora graba directo en S3. El frontend nunca maneja el video grabado —
solo muestra un enlace firmado generado por Django.

**Variables de entorno:**
```bash
NEXT_PUBLIC_AGORA_APP_ID=xxxx   # App ID de Agora (público, seguro en frontend)
# El App Certificate va solo en Django para generar tokens
```

**Documentación:**
- Agora Web SDK: `https://docs.agora.io/en/video-calling/get-started/get-started-sdk`
- Daily.co React: `https://docs.daily.co/reference/daily-react`

---

### 3. Almacenamiento de archivos — Amazon S3 / Google Cloud Storage

**Usos en Yleis:**
- Documentos para traducción (PDF, DOCX) subidos por clientes
- Grabaciones de clases (MP4) generadas por Agora
- Fotos de perfil de usuarios
- Documentos de verificación de profesionales (cédulas, diplomas)

**Regla de seguridad — Presigned URLs:**
El frontend NUNCA recibe URLs directas de S3.
Django genera una URL firmada con expiración de 15 minutos.
Solo el usuario autorizado puede descargar el documento durante ese tiempo.

```typescript
// Flujo de descarga segura
// 1. Frontend pide la URL a Django (autenticado con JWT)
const { url } = await apiClient.get(`/v1/documents/${docId}/download-url/`);
// 2. Django valida permisos → genera presigned URL → devuelve al frontend
// 3. Frontend abre la URL → S3 sirve el archivo directamente
window.open(url, "_blank");
```

```typescript
// Flujo de subida (cliente sube documento para traducción)
// 1. Frontend pide a Django una presigned URL de SUBIDA
const { uploadUrl, fileKey } = await apiClient.post("/v1/documents/upload-url/", { filename, contentType });
// 2. Frontend sube directo a S3 (sin pasar por Django — más rápido)
await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
// 3. Frontend notifica a Django que la subida completó
await apiClient.post("/v1/documents/confirm-upload/", { fileKey });
```

**Variables de entorno:** Todas las credenciales de S3 van **solo en Django**.
El frontend no tiene ninguna clave de AWS/GCS.

---

### 4. Notificaciones — Twilio + OneSignal + Resend

#### 4a. Notificaciones Push y SMS — OneSignal / Twilio

**Caso crítico:** flujo Express — el profesional tiene 5–10 segundos para aceptar
una solicitud. Si no hay notificación inmediata, el cliente abandona la plataforma.

```
Cliente solicita sesión
    → Django publica evento en Redis (Django Channels)
    → WebSocket activo en Next.js recibe el evento en tiempo real
    → Si el profesional NO está conectado: Twilio envía SMS/WhatsApp
    → Si está conectado: OneSignal envía Push Notification al navegador
```

**Integración frontend (WebSocket):**
```typescript
// src/hooks/useRealtimeNotifications.ts  (a construir)
// "use client" — necesita WebSocket del navegador
useEffect(() => {
  const ws = new WebSocket(`wss://api.yleis.com/ws/notifications/?token=${jwt}`);
  ws.onmessage = (event) => {
    const { type, payload } = JSON.parse(event.data);
    if (type === "SESSION_REQUEST") showSessionAlert(payload);
  };
  return () => ws.close();
}, []);
```

**Variables de entorno:**
```bash
NEXT_PUBLIC_ONESIGNAL_APP_ID=xxxx   # público, seguro en frontend
# Twilio credentials van solo en Django
```

#### 4b. Correos transaccionales — Resend

**Usos:** confirmación de reserva, factura, recordatorio 24h antes,
bienvenida al registrarse, recuperación de contraseña.

**Integración:** 100% en Django. El frontend no llama a Resend directamente.
Django envía el correo y el frontend solo muestra un mensaje de confirmación.

**Por qué Resend y no Gmail/SMTP propio:**
Los servidores de correo propios tienen alta tasa de spam.
Resend tiene entregabilidad del 99% y logs en tiempo real.

**Documentación:**
- Resend: `https://resend.com/docs`
- Twilio WhatsApp: `https://www.twilio.com/docs/whatsapp`
- OneSignal Web Push: `https://documentation.onesignal.com/docs/web-push-quickstart`

---

### 5. Autenticación — JWT propio o Clerk

**Opción A — JWT propio (Django Simple JWT):**
Django genera el token, Next.js lo almacena en una cookie httpOnly
(más segura que localStorage). Un middleware de Next.js verifica el token
antes de renderizar cualquier página del dashboard.

```typescript
// src/middleware.ts  (a construir)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("yleis_token");
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
export const config = { matcher: ["/dashboard/:path*"] };
```

**Opción B — Clerk (acelera el desarrollo):**
Autenticación lista en 30 minutos. Maneja login, registro, OAuth (Google/Facebook),
MFA y gestión de sesiones. El backend Django verifica los tokens de Clerk.
Recomendado para el MVP, migrable a JWT propio después.

**Documentación:**
- Django Simple JWT: `https://django-rest-framework-simplejwt.readthedocs.io`
- Clerk Next.js: `https://clerk.com/docs/quickstarts/nextjs`

---

### 6. Tiempo real — Django Channels + Redis

**Usos en Yleis:**
- Alertas express al profesional cuando hay una solicitud nueva
- Chat entre cliente y profesional dentro de la sesión
- Actualizaciones del estado de la sesión (esperando → en curso → finalizada)
- Indicador de "el profesional está escribiendo"

**Arquitectura:**
```
Next.js (WebSocket cliente)
    ↕ wss://
Django Channels (WebSocket servidor)
    ↕
Redis (message broker — Railway o AWS ElastiCache)
```

**Integración frontend:** el hook `useRealtimeNotifications` (descrito arriba)
es el único punto de contacto con WebSockets. El resto de la app es HTTP normal.

**Documentación:**
- Django Channels: `https://channels.readthedocs.io`

---

### Resumen de arquitectura de integraciones

| Componente | Frontend (Next.js) | Backend (Django) | Servicio externo |
|---|---|---|---|
| Autenticación | Middleware + cookie httpOnly | Simple JWT o Clerk verify | Clerk (opcional) |
| Video en vivo | Agora SDK (`agora-rtc-sdk-ng`) | Genera token de sala | Agora.io / Daily.co |
| Grabación | Solo muestra el enlace | Activa Cloud Recording | Agora → S3 |
| Archivos / documentos | Sube directo a S3 (presigned URL) | Genera presigned URLs | Amazon S3 / GCS |
| Pagos | Stripe Elements (tokenizado) | PaymentIntent + Connect | Stripe |
| Notificaciones push | OneSignal SDK | Activa el envío | OneSignal / Twilio |
| Correos | Solo muestra confirmación | Envía con Resend | Resend / SendGrid |
| Tiempo real | WebSocket (`useRealtimeNotifications`) | Django Channels | Redis (Railway) |

---

### Variables de entorno completas (`.env.local`)

```bash
# Backend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=true

# Pagos
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx

# Video
NEXT_PUBLIC_AGORA_APP_ID=xxxx

# Notificaciones push
NEXT_PUBLIC_ONESIGNAL_APP_ID=xxxx

# Autenticación (si se usa Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx   # solo en servidor, nunca exponer
```

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
