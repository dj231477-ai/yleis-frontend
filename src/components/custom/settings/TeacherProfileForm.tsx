"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/ui/components/Button";
import { FeatherX } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  headline: string;
  bio: string;
  hourlyRate: number;
  languages: string[];
};

export function TeacherProfileForm({ headline, bio, hourlyRate, languages }: Props) {
  const router = useRouter();
  const [headlineVal, setHeadlineVal] = useState(headline);
  const [bioVal, setBioVal] = useState(bio);
  const [rateVal, setRateVal] = useState(String(hourlyRate || ""));
  const [langs, setLangs] = useState<string[]>(languages);
  const [langInput, setLangInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLang() {
    const val = langInput.trim();
    if (val && !langs.includes(val)) setLangs([...langs, val]);
    setLangInput("");
  }

  function removeLang(lang: string) {
    setLangs(langs.filter((l) => l !== lang));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const rate = Number.parseFloat(rateVal);
    if (Number.isNaN(rate) || rate < 0) {
      setError("La tarifa debe ser un número válido");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("No autenticado");
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("teachers")
      .update({
        headline: headlineVal.trim() || null,
        bio: bioVal.trim() || null,
        hourly_rate: rate,
        languages: langs,
      })
      .eq("user_id", user.id);

    if (dbError) {
      setError("Error al guardar los cambios");
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Titular */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Titular</label>
        <input
          value={headlineVal}
          onChange={(e) => setHeadlineVal(e.target.value)}
          placeholder="Ej: Profesora de inglés con 10 años de experiencia"
          maxLength={120}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
        />
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Descripción</label>
        <textarea
          value={bioVal}
          onChange={(e) => setBioVal(e.target.value)}
          placeholder="Cuéntales a los estudiantes sobre ti, tu metodología y experiencia..."
          rows={4}
          maxLength={800}
          className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
        />
        <p className="text-right text-xs text-neutral-400">{bioVal.length}/800</p>
      </div>

      {/* Tarifa */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Tarifa por hora (COP)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">$</span>
          <input
            type="number"
            value={rateVal}
            onChange={(e) => setRateVal(e.target.value)}
            min={0}
            step={100}
            placeholder="50000"
            className="w-40 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
          />
          <span className="text-xs text-neutral-400">COP / hora</span>
        </div>
      </div>

      {/* Idiomas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Idiomas que enseñas</label>
        <div className="flex gap-2">
          <input
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLang();
              }
            }}
            placeholder="Ej: Inglés, Francés..."
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
          />
          <Button type="button" variant="neutral-secondary" size="small" onClick={addLang}>
            Agregar
          </Button>
        </div>
        {langs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {langs.map((lang) => (
              <span
                key={lang}
                className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => removeLang(lang)}
                  className="hover:text-brand-900"
                >
                  <FeatherX className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">Cambios guardados correctamente</p>}

      <div className="flex justify-end">
        <Button variant="brand-primary" size="small" loading={loading} type="submit">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
