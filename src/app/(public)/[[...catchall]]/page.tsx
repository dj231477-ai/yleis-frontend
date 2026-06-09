"use client";

import { PLASMIC } from "@/lib/plasmic";
import { PlasmicComponent, PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: Plasmic render data type is not exported
type ComponentRenderData = any;

// ── Página temporal ───────────────────────────────────────────────────────────

function ComingSoon() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Yleis</h1>
      <p className="mt-3 text-lg text-neutral-500">
        Conectamos estudiantes con los mejores profesores
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href="/login"
          className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition-colors"
        >
          Iniciar sesión
        </a>
        <a
          href="/login"
          className="rounded-xl border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Registrarse
        </a>
      </div>
    </main>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-700" />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PlasmicCatchall() {
  const params = useParams();
  const catchall = params?.catchall as string[] | undefined;
  const plasmicPath = `/${catchall?.join("/") ?? ""}`;

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: ComponentRenderData }
    | { status: "not_found" }
    | { status: "no_credentials" }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID) {
      setState({ status: "no_credentials" });
      return;
    }

    let cancelled = false;

    PLASMIC.maybeFetchComponentData(plasmicPath)
      .then((data) => {
        if (cancelled) return;
        if (!data) setState({ status: "not_found" });
        else setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [plasmicPath]);

  if (state.status === "loading") return <PageLoader />;
  if (state.status === "no_credentials") return <ComingSoon />;
  if (state.status === "not_found") return <ComingSoon />;
  if (state.status === "error") return <ComingSoon />;

  return (
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={state.data}>
      <PlasmicComponent component={plasmicPath} />
    </PlasmicRootProvider>
  );
}
