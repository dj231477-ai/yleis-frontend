# CLAUDE.md - Yleis Frontend

> Este archivo contiene solo reglas especificas del frontend.
> El documento maestro del proyecto es `../CLAUDE.md`.
> Si hay conflicto entre ambos, prevalece `../CLAUDE.md`.

---

## 1. Identidad

**Yleis** es una plataforma educativa latinoamericana con foco inicial en Colombia.

**Slogan:** "Palabras que conectan al mundo"

**Mercado inicial:** Colombia

**Moneda MVP:** COP

---

## 2. Backend

El backend del MVP es exclusivamente:

- Supabase
- PostgreSQL
- Supabase Edge Functions
- Next.js API Routes

No usar ni documentar como arquitectura activa:

- Django
- Django REST Framework
- Django Channels
- Redis
- Simple JWT
- Agora.io
- Daily.co
- Grabaciones de video
- S3 / GCS como almacenamiento principal

---

## 3. Stack Frontend

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 15 - App Router |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS |
| UI | Subframe + componentes custom |
| Iconos | lucide-react |
| Formularios | React Hook Form + Zod cuando aplique |
| Fechas | date-fns |
| Datos | Supabase client/server + services + API Routes |

---

## 4. Componentes UI

La UI de la zona app se construye con:

- Componentes generados por Subframe en `src/components/ui/`
- Componentes propios en carpetas custom del proyecto
- Logica de negocio en componentes, services y API Routes fuera de los archivos generados

Reglas:

- No usar shadcn/ui manual como sistema principal.
- No editar archivos generados por Subframe.
- No editar archivos generados por Plasmic.
- Crear componentes custom fuera de `src/components/ui/` cuando haga falta logica propia.

---

## 5. Rutas Actuales

### App

- `/app/student/dashboard`
- `/app/student/search` - Express inDrive
- `/app/student/classes` - reservas programadas
- `/app/student/classes/[bookingId]`
- `/app/teacher/dashboard`
- `/app/teacher/onboarding`
- `/app/teacher/express` - solicitudes Express
- `/app/teacher/classes/[bookingId]`
- `/app/app/payments`
- `/app/profile`
- `/app/settings`

### Zona Publica

- `/(public)/[[...catchall]]` - Plasmic

La zona publica `/, /blog, /como-funciona` y paginas similares se editan en Plasmic Studio, no directamente en codigo.

La zona app `/app/*` se construye con Next.js + Subframe + codigo del proyecto.

---

## 6. Roles MVP

Roles activos del MVP:

- `student`
- `teacher`
- `admin`

Roles post-MVP:

- `translator`
- `interpreter`

No construir flujos de `translator` o `interpreter` dentro del MVP salvo instruccion explicita del founder.

---

## 7. Moneda y Pagos

Yleis opera inicialmente en Colombia.

Reglas del MVP:

- Moneda: COP
- Pasarela: Mercado Pago Colombia
- Metodos objetivo: PSE, Nequi, Daviplata y tarjetas
- Checkout Pro implementado

No usar:

- ARS
- Argentina como mercado inicial

Post-MVP:

- Split payments
- Preautorizacion
- Dispersion automatica avanzada

---

## 8. Video

MVP:

- Google Meet manual

Post-MVP:

- Integracion automatizada de video
- Agora.io
- Daily.co
- Grabaciones

No implementar Agora.io o Daily.co en el MVP salvo instruccion explicita del founder.

---

## 9. Tiempo Real

El tiempo real del MVP usa:

- Supabase Realtime
- Polling cuando sea mas simple o ya este implementado

No usar:

- Django Channels
- Redis

---

## 10. Estado Actual Del Proyecto

Completado:

- [x] Auth + roles + middleware
- [x] StudentDashboard
- [x] TeacherOnboarding + TeacherDashboard
- [x] Flujo de reserva programada con planes
- [x] Express inDrive con timer y matching
- [x] Chat de clase con codigo de confirmacion
- [x] Mercado Pago Checkout Pro
- [x] Planes A/B - 7 planes activos
- [x] Sidebar unificado con Subframe
- [x] Deploy en Vercel - yleis.co

