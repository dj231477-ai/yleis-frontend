"use client";

import { createClient } from "@/lib/supabase/client";
import { submitOnboarding, uploadTeacherDocument } from "@/services/teachers";
import type { TeacherRow } from "@/services/teachers";
import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import {
  FeatherArrowLeft,
  FeatherArrowRight,
  FeatherBookOpen,
  FeatherCheck,
  FeatherGlobe,
  FeatherLoader,
  FeatherUpload,
  FeatherUser,
  FeatherX,
} from "@subframe/core";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type FormData = {
  headline: string;
  bio: string;
  hourly_rate: string;
  languages: string[];
  files: File[];
};

type Props = {
  userId: string;
  teacher: TeacherRow;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUGGESTED_LANGUAGES = [
  "Español",
  "Inglés",
  "Portugués",
  "Francés",
  "Alemán",
  "Italiano",
  "Japonés",
  "Chino Mandarín",
];

const STEPS = ["Tu perfil", "Tu enseñanza", "Documentos"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done
                    ? "bg-success text-white"
                    : active
                      ? "bg-brand-700 text-white"
                      : "bg-neutral-200 text-neutral-400",
                ].join(" ")}
              >
                {done ? <FeatherCheck className="h-3 w-3" /> : step}
              </div>
              <span
                className={[
                  "hidden text-xs font-medium sm:block",
                  active ? "text-neutral-900" : "text-neutral-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={["h-px w-8 shrink-0", done ? "bg-success" : "bg-neutral-200"].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      {children}
      {required && <span className="ml-0.5 text-error">*</span>}
    </label>
  );
}

function Input({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
    />
  );
}

