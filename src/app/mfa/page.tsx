import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata = { title: "Verificação em duas etapas – Norma Alvarás" };

export default async function MfaPage() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return (
    <main className="login">
      <div className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/horizontal-color.png" alt="Norma Contábil" />
        <h1>Verificação em duas etapas</h1>
        <MfaForm />
        <form action="/logout" method="post" style={{ marginTop: 16 }}>
          <button className="btn sec" type="submit">
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
