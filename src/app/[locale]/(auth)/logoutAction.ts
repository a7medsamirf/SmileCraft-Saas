"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = (formData.get("locale") as string | null) ?? "ar";
  redirect(`/${locale}/login`);
}