function Textarea({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 4,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className="mt-1.5 block w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
    />
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: FormData[keyof FormData]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconWithBackground variant="brand" size="medium" icon={<FeatherUser />} square />
        <div>
          <h2 className="font-semibold text-neutral-900">Tu perfil profesional</h2>
          <p className="text-xs text-neutral-500">Cuéntales a los alumnos quién eres</p>
        </div>
      </div>

      <div>
        <FieldLabel required>Titular profesional</FieldLabel>
        <Input
          id="headline"
          value={data.headline}
          onChange={(v) => onChange("headline", v)}
          placeholder="Ej: Profesora de inglés con 10 años de experiencia · C2"
          maxLength={120}
        />
        <p className="mt-1 text-xs text-neutral-400">{data.headline.length}/120</p>
      </div>

      <div>
        <FieldLabel required>Sobre ti</FieldLabel>
        <Textarea
          id="bio"
          value={data.bio}
          onChange={(v) => onChange("bio", v)}
          placeholder="Describe tu experiencia, metodología y qué te hace único como profesor..."
          maxLength={800}
          rows={5}
        />
        <p className="mt-1 text-xs text-neutral-400">{data.bio.length}/800</p>
      </div>
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: FormData[keyof FormData]) => void;
}) {
  const [langInput, setLangInput] = useState("");

  function addLanguage(lang: string) {
    const trimmed = lang.trim();
    if (!trimmed || data.languages.includes(trimmed)) return;
    onChange("languages", [...data.languages, trimmed]);
  }

  function removeLanguage(lang: string) {
    onChange(
      "languages",
      data.languages.filter((l) => l !== lang)
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLanguage(langInput);
      setLangInput("");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconWithBackground variant="brand" size="medium" icon={<FeatherBookOpen />} square />
        <div>
          <h2 className="font-semibold text-neutral-900">Tu enseñanza</h2>
          <p className="text-xs text-neutral-500">Tarifa e idiomas que impartes</p>
        </div>
      </div>

      <div>
        <FieldLabel required>Tarifa por hora (COP)</FieldLabel>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-400">
            $
          </span>
          <input
            id="hourly_rate"
            type="number"
            min={20000}
            step={1000}
            value={data.hourly_rate}
            onChange={(e) => onChange("hourly_rate", e.target.value)}
            placeholder="50000"
            className="block w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-7 pr-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-400">Minimo $20.000 COP</p>
      </div>

      <div>
        <FieldLabel required>Idiomas que enseñas</FieldLabel>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <FeatherGlobe className="h-4 w-4 text-neutral-400" />
          </span>
          <input
            type="text"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un idioma y presiona Enter"
            className="block w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        {/* Tags */}
        {data.languages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.languages.map((lang) => (
              <span
                key={lang}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-200"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-brand-100 transition-colors"
                  aria-label={`Quitar ${lang}`}
                >
                  <FeatherX className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggestions */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED_LANGUAGES.filter((l) => !data.languages.includes(l)).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => addLanguage(lang)}
              className="rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-500 hover:border-brand-300 hover:text-brand-700 transition-colors"
            >
              + {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: FormData[keyof FormData]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    onChange("files", [...data.files, ...newFiles]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    onChange(
      "files",
      data.files.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconWithBackground variant="brand" size="medium" icon={<FeatherUpload />} square />
        <div>
          <h2 className="font-semibold text-neutral-900">Documentos</h2>
          <p className="text-xs text-neutral-500">
            Sube diplomas, certificados o títulos que acrediten tu experiencia
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-neutral-300 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50"
      >
        <FeatherUpload className="h-8 w-8 text-neutral-400" />
        <div>
          <p className="text-sm font-medium text-neutral-700">
            Arrastra archivos o haz clic para seleccionar
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">PDF, JPG o PNG · Máx. 10 MB por archivo</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </button>

      {data.files.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5"
            >
              <FeatherUpload className="h-4 w-4 shrink-0 text-neutral-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-neutral-700">{file.name}</p>
                <p className="text-xs text-neutral-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="rounded-full p-1 hover:bg-neutral-200 transition-colors"
                aria-label="Quitar archivo"
              >
                <FeatherX className="h-3.5 w-3.5 text-neutral-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Los documentos se usan únicamente para verificar tu perfil. Puedes omitir este paso por
        ahora y enviar los documentos más tarde contactando a soporte.
      </p>

      {/* Resumen */}
      <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4">
        <p className="text-xs font-semibold text-neutral-700 mb-2">Resumen de tu solicitud</p>
        <div className="space-y-1 text-xs text-neutral-600">
          <p>
            <span className="font-medium">Titular:</span> {data.headline || "—"}
          </p>
          <p>
            <span className="font-medium">Idiomas:</span> {data.languages.join(", ") || "—"}
          </p>
          <p>
            <span className="font-medium">Tarifa:</span> ${data.hourly_rate || "—"} COP/hora
          </p>
          <p>
            <span className="font-medium">Documentos:</span> {data.files.length} archivo
            {data.files.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OnboardingForm({ userId, teacher }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    headline: teacher.headline ?? "",
    bio: teacher.bio ?? "",
    hourly_rate: teacher.hourly_rate ? String(teacher.hourly_rate) : "",
    languages: teacher.languages ?? [],
    files: [],
  });

  function setField(key: keyof FormData, value: FormData[keyof FormData]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function canGoNext() {
    if (step === 1)
      return formData.headline.trim().length >= 10 && formData.bio.trim().length >= 30;
    if (step === 2)
      return (
        formData.hourly_rate !== "" &&
        Number(formData.hourly_rate) >= 20000 &&
        formData.languages.length > 0
      );
    return true;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload documents (best effort — don't block submission on failure)
      for (const file of formData.files) {
        await uploadTeacherDocument(supabase, userId, file);
      }

      const { error } = await submitOnboarding(supabase, userId, {
        headline: formData.headline.trim(),
        bio: formData.bio.trim(),
        hourly_rate: Number(formData.hourly_rate),
        languages: formData.languages,
      });

      if (error) {
        setSubmitError("No se pudo enviar la solicitud. Intenta de nuevo.");
        return;
      }

      router.push("/app/teacher/onboarding");
      router.refresh();
    } catch {
      setSubmitError("Error inesperado. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <span className="text-xl font-bold text-brand-700 tracking-tight">Yleis</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">Verificación de profesor</span>
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-10">
        {/* Progress */}
        <div className="mb-8 flex flex-col gap-3">
          <StepIndicator current={step} />
          <p className="text-xs text-neutral-400">
            Paso {step} de {STEPS.length}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {step === 1 && <Step1 data={formData} onChange={setField} />}
          {step === 2 && <Step2 data={formData} onChange={setField} />}
          {step === 3 && <Step3 data={formData} onChange={setField} />}
        </div>

        {submitError && (
          <p className="mt-3 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error">
            {submitError}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="neutral-tertiary"
            size="medium"
            icon={<FeatherArrowLeft />}
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            Anterior
          </Button>

          {step < STEPS.length ? (
            <Button
              variant="brand-primary"
              size="medium"
              iconRight={<FeatherArrowRight />}
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext()}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="brand-primary"
              size="medium"
              icon={isSubmitting ? <FeatherLoader className="animate-spin" /> : <FeatherCheck />}
              onClick={handleSubmit}
              disabled={isSubmitting || !canGoNext()}
            >
              {isSubmitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
