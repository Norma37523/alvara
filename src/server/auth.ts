import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase";

export type StaffRole = "norma_admin" | "norma_staff";

export interface StaffSession {
  userId: string;
  email: string;
  fullName: string | null;
  role: StaffRole;
}

/**
 * Autorização de verdade (o proxy é só uma checagem otimista): exige login, MFA concluído
 * e perfil ativo da equipe Norma. Qualquer falha encerra a sessão e volta ao login.
 */
export async function requireStaff(): Promise<StaffSession> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") redirect("/mfa");

  const admin = createAdminClient();
  if (!admin) throw new Error("Servidor sem credenciais do Supabase.");
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const isStaff = profile?.role === "norma_admin" || profile?.role === "norma_staff";
  if (!profile || !profile.active || !isStaff) {
    await supabase.auth.signOut();
    redirect("/login?erro=sem-acesso");
  }
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    fullName: profile.full_name,
    role: profile.role as StaffRole,
  };
}
