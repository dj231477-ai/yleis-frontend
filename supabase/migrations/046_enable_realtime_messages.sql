-- ClassChat depende de supabase.channel(...).on("postgres_changes", { event: "INSERT",
-- table: "messages", ... }) para mostrar mensajes nuevos sin recargar la página. La
-- publicación supabase_realtime no tenía NINGUNA tabla agregada, así que Postgres
-- Changes nunca emitía nada para nadie — el remitente veía su propio mensaje por el
-- eco local del cliente, pero el otro participante solo lo veía al recargar (nuevo
-- SELECT inicial), nunca en vivo.

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
