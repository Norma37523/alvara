import { createAdminClient } from "@/server/supabase";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ ok: boolean; message: string }> {
  const client = createAdminClient();
  if (!client) return { ok: false, message: "Variáveis do Supabase não configuradas." };
  const { error } = await client.from("app_settings").select("key").limit(1);
  if (error) return { ok: false, message: "Falha ao consultar o banco." };
  return { ok: true, message: "Conexão com o banco funcionando." };
}

export default async function SaudePage() {
  const db = await checkDatabase();
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Saúde do sistema</h1>
      <p className="mt-4" role="status">
        <strong>Banco de dados:</strong> {db.ok ? "OK" : "Indisponível"} — {db.message}
      </p>
    </main>
  );
}
