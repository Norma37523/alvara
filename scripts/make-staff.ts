/**
 * Dá perfil da equipe Norma a um usuário que já existe no Supabase Auth.
 *
 *   pnpm make:staff gregory@normacontabil.com norma_admin "Nome Completo"
 *
 * O usuário é criado por você no painel do Supabase (Authentication > Users); este script
 * não cria contas nem lida com senhas.
 */
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const args = z
  .tuple([z.string().email(), z.enum(["norma_admin", "norma_staff"])])
  .rest(z.string())
  .parse(process.argv.slice(2));
const [email, role, ...nameParts] = args;
const fullName = nameParts.join(" ").trim() || null;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure o .env.local.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error(
      `Usuário ${email} não encontrado. Crie-o antes em Authentication > Users no Supabase.`,
    );
  }

  const { error: upsertError } = await db
    .from("profiles")
    .upsert({ user_id: user.id, full_name: fullName, role, active: true });
  if (upsertError) throw upsertError;
  console.log(`Perfil ${role} definido para ${email}.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
