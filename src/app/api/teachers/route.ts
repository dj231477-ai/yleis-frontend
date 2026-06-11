import { createClient } from "@/lib/supabase/server";
import { getVerifiedTeachers } from "@/services/teachers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const teachers = await getVerifiedTeachers(supabase);
  return NextResponse.json({ teachers });
}
