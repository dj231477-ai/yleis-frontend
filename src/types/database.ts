// Re-exporta los tipos del esquema de Supabase
// El archivo canónico es database.types.ts — regenerar con:
// npx supabase gen types typescript --project-id ptrgzvllqlessffdsuaz > src/types/database.types.ts
export type { Database, Json } from "./database.types";