- [x] Emails transaccionales disparados directo desde las rutas (sin depender de n8n) - bienvenida, solicitud de reserva, recibo de pago, cancelacion con/sin reembolso (2026-08-09)
- [x] Hardening de seguridad Supabase: RPCs SECURITY DEFINER que no verificaban auth.uid() internamente (accept_express_session, get_active_plan, process_teacher_verification, create_notification) - cerrado via REVOKE + checks internos (2026-08-09/10, migraciones 029-030)
- [x] activate_membership ya no es explotable via RPC directo - patron de grant token de un solo uso, emitido solo tras verificar el pago real con MP server-side (2026-08-10, migracion 031)

Pendiente:

- [x] Infraestructura Cal.com en calendario - pendiente URL/config externa
- [ ] Plasmic landing - bloqueado por tokens
- [ ] DNS yleis.co -> Vercel
- [x] Infraestructura emails con Resend - pendiente RESEND_API_KEY
- [x] n8n workflows preparados para endpoint interno de emails - pendiente activacion/config
- [ ] Recordatorios 24h/1h y email post-clase (review-request) - son time-based, necesitan un scheduler (Vercel Cron o activar n8n); hoy no se disparan
- [ ] Reembolso REAL en Mercado Pago al cancelar - cancel-booking marca payments.status='refunded' en la fila pero no llama la API de refunds de MP; ese forward sigue atado a que n8n este activo
- [x] Vistas SECURITY DEFINER revisadas (2026-08-10, migracion 032): student_upcoming_bookings y student_booking_history NO filtraban por auth.uid() y anon podia leerlas directo (exponian horario, precio y el link de Meet de TODOS los estudiantes) - eran codigo muerto (cero uso real), se eliminaron. Las otras 5 (teacher_public_catalog, teacher_public_profile, teacher_dashboard_summary, teacher_earnings_detail, teacher_pending_bookings) se dejaron como estan: verificado contra las RLS reales que necesitan SECURITY DEFINER a proposito para exponer datos curados de la otra parte de una relacion (perfil publico de profesor verificado, o nombre/monto del alumno en un booking del profesor) que la RLS base de users/payments no permitiria de otra forma.
- [ ] Supabase Auth: leaked password protection y MFA insuficiente - config del dashboard/Management API, no SQL
- [ ] tree_sitter_sql no instalado bloquea el parseo de las 29 migraciones .sql por la herramienta graphify (no bloquea el producto, solo el analisis de codigo)

---

## 11. Calidad Y Tooling

Herramientas configuradas:

- Biome
- Husky
- lint-staged

Comandos obligatorios:

```bash
npx tsc --noEmit
npm run build
```

Reglas:

- `npx tsc --noEmit` debe pasar siempre.
- `npm run build` debe pasar antes de cada push.
- No hacer push si TypeScript o build fallan.

---

## 12. Plasmic

Zona publica:

- `/, /blog, /como-funciona` y paginas publicas similares viven en Plasmic Studio.
- No editar esas paginas directamente en codigo.
- Next.js consume Plasmic en modo headless desde `/(public)/[[...catchall]]`.

Zona app:

- `/app/*` vive en Next.js.
- UI con Subframe.
- Logica con TypeScript, services, Supabase y API Routes.

---

## 13. Reglas Absolutas

- No usar `service_role` en frontend.
- No exponer secretos en codigo cliente.
- No editar archivos generados por Subframe.
- No editar archivos generados por Plasmic.
- Toda tabla nueva debe tener RLS.
- MVP-first en cada decision.
- COP como moneda del MVP.
- Colombia como mercado inicial.
- TypeScript sin `any` salvo justificacion explicita.
- Mantener cambios pequenos, reversibles y alineados con `../CLAUDE.md`.

---

*CLAUDE.md frontend - alineado con documento maestro del proyecto*
