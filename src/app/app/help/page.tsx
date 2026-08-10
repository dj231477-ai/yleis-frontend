export const metadata = { title: "Ayuda — Yleis" };

const HOW_IT_WORKS_STUDENT = [
  {
    step: "1",
    title: "Busca tu profesor",
    desc: "Explora el catálogo, filtra por idioma o precio y revisa los perfiles.",
  },
  {
    step: "2",
    title: "Reserva una clase",
    desc: "Elige horario, duración y envía tu solicitud al profesor.",
  },
  {
    step: "3",
    title: "Realiza el pago",
    desc: "Paga directamente al profesor por transferencia o Mercado Pago y comparte el comprobante.",
  },
  {
    step: "4",
    title: "Conéctate y aprende",
    desc: "El profesor te enviará el link de Google Meet. ¡A aprender!",
  },
];

const HOW_IT_WORKS_TEACHER = [
  {
    step: "1",
    title: "Completa tu perfil",
    desc: "Carga tus certificados, define tu tarifa y describe tu experiencia.",
  },
  {
    step: "2",
    title: "Espera la verificación",
    desc: "Revisamos tu perfil en 24-48 horas. Te notificamos por email.",
  },
  {
    step: "3",
    title: "Acepta reservas",
    desc: "Confirma las solicitudes de los alumnos y coordina el link de Meet.",
  },
  {
    step: "4",
    title: "Cobra tu clase",
    desc: "El alumno te paga directamente. La plataforma retiene el 15% de comisión.",
  },
];

const FAQ = [
  {
    q: "¿Cuánto cobra Yleis de comisión?",
    a: "Yleis retiene el 15% de cada clase. El 85% restante es para el profesor.",
  },
  {
    q: "¿Cómo se realizan los pagos?",
    a: "En el MVP los pagos son directos entre alumno y profesor (transferencia bancaria, Mercado Pago, Nequi o Daviplata). Próximamente integramos Mercado Pago Checkout para pagos automáticos.",
  },
  {
    q: "¿Qué pasa si el profesor no confirma mi reserva?",
    a: "Si el profesor no confirma en 24 horas, la reserva se cancela automáticamente.",
  },
  {
    q: "¿Puedo ser estudiante y profesor al mismo tiempo?",
    a: "Sí. Una vez verificado como profesor, puedes alternar entre modo estudiante y modo profesor desde el menú lateral.",
  },
  {
    q: "¿Cómo funciona la verificación de profesores?",
    a: "Revisamos tu título, certificaciones y descripción. El proceso toma 24-48 horas. Te notificamos por email con el resultado.",
  },
  {
    q: "¿Las clases son en vivo o grabadas?",
    a: "Todas las clases son en vivo vía Google Meet. No ofrecemos clases grabadas por el momento.",
  },
];

export default function HelpPage() {
  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Centro de ayuda</h1>
        <p className="text-sm text-neutral-500 mb-8">
          Todo lo que necesitas saber para usar Yleis.
        </p>

        {/* Cómo funciona — estudiante */}
        <Section title="Cómo reservar una clase">
          <div className="flex flex-col gap-4">
            {HOW_IT_WORKS_STUDENT.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{item.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Cómo funciona — profesor */}
        <Section title="Cómo convertirte en profesor">
          <div className="flex flex-col gap-4">
            {HOW_IT_WORKS_TEACHER.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-100 text-sm font-bold text-success-700">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{item.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section title="Preguntas frecuentes">
          <div className="flex flex-col divide-y divide-neutral-100">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-4 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-neutral-800 marker:content-none list-none">
                  {q}
                  <span className="ml-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-neutral-500 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Contacto */}
        <Section title="¿Necesitas más ayuda?">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Si tienes problemas o preguntas que no están aquí, escríbenos directamente a{" "}
            <a href="mailto:hola@yleis.co" className="font-medium text-brand-600 hover:underline">
              hola@yleis.co
            </a>
            . Respondemos en menos de 24 horas.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
      <h2 className="mb-5 text-sm font-semibold text-neutral-700">{title}</h2>
      {children}
    </div>
  );
}
